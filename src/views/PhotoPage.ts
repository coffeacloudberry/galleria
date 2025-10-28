import apertureOutline from "@/icons/aperture-outline.svg";
import timeFutureOutline from "@/icons/time-future-outline.svg";
import timeFutureStop from "@/icons/time-future-stop.svg";
import timeFuture from "@/icons/time-future.svg";
import timePastOutline from "@/icons/time-past-outline.svg";
import timePastStop from "@/icons/time-past-stop.svg";
import timePast from "@/icons/time-past.svg";
import m from "mithril";
import tippy, { Instance as TippyInstance } from "tippy.js";

import { config } from "../config";
import { photo } from "../models/Photo";
import { t } from "../translate";
import { getPhotoId, hideAllForce, isMobile } from "../utils";
import { Header, HeaderAttrs } from "./Header";
import Icon from "./Icon";
import PhotoMetadata from "./PhotoMetadata";

/** Photo with potential overlay on transitions. */
const CurrentPhoto: m.Component = {
    view(): m.Vnode {
        const dimNext =
            photo.transitionOnNext ||
            (photo.isPreloading && photo.nextIsLeavingCurrentStory);
        const dimPrev =
            photo.transitionOnPrev ||
            (photo.isPreloading && photo.prevIsLeavingCurrentStory);

        return m(".current-photo", [
            m("img", {
                src: photo.currentImageSrc,
                class: dimNext || dimPrev ? "dim" : "",
            }),
            (dimNext || dimPrev) &&
                m("p.end-of-album", [
                    t("transition"),
                    m("br"),
                    dimNext && t("transition.next"),
                    dimPrev && t("transition.prev"),
                ]),
        ]);
    },
};

/** Prev, current, and next photo components. */
const Gallery: m.Component = {
    view(): m.Vnode {
        const hideNext = photo.isPreloading;
        const hidePrev = photo.isFirst() || hideNext;
        return m("section.gallery", [
            m(".goto-photo-screen-nav.goto-prev-photo", {
                class: hidePrev ? "invisible" : "",
                onclick: (): void => {
                    photo.loadPrev();
                },
            }),
            m(CurrentPhoto),
            m(".goto-photo-screen-nav.goto-next-photo", {
                class: hideNext ? "invisible" : "",
                onclick: (): void => {
                    photo.loadNext();
                },
            }),
        ]);
    },
};

/** Next photo is the older photo. */
const NextButton: m.Component = {
    view(): m.Vnode<m.RouteLinkAttrs> {
        const notInStory = photo.meta?.storyPhotoIncrement === undefined;
        const lastInStory =
            !notInStory && photo.meta?.storyPhotoIncrement === 1;
        let tippyContent = lastInStory
            ? t("photo.next.story")
            : t("next.tooltip");
        if (!isMobile()) {
            tippyContent += ` (${t("keystroke")} ➡)`;
        }
        return m(
            m.route.Link,
            {
                href: "",
                onclick: (e: Event): void => {
                    e.preventDefault();
                    photo.loadNext();
                },
                class: `nav-item ${photo.isPreloading ? "invisible" : ""}`,
                "data-tippy-content": tippyContent,
            },
            m(Icon, { src: lastInStory ? timePastOutline : timePast }),
        );
    },
};

/** Last photo is the oldest photo. */
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
            m(Icon, { src: timePastStop }),
        );
    },
};

/** First photo is the newest, most recently published photo. */
const FirstButton: m.Component = {
    view(): m.Vnode<m.RouteLinkAttrs> {
        return m(
            m.route.Link,
            {
                href: m.buildPathname("/:lang/photo", {
                    lang: t.getLang(),
                }),
                class: `nav-item ${
                    photo.isFirst() || photo.isPreloading ? "invisible" : ""
                }`,
                "data-tippy-content": t("first.tooltip"),
            },
            m(Icon, { src: timeFutureStop }),
        );
    },
};

/** Previous photo is the newer, more recently published photo. */
const PrevButton: m.Component = {
    view(): m.Vnode<m.RouteLinkAttrs> {
        const notInStory = photo.meta?.storyPhotoIncrement === undefined;
        const firstInStory =
            !notInStory &&
            photo.meta?.storyPhotoIncrement === photo.meta?.photosInStory;
        let tippyContent = firstInStory
            ? t("photo.previous.story")
            : t("previous.tooltip");
        if (!isMobile()) {
            tippyContent += ` (${t("keystroke")} ⬅)`;
        }
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
                "data-tippy-content": tippyContent,
            },
            m(Icon, { src: firstInStory ? timeFutureOutline : timeFuture }),
        );
    },
};

class LoadingSpinner implements m.ClassComponent {
    private tippyInstance: TippyInstance | undefined;

    static tippyContent(): string {
        return `${t("loading.tooltip")}...`;
    }

    oncreate({ dom }: m.CVnodeDOM): void {
        this.tippyInstance = tippy(dom, {
            content: LoadingSpinner.tippyContent(),
            arrow: false,
        });
    }

    onupdate(): void {
        if (this.tippyInstance) {
            this.tippyInstance.setContent(LoadingSpinner.tippyContent());
        }
    }

    onbeforeremove(): void {
        if (this.tippyInstance) {
            this.tippyInstance.unmount();
        }
    }

