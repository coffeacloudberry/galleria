import type { MultiLineString } from "@turf/helpers";
import m from "mithril";

import type { ControlsType } from "../views/StandardControls";
import WebTrack from "../webtrack";
import { MapTheme, story } from "./Story";

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
    public map: mapboxgl.Map | undefined;

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
    public multiLineString: MultiLineString | undefined;

    /** True if the track contains elevation data. */
    public hasElevation: boolean | undefined;

    /** Marker moving on elevation graph mouse move events. */
    public hikerMarker: mapboxgl.Marker | undefined;

    /** ID to the current timeout session, -1 if clear. */
    public currentTimeoutHiker = -1;

    /** Timeout before hiding the hiker. */
    public readonly timeoutHiker = 1000;

    /** Ratio to apply on the actual PNG image sizes. */
    public readonly makersRelSize = 0.3; // high-res

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
    }

    /**
     * Move the hiker icon on the map.
     * This is triggered by moving on the elevation profile or on the map.
     */
    moveHiker(lon: number, lat: number): void {
        if (this.map === undefined) {
            return;
        }
        if (this.currentTimeoutHiker > 0) {
            window.clearTimeout(this.currentTimeoutHiker);
        }

        const position = new mapboxgl.LngLat(lon, lat);
        if (this.hikerMarker === undefined) {
            const el = document.createElement("div");
            m.render(
                el,
                m("img", {
                    src: `/assets/map/${extraIcons.hiker.source}.svg`,
                    style: `width: calc(128px * ${this.makersRelSize});`,
                }),
            );
            this.hikerMarker = new mapboxgl.Marker(el).setLngLat(position);
        } else {
            this.hikerMarker.setLngLat(position);
        }

        if (this.currentTimeoutHiker < 0) {
            this.hikerMarker.addTo(this.map);
        }

        this.currentTimeoutHiker = window.setTimeout(() => {
            if (this.hikerMarker !== undefined) {
                this.hikerMarker.remove();

                /*
                The element opacity can change when the hiker goes behind hills.
                The opacity parameter is on the div element that must be reset.
                Let's force to create a new element the next time. Otherwise,
                the marker may pop up partially transparent.
                 */
                this.hikerMarker = undefined;
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
        if (this.hikerMarker) {
            this.hikerMarker.remove();
        }
    }

    /** Reset the cursor style and put the hiker back if existing. */
    putHikerBack(): void {
        if (!this.map) {
            return;
        }
        this.map.getCanvas().style.cursor = "";
        if (this.hikerMarker) {
            this.hikerMarker.addTo(this.map);
        }
    }

    /** Fit the map view to the track and reset bearing. */
    fitToTrack(): void {
        const multiLineString = this.multiLineString;
        if (!multiLineString || !this.map) {
            return;
        }
        let bounds: mapboxgl.LngLatBounds | null = null;

        /*
        Center the map to the track:
        Pass the first coordinates in the MultiLineString to `LngLatBounds`,
        then wrap each coordinate pair in `extend` to include them
        in the bounds result.
        */
        for (const lineString of multiLineString.coordinates) {
            bounds = lineString.reduce(
                (bounds, coordinate) => {
                    // @ts-ignore
                    return bounds.extend(coordinate);
                },
                // @ts-ignore
                new mapboxgl.LngLatBounds(lineString[0], lineString[0]),
            );
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
