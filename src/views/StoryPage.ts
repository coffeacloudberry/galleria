import CalendarOutline from "@/icons/calendar-outline.svg";
import FlowerOutline from "@/icons/flower-outline.svg";
import ImagesOutline from "@/icons/images-outline.svg";
import LeafOutline from "@/icons/leaf-outline.svg";
import NorthernLightsWinterOutline from "@/icons/northern-lights-winter-outline.svg";
import PartlySunnyOutline from "@/icons/partly-sunny-outline.svg";
import RainyOutline from "@/icons/rainy-outline.svg";
import SnowOutline from "@/icons/snow-outline.svg";
import StopwatchOutline from "@/icons/stopwatch-outline.svg";
import SunnyOutline from "@/icons/sunny-outline.svg";
import SunnyWinterOutline from "@/icons/sunny-winter-outline.svg";
import m from "mithril";
import tippy, { Instance as TippyInstance, inlinePositioning } from "tippy.js";

import { globalMapState } from "../models/Map";
import { story } from "../models/Story";
import type { EasyDate, LinkedPhoto } from "../models/Story";
import type { SeasonStrings, StoryInfo } from "../models/Story";
import { t } from "../translate";
import { hideAllForce } from "../utils";
import { InsideCluster, InsideClusterAttrs, Loading } from "./Cluster";
import { ChartContainer } from "./ElevationProfile";
import { Feedback } from "./Feedback";
import { Header, HeaderAttrs } from "./Header";
import Icon from "./Icon";
import Map from "./Map";
import { MapAttributions } from "./MapAttributions";
import { StatsComponent } from "./Stats";

/** Get the story ID from the path. */
function getStoryId(): string {
    return m.route.param("title");
}

interface StorySubTitleAttrs {
    start: EasyDate | null;
    season: SeasonStrings | null;
    duration: number | null;
    totalPhotos?: number | null;
}

export function durationString(durationNumber: number): string | null {
    if (!durationNumber) {
        return null;
    }
    const argTranslate = durationNumber < 1 ? "0" : Math.floor(durationNumber);
    return String(t(durationNumber % 1 ? "half-days" : "days", argTranslate));
}

class SeasonComponent implements m.ClassComponent<StorySubTitleAttrs> {
    static iconSeason(season: SeasonStrings): string {
        switch (season) {
            case "winter":
                return SnowOutline;
            case "sunny winter":
                return SunnyWinterOutline;
            case "spring":
                return FlowerOutline;
            case "summer":
            case "polar summer":
                return PartlySunnyOutline;
            case "autumn":
                return LeafOutline;
            case "rainy":
                return RainyOutline;
            case "dark winter":
                return NorthernLightsWinterOutline;
            default:
                return SunnyOutline;
        }
    }

    static isViewable(attrs: StorySubTitleAttrs): boolean {
        return attrs.season !== null;
    }

    // skipcq: JS-0105
    view({ attrs }: m.CVnode<StorySubTitleAttrs>): m.Vnode | null {
        return (
            attrs.season &&
            m("span", [
                m(Icon, { src: SeasonComponent.iconSeason(attrs.season) }),
                " ",
                t("seasons", attrs.season),
            ])
        );
    }
}

class StartDateComponent implements m.ClassComponent<StorySubTitleAttrs> {
    static isViewable(attrs: StorySubTitleAttrs): boolean {
        return attrs.start !== null;
    }

    // skipcq: JS-0105
    view({ attrs }: m.CVnode<StorySubTitleAttrs>): m.Vnode | null {
        return (
            attrs.start &&
            m("span", [
                m(Icon, { src: CalendarOutline }),
                " ",
                t("story.start"),
                t("date", attrs.start.month, {
                    day: attrs.start.day,
                    year: attrs.start.year,
                }),
            ])
        );
    }
}

class DurationComponent implements m.ClassComponent<StorySubTitleAttrs> {
    static isViewable(attrs: StorySubTitleAttrs): boolean {
        return typeof attrs.duration === "number";
    }

