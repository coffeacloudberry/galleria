import type { MultiLineString } from "@turf/helpers";
import type { Position } from "geojson";
import m from "mithril";

import { config } from "../config";
import CustomLogging from "../CustomLogging";
import {
    chart,
    createElevationChart,
    unsetElevationChart,
} from "../models/ElevationProfile";
import {
    AttribUrls,
    Attribution,
    extraIcons,
    globalMapState,
} from "../models/Map";
import { MapTheme, MapThemeStrings, story } from "../models/Story";
import { t } from "../translate";
import { injectCode, isMobile } from "../utils";
import type { WebTrackGeoJsonFeature } from "../webtrack";
import WebTrack from "../webtrack";
import AutoPilotControl from "./AutoPilotControl";
import LayerSelectionControl from "./LayerSelectionControl";
import Controls from "./StandardControls";
import { StatsComponent, StatsComponentAttrs } from "./Stats";

declare const turf: typeof import("@turf/turf");
declare const mapboxgl: typeof import("mapbox-gl");
declare const Chart: typeof import("chart.js");

const warn = new CustomLogging("warning");
const error = new CustomLogging("error");

/*
Mapbox requirements on Firefox:
If privacy.resistFingerprinting = true, then re-configure the following:
privacy.resistFingerprinting.randomDataOnCanvasExtract = false
privacy.resistFingerprinting.autoDeclineNoUserInputCanvasPrompts = false
You will be requested to allow images in the canvas. Once allowed, refresh
the page.
 */

type MouseEnterEvent = mapboxgl.MapMouseEvent & mapboxgl.EventData;

interface MapAttrs {
    storyId: string;
}

/**
 * Load a map and its dependencies (Mapbox GL JS) on the fly
 * to avoid waiting for huge bundles before displaying the page.
 * Contrariwise, Mapbox GL JS is not downloaded/imported if the
 * Map Component is not.
 *
 * An error message is displayed if the performance of Mapbox GL
 * JS would be dramatically worse than expected (e.g. a software
 * WebGL renderer would be used).
 *
 * If the track contains elevation data:
 * The elevation profile is part of the map. Both the map and the
 * elevation chart are interacting with each other. The Chart.js
 * library is loaded on the fly in the same manner as Mapbox GL JS.
 */
export default class Map implements m.ClassComponent<MapAttrs> {
    /** The WebTrack if loaded. */
    webtrack: WebTrack | undefined;

    /** Mapbox GL JS map. */
    map: mapboxgl.Map | undefined;

    /** True if the style has never been loaded. */
    firstLoad = true;

    /** Story ID as specified in the path. */
    storyId: string | undefined;

    /** Popup displayed on mouse hover containing makers data. */
    popup: mapboxgl.Popup | undefined;

    /** Marker moving on elevation graph mouse move events. */
    hikerMarker: mapboxgl.Marker | undefined;

    /** ID to the current timeout session, -1 if clear. */
    currentTimeoutHiker = -1;

    /** Timeout before hiding the hiker. */
    readonly timeoutHiker = 1000;

    /** Ratio to apply on the actual PNG image sizes. */
    readonly makersRelSize = 0.3; // high-res

    /** The current language of the map interface. */
    currentLang: string;

    /** True if the track contains elevation data. */
    hasElevation: boolean | undefined;

    /** Total number of remaining points layer to load. */
    remainingPointsLayer: number | undefined;

    constructor() {
        this.currentLang = t.getLang();
        globalMapState.start();
    }

