import assert from "assert";
import { readFile } from "fs";

import WebTrack, { WebTrackGeoJson } from "../../src/webtrack";

let myWebTrack: WebTrack; // skipcq: JS-0309
const pathFixtures1Seg = {
    webtrack: "webtrack_cli/tests/fixtures/Gillespie_Circuit.webtrack",
    geojson: "tests/unit/fixtures/Gillespie_Circuit.geojson",
};
const pathFixtures3Segs = {
    webtrack: "webtrack_cli/tests/fixtures/Gillespie_Circuit_3segs.webtrack",
    geojson: "tests/unit/fixtures/Gillespie_Circuit_3segs.geojson",
};

/**
 * Remove the custom key added for the rendering.
 * @param obj The geoJSON payload.
 */
function cleaner(obj: Partial<WebTrackGeoJson & { notClustered: boolean }>) {
    Object.keys(obj).forEach(function (key) {
        if (key === "notClustered") {
            delete obj[key];
        } else {
            // @ts-expect-error
            const value = obj[key];
            if (typeof value === "object") {
                cleaner(value);
            }
        }
    });
}

describe("WebTrack Parser (1 segment, 3 waypoints)", () => {
    it("should load buffer", (done) => {
        readFile(pathFixtures1Seg.webtrack, (err, webtrackBytes) => {
            if (err) {
                done(err);
            }
            myWebTrack = new WebTrack(new Uint8Array(webtrackBytes).buffer);
            done();
        });
    });

    it("should contains info", () => {
        const trackInfo = myWebTrack.getTrackInfo();
        assert.deepStrictEqual(trackInfo, {
            length: 41460,
            trackPoints: { withEle: 0, withoutEle: 128 },
        });
    });

    it("should have one segment", () => {
        assert.strictEqual(myWebTrack.getTrack().length, 1);
    });

    it("should generate GeoJSON", (done) => {
        const geoJson = myWebTrack.toGeoJson();
        assert.strictEqual(typeof geoJson, "object");
        readFile(pathFixtures1Seg.geojson, "utf8", (err, expectedGeoJson) => {
            if (err) {
                done(err);
            }
            cleaner(geoJson);
            assert.deepStrictEqual(geoJson, JSON.parse(expectedGeoJson));
            done();
        });
    });
});

describe("WebTrack Parser (1 segment, 4 waypoints)", () => {
    it("should load buffer", (done) => {
        readFile(pathFixtures1Seg.webtrack, (err, webtrackBytes) => {
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
        readFile(pathFixtures3Segs.webtrack, (err, webtrackBytes) => {
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
        const geoJson = myWebTrack.toGeoJson();
        readFile(pathFixtures3Segs.geojson, "utf8", (err, expectedGeoJson) => {
            if (err) {
                done(err);
            }
            cleaner(geoJson);
            assert.deepStrictEqual(geoJson, JSON.parse(expectedGeoJson));
            done();
        });
    });
});
