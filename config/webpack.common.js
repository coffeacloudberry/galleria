/*
 * Highly inspired by the webpack Boilerplate by Tania Rascia:
 * https://www.taniarascia.com/how-to-use-webpack/
 * Under MIT license:
 * https://github.com/taniarascia/webpack-boilerplate/blob/master/LICENSE
 */

const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const PrettierPlugin = require("prettier-webpack-plugin");
const StoriesPlugin = require("./stories-webpack-plugin");
const path = require("path");
const paths = require("./paths");
const child_process = require("child_process");
const webpack = require("webpack");

function git(command) {
    return child_process
        .execSync(`git ${command}`, { encoding: "utf8" })
        .trim();
}

function mostRecentPhotoId() {
    return child_process.execSync(
        `ls -1 ${paths.build}/content/photos/ | tail -n 1`,
        { encoding: "utf8" },
    );
}

function oldestPhotoId() {
    return child_process.execSync(
        `ls -1 ${paths.build}/content/photos/ | head -n 1`,
        { encoding: "utf8" },
    );
}

module.exports = {
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
            // Short commit hash
            GIT_VERSION: git("describe --always"),

            // Commit date
            // Notice that the Git date may differ from the deployed date
            GIT_AUTHOR_DATE: git("log -1 --format=%as"),

            MOST_RECENT_PHOTO_ID: mostRecentPhotoId(),

            OLDEST_PHOTO_ID: oldestPhotoId(),

            /*
             * Compile-time definitions of environment-specific configuration
             *
             * MAPBOX_ACCESS_TOKEN: Public access token,
             * SHALL start with `pk.` in all environments,
             * SHOULD be domain name restricted in prod.
             */
            MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN,

            IS_PROD: process.env.VERCEL_ENV === "production",

            FRIENDLY_CAPTCHA_PUBLIC_KEY:
                process.env.FRIENDLY_CAPTCHA_PUBLIC_KEY,
        }),

        // Removes/cleans build folders and unused assets when rebuilding
        new CleanWebpackPlugin({
            cleanOnceBeforeBuildPatterns: [
                "**/*",
                "!content/**",
                "!.well-known/**",
            ],
        }),

        // Copies the favicons
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
                    from: "src/404.html",
                    to: `${paths.build}/`,
                },
            ],
            options: {
                concurrency: 10,
            },
        }),

        // Prettier configuration
        new PrettierPlugin(),

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
        // Howto: const friendlyChallenge = await import("friendly-challenge");
        "friendly-challenge": "friendlyChallenge",
        // Howto: declare const Sentry: typeof import("@sentry/browser");
        Sentry: "Sentry",
    },
};
