import apertureOutline from "@/icons/aperture-outline.svg";
import cloudDownloadOutline from "@/icons/cloud-download-outline.svg";
import frameOutline from "@/icons/frame-outline.svg";
import InformationCircleOutline from "@/icons/information-circle-outline.svg";
import locationOutline from "@/icons/location-outline.svg";
import noFrameOutline from "@/icons/no-frame-outline.svg";
import ShieldCheckmarkOutline from "@/icons/shield-checkmark-outline.svg";
import m from "mithril";

import { config } from "../config";
import { photo } from "../models/Photo";
import { t } from "../translate";
import { isMobile } from "../utils";
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
            m("h4", [
                m("span.mr-3", m(Icon, { src: apertureOutline })),
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
                m("span.mr-3", m(Icon, { src: locationOutline })),
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

const CopyrightDetails: m.Component = {
    view() {
        return m("p", [
            `${t("copyright")} © ${config.contentLicense.holder}`,
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
        ]);
    },
};

function getCloudLink(getSignature: boolean): string {
    const link = `https://download.explorewilder.com/photos/photo_${photo.id}_from_explorewilder.com.tif`;
    return getSignature ? `${link}.SHA256.asc` : link;
}

const DownloadLinks: m.Component = {
    view(): m.Vnode | null {
        if (!photo.meta || photo.meta.downloadable === false) {
            return null;
        }
        return m("p", [
            m(
                "a",
                {
                    href: getCloudLink(false),
                },
                [
                    m(Icon, { src: cloudDownloadOutline }),
                    m("span.mr-3"),
                    t("download"),
                ],
            ),
            m(
                "a.ml-3",
                {
                    href: getCloudLink(true),
                },
                [
                    m(Icon, { src: ShieldCheckmarkOutline }),
                    m("span.mr-3"),
                    t("download.signature"),
                ],
            ),
        ]);
    },
};

const OrderPrint: m.Component = {
    view(): m.Vnode | null {
        if (!photo.meta) {
            return null;
        }
        return m(
            "p",
            m(
                "strong",
                photo.meta.printable !== false
                    ? m(
                          "a",
                          {
                              href: "https://ko-fi.com/c/e4b824b946",
                          },
                          [
                              m("span.mr-3", m(Icon, { src: frameOutline })),
                              t("can-order-print"),
                          ],
                      )
                    : [
                          m("span.mr-3", m(Icon, { src: noFrameOutline })),
                          t("cannot-order-print"),
                      ],
            ),
        );
    },
};

const PhotoMetadataModal: m.Component = {
    view() {
        if (!photo.meta || typeof photo.id !== "number") {
            return null;
        }
        return [
            m(
                ".container",
                m(".row", [
                    m(".half.column.p-0", m(CameraSetup)),
                    m(".half.column.p-0", m(CameraPosition)),
                ]),
            ),
            m(OrderPrint),
            m(CopyrightDetails),
            m(DownloadLinks),
        ];
    },
};

export default class PhotoMetadata implements m.ClassComponent<m.Attributes> {
    // skipcq: JS-0105
    view(vnode: m.CVnode<m.Attributes>) {
        const photoTitle = photo.meta?.title[t.getLang()];
        return photo.containsExif()
            ? m(
                  "a",
                  {
                      href: "#",
                      class: vnode.attrs.class,
                      "data-tippy-content": t("photo.open-photo.tooltip"),
                      onclick: (e: Event): void => {
                          e.preventDefault();
                          modal({
                              title: t("about.photo"),
                              content: {
                                  view: () => {
                                      return m(PhotoMetadataModal);
                                  },
                              },
                          });
                      },
                  },
                  [
                      m("span.long-item", [
                          m("span.mr-3", photoTitle),
                          m(Icon, { src: InformationCircleOutline }),
                      ]),
                      m("span.short-item", photoTitle),
                  ],
              )
            : m("span", { class: vnode.attrs.class }, photoTitle);
    }
}
