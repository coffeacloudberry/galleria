/*
 * Highly inspired by the webpack Boilerplate by Tania Rascia:
 * https://www.taniarascia.com/how-to-use-webpack/
 * Under MIT license:
 * https://github.com/taniarascia/webpack-boilerplate/blob/master/LICENSE
 */

import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import { merge } from "webpack-merge";

import paths from "./paths.js";
import common from "./webpack.common.js";

export default merge(common, {
    mode: "production",
    devtool: "source-map",
    output: {
        path: paths.build,
        publicPath: "/",
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
        // the total number of emitted files used during initial load time
        maxEntrypointSize: 400 * 1024,
        // the biggest emitted file allowed
        maxAssetSize: 250 * 1024,
    },
});
