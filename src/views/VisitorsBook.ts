import addOutline from "@/icons/add-outline.svg";
import happyOutline from "@/icons/happy-outline.svg";
import searchOutline from "@/icons/search-outline.svg";
import sunnyOutline from "@/icons/sunny-outline.svg";
import m from "mithril";

import { GifMetadata, visitorsBookState } from "../models/VisitorsBook";
import { t } from "../translate";
import { PrivacyButton } from "./Forms";
import Icon from "./Icon";
import { ModalSize, closeAllModals, modal } from "./Modal";

interface PlayerAttrs {
    /** The GIF's unique ID */
    giphyId: string;

    /** True if the GIF can be selected. */
    selectable: boolean;
}

/** Component playing a GIF, which is optionally selectable. */
const Player: m.Component<PlayerAttrs> = {
    view({ attrs }: m.CVnode<PlayerAttrs>): m.Vnode {
        return m(
            "div" + (attrs.selectable ? ".selectable" : ""),
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
                !visitorsBookState.shareInProgress && // status for all GIFs
                    attrs.selectable &&
                    m(
                        "button",
                        {
                            onclick: () => {
                                visitorsBookState.selectGif(
                                    attrs.giphyId,
                                    closeAllModals,
                                );
                            },
                        },
                        [m(Icon, { src: happyOutline }), t("select")],
                    ),
            ],
        );
    },
};

interface ListerAttrs {
    /** List of GIFs. */
    list: GifMetadata[];

    /** True if the GIFs can be selected. */
    selectable: boolean;
}

/** A list of GIF players. */
const Lister: m.Component<ListerAttrs> = {
    view({ attrs }: m.CVnode<ListerAttrs>): m.Vnode {
        return m(
            "ul.giphy-list",
            attrs.list.map((gif: GifMetadata) => {
                return m(
                    "li",
                    m(Player, {
                        giphyId: gif.id,
                        selectable: attrs.selectable,
                    }),
                );
            }),
        );
    },
};

/** Refresh the list of stored GIFs. */
function finderOnSubmit(e: Event): void {
    e.preventDefault();
    visitorsBookState.resetListResult();
    visitorsBookState.requestGifs();
}

/** Update the user input. */
function finderOnInput(e: { currentTarget: HTMLInputElement }): void {
    visitorsBookState.userQuery = e.currentTarget.value;
}

/** Form for searching GIFs. */
const FinderForm: m.Component = {
    view(): m.Vnode {
        return m(
            "form",
            {
                onsubmit: finderOnSubmit,
            },
            [
                m("label", [
                    m("input[type=text]", {
                        oninput: finderOnInput,
                        value: visitorsBookState.userQuery,
                    }),
                    m(
                        "button[type=submit].mr-3",
                        {
                            disabled:
                                visitorsBookState.isLoading ||
                                visitorsBookState.userQuery.length < 3,
                        },
                        [m(Icon, { src: searchOutline }), t("search")],
                    ),
                ]),
                m("span.ml-3", m(PrivacyButton)),
            ],
        );
    },
};

/** Button for loading more GIFs. */
const FinderLoadMore: m.Component = {
    view(): m.Vnode {
        return m(
            "button.mt-3" +
                (visitorsBookState.listResult.length ? "" : ".hide"),
            {
                onclick: () => {
                    visitorsBookState.requestGifs();
                },
                disabled: visitorsBookState.isLoading,
            },
            [m(Icon, { src: addOutline }), t("load-more")],
        );
    },
};

/** Content of the modal for sharing a new GIF. */
const Finder: m.Component = {
    view(): m.Vnode {
        return m(".giphy-finder", [
            m("p", t("visitors-book.label")),
            m(FinderForm),
            m(Lister, {
                list: visitorsBookState.listResult,
                selectable: true,
            }),
            m(FinderLoadMore),
        ]);
    },
};

/** Display the latest GIFs shared by visitors + interactive buttons. */
export class VisitorsBook implements m.ClassComponent {
    constructor() {
        visitorsBookState.hasShared = false;
    }

    onremove(): void {
        visitorsBookState.clearRetryTimeout();
    }

    view(): (boolean | m.Vnode<ListerAttrs>)[] {
        return [
            m("h1", t("visitors-book")),
            m("p.text-center", t("visitors-book.what")),
            visitorsBookState.isRequesting &&
                m(".loading-icon.text-center.m-30", [
                    m(
                        "",
                        m(Icon, {
                            src: sunnyOutline,
                            style: "height: 1.6rem",
                        }),
                    ),
                    t("loading.tooltip") + "...",
                ]),
            m(Lister, {
                list: visitorsBookState.storedGiphies,
                selectable: false,
            }),
            !visitorsBookState.hasShared &&
                m(
                    "p.text-center",
                    m(
                        "button",
                        {
                            onclick: () => {
                                modal({
                                    title: t("visitors-book.involve.title"),
                                    content: Finder,
                                    size: ModalSize.Large,
                                    cancelable: true,
                                });
                            },
                        },
                        [
                            m(Icon, { src: happyOutline }),
                            t("visitors-book.involve"),
                        ],
                    ),
                ),
        ];
    }
}
