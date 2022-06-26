import apertureOutline from "@/icons/aperture-outline.svg";
import chevronBackOutline from "@/icons/chevron-back-outline.svg";
import chevronForwardOutline from "@/icons/chevron-forward-outline.svg";
import playBackOutline from "@/icons/play-back-outline.svg";
import playForwardOutline from "@/icons/play-forward-outline.svg";
import returnUpBackOutline from "@/icons/return-up-back-outline.svg";
import m from "mithril";

import { config } from "../config";
import { photo } from "../models/Photo";
import { t } from "../translate";
import { getPhotoId, hideAllForce, isMobile } from "../utils";
import { Header, HeaderAttrs } from "./Header";
import Icon from "./Icon";

/** Prev, current, and next photo components. */
const Gallery: m.Component = {
    view(): m.Vnode {
        const hideNext = photo.isPreloading;
        const hidePrev = photo.isFirst() || hideNext;
        return m("section#gallery", [
            m(
                ".goto-photo-screen-nav.goto-prev-photo" +
                    (hidePrev ? ".invisible" : ""),
                {
                    onclick: (): void => {
                        photo.loadPrev();
                    },
                },
            ),
            m(
                "#current-photo",
                m("img", {
                    src: photo.currentImageSrc,
                }),
            ),
            m(
                ".goto-photo-screen-nav.goto-next-photo" +
                    (hideNext ? ".invisible" : ""),
                {
                    onclick: (): void => {
                        photo.loadNext();
                    },
                },
            ),
        ]);
    },
};

const RewindButton: m.Component = {
    view(): m.Vnode<m.RouteLinkAttrs> {
        return m(
            m.route.Link,
            {
                href: "",
                onclick: (e: Event): void => {
                    e.preventDefault();
                    photo.loadNext();
                },
                class: `nav-item ${photo.isPreloading ? "invisible" : ""}`,
                "data-tippy-content":
                    t("rewind.tooltip") +
                    (!isMobile() ? ` (${t("keystroke")} ➡)` : ""),
            },
            m(Icon, { src: returnUpBackOutline }),
        );
    },
};

const NextButton: m.Component = {
    view(): m.Vnode<m.RouteLinkAttrs> {
        return m(
            m.route.Link,
            {
                href: "",
                onclick: (e: Event): void => {
                    e.preventDefault();
                    photo.loadNext();
                },
                class: `nav-item ${photo.isPreloading ? "invisible" : ""}`,
                "data-tippy-content":
                    t("next.tooltip") +
                    (!isMobile() ? ` (${t("keystroke")} ➡)` : ""),
            },
            m(Icon, { src: chevronForwardOutline }),
        );
    },
};

const LastButton: m.Component = {
    view(): m.Vnode<m.RouteLinkAttrs> {
        return m(
            m.route.Link,
            {
                href: m.buildPathname("/:lang/photo/:title", {
                    lang: t.getLang(),
                    title: config.lastPhotoId,
                }),
                class: `nav-item ${
                    photo.isLast() || photo.isPreloading ? "invisible" : ""
                }`,
                "data-tippy-content": t("last.tooltip"),
            },
            m(Icon, { src: playForwardOutline }),
        );
    },
};

const FirstButton: m.Component = {
    view(): m.Vnode<m.RouteLinkAttrs> {
        return m(
            m.route.Link,
            {
                href: m.buildPathname("/:lang/photo/:title", {
                    lang: t.getLang(),
                    title: config.firstPhotoId,
                }),
                class: `nav-item ${
                    photo.isFirst() || photo.isPreloading ? "invisible" : ""
                }`,
                "data-tippy-content": t("first.tooltip"),
            },
            m(Icon, { src: playBackOutline }),
        );
    },
};

const PrevButton: m.Component = {
    view(): m.Vnode<m.RouteLinkAttrs> {
        return m(
            m.route.Link,
            {
                href: "",
                onclick: (e: Event): void => {
                    e.preventDefault();
                    photo.loadPrev();
                },
                class: `nav-item ${
                    photo.isFirst() || photo.isPreloading ? "invisible" : ""
                }`,
                "data-tippy-content":
                    t("previous.tooltip") +
                    (!isMobile() ? ` (${t("keystroke")} ⬅)` : ""),
            },
            m(Icon, { src: chevronBackOutline }),
        );
    },
};

/**
 * Display an animated loading spin or the progress in the current story if
 * the photo is linked to a story.
 */
const ProgressComponent: m.Component = {
    view(): m.Vnode {
        if (
            !photo.isPreloading &&
            photo.storyTitle &&
            photo.meta &&
            photo.meta.storyPhotoIncrement &&
            photo.meta.photosInStory
        ) {
            const tippy = `${t("album-progress")} ${photo.storyTitle}`;
            const total = photo.meta.photosInStory;
            return m(
                "span.nav-item.album-pagination",
                {
                    "data-tippy-content": tippy,
                },
                [
                    total - photo.meta.storyPhotoIncrement + 1,
                    m("span.separator", "/"),
                    total,
                ],
            );
        }
        return m(
            `span.loading-icon.nav-item${photo.isPreloading ? "" : ".hide"}`,
            {
                "data-tippy-content": t("loading.tooltip") + "...",
            },
            m(Icon, { src: apertureOutline }),
        );
    },
};

