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
             * CDN URL
             */
            src: "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.1.1/chart.umd.min.js",

            /**
             * Subresource Integrity.
             * Hash can be generated with:
             * `openssl dgst -sha512 -binary FILENAME.js | openssl base64 -A`
             * More details: https://www.srihash.org/
             */
            sri: "sha512-RnIvaWVgsDUVriCOO7ZbDOwPqBY1kdE8KJFmJbCSFTI+a+/s+B1maHN513SFhg1QwAJdSKbF8t2Obb8MIcTwxA==",
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
            src: "https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-annotation/2.1.1/chartjs-plugin-annotation.min.js",
            sri: "sha512-axEZPNvGiZKwZJ/Lsibs4fL789JgV8GcLTSoYzp1Ck2fGbsmCewi8YzyLBxBaRtiTv9R1LwcAhtcMvIiE02rzw==",
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
            src: "https://api.mapbox.com/mapbox-gl-js/v2.11.1/mapbox-gl.css",
            sri: "sha512-7qcFOAtnc7L/Dp5XCPREKktkxyizxJx3JHDkuvXGRidzGWgUBU+6HtUVcZ7/PStqo4bJZoJ8bdWyKEcRHaJvqA==",
        },
        js: {
            src: "https://api.mapbox.com/mapbox-gl-js/v2.11.1/mapbox-gl.js",
            sri: "sha512-RgahJT1J0uLev/Z5kcR7BPbhkUEYh+6BpYEvM3nNHcgcOAcEnUJMlbHya7e2hZU4UwO92vBHULkJ8gLRahoIdg==",
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
             * https://cdn.jsdelivr.net/npm/friendly-challenge@0.9.9/widget.module.min.js
             */
            src: "https://unpkg.com/friendly-challenge@0.9.9/widget.module.min.js",
            sri: "sha512-AJy8ALd4v61yR/mhs4KkM83NvPJH4nnSMOJp1u2dl5pah5FjltajhkO1iLJrGydvEcjvZEO3B40dLFHpL//ZCg==",
            isModule: true,
        },

        siteKey: String(process.env.FRIENDLY_CAPTCHA_PUBLIC_KEY),
    },

    rev: String(process.env.GIT_VERSION),
    id: "https://keyoxide.org/hkp/FFD0B3DDAD69CB71BAE13B1DDFFF34860D361C52",
    contentLicense: {
        shortName: "CC BY-NC-SA 4.0",
        url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
        holder: "Clément Fontaine",
    },
};
