import compassOutline from "@/icons/compass-outline.svg";
import m from "mithril";

import { GpsConfig, story } from "../models/Story";
import { t } from "../translate";
import { numberWithCommas } from "../utils";
import WebTrack from "../webtrack";
import Icon from "./Icon";

interface ListPositioningComponentAttrs {
    configs: GpsConfig[];
}

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

export interface StatsComponentAttrs {
    webtrack: WebTrack | undefined;
}

/**
 * Statistics about the track, embedded into a tooltip or directly in the page
 * for mobile screen.
 */
export const StatsComponent: m.Component<StatsComponentAttrs> = {
    view({ attrs }: m.Vnode<StatsComponentAttrs>): m.Vnode[] {
        if (attrs.webtrack === undefined) {
            return [
                m(".loading-icon.text-center.m-30", [
                    m(
                        "",
                        m(Icon, {
                            src: compassOutline,
                            style: "height: 1.6rem",
                        }),
                    ),
                    t("loading.tooltip") + "...",
                ]),
            ];
        }

        const stats = attrs.webtrack.getTrackInfo();
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
                        m("strong", `${numberWithCommas(stats.min)} m`),
                    ]),
                typeof stats.max === "number" &&
                    hasEle &&
                    m("li", [
                        t("map.stats.max-alt"),
                        " ",
                        m("strong", `${numberWithCommas(stats.max)} m`),
                    ]),
                typeof stats.gain === "number" &&
                    typeof stats.loss === "number" &&
                    hasEle &&
                    m("li", [
                        t("map.stats.total-ele"),
                        " ",
                        m(
                            "strong",
                            `${numberWithCommas(stats.gain + stats.loss)} m`,
                        ),
                        ` (${t("map.stats.gain")} `,
                        m("strong", `${numberWithCommas(stats.gain)} m`),
                        `, ${t("map.stats.loss")} `,
                        m("strong", `-${numberWithCommas(stats.loss)} m`),
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
                                href: "https://github.com/ExploreWilder/WebTrackCLI/blob/main/DEM.md",
                            },
                            attrs.webtrack.getElevationSources().join(", "),
                        ),
                    ]),
            ]),
        ];
    },
};
