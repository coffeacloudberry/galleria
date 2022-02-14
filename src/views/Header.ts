import arrowUndoOutline from "@/icons/arrow-undo-outline.svg";
import bookOutline from "@/icons/book-outline.svg";
import ellipsisHorizontal from "@/icons/ellipsis-horizontal.svg";
import imageOutline from "@/icons/image-outline.svg";
import languageOutline from "@/icons/language-outline.svg";
import listOutline from "@/icons/list-outline.svg";
import m from "mithril";
import tippy, { Instance as TippyInstance } from "tippy.js";

import { config } from "../config";
import CustomLogging from "../CustomLogging";
import { photo } from "../models/Photo";
import { story } from "../models/Story";
import { Language, t } from "../translate";
import Icon from "./Icon";

const languages = require("../languages"); // skipcq: JS-0359
const info = new CustomLogging();

/** The link to the page before landing to the about page. */
let prevHref: string | undefined; // skipcq: JS-0309

interface LanguageSelectionAttrs {
    refPage: string;
}

interface LanguageLinkAttrs {
    language: Language;
}

class LanguageSelectionComponent
    implements m.ClassComponent<LanguageSelectionAttrs>
{
    tippyInstances: TippyInstance[] | undefined;
    refPage = "";

    LanguageLink: m.Component<LanguageLinkAttrs> = {
        view: ({ attrs }: m.Vnode<LanguageLinkAttrs>) => {
            return m(
                m.route.Link,
                {
                    href: t.replaceLang(attrs.language.slug),
                    onclick: () => {
                        t.init(attrs.language.slug);
                        document.title = "" + t(this.refPage + ".title");
                        if (this.tippyInstances !== undefined) {
                            this.tippyInstances[0].hide();
                        }
                    },
                    options: { replace: true },
                    tabindex: 0,
                    class: "lang-item",
                },
                attrs.language.name,
            );
        },
    };

    oncreate(vnode: m.CVnodeDOM<LanguageSelectionAttrs>) {
        this.tippyInstances = tippy("#language-selection", {
            interactive: true,
            allowHTML: true,
            hideOnClick: false,
            interactiveBorder: 30,
            interactiveDebounce: 70,
            content: vnode.dom,
            theme: "dropdown-list",
        });
        this.refPage = vnode.attrs.refPage;
    }

    view(): m.Vnode {
        return m(
            "ul",
            languages.map((language: Language) =>
                m(
                    "li",
                    language.slug === t.getLang()
                        ? m(".lang-item", language.name)
                        : m(this.LanguageLink, { language }),
                ),
            ),
        );
    }
}

interface OpenPhotoAttrs {
    title: string;
}

const OpenPhoto: m.Component<OpenPhotoAttrs> = {
    view({ attrs }: m.Vnode<OpenPhotoAttrs>) {
        const photoPath = story.getPhotoPath();
        return m(
            m.route.Link,
            {
                href: photoPath || "/",
                class: "nav-item",
                "data-tippy-content": photoPath
                    ? t("story.open-photo.tooltip")
                    : t("story.open-any-photo.tooltip"),
            },
            [
                m("span.long-item", [
                    m(Icon, { src: imageOutline }),
                    attrs.title && m("span.ml-3", attrs.title),
                ]),
                m("span.short-item", m(Icon, { src: imageOutline })),
            ],
        );
    },
};

interface OpenStoryAttrs {
    title: string;
}

const OpenStory: m.Component<OpenStoryAttrs> = {
    view({ attrs }: m.Vnode<OpenStoryAttrs>) {
        const storyPath = photo.getStoryPath();
        return (
            storyPath &&
            m(
                m.route.Link,
                {
                    href: storyPath,
                    class: "nav-item",
                    "data-tippy-content": t("photo.open-story.tooltip"),
                },
                [
                    m("span.long-item", [
                        attrs.title && m("span.mr-3", attrs.title),
                        m(Icon, { src: ellipsisHorizontal }),
                    ]),
                    m("span.short-item", m(Icon, { src: bookOutline })),
                ],
            )
        );
    },
};

/**
 * Remember the current path so that we could go back later one thanks to the
 * "back to the photography or story" button.
 */