    // skipcq: JS-0105
    view({ attrs }: m.CVnode<StorySubTitleAttrs>): m.Vnode | null {
        if (typeof attrs.duration === "number") {
            return m("span", [
                m(Icon, { src: StopwatchOutline }),
                " ",
                t("story.duration"),
                durationString(attrs.duration),
            ]);
        } else {
            return null;
        }
    }
}

class TotalPhotoComponent implements m.ClassComponent<StorySubTitleAttrs> {
    static isViewable(attrs: StorySubTitleAttrs): boolean {
        return typeof attrs.totalPhotos === "number";
    }

    // skipcq: JS-0105
    view({ attrs }: m.CVnode<StorySubTitleAttrs>): m.Vnode | null {
        if (typeof attrs.totalPhotos === "number") {
            return m("span", [
                m(Icon, { src: ImagesOutline }),
                " ",
                t("photos", attrs.totalPhotos ? attrs.totalPhotos : "0"),
            ]);
        } else {
            return null;
        }
    }
}

export const StorySubTitle: m.Component<StorySubTitleAttrs> = {
    view({ attrs }: m.Vnode<StorySubTitleAttrs>): m.Vnode {
        const components = [
            SeasonComponent,
            StartDateComponent,
            DurationComponent,
            TotalPhotoComponent,
        ];
        return m(
            ".period",
            components
                .filter((component) => component.isViewable(attrs))
                .flatMap((component) => [m("br"), m(component, attrs)])
                .slice(1),
        );
    },
};

class PhotosPreview implements m.ClassComponent {
    clusterContent: InsideClusterAttrs = { photos: [] };
    allPhotos: LinkedPhoto[] = [];

    constructor() {
        this.loadPhotosIfNeeded();
    }

    onupdate(): void {
        this.loadPhotosIfNeeded();
    }

    loadPhotosIfNeeded() {
        if (this.allPhotos === story.photos) {
            return;
        }
        this.allPhotos = story.photos || [];
        this.clusterContent = {
            photos: this.allPhotos.map((photo) => {
                return {
                    id: photo.id,
                    image: new Image(),
                    ready: false,
                };
            }),
        };
        this.loadClusterPhotos();
    }

    /** Load one photo at a time to avoid glitch. */
    loadClusterPhotos(latestLoad = 0) {
        if (this.clusterContent.photos.length === latestLoad) {
            return;
        }
        const currentPhoto = this.clusterContent.photos[latestLoad];
        currentPhoto.image.onload = () => {
            currentPhoto.ready = true;
            m.redraw();
            this.loadClusterPhotos(latestLoad + 1);
        };
        currentPhoto.image.src = `/content/photos/${currentPhoto.id}/t.webp`;
    }

    view(): m.Vnode {
        if (this.clusterContent.photos.some((item) => item.ready)) {
            return m(".cluster-story", m(InsideCluster, this.clusterContent));
        } else {
            return m(".cluster-story.loading-cluster", m(Loading));
        }
    }
}

const StoryTitle: m.Component = {
    view() {
        const hasPhotos = typeof story.totalPhotos === "number" && story.photos;
        return [
            m("h1", story.title),
            m(StorySubTitle, {
                start: story.start,
                season: story.season,
                duration: story.duration,
                totalPhotos: story.totalPhotos,
            }),
            hasPhotos && m(PhotosPreview),
        ];
    },
};

const GeoData: m.Component = {
    view(): m.Vnode[] {
        const extraClassMap = globalMapState.isLoadingLayers
            ? ""
            : "full-opacity";
        return [
            m(".container", m(".row", m(".one.column", m(StatsComponent)))),
            m(".one.column", [
                globalMapState.hasElevation && m(ChartContainer),
                m(
                    "div",
                    {
                        class: `map-extra ${extraClassMap}`,
                    },
                    [
                        m(Map),
                        !globalMapState.mapLoadFailure && m(MapAttributions),
                    ],
                ),
            ]),
        ];
    },
};

function textInStoryTippy(result: StoryInfo | null = null): string {
    if (result?.title) {
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
        m.request<StoryInfo>({
            method: "GET",
            url: "/content/stories/:storyId/_/i.:lang.json",
            params: { storyId, lang: t.getLang() },
        })
            .then((result) => {
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
                m(Feedback),
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
