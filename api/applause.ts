import { VercelRequest, VercelResponse } from "@vercel/node";
import * as utils from "../src/utils_api";
import { anonymizeClient, doRequest } from "../src/utils_api";
import { getClientIp } from "request-ip";

/**
 * Forward the like to the Azure API Manager. The APIM credentials are sent in
 * the request alongside the client's IP address in anonymous form.
 * NOTICE: The Privacy Badger plugin blacklist the endpoint, that is why
 * forwarding the request is necessary. That also helps complying the Privacy
 * and DNT Policies since the end user's IP address is unknown from the Azure
 * API Manager.
 */
export default async (request: VercelRequest, response: VercelResponse) => {
    if (!utils.isSameSite(request)) {
        response.status(401).json(undefined);
        return;
    }
    if (request.method == "POST") {
        const { type, id } = request.body;
        const data = `${type}_id=${id}`;
        const options = {
            hostname: process.env.APIM_HOSTNAME,
            port: 443,
            path: "/api/like_" + type,
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": data.length,
                "Ocp-Apim-Subscription-Key": process.env.APIM_SUBSCRIPTION_KEY,
                "X-Vercel-Pass": process.env.APIM_PASS,
                "X-Client-ID": anonymizeClient(getClientIp(request)),
            },
        };

        await doRequest(options, data).then((responseBody: unknown) => {
            const remoteResponse = responseBody as Record<string, string>;
            if (remoteResponse.hasOwnProperty("statusCode")) {
                const statusCode = parseInt(remoteResponse["statusCode"]);
                if (statusCode >= 400) {
                    // Bad Gateway
                    response.status(502).json(undefined);
                    return;
                }
            }
            response.json(undefined);
            return;
        });
    } else {
        // Method Not Allowed
        response.status(405).json(undefined);
    }
};
