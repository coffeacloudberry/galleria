import m from "mithril";

import { allStories } from "../models/AllStories";
import type { OneMetadata, OneStory } from "../models/AllStories";
import { Story } from "../models/Story";
import { t } from "../translate";
import { hideAllForce } from "../utils";
import { Header } from "./Header";
import type { HeaderAttrs } from "./Header";
import { StorySubTitle } from "./StoryPage";

/** Clickable thumbnail. */
class ThumbnailComponent implements m.ClassComponent<OneMetadata> {
    /** True when the image is cached and ready to be displayed. */
    private ready = false;

    /** The preloaded thumbnail. */
    private image = new Image();

    /** Cache the image to display a link only when the image is ready. */
    constructor({ attrs }: m.CVnode<OneMetadata>) {
        if (!attrs.mostRecentPhoto) {
            return;
        }
        const photoId = String(attrs.mostRecentPhoto);
        this.image.onload = () => {
            this.ready = true;
            m.redraw();
        };
        this.image.src = `/content/photos/${photoId}/f.webp`;
    }

    /** Display a clickable thumbnail or an empty space. */
    view({ attrs }: m.CVnode<OneMetadata>): m.Vnode<m.RouteLinkAttrs>[] | null {
        if (!attrs.mostRecentPhoto) {
            return null;
        }
        return this.ready
            ? [
                  m(
                      m.route.Link,
                      {
                          href: m.buildPathname("/:lang/photo/:title", {
                              lang: t.getLang(),
                              title: attrs.mostRecentPhoto,
                          }),
                      },
                      m("img", {
                          src: this.image.src,
                          alt: "",
                          width: 300,
                          height: 200,
                      }),
                  ),
                  m(".total-photo", t("photos", attrs.totalPhotos)),
              ]
            : [m("span"), m(".total-photo", "...")]; // '...' for taking space
        // the `span` is to avoid moving blocks onload
    }
}

class StoryAppetizer implements m.ClassComponent<OneMetadata> {
    // skipcq: JS-0105
    view({ attrs }: m.CVnode<OneMetadata>): m.Vnode {
        return m("span.appetizer", [attrs.appetizer, m(".gradient-white")]);
    }
}

const OneStoryRow: m.Component<OneMetadata> = {
    view({ attrs }: m.Vnode<OneMetadata>): m.Vnode[] | m.Vnode {
        if (attrs.totalPhotos === 0) {
            return m(".column.p-0", [
                m(StorySubTitle, {
                    start: Story.strToEasyDate(attrs.start),
                    season: attrs.season ?? null,
                    duration: attrs.duration ?? null,
                }),
                m("p", m(StoryAppetizer, attrs)),
            ]);
        }
        return [
            m(".two-thirds.column.pl-0", [
                m(StorySubTitle, {
                    start: Story.strToEasyDate(attrs.start),
                    season: attrs.season ?? null,
                    duration: attrs.duration ?? null,
                }),
                m("p", m(StoryAppetizer, attrs)),
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
        if (!attrs.metadata.title) {
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
            },
            attrs.metadata.title,
        );
        return [
            m("h1.one-story", loadedLink),
            m(
                ".container.p-0.story-preview",
                m(".row", m(OneStoryRow, attrs.metadata)),
            ),
        ];
    },
};

/** The body content containing all stories if any. */
class AllStoriesComponent implements m.ClassComponent {
    hasScrolled = false;

    // skipcq: JS-0105
    oncreate({ dom }: m.CVnodeDOM): void {
        this.hasScrolled = false;
        const element = dom as HTMLElement;
        element.onscroll = () => {
            // avoid double scroll bar on scroll down (body + stories):
            hideAllForce();
        };
    }

    // skipcq: JS-0105
    onremove({ dom }: m.CVnodeDOM): void {
        this.hasScrolled = false;
        if (dom) {
            // remember where we are to go back there on next update
            allStories.scrollTop = dom.scrollTop;
        }
    }

    /**
     * Scroll to a story if one is specified.
     * That is to go straight to the previous position in the story list
     * so that the user does not have to scroll again all the way down.
     */
    // skipcq: JS-0105
    onupdate({ dom }: m.CVnodeDOM): void {
        if (allStories.fullList && allStories.scrollTop && !this.hasScrolled) {
            const element = dom as HTMLElement;
            element.scroll({ top: allStories.scrollTop });
            this.hasScrolled = true;
        }
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
        onremove(): void {
            hideAllForce();
        },
        onupdate(): void {
            const futureLang = t.getLang();
            if (currentLang !== futureLang) {
                allStories.loadFullList();
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
