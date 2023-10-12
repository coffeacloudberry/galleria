const child_process = require("child_process");
const paths = require("./paths");

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

module.exports = { mostRecentPhotoId, oldestPhotoId };
