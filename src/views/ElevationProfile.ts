import { Position } from "geojson";
import m from "mithril";

import { config } from "../config";
import CustomLogging from "../CustomLogging";
import { myChartConfig } from "../models/ElevationProfile";
import { globalMapState } from "../models/Map";
import { injectCode } from "../utils";

declare const Chart: typeof import("chart.js");

const error = new CustomLogging("error");

/**
 * Create the canvas, instantiate the chart, and populate with the
 * available data from the WebTrack.
 * @param canvasContainer Canvas element.
 */
function createChart(canvasContainer: HTMLCanvasElement): Promise<void> {
    return injectCode(config.chart.js)
        .then(async () => {
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
            const allSegments = globalMapState.webtrack.getTrack();
            const points = allSegments
                .map((seg) => seg.points.concat({} as Position))
                .flat();
            const lines = allSegments.map(
                (seg) => seg.points[seg.points.length - 1],
            );
            const waypoints = globalMapState.webtrack
                .getWaypoints()
                .filter((wpt) => wpt.idx !== undefined && wpt.sym !== undefined)
                .map((wpt) => {
                    return {
                        point: points[wpt.idx as number],
                        label: wpt.sym,
                    };
                });
            const canvas = document.createElement("canvas");
            canvasContainer.innerHTML = "";
            canvasContainer.appendChild(canvas);
            const ctx = canvas.getContext("2d");
            if (ctx) {
                Chart.defaults.font = {
                    family: "MyBodyFont",
                    size: 14,
                };
                globalMapState.chart = new Chart.Chart(
                    ctx,
                    myChartConfig(allSegments, waypoints, lines),
                );
            }
        })
        .catch((err) => {
            error.log(err);
        });
}

/** Element containing the canvas used by the chart. */
export class ChartContainer implements m.ClassComponent {
    // skipcq: JS-0105
    async oncreate({ dom }: m.VnodeDOM): Promise<void> {
        return await createChart(dom as HTMLCanvasElement);
    }

    // skipcq: JS-0105
    view(): m.Vnode {
        return m(".chart-container");
    }
}
