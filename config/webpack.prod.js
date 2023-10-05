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
const { merge } = require("webpack-merge");
const paths = require("./paths");
const common = require("./webpack.common.js");
const GenerateWebLabelsPlugin = require("./generate-weblabels-webpack-plugin");
const languages = require("../src/languages.json");
const { readdirSync } = require("fs");
const address = "https://www.explorewilder.com";
const allStories = readdirSync(`${paths.build}/content/stories/`);
const allPhotos = readdirSync(`${paths.build}/content/photos/`);
const plainRoutes = [
    "photo",
    "stories",
    "about",
    "privacy",
    ...allStories.map((storyId) => `story/${storyId}`),
    ...allPhotos.map((photoId) => `photo/${photoId}`),
];

if (!("MAPBOX_ACCESS_TOKEN" in process.env)) {
    require("dotenv").config();
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
            template: `${paths.src}/template.html`, // template file
            filename: "index.html", // output file
            templateParameters: {
                prod: true,
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
                {
                    userAgent: "Googlebot",
                    disallow: "/",
                },
                {
                    userAgent: "Google-Extended",
                    disallow: "/",
                },
                {
                    userAgent: "CCBot",
                    disallow: "/",
                },
                {
                    userAgent: "GPTBot",
                    disallow: "/",
                },
                {
                    userAgent: "ChatGPT-User",
                    disallow: "/",
                },
                {
                    userAgent: "Twitterbot",
                    disallow: "/",
                },
            ],
            sitemap: `${address}/sitemap.xml`,
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

        new GenerateWebLabelsPlugin({
            additionalScripts: {
                "https://unpkg.com/friendly-challenge@0.9.13/widget.module.min.js":
                    [
                        {
                            id: "widget.module.min.js",
                            path: "https://github.com/FriendlyCaptcha/friendly-challenge/blob/master/src/index.ts",
                            spdxLicenseExpression: "MIT",
                            licenseFilePath:
                                "https://github.com/FriendlyCaptcha/friendly-challenge/blob/master/LICENSE.md",
                        },
                    ],
                // Mapbox GL JS is not OSI compliant
            },
        }),
    ],
    optimization: {
        minimize: true,
        concatenateModules: false,
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
        // the app is so lightweight that everything fit in one JS file
        runtimeChunk: false,
    },
    performance: {
        hints: "error",
        // the total amount of emitted files utilized during initial load time
        maxEntrypointSize: 400 * 1024,
        // the biggest emitted file allowed
        maxAssetSize: 250 * 1024,
    },
});
