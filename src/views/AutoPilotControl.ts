import m from "mithril";
import CustomLogging from "../CustomLogging";
import { setInteractions } from "./InteractionsControl";
import type { Feature, LineString, Point } from "@turf/helpers";
import type { Position } from "geojson";
import type { WebTrackGeoJson } from "../webtrack";

declare const turf: typeof import("@turf/turf");
declare const mapboxgl: typeof import("mapbox-gl");
const t = require("../translate");
const error = new CustomLogging("error");
const info = new CustomLogging();

interface AutoPilotControlAttrs {
    cameraRoute: Feature<LineString>;
    cameraRouteDistance: number;
    dPosToTarget: number;
    duration: number | null;
    map: mapboxgl.Map;
}

class AutoPilotControlComponent
    implements m.ClassComponent<AutoPilotControlAttrs>
{
    /** Timestamp when the auto pilot started from the first point. */
    timestampStart = 0;

    /** Timestamp when the auto pilot stopped, 0 if not stopped. */
    timestampPause = 0;

    /** Smooth/simplified line followed by the camera. */
    cameraRoute: Feature<LineString>;

    /** Distance of the camera route in kilometers. */
    cameraRouteDistance: number;

    /** True to play the auto pilot. */
    autoPiloting = false;

    /** Map instance. */
    map: mapboxgl.Map;

    /** True if the autopilot is initializing. */
    isLoading = true;

    /** Elevation of the first point of the camera route. */
    eleFirstPoint: number | null = null;

    /** Progress between 0 (start) and 1 (end). */
    phase = 0;

    /** Duration of the entire animation in ms. */
    readonly animationDuration: number;

    /** Distance on the ground between the camera position and its target. */
    readonly dPosToTarget: number;

    /** The gap of the phase at the start/end. Between 0 and 1. */
    static readonly phaseMargin = 0.04;

    constructor({ attrs }: m.CVnode<AutoPilotControlAttrs>) {
        this.map = attrs.map;
        this.cameraRoute = attrs.cameraRoute;
        this.cameraRouteDistance = attrs.cameraRouteDistance;
        this.dPosToTarget = attrs.dPosToTarget;
        this.animationDuration =
            (attrs.duration === null ? 1 : attrs.duration) *
            AutoPilotControl.msPerDay;
        this.setupOnVisibilityChange();
    }

    /**
     * Pause the autopilot when the page/tab become hidden -- when the user
     * switches tabs or minimizes the browser window containing the tab.
     * Such hidden event is not trigger when the user switches window without
     * minimizing the browser window.
     * https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API#example
     */
    setupOnVisibilityChange(): void {
        let hidden: string | undefined;
        let visibilityChange: string | undefined;

        if (typeof document.hidden !== "undefined") {
            hidden = "hidden";
            visibilityChange = "visibilitychange";
            // @ts-ignore
        } else if (typeof document.msHidden !== "undefined") {
            hidden = "msHidden";
            visibilityChange = "msvisibilitychange";
            // @ts-ignore
        } else if (typeof document.webkitHidden !== "undefined") {
            hidden = "webkitHidden";
            visibilityChange = "webkitvisibilitychange";
        } else {
            return;
        }

        document.addEventListener(
            visibilityChange,
            () => {
                // @ts-ignore
                if (this.autoPiloting && document[hidden]) {
                    this.autoPiloting = false;
                    this.changeState();
                    m.redraw();
                } // the replay is manual after a pause
            },
            false,
        );
    }

    /** This reset the progress of the autopilot along the route. */
    reset(): void {
        this.timestampStart = 0;
        this.timestampPause = 0;
        this.autoPiloting = false;
    }

    /**
     * Inspired by the Mapbox GL JS example:
     * https://docs.mapbox.com/mapbox-gl-js/example/free-camera-path/
     * @param {number} timestamp Current timestamp.
     */
    frame(timestamp: number): void {
        if (this.timestampStart === 0) {
            this.timestampStart = timestamp;
        } else if (this.autoPiloting && this.timestampPause > 0) {
            this.timestampStart += timestamp - this.timestampPause;
            this.timestampPause = 0;
        }

        // Determine how far through the animation we are
        this.phase = (timestamp - this.timestampStart) / this.animationDuration;

        // phase is normalized between 0 and 1, stop just before the end
        if (this.phase > 1 - AutoPilotControlComponent.phaseMargin) {
            this.reset();
            m.redraw(); // refresh the autopilot button
            return;
        }

        const targetPos = turf.along(
            this.cameraRoute,
            this.cameraRouteDistance * this.phase + this.dPosToTarget,
        ).geometry.coordinates;

        const targetLngLat = {
            lng: targetPos[0],
            lat: targetPos[1],
        };

        const cameraPos = turf.along(
            this.cameraRoute,
            this.cameraRouteDistance * this.phase,
        ).geometry.coordinates;

        const cameraLngLat = {
            lng: cameraPos[0],
            lat: cameraPos[1],
        };

        // Elevation is above the mean sea level.
        // Query a visible point on the screen (target). Querying a point
        // outside the viewport (such as the current camera position) may
        // return null.
        let elevation = this.map.queryTerrainElevation(targetLngLat, {
            exaggerated: false,
        });
        if (elevation !== null || this.eleFirstPoint !== null) {
            if (this.eleFirstPoint === null) {
                // remember the value that may not be available later on
                this.eleFirstPoint = elevation;
            }
            if (elevation === null) {
                elevation = this.eleFirstPoint; // restart
                this.pause(timestamp);
            } else {
                this.play();
            }
            if (elevation === null) {
                error.log("Failed to acquire terrain.");
                this.timestampPause = timestamp;
            } else {
                const camera = this.map.getFreeCameraOptions();

                camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
                    cameraLngLat,
                    elevation + AutoPilotControl.cameraAltitude,
                );
                camera.lookAtPoint({
                    lng: targetPos[0],
                    lat: targetPos[1],
                });

                this.map.setFreeCameraOptions(camera);
            }
        } else {
            this.pause(timestamp);
        }

        this.nextFrameOrPause(timestamp);
    }

    /**
     * Call for the next frame or pause the autopilot if disabled.
     * @param timestamp Timestamp of the current frame.
     */
    nextFrameOrPause(timestamp: number): void {
        if (this.autoPiloting) {
            window.requestAnimationFrame((nextTimestamp: number) => {
                this.frame(nextTimestamp);
            });
        } else {
            this.timestampPause = timestamp;
        }
    }

    /**
     * Stop moving until the elevation is known.
     * @param timestamp Timestamp of the current frame.
     */
    pause(timestamp: number): void {
        if (!this.isLoading) {
            info.log("Pausing autopilot for terrain acquisition.");
            this.isLoading = true;
            m.redraw();
        }
        this.timestampPause = timestamp;
    }

    /**
     * Restart the animation.
     */
    play(): void {
        if (this.isLoading) {
            info.log("Resume autopilot.");
            this.isLoading = false;
            m.redraw();
        }
    }

    /**
     * Start the autopilot.
     * The autopilot is paused in the frame because the timestamp is needed.
     */
    changeState(): void {
        if (this.autoPiloting) {
            window.requestAnimationFrame((timestamp) => {
                this.frame(timestamp);
            });
        }
        setInteractions(this.map, !this.autoPiloting);
    }

    onremove(): void {
        this.reset();
    }

    onupdate(): void {
        t.createTippies();
    }

    view(): (boolean | m.Vnode)[] {
        let text: string;
        if (this.autoPiloting) {
            text = this.isLoading ? "loading" : "pause";
        } else {
            text = "play";
        }
        return [
            m(
                "button.mapboxgl-ctrl-my-autopilot",
                {
                    type: "button",
                    "data-tippy-content": t(`map.control.${text}-autopilot`),
                    "data-tippy-placement": "left",
                    onclick: () => {
                        this.autoPiloting = !this.autoPiloting;
                        this.changeState();
                    },
                },
                m(`span.mapboxgl-ctrl-icon.${text}-autopilot`),
            ),
            // refresh is not dynamic but on click
            this.phase > AutoPilotControlComponent.phaseMargin &&
                m(
                    "button.mapboxgl-ctrl-my-autopilot",
                    {
                        type: "button",
                        "data-tippy-content": t(`map.control.rewind-autopilot`),
                        "data-tippy-placement": "left",
                        onclick: () => {
                            this.reset();
                            this.changeState();
                            window.requestAnimationFrame((nextTimestamp) => {
                                this.frame(nextTimestamp);
                            });
                        },
                    },
                    m("span.mapboxgl-ctrl-icon.rewind-autopilot"),
                ),
        ];
    }
}

