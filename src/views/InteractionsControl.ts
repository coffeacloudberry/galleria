import type mapboxgl from "mapbox-gl";

import { globalMapState } from "../models/Map";

const allInteractions = [
    "scrollZoom",
    "boxZoom",
    "dragRotate",
    "keyboard",
    "doubleClickZoom",
    "touchZoomRotate",
];

export function setInteractions(map: mapboxgl.Map, enable: boolean): void {
    const canvasContainer = map
        .getContainer()
        .querySelector(".mapboxgl-canvas-container") as Element;

    if (enable) {
        map.dragPan.enable({
            // to avoid flying far away with a sensitive mouse
            deceleration: 0,
        });
        allInteractions.forEach((interaction: string) => {
            // @ts-expect-error
            map[interaction].enable();
        });
        canvasContainer.classList.add("mapboxgl-interactive");
    } else {
        map.dragPan.disable();
        allInteractions.forEach((interaction: string) => {
            // @ts-expect-error
            map[interaction].disable();
        });
        canvasContainer.classList.remove("mapboxgl-interactive");
    }
    if (
        "navigation" in globalMapState.controls &&
        map.hasControl(globalMapState.controls.navigation)
    ) {
        // @ts-expect-error
        globalMapState.controls.navigation.enableButtons(enable);
    }
}
