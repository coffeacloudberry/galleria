import m from "mithril";
import Toastify from "toastify-js";

import { config } from "./config";
import { LogType } from "./CustomLogging";

/** Deselect text. */
export function clearSelection(): void {
    const selection = window.getSelection();
    if (selection !== null) {
        selection.removeAllRanges();
    }
}

/**
 * Return true if the navigator is mobile.
 * NOTE: Due to user agent spoofing, the result SHALL NOT be trusted.
 */
export function isMobile(): boolean {
    return (
        /Android/i.test(navigator.userAgent) ||
        /webOS/i.test(navigator.userAgent) ||
        /iPhone/i.test(navigator.userAgent) ||
        /iPad/i.test(navigator.userAgent) ||
        /iPod/i.test(navigator.userAgent) ||
        /BlackBerry/i.test(navigator.userAgent)
    );
}

/** Get the photo ID from the path or return null. */
export function getPhotoId(): number | null {
    try {
        const splitPath = m.parsePathname(m.route.get()).path.split("/");
        const id = parseInt(splitPath[splitPath.length - 1]);
        return isNaN(id) || id > config.firstPhotoId ? null : id;
    } catch {
        return null;
    }
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

/** Loads a file and returns a Promise for when it is loaded. */
export function injectCode(path: {
    src: string;
    sri: string;
    isModule?: boolean;
}): Promise<unknown> {
    return new Promise((resolve, reject) => {
        if (!path.sri.startsWith("sha512-")) {
            throw Error(`SRI SHALL start with 'sha512-' (got '${path.sri}')`);
        }
        const ext = String(path.src.split(".").pop());
        switch (ext) {
            case "js":
                const script = document.createElement("script");
                script.type = path.isModule ? "module" : "text/javascript";
                script.onload = resolve;
                script.onerror = reject;
                script.crossOrigin = "anonymous";
                script.integrity = path.sri;
                script.src = path.src;
                document.head.append(script);
                break;
            case "css":
                const style = document.createElement("link");
                style.rel = "stylesheet";
                style.type = "text/css";
                style.onload = resolve;
                style.onerror = reject;
                style.crossOrigin = "anonymous";
                style.integrity = path.sri;
                style.href = path.src;
                document.head.append(style);
                break;
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
    allExternalLinks.forEach(function (node) {
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

/**
 * Display an ephemeral toast.
 * @param message A text string.
 * @param type Can be info or error.
 */
export function toast(message: string, type: LogType = LogType.info): void {
    /*
    Documentation:
    https://github.com/apvarun/toastify-js/blob/master/README.md
     */
    Toastify({
        text: message,
        duration: config.ephemeralDisplayTimeout * 1000,
        close: true,
        className: `custom-toast-${LogType[type]}`,
    }).showToast();
}
