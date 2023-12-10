import m from "mithril";
import tippy, { Instance as TippyInstance, inlinePositioning } from "tippy.js";

import { allStories } from "../models/AllStories";
import { globalMapState } from "../models/Map";
import {
    EasyDate,
    ProcessedStoryFile,
    SeasonStrings,
    story,
} from "../models/Story";
import { t } from "../translate";
import { hideAllForce } from "../utils";
import { ChartContainer } from "./ElevationProfile";
import { Header, HeaderAttrs } from "./Header";
import Map from "./Map";
import { MapAttributions } from "./MapAttributions";
import { StatsComponent } from "./Stats";
import Icon from "./Icon";
import SnowOutline from "@/icons/snow-outline.svg";
import FlowerOutline from "@/icons/flower-outline.svg";
import PartlySunnyOutline from "@/icons/partly-sunny-outline.svg";
import LeafOutline from "@/icons/leaf-outline.svg";
import RainyOutline from "@/icons/rainy-outline.svg";
import SunnyOutline from "@/icons/sunny-outline.svg";

/** Get the story ID from the path. */
function getStoryId(): string {
    return m.route.param("title");
}

interface DurationAttrs {
    duration: number;
}

export const Duration: m.Component<DurationAttrs> = {
    view({ attrs }: m.Vnode<DurationAttrs>): string {
        const argTranslate =
            attrs.duration < 1 ? "0" : Math.floor(attrs.duration);
        return String(
            t(attrs.duration % 1 ? "half-days" : "days", argTranslate),
        );
    },
};

interface StorySubTitleAttrs {
    start: EasyDate | null;
    season: SeasonStrings | null;
    duration: number | null;
}

class SeasonComponent implements m.ClassComponent<StorySubTitleAttrs> {
    private tippyInstance: TippyInstance | undefined;

    oncreate({ dom, attrs }: m.CVnodeDOM<StorySubTitleAttrs>): void {
        if (attrs.season) {
            this.tippyInstance = tippy(dom, {
                content: t("seasons", attrs.season),
                placement: "right",
            });
        }
    }

