const prod = require("./webpack.prod.js");
const { merge } = require("webpack-merge");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

module.exports = merge(prod, {
    plugins: [new BundleAnalyzerPlugin()],
});
