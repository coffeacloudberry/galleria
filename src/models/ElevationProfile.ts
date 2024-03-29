import type { ChartConfiguration, TooltipItem, Color } from "chart.js";
import type { AnnotationOptions } from "chartjs-plugin-annotation";
import type { Position } from "geojson";

import { t } from "../translate";
import { isMobile, msOrKms } from "../utils";
import { extraIcons, globalMapState } from "./Map";
import { Activity, Segment } from "../webtrack";

type xyLonLatPoint = { x: number; y: number; lon: number; lat: number };

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
        const source = extraIcons[wpt.label];
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
        annotations[`vertical line ${String(idx)}`] = {
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

function activityBackground(activity: string): Color {
    const mappedActivity = Activity[activity as keyof typeof Activity];
    switch (mappedActivity) {
        case Activity.MOTORED_BOAT:
        case Activity.ROWING_BOAT:
            return "rgba(0,0,255,0.63)";
        default:
            return "rgba(139,147,26,0.63)";
    }
}

function formatDatasets(seg: Segment) {
    let prevX = -1;
    const dataPoints: xyLonLatPoint[] = [];
    for (const point of seg.points) {
        const isDuplicate = prevX === point[2];
        prevX = point[2];
        if (!isDuplicate) {
            dataPoints.push({
                x: point[2] / 1000,
                y: point[3],
                lon: point[0],
                lat: point[1],
            });
        }
    }
    return {
        label: seg.activity,
        data: dataPoints,

        // smooth (kind of antialiasing)
        tension: 0.1,

        // filling
        fill: true,
        backgroundColor: activityBackground(seg.activity),

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
}

function tooltipCallbackLabel(tooltipItem: TooltipItem<"line">): string {
    const activity = tooltipItem.dataset.label;
    const raw = tooltipItem.raw as xyLonLatPoint;
    if ("lon" in raw && "lat" in raw && !globalMapState.mouseInsideMap) {
        globalMapState.moveHiker(raw.lon, raw.lat, activity as Activity);
    }
    if (!("x" in raw && "y" in raw)) {
        return "";
    }
    const textEle = `${t("map.stats.chart.ele.tooltip")} ${raw.y} m`;
    const dist = msOrKms(raw.x * 1000);
    const textDist = `${t("map.stats.chart.dist.tooltip")} ${dist}`;
    return `${textEle} | ${textDist}`;
}

function tooltipFilter(data: TooltipItem<"line">): boolean {
    return data.datasetIndex === 0 || data.dataIndex > 0;
}

/**
 * Chart configuration.
 * @param profile Data.
 * @param waypoints List of waypoints already connected along the path.
 * @param lines Vertical lines separating segments.
 */
export function myChartConfig(
    profile: Segment[],
    waypoints: ChartWaypoint[],
    lines: Position[],
): ChartConfiguration {
    return {
        type: "line",
        data: {
            datasets: profile.map(formatDatasets),
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
                        label: tooltipCallbackLabel,
                        title: () => "",
                    },
                    filter: tooltipFilter,
                    displayColors: false,
                    borderColor: "rgb(67,121,67)",
                    backgroundColor: "rgba(255,255,255,0.66)",
                    bodyColor: "rgb(0,0,0)",
                    borderWidth: 1,
                    yAlign: "bottom",
                    caretSize: 10,
                    caretPadding: 10, // above the cross-pointer
                    bodyFont: {
                        weight: "bold",
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
}
