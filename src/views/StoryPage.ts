import m from "mithril";
import tippy, { Instance as TippyInstance } from "tippy.js";

import { EasyDate, SeasonStrings, story } from "../models/Story";
import { t } from "../translate";
import { hideAllForce, transformExternalLinks } from "../utils";
import ApplauseButton from "./ApplauseButton";
import { Header, HeaderAttrs } from "./Header";
import Map from "./Map";

function getStoryId(): string {
    const splitPath = m.parsePathname(m.route.get()).path.split("/");
    return splitPath[splitPath.length - 1];
}

interface DurationAttrs {
    duration: number;
}

const Duration: m.Component<DurationAttrs> = {
    view({ attrs }: m.Vnode<DurationAttrs>): string {
        const argTranslate =
            attrs.duration < 1 ? "0" : Math.floor(attrs.duration);
        return (
            "" +
            t("story.duration") +
            t(attrs.duration % 1 ? "half-days" : "days", argTranslate)
        );
    },
};

interface StorySubTitleAttrs {
    start: EasyDate | null;
    season: SeasonStrings | null;
    duration: number | null;
}

export const StorySubTitle: m.Component<StorySubTitleAttrs> = {
    view({ attrs }: m.Vnode<StorySubTitleAttrs>): m.Vnode {
        return m(".period", [
            attrs.start &&
                "" +
                    t("story.start") +
                    t("date", attrs.start.month, {
                        day: attrs.start.day,
                        year: attrs.start.year,
                    }),
            attrs.start && attrs.season && " • ",
            attrs.season && t("seasons", attrs.season),
            (attrs.start || attrs.season) && attrs.duration && " • ",
            attrs.duration &&
                m(Duration, {
                    duration: attrs.duration,
                }),
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

export default function StoryPage(): m.Component {
    let currentLang: string;
    let tippyAbbr: TippyInstance[] = [];
    return {
        oninit(): void {
            t.init();
            currentLang = t.getLang();
            story.load(getStoryId());
        },
        oncreate(): void {
            document.title = t("story.title");
            t.createTippies();
            transformExternalLinks();
        },
        onremove(): void {
            hideAllForce();
        },
        onupdate(): void {
            const futureLang = t.getLang();
            const preTitle = story.title ? story.title + " - " : "";
            document.title = `${preTitle}${t("story.title")}`;
            if (currentLang !== futureLang) {
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
            transformExternalLinks();
        },
        view(): (m.Vnode<HeaderAttrs> | boolean)[] {
            const lang = t.getLang();
            const meta = story.originPhotoMeta;
            // @ts-ignore
            const photoTitle = meta !== null ? meta.title[lang] : "";

            return [
                m(Header, {
                    title: photoTitle,
                    aboutButton: true,
                    refPage: "story",
                }),
                story.isLoaded() &&
                    m(
                        "section#story",
                        m(
                            ".container",
                            m(".row", [
                                m(".one.column", [
                                    m(StoryTitle),
                                    m(
                                        ".story-content",
                                        m.trust("" + story.content),
                                    ),
                                ]),
                                story.hasGeodata &&
                                    m(
                                        ".one.column",
                                        m(Map, {
                                            storyId: getStoryId(),
                                        }),
                                    ),
                                m(".one.column.applause-story", [
                                    story.isApplauding &&
                                        t("loading.tooltip") + "...",
                                    m(ApplauseButton, {
                                        mediaType: "story",
                                        mediaIsLoading: !story.isLoaded(),
                                        getId: getStoryId,
                                        applausePromise: story.applause,
                                    }),
                                ]),
                            ]),
                        ),
                    ),
            ];
        },
    };
}
