import m from "mithril";

import { t } from "../translate";
import { hideAllForce } from "../utils";

/** Default "404" landing page when none of the listed routes match the path. */
export default function NotFoundPage(): m.Component {
    t.init();
    return {
        oncreate(): void {
            document.title = t("not-found.message");

            // hide lonely tooltips from quickly removed DOM
            hideAllForce();
        },
        view(): m.Vnode {
            const url = `/?reload${m.route.prefix}${t.prependLang("/photo")}`;
            return m(
                "section#not-found",
                m(".content", [
                    m("p", t("not-found.message")),
                    m("p", m("a", { href: url }, t("not-found.action"))),
                ]),
            );
        },
    };
}
