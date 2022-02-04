import { ControlsType } from "../views/StandardControls";
import { MapTheme, story } from "./Story";

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

/** Fields that can be updated by controls and interactions. */
class GlobalMapState {
    /** All controls in the map. */
    public controls: ControlsType = {};

    /** Map layer. */
    public theme = MapTheme.default;

    /** True if the map is loading layers, not ready to handle more changes. */
    public isLoadingLayers = false;

    start(): void {
        // Will be populated on map load.
        this.controls = {};

        // Theme could be updated based on the story metadata or layer switch.
        this.theme = MapTheme[story.mapTheme];

        // The next step is to actually load the map.
        this.isLoadingLayers = true;
    }
}

/** This is a shared instance. */
export const globalMapState = new GlobalMapState();
