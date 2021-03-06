import { tmpdir } from "os";

import { VercelRequest, VercelResponse } from "@vercel/node";
import { getClientIp } from "request-ip";
import sendpulse, { BookInfo, ReturnError } from "sendpulse-api";

import * as utils from "../src/utils_api";

/** Address book name as defined in the SendPulse admin panel. */
export const newsletterAddressBookName = "Newsletter";

/**
 * The same user cannot do the same action twice
 * within this time gap in seconds.
 */
export const minTimeGap = 60;

/** Get the address book ID from the address book name. */
export function getNewsletterIdFromList(
    dataList: BookInfo[],
): number | undefined {
    let newsletterId: number | undefined; // skipcq: JS-0309
    for (const listItem of dataList) {
        if (listItem.name === newsletterAddressBookName) {
            newsletterId = listItem.id;
            break;
        }
    }
    return newsletterId;
}

function manageEmailInAddressBook(
    dataAddressBooks: BookInfo[],
    emailAddress: string,
    subscribe: boolean,
    resolve: (value: string) => void,
    reject: (value: string) => void,
) {
    const newsletterId = getNewsletterIdFromList(dataAddressBooks);
    const transaction = `'${emailAddress}' in '${newsletterAddressBookName}'`;

    if (newsletterId === undefined) {
        reject(`'${newsletterAddressBookName}' not found.`);
    }

    if (subscribe) {
        sendpulse.addEmails(
            (dataEmails: ReturnError | { result: boolean }) => {
                if ("result" in dataEmails && dataEmails.result) {
                    resolve(`Successfully added ${transaction}.`);
                } else {
                    reject(`Failed to add ${transaction}.`);
                }
            },
            newsletterId as number,
            [{ email: emailAddress, variables: {} }],
        );
    } else {
        sendpulse.removeEmails(
            (dataEmails: ReturnError | { result: boolean }) => {
                if ("result" in dataEmails && dataEmails.result) {
                    resolve(`Successfully removed ${transaction}.`);
                } else {
                    reject(`Failed to remove ${transaction}.`);
                }
            },
            newsletterId as number,
            [emailAddress],
        );
    }
}

/** Add/remove one new email address to/from address book. */
export function manageEmail(
    emailAddress: string,
    subscribe = true,
): Promise<string> {
    return new Promise((resolve, reject) => {
        if (emailAddress === process.env.SENDER_EMAIL) {
            resolve("Done nothing with the sender email address.");
        }
        sendpulse.init(
            String(process.env.SMTP_USER),
            String(process.env.SMTP_PASSWORD),
            tmpdir(),
            () => {
                sendpulse.listAddressBooks(
                    (dataAddressBooks: ReturnError | BookInfo[]) => {
                        if (dataAddressBooks instanceof Array) {
                            manageEmailInAddressBook(
                                dataAddressBooks,
                                emailAddress,
                                subscribe,
                                resolve,
                                reject,
                            );
                        } else {
                            reject(dataAddressBooks.message);
                        }
                    },
                );
            },
        );
    });
}

/** Sanitize and replace new lines. */
export function textToHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\r\n|\r|\n/g, "<br />");
}

/**
 * Send one email from the visitor to the webmaster.
 * The sender email shall be recorded in SendPulse. Since the visitor
 * is anonymous, the webmaster email address is used as sender.
 */
export function sendEmail(
    emailAddress: string,
    content: string,
): Promise<string> {
    content += `\nFrom: ${emailAddress}`;
    const contactSender = {
        name: "Webmaster",
        email: String(process.env.SENDER_EMAIL),
    };
    const email = {
        html: textToHtml(content),
        text: content,
        subject: "Contact Form",
        from: contactSender,
        to: [contactSender],
    };
    return new Promise((resolve, reject) => {
        sendpulse.init(
            String(process.env.SMTP_USER),
            String(process.env.SMTP_PASSWORD),
            tmpdir(),
            () => {
                sendpulse.smtpSendMail(
                    (data: ReturnError | { result: boolean; id: string }) => {
                        if ("result" in data && data.result) {
                            resolve("Email sent.");
                        } else if ("message" in data) {
                            reject(data.message);
                        } else {
                            reject("Failed to send the email.");
                        }
                    },
                    email,
                );
            },
        );
    });
}

/**
 * Check the Friendly CAPTCHA.
 *
 * Verification Best practices:
 * If you receive a response code other than 200 in production, you should
 * probably accept the user's form despite not having been able to verify
 * the CAPTCHA solution.
 * Source:
 * https://docs.friendlycaptcha.com/#/installation?id=verification-best-practices
 *
 * @param solution The solution value that the user submitted.
 */
