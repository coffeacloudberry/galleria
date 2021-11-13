import m from "mithril";

import { extraIcons, extraIconsInfo } from "./Map";

const t = require("../translate");

const IconDetailComponent: m.Component<extraIconsInfo> = {
    view({ attrs }: m.Vnode<extraIconsInfo>): m.Vnode {
        return m("tr", [
            m(
                "td",
                m("img", {
                    src: `/assets/map/${attrs.source}.svg`,
                    style: "width: 2rem;",
                }),
            ),
            m("td", [
                t("copyright.third-parties.icon.creator"),
                " ",
                m("a", { href: attrs.attributions[1] }, attrs.attributions[0]),
                " ",
                t("copyright.third-parties.icon.distributor"),
                " ",
                m("a", { href: "https://www.flaticon.com/" }, "Flaticon"),
            ]),
        ]);
    },
};

export const ThirdPartyLicenses: m.Component = {
    view(): m.Vnode[] {
        return [
            m("p.text-center", t("copyright.third-parties.details")),
            m(
                ".container",
                m(
                    ".row",
                    m(
                        ".one.column",
                        m("table.data.icons", [
                            m("tr", [
                                m("th", t("copyright.third-parties.icon")),
                                m("th", t("copyright.third-parties.from")),
                            ]),
                            // @ts-ignore
                            ...extraIcons.map((info: extraIconsInfo) => {
                                return m(IconDetailComponent, info);
                            }),
                        ]),
                    ),
                ),
            ),
        ];
    },
};
