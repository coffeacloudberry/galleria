import thumbsUpOutline from "@/icons/thumbs-up-outline.svg";
import m from "mithril";

import { feedback } from "../models/Feedback";
import { t } from "../translate";
import Icon from "./Icon";

const SubmitButton: m.Component = {
    view(): m.Vnode {
        if (feedback.is_sending) {
            return m(
                "button[type=submit]",
                { disabled: true },
                t("feedback.sending"),
            );
        }
        return m("button[type=submit]", t("feedback.send"));
    },
};

export class Feedback implements m.ClassComponent {
    view(): m.Vnode {
        if (!feedback.is_open) {
            return m(
                "#feedback",
                m(
                    "button.open-feedback.light-icon-button",
                    {
                        onclick: () => {
                            feedback.is_open = true;
                        },
                    },
                    m(Icon, { src: thumbsUpOutline }),
                ),
            );
        }
        return m("#feedback.open-feedback-block", [
            m(
                "button.close-feedback",
                {
                    onclick: () => {
                        feedback.is_open = false;
                    },
                },
                "×",
            ),
            m(
                "form",
                {
                    onsubmit: (e: SubmitEvent) => {
                        feedback.sendFeedback(e);
                    },
                },
                [
                    m("textarea[required]", {
                        placeholder: t("feedback.text"),
                        oninput: (e: InputEvent) => {
                            feedback.textUpdate(e);
                        },
                        value: feedback.text_content,
                    }),
                    m("p.text-center.mb-0.mt-3", m(SubmitButton)),
                ],
            ),
        ]);
    }
}
