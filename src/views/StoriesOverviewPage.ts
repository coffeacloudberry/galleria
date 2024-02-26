import m from "mithril";

import { OneStory, allStories } from "../models/AllStories";
import { Story } from "../models/Story";
import { t } from "../translate";
import { hideAllForce } from "../utils";
import { Header, HeaderAttrs } from "./Header";
import { StorySubTitle } from "./StoryPage";

/** Clickable thumbnail. */
class ThumbnailComponent implements m.ClassComponent<OneStory> {
    /** True when the image is cached and ready to be displayed. */
    private ready = false;

    /** The preloaded thumbnail. */
    private image = new Image();

    /** Cache the image to display a link only when the image is ready. */
    constructor({ attrs }: m.CVnode<OneStory>) {
        if (attrs.metadata === null || !attrs.metadata.mostRecentPhoto) {
            return;
        }
        const photoId = String(attrs.metadata.mostRecentPhoto);
        this.image.onload = () => {
            this.ready = true;
            m.redraw();
        };
        this.image.src = `/content/photos/${photoId}/f.webp`;
    }

    /** Display a clickable thumbnail or an empty space. */
    view({ attrs }: m.CVnode<OneStory>): m.Vnode<m.RouteLinkAttrs>[] | null {
        if (attrs.metadata === null || !attrs.metadata.mostRecentPhoto) {
            return null;
        }
        return this.ready
            ? [
                  m(
                      m.route.Link,
                      {
                          href: m.buildPathname("/:lang/photo/:title", {
                              lang: t.getLang(),
                              title: attrs.metadata.mostRecentPhoto,
                          }),
                          "data-tippy-content": t("story.open-photo.tooltip"),
                          "data-tippy-offset": "[0,0]",
                          "data-tippy-placement": "bottom",
                      },
                      m("img", {
                          src: this.image.src,
                          alt: t("story.open-photo.tooltip"),
                          width: 300,
                          height: 200,
                      }),
                  ),
                  m(".total-photo", t("photos", attrs.metadata.totalPhotos)),
              ]
            : [m("span"), m(".total-photo")];
        // the `span` is to avoid moving blocks onload
    }
}

class StoryAppetizer implements m.ClassComponent<OneStory> {
    /** Keep only the first few words of a text. */
    static cutText(longText: string): string {
        let cutPosition = 150;
        // cut to the first characters minus the last word,
        // which is probably cut
        while (longText[cutPosition] !== " " && cutPosition) {
            cutPosition--;
        }
        return longText.slice(0, cutPosition);
    }

    /**
     * Cut the text and replace all HTML tags to whitespaces.
     * It is easier to remove HTML tags than Markdown elements, that is why the
     * Markdown story is converted to HTML beforehand.
     * Titles in the content are removed. The multi-line text is transformed
     * to one line by replacing paragraph jumps into whitespaces.
     */
    static cleanUpText(longText: string): string {
        const result = StoryAppetizer.cutText(
            longText
                .replace(/<h\d>[^<]*<\/h\d>/g, "")
                .replace(/<\/p>\n*<p>/g, " ")
                .replace(/<[^<>]*>/g, ""),
        ).trim();
        // the text should end with exactly three dots
        const countDots = result.slice(-3).split(".").length - 1;
        return result + ".".repeat(3 - countDots);
    }

    // skipcq: JS-0105
    view({ attrs }: m.CVnode<OneStory>): m.Vnode | null | "" {
        return (
            attrs.content &&
            m("span.appetizer", StoryAppetizer.cleanUpText(attrs.content))
        );
    }
}

