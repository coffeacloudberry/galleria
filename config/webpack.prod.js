/*
 * Highly inspired by the webpack Boilerplate by Tania Rascia:
 * https://www.taniarascia.com/how-to-use-webpack/
 * Under MIT license:
 * https://github.com/taniarascia/webpack-boilerplate/blob/master/LICENSE
 */

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const RobotstxtPlugin = require("robotstxt-webpack-plugin");
const HumanstxtPlugin = require("./humanstxt-webpack-plugin");
const SitemapPlugin = require("sitemap-webpack-plugin").default;
const SentryCliPlugin = require("@sentry/webpack-plugin");
const { merge } = require("webpack-merge");
const paths = require("./paths");
const common = require("./webpack.common.js");
const languages = require("../src/languages.json");
const { readdirSync } = require("fs");
const path = require("path");
const child_process = require("child_process");
const address = "https://www.explorewilder.com";
const allStories = readdirSync(`${paths.build}/content/stories/`);
const allPhotos = readdirSync(`${paths.build}/content/photos/`);
const plainRoutes = [
    "photo",
    "stories",
    "about",
    "privacy",
    ...allStories.map((storyId) => "story/" + storyId),
    ...allPhotos.map((photoId) => "photo/" + photoId),
];

if (!("MAPBOX_ACCESS_TOKEN" in process.env)) {
    require("dotenv").config();
}

function sentry_release() {
    return child_process
        .execSync(`sentry-cli releases propose-version`, { encoding: "utf8" })
        .trim();
}

module.exports = merge(common, {
    mode: "production",
    devtool: "source-map",
    output: {
        path: paths.build,
        publicPath: "",
        filename: "js/[name].[contenthash].bundle.js",
    },
    module: {
        rules: [
            {
                test: /\.(?:s[ac]ss|css)$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: "css-loader",
                        options: {
                            sourceMap: false,
                            modules: "global",
                        },
                    },
                    "sass-loader",
                ],
            },
        ],
    },
    plugins: [
        // Generates an HTML file from a template
        new HtmlWebpackPlugin({
            template: paths.src + "/template.html", // template file
            filename: "index.html", // output file
            templateParameters: {
                prod: true,
                sentry_release: sentry_release(),
            },
            minify: {
                minifyCSS: true,
                minifyJS: true,
                collapseWhitespace: true,
                keepClosingSlash: true,
            },
        }),

        // Extracts CSS into separate files
        new MiniCssExtractPlugin({
            filename: "styles/[name].[contenthash].css",
            chunkFilename: "[id].css",
        }),

        new RobotstxtPlugin({
            policy: [
                {
                    userAgent: "*",
                    allow: "/",
                },
            ],
            sitemap: address + "/sitemap.xml",
        }),

        new HumanstxtPlugin({
            team: [
                {
                    type: "Name",
                    name: "Clement",
                },
            ],
            languages: languages.map((key) => {
                return key.name;
            }),
        }),

        new SitemapPlugin({
            base: address,
            options: {
                skipgzip: true,
                lastmod: new Date().toISOString().split("T")[0],
                changefreq: "monthly",
            },
            paths: languages
                .map((key) => {
                    return plainRoutes.map((route) => {
                        return `/#!/${key.slug}/${route}`;
                    });
                })
                .flat(),
        }),

        // Push source maps to Sentry
        new SentryCliPlugin({
            include: path.resolve(paths.build, "js"),
            ignoreFile: path.resolve(paths.root, ".gitignore"),
            urlPrefix: "~/js",
            dryRun: !("SENTRY_AUTH_TOKEN" in process.env),
        }),
    ],
    optimization: {
        minimize: true,
        minimizer: [
            new CssMinimizerPlugin({
                // the default cssnano is broken, use clean-css instead
                minify: CssMinimizerPlugin.cleanCssMinify,
                minimizerOptions: {
                    level: {
                        1: {
                            // remove the /*! ... */ comments
                            specialComments: 0,
                        },
                    },
                },
            }),
            "...",
        ],
        runtimeChunk: {
            name: "runtime",
        },
    },
    performance: {
        hints: "error",
        // the total amount of emitted files utilized during initial load time
        maxEntrypointSize: 400 * 1024,
        // the biggest emitted file allowed
        maxAssetSize: 250 * 1024,
    },
});
