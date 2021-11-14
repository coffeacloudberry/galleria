import bookOutline from "@/icons/book-outline.svg";
import m from "mithril";

import { OneStory } from "../models/AllStories";
import { allStories } from "../models/AllStories";
import { story } from "../models/Story";
import { t } from "../translate";
import ApplauseButton from "./ApplauseButton";
import { Header, HeaderAttrs } from "./Header";
import Icon from "./Icon";
import { StorySubTitle } from "./StoryPage";

/**
 * Check if an element is visible in the viewport.
 * Under MIT, Copyright (c) 2015 Toke Voltelen
 * From: https://github.com/Tokimon/vanillajs-browser-helpers
 * Demo: https://jsfiddle.net/t2L274ty/2/
 */
function checkVisible(elm: Element, threshold?: number, mode?: string) {
    threshold = threshold || 0;
    mode = mode || "visible";

    const rect = elm.getBoundingClientRect();
    const viewHeight = Math.max(
        document.documentElement.clientHeight,
        window.innerHeight,
    );
    const above = rect.bottom - threshold < 0;
    const below = rect.top - viewHeight + threshold >= 0;

    if (mode === "above") {
        return above;
    } else {
        return mode === "below" ? below : !above && !below;
    }
}

/**
 * Call on scroll or on first load. Get all story titles in the DOM and load
 * the story title and content if visible or above the viewport.
 */
function lazyLoadStories(): void {
    const storyClasses = document.getElementsByClassName("one-story");
    for (const oneClass of storyClasses) {
        if (!checkVisible(oneClass, 0, "below")) {
            const titleId = oneClass.getAttribute("data-id");
            if (titleId) {
                allStories.loadOneStory(titleId);
            }
        }
    }
}

/** Keep only the first few words of a text. */
function cutText(longText: string): string {
    let cutPosition = 200;
    // cut to the first 200 characters minus the last word, probably cut
    while (longText[cutPosition] != " " && cutPosition) {
        cutPosition--;
    }
    return longText.slice(0, cutPosition);
}

/**
 * Cut the text and replace all HTML tags to whitespaces.
 * It is easier to remove HTML tags than Markdown elements, that is why the
 * Markdown story is converted to HTML beforehand.
 */
function cleanUpText(longText: string): string {
    const result = cutText(longText)
        .replace(/<[^>]*>/g, " ")
        .trim();
    // the text should end with three dots
    const countDots = result.slice(-3).split(".").length - 1;
    return result + ".".repeat(3 - countDots);
}

/** Clickable thumbnail. */
const ThumbnailComponent: m.Component<OneStory> = {
    view({ attrs }: m.Vnode<OneStory>): m.Vnode<m.RouteLinkAttrs> {
        return m(
            m.route.Link,
            {
                href: m.buildPathname("/:lang/photo/:title", {
                    lang: t.getLang(),
                    title: attrs.metadata.mostRecentPhoto,
                }),
                "data-tippy-content": t("story.open-photo.tooltip"),
                "data-tippy-placement": "bottom",
            },
            m("img", {
                src: `/content/photos/${attrs.metadata.mostRecentPhoto}/t.webp`,
            }),
        );
    },
};

/** One story container, either loaded or not. */
class OneStoryComponent implements m.ClassComponent<OneStory> {
    view({ attrs }: m.CVnode<OneStory>): m.Vnode[] {
        const storyLink = m.buildPathname("/:lang/story/:title", {
            lang: t.getLang(),
            title: attrs.id,
        });
        return [
            m(
                "h1.one-story",
                {
                    "data-id": attrs.id,
                },
                m(
                    m.route.Link,
                    {
                        href: storyLink,
                        "data-tippy-content": t("photo.open-story.tooltip"),
                    },
                    attrs.title,
                ),
            ),
            m(
                ".container-fluid.p-0",
                attrs.title &&
                    m(".row", [
                        m(".two-thirds.column.p-0", [
                            m(StorySubTitle, {
                                start: story.strToEasyDate(
                                    "" + attrs.metadata.start,
                                ),
                                season: attrs.metadata.season || null,
                                duration: attrs.metadata.duration || null,
                            }),
                            m(
                                "p",
                                attrs.content &&
                                    m(
                                        "span.appetizer",
                                        cleanUpText(attrs.content),
                                    ),
                            ),
                            m(
                                ".applause-story",
                                m(
                                    m.route.Link,
                                    {
                                        href: storyLink,
                                        "data-tippy-content": t(
                                            "photo.open-story.tooltip",
                                        ),
                                    },
                                    m(Icon, { src: bookOutline }),
                                ),
                                m("span.mr-3.ml-3"),
                                m(ApplauseButton, {
                                    mediaType: "story",
                                    mediaIsLoading: false,
                                    getId: () => {
                                        return attrs.id;
                                    },
                                    applausePromise: () => {
                                        return story.applause(attrs.id);
                                    },
                                }),
                            ),
                        ]),
                        m(
                            ".one-third.column.lazy-thumbnail-container.p-0",
                            attrs.title &&
                                attrs.metadata.mostRecentPhoto &&
                                m(ThumbnailComponent, attrs),
                        ),
                    ]),
            ),
        ];
    }
}

/** The body content containing all stories if any. */
class AllStoriesComponent implements m.ClassComponent {
    view(): m.Vnode {
        return m(
            "section#stories",
            m(
                ".container",
                m(
                    ".row",
                    m(
                        ".one.column",
                        allStories.fullList &&
                            allStories.fullList.map((oneStory: OneStory) => {
                                return m(OneStoryComponent, oneStory);
                            }),
                    ),
                ),
            ),
        );
    }
}

/** The list of stories. */
export default function StoriesOverviewPage(): m.Component {
    let currentLang: string;
    return {
        oninit(): void {
            t.init();
            allStories.loadFullList();
        },
        oncreate(): void {
            document.title = "" + t("stories.title");
            t.createTippies();
            const scrollingEl = document.getElementById("stories");
            if (scrollingEl) {
                scrollingEl.onscroll = lazyLoadStories;
            }
        },
        onupdate(): void {
            const futureLang = t.getLang();
            if (currentLang !== futureLang) {
                allStories.reload();
                currentLang = futureLang;
            }
            if (allStories.noOneRequested) {
                lazyLoadStories();
            }
            t.createTippies();
        },
        view(): m.Vnode<HeaderAttrs>[] {
            return [
                m(Header, {
                    aboutButton: true,
                    refPage: "stories",
                }),
                m(AllStoriesComponent),
            ];
        },
    };
}
