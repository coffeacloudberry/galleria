import m from "mithril";

import { config } from "../config";
import CustomLogging from "../CustomLogging";
import { createElevationChart } from "../models/ElevationProfile";
import { globalMapState } from "../models/Map";
import { injectCode } from "../utils";

declare const turf: typeof import("@turf/turf");
declare const Chart: typeof import("chart.js");

const error = new CustomLogging("error");

/**
 * Create the canvas, instantiate the chart, and populate with the
 * available data from the WebTrack.
 * @param canvasContainer Canvas element.
 */
function createChart(canvasContainer: HTMLCanvasElement): Promise<void> {
    return Promise.all([
        injectCode(config.turf.js),
        injectCode(config.chart.js),
    ])
        .then(async () => {
            if (typeof turf === "undefined") {
                // skipcq: JS-0356
                const turf = await import("@turf/turf");
            }
            if (typeof Chart === "undefined") {
                // skipcq: JS-0356
                const Chart = await import("chart.js");
            }
            await injectCode(config.chartPluginAnnotation.js);
        })
        .then(() => {
            if (globalMapState.webtrack === undefined) {
                return;
            }
            const points = globalMapState.webtrack.getTrack()[0].points;
            const waypoints = globalMapState.webtrack
                .getWaypoints()
                .map((wpt) => {
                    return {
                        point: points[
                            turf.nearestPointOnLine(
                                turf.lineString(points),
                                turf.point([wpt.lon, wpt.lat]),
                            ).properties.index as number
                        ],
                        label: wpt.sym,
                    };
                });
            const canvas = document.createElement("canvas");
            canvasContainer.innerHTML = "";
            canvasContainer.appendChild(canvas);
            const ctx = canvas.getContext("2d");
            if (ctx) {
                createElevationChart(ctx, points, waypoints);
            }
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

    async onupdate({ dom }: m.VnodeDOM): Promise<void> {
        return await createChart(dom as HTMLCanvasElement);
    }

    view(): m.Vnode {
        return m(".chart-container");
    }
}
