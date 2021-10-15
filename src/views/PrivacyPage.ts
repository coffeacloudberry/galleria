import m from "mithril";
import PrivacyPolicy from "./PrivacyPolicy";
import { transformExternalLinks } from "../utils";
import { Header, HeaderAttrs } from "./Header";

const t = require("../translate");

/** The Privacy Policy shall have its own page for sharing permalink. */
export default function PrivacyPage(): m.Component {
    return {
        oninit(): void {
            t.init();
        },
        oncreate(): void {
            document.title = t("privacy.title");
            t.createTippies();
            transformExternalLinks();
        },
        onupdate(): void {
            transformExternalLinks();
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
