const path = require("path");

module.exports = {
    // Source files
    src: path.resolve(__dirname, "../src"),

    // Production build files
    build: path.resolve(__dirname, "../public"),

    // Root folder when the project configuration is located
    root: path.resolve(__dirname, ".."),
};
