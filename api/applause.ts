import { VercelRequest, VercelResponse } from "@vercel/node";
import * as utils from "../src/utils_api";
import { promisify } from "util";
import { getClientIp } from "request-ip";
import { createHash } from "crypto";

/** The same user cannot applause twice within this time gap in seconds. */
const minTimeGap = 3;

/**
 * Max characters in the story ID.
 * If longer is found, the ID is cut and a hash is appended.
 */
const maxStoryIdLength = 60;

export default async (request: VercelRequest, response: VercelResponse) => {
    if (!utils.isSameSite(request)) {
        response.status(401).json(undefined);
        return;
    }
    switch (request.method) {
        case "POST": {
            const { type, id } = request.body;
            let parsedId: number | string | null = null;
            if (type === "photo") {
                parsedId = parseInt("" + id);
                if (isNaN(parsedId)) {
                    parsedId = null;
                }
            } else if (type === "story") {
                if (id != "") {
                    parsedId = id;
                    if (id.length > maxStoryIdLength) {
                        parsedId +=
                            "~" +
                            createHash("sha1")
                                .update(id)
                                .digest("hex")
                                .slice(0, 6);
                    }
                }
            }
            if (parsedId === null) {
                // Bad Request
                response.status(400).json(undefined);
                return;
            }

            const currentTime = Math.floor(Date.now() / 1000);
            const clientIp = getClientIp(request);
            if (clientIp === null) {
                response.status(400).json(undefined);
                return;
            }
            const hashedIp = createHash("sha1")
                .update(clientIp + process.env.SALT)
                .digest("base64")
                .slice(0, 24);
            const data = `${parsedId}:${currentTime}:${hashedIp}`;
            const listName = `${process.env.VERCEL_ENV}:applause:${type}`;
            let client;
            try {
                client = utils.initClient();
            } catch {
                response.status(500).json(undefined);
                return;
            }

            // get the last element
            const lindexAsync = promisify(client.lindex).bind(client);
            try {
                const res = await lindexAsync(listName, -1);
                const [lastId, lastTimestamp, lastAddr] = res.split(":");
                const diffTime = currentTime - parseInt(lastTimestamp);
                if (
                    lastAddr === hashedIp &&
                    (lastId == id || diffTime < minTimeGap)
                ) {
                    client.quit();
                    // Too Many Requests
                    response.status(429).json(undefined);
                    return;
                }
            } catch {} // silent first entry or corrupted data errors

            // add the entry
            const rpushAsync = promisify(client.rpush).bind(client);
            // @ts-ignore
            await rpushAsync(listName, data);
            client.quit();
            response.json(undefined);
            return;
        }
        case "GET": {
            try {
                utils.tryToken(request);
            } catch {
                // Unauthorized
                response.status(401).json(undefined);
                return;
            }
            let client;
            try {
                client = utils.initClient();
            } catch {
                response.status(500).json(undefined);
                return;
            }
            const lrangeAsync = promisify(client.lrange).bind(client);
            const fromPhoto = await lrangeAsync(
                `${process.env.VERCEL_ENV}:applause:photo`,
                0,
                -1,
            );
            const fromStory = await lrangeAsync(
                `${process.env.VERCEL_ENV}:applause:story`,
                0,
                -1,
            );
            client.quit();
            response.json({ photo: fromPhoto, story: fromStory });
            return;
        }
        default: {
            // Method Not Allowed
            response.status(405).json(undefined);
        }
    }
};
