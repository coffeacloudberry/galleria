import m from "mithril";
import type { Placement } from "tippy.js";

import { allStories } from "../models/AllStories";
import type { OneMetadata, OneStory } from "../models/AllStories";
import { Story, TupleStoryActivity } from "../models/Story";
import type { StoryActivity } from "../models/Story";
import { t } from "../translate";
import { InteractiveTippy, hideAllForce } from "../utils";
import { Feedback } from "./Feedback";
import { Header } from "./Header";
import { StoryActivities, StorySubTitle } from "./StoryPage";

/** Clickable thumbnail. */
class ThumbnailComponent implements m.ClassComponent<OneMetadata> {
    /** True when the image is cached and ready to be displayed. */
    private ready = false;

    /** The preloaded thumbnail. */
    private image = new Image();

    private photoId: string | null = null;

    /** Cache the image to display a link only when the image is ready. */
    constructor({ attrs }: m.CVnode<OneMetadata>) {
        const photoId = this.getPhotoId(attrs);
        if (photoId) {
            this.forceLoad(photoId);
        }
    }

    onupdate({ attrs }: m.CVnode<OneMetadata>): void {
        const photoId = this.getPhotoId(attrs);
        if (photoId && photoId !== this.photoId) {
            this.forceLoad(photoId);
        }
    }

    getPhotoId(attrs: OneMetadata): undefined | string {
        if (!attrs.mostRecentPhoto) {
            return;
        }
        return String(attrs.mostRecentPhoto);
    }

    forceLoad(photoId: string): void {
        this.photoId = photoId;
        this.ready = false;
        this.image.onload = () => {
            this.ready = true;
            m.redraw();
        };
        this.image.src = `/content/photos/${this.photoId}/f.webp`;
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
            m(".story-header", [
                m("h1", loadedLink),
                m(StoryActivities, { activities: attrs.metadata.activities }),
            ]),
            m(
                ".container.p-0.story-preview",
                m(".row", m(OneStoryRow, attrs.metadata)),
            ),
        ];
    },
};

class ActivitySelection extends InteractiveTippy<void> {
    placement = "bottom" as Placement;
    arrow = true;

    onSelection(activity: "all" | StoryActivity): void {
        if (this.tippyInstance) {
            this.tippyInstance.hide();
        }
        allStories.selectedFilter = activity;
    }

    view(): m.Vnode {
        return m("div[tabindex=0].select-activity", [
            m("div", t("activity.select")), // actually displayed
            m(
                "form.activity-selector",
                ["all", ...TupleStoryActivity].map((activity) =>
                    m("div", [
                        m("input", {
                            type: "radio",
                            name: "filter",
                            id: `filter_${activity}`,
                            checked: allStories.selectedFilter === activity,
                            value: activity,
                            onchange: () => {
                                this.onSelection(activity);
                            },
                        }),
                        m(
                            `label[for=filter_${activity}]`,
                            t("activity", activity),
                        ),
                    ]),
                ),
            ),
        ]);
    }
}

/** The body content containing all stories if any. */
class AllStoriesComponent implements m.ClassComponent {
    private hasScrolled = false;
    private currentFilter = allStories.selectedFilter;

    oncreate({ dom }: m.CVnodeDOM): void {
        this.hasScrolled = false;
        const element = dom as HTMLElement;
        element.onscroll = () => {
            // avoid double scroll bar on scroll down (body + stories):
            hideAllForce();
        };
    }

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
    onupdate({ dom }: m.CVnodeDOM): void {
        const isBackAfterRemove = allStories.scrollTop && !this.hasScrolled;
        const isNewFilter = allStories.selectedFilter !== this.currentFilter;
        if (allStories.fullList && (isBackAfterRemove || isNewFilter)) {
            const element = dom as HTMLElement;
            if (isNewFilter) {
                allStories.scrollTop = 0;
            }
            element.scroll({ top: allStories.scrollTop });
            this.hasScrolled = true;
            this.currentFilter = allStories.selectedFilter;
        }
    }

    view(): m.Vnode {
        return m(
            "section.stories",
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
            allStories.loadFullList();
            t.createTippies();
        },
        view() {
            return [
                m(Feedback),
                m(Header, {
                    refPage: "stories",
                }),
                m(ActivitySelection),
                m(AllStoriesComponent),
            ];
        },
    };
}
