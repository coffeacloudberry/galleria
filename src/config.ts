import { Attribution } from "./models/Map";
import type { MapThemeStrings } from "./models/Story";

type AttributedUrl = { url: string; attributions: Attribution[] };
type StyleType = Record<MapThemeStrings, AttributedUrl>;

const mostRecentPhotoId = parseInt(String(process.env.MOST_RECENT_PHOTO_ID));
const oldestPhotoId = parseInt(String(process.env.OLDEST_PHOTO_ID));

const openpgp4fpr = "FFD0B3DDAD69CB71BAE13B1DDFFF34860D361C52";

/**
 * Project configuration with values used by multiple files or requiring
 * special attention (regularly updated).
 */
export const config = {
    /** First photo in the content folder. */
    firstPhotoId: mostRecentPhotoId,

    /** Last photo in the content folder. */
    lastPhotoId: oldestPhotoId,

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
            src: "https://unpkg.com/chart.js@4.4.7/dist/chart.umd.js",

            /**
             * Subresource Integrity.
             * Hash can be generated with:
             * `openssl dgst -sha512 -binary FILENAME.js | openssl base64 -A`
             * More details: https://www.srihash.org/
             */
            sri: "sha512-0im+NZpDrlsC+p6iSc13cqlMNPqdT6e0hUF8NAaxdaGOmPuV9DdVpWYOCHHrMQNVDb2TByQoDbHx34MT6g16ZA==",
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
             * https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.1.0/dist/chartjs-plugin-annotation.min.js
             * https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-annotation/3.1.0/chartjs-plugin-annotation.min.js
             */
            src: "https://unpkg.com/chartjs-plugin-annotation@3.1.0/dist/chartjs-plugin-annotation.min.js",
            sri: "sha512-8MntMizyPIYkcjoDkYqgrQOuWOZsp92zlZ9d7M2RCG0s1Zua8H215p2PdsxS7qg/4hLrHrdPsZgVZpXheHYT+Q==",
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
            src: "https://api.mapbox.com/mapbox-gl-js/v3.8.0/mapbox-gl.css",
            sri: "sha512-+W+PNtw6h9It/dGnnIz41cEo6aQ369pEU6W/5utZ51PZGt+LYCt+vaeYn2ZSvc/GLxZ5K5zvKzr8ayM52MAShw==",
        },
        js: {
            src: "https://api.mapbox.com/mapbox-gl-js/v3.8.0/mapbox-gl.js",
            sri: "sha512-dgLjBtkOIlIS2olgosm5CNDpcLMSoqCGbZ1OjB9tcEqUO6IyNzKtIIj3JXFjBiGzvUQsiKlFz9oYHZp9D/9ilQ==",
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
                url: "mapbox://styles/onvbjzhghu/clng3anjs007q01pi6j8zfi7h",
                attributions: [Attribution.OpenStreetMap, Attribution.Mapbox],
            },
        } as StyleType,
    },

    /**
     * Turf prod version.
     * Check for new releases:
     * https://www.npmjs.com/package/@turf/turf
     */
    turf: {
        js: {
            src: "https://unpkg.com/@turf/turf@7.1.0/turf.min.js",
            sri: "sha512-J8iAUMKv2SQNAQifty/C4fYTjzszpJP3lVbu45lw6ZmJPEnWRgf1QoQxvhFKtj6Gb90xP4MBq0TFh1Ocd5u/AQ==",
        },
    },

    openpgp4fpr,
    id: `https://keyoxide.org/hkp/${openpgp4fpr}`,
    contentLicense: {
        shortName: "CC BY-NC-SA 4.0",
        url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
        others: "https://github.com/coffeacloudberry/galleria",
        holder: "Clément Fontaine",
    },
};
