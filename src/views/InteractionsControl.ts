import type mapboxgl from "mapbox-gl";

import { globalMapState } from "../models/Map";
import type { MyNavigationControl } from "./StandardControls";

enum AllInteractions {
    ScrollZoom = "scrollZoom",
    BoxZoom = "boxZoom",
    DragRotate = "dragRotate",
    Keyboard = "keyboard",
    DoubleClickZoom = "doubleClickZoom",
    TouchZoomRotate = "touchZoomRotate",
}

export function setInteractions(map: mapboxgl.Map, enable: boolean): void {
    const canvasContainer = map
        .getContainer()
        .querySelector(".mapboxgl-canvas-container") as Element;

    if (enable) {
        map.dragPan.enable({
            // to avoid flying far away with a sensitive mouse
            deceleration: 0,
        });
        Object.values(AllInteractions).forEach((inter) => {
            map[inter].enable();
        });
        canvasContainer.classList.add("mapboxgl-interactive");
    } else {
        map.dragPan.disable();
        Object.values(AllInteractions).forEach((inter) => {
            map[inter].disable();
        });
        canvasContainer.classList.remove("mapboxgl-interactive");
    }
    const controls = globalMapState.controls;
    if ("navigation" in controls) {
        const nav = controls.navigation as MyNavigationControl;
        if (map.hasControl(nav)) {
            nav.enableButtons(enable);
        }
    }
}
