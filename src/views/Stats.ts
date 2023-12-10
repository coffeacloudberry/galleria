import addCircleOutline from "@/icons/add-circle-outline.svg";
import compassOutline from "@/icons/compass-outline.svg";
import removeCircleOutline from "@/icons/remove-circle-outline.svg";
import m from "mithril";

import { globalMapState } from "../models/Map";
import { story } from "../models/Story";
import { t } from "../translate";
import { msOrKms, numberWithCommas } from "../utils";
import Icon from "./Icon";
import { durationString } from "./StoryPage";
import { ActivityEntry, EssentialTrackInfo } from "../webtrack";

/** List of positioning and tracking tools used in the field. */
const ListPositioningComponent: m.Component = {
    view(): m.Vnode | null {
        if (!(story.gpsConfig instanceof Array)) {
            return null;
        }
        return m("li", [
            t("map.stats.source.pos"),
            m("ul", [
                ...story.gpsConfig.map((oneConfig) =>
                    m(
                        "li",
                        m("small", oneConfig.model),
                        m("br.small-screen"),
                        m(
                            "small",
                            ` (${
                                oneConfig.multiBandEnabled
                                    ? t("multi-band")
                                    : t("single-band")
                            }, ${
                                oneConfig.multiGNSSEnabled
                                    ? t("multi-gnss")
                                    : t("single-gnss")
                            }, ${
                                oneConfig.waasEgnosEnabled
                                    ? t("waas-egnos-enabled")
                                    : t("waas-egnos-disabled")
                            })`,
                        ),
                    ),
                ),
                m("li", m("small", t("topo-maps"))),
            ]),
        ]);
    },
};

/** Spin until the data can be displayed. */
const LoadingStats: m.Component = {
    view(): m.Vnode {
        return m(".loading-icon.text-center.m-30", [
            m("", m(Icon, { src: compassOutline, style: "height: 1.6rem" })),
            `${t("loading.tooltip")}...`,
        ]);
    },
};

interface MetresAttrs {
    value: number;
}

const Metres: m.Component<MetresAttrs> = {
    view({ attrs }: m.Vnode<MetresAttrs>): m.Vnode {
        return m("strong", `${numberWithCommas(attrs.value)} m`);
    },
};

const ExpandDataSourceButton: m.Component = {
    view(): m.Vnode {
        return m(
            "button.light-icon-button.ml-3.vatb",
            {
                onclick: (): void => {
                    story.isDataSourceExpanded = !story.isDataSourceExpanded;
                },
            },
            m(Icon, {
                src: story.isDataSourceExpanded
                    ? removeCircleOutline
                    : addCircleOutline,
                style: "height: 1.3rem",
            }),
        );
    },
};

function activityToString(entry: ActivityEntry): string {
    const activityName = entry.activity.toLowerCase().replace("_", " ");
    return `${activityName}: ${msOrKms(entry.length)}`;
}

const LengthDetails: m.Component<EssentialTrackInfo> = {
    view({ attrs }: m.Vnode<EssentialTrackInfo>): m.Vnode | null {
        if (typeof attrs.length !== "number") {
            return null;
        }
        let allLengths = [
            t("map.stats.total-length"),
            " ",
            m("strong", msOrKms(attrs.length)),
        ];
        if (attrs.activities && attrs.activities.length > 1) {
            const joined = attrs.activities.map(activityToString).join(", ");
            allLengths = allLengths.concat([
                m("br.small-screen"),
                ` (${joined})`,
            ]);
        }
        return m("li", allLengths);
    },
};

const AboutElevationLi: m.Component = {
    view(): m.Vnode | null {
        if (globalMapState.webtrack === undefined) {
            return null;
        }
        return m("li", [
            t("map.stats.chart.ele.tooltip"),
            " ",
            m(
                "a",
                {
                    href: "https://github.com/coffeacloudberry/galleria/blob/master/webtrack_cli/DEM.md",
                },
                globalMapState.webtrack.getElevationSources().join(", "),
            ),
        ]);
    },
};

const DurationLi: m.Component = {
    view(): m.Vnode | null {
        if (typeof story.duration !== "number") {
            return null;
        }
        return m("li", [
            t("story.duration"),
            " ",
            m("strong", durationString(story.duration)),
        ]);
    },
};

const MinimumAltitudeLi: m.Component<EssentialTrackInfo> = {
    view({ attrs }: m.Vnode<EssentialTrackInfo>): m.Vnode | null {
        if (typeof attrs.min !== "number") {
            return null;
        }
        return m("li", [
            t("map.stats.min-alt"),
            " ",
            m(Metres, { value: attrs.min }),
        ]);
    },
};

const MaximumAltitudeLi: m.Component<EssentialTrackInfo> = {
    view({ attrs }: m.Vnode<EssentialTrackInfo>): m.Vnode | null {
        if (typeof attrs.max !== "number") {
            return null;
        }
        return m("li", [
            t("map.stats.max-alt"),
            " ",
            m(Metres, { value: attrs.max }),
        ]);
    },
};

const ElevationLi: m.Component<EssentialTrackInfo> = {
    view({ attrs }: m.Vnode<EssentialTrackInfo>): m.Vnode | null {
        if (typeof attrs.gain !== "number" || typeof attrs.loss !== "number") {
            return null;
        }
        return m("li", [
            t("map.stats.total-ele"),
            " ",
            m(Metres, { value: attrs.gain + attrs.loss }),
            m("br.small-screen"),
            ` (${t("map.stats.gain")} `,
            m(Metres, { value: attrs.gain }),
            `, ${t("map.stats.loss")} `,
            m(Metres, { value: -attrs.loss }),
            ")",
        ]);
    },
};

/**
 * Statistics about the track, embedded into a tooltip or directly in the page
 * for mobile screen.
 */
export const StatsComponent: m.Component = {
    view(): (m.Vnode | boolean)[] | null {
        if (globalMapState.webtrack === undefined) {
            return [m(LoadingStats)];
        }

        const stats = globalMapState.webtrack.getTrackInfo();
        const hasEle = stats.trackPoints.withEle > 0;
        return [
            m("p", m("strong", t("map.stats"))),
            m("ul.blabla", [
                m(DurationLi),
                m(LengthDetails, stats),
                hasEle && m(MinimumAltitudeLi, stats),
                hasEle && m(MaximumAltitudeLi, stats),
                hasEle && m(ElevationLi, stats),
            ]),
            m("p", [
                m("strong", t("map.stats.source")),
                m(ExpandDataSourceButton),
            ]),
            story.isDataSourceExpanded &&
                m("ul.blabla", [
                    m(ListPositioningComponent),
                    hasEle && m(AboutElevationLi),
                ]),
        ];
    },
};
