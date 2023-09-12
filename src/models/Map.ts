import type { LineString } from "@turf/helpers";
import type { LngLatLike, LngLatBounds, Map, Marker } from "mapbox-gl";
import type { Chart as TypeChart } from "chart.js";
import m from "mithril";

import type { ControlsType } from "../views/StandardControls";
import WebTrack, { Activity } from "../webtrack";
import { MapTheme, story } from "./Story";
import type { Feature } from "geojson";

declare const mapboxgl: typeof import("mapbox-gl");

/** List of copyrights (depends on the Mapbox style, see config.ts). */
export enum Attribution {
    OpenStreetMap,
    Mapbox,
    Maxar,
}

/**
 * Ordered list of attribution URLs.
 * This is separated from the Attribution enum to have both forward and reverse
 * mapping on a string to string structure.
 */
export const AttribUrls = [
    "https://www.openstreetmap.org/copyright",
    "https://www.mapbox.com/about/maps/",
    "https://www.maxar.com/",
];

/** Structure of one icon in the JSON file. */
export interface ExtraIconsInfo {
    /** File name in the assets used as icon ID. */
    source: string;

    /** Creator & distributor. */
    attributions: [string, string];

    /** True if the icon has been customized/modified from the source. */
    modified: boolean;
}

/**
 * Additional icons.
 * The key is "sym" in the GeoJSON properties and GPX file and translations.
 * Update ThirdPartyLicenses.ts if the icon supplier is not only
 * https://www.flaticon.com/
 */
type ExtraIconsStruct = { [key: string]: ExtraIconsInfo };

// skipcq: JS-0359
export const extraIcons: ExtraIconsStruct = require("../extra-icons");

/** Fields and methods used by many components. */
class GlobalMapState {
    /** Mapbox GL JS map. */
    public map: Map | undefined;

    /** All controls in the map. */
    public controls: ControlsType = {};

    /** Map layer. */
    public theme = MapTheme.default;

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
    public readonly makersRelSize = 0.3; // high-res

    /** True if the mouse in the map canvas. */
    public mouseInsideMap = false;

    /** Elevation profile instance if any. */
    public chart: TypeChart | undefined;

    /**
     * When initializing the map component.
     */
    start(): void {
        // Will be populated on map load.
        this.controls = {};

        // Theme could be updated based on the story metadata or layer switch.
        this.theme = MapTheme[story.mapTheme];

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
        if (activity in this.allMovingMarkers) {
            if (this.currentActivity !== activity) {
                if (this.currentActivity) {
                    this.allMovingMarkers[this.currentActivity].remove();
                }
                this.currentActivity = activity;
            }
            return this.allMovingMarkers[activity];
        }
        const el = document.createElement("div");
        m.render(
            el,
            m("img", {
                src: `/assets/map/${extraIcons[activity].source}.svg`,
                style: `width: calc(128px * ${this.makersRelSize});`,
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
        if (this.map === undefined) {
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
                padding: 70,
                animate: false,
            });
        }
    }
}

/** This is a shared instance. */
export const globalMapState = new GlobalMapState();
