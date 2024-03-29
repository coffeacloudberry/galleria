import apertureOutline from "@/icons/aperture-outline.svg";
import type { Position } from "geojson";
import type {
    MapMouseEvent,
    EventData,
    Popup,
    MapboxGeoJSONFeature,
    LngLatLike,
    GeoJSONSource,
} from "mapbox-gl";
import m from "mithril";

import { config } from "../config";
import CustomLogging from "../CustomLogging";
import { extraIcons, globalMapState } from "../models/Map";
import { story } from "../models/Story";
import { t } from "../translate";
import { hideAllForce, injectCode, isCanvasBlocked, isMobile } from "../utils";
import type { WebTrackGeoJson, WebTrackGeoJsonFeature } from "../webtrack";
import WebTrack, { Activity } from "../webtrack";
import AutoPilotControl from "./AutoPilotControl";
import Icon from "./Icon";
import LayerSelectionControl from "./LayerSelectionControl";
import Controls from "./StandardControls";
import { NearestPointOnLine } from "@turf/nearest-point-on-line";
import { Feature, LineString } from "geojson";

declare const turf: typeof import("@turf/turf");
declare const mapboxgl: typeof import("mapbox-gl");

const warn = new CustomLogging("warning");
const error = new CustomLogging("error");

type MouseEvent = MapMouseEvent & EventData;
type MaybeLink = m.Vnode<m.RouteLinkAttrs> | m.Vnode;

interface PopupCamAttrs {
    photoId: number;
    mapHeight: string;
    mapboxPopup: Popup;
}

const LoadingPopupCamComponent: m.Component = {
    view(): m.Vnode {
        return m(
            ".map-thumbnail",
            m("span.loading-icon", m(Icon, { src: apertureOutline })),
        );
    },
};

/** Component in the tooltip displaying a clickable thumbnail. */
class PopupCamComponent implements m.ClassComponent<PopupCamAttrs> {
    /** True when the image is cached and ready to be displayed. */
    private ready = false;

    /** The preloaded thumbnail. */
    private image = new Image();

    /** Latest provided photo. */
    private currentPhoto: number | null = null;

    /** Reload the photo if different from the current one. */
    updateImage(photoId: number): void {
        if (photoId !== this.currentPhoto) {
            this.ready = false;
            this.image.onload = () => {
                this.ready = true;
                m.redraw();
            };
            this.image.src = `/content/photos/${photoId}/t.webp`;
            this.currentPhoto = photoId;
        }
    }

    /** Add the ready DOM to the map via the Mapbox API. */
    // skipcq: JS-0105
    onupdate({ dom, attrs }: m.CVnodeDOM<PopupCamAttrs>): void {
        hideAllForce();
        attrs.mapboxPopup.setDOMContent(dom);
    }

    // skipcq: JS-0105
    oncreate({ dom, attrs }: m.CVnodeDOM<PopupCamAttrs>): void {
        hideAllForce();
        attrs.mapboxPopup.setDOMContent(dom);
    }

    view({ attrs }: m.CVnode<PopupCamAttrs>): MaybeLink {
        this.updateImage(attrs.photoId);
        if (!this.ready) {
            return m(LoadingPopupCamComponent);
        }
        return m(
            m.route.Link,
            {
                href: m.buildPathname("/:lang/photo/:id", {
                    lang: t.getLang(),
                    id: this.currentPhoto,
                }),
                class: "map-thumbnail",
            },
            m("img", {
                src: this.image.src,
                style: `max-height: ${parseInt(attrs.mapHeight) / 3}px`,
                alt: "",
            }),
        );
    }
}

type ClusterItem = { id: number; image: HTMLImageElement; ready: boolean };

const PhotoInCluster: m.Component<ClusterItem> = {
    view({ attrs }: m.Vnode<ClusterItem>): m.Vnode {
        return m(
            "li",
            m(
                m.route.Link,
                {
                    href: m.buildPathname("/:lang/photo/:id", {
                        lang: t.getLang(),
                        id: attrs.id,
                    }),
                },
                m("img.cluster-thumbnail", {
                    src: attrs.image.src,
                    alt: "",
                }),
            ),
        );
    },
};

