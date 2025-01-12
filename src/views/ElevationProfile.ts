import type { Position } from "geojson";
import m from "mithril";

import { config } from "../config";
import CustomLogging from "../CustomLogging";
import { myChartConfig } from "../models/ElevationProfile";
import type { ChartWaypoint } from "../models/ElevationProfile";
import { globalMapState, mapIcons } from "../models/Map";
import { injectCode } from "../utils";
import type { Segment } from "../webtrack";

declare const Chart: typeof import("chart.js");

const error = new CustomLogging("error");

/** Load all needed chart icons in parallel. */
async function loadSyms(): Promise<void> {
    if (!globalMapState.webtrack) {
        return;
    }
    await Promise.all(
        globalMapState.webtrack.getWaypoints().map(async (wpt) => {
            if (wpt.sym) {
                await mapIcons.loadIcon(wpt.sym);
            }
        }),
    );
}

/**
 * Get every valid points into a single list.
 * Used to get the point information from the absolute point index.
 */
function justPoints(allSegments: Segment[]): Position[] {
    return allSegments.map((seg) => seg.points.concat({} as Position)).flat();
}

/**
 * Get the last point of every segment.
 * Used to draw a vertical line in-between segments.
 */
function lastPoints(allSegments: Segment[]): Position[] {
    return allSegments.map((seg) => seg.points[seg.points.length - 1]);
}

/**
 * Get waypoint information necessary for the chart.
 * A waypoint has GPS location and index of the nearest point on the track.
 * The nearest point on the track contains the distance from the start.
 * The distance from the start is needed to show the waypoint in the chart.
 */
function projectedWaypoints(allSegments: Segment[]): ChartWaypoint[] {
    const points = justPoints(allSegments);
    if (!globalMapState.webtrack) {
        return [];
    }
    return globalMapState.webtrack
        .getWaypoints()
        .filter((wpt) => wpt.idx !== undefined && wpt.sym !== undefined)
        .map((wpt) => {
            return {
                point: points[wpt.idx as number],
                label: wpt.sym,
            };
        });
}

function newChart(canvasContainer: HTMLCanvasElement): void {
    if (globalMapState.webtrack === undefined) {
        return;
    }
    const canvas = document.createElement("canvas");
    canvasContainer.innerHTML = "";
    canvasContainer.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (ctx) {
        const allSegments = globalMapState.webtrack.getTrack();
        const lines = lastPoints(allSegments);
        const waypoints = projectedWaypoints(allSegments);
        Chart.defaults.font = {
            family: "MyBodyFont",
            size: 14,
        };
        globalMapState.chart = new Chart.Chart(
            ctx,
            myChartConfig(allSegments, waypoints, lines),
        );
    }
}

/**
 * Create the canvas, instantiate the chart, and populate with the
 * available data from the WebTrack.
 * @param canvasContainer HTML element which would contain the canvas.
 */
function createChart(canvasContainer: HTMLCanvasElement): Promise<void> {
    return injectCode(config.chart.js)
        .then(async () => {
            if (typeof Chart === "undefined") {
                const Chart = await import("chart.js");
            }
            await injectCode(config.chartPluginAnnotation.js);
            await loadSyms();
        })
        .then(() => {
            newChart(canvasContainer);
        })
        .catch((err) => {
            error.log(err);
        });
}

/** Element containing the canvas used by the chart. */
export class ChartContainer implements m.ClassComponent {
    async oncreate({ dom }: m.VnodeDOM): Promise<void> {
        return await createChart(dom as HTMLCanvasElement);
    }

    view(): m.Vnode {
        return m(".chart-container");
    }
}
