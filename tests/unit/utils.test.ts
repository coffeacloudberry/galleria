/* eslint-disable max-len */

require("jsdom-global")();
global.requestAnimationFrame = (cb: any) => cb(); // for Mithril
const assert = require("assert");
import { numberWithCommas } from "../../src/utils";

describe("Utils", () => {
    it("should format thousands", () => {
        assert.equal(numberWithCommas(42), "42");
        assert.equal(numberWithCommas(1234), "1,234");
        assert.equal(numberWithCommas(42987122), "42,987,122");
    });
});
