import m from "mithril";

import { t } from "../translate";
import { Header, HeaderAttrs } from "./Header";
import { PrivacyPolicy } from "./PrivacyPolicy";

/** The Privacy Policy shall have its own page for sharing permalink. */
export default function PrivacyPage(): m.Component {
    t.init();
    return {
        oncreate(): void {
            document.title = t("privacy.title");
            t.createTippies();
        },
        view(): m.Vnode<HeaderAttrs>[] {
            return [
                m(Header, {
                    aboutButton: false,
                    refPage: "about",
                }),
                m(
                    "section#about",
                    m(
                        ".container",
                        m(
                            ".row",
                            m(".one.column", [
                                m("h1", t("privacy.title")),
                                m(PrivacyPolicy),
                            ]),
                        ),
                    ),
                ),
            ];
        },
    };
}
