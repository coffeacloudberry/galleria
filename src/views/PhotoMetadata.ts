import apertureOutline from "@/icons/aperture-outline.svg";
import CalendarOutline from "@/icons/calendar-outline.svg";
import cameraOutline from "@/icons/camera-outline.svg";
import cloudDownloadOutline from "@/icons/cloud-download-outline.svg";
import focalOutline from "@/icons/focal-outline.svg";
import frameOutline from "@/icons/frame-outline.svg";
import hardwareChipOutline from "@/icons/hardware-chip-outline.svg";
import InformationCircleOutline from "@/icons/information-circle-outline.svg";
import isoOutline from "@/icons/iso-outline.svg";
import latitudeOutline from "@/icons/latitude-outline.svg";
import lensOutline from "@/icons/lens-outline.svg";
import locationOutline from "@/icons/location-outline.svg";
import longitudeOutline from "@/icons/longitude-outline.svg";
import noFrameOutline from "@/icons/no-frame-outline.svg";
import timerOutline from "@/icons/timer-outline.svg";
import m from "mithril";

import { config } from "../config";
import { photo } from "../models/Photo";
import { t } from "../translate";
import { isMobile } from "../utils";
import Icon from "./Icon";
import { openModal } from "./Modal";

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
            m("h4", t("cam.setup")),
            m("ul.mt-3", [
                body &&
                    m("li", [
                        m(Icon, { src: cameraOutline }),
                        ` ${t("cam.body")} ${body}`,
                    ]),
                lens &&
                    m("li", [
                        m(Icon, { src: lensOutline }),
                        ` ${t("cam.lens")} `,
                        m("small", lens),
                    ]),
                focal &&
                    m("li", [
                        m(Icon, { src: focalOutline }),
                        ` ${t("cam.focal")} ${focal} mm`,
                    ]),
                fNumber &&
                    m("li", [
                        m(Icon, { src: apertureOutline }),
                        ` ${t("cam.f-number")} f/${fNumber}`,
                    ]),
                exposure &&
                    m("li", [
                        m(Icon, { src: timerOutline }),
                        ` ${t("cam.exposure")} ${exposure} s`,
                    ]),
                iso &&
                    m("li", [
                        m(Icon, { src: isoOutline }),
                        ` ${t("cam.iso")} ISO ${iso}`,
                    ]),
                mode &&
                    m("li", [
                        m(Icon, { src: hardwareChipOutline }),
                        ` ${t("cam.mode")} `,
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
            m("ul.mt-3", [
                m("li", [
                    m(Icon, { src: latitudeOutline }),
                    " ",
                    t("cam.lat"),
                    " ",
                    pos.lat.toFixed(4),
                ]),
                m("li", [
                    m(Icon, { src: longitudeOutline }),
                    " ",
                    t("cam.lon"),
                    " ",
                    pos.lon.toFixed(4),
                ]),
                m("li", [
                    m(Icon, { src: locationOutline }),
                    " ",
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

function getCloudLink(): string {
    return `https://download.explorewilder.com/photos/photo_${photo.id}_from_explorewilder.com.tif`;
}

const DownloadLinks: m.Component = {
    view(): m.Vnode | null {
        if (!photo.meta || photo.meta.downloadable === false) {
            return null;
        }
        return m(
            "span",
            m(
                "a",
                {
                    href: getCloudLink(),
                },
                [
                    m(Icon, { src: cloudDownloadOutline }),
                    m("span.mr-3"),
                    t("download"),
                ],
            ),
        );
    },
};

const OrderPrint: m.Component = {
    view(): m.Vnode | null {
        if (!photo.meta) {
            return null;
        }
        return m(
            "span.mr-9",
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
        );
    },
};

const PhotoMetadataModal: m.Component = {
    view() {
        const dateTaken = photo.dateTaken();
        if (!photo.meta || !dateTaken) {
            return null;
        }
        return [
            m(
                ".container",
                m(".row", [
                    m(
                        ".one.column.p-0",
                        m("p", [
                            m(Icon, { src: CalendarOutline }),
                            t("photo.taken"),
                            dateTaken.getHours(),
                            ":",
                            dateTaken.getMinutes().toString().padStart(2, "0"),
                            t("on"),
                            t("date", dateTaken.getMonth(), {
                                day: dateTaken.getDate(),
                                year: dateTaken.getFullYear(),
                            }),
                        ]),
                    ),
                ]),
            ),
            m(
                ".container",
                m(".row", [
                    m(".half.column.p-0", m(CameraSetup)),
                    m(".half.column.p-0", m(CameraPosition)),
                ]),
            ),
            m("p", [m(OrderPrint), m(DownloadLinks)]),
            m(CopyrightDetails),
        ];
    },
};

export default class PhotoMetadata implements m.ClassComponent<m.Attributes> {
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
                          openModal({
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
