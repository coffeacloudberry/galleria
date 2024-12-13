import type { Chart as TypeChart } from "chart.js";
import type { Feature, LineString } from "geojson";
import type { LngLatBounds, LngLatLike, Map, Marker, Popup } from "mapbox-gl";
import m from "mithril";

import type { ControlsType } from "../views/StandardControls";
import WebTrack, { Activity } from "../webtrack";

declare const mapboxgl: typeof import("mapbox-gl");

/**
 * Additional icons.
 * The key is "sym" in the GeoJSON properties and GPX file and translations.
 * Update ThirdPartyLicenses.ts if the icon supplier is not only
 * https://www.flaticon.com/
 */
type ExtraIconsStruct = { [key: string]: string };

export interface PopupCamAttrs {
    photoId: number;
    mapHeight: string;
    mapboxPopup: Popup;
}

// skipcq: JS-0359
export const extraIcons: ExtraIconsStruct = require("../extra-icons");

/** Fields and methods used by many components. */
class GlobalMapState {
    /** Mapbox GL JS map. */
    public map: Map | undefined;

    /** All controls in the map. */
    public controls: ControlsType = {};

    /** True if the map is loading layers, not ready to handle more changes. */
    public isLoadingLayers = false;

    /** True if the map failed to load. */
    public mapLoadFailure = false;

    /** The WebTrack if loaded. */
    public webtrack: WebTrack | undefined;

    /** Multiline string extracted from the WebTrack. */
    public lineStrings: Feature<LineString>[] | undefined;

    /** True if the track contains elevation data. */
    public hasElevation: boolean | undefined;

    /** All moving markers loaded so far, one per activity. */
    public allMovingMarkers: Record<string, Marker> = {};

    /** Marker moving on elevation graph mouse move events. */
    public movingMarker: Marker | undefined;

    /** Activity of the current moving marker. */
    public currentActivity: Activity | undefined;

    /** ID to the current timeout session, -1 if clear. */
    public currentTimeoutHiker = -1;

    /** Timeout before hiding the hiker. */
    public readonly timeoutHiker = 1000;

    /** Ratio to apply on the actual PNG image sizes. */
    public readonly markersRelSize = 0.25; // high-res

    /** True if the mouse in the map canvas. */
    public mouseInsideMap = false;

    /** Elevation profile instance if any. */
    public chart: TypeChart | undefined;

    /** Force hide the moving marker (to highlight something else). */
    public hideMovingMarker = false;

    /** Data used by the popupCam. */
    public popupCamData: PopupCamAttrs | undefined;

    /**
     * When initializing the map component.
     */
    start(): void {
        // Will be populated on map load.
        this.controls = {};

        // The next step is to actually load the map and data.
        this.isLoadingLayers = true;
        this.webtrack = undefined;
        this.hasElevation = undefined;
        this.mouseInsideMap = false;
    }

    /**
     * Load a marker containing an icon. Load only once, later calls use cache.
     * Hide the marker previously loaded if visible and of different activity.
     * Return the marker itself.
     * @param activity The icon depends on the activity.
     */
    loadMovingMarker(activity: Activity): Marker {
        const previousActivity = this.currentActivity;
        if (
            previousActivity &&
            previousActivity !== activity &&
            previousActivity in this.allMovingMarkers
        ) {
            this.allMovingMarkers[previousActivity].remove();
        }
        this.currentActivity = activity;
        // return the marker if already loaded
        if (activity in this.allMovingMarkers) {
            return this.allMovingMarkers[activity];
        }
        // otherwise, create and return the new marker
        const el = document.createElement("div");
        m.render(
            el,
            m("img", {
                src: `/assets/map/${extraIcons[activity]}.svg`,
                style: `width: calc(128px * ${this.markersRelSize});`,
            }),
        );
        const marker = new mapboxgl.Marker(el);
        this.allMovingMarkers[activity] = marker;
        return marker;
    }

    /**
     * Move the hiker icon on the map.
     * This is triggered by moving on the elevation profile or on the map.
     */
    moveHiker(lon: number, lat: number, activity: Activity): void {
        if (this.map === undefined || this.hideMovingMarker) {
            return;
        }
        if (this.currentTimeoutHiker > 0) {
            window.clearTimeout(this.currentTimeoutHiker);
        }

        this.movingMarker = this.loadMovingMarker(activity);
        this.movingMarker.setLngLat(new mapboxgl.LngLat(lon, lat));
        this.movingMarker.addTo(this.map);
        this.currentTimeoutHiker = window.setTimeout(() => {
            if (this.movingMarker !== undefined) {
                this.movingMarker.remove();
            }
            this.currentTimeoutHiker = -1;
        }, this.timeoutHiker);
    }

    /**
     * The hiker marker is hidden to make the cursor pointer visible and
     * to highlight the other element on the map.
     */
    hideHikerForPointer(): void {
        if (!this.map) {
            return;
        }
        this.map.getCanvas().style.cursor = "pointer";
        this.hideMovingMarker = true;
        if (this.movingMarker) {
            this.movingMarker.remove();
        }
    }

    /** Reset the cursor style and put the hiker back if existing. */
    putHikerBack(): void {
        if (!this.map) {
            return;
        }
        this.map.getCanvas().style.cursor = "";
        this.hideMovingMarker = false;
        if (this.movingMarker) {
            this.movingMarker.addTo(this.map);
        }
    }

    /** Fit the map view to the track and reset bearing. */
    fitToTrack(): void {
        if (!this.lineStrings || !this.map) {
            return;
        }

        let bounds: LngLatBounds | null = null;
        for (const feature of this.lineStrings) {
            const lineString = feature.geometry.coordinates;
            const first = lineString[0] as LngLatLike;
            const initialValue: LngLatBounds =
                bounds ?? new mapboxgl.LngLatBounds(first, first);
            bounds = lineString.reduce((bounds, coordinate) => {
                return bounds.extend(coordinate as LngLatLike);
            }, initialValue);
        }
        if (bounds !== null) {
            // workaround to avoid critical error on map reload
            const sw = bounds.getSouthWest().toArray();
            const ne = bounds.getNorthEast().toArray();
            const newBounds: [number, number, number, number] = [
                sw[0],
                sw[1],
                ne[0],
                ne[1],
            ];
            // fitBounds may not behave as expected in globe projection:
            // https://docs.mapbox.com/mapbox-gl-js/guides/globe/#limitations-of-globe
            // But, it does not behave as expected anyway in mobile.
            this.map.fitBounds(newBounds, {
                padding: {
                    top: 70,
                    bottom: 70,
                    right: 70,
                    left: 70,
                },
                animate: false,
            });
        }
    }
}

/** This is a shared instance. */
export const globalMapState = new GlobalMapState();