interface InsideClusterContentAttrs {
    photos: ClusterItem[];
}

const InsideCluster: m.Component<InsideClusterContentAttrs> = {
    view({ attrs }: m.Vnode<InsideClusterContentAttrs>): m.Vnode {
        return m(
            "ul",
            attrs.photos.map((item) => item.ready && m(PhotoInCluster, item)),
        );
    },
};

const LoadingCluster: m.Component = {
    view(): m.Vnode {
        return m(
            ".loading-icon",
            m(Icon, { src: apertureOutline, style: "height: 1.6rem" }),
        );
    },
};

interface ClusterContentAttrs extends InsideClusterContentAttrs {
    onclose: () => void;
}

class ClusterContent implements m.ClassComponent<ClusterContentAttrs> {
    view({ attrs }: m.CVnode<ClusterContentAttrs>): m.Vnode[] {
        const showPhotos = attrs.photos.some((item) => item.ready);
        return [
            m("button.cluster-close-button", { onclick: attrs.onclose }, "×"),
            m(
                ".cluster-content",
                { class: showPhotos ? "" : "loading-cluster" },
                showPhotos ? m(InsideCluster, attrs) : m(LoadingCluster),
            ),
        ];
    }
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
 */
export default class Map implements m.ClassComponent {
    /** True if the style has never been loaded. */
    firstLoad = true;

    /** Popup displayed on mouse hover containing marker data. */
    popup: Popup | undefined;

    /** Popup displayed on mouse hover containing a thumbnail. */
    popupCam: Popup | undefined;

    /** Data used by the popupCam. */
    popupCamData: PopupCamAttrs | undefined;

    /** List of photo IDs of the cluster of photos that is active. */
    clusterContent: ClusterItem[] = [];

    /** The current language of the map interface. */
    currentLang: string;

    /** Total number of remaining points layer to load. */
    remainingPointsLayer: number | undefined;

    /** True if the cluster is open. */
    clusterIsOpen = false;

    constructor() {
        this.currentLang = t.getLang();
        globalMapState.start();
    }

    /** Get the photo ID from the GeoJSON feature. */
    static extractPhotoId(feature: MapboxGeoJSONFeature): number | null {
        return feature.properties && parseInt(feature.properties.name);
    }

    /** Display a tooltip when the mouse hovers a marker. */
    markerOnMouseEnter(e: MouseEvent): void {
        if (!globalMapState.map || !e || !e.features) {
            return;
        }
        const feature: MapboxGeoJSONFeature = e.features[0];

        if (
            feature === null ||
            feature.properties === null ||
            !("coordinates" in feature.geometry)
        ) {
            return;
        }
        const coordinates = feature.geometry.coordinates.slice() as LngLatLike;

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        // @ts-expect-error
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            // @ts-expect-error
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        const sym = feature.properties.sym;
        const photoId = Map.extractPhotoId(feature);
        if (sym === "camera" && photoId) {
            this.addPopupCamToMap(coordinates, photoId);
        } else if ("cluster_id" in feature.properties) {
            this.preloadCluster(feature);
            if (this.clusterIsOpen) {
                this.closePhotosPreview();
            }
            this.asyncOpenCluster();
        } else {
            this.addPopupTextToMap(coordinates, t("map.sym", sym));
        }
    }

