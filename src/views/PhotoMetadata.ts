import apertureOutline from "@/icons/aperture-outline.svg";
import cloudDownloadOutline from "@/icons/cloud-download-outline.svg";
import informationCircleOutline from "@/icons/information-circle-outline.svg";
import locationOutline from "@/icons/location-outline.svg";
import m from "mithril";
import tippy, { Placement, Instance as TippyInstance } from "tippy.js";

import { config } from "../config";
import { photo } from "../models/Photo";
import { t } from "../translate";
import { getWindowSize, isMobile } from "../utils";
import Icon from "./Icon";
import { modal } from "./Modal";

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
            m("h4.mt-3", [
                m("span.mr-3.vab", m(Icon, { src: apertureOutline })),
                t("cam.setup"),
            ]),
            m("ul.blabla.mt-3.ml-9", [
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

    // skipcq: JS-0105
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
            m("h4", [
                m("span.mr-3.vab", m(Icon, { src: locationOutline })),
                t("map.stats.source.pos"),
            ]),
            m("ul.blabla.mt-3.ml-9", [
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

interface DownloadModalAttrs {
    okCopyright: boolean;
}

const DownloadModal: m.Component<DownloadModalAttrs> = {
    view({ attrs }: m.Vnode<DownloadModalAttrs>): m.Vnode[] {
        if (!photo.id) {
            return [];
        }
        const holder = config.contentLicense.holder;
        return [
            m(
                "p.text-center.mb-0[style=min-width:calc(300px + 0.1rem)]",
                m("img.round-corners", {
                    src: `/content/photos/${photo.id}/t.webp`,
                    alt: "",
                }),
            ),
            m("p.text-center", [
                `${t("copyright")} © ${holder}`,
                m("br"),
                m("span.cap", `${t("from")} `),
                m(
                    m.route.Link,
                    {
                        href: m.buildPathname("/:lang/photo/:title", {
                            lang: t.getLang(),
                            title: photo.id,
                        }),
                    },
                    "explorewilder.com",
                ),
                m("br"),
                m("span.cap", `${t("copyright.under")} `),
                m(
                    "a",
                    {
                        href: `${config.contentLicense.url}deed.${t.getLang()}`,
                    },
                    config.contentLicense.shortName,
                ),
            ]),
            m("p.text-center", [
                m("input[type=checkbox][id=ok-copyright]", {
                    onclick: (e: { currentTarget: HTMLInputElement }): void => {
                        attrs.okCopyright = e.currentTarget.checked;
                    },
                }),
                m("label.checkbox[for=ok-copyright]", t("copyright.agreed")),
            ]),
        ];
    },
};

const Download: m.Component<DownloadModalAttrs> = {
    view({ attrs }: m.Vnode<DownloadModalAttrs>): m.Vnode {
        const cloudLinkFn = () => {
            return (
                attrs.okCopyright &&
                typeof photo.id === "number" &&
                `https://sunbeam.s3.fr-par.scw.cloud/photos/photo_${photo.id}_from_explorewilder.com.tif`
            );
        };
        return m(
            "h4.mt-3.mb-3",
            m(
                "a",
                {
                    href: "#",
                    onclick: (e: Event): void => {
                        e.preventDefault();
                        modal({
                            title: t("download.title"),
                            content: {
                                view: () => {
                                    return m(DownloadModal, attrs);
                                },
                            },
                            cancelable: true,
                            cloudLinkFn,
                        });
                    },
                },
                [
                    m("span.mr-3.vab", m(Icon, { src: cloudDownloadOutline })),
                    t("download"),
                ],
            ),
        );
    },
};

const PhotoMetadataTippyContent: m.Component = {
    view(): m.Vnode {
        return m("div", [
            m(CameraSetup),
            m(CameraPosition),
            photo.meta &&
                photo.meta.downloadable !== false &&
                m(Download, { okCopyright: false }),
        ]);
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
            interactiveBorder: 30,
            interactiveDebounce: 70,
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

    // skipcq: JS-0105
    view(): m.Vnode {
        return m(
            "span.nav-item.photo-metadata-wrapper",
            {
                tabindex: 0,
            },
            [
                m(Icon, { src: informationCircleOutline }), // actually displayed
                m(PhotoMetadataTippyContent), // not visible
            ],
        );
    }
}
