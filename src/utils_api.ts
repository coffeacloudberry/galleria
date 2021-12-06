import { createHash } from "crypto";
import https from "https";

import { VercelRequest } from "@vercel/node";
import { createClient } from "redis";

const client = createClient({ url: process.env.REDIS_URL });
type RedisClientType = typeof client;

/** Initialize the Redis connection. Remember to close it. */
export async function initClient(): Promise<RedisClientType> {
    if (!client.isOpen) {
        await client.connect();
    }
    return client;
}

/**
 * Check if the request comes from the same website.
 * The decision is based on the Sec-Fetch-Site field if existing, otherwise the
 * Referer. The Sec-Fetch-Site is only supported by Chrome-based browsers, that
 * do not include the Referer when requested (contrary to Firefox-based
 * browsers).
 *
 * * Sec-Fetch-Site Spec: https://www.w3.org/TR/fetch-metadata/
 * * Referer Spec: https://tools.ietf.org/html/rfc7231#section-5.5.2
 *
 * @return True if the page loaded comes from the same website. False otherwise.
 */
export function isSameSite(request: VercelRequest): boolean {
    if (request.headers["Sec-Fetch-Site"] !== undefined) {
        return request.headers["Sec-Fetch-Site"] === "same-origin";
    }
    if (!request.headers.referer || !request.headers.host) {
        return false;
    }
    return (
        request.headers.referer.indexOf(request.headers.host.split(":")[0]) > -1
    );
}

/** Do a request with options provided. */
export function doRequest(
    options: https.RequestOptions,
    data: string,
): Promise<any> {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            res.setEncoding("utf8");
            let responseBody = "";

            res.on("data", (chunk) => {
                responseBody += chunk;
            });

            res.on("end", () => {
                if (res.statusCode && res.statusCode < 400) {
                    resolve(JSON.parse(responseBody));
                } else {
                    reject(res.statusCode);
                }
            });
        });

        req.on("error", (err) => {
            reject(err);
        });

        req.write(data);
        req.end();
    });
}

/**
 * Hash the client IP to anonymize the client and avoid disclosing the IP
 * to the database.
 */
export function anonymizeClient(clientIp: string | null): string {
    if (clientIp === null) {
        return "";
    }
    return createHash("sha1")
        .update(clientIp + process.env.SALT)
        .digest("base64")
        .slice(0, 24);
}