    /** Display a tooltip when the mouse hovers a marker. */
    markerOnMouseEnter(e: MouseEnterEvent): void {
        if (
            this.map === undefined ||
            e === undefined ||
            e.features === undefined
        ) {
            return;
        }
        const feature: mapboxgl.MapboxGeoJSONFeature = e.features[0];

        if (
            feature === null ||
            feature.properties === null ||
            !("coordinates" in feature.geometry)
        ) {
            return;
        }
        const coordinates =
            feature.geometry.coordinates.slice() as mapboxgl.LngLatLike;
        const sym = feature.properties.sym;

        // Change the cursor style as a UI indicator.
        this.map.getCanvas().style.cursor = "pointer";

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        // @ts-ignore
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            // @ts-ignore
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        if (this.popup === undefined) {
            this.popup = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false,
                className: "tooltip-inside-map",
                offset: 20, // avoid weird cursor effect on mouse leave
            });
        }

        // Populate the popup and set its coordinates
        // based on the feature found.
        this.popup
            .setLngLat(coordinates)
            .setHTML(t("map.sym", sym))
            .addTo(this.map);
    }

    /** Remove the tooltip when the mouse leaves a marker. */
    markerOnMouseLeave(): void {
        if (this.map === undefined || this.popup === undefined) {
            return;
        }

        this.map.getCanvas().style.cursor = "";
        this.popup.remove();
    }

    /**
     * When the mouse is moving anywhere in the map.
     * The hiker is displayed on the map and the tooltip is triggered on the
     * chart. Nothing is triggered if the mouse is too far away from the path.
     * The complexity of this procedure is in nearestPointOnLine.
     * The chart might not be ready when calling this procedure.
     * This procedure has no effect if the chart is not loaded, i.e. if the
     * track has no elevation profile.
     */
    mouseMove(path: MultiLineString, e: mapboxgl.MapMouseEvent): void {
        if (!(this.webtrack instanceof WebTrack)) {
            return;
        }
        const trackLength = this.webtrack.getTrackInfo().length;
        if (typeof trackLength !== "number") {
            return;
        }
        const minDist = (0.2 * trackLength) / 1000; // 20% in km
        const currentPos = e.lngLat.toArray();
        const nearestPoint = turf.nearestPointOnLine(path, currentPos);
        if (
            !nearestPoint.properties.dist ||
            !nearestPoint.properties.index ||
            nearestPoint.properties.dist > minDist || // if too far
            chart === undefined ||
            chart.tooltip === undefined
        ) {
            return;
        }
        const [lon, lat] = nearestPoint.geometry.coordinates;
        const index = nearestPoint.properties.index;
        this.moveHiker(lon, lat);
        chart.tooltip.setActiveElements([{ datasetIndex: 0, index }], {
            x: 0, // unused
            y: 0, // unused
        });
        chart.update();
    }

    decrementRemainingLayers(): void {
        if (this.remainingPointsLayer) {
            this.remainingPointsLayer--;
            if (this.remainingPointsLayer === 0) {
                globalMapState.isLoadingLayers = false;
                m.redraw(); // enable the layer button
            }
        }
    }

    addPointsLayer(feature: WebTrackGeoJsonFeature): void {
        if (
            this.map === undefined ||
            feature.geometry.type !== "Point" ||
            feature.properties === null
        ) {
            this.decrementRemainingLayers();
            return;
        }
        const sym = String(feature.properties.sym);
        if (!(sym in extraIcons)) {
            warn.log(
                // eslint-disable-next-line max-len
                `symbol '${sym}' from the WebTrack not available in the icon set. It won't be displayed.`,
            );
            this.decrementRemainingLayers();
            return;
        }
        const source = extraIcons[sym].source;

        /*
        Add a layer for this symbol type if not already added.
        The check is done now to reduce multiple loads of the same image.
         */
        if (this.map.getLayer(source)) {
            this.decrementRemainingLayers();
            return;
        }
        this.map.loadImage(
            `/assets/map/${source}.png`,
            (
                err: Error | undefined,
                image: HTMLImageElement | ImageBitmap | undefined,
            ): void => {
                /*
                Add a layer for this symbol type if not already added.
                The check is done right before to avoid race conditions.
                We have to make sure the layer does not already exist because
                adding an existing layer triggers an error.
                 */
                if (
                    this.map === undefined ||
                    image === undefined ||
                    this.map.getLayer(source)
                ) {
                    this.decrementRemainingLayers();
                    return;
                }
                if (err) {
                    throw err;
                }

                this.map.addImage(source, image);
                this.map.addLayer({
                    id: source,
                    type: "symbol",
                    source: "webtrack",
                    layout: {
                        "icon-image": source,
                        "icon-size": this.makersRelSize,
                        "icon-allow-overlap": true,
                        "text-allow-overlap": true,
                    },
                    filter: [
                        "all",
                        ["==", "$type", "Point"],
                        ["==", "sym", sym],
                    ],
                });

                this.map.on("mouseenter", source, (e: MouseEnterEvent) => {
                    this.markerOnMouseEnter(e);
                });
                this.map.on("mouseleave", source, () => {
                    this.markerOnMouseLeave();
                });

                this.decrementRemainingLayers();
            },
        );
    }

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

    /** Add the WebTrack with all related layers (points and segments). */
    addWebTrack(webtrackBytes: ArrayBuffer): void {
        if (this.map === undefined) {
            return;
        }
        this.webtrack = new WebTrack(webtrackBytes);
        const data = this.webtrack.toGeoJson();
        const line = data.features[0].geometry as MultiLineString;
        this.hasElevation = this.webtrack.someTracksWithEle();

        injectCode(config.turf.js)
            .then(async () => {
                // skipcq: JS-0356
                const turf = await import("@turf/turf");
                if (this.map !== undefined) {
                    if (
                        !Object.prototype.hasOwnProperty.call(
                            globalMapState.controls,
                            "autoPilot",
                        )
                    ) {
                        globalMapState.controls.autoPilot =
                            new AutoPilotControl(data, story.duration);
                        this.map.addControl(globalMapState.controls.autoPilot);
                    }

                    if (this.hasElevation) {
                        this.map.on(
                            "mousemove",
                            (e: mapboxgl.MapMouseEvent) => {
                                this.mouseMove(line, e);
                            },
                        );
                    }
                }
            })
            .catch((err) => {
                error.log(err);
            });

        if (this.hasElevation) {
            injectCode(config.chart.js)
                .then(async () => {
                    // skipcq: JS-0356
                    const Chart = await import("chart.js");
                    this.addBodyChart();
                })
                .catch((err) => {
                    error.log(err);
                });
        }

        // get the latitude of the first point of the first line of the track
        const firstLine = data.features[0].geometry
            .coordinates[0] as Position[];
        const latitude = firstLine[0][1];

        // poor DEM in Finland, good DEM in France and New Zealand
        // The SRTM limits are [-56;60]
        const hasPreciseDem = Math.abs(latitude) < 56;
        if (!hasPreciseDem) {
            warn.log("Degrading Mapbox DEM for smoothing the terrain.");
        }

        this.map.addSource("mapbox-dem", {
            type: "raster-dem",
            url: "mapbox://mapbox.mapbox-terrain-dem-v1",
            tileSize: 512,

            // fine-tuning to get most details and avoid the stairs effect
            maxzoom: hasPreciseDem ? 14 : 7,
        });

        // add the DEM source as a terrain layer without exaggerated height
        this.map.setTerrain({ source: "mapbox-dem" });

        this.map.addSource("webtrack", {
            type: "geojson",
            data,
            tolerance: 0, // simplification is done at the source (simplified dataset)
        });

        this.map.addLayer({
            id: "tracks",
            type: "line",
            source: "webtrack",
            layout: {
                "line-join": ["step", ["zoom"], "miter", 14, "bevel"],
                "line-cap": "round",
            },
            paint: {
                "line-color": "#F00",
                "line-width": [
                    "interpolate",
                    ["exponential", 1.5],
                    ["zoom"],
                    12,
                    2,
                    14,
                    3,
                ],
            },
            filter: ["==", "$type", "LineString"],
        });

        const multiLineString = data.features[0].geometry.coordinates;
        let bounds: mapboxgl.LngLatBounds | null = null;

        /*
        Center the map to the track:
        Pass the first coordinates in the MultiLineString to `LngLatBounds`,
        then wrap each coordinate pair in `extend` to include them
        in the bounds result.
        */
        for (const lineString of multiLineString) {
            // @ts-ignore
            bounds = lineString.reduce(
                function (
                    bounds: mapboxgl.LngLatBounds,
                    coordinate: mapboxgl.LngLat,
                ) {
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
            this.map.fitBounds(newBounds, {
                padding: 60,
                animate: false,
            });
        }

        // show the map now that it is centered
        const mapCanvas = document.querySelector(".mapboxgl-canvas-container");
        if (mapCanvas) {
            mapCanvas.classList.add("full-opacity");

            // make the 3D appearing
            window.setTimeout(() => {
                if (this.map !== undefined) {
                    this.map.easeTo({ pitch: 60 });
                }
            }, 800);
        }

        this.remainingPointsLayer = data.features.length;
        data.features.forEach((feature: WebTrackGeoJsonFeature) => {
            this.addPointsLayer(feature);
        });
    }

    /** Load sources and layers when the map is ready. */
    loadMap(): void {
        if (this.map === undefined || this.storyId === undefined) {
            return;
        }

        m.request<ArrayBuffer>({
            method: "GET",
            url: `/content/stories/:storyId/t.webtrack`,
            params: {
                storyId: this.storyId,
            },
            responseType: "arraybuffer",
        })
            .then((webtrackBytes: ArrayBuffer) => {
                this.addWebTrack(webtrackBytes);
            })
            .catch((err: Error) => {
                error.log(
                    `Failed to fetch WebTrack from story '${
                        this.storyId ? this.storyId : "???"
                    }'`,
                    err,
                );
            });
    }

    addBodyChart(): void {
        if (this.webtrack === undefined) {
            return;
        }

        const points = this.webtrack.getTrack()[0].points;
        const canvasContainer = document.getElementById(
            "bodyCanvasEle",
        ) as HTMLCanvasElement;
        if (canvasContainer) {
            const canvas = document.createElement("canvas");
            canvasContainer.innerHTML = "";
            canvasContainer.appendChild(canvas);
            const ctx = canvas.getContext("2d");
            if (ctx) {
                createElevationChart(ctx, points, (lon, lat) => {
                    this.moveHiker(lon, lat);
                });
            }
        }
    }

    onremove(): void {
        if (this.map) {
            this.map.remove(); // remove controls
        }
    }

    onupdate(): void {
        const futureLang = t.getLang();
        if (this.currentLang !== futureLang) {
            if (typeof Chart === "function") {
                this.addBodyChart();
            }
            this.currentLang = futureLang;
            this.resetControls();
        }
    }

    oncreate({ attrs }: m.CVnode<MapAttrs>): void {
        const mapElement = document.getElementById("map");
        this.storyId = attrs.storyId;
        unsetElevationChart();
        if (mapElement === null) {
            return;
        }
        Promise.all([
            injectCode(config.mapbox.css),
            injectCode(config.mapbox.js),
        ])
            .then(async () => {
                const { default: mapboxgl } = await import("mapbox-gl");
                mapboxgl.accessToken = "" + process.env.MAPBOX_ACCESS_TOKEN;
                if (!mapboxgl.supported()) {
                    m.render(
                        mapElement,
                        m(
                            "p.critical-error.text-center",
                            "Sorry, Mapbox GL JS is not supported by your browser!",
                        ),
                    );
                    return;
                }

                this.map = new mapboxgl.Map({
                    container: mapElement,
                    zoom: 13,
                    maxZoom: 18,
                    minZoom: 4,
                    center: [0, 0], // in the ocean (center to the track later on)
                    pitch: 0,
                    bearing: 0,
                    style: config.mapbox.style[story.mapTheme].url,
                    attributionControl: false, // outside the map widget to control the style and language
                    logoPosition: "bottom-right",
                    cooperativeGestures: isMobile(),
                });

                globalMapState.controls.scale = new mapboxgl.ScaleControl({
                    maxWidth: 120,
                    unit: "metric",
                });
                this.resetControls();

                this.map.on("load", () => {
                    this.loadMap();
                });
                this.firstLoad = true;
                this.map.on("style.load", () => {
                    if (!this.firstLoad) {
                        this.loadMap();
                    }
                    this.firstLoad = false;
                });
            })
            .catch((err) => {
                error.log(err);
                m.render(
                    mapElement,
                    m(
                        "p.critical-error.text-center",
                        "Sorry, Mapbox GL JS could not be fetched!",
                    ),
                );
            });
    }

    /**
     * Re-add all controls in one place to control the order.
     */
    resetControls(): void {
        if (this.map === undefined) {
            return;
        }

        for (const control in globalMapState.controls) {
            try {
                this.map.removeControl(globalMapState.controls[control]);
            } catch {} // may not be added at this stage
        }

        // language switch is handled by re-instancing
        // the non-Mithril control instances
        Object.assign(globalMapState.controls, Controls());
        globalMapState.controls.layer = new LayerSelectionControl();

        for (const control in globalMapState.controls) {
            this.map.addControl(globalMapState.controls[control]);
        }
    }

    view(): m.Vnode<StatsComponentAttrs>[] {
        return [
            m("hr"),
            m(StatsComponent, {
                webtrack: this.webtrack,
            }),
            m(
                "#bodyCanvasEle.chart-container" +
                    (this.hasElevation === true ? "" : ".hide"),
            ),
            m(".map-extra", [
                m("#map"),
                m("p.attributions", [
                    t("map.data"),
                    config.mapbox.style[
                        MapTheme[globalMapState.theme] as MapThemeStrings
                    ].attributions.map((keyAttrib: number) => {
                        return [
                            " © ",
                            m(
                                "a",
                                { href: AttribUrls[keyAttrib] },
                                Attribution[keyAttrib],
                            ),
                        ];
                    }),
                    ". ",
                    m(
                        "a",
                        { href: "https://www.mapbox.com/map-feedback/" },
                        t("map.improve"),
                    ),
                    ".",
                ]),
            ]),
        ];
    }
}
