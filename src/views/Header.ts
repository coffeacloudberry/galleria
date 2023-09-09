import ellipsisHorizontal from "@/icons/ellipsis-horizontal.svg";
import imageOutline from "@/icons/image-outline.svg";
import languageOutline from "@/icons/language-outline.svg";
import listOutline from "@/icons/list-outline.svg";
import m from "mithril";
import { Instance as TippyInstance, Placement } from "tippy.js";

import { photo } from "../models/Photo";
import { story } from "../models/Story";
import { Language, t } from "../translate";
import Icon from "./Icon";
import PhotoMetadataComponent from "./PhotoMetadata";
import { InteractiveTippy } from "../utils";

const languages = require("../languages"); // skipcq: JS-0359

interface MainMenuAttrs {
    refPage: string;
}

interface LanguageLinkAttrs {
    language: Language;
    refPage: string;
    tippy?: TippyInstance;
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
                        attrs.tippy.hide();
                    }
                },
                options: { replace: true },
                class: "menu-item",
            },
            attrs.language.name,
        );
    },
};

class LanguageSelection extends InteractiveTippy<MainMenuAttrs> {
    placement = "bottom" as Placement;
    arrow = true;

    view({ attrs }: m.CVnode<MainMenuAttrs>): m.Vnode {
        return m("span[tabindex=0].nav-item#rf-lang", [
            m(Icon, { src: languageOutline }), // actually displayed
            m(
                "ul",
                languages.map((language: Language) =>
                    m(
                        "li",
                        language.slug === t.getLang()
                            ? m(".menu-item", language.name)
                            : m(LanguageLink, {
                                  language,
                                  refPage: attrs.refPage,
                                  tippy: this.tippyInstance,
                              }),
                    ),
                ),
            ),
        ]);
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

interface MainMenuItemAttrs {
    refPage: string;
    href: string;
}

const MainMenuTippyContent: m.Component<MainMenuAttrs> = {
    view({ attrs }: m.CVnode<MainMenuAttrs>): m.Vnode {
        const links: MainMenuItemAttrs[] = [
            {
                refPage: "about",
                href: t.prependLang("/about"),
            },
            {
                refPage: "stories",
                href: t.prependLang("/stories"),
            },
            {
                refPage: "photo",
                href: m.buildPathname("/:lang/photo/:title", {
                    lang: t.getLang(),
                    title: photo.id || "",
                }),
            },
        ];
        return m(
            "ul",
            links.map((link: MainMenuItemAttrs) =>
                m(
                    "li",
                    attrs.refPage === link.refPage
                        ? m(".menu-item", t(link.refPage))
                        : m(
                              m.route.Link,
                              {
                                  href: link.href,
                                  class: "menu-item",
                              },
                              t(link.refPage),
                          ),
                ),
            ),
        );
    },
};

class MainMenu extends InteractiveTippy<MainMenuAttrs> {
    placement = "bottom" as Placement;
    arrow = true;

    view({ attrs }: m.CVnode<MainMenuAttrs>): m.Vnode {
        return m("span[tabindex=0].nav-item#rf-menu", [
            m(Icon, { src: listOutline }), // actually displayed
            m(MainMenuTippyContent, attrs), // not visible
        ]);
    }
}

export interface HeaderAttrs {
    title?: string; // only used if refPage is story or photo
    refPage: string;
}

export class Header implements m.ClassComponent<HeaderAttrs> {
    // skipcq: JS-0105
    view({ attrs }: m.CVnode<HeaderAttrs>): m.Vnode {
        // skipcq: JS-0309
        let centeredNav: m.Vnode<OpenPhotoAttrs | OpenStoryAttrs> | null;
        let photoTitle = null;

        switch (attrs.refPage) {
            case "story":
                centeredNav = m(
                    "span.limit-width",
                    m(OpenPhoto, {
                        title: String(attrs.title),
                    }),
                );
                break;
            case "photo":
                try {
                    // @ts-ignore
                    photoTitle = photo.meta.title[t.getLang()];
                } catch {
                    // continue regardless of error
                }
                centeredNav = m("span", [
                    photoTitle &&
                        m(".photo-page-header", [
                            m(PhotoMetadataComponent),
                            photo.storyTitle && [
                                m("br"),
                                m(
                                    m.route.Link,
                                    {
                                        href: photo.getStoryPath() || "",
                                    },
                                    attrs.title,
                                ),
                            ],
                        ]),
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
                        m(
                            "span",
                            m(MainMenu, {
                                refPage: attrs.refPage,
                            }),
                        ),
                    ),
                    centeredNav,
                    m(
                        ".flex-sides.flex-right",
                        m(
                            "span",
                            m(LanguageSelection, {
                                refPage: attrs.refPage,
                            }),
                        ),
                    ),
                ],
            ),
        );
    }
}
