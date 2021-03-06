import m from "mithril";

import { t } from "../translate";

// skipcq: JS-0359
const thirdParties: ThirdPartyConnectionStruct[] = require("../third-party-connections");

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
export const PrivacyPolicy: m.Component = {
    view(): m.Vnode[] {
        return [
            m("p", t("privacy.overview")),
            m("h3", t("privacy.third-parties.title")),
            m(
                "ul.blabla",
                thirdParties.map((partner) => {
                    return m("li", [
                        t(`privacy.third-parties.${partner.what}`),
                        " ",
                        m(
                            "a",
                            {
                                href: partner.link,
                            },
                            partner.who,
                        ),
                    ]);
                }),
            ),
            m("p", t("privacy.contact")),
        ];
    },
};
