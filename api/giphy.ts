import { VercelRequest, VercelResponse } from "@vercel/node";

import * as utils from "../src/utils_api";

export default async (request: VercelRequest, response: VercelResponse) => {
    if (!utils.isSameSite(request)) {
        response.status(401).json(undefined);
        return;
    }
    const env = String(process.env.VERCEL_ENV);
    switch (request.method) {
        case "POST": {
            const { giphyId } = request.body;
            if (giphyId.length > 32 || !/^[a-z0-9]+$/i.test(giphyId)) {
                // Bad Request
                response.status(400).json(undefined);
                return;
            }

            // add the entry
            const client = await utils.initClient();
            await client.rPush(`${env}:giphy`, giphyId);
            response.json(undefined);
            return;
        }
        case "GET": {
            const client = await utils.initClient();
            // get the last 8 entries
            let giphies = await client.lRange(`${env}:giphy`, -8, -1);
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