function rememberLastContent() {
    const contentPath = m.route.get();
    if (contentPath.includes("/story/") || contentPath.includes("/photo/")) {
        prevHref = contentPath;
        info.log(`Remember path ${contentPath}`);
    }
}

const AboutButton: m.Component = {
    view(): m.Vnode<m.RouteLinkAttrs> {
        return m(
            m.route.Link,
            {
                href: t.prependLang("/about"),
                onclick: rememberLastContent,
                class: "nav-item",
                "data-tippy-content": t("about.tooltip"),
            },
            [
                m("span.long-item", [
                    m("span.logo"),
                    m("span.ml-3", t("about")),
                ]),
                m("span.short-item.logo", m("span")),
            ],
        );
    },
};

const GoToStoriesButton: m.Component = {
    view(): m.Vnode<m.RouteLinkAttrs> {
        return m(
            m.route.Link,
            {
                href: m.buildPathname("/:lang/stories", {
                    lang: t.getLang(),
                }),
                onclick: rememberLastContent,
                "data-tippy-content": t("stories-overview"),
                class: "nav-item",
            },
            m(Icon, { src: listOutline }),
        );
    },
};

const BackToContentButton: m.Component = {
    view(): m.Vnode<m.RouteLinkAttrs> {
        return m(
            m.route.Link,
            {
                // previous page with updated lang or default
                href:
                    prevHref !== undefined
                        ? t.replaceLang(t.getLang(), prevHref)
                        : "",
                onclick: (e: Event) => {
                    if (prevHref === undefined) {
                        e.preventDefault();
                        m.route.set("/:lang/photo/:id", {
                            lang: t.getLang(),
                            id: config.firstPhotoId,
                        });
                    }
                },
                class: "nav-item",
                "data-tippy-content": t("back-to-photo.tooltip"),
            },
            m("span", m(Icon, { src: arrowUndoOutline })),
        );
    },
};

export interface HeaderAttrs {
    title?: string; // only used if refPage is story or photo
    aboutButton: boolean;
    refPage: string;
}

export class Header implements m.ClassComponent<HeaderAttrs> {
    oncreate({ attrs }: m.CVnode<HeaderAttrs>): void {
        m.mount(document.createElement("div"), {
            view: () => {
                return m(LanguageSelectionComponent, {
                    refPage: attrs.refPage,
                });
            },
        });
    }

    view({ attrs }: m.CVnode<HeaderAttrs>): m.Vnode {
        // skipcq: JS-0309
        let centeredNav: m.Vnode<OpenPhotoAttrs | OpenStoryAttrs> | null;

        switch (attrs.refPage) {
            case "story":
                centeredNav = m("span.limit-width", [
                    story.gotContent &&
                        m("span", m("em.mr-3.long-item", story.title)),
                    m(OpenPhoto, {
                        title: String(attrs.title),
                    }),
                ]);
                break;
            case "photo":
                let photoTitle = null;
                try {
                    // @ts-ignore
                    photoTitle = photo.meta.title[t.getLang()];
                } catch {}
                centeredNav = m("span.limit-width", [
                    photoTitle &&
                        m("span.photo-title", [
                            m("em", photoTitle),
                            m("span.short-item", [
                                photo.storyTitle && m("span.ml-3.mr-3", " – "),
                                m(
                                    m.route.Link,
                                    {
                                        href: photo.getStoryPath() || "",
                                    },
                                    attrs.title,
                                ),
                            ]),
                        ]),
                    m(OpenStory, {
                        title: String(attrs.title),
                    }),
                ]);
                break;
            default:
                centeredNav = m(".nav-item.branding", t("about.title"));
        }
        return m(
            "header",
            m("nav" + (attrs.refPage === "photo" ? ".nav-photo" : ""), [
                m(
                    ".flex-sides",
                    m("span", [
                        attrs.aboutButton
                            ? m(AboutButton)
                            : m(BackToContentButton),
                        attrs.refPage == "stories"
                            ? m(BackToContentButton)
                            : m(GoToStoriesButton),
                    ]),
                ),
                centeredNav,
                m(
                    ".flex-sides.flex-right",
                    m(
                        "span",
                        {
                            id: "language-selection",
                            class: "nav-item",
                            tabindex: 0, // make it selectable
                        },
                        m("span", m(Icon, { src: languageOutline })),
                    ),
                ),
            ]),
        );
    }
}
