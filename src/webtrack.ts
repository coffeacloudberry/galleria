import type { Feature, LineString, Point, Position } from "geojson";

/** A GPX point with symbol and optional name. */
export interface FeaturePoint extends Feature<Point> {
    properties: {
        /**
         * Symbol for selecting the icon.
         * [[include:webtrack_waypoints.md]]
         */
        sym: string;

        /**
         * If used, that would be displayed in a tooltip. For now, only a
         * legend of the icon is displayed, because localization is not handled
         * in the tag name. One idea would be to point the tag name to an item
         * in the 'locales' folder.
         */
        name?: string;
    };
}

export type WebTrackGeoJsonFeature = Feature<LineString> | FeaturePoint;

export type WebTrackGeoJson = {
    type: "FeatureCollection";
    features: WebTrackGeoJsonFeature[];
};

export type EssentialTrackInfo = TrackInfo & {
    trackPoints: { withEle: number; withoutEle: number };
};

/** WayPoint in the WebTrack format. */
export interface WayPoint {
    /** Latitude in degree. */
    lat: number;

    /** Longitude in degree. */
    lon: number;

    /** Index from 0 of soonest/nearest point along the entire track. */
    idx?: number;

    /** Elevation in meters. */
    ele?: number;

    /** Symbol for selecting the icon. */
    sym?: string;

    /** Description of the waypoint. */
    name?: string;
}

export enum ElevationSource {
    E = "SRTMGL1v3",
    G = "ASTGTMv3",
    J = 'Jonathan de Ferranti 1"',
    K = 'Jonathan de Ferranti 3"',
    M = "Mapbox",
}

export enum Activity {
    UNDEFINED = "??",
    PACKRAFT = "A?",
    BUS = "B?",
    CAR = "C?",
    SLED_DOG = "D?",
    ELECTRIC_BICYCLE = "E?",
    WALK = "F?",
    SUNDAY_SCHOOL_PICNIC_WALK = "F1",
    EASY_WALK = "F2",
    MODERATE_WALK = "F3",
    DIFFICULT_WALK = "F4",
    CHALLENGING_WALK = "F5",
    RUNNING = "G?",
    HITCHHIKING = "H?",
    MOTORBIKE = "I?",
    KAYAK = "K?",
    CANOE = "L?",
    MOTORED_BOAT = "M?",
    BICYCLE = "O?",
    SNOW_MOBILE = "Q?",
    ROWING_BOAT = "R?",
    SKI = "S?",
    TRAIN = "T?",
    HORSE = "V?",
    SAILING_BOAT = "W?",
    SNOW_SHOES = "X?",
    SWIM = "Y?",
    VIA_FERRATA = "Z?",
    EASY_VIA_FERRATA = "ZA",
    MODERATELY_DIFFICULT_VIA_FERRATA = "ZB",
    DIFFICULT_VIA_FERRATA = "ZC",
    VERY_DIFFICULT_VIA_FERRATA = "ZD",
    EXTREMELY_DIFFICULT_VIA_FERRATA = "ZE",
}

type ElevationSources = keyof typeof ElevationSource;
type ActivityString = keyof typeof Activity;

export type ActivityEntry = {
    activity: ActivityString;
    length: number;
};

export interface Segment {
    activity: ActivityString;
    withEle: number;
    points: Position[];
}

export interface TrackInfo {
    length?: number;
    activities?: ActivityEntry[];
    min?: number;
    max?: number;
    gain?: number;
    loss?: number;
    trackPoints?: {
        withEle: number;
        withoutEle: number;
    };
}

/** Interface with the WebTrack file format. */
export default class WebTrack {
    /** The WebTrack format name, constant. */
    static formatName = "webtrack-bin";

    /** The WebTrack format version, constant. */
    static formatVersion = "1.0.0";

    /** Returns the first characters that should be in the WebTrack file. */
    static fmtText = `${WebTrack.formatName}:${WebTrack.formatVersion}:`;