    /** Create the popup and update with new data related to a photo. */
    addPopupCamToMap(coordinates: LngLatLike, photoId: number): void {
        if (!globalMapState.map) {
            return;
        }
        const mapStyle = globalMapState.map.getCanvas().style;
        if (!this.popupCam) {
            // instantiate only one for all photos
            this.popupCam = new mapboxgl.Popup({
                closeButton: true,
                closeOnClick: false,
                focusAfterOpen: false,
                className: "tooltip-inside-map",
                // popup large enough to fit the thumbnail
                maxWidth: `${parseInt(mapStyle.width)}px`,
                // positioning a large popup on side has side effect
                anchor: "center",
            });
        }
        this.popupCamData = {
            photoId,
            mapHeight: mapStyle.height,
            mapboxPopup: this.popupCam, // to access from attrs
        };
        this.popupCam.setLngLat(coordinates).addTo(globalMapState.map);
        m.redraw(); // re-render the popup with fresh data
    }

    /** Load one photo at a time to avoid glitch. */
    loadClusterPhotos(latestLoad = 0) {
        if (this.clusterContent.length === latestLoad) {
            return;
        }
        const currentPhoto = this.clusterContent[latestLoad];
        currentPhoto.image.onload = () => {
            currentPhoto.ready = true;
            m.redraw();
            this.loadClusterPhotos(latestLoad + 1);
        };
        currentPhoto.image.src = `/content/photos/${currentPhoto.id}/f.webp`;
    }

    /** Preload the photos. */
    preloadCluster(cluster: MapboxGeoJSONFeature): void {
        if (!globalMapState.map || !cluster.properties) {
            return;
        }
        const src = globalMapState.map.getSource("camera") as GeoJSONSource;
        src.getClusterLeaves(
            cluster.properties.cluster_id,
            cluster.properties.point_count,
            0,
            (error, features) => {
                if (!error) {
                    const photoIds = (features as MapboxGeoJSONFeature[])
                        .map(Map.extractPhotoId)
                        .filter(Number) as number[];
                    photoIds.sort();
                    this.clusterContent = photoIds.reverse().map((id) => {
                        return {
                            id,
                            image: new Image(),
                            ready: false,
                        };
                    });
                    this.loadClusterPhotos();
                }
            },
        );
    }

    /** Trigger redraw with the open slider. */
    asyncOpenCluster(): void {
        if (!this.clusterIsOpen) {
            this.clusterContent = [];
            this.clusterIsOpen = true;
            m.redraw();
        }
    }

    /** Close the photo previews (thumbnails in map): popup and/or slider. */
    closePhotosPreview(): void {
        if (this.popupCam) {
            this.popupCam.remove();
        }
        if (this.clusterIsOpen) {
            this.clusterIsOpen = false;
            m.redraw(); // smoothly hide the slider
        }
    }

