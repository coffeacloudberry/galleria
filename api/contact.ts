import { tmpdir } from "os";

import { VercelRequest, VercelResponse } from "@vercel/node";
import sendpulse, { ReturnError } from "sendpulse-api";

import * as utils from "../src/utils_api";

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
                            reject(new Error(data.message));
                        } else {
                            reject(new Error("Failed to send the email."));
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
export function checkCaptcha(
    solution: string,
): Promise<FriendlyCaptchaResponse> {
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
    return new Promise<FriendlyCaptchaResponse>((resolve) => {
        utils
            .doRequest(options, data)
            .then((responseBody: unknown) => {
                resolve(responseBody as FriendlyCaptchaResponse);
            })
            .catch(() => {
                resolve({ success: true });
            });
    });
}

export async function checkVisitor(solution: string): Promise<void> {
    await checkCaptcha(solution).then((payload) => {
        if (!payload.success) {
            if (
                "errors" in payload &&
                payload.errors instanceof Array &&
                payload.errors.includes("solution_timeout_or_duplicate")
            ) {
                throw new Error("410");
            }
            throw new Error("418");
        }
    });
}

interface FriendlyCaptchaResponse {
    success: boolean;
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
    if (request.method !== "POST") {
        // Method Not Allowed
        response.status(405).json(undefined);
        return;
    }
    const { email, message } = request.body;
    if (!("frc-captcha-solution" in request.body)) {
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
    await checkVisitor(captchaSolution)
        .then(async () => {
            await sendEmail(email, message)
                .then(() => {
                    response.status(200).json(undefined);
                })
                .catch(() => {
                    response.status(500).json(undefined);
                });
        })
        .catch((status_code) => {
            let n_status_code = parseInt(status_code.message);
            if (isNaN(n_status_code)) {
                n_status_code = 500;
            }
            response.status(n_status_code).json(undefined);
        });
};