/**
 * This is the custom Mapbox GL JS widget. The camera route is created in
 * the constructor, but the component and animation is handled in
 * AutoPilotControlComponent.
 * TODO: investigate the other auto pilot implementation:
 * https://www.mapbox.com/blog/river-runner-how-i-built-it
 */
export default class AutoPilotControl implements mapboxgl.IControl {
    /** Map instance. */
    map: mapboxgl.Map | undefined;

    /** DIV container of this custom control. */
    container: HTMLDivElement | undefined;

    /** Smooth/simplified line followed by the camera. */
    cameraRoute: Feature<LineString>;

    /** Distance of the camera route in kilometers. */
    cameraRouteDistance: number;

    /** Duration in days as floating point or null if not known. */
    duration: number | null;

    /** Distance on the ground between the camera position and its target. */
    readonly dPosToTarget: number;

    /** Angle from the ground in the range ]0;90] degrees. */
    readonly pitch: number;

    /** Meters above the terrain. */
    static readonly cameraAltitude = 1000;

    /** Duration in ms of the animation for one hiking day. */
    static readonly msPerDay = 90000;

    /**
     * Simplify the WebTrack with the Ramer-Douglas-Peucker algorithm,
     * merge LineStrings, and apply the Bezier spline algorithm.
     * The WebTrack is already simplified but just enough to remove GPS noise
     * while keeping all the details. On the other hand, the auto pilot needs
     * a really smoothed line for a fluid animation.
     * @param geoJson WebTrack in the GeoJSON format
     * @param duration Duration in days as floating point or null if not known
     */
    constructor(geoJson: WebTrackGeoJson, duration: number | null) {
        const simplifiedLineString = turf
            .simplify(geoJson, { tolerance: 0.004 })
            .features[0].geometry.coordinates.flat() as Position[];
        this.cameraRoute = turf.bezierSpline(
            turf.lineString(simplifiedLineString),
        );
        this.cameraRouteDistance = turf.lineDistance(this.cameraRoute);
        this.pitch = this.cameraRouteDistance > 10 ? 60 : 20;
        this.dPosToTarget =
            (AutoPilotControl.cameraAltitude / 1000) *
            Math.tan(turf.degreesToRadians(this.pitch));
        this.extendRoute();
        this.duration = duration;
    }

