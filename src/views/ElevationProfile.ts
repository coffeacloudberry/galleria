import m from "mithril";

import { createElevationChart } from "../models/ElevationProfile";
import { globalMapState } from "../models/Map";

declare const Chart: typeof import("chart.js");

/** Element containing the canvas used by the chart. */
export const ChartContainer: m.Component = {
    onupdate({ dom }: m.CVnodeDOM): void {
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
