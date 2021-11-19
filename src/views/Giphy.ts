import addOutline from "@/icons/add-outline.svg";
import happyOutline from "@/icons/happy-outline.svg";
import searchOutline from "@/icons/search-outline.svg";
import m from "mithril";

import { config } from "../config";
import { LogType } from "../CustomLogging";
import { t } from "../translate";
import { toast } from "../utils";
import { PrivacyButton } from "./Forms";
import Icon from "./Icon";

/** True during the process of requesting a new GIF to be added. */
let shareInProgress = false;

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
 * For simplicity sake, the pagination object and the offset and total count
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

interface PlayerAttrs {
    /** The GIF's unique ID */
    giphyId: string;
    /** Callback when the GIF has been successfully added to the book */
    onSuccess?: () => void;
}

export class Player implements m.ClassComponent<PlayerAttrs> {
    /** Select a GIF to add in the book. The GIF ID is fetched in the Finder. */
    selectGif(attrs: PlayerAttrs): void {
        shareInProgress = true;
        m.request<undefined>({
            method: "POST",
            url: "/api/giphy",
            body: { giphyId: attrs.giphyId },
        })
            .then(() => {
                if (attrs.onSuccess) {
                    toast("" + t("applause.feedback.pass"));
                    attrs.onSuccess();
                }
                shareInProgress = false;
            })
            .catch((err: Error & { code: number }) => {
                toast(
                    "" +
                        t(
                            "applause.feedback.fail" +
                                (err.code == 429 ? ".429" : ""),
                        ),
                    LogType.error,
                );
                shareInProgress = false;
            });
    }

    view({ attrs }: m.CVnode<PlayerAttrs>): m.Vnode {
        return m(
            "div" + (attrs.onSuccess ? ".selectable" : ""),
            {
                style: "width: 200px;",
            },
            [
                // mp4 are not displayed on Chrome
                m("img.giphy", {
                    src: `https://media0.giphy.com/media/${attrs.giphyId}/200w.webp`,
                    width: 200,
                    alt: "",
                }),
                !shareInProgress && // status for all GIFs
                    attrs.onSuccess &&
                    m(
                        "button",
                        {
                            onclick: () => {
                                this.selectGif(attrs);
                            },
                        },
                        [m(Icon, { src: happyOutline }), t("select")],
                    ),
            ],
        );
    }
}

export interface ListerAttrs {
    list: GifMetadata[];
    /** Callback when the GIF has been successfully added to the book */
    onSuccess?: () => void;
}

export class Lister implements m.ClassComponent<ListerAttrs> {
    view({ attrs }: m.CVnode<ListerAttrs>): m.Vnode {
        return m(
            "ul.giphy-list",
            attrs.list.map((gif: GifMetadata) => {
                return m(
                    "li",
                    m(Player, {
                        giphyId: gif.id,
                        onSuccess: attrs.onSuccess,
                    }),
                );
            }),
        );
    }
}

interface FinderAttrs {
    /** Callback when the GIF has been successfully added to the book */
    callbackSelection: () => void;
}

export class Finder implements m.ClassComponent<FinderAttrs> {
    userQuery = "";
    listResult: GifMetadata[] = [];
    isLoading = false;

    /** Contact the Giphy API to find a few GIFs related to the search. */
    requestGifs(): void {
        this.isLoading = true;
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
            this.isLoading = false;
            if (result.meta.status >= 400) {
                toast("" + t("applause.feedback.fail"), LogType.error);
                throw new Error(`Giphy error: ${result.meta.msg}`);
            } else if (result.data.length == 0) {
                toast("" + t("no-result-try-sth-else"), LogType.error);
            } else {
                this.listResult.push(...result.data);
            }
        });
    }

    view({ attrs }: m.CVnode<FinderAttrs>): m.Vnode {
        return m(".giphy-finder", [
            m("p", t("visitors-book.label")),
            m(
                "form",
                {
                    onsubmit: (e: Event): void => {
                        e.preventDefault();
                        this.listResult = [];
                        this.requestGifs();
                    },
                },
                [
                    m("label", [
                        m("input[type=text]", {
                            oninput: (e: {
                                currentTarget: HTMLInputElement;
                            }): void => {
                                this.userQuery = e.currentTarget.value;
                            },
                            value: this.userQuery,
                        }),
                        m(
                            "button[type=submit].mr-3",
                            {
                                disabled:
                                    this.isLoading || this.userQuery.length < 3,
                            },
                            [m(Icon, { src: searchOutline }), t("search")],
                        ),
                    ]),
                    m("span.ml-3", m(PrivacyButton)),
                ],
            ),
            m(Lister, {
                list: this.listResult,
                onSuccess: attrs.callbackSelection,
            }),
            m(
                "button.mt-3" + (this.listResult.length ? "" : ".hide"),
                {
                    onclick: () => {
                        this.requestGifs();
                    },
                    disabled: this.isLoading,
                },
                [m(Icon, { src: addOutline }), t("load-more")],
            ),
        ]);
    }
}
