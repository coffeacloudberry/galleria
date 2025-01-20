import m from "mithril";

import { t } from "../translate";
import { LogType, toast } from "../utils";

class Feedback {
    text_content = "";
    is_open = false;
    is_sending = false;

    textUpdate(e: InputEvent) {
        if (e.data && "+=$|%&#\\[]{}<>".includes(e.data)) {
            return;
        }
        if (e.target) {
            const target = e.target as HTMLTextAreaElement;
            this.text_content = target.value;
        }
    }

    sendFeedback(e: SubmitEvent) {
        e.preventDefault();
        this.is_sending = true;
        m.request({
            method: "POST",
            url: "https://api.explorewilder.com/api/feedback",
            body: {
                message: this.text_content,
                from: location.href,
            },
        })
            .then(() => {
                this.text_content = "";
                this.is_open = false;
                this.is_sending = false;
                m.redraw();
                toast(t("feedback.thank-you"));
            })
            .catch(() => {
                this.is_sending = false;
                m.redraw();
                toast(t("feedback.failed"), LogType.error);
            });
    }
}

/** This is a shared instance. */
export const feedback = new Feedback();
