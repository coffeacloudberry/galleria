/*
Extracted from https://github.com/pymander/mocha_nock_demo/blob/master/test/record.js
Owned by Erik L. Arneson under ISC license https://opensource.org/licenses/ISC
Refactored and translated to TypeScript
 */

import fs from "fs";
import path from "path";

import nock from "nock";

export default function (name: string) {
    const fixture = path.join("fixtures", `_${name}.js`);
    const fp = path.join("tests", "unit", fixture);
    const forceRecording = Boolean(process.env.NOCK_RECORD);
    let hasFixtures = false;

    return {
        /** starts recording, or ensure the fixtures exist */
        before() {
            if (forceRecording) {
                hasFixtures = false;
                nock.recorder.rec({
                    dont_print: true,
                });
            } else {
                try {
                    require(`./${fixture}`);
                    hasFixtures = true;
                } catch (e) {
                    hasFixtures = false;
                    nock.recorder.rec({
                        dont_print: true,
                    });
                }
            }
        },
        /** saves our recording if fixtures didn't already exist */
        after(done: Mocha.Done) {
            if (hasFixtures) {
                done();
            } else {
                const fixturesStr = nock.recorder.play().join("\n");
                const text = `const nock = require('nock');\n${fixturesStr}`;
                fs.writeFile(fp, text, done);
            }
        },
    };
}
