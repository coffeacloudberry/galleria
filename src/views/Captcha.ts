import m from "mithril";
import { injectCode } from "../utils";
import { config } from "../config";
import CustomLogging from "../CustomLogging";
import type { WidgetInstance } from "friendly-challenge";

const t = require("../translate");
const info = new CustomLogging();
const error = new CustomLogging("error");

export default class Captcha implements m.ClassComponent {
    widget: WidgetInstance | undefined;

    doneCallback(solution: string): void {
        info.log(
            `Captcha successfully solved - solution '${solution.slice(
                0,
                5,
            )}...'`,
        );
    }

    errorCallback(err: { error: Error }): void {
        error.log("Failed to solve the Captcha", err.error);
    }

    oncreate({ dom }: m.CVnodeDOM): void {
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
                            // @ts-ignore
                            solutionFieldName: "frc",
                            sitekey: config.captcha.siteKey,
                            language: t.getLang(),
                            doneCallback: (solution) => {
                                this.doneCallback(solution);
                            },
                            errorCallback: (error) => {
                                this.errorCallback(error);
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
        return m(".captcha");
    }
}
