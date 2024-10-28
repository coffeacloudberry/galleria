import thumbsUpOutline from "@/icons/thumbs-up-outline.svg";
import m from "mithril";

import { LogType } from "../CustomLogging";
import { feedback } from "../models/Feedback";
import { t } from "../translate";
import { toast } from "../utils";
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
    textUpdate(e: InputEvent) {
        if (e.data && "+=$|%&#\\[]{}<>".includes(e.data)) {
            return;
        }
        if (e.target) {
            const target = e.target as HTMLTextAreaElement;
            feedback.text_content = target.value;
        }
    }

    sendFeedback(e: SubmitEvent) {
        e.preventDefault();
        feedback.is_sending = true;
        m.request({
            method: "POST",
            url: "https://api.explorewilder.com/api/feedback",
            body: {
                message: feedback.text_content,
                from: location.href,
            },
        })
            .then(() => {
                feedback.text_content = "";
                feedback.is_open = false;
                feedback.is_sending = false;
                m.redraw();
                toast(t("feedback.thank-you"));
            })
            .catch(() => {
                feedback.is_sending = false;
                m.redraw();
                toast(t("feedback.failed"), LogType.error);
            });
    }

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
                        this.sendFeedback(e);
                    },
                },
                [
                    m("textarea[required]", {
                        placeholder: t("feedback.text"),
                        oninput: (e: InputEvent) => {
                            this.textUpdate(e);
                        },
                        value: feedback.text_content,
                    }),
                    m("p.text-center.mb-0.mt-3", m(SubmitButton)),
                ],
            ),
        ]);
    }
}
