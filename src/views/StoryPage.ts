import m from "mithril";
import ApplauseButton from "./ApplauseButton";
import { hideAllForce, transformExternalLinks } from "../utils";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { Header } from "./Header";
import Map from "./Map";

const Story = require("../models/Story");
const t = require("../translate");

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
            t("story.duration") +
            t(attrs.duration % 1 ? "half-days" : "days", argTranslate)
        );
    },
};

const StoryTitle: m.Component = {
    view(): m.Vnode {
        return m("h1", [
            Story.title,
            (Story.start || Story.duration) &&
                m(".period", [
                    Story.start &&
                        t("story.start") +
                            t("date", Story.start.month, {
                                day: Story.start.day,
                                year: Story.start.year,
                            }) +
                            " • " +
                            t("seasons", Story.season),
                    Story.start && Story.duration && " • ",
                    Story.duration &&
                        m(Duration, {
                            duration: Story.duration,
                        }),
                ]),
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
            Story.load(getStoryId());
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
            const preTitle = Story.title ? Story.title + " - " : "";
            document.title = `${preTitle}${t("story.title")}`;
            if (currentLang !== futureLang) {
                Story.reload();
                currentLang = futureLang;
            }
            if (Story.isLoaded()) {
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
        view(): m.Vnode[] {
            const lang = t.getLang();
            const photoTitle =
                Story.originPhotoMeta !== null
                    ? Story.originPhotoMeta.title[lang]
                    : "";
            return [
                m(Header, {
                    title: photoTitle,
                    aboutButton: true,
                    refPage: "story",
                }),
                Story.isLoaded() &&
                    m(
                        "section#story",
                        m(
                            ".container",
                            m(".row", [
                                m(".one.column", [
                                    m(StoryTitle),
                                    m(".story-content", m.trust(Story.content)),
                                ]),
                                Story.hasGeodata &&
                                    m(
                                        ".one.column",
                                        m(Map, {
                                            storyId: getStoryId(),
                                            duration: Story.duration,
                                        }),
                                    ),
                                m(
                                    ".one.column.applause-story",
                                    m(ApplauseButton, {
                                        mediaType: "story",
                                        mediaIsLoading: !Story.isLoaded(),
                                        getId: getStoryId,
                                        applausePromise: Story.applause,
                                    }),
                                ),
                            ]),
                        ),
                    ),
            ];
        },
    };
}
