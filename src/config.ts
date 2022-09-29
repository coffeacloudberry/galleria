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
            src: "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js",

            /**
             * Subresource Integrity.
             * Hash can be generated with:
             * `openssl dgst -sha512 -binary FILENAME.js | openssl base64 -A`
             * More details: https://www.srihash.org/
             */
            sri: "sha512-ElRFoEQdI5Ht6kZvyzXhYG9NqjtkmlkfYk0wr6wHxU9JEHakS7UJZNeml5ALk+8IKlU6jDgMabC3vkumRokgJA==",
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
            src: "https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-annotation/2.0.1/chartjs-plugin-annotation.min.js",
            sri: "sha512-LZEOcU8s74hwWva82MJux7GgFNjfeExXG9yZPQrKz567Od4O2D/6UX3oGoZiRDOdbMtH33NBq7vonH4VOUPA/Q==",
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
            src: "https://api.mapbox.com/mapbox-gl-js/v2.10.0/mapbox-gl.css",
            sri: "sha512-99lKnAhTbFMSryZ/lPTtxDDRT1GAHB/dmYXUcW8dWaa9AIWZ7zQeWILgJGSe+LZsaEHJBpwq6z29ZOcwhkOntA==",
        },
        js: {
            src: "https://api.mapbox.com/mapbox-gl-js/v2.10.0/mapbox-gl.js",
            sri: "sha512-Ng2G2b+M7GB/LdvmgLol5XSBBlyNWTagosRZfNQmZv4eNu5GT6WX3NYxXxNBZoeAN6p/bTf3FwCwsUZ53tW1Tg==",
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
             * https://cdn.jsdelivr.net/npm/friendly-challenge@0.9.6/widget.module.min.js
             */
            src: "https://unpkg.com/friendly-challenge@0.9.6/widget.module.min.js",
            sri: "sha512-0LXhqFajIDIkEhQgNL0K4S0o/ltyneZlK9ge1GY7tLj7khLp1K7+eIRKN1zjoRXhGjyUNFKXHAa46nkeUCbOQA==",
            isModule: true,
        },

        siteKey: String(process.env.FRIENDLY_CAPTCHA_PUBLIC_KEY),
    },

    rev: String(process.env.GIT_VERSION),

    contentLicense: {
        shortName: "CC BY-NC-SA 4.0",
        url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
        holder: "Clément Fontaine",
    },
};
