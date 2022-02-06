import type {
    ChartConfiguration,
    Chart as TChart,
    TooltipItem,
} from "chart.js";
import type { Position } from "geojson";

import { t } from "../translate";
import { globalMapState } from "./Map";

declare const Chart: typeof import("chart.js");

export let chart: TChart | undefined = undefined;

type LonLatPoint = { lon: number; lat: number };

/**
 * Return the object if the lon and lat fields exist, return null otherwise.
 */
function withLonLatOrNull(el: unknown): LonLatPoint | null {
    if (el instanceof Object) {
        return "lon" in el && "lat" in el ? el : null;
    }
    return null;
}

type xyPoint = { x: number; y: number };

/**
 * Return the object if the x and y fields exist, return null otherwise.
 */
function withXYOrNull(el: unknown): xyPoint | null {
    if (el instanceof Object) {
        return "x" in el && "y" in el ? el : null;
    }
    return null;
}

/**
 * Returns the content of the tooltip used in the elevation chart.
 */
function labelElevation(tooltipItem: TooltipItem<"line">): string {
    const raw = withXYOrNull(tooltipItem.raw);
    if (raw === null) {
        return "";
    }
    return `${t("map.stats.chart.ele.tooltip")} ${raw.y} m | ${t(
        "map.stats.chart.dist.tooltip",
    )} ${Math.round(raw.x * 10) / 10} km`;
}

/**
 * Instantiate the Chart.
 * @param ctx Canvas used by the chart.
 * @param profile Data.
 */
export function createElevationChart(
    ctx: CanvasRenderingContext2D,
    profile: Position[],
): void {
    const data = [];
    for (let i = 0; i < profile.length; i++) {
        data[i] = {
            x: profile[i][2] / 1000,
            y: profile[i][3],
            lon: profile[i][0],
            lat: profile[i][1],
        };
    }

    const myChartConfig: ChartConfiguration = {
        type: "line",
        data: {
            datasets: [
                {
                    data,

                    // smooth (kind of antialiasing)
                    tension: 0.1,

                    // filling
                    fill: true,

                    // no markers on points (too many)
                    radius: 0,

                    // design the pointer
                    hoverRadius: 10,
                    pointStyle: "cross",
                    hoverBorderWidth: 1,

                    // line width
                    borderWidth: 1,
                },
            ],
        },
        options: {
            backgroundColor: "rgba(139,147,26,0.63)",
            borderColor: "rgb(0,0,0)",
            animation: false,
            scales: {
                xAxes: {
                    type: "linear",
                    position: "bottom",
                    title: {
                        display: true,
                        text: t("map.stats.chart.dist.label"),
                    },
                },
                yAxes: {
                    type: "linear",
                    position: "left",
                    title: {
                        display: true,
                        text: t("map.stats.chart.ele.label"),
                    },
                },
            },
            interaction: {
                // make sure there is only one found item at a time
                // (don't show duplicates)
                mode: "index",

                // apply the tooltip at all time
                intersect: false,
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (tooltipItem: TooltipItem<"line">) => {
                            const raw = withLonLatOrNull(tooltipItem.raw);
                            if (raw !== null) {
                                globalMapState.moveHiker(raw.lon, raw.lat);
                            }
                            return labelElevation(tooltipItem);
                        },
                        title: () => {
                            return "";
                        },
                    },
                    displayColors: false,
                    borderColor: "rgb(67,121,67)",
                    backgroundColor: "rgba(255,255,255,0.42)",
                    bodyColor: "rgb(0,0,0)",
                    borderWidth: 1,
                },
                legend: {
                    display: false,
                },
            },

            // resize the canvas when the container does
            responsive: true,

            // do not keep the original / meaningless ratio
            maintainAspectRatio: false,
        },
    };

    Chart.defaults.font = {
        family: "MyBodyFont",
        size: 14,
    };

    try {
        chart = new Chart.Chart(ctx, myChartConfig);
    } catch {} // may occur when updating a chart not displayed at this time
}