    extendRoute(): void {
        const arr = turf.getCoords(this.cameraRoute);
        arr.unshift(turf.getCoord(this.getPosBeyond(arr, true)));
        arr.push(turf.getCoord(this.getPosBeyond(arr, false)));

        // Extend the distance only at the beginning. At the end, the last point
        // of the track will be around the viewport center.
        this.cameraRouteDistance += this.dPosToTarget;

        this.cameraRoute = turf.lineString(arr);
    }

    getPosBeyond(arrCameraRoute: Position[], isStart: boolean): Feature<Point> {
        let pos: Feature<Point>;
        let dPos: Feature<Point>;

        if (isStart) {
            pos = turf.point(arrCameraRoute[0]);
            dPos = turf.point(arrCameraRoute[1]);
        } else {
            pos = turf.point(arrCameraRoute[arrCameraRoute.length - 1]);
            dPos = turf.point(arrCameraRoute[arrCameraRoute.length - 2]);
        }

        return turf.destination(
            pos,
            this.dPosToTarget,
            turf.bearing(dPos, pos),
        );
    }

    /**
     * Called by Mapbox GL JS when the control is added. That mount the
     * Component.
     * @param paramMap The map instance.
     */
    onAdd(paramMap: mapboxgl.Map): HTMLDivElement {
        this.map = paramMap;
        this.container = document.createElement("div");
        this.container.className =
            "mapboxgl-ctrl mapboxgl-ctrl-group my-autopilot-control";
        m.mount(this.container, {
            view: () => {
                return m(AutoPilotControlComponent, {
                    cameraRoute: this.cameraRoute,
                    cameraRouteDistance: this.cameraRouteDistance,
                    dPosToTarget: this.dPosToTarget,
                    duration: this.duration,
                    map: paramMap,
                });
            },
        });
        m.redraw(); // create tippies
        return this.container;
    }

    /**
     * Stop the auto pilot and remove the custom control from the map.
     */
    onRemove(): void {
        if (this.container && this.container.parentNode) {
            // added manually => remove manually
            m.mount(this.container, null);

            this.container.parentNode.removeChild(this.container);
        }
        this.map = undefined;
    }
}
