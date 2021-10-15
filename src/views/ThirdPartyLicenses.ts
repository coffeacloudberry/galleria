import m from "mithril";
const { extraIcons } = require("./Map");
const t = require("../translate");

/**
 * One third party library or file.
 * Not to be mistaken with the connected third parties.
 */
interface ThirdPartyElement {
    project: {
        name: string;
        link: string;
    };
    license: {
        name: string;
        link: string;
    };
}

const thirdPartyLicensesList: ThirdPartyElement[] = require("../third-party");

export default class ThirdPartyLicenses implements m.ClassComponent {
    thirdPartyLicensesNodes: m.Vnode[] = [];
    mapIconsNodes: m.Vnode[] = [];

    constructor() {
        for (const info of thirdPartyLicensesList) {
            this.thirdPartyLicensesNodes.push(
                m("tr", [
                    m(
                        "td",
                        info.project.link
                            ? m(
                                  "a",
                                  { href: info.project.link },
                                  info.project.name,
                              )
                            : t(info.project.name),
                    ),
                    m(
                        "td",
                        info.license.link
                            ? m(
                                  "a",
                                  { href: info.license.link },
                                  info.license.name,
                              )
                            : info.license.name,
                    ),
                ]),
            );
        }

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
                m(".row", [
                    m(
                        ".half.column",
                        m("table.data", [
                            m("tr", [
                                m("th", t("copyright.third-parties.project")),
                                m("th", t("copyright.third-parties.license")),
                            ]),
                            ...this.thirdPartyLicensesNodes,
                        ]),
                    ),
                    m(
                        ".half.column",
                        m("table.data.icons", [
                            m("tr", [
                                m("th", t("copyright.third-parties.icon")),
                                m("th", t("copyright.third-parties.from")),
                            ]),
                            ...this.mapIconsNodes,
                        ]),
                    ),
                ]),
            ),
        ];
    }
}
