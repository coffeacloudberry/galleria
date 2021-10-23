import { VercelRequest, VercelResponse } from "@vercel/node";
import * as utils from "../src/utils_api";
import { promisify } from "util";
import { getClientIp } from "request-ip";
import { anonymizeClient } from "../src/utils_api";

/** The same user cannot share twice within this time gap in seconds. */
const minTimeGap = 180;

export default async (request: VercelRequest, response: VercelResponse) => {
    if (!utils.isSameSite(request)) {
        response.status(401).json(undefined);
        return;
    }
    switch (request.method) {
        case "POST": {
            const { giphyId } = request.body;
            const re = /^[a-z0-9]+$/i;
            if (giphyId.length > 32 || !re.exec(giphyId)) {
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
            const hashedIp = anonymizeClient(clientIp);
            const data = `${giphyId}:${currentTime}:${hashedIp}`;
            const listName = `${process.env.VERCEL_ENV}:giphy`;
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
                    (lastId == giphyId || diffTime < minTimeGap)
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
            let client;
            try {
                client = utils.initClient();
            } catch {
                response.status(500).json(undefined);
                return;
            }
            const lrangeAsync = promisify(client.lrange).bind(client);
            let giphies = await lrangeAsync(
                `${process.env.VERCEL_ENV}:giphy`,
                0,
                -1,
            );
            client.quit();
            giphies = giphies.reverse(); // most recent first
            response.json(
                giphies.map((entry: string) => {
                    return {
                        id: entry.split(":")[0],
                    };
                }),
            );
            return;
        }
        default: {
            // Method Not Allowed
            response.status(405).json(undefined);
        }
    }
};