    /** A list of segments in the WebTrack format. */
    protected reformattedTracks: Segment[] = [];

    /** A list of waypoints in the WebTrack format. */
    protected waypoints: WayPoint[] = [];

    /** Information about whole track (elevation statistics, etc.) */
    protected trackInfo: TrackInfo = {};

    /** Buffer used when loading a WebTrack buffer. */
    protected buffer: ArrayBuffer;

    /** The size in bytes of the buffer. */
    protected bufferSize = 0;

    /** The total amount of points containing elevation data. */
    protected pointsWithEle = 0;

    /** The total amount of points not containing elevation data. */
    protected pointsWithoutEle = 0;

    /** The current position in the buffer. */
    protected currentPos = 0;

    /** The total amount of waypoints. */
    protected totalWaypoints = 0;

    /** The DataView of the buffer. */
    protected view: DataView;

    /** Merged list of elevation sources from all tracks and waypoints. */
    protected elevationSources: ElevationSource[] = [];

    /** Some encoded characters. */
    protected encoded: {
        withEle: Record<string, number>;
        withoutEle: number;
        separator: number;
    };

    /**
     * Returns true if there is at least one point with elevation data.
     * @return False if there isn't a single point with elevation.
     */
    someTracksWithEle(): boolean {
        return this.pointsWithEle > 0;
    }

    /**
     * Read an uint8 element from the buffer at the current position and
     * increment the cursor.
     * @return The byte from the buffer.
     */
    protected _rUint8(): number {
        return this.view.getUint8(this.currentPos++);
    }

    /**
     * Read an uint16 element from the buffer at the current position and
     * increment the cursor.
     * @return The bytes from the buffer.
     */
    protected _rUint16(): number {
        const pos = this.currentPos;
        this.currentPos += 2;
        return this.view.getUint16(pos, false);
    }

    /**
     * Read an int16 element from the buffer at the current position and
     * increment the cursor.
     * @return The bytes from the buffer.
     */
    protected _rInt16(): number {
        const pos = this.currentPos;
        this.currentPos += 2;
        return this.view.getInt16(pos, false);
    }

    /**
     * Read an uint32 element from the buffer at the current position and
     * increment the cursor.
     * @return The bytes from the buffer.
     */
    protected _rUint32(): number {
        const pos = this.currentPos;
        this.currentPos += 4;
        return this.view.getUint32(pos, false);
    }

    /**
     * Read an int32 element from the buffer at the current position and
     * increment the cursor.
     * @return The bytes from the buffer.
     */
    protected _rInt32(): number {
        const pos = this.currentPos;
        this.currentPos += 4;
        return this.view.getInt32(pos, false);
    }

    /**
     * Read the activity (2 ASCII characters)
     * NOTE! The undefined activity is mapped to *walk* that is the default.
     * @return The activity in readable format.
     */
    protected _readActivity(): string {
        const dec = new TextDecoder();
        const bytes = new Uint8Array([this._rUint8(), this._rUint8()]);
        let activity_key = dec.decode(bytes) as Activity;
        if (activity_key === Activity.UNDEFINED) {
            activity_key = Activity.WALK;
        }
        const indexActivity = Object.values(Activity).indexOf(activity_key);
        return Object.keys(Activity)[indexActivity];
    }

    /**
     * Returns the WebTrack in the GeoJSON format.
     * Elevation and cumulated distances are excluded.
     */
    toGeoJson(): WebTrackGeoJson {
        const geoJson: WebTrackGeoJson = {
            type: "FeatureCollection",
            features: [],
        };

        // segments
        for (const { points, activity } of this.reformattedTracks) {
            geoJson.features.push({
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: points.map((p) => [p[0], p[1]]),
                },
                properties: {
                    activity,
                    notClustered: true,
                },
            });
        }

