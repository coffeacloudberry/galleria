/*
 * Highly inspired by the webpack Boilerplate by Tania Rascia:
 * https://www.taniarascia.com/how-to-use-webpack/
 * Under MIT license:
 * https://github.com/taniarascia/webpack-boilerplate/blob/master/LICENSE
 */

const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const paths = require("./paths");

// Read the .env file to simulate the process.env available in prod
require("dotenv").config();

module.exports = merge(common, {
    // Set the mode to development or production
    mode: "development",

    // Source map style, choose the JetBrains recommendation
    devtool: "source-map",

    // Spin up a server for quick development
    devServer: {
        historyApiFallback: true,
        static: paths.build,
        open: false, // set to true to open the default browser on startup
        compress: false,
        hot: true,
        port: 8080,
        server: "https", // fix CORS issue when connecting to 3rd parties
    },

    module: {
        rules: [
            // Styles: Inject CSS into the head with source maps
            {
                test: /\.(?:s[ac]ss|css)$/,
                use: [
                    "style-loader",
                    {
                        loader: "css-loader",
                        options: {
                            sourceMap: true,
                            modules: "global",
                        },
                    },
                    { loader: "sass-loader", options: { sourceMap: true } },
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
                prod: false,
            },
        }),

        // Only update what has changed on hot reload
        new webpack.HotModuleReplacementPlugin(),
    ],
});
