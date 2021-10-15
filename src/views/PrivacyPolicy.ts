import m from "mithril";
const t = require("../translate");

interface ThirdPartyConnectionStruct {
    // refer to the locale privacy.third-parties.*
    what: string;
    who: string;
    link: string;
}

/**
 * List third parties connected to the app (for GDPR compliance)
 * without any logo (maybe copyrighted).
 */
export default function PrivacyPolicy(): m.Component {
    const thirdParties: ThirdPartyConnectionStruct[] = require("../third-party-connections");

    return {
        view(): m.Vnode[] {
            const thirdPartiesNodes: m.Vnode[] = [];
            const totalParties = thirdParties.length;
            let i = 0;
            // regenerate the list in the view to instantly refresh translations
            // upon request
            for (const partner of thirdParties) {
                thirdPartiesNodes.push(
                    m("li", [
                        t(`privacy.third-parties.${partner.what}`),
                        " ",
                        m(
                            "a",
                            {
                                href: partner.link,
                            },
                            partner.who,
                        ),
                        ++i === totalParties ? "." : ",",
                    ]),
                );
            }
            return [
                m("p", t("privacy.overview")),
                m("h3", t("privacy.third-parties.title")),
                m("ul.blabla", thirdPartiesNodes),
                m("p", t("privacy.contact")),
            ];
        },
    };
}
