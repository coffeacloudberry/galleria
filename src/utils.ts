import m from "mithril";
import Toastify from "toastify-js";

import { config } from "./config";
import { LogType } from "./CustomLogging";
import { injector } from "./models/Injector";

/** Deselect text. */
export function clearSelection(): void {
    const selection = window.getSelection();
    if (selection !== null) {
        selection.removeAllRanges();
    }
}

/**
 * Return true if the navigator is mobile or tablet.
 * NOTE: Due to user agent spoofing, the result SHALL NOT be trusted.
 */
export function isMobile(): boolean {
    return (
        /Android/i.test(navigator.userAgent) ||
        /webOS/i.test(navigator.userAgent) ||
        /iPhone/i.test(navigator.userAgent) ||
        /iPad/i.test(navigator.userAgent) ||
        /iPod/i.test(navigator.userAgent) ||
        /BlackBerry/i.test(navigator.userAgent) ||
        /Tablet/i.test(navigator.userAgent) ||
        /Mobile/i.test(navigator.userAgent)
    );
}

/** Get the photo ID from the path or the first one. */
export function getPhotoId(): number {
    try {
        const routePhotoId = parseInt(m.route.param("title"));
        if (routePhotoId) {
            return routePhotoId;
        }
    } catch {
        // continue regardless of error
    }
    return config.firstPhotoId;
}

/**
 * Remove all tippies instantly.
 * The native hideAll() does not remove instantly the ones hiding on click.
 */
export function hideAllForce(): void {
    document.querySelectorAll("[id^='tippy-']").forEach((residualTippy) => {
        residualTippy.remove();
    });
}

/** Returns a string of the number x with commas on thousands. */
export function numberWithCommas(x: number): string {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Loads a file and returns a Promise for when it is loaded.
 * The function does nothing if the script has already been injected.
 * That is to avoid duplication in script injections.
 * NOTICE: the code injection is only possible when the DOM is ready.
 */
export function injectCode(path: {
    src: string;
    sri: string;
    isModule?: boolean;
}): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!path.sri.startsWith("sha512-")) {
            throw Error(`SRI SHALL start with 'sha512-' (got '${path.sri}')`);
        }
        if (injector.alreadyResolved(path.src)) {
            resolve();
            return;
        }
        if (injector.push(path.src, resolve)) {
            return;
        }
        const ext = String(path.src.split(".").pop());
        switch (ext) {
            case "js": {
                const script = document.createElement("script");
                script.type = path.isModule ? "module" : "text/javascript";
                script.onload = () => {
                    injector.popAll(path.src);
                };
                script.onerror = reject;
                script.crossOrigin = "anonymous";
                script.integrity = path.sri;
                script.src = path.src;
                document.head.append(script);
                break;
            }
            case "css": {
                const style = document.createElement("link");
                style.rel = "stylesheet";
                style.type = "text/css";
                style.onload = () => {
                    injector.popAll(path.src);
                };
                style.onerror = reject;
                style.crossOrigin = "anonymous";
                style.integrity = path.sri;
                style.href = path.src;
                document.head.append(style);
                break;
            }
            default:
                throw TypeError(`Unhandled source file (got '${ext}')`);
        }
    });
}

/**
 * Open all external links in a new tab. It does not watch for new nodes, so
 * it should be called on vnode creation and update.
 */
export function transformExternalLinks(): void {
    const allExternalLinks = document.querySelectorAll("a[href^='http']");
    allExternalLinks.forEach((node) => {
        const relAttr = node.getAttribute("rel");
        const allRels = relAttr ? relAttr.split(" ") : [];
        ["noopener", "noreferrer"].forEach((attr) => {
            if (allRels.indexOf(attr) === -1) {
                allRels.push(attr);
            }
        });
        node.setAttribute("rel", allRels.join(" "));
        node.setAttribute("target", "_blank");
    });
}

export function getWindowSize(): { width: number; height: number } {
    const docElem = document.documentElement;
    const body = document.getElementsByTagName("body")[0];
    return {
        width: window.innerWidth || docElem.clientWidth || body.clientWidth,
        height: window.innerHeight || docElem.clientHeight || body.clientHeight,
    };
}

/**
 * Canvas Blocker & Firefox privacy.resistFingerprinting Detector.
 * (c) 2018 // JOHN OZBAY // CRYPT.EE
 * MIT License:
 * https://github.com/johnozbay/canvas-block-detector/blob/master/LICENSE
 * Source:
 * https://github.com/johnozbay/canvas-block-detector/blob/master/isCanvasBlocked.js
 *
 * Mapbox limitations:
 * Firefox: privacy.resistFingerprinting = false
 * Brave: fingerprinting not aggressively blocked
 */
export function isCanvasBlocked() {
    // create a 1px image data
    let blocked = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // some blockers just return an undefined ctx. So let's check that first.
    if (ctx) {
        const imageData = ctx.createImageData(1, 1);
        const originalImageData = imageData.data;

        // set pixels to RGB 128
        originalImageData[0] = 128;
        originalImageData[1] = 128;
        originalImageData[2] = 128;
        originalImageData[3] = 255;

        // set this to canvas
        ctx.putImageData(imageData, 1, 1);

        try {
            // now get the data back from canvas.
            const checkData = ctx.getImageData(1, 1, 1, 1).data;

            // If this is firefox, and privacy.resistFingerprinting is enabled,
            // OR a browser extension blocking the canvas,
            // This will return RGB all white (255,255,255) instead of
            // the (128,128,128) we put.

            // so let's check the R and G to see if they're 255 or 128 (matching
            // what we've initially set)
            if (
                originalImageData[0] !== checkData[0] &&
                originalImageData[1] !== checkData[1]
            ) {
                blocked = true;
            }
        } catch (error) {
            // some extensions will return getImageData null. this is to account
            // for that.
            blocked = true;
        }
    } else {
        blocked = true;
    }
    return blocked;
}

/**
 * This procedure redirects the user to a clean location if the location
 * contains noise. That is to avoid visitors spreading tracked links.
 * The parameters are expected to be in the hash part, not the search part.
 * Anything in the search part is considered noise. Noise can be identifiers
 * added by tracking companies. One example of tracker is the 'fbclid'
 * automatically added on links shared on Facebook.
 */
export function removeNoiseFromLocation() {
    const locationHasNoise = Boolean(location.search);
    if (locationHasNoise) {
        const pos = location.href.indexOf(
            location.search,
            location.origin.length,
        );
        if (pos > 0) {
            const noiseLength = location.search.length;
            location.href =
                location.href.slice(0, pos) +
                location.href.slice(pos + noiseLength);
        }
    }
}

export function toast(
    message: m.Vnode | string,
    destination?: string,
    type: LogType = LogType.info,
): void {
    const node = document.createElement("span");
    m.render(node, message);
    const currentToast = Toastify({
        node,
        duration: 3000,
        offset: {
            x: 0,
            y: -4,
        },
        style: { cursor: destination ? "pointer" : "default" },
        onClick: () => {
            if (destination) {
                m.route.set(destination);
                currentToast.hideToast();
            }
        },
        className: `custom-toast-${LogType[type]}`,
    });
    currentToast.showToast();
}
