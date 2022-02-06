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
export const ChartContainer: m.Component = {
    async oncreate(): Promise<unknown> {
        return await injectCode(config.chart.js)
            .then(injectChart)
            .catch((err) => {
                error.log(err);
            });
    },

    onupdate({ dom }: m.VnodeDOM): void {
        if (
            typeof Chart === "function" &&
            globalMapState.webtrack !== undefined
        ) {
            const points = globalMapState.webtrack.getTrack()[0].points;
            const canvasContainer = dom as HTMLCanvasElement;
            const canvas = document.createElement("canvas");
            canvasContainer.innerHTML = "";
            canvasContainer.appendChild(canvas);
            const ctx = canvas.getContext("2d");
            if (ctx) {
                createElevationChart(ctx, points);
            }
        }
    },

    view(): m.Vnode {
        return m("#bodyCanvasEle.chart-container");
    },
};
