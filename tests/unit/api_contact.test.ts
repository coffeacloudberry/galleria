/* eslint-disable max-len */

import * as contact from "../../api/contact";
const assert = require("assert");
const sendpulse = require("sendpulse-api");
const os = require("os"); // use tmpdir for the SendPulse API
require("dotenv").config();

/*
SendPulse API: https://github.com/sendpulse/sendpulse-rest-api-node.js/blob/master/example.js
 */

describe("Contact Forms", () => {
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
        contact.checkCaptcha("").then((is_human) => {
            if (is_human) {
                done("Should not be considered human");
            } else {
                done();
            }
        });
    });

    it("should invalidate timed out or duplicated CAPTCHA", (done) => {
        const solution =
            "3a08aca851577f174e30ed347f20428b.YYQhnDH8BJdVJgFkAQwzggAAAAAAAAAA1DDSM8F3nGI=.AAAAAPwyAAABAAAAbU8DAAIAAACmcAIAAwAAAC8mAAAEAAAAOzsAAAUAAADvagAABgAAAG6fAgAHAAAA0BADAAgAAABvAQAACQAAACePAQAKAAAAhiMAAAsAAAD6twAADAAAADKdAAANAAAAN1wBAA4AAAC4zAAADwAAAE4WAAAQAAAA6kQBABEAAADJ5QAAEgAAAKFjAAATAAAAp4wAABQAAAB23AAAFQAAAFNdAAAWAAAAL3wDABcAAAB5dwQAGAAAAMpjAAAZAAAAWLIAABoAAACZGAAAGwAAANXeAQAcAAAAbVsCAB0AAAAn1wAAHgAAACExAQAfAAAAw2sAACAAAAB/gQAAIQAAAGNbAwAiAAAAYxIAACMAAABzWAAAJAAAADcTAAAlAAAA9Q0AACYAAADxAQAAJwAAAEE+AQAoAAAA7loAACkAAAD8FwEAKgAAAHOsAQArAAAA7JcBACwAAADlRQAALQAAAFCuAQAuAAAA7PAAAC8AAACyYgEAMAAAAIZuAQAxAAAAnWUBADIAAAACSgAA.AgAA";
        contact.checkCaptcha(solution).then((is_human) => {
            if (is_human) {
                done("Should not be considered human");
            } else {
                done();
            }
        });
    });

    it("should record new visitors", (done) => {
        const startTime = Date.now();
        contact
            .checkVisitor("sender", "" + startTime, "")
            .then(() => {
                contact
                    .checkVisitor("sender", "" + (startTime + 1), "")
                    .then(() => {
                        contact
                            .checkVisitor("sender", "" + (startTime + 2), "")
                            .then(() => {
                                done();
                            })
                            .catch((error) => {
                                done(error);
                            });
                    })
                    .catch((error) => {
                        done(error);
                    });
            })
            .catch((error) => {
                done(error);
            });
    });

    it("should not record the same visitor within a short time laps", (done) => {
        const visitorId = "" + Date.now();
        contact
            .checkVisitor("sender", visitorId, "")
            .then(() => {
                contact
                    .checkVisitor("sender", visitorId, "")
                    .then((result) => {
                        done(result);
                    })
                    .catch(() => {
                        done();
                    });
            })
            .catch((error) => {
                done(error);
            });
    });

    it("should record the same visitor after some time", (done) => {
        const visitorId = "" + Date.now();
        contact
            .checkVisitor("sender", visitorId, "", 1)
            .then(() => {
                setTimeout(() => {
                    contact
                        .checkVisitor("sender", visitorId, "", 1)
                        .then(() => {
                            done();
                        })
                        .catch((err) => {
                            done(err);
                        });
                }, 1500);
            })
            .catch((error) => {
                done(error);
            });
    });

    it("should subscribe a new email address", (done) => {
        sendpulse.init(
            process.env.SMTP_USER,
            process.env.SMTP_PASSWORD,
            os.tmpdir(),
            () => {
                sendpulse.listAddressBooks((addressBooks: any[]) => {
                    const newsletterId =
                        contact.getNewsletterIdFromList(addressBooks);
                    if (newsletterId === undefined) {
                        done(
                            `The address book '${contact.newsletterAddressBookName}' should be created.`,
                        );
                    }

                    const newEmailAddress = `${Date.now()}@example.com`;
                    contact
                        .manageEmail(newEmailAddress)
                        .then(() => {
                            sendpulse.getEmailsFromBook((mailingList: any) => {
                                let emailFound = false;
                                for (const mailingItem of mailingList) {
                                    if (mailingItem.email === newEmailAddress) {
                                        emailFound = true;
                                        break;
                                    }
                                }
                                if (emailFound) {
                                    sendpulse.removeEmails(
                                        () => {
                                            done();
                                        },
                                        newsletterId,
                                        [newEmailAddress],
                                    );
                                } else {
                                    done(
                                        `'${newEmailAddress}' not found in '${contact.newsletterAddressBookName}'.`,
                                    );
                                }
                            }, newsletterId);
                        })
                        .catch((error) => {
                            done(error);
                        });
                });
            },
        );
    });

    it("should unsubscribe an email address", (done) => {
        sendpulse.init(
            process.env.SMTP_USER,
            process.env.SMTP_PASSWORD,
            os.tmpdir(),
            () => {
                sendpulse.listAddressBooks((addressBooks: any[]) => {
                    const newsletterId =
                        contact.getNewsletterIdFromList(addressBooks);
                    if (newsletterId === undefined) {
                        done(
                            `The address book '${contact.newsletterAddressBookName}' should be created.`,
                        );
                    }

                    const newEmailAddress = `${Date.now()}@example.com`;
                    sendpulse.addEmails(
                        (addEmailsResult: any) => {
                            if (addEmailsResult.result) {
                                contact
                                    .manageEmail(newEmailAddress, false)
                                    .then(() => {
                                        sendpulse.getEmailsFromBook(
                                            (mailingList: any) => {
                                                let emailFound = false;
                                                for (const mailingItem of mailingList) {
                                                    if (
                                                        mailingItem.email ===
                                                        newEmailAddress
                                                    ) {
                                                        emailFound = true;
                                                        break;
                                                    }
                                                }
                                                if (emailFound) {
                                                    done(
                                                        `'${newEmailAddress}' found.`,
                                                    );
                                                } else {
                                                    done();
                                                }
                                            },
                                            newsletterId,
                                        );
                                    })
                                    .catch((error) => {
                                        done(error);
                                    });
                            } else {
                                done(`Failed to add ${newEmailAddress}.`);
                            }
                        },
                        newsletterId,
                        [{ email: newEmailAddress, variables: {} }],
                    );
                });
            },
        );
    });

    it("should send an email", (done) => {
        contact
            .sendEmail(`${Date.now()}@example.com`, "Blåblä")
            .then(() => {
                done();
            })
            .catch((error) => {
                done(error);
            });
    });
});
