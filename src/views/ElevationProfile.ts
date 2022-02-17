import m from "mithril";

import { config } from "../config";
import CustomLogging from "../CustomLogging";
import { createElevationChart } from "../models/ElevationProfile";
import { globalMapState } from "../models/Map";
import { injectCode } from "../utils";

declare const Chart: typeof import("chart.js");

const error = new CustomLogging("error");

async function injectChart() {
    // skipcq: JS-0356
    const Chart = await import("chart.js");
}

/** Element containing the canvas used by the chart. */
export class ChartContainer implements m.ClassComponent {
    private static buildChart(canvasContainer: HTMLCanvasElement): void {
        if (
            typeof Chart === "function" &&
            globalMapState.webtrack !== undefined
        ) {
            const points = globalMapState.webtrack.getTrack()[0].points;
            const canvas = document.createElement("canvas");
            canvasContainer.innerHTML = "";
            canvasContainer.appendChild(canvas);
            const ctx = canvas.getContext("2d");
            if (ctx) {
                createElevationChart(ctx, points);
            }
        }
    }

    async oncreate({ dom }: m.VnodeDOM): Promise<void> {
        return await injectCode(config.chart.js)
            .then(injectChart)
            .then(() => {
                // first build
                ChartContainer.buildChart(dom as HTMLCanvasElement);
            })
            .catch((err) => {
                error.log(err);
            });
    }

    onupdate({ dom }: m.VnodeDOM): void {
        // need to re-build when switching the language for example
        ChartContainer.buildChart(dom as HTMLCanvasElement);
    }

    view(): m.Vnode {
        return m(".chart-container");
    }
}