export async function checkCaptcha(solution: string): Promise<boolean> {
    const data = JSON.stringify({
        solution,
        secret: process.env.FRIENDLY_CAPTCHA_SECRET_KEY,
        sitekey: process.env.FRIENDLY_CAPTCHA_PUBLIC_KEY,
    });
    const options = {
        hostname: "api.friendlycaptcha.com",
        port: 443,
        path: "/api/v1/siteverify",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(data, "utf8"),
        },
    };
    return new Promise<boolean>((resolve) => {
        utils
            .doRequest(options, data)
            .then((responseBody: unknown) => {
                const payload = responseBody as FriendlyCapthaResponse;
                resolve(payload["success"]);
            })
            .catch(() => {
                resolve(true);
            });
    });
}

/**
 * Check if the visitor has recently done the same action in a specific time
 * laps. If that is the case, an error is thrown, otherwise a new volatile entry
 * is created.
 */
export async function checkVisitor(
    listName: string,
    clientIp: string,
    solution: string,
    timeGap = minTimeGap,
): Promise<void> {
    // check CAPTCHA if not in testing mode
    if (solution != "") {
        await checkCaptcha(solution).then((is_human: boolean) => {
            if (!is_human) {
                throw new Error("418");
            }
        });
    }

    const client = await utils.initClient();
    const cHashedIp = utils.anonymizeClient(clientIp);
    const userKey = process.env.VERCEL_ENV + listName + cHashedIp;

    // abort if the visitor has recently been recorded
    if (await client.exists(userKey)) {
        throw new Error("429");
    }

    // the value is meaningless, what matters is the key existence
    await client.set(userKey, "");
    await client.expire(userKey, timeGap);
}

interface FriendlyCapthaResponse {
    success: boolean;
    details?: string;
    errors?: string[];
}

/** Email validation. */
export function isEmail(emailAddress: string): boolean {
    return /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(
        emailAddress,
    );
}

export default async (request: VercelRequest, response: VercelResponse) => {
    if (!utils.isSameSite(request)) {
        response.status(401).json(undefined);
        return;
    }
    if (request.method === "POST") {
        const { action, email, message } = request.body;
        if (
            !Object.prototype.hasOwnProperty.call(
                request.body,
                "frc-captcha-solution",
            )
        ) {
            response.status(418).json("Missing CAPTCHA solution.");
            return;
        }
        const captchaSolution = request.body["frc-captcha-solution"];
        if (!captchaSolution) {
            response.status(418).json("Empty CAPTCHA solution.");
            return;
        }
        if (!email) {
            response.status(400).json("Missing email address.");
            return;
        }
        if (!isEmail(email)) {
            response.status(400).json("Bad email address format.");
            return;
        }
        const ip = getClientIp(request);
        if (ip === null) {
            response.status(418).json(undefined);
            return;
        }
        const trace = new utils.Monitoring("Contact & Newsletter", action);
        switch (action) {
            case "subscribe": {
                await checkVisitor("subscriber", ip, captchaSolution)
                    .then(async () => {
                        await manageEmail(email)
                            .then(async () => {
                                await trace.close();
                                response.status(200).json(undefined);
                            })
                            .catch(async (error) => {
                                trace.except(error);
                                await trace.close();
                                response.status(500).json(undefined);
                            });
                    })
                    .catch(async (status_code) => {
                        trace.except(status_code);
                        await trace.close();
                        let n_status_code = parseInt(status_code);
                        if (isNaN(n_status_code)) {
                            n_status_code = 500;
                        }
                        response.status(n_status_code).json(undefined);
                    });
                return;
            }
            case "unsubscribe": {
                await checkVisitor("unsubscriber", ip, captchaSolution)
                    .then(async () => {
                        await manageEmail(email, false)
                            .then(async () => {
                                await trace.close();
                                response.status(200).json(undefined);
                            })
                            .catch(async (error) => {
                                trace.except(error);
                                await trace.close();
                                // silent to avoid disclosing subscribers
                                response.status(200).json(undefined);
                            });
                    })
                    .catch(async (status_code) => {
                        trace.except(status_code);
                        await trace.close();
                        let n_status_code = parseInt(status_code);
                        if (isNaN(n_status_code)) {
                            n_status_code = 500;
                        }
                        response.status(n_status_code).json(undefined);
                    });
                return;
            }
            case "send": {
                await checkVisitor("sender", ip, captchaSolution)
                    .then(async () => {
                        await sendEmail(email, message)
                            .then(async () => {
                                await trace.close();
                                response.status(200).json(undefined);
                            })
                            .catch(async (error) => {
                                trace.except(error);
                                await trace.close();
                                response.status(500).json(undefined);
                            });
                    })
                    .catch(async (status_code) => {
                        trace.except(status_code);
                        await trace.close();
                        let n_status_code = parseInt(status_code);
                        if (isNaN(n_status_code)) {
                            n_status_code = 500;
                        }
                        response.status(n_status_code).json(undefined);
                    });
                return;
            }
            default: {
                // Bad Request
                response.status(400).json(undefined);
            }
        }
    } else {
        // Method Not Allowed
        response.status(405).json(undefined);
    }
};
