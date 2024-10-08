import m from "mithril";
import tippy, { Placement, Instance as TippyInstance } from "tippy.js";
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

export function msOrKms(value: number): string {
    return value > 3000
        ? `${Math.round(value / 1000)} km`
        : `${Math.round(value)} m`;
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
 * Canvas Blocker & Firefox privacy.resistFingerprinting Detector.
 * (c) 2018 // JOHN OZBAY // CRYPT.EE
 * MIT License:
 * https://github.com/johnozbay/canvas-block-detector/blob/master/LICENSE
 * Source:
 * https://github.com/johnozbay/canvas-block-detector/blob/master/isCanvasBlocked.js
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
        } catch {
            // some extensions will return getImageData null.
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

export function toast(message: string, type: LogType = LogType.info): void {
    const node = document.createElement("span");
    m.render(node, message);
    const currentToast = Toastify({
        node,
        duration: 5000,
        offset: {
            x: 0,
            y: -4,
        },
        close: true,
        style: { cursor: "default" },
        className: `custom-toast-${LogType[type]}`,
    });
    currentToast.showToast();
}

/** A dropdown menu as a tippy activated on mouse over or on touch. */
export abstract class InteractiveTippy<Type> implements m.ClassComponent<Type> {
    /** Individual tippy object. */
    protected tippyInstance: TippyInstance | undefined;

    /** The preferred placement of the tippy. */
    protected abstract placement: Placement;

    /** Determines if the tippy has an arrow. */
    protected abstract arrow: boolean;

    oncreate({ dom }: m.CVnodeDOM<Type>): void {
        this.tippyInstance = tippy(dom, {
            interactive: true,
            allowHTML: true,
            hideOnClick: false,
            interactiveBorder: 30,
            interactiveDebounce: 70,
            content: dom.children[1], // the second nested node
            placement: this.placement,
            arrow: this.arrow,
            theme: "dropdown-list",
            appendTo: () => document.body,
            maxWidth: "none",
        });
    }

    onbeforeremove(): void {
        if (this.tippyInstance) {
            this.tippyInstance.unmount();
        }
    }

    onremove(): void {
        if (this.tippyInstance) {
            this.tippyInstance.destroy();
        }
    }

    /**
     * The view shall contain an array of 2 nodes nested inside one.
     * The first nested node is the visible element to activate the tippy.
     * When active, the second nested element is visible as a tippy.
     */
    abstract view({ attrs }: m.CVnode<Type>): m.Vnode;
}
