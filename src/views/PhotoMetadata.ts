import cameraOutline from "@/icons/camera-outline.svg";
import m from "mithril";
import tippy, { Placement, Instance as TippyInstance } from "tippy.js";

import { photo } from "../models/Photo";
import { t } from "../translate";
import { getWindowSize } from "../utils";
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
                exposure && m("li", `${t("cam.exposure")} ${exposure} s`),
                fNumber && m("li", `${t("cam.f-number")} ${fNumber}`),
                iso && m("li", `${t("cam.iso")} ${iso}`),
            ]),
        ];
    },
};

class CameraPosition implements m.ClassComponent {
    static buildOsmUrl(lat: number, lon: number): string {
        const baseUrl = "https://www.openstreetmap.org";
        const params = `mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}&layers=C`;
        return `${baseUrl}/?${params}`;
    }

    view(): m.Vnode[] | null {
        if (!photo.meta) {
            return null;
        }
        const pos = photo.meta.position;
        if (!pos) {
            return null;
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
                            href: CameraPosition.buildOsmUrl(pos.lat, pos.lon),
                        },
                        "OpenStreetMap",
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

    view(): m.Vnode {
        return m("span.nav-item.photo-metadata-wrapper", [
            m(Icon, { src: cameraOutline }), // actually displayed
            m(PhotoMetadataTippyContent), // not visible
        ]);
    }
}
