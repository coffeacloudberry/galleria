/* eslint-disable max-len */

import assert from "assert";

import { config } from "dotenv";

import * as contact from "../../api/contact";
import record from "./record";

config();

/*
SendPulse API: https://github.com/sendpulse/sendpulse-rest-api-node.js/blob/master/example.js
 */

describe("Contact Forms", () => {
    const recorder = record("contact_forms");

    before(() => {
        recorder.before();
    });

    it("should be a valid email address", () => {
        assert(contact.isEmail("test@example.com"));
        assert(contact.isEmail("test123@example.co"));
        assert(contact.isEmail("spam-123test@non.sncf"));
        assert(contact.isEmail("news+user@news.twenty4.me"));
    });

    it("should not be a valid email address", () => {
        assert(!contact.isEmail("te st@example.com"));
        assert(!contact.isEmail("test1@23@example.co"));
        assert(!contact.isEmail("spam-1<23test@non.sncf"));
        assert(!contact.isEmail("news+user@twen ty4.me"));
    });

    it("should invalidate empty CAPTCHA", (done) => {
        // skipcq: JS-0328
        contact.checkCaptcha("").then((payload) => {
            if (payload.success) {
                done("Should not be considered human");
            } else {
                done();
            }
        });
    });

    it("should invalidate timed out or duplicated CAPTCHA", (done) => {
        const solution =
            "3a08aca851577f174e30ed347f20428b.YYQhnDH8BJdVJgFkAQwzggAAAAAAAAAA1DDSM8F3nGI=.AAAAAPwyAAABAAAAbU8DAAIAAACmcAIAAwAAAC8mAAAEAAAAOzsAAAUAAADvagAABgAAAG6fAgAHAAAA0BADAAgAAABvAQAACQAAACePAQAKAAAAhiMAAAsAAAD6twAADAAAADKdAAANAAAAN1wBAA4AAAC4zAAADwAAAE4WAAAQAAAA6kQBABEAAADJ5QAAEgAAAKFjAAATAAAAp4wAABQAAAB23AAAFQAAAFNdAAAWAAAAL3wDABcAAAB5dwQAGAAAAMpjAAAZAAAAWLIAABoAAACZGAAAGwAAANXeAQAcAAAAbVsCAB0AAAAn1wAAHgAAACExAQAfAAAAw2sAACAAAAB/gQAAIQAAAGNbAwAiAAAAYxIAACMAAABzWAAAJAAAADcTAAAlAAAA9Q0AACYAAADxAQAAJwAAAEE+AQAoAAAA7loAACkAAAD8FwEAKgAAAHOsAQArAAAA7JcBACwAAADlRQAALQAAAFCuAQAuAAAA7PAAAC8AAACyYgEAMAAAAIZuAQAxAAAAnWUBADIAAAACSgAA.AgAA";
        // skipcq: JS-0328
        contact.checkCaptcha(solution).then((payload) => {
            if (payload.success) {
                done("Should not be considered human");
            } else {
                done();
            }
        });
    });

    it("should send an email", (done) => {
        contact
            .sendEmail("test1646576045243@explorewilder.com", "Blåblä")
            .then(() => {
                done();
            })
            .catch((error) => {
                done(error);
            });
    });

    after((done) => {
        recorder.after(done);
    });
});
