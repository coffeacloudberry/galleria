import cameraOutline from "@/icons/camera-outline.svg";
import m from "mithril";
import tippy, { Placement, Instance as TippyInstance } from "tippy.js";

import { photo } from "../models/Photo";
import { t } from "../translate";
import { getWindowSize, isMobile } from "../utils";
import Icon from "./Icon";

const CameraSetup: m.Component = {
    view(): m.Vnode[] | null {
        if (!photo.meta) {
            return null;
        }
        const focal = photo.meta.focalLength35mm;
        const exposure = photo.meta.exposureTime;
        const fNumber = photo.meta.fNumber;
        const iso = photo.meta.iso;
        if (!(focal || exposure || fNumber || iso)) {
            return null;
        }
        return [
            m("h4.mt-3", t("cam.setup")),
            m("ul.blabla.mt-3", [
                focal && m("li", `${t("cam.focal")} ${focal} mm`),
                fNumber && m("li", `${t("cam.f-number")} f/${fNumber}`),
                exposure && m("li", `${t("cam.exposure")} ${exposure} s`),
                iso && m("li", `${t("cam.iso")} ISO ${iso}`),
            ]),
        ];
    },
};

class CameraPosition implements m.ClassComponent {
    /** Desktop URL to the OpenStreetMap map. */
    static buildOsmUrl(lat: number, lon: number): string {
        const baseUrl = "https://www.openstreetmap.org";
        const params = `mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}&layers=C`;
        return `${baseUrl}/?${params}`;
    }

    /** Mobile URL to the OsmAnd website or smartphone app if installed. */
    static buildOsmAndUrl(lat: number, lon: number): string {
        const baseUrl = "https://osmand.net/go";
        const params = `lat=${lat}&lon=${lon}&z=15`;
        return `${baseUrl}?${params}`;
    }

    view(): m.Vnode[] | null {
        if (!photo.meta) {
            return null;
        }
        const pos = photo.meta.position; // GPS / WGS 84 ellipsoid
        if (!pos) {
            return null;
        }
        let appUrl, appName;
        if (isMobile()) {
            appUrl = CameraPosition.buildOsmAndUrl(pos.lat, pos.lon);
            appName = "OsmAnd";
        } else {
            appUrl = CameraPosition.buildOsmUrl(pos.lat, pos.lon);
            appName = "OpenStreetMap";
        }
        return [
            m("h4", t("map.stats.source.pos")),
            m("ul.blabla.mt-3", [
                m("li", [t("cam.lat"), " ", pos.lat.toFixed(4)]),
                m("li", [t("cam.lon"), " ", pos.lon.toFixed(4)]),
                m("li", [
                    t("cam.goto"),
                    " ",
                    m(
                        "a.normal-a",
                        {
                            rel: "noopener noreferrer",
                            target: "_blank",
                            href: appUrl,
                        },
                        appName,
                    ),
                ]),
            ]),
        ];
    }
}

const PhotoMetadataTippyContent: m.Component = {
    view(): m.Vnode {
        return m("div", [m(CameraSetup), m(CameraPosition)]);
    },
};

/** Class member saved out of scope to retain `this`. */
let lastResizeListener: (() => void) | undefined;

/**
 * Contains both the icon and Tippy content,
 * even though the Tippy content is actually in the body.
 */
export default class PhotoMetadataIcon implements m.ClassComponent {
    private tippyInstance: TippyInstance | undefined;

    /** The placement is opposite to the icon position. */
    static optimalPlacement(): Placement {
        const { width, height } = getWindowSize();
        return width <= 1024 && width > height ? "right" : "bottom";
    }

    /** Put the Tippy content in the right place. */
    oncreate({ dom }: m.CVnodeDOM): void {
        this.tippyInstance = tippy(dom, {
            interactive: true,
            allowHTML: true,
            hideOnClick: false,
            content: dom.children[1], // PhotoMetadataTippyContent
            placement: PhotoMetadataIcon.optimalPlacement(),
            appendTo: () => document.body,
            arrow: false, // no arrow on non-clickable element
        });
        lastResizeListener = () => {
            if (this.tippyInstance) {
                this.tippyInstance.setProps({
                    placement: PhotoMetadataIcon.optimalPlacement(),
                });
            }
        };
        window.addEventListener("resize", lastResizeListener);
    }

    onbeforeremove(): void {
        if (this.tippyInstance) {
            this.tippyInstance.unmount();
        }
    }

    onremove(): void {
        if (typeof lastResizeListener === "function") {
            window.removeEventListener("resize", lastResizeListener);
        }
        if (this.tippyInstance) {
            this.tippyInstance.destroy();
        }
    }

    view(): m.Vnode {
        return m("span.nav-item.photo-metadata-wrapper", [
            m(Icon, { src: cameraOutline }), // actually displayed
            m(PhotoMetadataTippyContent), // not visible
        ]);
    }
}
