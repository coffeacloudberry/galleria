import compassOutline from "@/icons/compass-outline.svg";
import m from "mithril";

import { globalMapState } from "../models/Map";
import { GpsConfig, story } from "../models/Story";
import { t } from "../translate";
import { numberWithCommas } from "../utils";
import Icon from "./Icon";

interface ListPositioningComponentAttrs {
    configs: GpsConfig[];
}

/** List of positioning and tracking tools used in the field. */
const ListPositioningComponent: m.Component<ListPositioningComponentAttrs> = {
    view({ attrs }: m.Vnode<ListPositioningComponentAttrs>): m.Vnode {
        return m("ul", [
            ...attrs.configs.map((oneConfig) =>
                m(
                    "li",
                    m(
                        "small",
                        `${String(oneConfig.model)} (${
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
        ]);
    },
};

/** Spin until the data can be displayed. */
const LoadingStats: m.Component = {
    view(): m.Vnode {
        return m(".loading-icon.text-center.m-30", [
            m("", m(Icon, { src: compassOutline, style: "height: 1.6rem" })),
            t("loading.tooltip") + "...",
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

/**
 * Statistics about the track, embedded into a tooltip or directly in the page
 * for mobile screen.
 */
export const StatsComponent: m.Component = {
    view(): m.Vnode[] | null {
        if (globalMapState.webtrack === undefined) {
            return [m(LoadingStats)];
        }

        const stats = globalMapState.webtrack.getTrackInfo();
        const hasEle = stats.trackPoints.withEle > 0;
        return [
            m("p", m("strong", t("map.stats"))),
            m("ul.blabla", [
                typeof stats.length === "number" &&
                    m("li", [
                        t("map.stats.total-length"),
                        " ",
                        m(
                            "strong",
                            `${Math.round(stats.length / 10) / 100} km`,
                        ),
                    ]),
                typeof stats.min === "number" &&
                    hasEle &&
                    m("li", [
                        t("map.stats.min-alt"),
                        " ",
                        m(Metres, { value: stats.min }),
                    ]),
                typeof stats.max === "number" &&
                    hasEle &&
                    m("li", [
                        t("map.stats.max-alt"),
                        " ",
                        m(Metres, { value: stats.max }),
                    ]),
                typeof stats.gain === "number" &&
                    typeof stats.loss === "number" &&
                    hasEle &&
                    m("li", [
                        t("map.stats.total-ele"),
                        " ",
                        m(Metres, { value: stats.gain + stats.loss }),
                        ` (${t("map.stats.gain")} `,
                        m(Metres, { value: stats.gain }),
                        `, ${t("map.stats.loss")} `,
                        m(Metres, { value: -stats.loss }),
                        ")",
                    ]),
            ]),
            m("p", m("strong", t("map.stats.source"))),
            m("ul.blabla", [
                story.gpsConfig instanceof Array &&
                    m("li", [
                        t("map.stats.source.pos"),
                        m(ListPositioningComponent, {
                            configs: story.gpsConfig,
                        }),
                    ]),
                hasEle &&
                    m("li", [
                        t("map.stats.chart.ele.tooltip"),
                        " ",
                        m(
                            "a",
                            {
                                href: "https://github.com/coffeacloudberry/WebTrackCLI/blob/main/DEM.md",
                            },
                            globalMapState.webtrack
                                .getElevationSources()
                                .join(", "),
                        ),
                    ]),
            ]),
        ];
    },
};