        // starting point
        const firstPoint = this.reformattedTracks[0].points[0];
        geoJson.features.push({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [firstPoint[0], firstPoint[1]],
            },
            properties: {
                sym: "First Point",
                notClustered: true,
            },
        });

        // ending point
        const lastSegment =
            this.reformattedTracks[this.reformattedTracks.length - 1];
        const lastPoint = lastSegment.points[lastSegment.points.length - 1];
        geoJson.features.push({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [lastPoint[0], lastPoint[1]],
            },
            properties: {
                sym: "Last Point",
                notClustered: true,
            },
        });

        // waypoints
        for (const wpt of this.waypoints) {
            geoJson.features.push({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [wpt.lon, wpt.lat],
                },
                properties: {
                    sym: wpt.sym ?? "",
                    name: wpt.name,
                },
            });
        }
        return geoJson;
    }

    /**
     * Returns essential information about the track.
     */
    getTrackInfo(): EssentialTrackInfo {
        return {
            ...this.trackInfo,
            trackPoints: {
                withEle: this.pointsWithEle,
                withoutEle: this.pointsWithoutEle,
            },
        };
    }

    /**
     * Get the list of all elevation sources used for all tracks and waypoints.
     */
    getElevationSources(): ElevationSource[] {
        return this.elevationSources;
    }

    /**
     * Returns an array of segments in the WebTrack format.
     */
    getTrack(): Segment[] {
        return this.reformattedTracks;
    }

    /**
     * Returns an array of waypoints in the WebTrack format.
     */
    getWaypoints(): WayPoint[] {
        return this.waypoints;
    }

    /**
     * Check if the first bytes of the input buffer match the file format.
     * Returns false if the input buffer is null or undefined.
     * @return True if matches, false otherwise
     */
    protected _formatInfoPass(): boolean {
        if (!this.buffer) {
            return false;
        }
        const dec = new TextDecoder();
        const fmtInput = new Uint8Array(
            this.buffer,
            0,
            WebTrack.fmtText.length,
        );
        return WebTrack.fmtText === dec.decode(fmtInput);
    }

    /**
     * Add the elevation source to the current list if not already added.
     * @param byte The elevation source encoded as character
     */
    protected _addSourceFromByte(byte: number): void {
        for (const keySource in this.encoded.withEle) {
            if (byte === this.encoded.withEle[keySource]) {
                const eleSrc = ElevationSource[keySource as ElevationSources];
                if (this.elevationSources.indexOf(eleSrc) === -1) {
                    this.elevationSources.push(eleSrc);
                }
                return;
            }
        }
        throw new Error("Failed to load WebTrack: bad elevation source");
    }

    /**
     * Read the waypoints.
     */
    protected _populateWaypoints(): void {
        const dec = new TextDecoder();
        this.waypoints = new Array(this.totalWaypoints);
        for (let i = 0; i < this.totalWaypoints; i++) {
            let wpt: WayPoint = {
                lon: this._rInt32() / 1e5,
                lat: this._rInt32() / 1e5,
            };

            if (this.reformattedTracks.length > 0) {
                const idx = this._rUint32();
                if (idx > 0) {
                    wpt = { ...wpt, idx: idx - 1 };
                }
            }

            const eleSource = this._rUint8();
            if (eleSource !== this.encoded.withoutEle) {
                this._addSourceFromByte(eleSource);
                wpt = { ...wpt, ele: this._rInt16() };
            }

            let arr = [];
            for (
                let c = this._rUint8();
                c !== this.encoded.separator;
                c = this._rUint8()
            ) {
                arr.push(c);
            }
            let bytes = new Uint8Array(arr);
            const sym = dec.decode(bytes);

            arr = [];
            for (
                let c = this._rUint8();
                c !== this.encoded.separator;
                c = this._rUint8()
            ) {
                arr.push(c);
            }
            bytes = new Uint8Array(arr);
            const name = dec.decode(bytes);

            this.waypoints[i] = { ...wpt, sym, name };
        }
    }

    /**
     * Read the segments.
     */
    protected _populateSegments(): void {
        const totalSegments = this.reformattedTracks.length;
        for (let i = 0; i < totalSegments; i++) {
            const totalPointsInSegment =
                this.reformattedTracks[i].points.length;
            const segWithEle = this.reformattedTracks[i].withEle;
            let prevPoint = null;

            for (let p = 0; p < totalPointsInSegment; p++) {
                if (prevPoint === null) {
                    prevPoint = [
                        this._rInt32(),
                        this._rInt32(),
                        this._rUint16() * 10,
                    ];
                } else {
                    prevPoint = [
                        this._rInt16() + prevPoint[0],
                        this._rInt16() + prevPoint[1],
                        this._rUint16() * 10,
                    ];
                }
                if (segWithEle !== this.encoded.withoutEle) {
                    this._addSourceFromByte(segWithEle);
                    prevPoint = [...prevPoint, this._rInt16()];
                    this.reformattedTracks[i].points[p] = [
                        prevPoint[0] / 1e5,
                        prevPoint[1] / 1e5,
                        prevPoint[2],
                        prevPoint[3],
                    ];
                } else {
                    this.reformattedTracks[i].points[p] = [
                        prevPoint[0] / 1e5,
                        prevPoint[1] / 1e5,
                        prevPoint[2],
                    ];
                }
            }
        }
    }

    /**
     * Load a buffer containing the WebTrack.
     * The file format and version must be as defined by this class.
     * @param webtrackBytes The WebTrack buffer
     */
    constructor(webtrackBytes: ArrayBuffer) {
        if (!webtrackBytes) {
            throw new Error("Failed to load WebTrack: bad input buffer");
        }
        this.buffer = webtrackBytes;
        const typedBuffer = new Uint8Array(webtrackBytes);
        this.bufferSize = typedBuffer.length;

        // Format Information:

        if (!this._formatInfoPass()) {
            throw new Error("Failed to load WebTrack: bad file format");
        }

        const enc = new TextEncoder();
        this.encoded = {
            withEle: {
                E: enc.encode("E")[0],
                G: enc.encode("G")[0],
                J: enc.encode("J")[0],
                K: enc.encode("K")[0],
                M: enc.encode("M")[0],
            },
            withoutEle: enc.encode("F")[0],
            separator: enc.encode("\n")[0],
        };
        this.view = new DataView(this.buffer);
        this.currentPos = WebTrack.fmtText.length;
        const totalSegments = this._rUint8();
        this.totalWaypoints = this._rUint16();
        this.reformattedTracks = new Array(totalSegments);
        this.pointsWithEle = 0;
        this.pointsWithoutEle = 0;
        const activities = new Set();

        // Segment Headers:
        for (let i = 0; i < totalSegments; i++) {
            const activity = this._readActivity();
            const currSegType = this._rUint8();
            const points = this._rUint32();
            activities.add(activity);
            if (currSegType === this.encoded.withoutEle) {
                this.pointsWithoutEle += points;
            } else {
                this.pointsWithEle += points;
            }
            this.reformattedTracks[i] = {
                activity: activity as ActivityString,
                withEle: currSegType,
                points: new Array(points),
            };
        }

        // Track Information:
        if (totalSegments) {
            const length = this._rUint32();
            if (this.someTracksWithEle()) {
                const segmentedActivities = [];
                // no segmented activities if there is only one activity
                if (activities.size > 1) {
                    for (let i = 0; i < activities.size; i++) {
                        segmentedActivities.push({
                            activity: this._readActivity() as ActivityString,
                            length: this._rUint32(),
                        });
                    }
                }
                this.trackInfo = {
                    length,
                    activities: segmentedActivities,
                    min: this._rInt16(),
                    max: this._rInt16(),
                    gain: this._rUint32(),
                    loss: this._rUint32(),
                };
            } else {
                this.trackInfo = {
                    length,
                };
            }
        } else {
            this.trackInfo = {};
        }

        this._populateSegments();
        this._populateWaypoints();
    }
}
