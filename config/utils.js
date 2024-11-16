import child_process from "child_process";

import paths from "./paths.js";

export function mostRecentPhotoId() {
    return child_process.execSync(
        `ls -1 ${paths.build}/content/photos/ | tail -n 1`,
        { encoding: "utf8" },
    );
}

export function oldestPhotoId() {
    return child_process.execSync(
        `ls -1 ${paths.build}/content/photos/ | head -n 1`,
        { encoding: "utf8" },
    );
}

export function siteVersion() {
    return child_process.execSync(
        "git rev-parse --short HEAD",
        { encoding: "utf8" },
    );
}
