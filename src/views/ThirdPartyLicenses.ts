import m from "mithril";
const { extraIcons } = require("./Map");
const t = require("../translate");

export default class ThirdPartyLicenses implements m.ClassComponent {
    mapIconsNodes: m.Vnode[] = [];

    constructor() {
        for (const key in extraIcons) {
            if (!extraIcons.hasOwnProperty(key)) {
                continue;
            }
            const info = extraIcons[key];
            this.mapIconsNodes.push(
                m("tr", [
                    m(
                        "td",
                        m("img", {
                            src: `/assets/map/${info.source}.svg`,
                            style: "width: 2rem;",
                        }),
                    ),
                    m("td", [
                        t("copyright.third-parties.icon.creator"),
                        " ",
                        m(
                            "a",
                            { href: info.attributions[1] },
                            info.attributions[0],
                        ),
                        " ",
                        t("copyright.third-parties.icon.distributor"),
                        " ",
                        m(
                            "a",
                            { href: "https://www.flaticon.com/" },
                            "Flaticon",
                        ),
                    ]),
                ]),
            );
        }
    }

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
                            ...this.mapIconsNodes,
                        ]),
                    ),
                ),
            ),
        ];
    }
}
