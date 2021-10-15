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
const languages = require("../src/languages.json");
const plainRoutes = ["photo", "about", "privacy"];
const address = "https://www.explorewilder.com";

if (!("MAPBOX_ACCESS_TOKEN" in process.env)) {
    require("dotenv").config();
}

module.exports = merge(common, {
    mode: "production",
    devtool: false,
    output: {
        path: paths.build,
        publicPath: "",
        filename: "js/[name].[contenthash].bundle.js",
    },
    module: {
        rules: [
            {
                test: /\.(s[ac]ss|css)$/,
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
            },
            minify: {
                minifyCSS: true,
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
                    name: "Clément Fontaine",
                    twitter: "ExploreWilder",
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
                changefreq: "weekly",
            },
            paths: languages
                .map((key) => {
                    return plainRoutes.map((route) => {
                        return `/#!/${key.slug}/${route}`;
                    });
                })
                .flat(),
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
        hints: false,
        maxEntrypointSize: 512000,
        maxAssetSize: 512000,
    },
});
