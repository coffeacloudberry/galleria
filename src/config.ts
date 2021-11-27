import CustomLogging from "./CustomLogging";

const error = new CustomLogging("error");

const mostRecentPhotoId = parseInt("" + process.env.MOST_RECENT_PHOTO_ID);
if (isNaN(mostRecentPhotoId) && process.env.NODE_ENV !== "test") {
    error.log("Failed to find the most recent photo.");
}

const oldestPhotoId = parseInt("" + process.env.OLDEST_PHOTO_ID);
if (isNaN(oldestPhotoId) && process.env.NODE_ENV !== "test") {
    error.log("Failed to find the oldest photo.");
}

/**
 * Project configuration with values used by multiple files or requiring
 * special attention (regularly updated).
 */
export const config = {
    /** First photo in the content folder. */
    firstPhotoId: mostRecentPhotoId,

    /** Last photo in the content folder. */
    lastPhotoId: oldestPhotoId,

    /** Detailed in the contact API, value in seconds. */
    minTimeGapBetweenContactRequest: 60,

    /** Duration to display a temporary message, value in seconds. */
    ephemeralDisplayTimeout: 5,

    /**
     * Chart.js prod version.
     * Check for new releases:
     * https://github.com/chartjs/Chart.js/releases
     */
    chart: {
        js: {
            /**
             * CDN URL.
             * Cross-check SRI from other sources:
             * https://www.jsdelivr.com/package/npm/chart.js?path=dist
             */
            src: "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.6.0/chart.min.js",

            /**
             * Subresource Integrity.
             * Hash can be generated with:
             * `openssl dgst -sha512 -binary FILENAME.js | openssl base64 -A`
             * More details: https://www.srihash.org/
             */
            sri: "sha512-GMGzUEevhWh8Tc/njS0bDpwgxdCJLQBWG3Z2Ct+JGOpVnEmjvNx6ts4v6A2XJf1HOrtOsfhv3hBKpK9kE5z8AQ==",
        },
    },

    /**
     * Mapbox GL JS prod version.
     * Check for new releases:
     * https://github.com/mapbox/mapbox-gl-js/releases
     */
    mapbox: {
        /** Mapbox GL JS from the CDN. */
        css: {
            src: "https://api.mapbox.com/mapbox-gl-js/v2.6.0/mapbox-gl.css",
            sri: "sha512-5fX4Hy2/CjCjezt8kPbPtdjCmJZVVqD5t2ibWR4Z7CUVrhYHs1Dnni8yVXks9ZzIMcyPRo1c6wBfkeo5GhblFw==",
        },
        js: {
            src: "https://api.mapbox.com/mapbox-gl-js/v2.6.0/mapbox-gl.js",
            sri: "sha512-v9GM0e0puQ80W6hEyekiWFfUJQwq1MwAke9vPBrIpRQHXPuGEKdV6nxUTbOe3Z8Fhs74Uee5RSeWw3Fe2/C6Tg==",
        },

        /** Either official Mapbox style or custom style from Mapbox Studio. */
        style: {
            default: "mapbox://styles/onvbjzhghu/ckp9oa8nw216718o43dskmvsg",
            darkSnow: "mapbox://styles/onvbjzhghu/ckwdyvlrl2gn715su45kulnvr",
        },
    },

    /**
     * Turf prod version.
     * Check for new releases:
     * https://github.com/Turfjs/turf/releases
     */
    turf: {
        js: {
            src: "https://cdnjs.cloudflare.com/ajax/libs/Turf.js/6.5.0/turf.min.js",
            sri: "sha512-Q7HOppxoH0L2M7hreVoFCtUZimR2YaY0fBewIYzkCgmNtgOOZ5IgMNYxHgfps0qrO1ef5m7L1FeHrhXlq1I9HA==",
        },
    },

    /**
     * Friendly Captcha.
     * Check for new releases:
     * https://docs.friendlycaptcha.com/#/installation?id=option-a-using-a-script-tag
     */
    captcha: {
        js: {
            src: "https://unpkg.com/friendly-challenge@0.9.0/widget.module.min.js",
            sri: "sha512-TOjMX+X5yXszkKN5NLD98RlK8zGnbbkeHpj5coO1mpIiAsqrbMopkuoMI0hMiYTj2jQdX79001P71caSlbjqDA==",
            isModule: true,
        },

        siteKey: "" + process.env.FRIENDLY_CAPTCHA_PUBLIC_KEY,
    },

    giphy: {
        /** Number of requested gifs to the API. */
        gifPerSearchRequest: 10,

        /** Public key for the GIPHY API. */
        apiKey: "41MqyMCPwDMFIgEX78l0YpoJMZ9ddCQR",

        /** Public rating of the results provided by GIPHY. */
        rating: "g",
    },
};
