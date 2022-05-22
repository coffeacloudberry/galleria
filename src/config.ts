import { Attribution } from "./models/Map";
import { MapThemeStrings } from "./models/Story";

const mostRecentPhotoId = parseInt(String(process.env.MOST_RECENT_PHOTO_ID));
const oldestPhotoId = parseInt(String(process.env.OLDEST_PHOTO_ID));

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
            src: "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.1/chart.min.js",

            /**
             * Subresource Integrity.
             * Hash can be generated with:
             * `openssl dgst -sha512 -binary FILENAME.js | openssl base64 -A`
             * More details: https://www.srihash.org/
             */
            sri: "sha512-QSkVNOCYLtj73J4hbmVoOV6KVZuMluZlioC+trLpewV8qMjsWqlIQvkn1KGX2StWvPMdWGBqim1xlC8krl1EKQ==",
        },
    },

    /**
     * chartjs-plugin-annotation prod version.
     * Check for new releases:
     * https://cdnjs.com/libraries/chartjs-plugin-annotation
     */
    chartPluginAnnotation: {
        js: {
            /**
             * Cross-check SRI:
             * https://www.jsdelivr.com/package/npm/chartjs-plugin-annotation?path=dist
             */
            src: "https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-annotation/1.4.0/chartjs-plugin-annotation.min.js",
            sri: "sha512-HrwQrg8S/xLPE6Qwe7XOghA/FOxX+tuVF4TxbvS73/zKJSs/b1gVl/P4MsdfTFWYFYg/ISVNYIINcg35Xvr6QQ==",
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
            src: "https://api.mapbox.com/mapbox-gl-js/v2.8.2/mapbox-gl.css",
            sri: "sha512-/GGb4OqF7vHc0EmA3vc2c0TxlgqQJv55fewnZg9Vlh1TK0WazwS2egFQBgvOHN1fp33VQ8G7tDlm5hMpe6oqqA==",
        },
        js: {
            src: "https://api.mapbox.com/mapbox-gl-js/v2.8.2/mapbox-gl.js",
            sri: "sha512-GxM2ITnUczSgYuvhdrgwYVMZhsMEJcWvYKJL2HjAoK5eCcqRcT278ZXn/rEnB6BTbD5UOcKL2S0LGDPV3P4snQ==",
        },

        /** Either official Mapbox style or custom style from Mapbox Studio. */
        style: {
            default: {
                url: "mapbox://styles/onvbjzhghu/ckp9oa8nw216718o43dskmvsg",
                attributions: [
                    Attribution.OpenStreetMap,
                    Attribution.Mapbox,
                    Attribution.Maxar,
                ],
            },
            darkSnow: {
                url: "mapbox://styles/onvbjzhghu/ckwdyvlrl2gn715su45kulnvr",
                attributions: [
                    Attribution.OpenStreetMap,
                    Attribution.Mapbox,
                    Attribution.Maxar,
                ],
            },
            whiteSnow: {
                url: "mapbox://styles/onvbjzhghu/ckwuwtmkeeb1p15p2zbawe8u5",
                attributions: [Attribution.OpenStreetMap, Attribution.Mapbox],
            },
        } as Record<
            MapThemeStrings,
            { url: string; attributions: Attribution[] }
        >,
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
     * Also change the URL in the Webpack Web Labels config.
     */
    captcha: {
        js: {
            /**
             * Cross-check SRI:
             * https://cdn.jsdelivr.net/npm/friendly-challenge@0.9.2/widget.module.min.js
             */
            src: "https://unpkg.com/friendly-challenge@0.9.2/widget.module.min.js",
            sri: "sha512-dinFq6qHfLQ377qBfkNzam2sSrSYdz0deoWk+LAuiZxK9BQLDCY7whprfI+Y0BieTsfZs1w5P6HTMoYPrN6sUA==",
            isModule: true,
        },

        siteKey: String(process.env.FRIENDLY_CAPTCHA_PUBLIC_KEY),
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
