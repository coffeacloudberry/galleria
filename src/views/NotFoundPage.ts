import m from "mithril";

import { t } from "../translate";
import { hideAllForce } from "../utils";

/** Default "404" landing page when none of the listed routes match the path. */
export default function NotFoundPage(): m.Component {
    return {
        oninit(): void {
            t.init();
        },
        oncreate(): void {
            document.title = t("not-found.message");

            // hide lonely tooltips from quickly removed DOM
            hideAllForce();
        },
        view(): m.Vnode {
            return m(
                "section#not-found",
                m(".content", [
                    m("p", t("not-found.message")),
                    m(
                        "p",
                        m(
                            m.route.Link,
                            { href: t.prependLang("/photo") },
                            t("not-found.action"),
                        ),
                    ),
                ]),
            );
        },
    };
}
