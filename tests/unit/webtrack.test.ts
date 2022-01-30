import assert from "assert";
import { readFile } from "fs";

import WebTrack from "../../src/webtrack";

let myWebTrack: WebTrack;
const webTrackPath = "tests/unit/fixtures/t.webtrack";
const geoJsonPath = "tests/unit/fixtures/t.geojson";
const webTrack1seg = "tests/unit/fixtures/Gillespie_Circuit.webtrack";
const webTrack3segs = "tests/unit/fixtures/Gillespie_Circuit_3segs.webtrack";
const geoJson3segs = "tests/unit/fixtures/Gillespie_Circuit_3segs.geojson";

describe("WebTrack Parser (1 segment, 0 waypoint)", () => {
    it("should load buffer", (done) => {
        readFile(webTrackPath, (err, webtrackBytes) => {
            if (err) {
                done(err);
            }
            myWebTrack = new WebTrack(new Uint8Array(webtrackBytes).buffer);
            done();
        });
    });

    it("should contains info", () => {
        assert.deepStrictEqual(myWebTrack.getTrackInfo(), {
            length: 57359,
            min: 55,
            max: 1209,
            gain: 3283,
            loss: 3404,
            trackPoints: { withEle: 2095, withoutEle: 0 },
        });
    });

    it("should have one segment", () => {
        assert.strictEqual(myWebTrack.getTrack().length, 1);
    });

    it("should not have any waypoint", () => {
        assert.strictEqual(myWebTrack.getWaypoints().length, 0);
    });

    it("should generate GeoJSON", (done) => {
        const geoJson = myWebTrack.toGeoJson();
        assert.strictEqual(typeof geoJson, "object");
        readFile(geoJsonPath, "utf8", (err, expectedGeoJson) => {
            if (err) {
                done(err);
            }
            assert.deepStrictEqual(geoJson, JSON.parse(expectedGeoJson));
            done();
        });
    });
});

describe("WebTrack Parser (1 segment, 4 waypoints)", () => {
    it("should load buffer", (done) => {
        readFile(webTrack1seg, (err, webtrackBytes) => {
            if (err) {
                done(err);
            }
            myWebTrack = new WebTrack(new Uint8Array(webtrackBytes).buffer);
            done();
        });
    });

    it("should have one segment", () => {
        assert.strictEqual(myWebTrack.getTrack().length, 1);
    });

    it("should have some waypoints", () => {
        assert.strictEqual(myWebTrack.getWaypoints().length, 4);
    });
});

describe("WebTrack Parser (3 segments, 4 waypoints)", () => {
    it("should load buffer", (done) => {
        readFile(webTrack3segs, (err, webtrackBytes) => {
            if (err) {
                done(err);
            }
            myWebTrack = new WebTrack(new Uint8Array(webtrackBytes).buffer);
            done();
        });
    });

    it("should have three segments", () => {
        assert.strictEqual(myWebTrack.getTrack().length, 3);
    });

    it("should have some waypoints", () => {
        assert.strictEqual(myWebTrack.getWaypoints().length, 4);
    });

    it("should generate GeoJSON", (done) => {
        readFile(geoJson3segs, "utf8", (err, expectedGeoJson) => {
            if (err) {
                done(err);
            }
            assert.deepStrictEqual(
                myWebTrack.toGeoJson(),
                JSON.parse(expectedGeoJson),
            );
            done();
        });
    });
});
