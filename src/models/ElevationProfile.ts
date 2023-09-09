import type {
    Chart as TypeChart,
    ChartConfiguration,
    TooltipItem,
} from "chart.js";
import type { AnnotationOptions } from "chartjs-plugin-annotation";
import type { Position } from "geojson";

import { t } from "../translate";
import { isMobile, msOrKms } from "../utils";
import { extraIcons, globalMapState } from "./Map";
import { Activity, Segment } from "../webtrack";

declare const Chart: typeof import("chart.js");

export let chart: TypeChart | undefined;

type LonLatPoint = { lon: number; lat: number };

/**
 * Return the object if the lon and lat fields exist, return null otherwise.
 */
function withLonLatOrNull(el: unknown): LonLatPoint | null {
    if (el instanceof Object) {
        // @ts-ignore
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
        // @ts-ignore
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
    const textEle = `${t("map.stats.chart.ele.tooltip")} ${raw.y} m`;
    const dist = msOrKms(raw.x * 1000);
    const textDist = `${t("map.stats.chart.dist.tooltip")} ${dist}`;
    return `${textEle} | ${textDist}`;
}

interface ChartWaypoint {
    point: Position;
    label?: string;
}

type Annotations = Record<string, AnnotationOptions<"label" | "line">>;

function createAnnotations(
    waypoints: ChartWaypoint[],
    lines: Position[],
): Annotations {
    const annotations: Annotations = {};
    waypoints.forEach((wpt, idx) => {
        if (wpt.label === undefined || !(wpt.label in extraIcons)) {
            return;
        }
        const source = extraIcons[wpt.label].source;
        const iconSize = isMobile() ? 20 : 28; // px
        const image = new Image(iconSize, iconSize);
        image.src = `/assets/map/${source}.png`;
        annotations[wpt.label + String(idx)] = {
            type: "label",
            xValue: wpt.point[2] / 1000,
            xScaleID: "x",
            yValue: wpt.point[3],
            yScaleID: "y",
            content: image,
        };
    });
    for (let idx = 0; idx < lines.length - 1; idx++) {
        annotations["vertical line " + String(idx)] = {
            type: "line",
            xMax: lines[idx][2] / 1000,
            xMin: lines[idx][2] / 1000,
            xScaleID: "x",
            borderColor: "rgb(0,0,0,0.2)",
            borderWidth: 2,
            borderDash: [6, 6],
        };
    }
    return annotations;
}

function activityBackground(activity: string) {
    const mappedActivity = Activity[activity as keyof typeof Activity];
    switch (mappedActivity) {
        case Activity.MOTORED_BOAT:
        case Activity.ROWING_BOAT:
            return "rgba(0,0,255,0.63)";
        default:
            return "rgba(139,147,26,0.63)";
    }
}

/**
 * Instantiate the Chart.
 * @param ctx Canvas used by the chart.
 * @param profile Data.
 * @param waypoints List of waypoints already connected along the path.
 * @param lines Vertical lines separating segments.
 */
export function createElevationChart(
    ctx: CanvasRenderingContext2D,
    profile: Segment[],
    waypoints: ChartWaypoint[],
    lines: Position[],
): void {
    const myChartConfig: ChartConfiguration = {
        type: "line",
        data: {
            datasets: profile.map((seg) => {
                let prevX = -1;
                return {
                    label: seg.activity,
                    data: seg.points
                        .map((point) => {
                            const isDuplicate = prevX === point[2];
                            prevX = point[2];
                            return isDuplicate
                                ? null
                                : {
                                      x: point[2] / 1000,
                                      y: point[3],
                                      lon: point[0],
                                      lat: point[1],
                                  };
                        })
                        .filter((v) => v !== null),

                    // smooth (kind of antialiasing)
                    tension: 0.1,

                    // filling
                    fill: true,
                    backgroundColor: () => activityBackground(seg.activity),

                    // no markers on points (too many)
                    radius: 0,

                    // design the pointer
                    hoverRadius: 10,
                    pointStyle: "cross",
                    hoverBorderWidth: 1,

                    // line width
                    borderWidth: 1,
                    borderColor: "rgb(0,0,0)",
                };
            }),
        },
        options: {
            animation: false,
            scales: {
                x: {
                    type: "linear",
                    position: "bottom",
                    title: {
                        display: true,
                        text: t("map.stats.chart.dist.label"),
                    },
                },
                y: {
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
                mode: "nearest",

                // apply the tooltip at all time
                intersect: false,
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (tooltipItem: TooltipItem<"line">) => {
                            const activity = tooltipItem.dataset.label;
                            const raw = withLonLatOrNull(tooltipItem.raw);
                            if (raw !== null) {
                                globalMapState.moveHiker(
                                    raw.lon,
                                    raw.lat,
                                    activity as Activity,
                                );
                            }
                            return labelElevation(tooltipItem);
                        },
                        title: () => {
                            return "";
                        },
                    },
                    filter: (data) =>
                        data.datasetIndex === 0 || data.dataIndex > 0,
                    displayColors: false,
                    borderColor: "rgb(67,121,67)",
                    backgroundColor: "rgba(255,255,255,0.66)",
                    bodyColor: "rgb(0,0,0)",
                    borderWidth: 1,
                    yAlign: "bottom",
                    caretSize: 10,
                    caretPadding: 10, // above the cross pointer
                    bodyFont: {
                        family: "MyBoldFont",
                        size: 14,
                    },
                },
                legend: {
                    display: false,
                },
                annotation: {
                    annotations: createAnnotations(waypoints, lines),
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
    } catch {
        // continue regardless of error
        // may occur when updating a chart not displayed at this time
    }
}