    onupdate({ attrs }: m.CVnode<StorySubTitleAttrs>): void {
        if (attrs.season && this.tippyInstance) {
            this.tippyInstance.setContent(t("seasons", attrs.season));
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

    static iconSeason(season: SeasonStrings): string {
        switch (season) {
            case "winter":
                return SnowOutline;
            case "spring":
                return FlowerOutline;
            case "summer":
                return PartlySunnyOutline;
            case "autumn":
                return LeafOutline;
            case "rainy":
                return RainyOutline;
            case "dry":
                return SunnyOutline;
        }
    }

    view({ attrs }: m.CVnode<StorySubTitleAttrs>): m.Vnode | null {
        return (
            attrs.season &&
            m(
                "span.mr-3",
                m(Icon, { src: SeasonComponent.iconSeason(attrs.season) }),
            )
        );
    }
}

export const StorySubTitle: m.Component<StorySubTitleAttrs> = {
    view({ attrs }: m.Vnode<StorySubTitleAttrs>): m.Vnode {
        return m(".period", [
            m(SeasonComponent, attrs),
            attrs.start &&
                String(
                    t("story.start") +
                        t("date", attrs.start.month, {
                            day: attrs.start.day,
                            year: attrs.start.year,
                        }),
                ),
            attrs.start &&
                attrs.season && [
                    m("span.large-screen", " • "),
                    m("br.small-screen"),
                ],
            attrs.duration && [
                t("story.duration"),
                m(Duration, {
                    duration: attrs.duration,
                }),
            ],
        ]);
    },
};

const StoryTitle: m.Component = {
    view(): m.Vnode {
        return m("h1", [
            story.title,
            (story.start || story.duration) &&
                m(StorySubTitle, {
                    start: story.start,
                    season: story.season,
                    duration: story.duration,
                }),
        ]);
    },
};

const GeoData: m.Component = {
    view(): m.Vnode[] {
        return [
            m(
                ".container",
                m(".row", m(".one.column", [m("hr"), m(StatsComponent)])),
            ),
            m(".one.column", [
                globalMapState.hasElevation && m(ChartContainer),
                m(".map-extra", [
                    m(Map),
                    !globalMapState.mapLoadFailure && m(MapAttributions),
                ]),
            ]),
        ];
    },
};

function textInStoryTippy(result: ProcessedStoryFile | null = null): string {
    if (result && result.title) {
        return `${t("open-this-story.tooltip")} ${result.title}`;
    }
    return t("photo.open-story.tooltip");
}

/**
 * Called every time the tooltip is displayed.
 * Get the translated title from the story ID.
 * The story is XHR-fetched only once and stored in a list.
 */
function onShowStoryTippy(instance: TippyInstance) {
    const ref = instance.reference as HTMLLinkElement;
    const storyId = ref.dataset.story;
    if (storyId && !ref.dataset.loadedMeta) {
        allStories
            .loadOneStory(storyId)
            .then((result: ProcessedStoryFile) => {
                ref.dataset.loadedMeta = "yes";
                instance.setContent(textInStoryTippy(result));
            })
            .catch(() => {
                instance.setContent(textInStoryTippy());
            });
    }
}

function addTippyToLinkedStories(dom: Element) {
    dom.querySelectorAll("a[data-story]").forEach((targetNode: Element) => {
        const tippyNode = targetNode as HTMLElement & { _tippy: TippyInstance };
        if (!tippyNode._tippy) {
            // Create only if not existing to avoid duplication
            tippy(tippyNode, {
                content: `${t("loading.tooltip")}...`,
                onShow: onShowStoryTippy,
                inlinePositioning: true,
                plugins: [inlinePositioning],
                offset: [0, 0],
            });
        }
    });
}

/** Print the story content. Create dynamically translated tippies. */
const StoryContent: m.Component = {
    onupdate({ dom }: m.VnodeDOM): void {
        addTippyToLinkedStories(dom);
    },

    oncreate({ dom }: m.VnodeDOM): void {
        addTippyToLinkedStories(dom);
    },

    view(): m.Vnode {
        return m(".story-content", m.trust(story.content ?? ""));
    },
};

export default function StoryPage(): m.Component {
    t.init();
    let currentLang = t.getLang();
    let tippyAbbr: TippyInstance[] = [];
    story.load(getStoryId());
    return {
        oncreate(): void {
            document.title = t("story.title");
            t.createTippies();
        },
        onremove(): void {
            hideAllForce();
        },
        onupdate(): void {
            if (story.notFound) {
                m.route.set(`/${t.getLang()}/lost`);
            }
            const routeStoryId = getStoryId();
            const futureLang = t.getLang();
            const preTitle = story.title ? `${story.title} - ` : "";
            document.title = `${preTitle}${t("story.title")}`;
            if (routeStoryId !== story.folderName) {
                story.load(routeStoryId);
            } else if (currentLang !== futureLang) {
                allStories.unload();
                story.reload();
                currentLang = futureLang;
            }
            if (story.isLoaded()) {
                if (tippyAbbr) {
                    for (const currentTippy of tippyAbbr) {
                        currentTippy.destroy();
                    }
                    tippyAbbr = [];
                }
                tippyAbbr = tippy("abbr", {
                    maxWidth: "none",
                    theme: "abbr",
                });
            }
        },
        view(): (m.Vnode<HeaderAttrs> | boolean)[] {
            const lang = t.getLang();
            const meta = story.originPhotoMeta;
            const photoTitle = meta !== null ? meta.title[lang] : "";

            return [
                m(Header, {
                    title: photoTitle,
                    refPage: "story",
                }),
                story.isLoaded() &&
                    m("section#story", [
                        m(
                            ".container",
                            m(
                                ".row",
                                m(".one.column", [
                                    m(StoryTitle),
                                    story.content && m(StoryContent),
                                ]),
                            ),
                        ),
                        story.hasGeodata && m(GeoData),
                    ]),
            ];
        },
    };
}
