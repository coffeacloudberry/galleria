import type { WidgetInstance } from "friendly-challenge";
import m from "mithril";

import { config } from "../config";
import CustomLogging from "../CustomLogging";
import { injectCode } from "../utils";

const t = require("../translate");
const error = new CustomLogging("error");

export interface CaptchaAttrs {
    doneCallback: (solution: string) => void;
}

export default class Captcha implements m.ClassComponent<CaptchaAttrs> {
    widget: WidgetInstance | undefined;

    /**
     * Called when an internal error occurs. The error is passed as an object,
     * the fields and values of this object are still to be documented and are
     * changing frequently. Consider this experimental.
     * @param err Exception.
     */
    errorCallback(err: { error: Error }): void {
        error.log("Failed to solve the Captcha", err.error);
    }

    oncreate({ dom, attrs }: m.CVnodeDOM<CaptchaAttrs>): void {
        injectCode(config.captcha.js)
            .then(() => {
                (async () => {
                    const friendlyChallenge = await import(
                        "friendly-challenge"
                    );
                    this.widget = new friendlyChallenge.WidgetInstance(
                        dom as HTMLElement,
                        {
                            startMode: "auto",
                            sitekey: config.captcha.siteKey,
                            language: t.getLang(),
                            doneCallback: attrs.doneCallback,
                            errorCallback: (err) => {
                                this.errorCallback(err);
                            },
                        },
                    );
                })();
            })
            .catch((err) => {
                error.log("Failed to load CAPTCHA script", err);
            });
    }

    onremove(): void {
        if (this.widget !== undefined) {
            this.widget.destroy();
        }
    }

    view(): m.Vnode {
        return m("p.captcha");
    }
}
