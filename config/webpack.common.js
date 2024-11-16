import path from "path";

import { CleanWebpackPlugin } from "clean-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import webpack from "webpack";

import paths from "./paths.js";
import StoriesPlugin from "./stories-webpack-plugin.js";
import { mostRecentPhotoId, oldestPhotoId, siteVersion } from "./utils.js";

export default {
    // Where webpack looks to start building the bundle
    entry: [`${paths.src}/index.ts`],

    // Where webpack outputs the assets and bundles
    output: {
        path: paths.build,
        filename: "[name].bundle.js",
        publicPath: "/",
    },

    // Determine how modules within the project are treated
    // Inline is preferred to avoid strange loading effect
    module: {
        rules: [
            // TypeScript
            { test: /\.tsx?$/, use: ["ts-loader"] },

            // Embedded into the scripts and styles
            { test: /\.(?:svg|png)$/, type: "asset/inline" },

            // Images: Copy image files to build folder
            { test: /\.(?:ico|gif|jpg|jpeg)$/i, type: "asset/resource" },

            // Fonts: Inline
            { test: /\.(?:woff2?|eot|ttf|otf)$/, type: "asset/inline" },
        ],
    },

    // Customize the webpack build process
    plugins: [
        new webpack.EnvironmentPlugin({
            MOST_RECENT_PHOTO_ID: mostRecentPhotoId(),

            OLDEST_PHOTO_ID: oldestPhotoId(),

            SITE_VERSION: siteVersion(),

            /*
             * Compile-time definitions of environment-specific configuration
             *
             * MAPBOX_ACCESS_TOKEN: Public access token,
             * SHALL start with `pk.` in all environments,
             * SHOULD be domain name restricted in prod.
             */
            MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN || "",
        }),

        // Removes/cleans build folders and unused assets when rebuilding
        new CleanWebpackPlugin({
            cleanOnceBeforeBuildPatterns: [
                "**/*",
                "!content/**",
                "!.well-known/**",
            ],
        }),

        // Copies the images
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.posix.join(
                        path
                            .resolve(paths.src, "icons", "favicon")
                            .replace(/\\/g, "/"),
                        "!(_)*.{ico,png}",
                    ),
                    to: "[name][ext]",
                    globOptions: {
                        caseSensitiveMatch: false,
                    },
                    noErrorOnMissing: false,
                },
                {
                    from: path.posix.join(
                        path
                            .resolve(paths.src, "icons", "map")
                            .replace(/\\/g, "/"),
                        "*.{png,svg}",
                    ),
                    to: `${paths.build}/assets/map/[name][ext]`,
                    globOptions: {
                        caseSensitiveMatch: false,
                    },
                    noErrorOnMissing: false,
                },
                {
                    from: path.posix.join(
                        path.resolve(paths.src, "qr_codes").replace(/\\/g, "/"),
                        "*.{png,svg}",
                    ),
                    to: `${paths.build}/assets/qr_codes/[name][ext]`,
                    globOptions: {
                        caseSensitiveMatch: false,
                    },
                    noErrorOnMissing: false,
                },
                {
                    from: "src/404.html",
                    to: `${paths.build}/`,
                },
                {
                    from: "src/robots.txt",
                    to: `${paths.build}/`,
                },
            ],
            options: {
                concurrency: 10,
            },
        }),

        new StoriesPlugin(),
    ],

    resolve: {
        modules: [paths.src, "node_modules"],
        extensions: [".js", ".tsx", ".ts", ".json"],
        alias: {
            "@": paths.src,
        },
    },

    // External variables and namespaces
    externals: {
        // How to call: const { default: mapboxgl } = await import("mapbox-gl");
        "mapbox-gl": "mapboxgl",
        // Howto: const Chart = await import("chart.js");
        "chart.js": "Chart",
        // Howto: const turf = await import("@turf/turf");
        "@turf/turf": "turf",
    },
};