    /** Create the popup and update the text. */
    addPopupTextToMap(coordinates: LngLatLike, text: string): void {
        if (!globalMapState.map) {
            return;
        }
        if (!this.popup) {
            this.popup = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false,
                className: "tooltip-inside-map",
                // avoid weird cursor effect on mouse leave
                offset: 20,
            });
        }
        this.popup
            .setLngLat(coordinates)
            .setText(text)
            .addTo(globalMapState.map);
    }

    /**
     * Remove the tooltip when the mouse leaves a marker.
     * Only applies to popups from WebTrack data, not the camera.
     */
    markerOnMouseLeave(): void {
        if (this.popup) {
            this.popup.remove();
        }
    }

    /**
     * When the mouse is moving anywhere in the map.
     * The hiker is displayed on the map, the tooltip is triggered on the
     * chart. Nothing is triggered if the mouse is too far away from the path.
     * The complexity of this procedure is in nearestPointOnLine.
     * The chart might not be ready when calling this procedure.
     * This procedure has no effect if the chart is not loaded, i.e. if the
     * track has no elevation profile.
     */
    static mouseMove(e: MapMouseEvent): void {
        if (!(globalMapState.webtrack instanceof WebTrack)) {
            return;
        }
        const trackLength = globalMapState.webtrack.getTrackInfo().length;
        if (typeof trackLength !== "number" || !globalMapState.lineStrings) {
            return;
        }
        const minDist = (0.2 * trackLength) / 1000; // 20% in km
        const currentPos = e.lngLat.toArray();
        let minDistNearestPoint = Infinity;
        let actualNearestPoint = null as NearestPointOnLine | null;
        let actualIdx = 0;
        let activity = Activity.WALK;
        // loop over lines to find out which one is the closest
        globalMapState.lineStrings.forEach((path, idx) => {
            const nearestPoint = turf.nearestPointOnLine(
                turf.lineString(path.geometry.coordinates),
                currentPos,
            );
            if (
                nearestPoint.properties.index !== undefined &&
                nearestPoint.properties.dist &&
                nearestPoint.properties.dist < minDistNearestPoint &&
                nearestPoint.properties.dist < minDist // close enough
            ) {
                minDistNearestPoint = nearestPoint.properties.dist;
                actualNearestPoint = nearestPoint;
                actualIdx = idx;
                if (path.properties && "activity" in path.properties) {
                    activity = path.properties.activity;
                } else {
                    activity = Activity.WALK;
                }
            }
        });
        const chart = globalMapState.chart;
        if (
            !actualNearestPoint ||
            actualNearestPoint.properties.index === undefined ||
            chart === undefined ||
            chart.tooltip === undefined
        ) {
            return;
        }
        const index = actualNearestPoint.properties.index;
        const [lon, lat] = actualNearestPoint.geometry.coordinates;
        globalMapState.moveHiker(lon, lat, activity);
        // draw tooltip if the point is in the elevation profile
        try {
            chart.tooltip.setActiveElements(
                [{ datasetIndex: actualIdx, index }],
                {
                    x: 0, // unused
                    y: 0, // unused
                },
            );
            // draw pointer
            chart.setActiveElements([{ datasetIndex: actualIdx, index }]);
            chart.render();
        } catch {
            // the point may not be in the chart due to the deduplication
        }
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
            globalMapState.map === undefined ||
            feature.geometry.type !== "Point" ||
            feature.properties === null
        ) {
            this.decrementRemainingLayers();
            return;
        }
        const sym = String(feature.properties.sym);
        const notClustered = "notClustered" in feature.properties;
        if (!(sym in extraIcons)) {
            warn.log(
                // eslint-disable-next-line max-len
                `symbol '${sym}' from the WebTrack not available in the icon set. It won't be displayed.`,
            );
            this.decrementRemainingLayers();
            return;
        }
        const source = extraIcons[sym];

        /*
        Add a layer for this symbol type if not already added.
        The check is done now to reduce multiple loads of the same image.
         */
        if (globalMapState.map.getLayer(source)) {
            this.decrementRemainingLayers();
            return;
        }
        globalMapState.map.loadImage(
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
                    globalMapState.map === undefined ||
                    image === undefined ||
                    globalMapState.map.getLayer(source)
                ) {
                    this.decrementRemainingLayers();
                    return;
                }
                if (err) {
                    throw err;
                }

                globalMapState.map.addImage(source, image);
                if (notClustered) {
                    globalMapState.map.addLayer({
                        id: source,
                        type: "symbol",
                        source: "not-clustered",
                        layout: {
                            "icon-image": source,
                            "icon-size": globalMapState.markersRelSize,
                            "icon-allow-overlap": true,
                            "icon-ignore-placement": true,
                        },
                        filter: [
                            "all",
                            ["==", "$type", "Point"],
                            ["==", "sym", sym],
                        ],
                    });
                } else {
                    globalMapState.map.addLayer({
                        id: `clusters-${source}`,
                        type: "circle",
                        source: "webtrack",
                        filter: ["has", "point_count"],
                        paint: {
                            "circle-color": "#f4f4e6",
                            "circle-radius": 12,
                        },
                    });
                    globalMapState.map.addLayer({
                        id: `cluster-count-${source}`,
                        type: "symbol",
                        source: "webtrack",
                        filter: ["has", "point_count"],
                        layout: {
                            "text-field": ["get", "point_count_abbreviated"],
                            "text-font": ["Asap Medium"],
                            "text-size": 14,
                        },
                    });
                    globalMapState.map.addLayer({
                        id: source,
                        type: "symbol",
                        source: "webtrack",
                        layout: {
                            "icon-image": source,
                            "icon-size": globalMapState.markersRelSize,
                            "icon-allow-overlap": true,
                            "icon-ignore-placement": true,
                        },
                        filter: [
                            "all",
                            ["==", "$type", "Point"],
                            ["==", "sym", sym],
                        ],
                    });
                }

                globalMapState.map.on("mouseenter", source, (e: MouseEvent) => {
                    this.markerOnMouseEnter(e);
                });
                globalMapState.map.on("mouseleave", source, () => {
                    this.markerOnMouseLeave();
                });

                this.decrementRemainingLayers();
            },
        );
    }

    /** Add the WebTrack with all related layers (points and segments). */
    addWebTrack(webtrackBytes: ArrayBuffer): void {
        globalMapState.webtrack = new WebTrack(webtrackBytes);
        const data = globalMapState.webtrack.toGeoJson();
        const lines = data.features.filter(
            (f) => f.geometry.type === "LineString",
        ) as Feature<LineString>[];
        const hasElevation = globalMapState.webtrack.someTracksWithEle();
        globalMapState.hasElevation = hasElevation;
        globalMapState.lineStrings = lines;

        if (globalMapState.map === undefined) {
            return;
        } // else: continue setting up the map

        injectCode(config.turf.js)
            .then(async () => {
                if (typeof turf === "undefined") {
                    // skipcq: JS-0356
                    const turf = await import("@turf/turf");
                }
                if (globalMapState.map !== undefined) {
                    if (!("autoPilot" in globalMapState.controls)) {
                        globalMapState.controls.autoPilot =
                            new AutoPilotControl(data, story.duration);
                        globalMapState.map.addControl(
                            globalMapState.controls.autoPilot,
                        );
                    }
                    if (hasElevation) {
                        globalMapState.map.on("mousemove", Map.mouseMove);
                    }
                }
            })
            .catch((err) => {
                error.log(err);
            });

        // get the latitude of the first point of the first line of the track
        const firstLine = lines[0].geometry.coordinates as Position[];
        const latitude = firstLine[0][1];

        // poor DEM in Finland, good DEM in France and New Zealand
        // The SRTM limits are [-56;60]
        const hasPreciseDem = Math.abs(latitude) < 56;
        if (!hasPreciseDem) {
            warn.log("Degrading Mapbox DEM for smoothing the terrain.");
        }

        globalMapState.map.addSource("mapbox-dem", {
            type: "raster-dem",
            url: "mapbox://mapbox.mapbox-terrain-dem-v1",
            tileSize: 512,

            // fine-tuning to get most details and avoid the stair effect
            maxzoom: hasPreciseDem ? 14 : 7,
        });

        // add the DEM source as a terrain layer without exaggerated height
        globalMapState.map.setTerrain({
            source: "mapbox-dem",
            exaggeration: story.mapExaggeration,
        });

        globalMapState.map.addSource("webtrack", {
            type: "geojson",
            data,
            cluster: true,
            tolerance: 0, // simplification is done at the source (simplified dataset)
            filter: ["!", ["has", "notClustered"]],
        });

        globalMapState.map.addSource("not-clustered", {
            type: "geojson",
            data,
            filter: ["has", "notClustered"],
        });

        globalMapState.map.addLayer({
            id: "tracks",
            type: "line",
            source: "not-clustered",
            layout: {
                "line-join": ["step", ["zoom"], "miter", 14, "bevel"],
                "line-cap": "round",
            },
            paint: {
                "line-color": [
                    "match",
                    ["get", "activity"],
                    "MOTORED_BOAT",
                    "#00F",
                    "ROWING_BOAT",
                    "#00F",
                    "#F00",
                ],
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

        globalMapState.fitToTrack();

        // show the map now that it is centered
        const mapCanvas = document.querySelector(".mapboxgl-canvas-container");
        if (mapCanvas) {
            mapCanvas.classList.add("full-opacity");

            // make the 3D appearing
            window.setTimeout(() => {
                if (globalMapState.map !== undefined) {
                    globalMapState.map.easeTo({ pitch: 60 });
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
        if (!story.folderName) {
            return;
        }

        m.request<ArrayBuffer>({
            method: "GET",
            url: "/content/stories/:storyId/:storyId.webtrack",
            params: {
                storyId: story.folderName,
            },
            responseType: "arraybuffer",
        })
            .then((webtrackBytes: ArrayBuffer) => {
                this.addWebTrack(webtrackBytes);
            })
            .catch((err: Error) => {
                error.log(
                    `Failed to fetch WebTrack from story '${
                        story.folderName ? story.folderName : "???"
                    }'`,
                    err,
                );
            });
        this.addPhotos();
    }

    // skipcq: JS-0105
    onremove(): void {
        if (globalMapState.map) {
            try {
                globalMapState.map.remove(); // remove controls

                // Delete the local storage used by Mapbox GL JS.
                // Enforce my privacy policy that has a zero-storage clause.
                localStorage.clear();
            } catch {
                // continue regardless of error
            }
        }
    }

    /** Add an icon where the selected photo has been taken. */
    addPhotos(): void {
        const source = extraIcons["camera"];
        if (
            !globalMapState.map ||
            globalMapState.map.getLayer(source) ||
            story.geocodedPhotos === null
        ) {
            return;
        }
        globalMapState.map.loadImage(
            `/assets/map/${source}.png`,
            (
                err: Error | undefined,
                image: HTMLImageElement | ImageBitmap | undefined,
            ): void => {
                if (
                    !globalMapState.map ||
                    !story.geocodedPhotos ||
                    !image ||
                    globalMapState.map.getLayer(source)
                ) {
                    return;
                }
                if (err) {
                    throw err;
                }

                globalMapState.map.addImage(source, image);
                const data: WebTrackGeoJson = {
                    type: "FeatureCollection",
                    features: story.geocodedPhotos.map((geocodedPhoto) => {
                        const { lat, lon } = geocodedPhoto.position;
                        return {
                            type: "Feature",
                            geometry: {
                                type: "Point",
                                coordinates: [lon, lat],
                            },
                            properties: {
                                sym: "camera",
                                name: String(geocodedPhoto.id),
                            },
                        };
                    }),
                };
                globalMapState.map.addSource("camera", {
                    type: "geojson",
                    data,
                    cluster: true,
                });
                const circlesId = `clusters-${source}`;
                globalMapState.map.addLayer({
                    id: circlesId,
                    // use circles to force visibility because
                    // symbols are hidden if colliding to each-other
                    type: "circle",
                    source: "camera",
                    filter: ["has", "point_count"],
                    paint: {
                        // main color of the camera icon
                        "circle-color": "#f8b62b",
                        "circle-radius": [
                            "step",
                            ["get", "point_count"],
                            12, // 12px circles if less than 10 photos
                            10,
                            17, // 17px circles if 10 or more photos
                        ],
                    },
                });
                globalMapState.map.addLayer({
                    id: `cluster-count-${source}`,
                    type: "symbol",
                    source: "camera",
                    filter: ["has", "point_count"],
                    layout: {
                        "text-field": ["get", "point_count_abbreviated"],
                        "text-font": ["Asap Medium"],
                        "text-size": 14,
                    },
                });
                globalMapState.map.addLayer({
                    id: source,
                    type: "symbol",
                    source: "camera",
                    filter: ["!", ["has", "point_count"]],
                    layout: {
                        "icon-image": source,
                        "icon-size": globalMapState.markersRelSize,
                    },
                });

                [source, circlesId].forEach((src) => {
                    if (!globalMapState.map) {
                        return;
                    }
                    globalMapState.map.on("click", src, (e: MouseEvent) => {
                        this.markerOnMouseEnter(e);
                    });
                    globalMapState.map.on("mouseenter", src, () => {
                        globalMapState.hideHikerForPointer();
                    });
                    globalMapState.map.on("mouseleave", src, () => {
                        globalMapState.putHikerBack();
                    });
                });
            },
        );
    }

    onupdate(): void {
        const futureLang = t.getLang();
        if (this.currentLang !== futureLang) {
            this.currentLang = futureLang;
            Map.resetControls();
        }
        this.addPhotos();
    }

    oncreate({ dom }: m.CVnodeDOM): void {
        if (isCanvasBlocked()) {
            globalMapState.mapLoadFailure = true;
            m.render(
                dom,
                m(
                    "p.critical-error.text-center",
                    "To display the interactive map, allow canvas and refresh this page.",
                ),
            );
            this.loadMap();
            return; // do not load Mapbox GL JS
        }
        Promise.all([
            injectCode(config.mapbox.css),
            injectCode(config.mapbox.js),
        ])
            .then(async () => {
                if (typeof mapboxgl === "undefined") {
                    // skipcq: JS-0356
                    const { default: mapboxgl } = await import("mapbox-gl");
                }
                mapboxgl.accessToken = String(process.env.MAPBOX_ACCESS_TOKEN);
                if (!mapboxgl.supported()) {
                    globalMapState.mapLoadFailure = true;
                    m.render(
                        dom,
                        m(
                            "p.critical-error.text-center",
                            "Sorry, Mapbox GL JS is not supported by your browser!",
                        ),
                    );
                    m.redraw();
                    return;
                }

                globalMapState.map = new mapboxgl.Map({
                    container: dom as HTMLElement,
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
                    projection: { name: "globe" },
                });

                globalMapState.controls.scale = new mapboxgl.ScaleControl({
                    maxWidth: 120,
                    unit: "metric",
                });
                Map.resetControls();

                globalMapState.map.on("click", () => {
                    this.closePhotosPreview();
                });
                globalMapState.map.on("mouseover", () => {
                    globalMapState.mouseInsideMap = true;
                });
                globalMapState.map.on("mouseout", () => {
                    globalMapState.mouseInsideMap = false;
                });
                globalMapState.map.on("load", () => {
                    this.loadMap();
                });
                this.firstLoad = true;
                globalMapState.map.on("style.load", () => {
                    if (!this.firstLoad) {
                        this.loadMap();
                    }
                    this.firstLoad = false;
                });
            })
            .catch((err) => {
                globalMapState.mapLoadFailure = true;
                error.log(err);
                m.render(
                    dom,
                    m(
                        "p.critical-error.text-center",
                        "Sorry, Mapbox GL JS could not be fetched!",
                    ),
                );
                m.redraw();
            });
    }

    /**
     * Re-add all controls in one place to control the order.
     */
    static resetControls(): void {
        if (globalMapState.map === undefined) {
            return;
        }

        for (const control of Object.keys(globalMapState.controls)) {
            try {
                globalMapState.map.removeControl(
                    globalMapState.controls[control],
                );
            } catch {
                // continue regardless of error
                // the control may not be added at this stage
            }
        }

        // language switch is handled by re-instancing
        // the non-Mithril control instances
        Object.assign(globalMapState.controls, Controls());
        globalMapState.controls.layer = new LayerSelectionControl();

        for (const control of Object.keys(globalMapState.controls)) {
            globalMapState.map.addControl(globalMapState.controls[control]);
        }
    }

    view(): m.Vnode {
        const clusterAttrs: ClusterContentAttrs = {
            photos: this.clusterContent,
            onclose: () => {
                this.closePhotosPreview();
            },
        };
        return m("#map", [
            this.popupCamData && m(PopupCamComponent, this.popupCamData),
            this.clusterIsOpen && m(ClusterContent, clusterAttrs),
        ]);
    }
}
