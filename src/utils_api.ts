import { VercelRequest } from "@vercel/node";
import redis from "redis";

/** Initialize the Redis connection. Remember to close it. */
export function initClient(): redis.RedisClient {
    const client = redis.createClient({
        url: process.env.REDIS_URL,
    });
    client.on("error", function (err: Error) {
        throw err;
    });
    return client;
}

/**
 * Check the authorization token. Notice that displaying the error to the
 * end user may disclose the authentication configuration. So keep it silent.
 * NOTICE: the password shall not contain backslash '\'
 */
export function tryToken(request: VercelRequest): void {
    if (request.headers.authorization === undefined) {
        throw new Error("Missing Authorization Header");
    }
    if (!request.headers.authorization.startsWith("Basic ")) {
        throw new Error("Bad Authentication Scheme");
    }
    const base64Credentials = request.headers.authorization.split(" ")[1];
    const credentials = Buffer.from(base64Credentials, "base64").toString(
        "ascii",
    );
    const [, password] = credentials.split(":");
    if (password !== process.env.ADMIN_PASSWORD) {
        throw new Error("Invalid Authentication Credentials");
    }
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
