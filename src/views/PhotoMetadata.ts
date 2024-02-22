import apertureOutline from "@/icons/aperture-outline.svg";
import cloudDownloadOutline from "@/icons/cloud-download-outline.svg";
import locationOutline from "@/icons/location-outline.svg";
import m from "mithril";
import { Placement } from "tippy.js";

import { config } from "../config";
import { photo } from "../models/Photo";
import { t } from "../translate";
import { InteractiveTippy, isMobile } from "../utils";
import Icon from "./Icon";
import { modal } from "./Modal";

const CameraSetup: m.Component = {
    view(): m.Vnode[] | null {
        if (!photo.meta) {
            return null;
        }
        const body = photo.meta.body;
        const lens = photo.meta.lens;
        const focal = photo.meta.focalLength35mm;
        const exposure = photo.meta.exposureTime;
        const fNumber = photo.meta.fNumber;
        const iso = photo.meta.iso;
        const mode = photo.meta.computationalMode;
        if (!(focal || exposure || fNumber || iso)) {
            return null;
        }
        return [
            m("h4.mt-3", [
                m("span.mr-3.vab", m(Icon, { src: apertureOutline })),
                t("cam.setup"),
            ]),
            m("ul.blabla.mt-3.ml-9", [
                body && m("li", `${t("cam.body")} ${body}`),
                lens && m("li", [`${t("cam.lens")} `, m("small", lens)]),
                focal && m("li", `${t("cam.focal")} ${focal} mm`),
                fNumber && m("li", `${t("cam.f-number")} f/${fNumber}`),
                exposure && m("li", `${t("cam.exposure")} ${exposure} s`),
                iso && m("li", `${t("cam.iso")} ISO ${iso}`),
                mode &&
                    m("li", [
                        `${t("cam.mode")} `,
                        m("small", t("cam.mode.value", mode)),
                    ]),
            ]),
        ];
    },
};

class CameraPosition implements m.ClassComponent {
    /** Desktop URL to the OpenStreetMap map. */
    static buildOsmUrl(lat: number, lon: number): string {
        const baseUrl = "https://www.openstreetmap.org";
        const params = `mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}&layers=P`;
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
                    m("a.normal-a", { href: appUrl }, appName),
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
                    src: `/content/photos/${photo.id}/f.webp`,
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
                `https://download.explorewilder.com/photos/photo_${photo.id}_from_explorewilder.com.tif`
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
        return m("div.tall-tippy", [
            m(CameraSetup),
            m(CameraPosition),
            photo.meta &&
                photo.meta.downloadable !== false &&
                m(Download, { okCopyright: false }),
        ]);
    },
};

export default class PhotoMetadataComponent extends InteractiveTippy<void> {
    placement = PhotoMetadataComponent.getPlacement();
    arrow = false;

    static getPlacement(): Placement {
        if (window.innerHeight > window.innerWidth) {
            return "top";
        }
        return "bottom";
    }

    onupdate(): void {
        if (this.tippyInstance) {
            if (photo.containsExif()) {
                this.tippyInstance.enable();
            } else {
                this.tippyInstance.disable();
            }
        }
    }

    // skipcq: JS-0105
    view(): m.Vnode {
        let photoTitle = null;
        try {
            // @ts-expect-error
            photoTitle = photo.meta.title[t.getLang()];
        } catch {
            // continue regardless of error
        }
        return m("span[tabindex=0].photo-metadata-wrapper", [
            m(
                "em.photo-title",
                { class: photo.containsExif() ? "helper" : "" },
                m("strong", photoTitle),
            ), // actually displayed
            m(PhotoMetadataTippyContent), // not visible
        ]);
    }
}
