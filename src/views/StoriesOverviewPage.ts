import m from "mithril";

import { OneStory, allStories } from "../models/AllStories";
import { story } from "../models/Story";
import { t } from "../translate";
import { Header, HeaderAttrs } from "./Header";
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
                void allStories.loadOneStory(titleId);
            }
        }
    }
}

/** Keep only the first few words of a text. */
function cutText(longText: string): string {
    let cutPosition = 140;
    // cut to the first characters minus the last word, which is probably cut
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
    const result = cutText(longText.replace(/<[^<>]*>/g, "")).trim();
    // the text should end with exactly three dots
    const countDots = result.slice(-3).split(".").length - 1;
    return result + ".".repeat(3 - countDots);
}

/** Clickable thumbnail. */
const ThumbnailComponent: m.Component<OneStory> = {
    view({ attrs }: m.Vnode<OneStory>): m.Vnode<m.RouteLinkAttrs> | null {
        if (attrs.metadata === null) {
            return null;
        }
        const photoId = attrs.metadata.mostRecentPhoto as `${number}`;
        return m(
            m.route.Link,
            {
                href: m.buildPathname("/:lang/photo/:title", {
                    lang: t.getLang(),
                    title: photoId,
                }),
                "data-tippy-content": t("story.open-photo.tooltip"),
                "data-tippy-offset": "[0,0]",
                "data-tippy-placement": "bottom",
            },
            m("img", {
                src: `/content/photos/${photoId}/f.webp`,
            }),
        );
    },
};

/** One story container, either loaded or not. */
class OneStoryComponent implements m.ClassComponent<OneStory> {
    view({ attrs }: m.CVnode<OneStory>): m.Vnode[] | null {
        if (attrs.metadata === null) {
            return null;
        }
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
                        "data-tippy-placement": "right",
                    },
                    attrs.title,
                ),
            ),
            m(
                ".container.p-0",
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
    oncreate({ dom }: m.CVnodeDOM): void {
        const element = dom as HTMLElement;
        element.onscroll = lazyLoadStories;
    }

    onupdate(): void {
        if (allStories.noOneRequested()) {
            lazyLoadStories();
        }
    }

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
    t.init();
    let currentLang = t.getLang();
    allStories.loadFullList();
    return {
        oncreate(): void {
            document.title = t("stories.title");
            t.createTippies();
        },
        onupdate(): void {
            const futureLang = t.getLang();
            if (currentLang !== futureLang) {
                allStories.reload();
                currentLang = futureLang;
            }
            t.createTippies();
        },
        view(): (m.Vnode<HeaderAttrs> | m.Vnode)[] {
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
