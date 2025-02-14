import "dotenv/config";

import HtmlWebpackPlugin from "html-webpack-plugin";
import webpack from "webpack";
import { merge } from "webpack-merge";

import paths from "./paths.js";
import common from "./webpack.common.js";

export default merge(common, {
    // Set the mode to development or production
    mode: "development",

    // Source map style, choose the JetBrains recommendation
    devtool: "source-map",

    // Spin up a server for quick development
    devServer: {
        historyApiFallback: true,
        static: paths.build,
        compress: false,
        port: 8080,
        client: {
            overlay: {
                runtimeErrors: false,
            },
        },
    },

    module: {
        rules: [
            // Styles: Inject CSS into the head with source maps
            {
                test: /\.(?:scss|css)$/,
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
