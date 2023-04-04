import ellipsisHorizontal from "@/icons/ellipsis-horizontal.svg";
import imageOutline from "@/icons/image-outline.svg";
import languageOutline from "@/icons/language-outline.svg";
import listOutline from "@/icons/list-outline.svg";
import m from "mithril";
import tippy, { Instance as TippyInstance } from "tippy.js";

import { photo } from "../models/Photo";
import { story } from "../models/Story";
import { Language, t } from "../translate";
import Icon from "./Icon";
import PhotoMetadataIcon from "./PhotoMetadata";

const languages = require("../languages"); // skipcq: JS-0359

interface LanguageSelectionAttrs {
    refPage: string;
}

interface LanguageLinkAttrs {
    language: Language;
    refPage: string;
    tippy?: TippyInstance[];
}

const LanguageLink: m.Component<LanguageLinkAttrs> = {
    view: ({ attrs }: m.Vnode<LanguageLinkAttrs>) => {
        return m(
            m.route.Link,
            {
                href: t.replaceLang(attrs.language.slug),
                onclick: () => {
                    t.init(attrs.language.slug);
                    document.title = String(t(`${attrs.refPage}.title`));
                    if (attrs.tippy) {
                        attrs.tippy[0].hide();
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

class LanguageSelectionComponent
    implements m.ClassComponent<LanguageSelectionAttrs>
{
    tippyInstances: TippyInstance[] | undefined;

    oncreate({ dom }: m.CVnodeDOM<LanguageSelectionAttrs>) {
        this.tippyInstances = tippy("#language-selection", {
            interactive: true,
            allowHTML: true,
            hideOnClick: false,
            interactiveBorder: 30,
            interactiveDebounce: 70,
            content: dom,
            theme: "dropdown-list",
            appendTo: () => document.body,
        });
    }

    view({ attrs }: m.CVnode<LanguageSelectionAttrs>): m.Vnode {
        return m(
            "ul",
            languages.map((language: Language) =>
                m(
                    "li",
                    language.slug === t.getLang()
                        ? m(".lang-item", language.name)
                        : m(LanguageLink, {
                              language,
                              refPage: attrs.refPage,
                              tippy: this.tippyInstances,
                          }),
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
                    class: "nav-item long-item",
                    "data-tippy-content": t("photo.open-story.tooltip"),
                },
                m("span", [
                    attrs.title && m("span.mr-3", attrs.title),
                    m(Icon, { src: ellipsisHorizontal }),
                ]),
            )
        );
    },
};

const AboutButton: m.Component = {
    view(): m.Vnode<m.RouteLinkAttrs> {
        return m(
            m.route.Link,
            {
                href: t.prependLang("/about"),
                class: "nav-item",
                "data-tippy-content": t("about.tooltip"),
            },
            [
                m("span.long-item", [
                    m("span.logo"),
                    m("span.ml-3", m("strong", t("about"))),
                ]),
                m("span.short-item.logo", m("span")),
            ],
        );
    },
};

export interface HeaderAttrs {
    title?: string; // only used if refPage is story or photo
    aboutButton: boolean;
    refPage: string;
}

const GoToStoriesButton: m.Component = {
    view(): m.Vnode<m.RouteLinkAttrs> {
        return m(
            m.route.Link,
            {
                href: "/:lang/stories",
                params: {
                    lang: t.getLang(),
                },
                "data-tippy-content": t("stories-overview"),
                class: "nav-item",
            },
            m(Icon, { src: listOutline }),
        );
    },
};

export class Header implements m.ClassComponent<HeaderAttrs> {
    // skipcq: JS-0105
    oncreate({ attrs }: m.CVnode<HeaderAttrs>): void {
        m.mount(document.createElement("div"), {
            view: () => {
                return m(LanguageSelectionComponent, {
                    refPage: attrs.refPage,
                });
            },
        });
    }

    // skipcq: JS-0105
    view({ attrs }: m.CVnode<HeaderAttrs>): m.Vnode {
        // skipcq: JS-0309
        let centeredNav: m.Vnode<OpenPhotoAttrs | OpenStoryAttrs> | null;
        let photoTitle = null;

        switch (attrs.refPage) {
            case "story":
                centeredNav = m("span.limit-width", [
                    story.gotContent &&
                        m(
                            "span",
                            m("em.mr-3.long-item", m("strong", story.title)),
                        ),
                    m(OpenPhoto, {
                        title: String(attrs.title),
                    }),
                ]);
                break;
            case "photo":
                try {
                    // @ts-ignore
                    photoTitle = photo.meta.title[t.getLang()];
                } catch {
                    // continue regardless of error
                }
                centeredNav = m("span.limit-width", [
                    photoTitle &&
                        m("span.photo-title", [
                            m("em", m("strong", photoTitle)),
                            m("span.short-item", [
                                photo.storyTitle &&
                                    m(
                                        m.route.Link,
                                        {
                                            href: photo.getStoryPath() || "",
                                        },
                                        attrs.title,
                                    ),
                            ]),
                        ]),
                    photo.containsExif() && m(PhotoMetadataIcon),
                    m(OpenStory, {
                        title: String(attrs.title),
                    }),
                ]);
                break;
            default:
                centeredNav = m(
                    ".nav-item.branding",
                    m("strong", t("about.title")),
                );
        }
        return m(
            "header",
            m(
                "nav",
                {
                    class: attrs.refPage === "photo" ? "nav-photo" : "",
                },
                [
                    m(
                        ".flex-sides",
                        m("span", [
                            attrs.aboutButton
                                ? m(AboutButton)
                                : null,
                            attrs.refPage === "stories"
                                ? null
                                : m(GoToStoriesButton),
                        ]),
                    ),
                    centeredNav,
                    m(".flex-sides.flex-right", [
                        m("span.lang-item", t.getLang().toUpperCase()),
                        m(
                            "span",
                            {
                                id: "language-selection",
                                class: "nav-item",
                                tabindex: 0, // make it selectable
                            },
                            m("span", m(Icon, { src: languageOutline })),
                        ),
                    ]),
                ],
            ),
        );
    }
}