    onremove(): void {
        if (this.tippyInstance) {
            this.tippyInstance.destroy();
        }
    }

    view(): m.Vnode {
        return m(
            "span.loading-icon.nav-item",
            m(Icon, { src: apertureOutline }),
        );
    }
}

interface FooterAttrs {
    refPage: string;
}

/** Next/prev buttons and loading spin. */
const Footer: m.Component<FooterAttrs> = {
    view({ attrs }: m.Vnode<FooterAttrs>): m.Vnode {
        let photoTitle = null;
        try {
            photoTitle = photo.meta?.title[t.getLang()];
        } catch {
            // continue regardless of error
        }
        return m(
            "footer",
            m(
                "nav",
                {
                    class: attrs.refPage === "photo" ? "nav-photo" : "",
                },
                [
                    // in a span to be grouped
                    m("span", [m(FirstButton), m(PrevButton)]),
                    photo.isPreloading && m(LoadingSpinner),
                    !photo.isPreloading &&
                        photoTitle &&
                        m(PhotoMetadata, { class: "nav-item long-item" }),
                    m("span", [
                        photo.isLast() ? m(FirstButton) : m(NextButton),
                        m(LastButton),
                    ]),
                ],
            ),
        );
    },
};

/**
 * Load the next photo
 * based on the custom event listener (keyboard, swipe).
 */
function onEventRight() {
    if (!photo.isPreloading) {
        hideAllForce();
        photo.loadNext();
        m.redraw(); // transition when leaving the story if any
    }
}

/**
 * Load the previous photo
 * based on the custom event listener (keyboard, swipe).
 */
function onEventLeft() {
    if (!photo.isFirst() && !photo.isPreloading) {
        hideAllForce();
        photo.loadPrev();
        m.redraw(); // transition when leaving the story if any
    }
}

/** Go to the previous or next photo with keystrokes. */
function onKeyPressed(e: KeyboardEvent) {
    switch (e.code) {
        case "ArrowRight":
            onEventRight();
            break;
        case "ArrowLeft":
            onEventLeft();
            break;
        default:
            break;
    }
}

/** Touch screen handler for navigating with left/right swipes. */
class Touch {
    /** Position on swipe start. */
    initial = { x: null as number | null, y: null as number | null };

    /** True if the event should be skipped. */
    static _skipEvent(): boolean {
        // don't want to swipe when a modal is open
        return document.getElementsByClassName("modal").length > 0;
    }

    /** When starting to swipe. */
    onTouchStarted(e: TouchEvent) {
        if (!Touch._skipEvent()) {
            this.initial = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }

    /** Right after the swipe has been initiated. */
    onTouchMoved(e: TouchEvent) {
        if (
            Touch._skipEvent() ||
            this.initial.x === null ||
            this.initial.y === null
        ) {
            return;
        }
        const diffX = e.touches[0].clientX - this.initial.x;
        const diffY = e.touches[0].clientY - this.initial.y;
        if (Math.abs(diffX) > Math.abs(diffY)) {
            // sliding horizontally
            if (diffX > 0) {
                onEventLeft();
            } else {
                onEventRight();
            }
        }
        this.initial = { x: null, y: null };
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
        const photoTitle = photo.meta.title[t.getLang()];
        if (!photoTitle) {
            return t("photo.title");
        }
        const additionalInfo =
            photo.storyTitle &&
            photoTitle !== photo.storyTitle &&
            photo.storyLang === t.getLang()
                ? `${photo.storyTitle} - `
                : "";
        return `${photoTitle} - ${additionalInfo}${t("photo.title")}`;
    }
    return t("photo.title");
}

/** Complete photography page with links to the next/prev photo. */
export default function PhotoPage(): m.Component {
    t.init();
    let currentLang = t.getLang();
    const touch = new Touch();
    const touchStarted = (e: TouchEvent) => {
        touch.onTouchStarted(e);
    };
    const touchMoved = (e: TouchEvent) => {
        touch.onTouchMoved(e);
    };

    return {
        oninit(): void {
            photo.fullResetState();
        },
        oncreate(): void {
            document.title = t("photo.title");
            document.addEventListener("keydown", onKeyPressed);
            document.addEventListener("touchstart", touchStarted);
            document.addEventListener("touchmove", touchMoved);
            void photo.load(getPhotoId());
            t.createTippies();
        },
        onremove(): void {
            document.removeEventListener("keydown", onKeyPressed);
            document.removeEventListener("touchstart", touchStarted);
            document.removeEventListener("touchmove", touchMoved);
            hideAllForce();
        },
        onupdate(): void {
            if (photo.notFound) {
                m.route.set(`/${t.getLang()}/lost`);
            }
            const selectedPhotoId = getPhotoId();

            // if the URL has been updated through the browser navigation
            // buttons or the address bar or m.route.set() which triggers
            // an update, then load the photo. The logic is to change the
            // path and load the photo consequently.
            if (
                !photo.isLoading &&
                selectedPhotoId &&
                selectedPhotoId <= config.firstPhotoId &&
                photo.id !== null &&
                selectedPhotoId !== photo.id &&
                !photo.transitionOnNext &&
                !photo.transitionOnPrev
            ) {
                void photo.load(selectedPhotoId);
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