interface FooterAttrs {
    refPage: string;
}

/**
 * Next/prev buttons and dynamic feedback (loading spin).
 *
 * The tooltip is not displayed as expected on quickly created/deleted
 * elements, the loading/ready state is therefore updated via CSS only
 * (no DOM swap).
 */
const Footer: m.Component<FooterAttrs> = {
    view({ attrs }: m.Vnode<FooterAttrs>): m.Vnode {
        return m(
            "footer",
            m("nav" + (attrs.refPage === "photo" ? ".nav-photo" : ""), [
                // in a span to be grouped
                m("span", [m(FirstButton), m(PrevButton)]),
                m(ProgressComponent),
                m("span", [
                    photo.isLast() ? m(RewindButton) : m(NextButton),
                    m(LastButton),
                ]),
            ]),
        );
    },
};

/** Go to the previous or next photo with keystrokes. */
function onKeyPressed(e: KeyboardEvent) {
    switch (e.code) {
        case "ArrowRight":
            if (!photo.isPreloading) {
                hideAllForce();
                photo.loadNext();
            }
            break;
        case "ArrowLeft":
            if (!photo.isFirst() && !photo.isPreloading) {
                hideAllForce();
                photo.loadPrev();
            }
            break;
    }
}

/**
 * The string visible in the page content.
 * The story title is visible only if different from the photo title and if
 * both the photo and the story title are in the same language. Since all
 * languages are included in the JSON file for the photo, the language switch
 * has no lag and the language of the photo title is considered to be the
 * current language.
 */
function pageTitle(): string {
    if (photo.meta) {
        // @ts-ignore
        const photoTitle = photo.meta.title[t.getLang()];
        if (photo.storyTitle === null) {
            return ""; // no story linked to the photo
        }
        return photo.storyTitle &&
            photoTitle !== photo.storyTitle &&
            photo.storyLang === t.getLang()
            ? `${t("photo.open-story.pre-title")} ${photo.storyTitle}`
            : `${t("photo.open-story.tooltip")}`;
    }
    return "";
}

/**
 * The string visible in the window title and bookmark name.
 * The story title is appended to the photo title only if different from the
 * photo title and if both the photo and the story title are in the same
 * language. Since all languages are included in the JSON file for the photo,
 * the language switch has no lag and the language of the photo title is
 * considered to be the current language.
 */
function documentTitle(): string {
    if (photo.meta) {
        // @ts-ignore
        const photoTitle = photo.meta.title[t.getLang()];
        if (!photoTitle) {
            return t("photo.title");
        }
        const additionalInfo =
            photo.storyTitle &&
            photoTitle !== photo.storyTitle &&
            photo.storyLang === t.getLang()
                ? photo.storyTitle + " - "
                : "";
        return `${photoTitle + " - " + additionalInfo}${t("photo.title")}`;
    }
    return t("photo.title");
}

/** Complete photography page with links to the next/prev photo. */
export default function PhotoPage(): m.Component {
    t.init();
    let currentLang = t.getLang();
    const selectedPhotoId = getPhotoId();
    if (selectedPhotoId === null) {
        photo.loadFirst();
    } else {
        void photo.load(selectedPhotoId);
    }

    return {
        oncreate(): void {
            document.title = t("photo.title");
            t.createTippies();
            document.addEventListener("keydown", onKeyPressed);
        },
        onremove(): void {
            document.removeEventListener("keydown", onKeyPressed);
            hideAllForce();
        },
        onupdate(): void {
            let routePhotoId = NaN;
            try {
                routePhotoId = parseInt(m.route.param("title"));
            } catch {}

            // if the URL has been updated through the browser navigation
            // buttons or the address bar or m.route.set() which triggers
            // an update, then load the photo. The logic is to change the
            // path and load the photo consequently.
            if (
                !photo.isLoading &&
                !isNaN(routePhotoId) &&
                routePhotoId <= config.firstPhotoId &&
                photo.id !== null &&
                routePhotoId !== photo.id
            ) {
                void photo.load(routePhotoId);
            }

            const futureLang = t.getLang();
            document.title = documentTitle();
            if (currentLang !== futureLang) {
                photo.loadOriginStoryTitle();
                currentLang = futureLang;
            }
            t.createTippies();
        },
        view(): [m.Vnode<HeaderAttrs>, m.Vnode, m.Vnode<FooterAttrs>] {
            return [
                m(Header, {
                    title: pageTitle(),
                    aboutButton: true,
                    refPage: "photo",
                }),
                m(Gallery),
                m(Footer, {
                    refPage: "photo",
                }),
            ];
        },
    };
}
