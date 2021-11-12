import apertureOutline from "@/icons/aperture-outline.svg";
import chevronBackOutline from "@/icons/chevron-back-outline.svg";
import chevronForwardOutline from "@/icons/chevron-forward-outline.svg";
import playBackOutline from "@/icons/play-back-outline.svg";
import playForwardOutline from "@/icons/play-forward-outline.svg";
import returnUpBackOutline from "@/icons/return-up-back-outline.svg";
import m from "mithril";

import { config } from "../config";
import { getPhotoId, hideAllForce, isMobile } from "../utils";
import ApplauseButton from "./ApplauseButton";
import { Header, HeaderAttrs } from "./Header";
import Icon from "./Icon";

const Photo = require("../models/Photo");
const t = require("../translate");

/** Prev, current, and next photo components. */
const Gallery: m.Component = {
    view(): m.Vnode {
        return m("section#gallery", [
            m(
                ".goto-photo-screen-nav.goto-prev-photo" +
                    (Photo.isFirst() || Photo.isLoading ? ".invisible" : ""),
                {
                    onclick: (): void => {
                        Photo.loadPrev();
                    },
                },
            ),
            m("#current-photo", m("img#current-image-element")),
            m(
                ".goto-photo-screen-nav.goto-next-photo" +
                    (Photo.isLoading ? ".invisible" : ""),
                {
                    onclick: (): void => {
                        Photo.loadNext();
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
                    Photo.loadNext();
                },
                class: `nav-item ${Photo.isLoading ? "invisible" : ""}`,
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
                    Photo.loadNext();
                },
                class: `nav-item ${Photo.isLoading ? "invisible" : ""}`,
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
                    Photo.isLast() || Photo.isLoading ? "invisible" : ""
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
                    Photo.isFirst() || Photo.isLoading ? "invisible" : ""
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
                    Photo.loadPrev();
                },
                class: `nav-item ${
                    Photo.isFirst() || Photo.isLoading ? "invisible" : ""
                }`,
                "data-tippy-content":
                    t("previous.tooltip") +
                    (!isMobile() ? ` (${t("keystroke")} ⬅)` : ""),
            },
            m(Icon, { src: chevronBackOutline }),
        );
    },
};

const AnimatedLoading: m.Component = {
    view(): m.Vnode {
        return m(
            `span.loading-icon.nav-item${
                Photo.isLoading || Photo.isApplauding ? "" : ".hide"
            }`,
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
 * Next/prev buttons and available actions (applause) or dynamic feedback
 * (loading spin).
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
                m(AnimatedLoading),
                m(ApplauseButton, {
                    mediaType: "photo",
                    mediaIsLoading: Photo.isLoading,
                    getId: getPhotoId,
                    applausePromise: Photo.applause,
                }),
                m("span", [
                    Photo.isLast() ? m(RewindButton) : m(NextButton),
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
            if (!Photo.isLoading) {
                hideAllForce();
                Photo.loadNext();
            }
            break;
        case "ArrowLeft":
            if (!Photo.isFirst() && !Photo.isLoading) {
                hideAllForce();
                Photo.loadPrev();
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
    if (Photo.meta) {
        const photoTitle = Photo.meta.title[t.getLang()];
        if (Photo.storyTitle === null) {
            return ""; // no story linked to the photo
        }
        return Photo.storyTitle &&
            photoTitle !== Photo.storyTitle &&
            Photo.storyLang === t.getLang()
            ? `${t("photo.open-story.pre-title")} ${Photo.storyTitle}`
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
    if (Photo.meta) {
        const photoTitle = Photo.meta.title[t.getLang()];
        if (!photoTitle) {
            return t("photo.title");
        }
        const additionalInfo =
            Photo.storyTitle &&
            photoTitle !== Photo.storyTitle &&
            Photo.storyLang === t.getLang()
                ? Photo.storyTitle + " - "
                : "";
        return `${photoTitle + " - " + additionalInfo}${t("photo.title")}`;
    }
    return t("photo.title");
}

/** Complete photography page with links to the next/prev photo. */
export default function PhotoPage(): m.Component {
    let currentLang: string;
    let selectedPhotoId: number | null;

    return {
        oninit(): void {
            t.init();
            currentLang = t.getLang();
            selectedPhotoId = getPhotoId();
            selectedPhotoId === null
                ? Photo.loadFirst()
                : Photo.load(selectedPhotoId);
        },
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
                !Photo.isLoading &&
                !isNaN(routePhotoId) &&
                routePhotoId <= config.firstPhotoId &&
                Photo.id !== null &&
                routePhotoId !== Photo.id
            ) {
                Photo.load(routePhotoId);
            }

            const futureLang = t.getLang();
            document.title = documentTitle();
            if (currentLang !== futureLang) {
                Photo.loadOriginStoryTitle();
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