const OneStoryRow: m.Component<OneStory> = {
    view({ attrs }: m.Vnode<OneStory>): m.Vnode[] | m.Vnode | null {
        if (attrs.metadata === null) {
            return null;
        }
        if (attrs.metadata.totalPhotos === 0) {
            return m(".column.p-0", [
                m(StorySubTitle, {
                    start: Story.strToEasyDate(attrs.metadata.start),
                    season: attrs.metadata.season ?? null,
                    duration: attrs.metadata.duration ?? null,
                }),
                m("p", attrs.content && m(StoryAppetizer, attrs)),
            ]);
        }
        return [
            m(".two-thirds.column.pl-0", [
                m(StorySubTitle, {
                    start: Story.strToEasyDate(attrs.metadata.start),
                    season: attrs.metadata.season ?? null,
                    duration: attrs.metadata.duration ?? null,
                }),
                m("p", attrs.content && m(StoryAppetizer, attrs)),
            ]),
            m(
                ".one-third.column.lazy-thumbnail-container.p-0",
                attrs.title && m(ThumbnailComponent, attrs),
            ),
        ];
    },
};

/** One story container, either loaded or not. */
const OneStoryComponent: m.Component<OneStory> = {
    view({ attrs }: m.Vnode<OneStory>): m.Vnode[] | null {
        if (attrs.metadata === null) {
            return null;
        }
        const storyLink = m.buildPathname("/:lang/story/:title", {
            lang: t.getLang(),
            title: attrs.id,
        });
        const loadedLink = m(
            m.route.Link,
            {
                href: storyLink,
                "data-tippy-content": t("photo.open-story.tooltip"),
                "data-tippy-placement": "right",
            },
            attrs.title,
        );
        return [
            m(
                "h1.one-story",
                {
                    "data-id": attrs.id,
                },
                attrs.title ? loadedLink : "...",
            ),
            m(
                ".container.p-0.story-preview",
                attrs.title && m(".row", m(OneStoryRow, attrs)),
            ),
        ];
    },
};

/** The body content containing all stories if any. */
class AllStoriesComponent implements m.ClassComponent {
    // skipcq: JS-0105
    oncreate({ dom }: m.CVnodeDOM): void {
        const element = dom as HTMLElement;
        element.onscroll = () => {
            AllStoriesComponent.lazyLoadStories(element);
        };
    }

    // skipcq: JS-0105
    onremove({ dom }: m.CVnodeDOM): void {
        if (dom) {
            // remember where we are to go back there on next update
            allStories.scrollTop = dom.scrollTop;
        }
    }

    // skipcq: JS-0105
    onupdate({ dom }: m.CVnodeDOM): void {
        if (allStories.noOneRequested()) {
            const element = dom as HTMLElement;
            AllStoriesComponent.lazyLoadStories(element);
            AllStoriesComponent.scrollToStory(element);
        }
    }

    /**
     * Scroll to a story if one is specified.
     * That is to go straight to the previous position in the story list
     * so that the user does not have to scroll again all the way down.
     */
    static scrollToStory(dom: HTMLElement) {
        if (allStories.scrollTop) {
            dom.scroll({ top: allStories.scrollTop });
        }
    }

    /**
     * Check if an element is visible in the viewport.
     * Under MIT, Copyright (c) 2015 Toke Voltelen
     * From: https://github.com/Tokimon/vanillajs-browser-helpers
     * Demo: https://jsfiddle.net/t2L274ty/2/
     */
    static checkVisible(elm: Element, threshold?: number, mode?: string) {
        threshold = threshold ?? 0;
        mode = mode ?? "visible";

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

    /** Load the story title and content. */
    static lazyLoadStories(dom: HTMLElement): void {
        const storyClasses = dom.getElementsByClassName("one-story");
        for (const oneClass of storyClasses) {
            if (!AllStoriesComponent.checkVisible(oneClass, 0, "below")) {
                const titleId = oneClass.getAttribute("data-id");
                if (titleId) {
                    void allStories.loadOneStory(titleId);
                }
            }
        }
    }

    static fullList(): m.Vnode<OneStory>[] {
        return allStories.fullList.map((oneStory: OneStory) => {
            return m(OneStoryComponent, oneStory);
        });
    }

    // skipcq: JS-0105
    view(): m.Vnode {
        return m(
            "section#stories",
            m(
                ".container",
                m(
                    ".row",
                    m(
                        ".one.column",
                        allStories.fullList && AllStoriesComponent.fullList(),
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
        onremove(): void {
            hideAllForce();
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
                    refPage: "stories",
                }),
                m(AllStoriesComponent),
            ];
        },
    };
}
