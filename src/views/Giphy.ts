import m from "mithril";
import Icon from "./Icon";
import searchOutline from "@/icons/search-outline.svg";
import addOutline from "@/icons/add-outline.svg";
import happyOutline from "@/icons/happy-outline.svg";
import CustomLogging from "../CustomLogging";
import { config } from "../config";
import { PrivacyButton } from "./Forms";

const t = require("../translate");
const error = new CustomLogging("error");

export interface GifMetadata {
    id: string;
}

interface Payload {
    data: GifMetadata[];
    meta: {
        status: number;
        msg: string;
    };
}

interface PlayerAttrs {
    giphyId: string;
    onSuccess?: () => void;
    onFail?: (err: string) => void;
}

export class Player implements m.ClassComponent<PlayerAttrs> {
    isRequesting = false;

    selectGif(attrs: PlayerAttrs): void {
        this.isRequesting = true;
        m.request<undefined>({
            method: "POST",
            url: "/api/giphy",
            body: { giphyId: attrs.giphyId },
        })
            .then(() => {
                if (attrs.onSuccess) {
                    attrs.onSuccess();
                }
                this.isRequesting = false;
            })
            .catch((err: Error & { code: number }) => {
                const feedbackCodes = [429];
                if (attrs.onFail) {
                    attrs.onFail(
                        t(
                            "applause.feedback.fail" +
                                (feedbackCodes.indexOf(err.code) > -1
                                    ? "." + err.code
                                    : ""),
                        ),
                    );
                }
                this.isRequesting = false;
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
                !this.isRequesting &&
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
    onSuccess?: () => void;
    onFail?: (err: string) => void;
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
                        onFail: attrs.onFail,
                    }),
                );
            }),
        );
    }
}

interface FinderAttrs {
    callbackSelection: () => void;
}

export class Finder implements m.ClassComponent<FinderAttrs> {
    userQuery = "";
    listResult: GifMetadata[] = [];
    isLoading = false;
    messageFail = ""; // empty if not failed

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
                error.log(`Giphy error: ${result.meta.msg}.`);
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
                onFail: (err: string) => {
                    this.messageFail = err;
                    setTimeout(() => {
                        this.messageFail = "";
                        m.redraw();
                    }, config.ephemeralDisplayTimeout * 1000);
                },
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
            this.messageFail &&
                m(
                    ".applause-feedback.abs-bottom-center",
                    m(".tippy-box", this.messageFail),
                ),
        ]);
    }
}
