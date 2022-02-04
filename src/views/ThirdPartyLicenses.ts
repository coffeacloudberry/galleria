import m from "mithril";

import { ExtraIconsInfo, extraIcons } from "../models/Map";
import { t } from "../translate";

const attribUrls: Record<string, string> = {
    "Good Ware": "https://www.flaticon.com/authors/good-ware",
    Flaticon: "https://www.flaticon.com/",
    Freepik: "https://www.freepik.com",
    "Pixel perfect": "https://www.flaticon.com/authors/pixel-perfect",
    surang: "https://www.flaticon.com/authors/surang",
    macrovector: "https://www.freepik.com/macrovector",
};

const IconDetailComponent: m.Component<ExtraIconsInfo> = {
    view({ attrs }: m.Vnode<ExtraIconsInfo>): m.Vnode {
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
                m(
                    "a",
                    { href: attribUrls[attrs.attributions[0]] },
                    attrs.attributions[0],
                ),
                " ",
                t("copyright.third-parties.icon.distributor"),
                " ",
                m(
                    "a",
                    { href: attribUrls[attrs.attributions[1]] },
                    attrs.attributions[1],
                ),
            ]),
        ]);
    },
};

export const ThirdPartyLicenses: m.Component = {
    view(): m.Vnode[] {
        return [
            m("p.text-center", t("copyright.third-parties.details")),
            m("table.data.icons", [
                m("tr", [
                    m("th", t("copyright.third-parties.icon")),
                    m("th", t("copyright.third-parties.from")),
                ]),
                Object.values(extraIcons).map((icon) => {
                    return m(IconDetailComponent, icon);
                }),
            ]),
            // link to Ionicons because not linked otherwise
            m("p.text-center", [
                t("copyright.third-parties.ionicons"),
                m(
                    "a",
                    {
                        href: "https://ionic.io/ionicons",
                    },
                    "Ionicons",
                ),
            ]),
        ];
    },
};
