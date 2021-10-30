import { VercelRequest, VercelResponse } from "@vercel/node";
import * as utils from "../src/utils_api";
import { promisify } from "util";
import redis from "redis";

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

            let client: redis.RedisClient;
            try {
                client = utils.initClient();
            } catch {
                response.status(500).json(undefined);
                return;
            }

            // add the entry
            const rpushAsync = promisify(client.rpush).bind(client);
            // @ts-ignore
            await rpushAsync(`${process.env.VERCEL_ENV}:giphy`, giphyId);
            client.quit();
            response.json(undefined);
            return;
        }
        case "GET": {
            let client: redis.RedisClient;
            try {
                client = utils.initClient();
            } catch {
                response.status(500).json(undefined);
                return;
            }
            const lrangeAsync = promisify(client.lrange).bind(client);
            // get the last 8 entries
            let giphies = await lrangeAsync(
                `${process.env.VERCEL_ENV}:giphy`,
                -8,
                -1,
            );
            client.quit();
            giphies = giphies.reverse(); // most recent first
            response.json(
                giphies.map((entry: string) => {
                    return {
                        id: entry,
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
