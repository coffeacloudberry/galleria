import m from "mithril";

import { t } from "../translate";
import { extraIcons, extraIconsInfo } from "./Map";

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
        const iconNodes: m.Vnode<extraIconsInfo>[] = [];
        for (const icon in extraIcons) {
            iconNodes.push(m(IconDetailComponent, extraIcons[icon]));
        }
        return [
            m("p.text-center", t("copyright.third-parties.details")),
            m("table.data.icons", [
                m("tr", [
                    m("th", t("copyright.third-parties.icon")),
                    m("th", t("copyright.third-parties.from")),
                ]),
                ...iconNodes,
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
