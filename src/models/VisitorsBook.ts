import m from "mithril";

import { config } from "../config";
import CustomLogging, { LogType } from "../CustomLogging";
import { t } from "../translate";
import { toast } from "../utils";

const warning = new CustomLogging("warning");

/**
 * This object could contain a variety of information as detailed here:
 * https://developers.giphy.com/docs/api/schema#gif-object
 * Since the GIF URL can be reconstructed from the GIF ID, only the ID is used
 * in order to reduce the amount of data and simplify the object.
 */
export interface GifMetadata {
    /** The GIF's unique ID */
    id: string;
}

/**
 * Contains a subset of the Giphy response from the search endpoint.
 * For simplicity's sake, the pagination object and the offset and total count
 * are guessed from the current state and data length.
 */
interface Payload {
    /** A list of GIF object */
    data: GifMetadata[];
    /** The Meta Object contains basic information regarding the response */
    meta: {
        /** HTTP Response Code (200, 400, 403, 404, 429) */
        status: number;
        /** HTTP Response Message */
        msg: string;
    };
}

class VisitorsBookState {
    /** True during the process of requesting a new GIF to be added. */
    private _shareInProgress = false;

    /** The GIF's unique ID. */
    private selectedGiphyId?: string;

    /** Callback when the GIF has been successfully added to the book. */
    private onSuccess?: () => void;

    /** What the user is typing in the input box. */
    public userQuery = "";

    /** List of loaded GIFs. */
    private _listResult: GifMetadata[] = [];

    /** True when more GIFs are being fetched. */
    private _isLoading = false;

    /** The most recent GIFs. */
    private _storedGiphies: GifMetadata[] = [];

    /** True when fetching the stored giphies. Only on init. */
    private _isRequesting = true;

    /** True when the current visitor shared its GIF. */
    private _hasShared = false;

    /** The first time to wait before retrying to fetch the visitor book. */
    static firstRetryTimeout = 1000;

    /** The time to wait before retrying to fetch the visitor book. */
    private bookRequestRetryTimeout = VisitorsBookState.firstRetryTimeout;

    /** Return of setTimeout. */
    private retryTimeoutId?: ReturnType<typeof setTimeout>;

    get shareInProgress(): boolean {
        return this._shareInProgress;
    }

    get isLoading(): boolean {
        return this._isLoading;
    }

    get listResult(): GifMetadata[] {
        return this._listResult;
    }

    get storedGiphies(): GifMetadata[] {
        return this._storedGiphies;
    }

    get hasShared(): boolean {
        return this._hasShared;
    }

    set hasShared(newState: boolean) {
        this.initList();
        this._hasShared = newState;
    }

    get isRequesting(): boolean {
        return this._isRequesting;
    }

    resetListResult(): void {
        this._listResult = [];
    }

    /**
     * Select a GIF to add in the book.
     * The GIF IDs are fetched in requestGifs().
     */
    selectGif(giphyId: string, onSuccess: () => void): void {
        this.selectedGiphyId = giphyId;
        this.onSuccess = onSuccess;
        this._shareInProgress = true;
        m.request<undefined>({
            method: "POST",
            url: "/api/giphy",
            body: { giphyId },
        })
            .then(() => {
                if (onSuccess) {
                    toast(t("applause.feedback.pass"));
                    this.hasShared = true;
                    onSuccess();
                }
                this._shareInProgress = false;
            })
            .catch((err: Error & { code: number }) => {
                const errCode = err.code == 429 ? ".429" : "";
                toast(t("applause.feedback.fail" + errCode), LogType.error);
                this._shareInProgress = false;
            });
    }

    /** Contact the Giphy API to find a few GIFs related to the search. */
    requestGifs(): void {
        this._isLoading = true;
        const listLength = this.listResult.length;
        m.request<Payload>({
            method: "GET",
            url: "https://api.giphy.com/v1/gifs/search",
            params: {
                api_key: config.giphy.apiKey,
                q: this.userQuery,
                limit: config.giphy.gifPerSearchRequest,
                offset: listLength > 0 ? listLength + 1 : 0,
                rating: config.giphy.rating,
                lang: t.getLang(),
            },
        }).then((result) => {
            this._isLoading = false;
            if (result.meta.status >= 400) {
                toast(t("applause.feedback.fail"), LogType.error);
                throw new Error(`Giphy error: ${String(result.meta.msg)}`);
            } else if (result.data.length == 0) {
                toast(t("no-result-try-sth-else"), LogType.error);
            } else {
                this.listResult.push(...result.data);
            }
        });
    }

    /** Fetch the stored giphies. Retry if failed. */
    initList(): void {
        this._storedGiphies = [];
        this._isRequesting = true;
        m.request<GifMetadata[]>({
            method: "GET",
            url: "/api/giphy",
        })
            .then((result) => {
                this._storedGiphies = result;
                this._isRequesting = false;
            })
            .catch(() => {
                warning.log("Failed to load the Giphies, retry...");
                this.retryTimeoutId = setTimeout(() => {
                    this.bookRequestRetryTimeout *= 2;
                    this.initList();
                }, this.bookRequestRetryTimeout);
            });
    }

    /** Clear and reset the timeout. */
    clearRetryTimeout(): void {
        if (this.retryTimeoutId !== undefined) {
            clearTimeout(this.retryTimeoutId);
        }
        this.bookRequestRetryTimeout = VisitorsBookState.firstRetryTimeout;
    }
}

/** This is a shared instance. */
export const visitorsBookState = new VisitorsBookState();
