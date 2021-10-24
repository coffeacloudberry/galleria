import m from "mithril";
import thumbsUpOutline from "@/icons/thumbs-up-outline.svg";
import Icon from "./Icon";
import { config } from "../config";
import CustomLogging from "../CustomLogging";

const info = new CustomLogging();
const t = require("../translate");

type FnPromiseErrorCode = () => Promise<(Error & { code: number }) | undefined>;

interface ApplauseButtonAttrs {
    mediaType: string;
    mediaIsLoading: boolean;
    getId: () => number | string | null;
    applausePromise: FnPromiseErrorCode;
}

/** The applause button on center bottom. */
export default class ApplauseButton
    implements m.ClassComponent<ApplauseButtonAttrs>
{
    pressed = false;
    currentId: number | string | null = null;
    applausePromise: FnPromiseErrorCode;
    message = "";
    displayMessage = false;

    constructor({ attrs }: m.CVnode<ApplauseButtonAttrs>) {
        this.applausePromise = attrs.applausePromise;
    }

    displayMessageTempo(): void {
        this.displayMessage = true;
        setTimeout(() => {
            this.displayMessage = false;
            m.redraw();
        }, config.ephemeralDisplayTimeout * 1000);
    }

    clickButton(e: Event): void {
        info.log(`Thanks for liking ${this.currentId}`);
        this.pressed = true;
        this.applausePromise()
            .then(() => {
                this.message = t("applause.feedback.pass");
                this.displayMessageTempo();
            })
            .catch((error: Error & { code: number }) => {
                const feedbackCodes = [429];
                this.message = t(
                    "applause.feedback.fail" +
                        (feedbackCodes.indexOf(error.code) > -1
                            ? "." + error.code
                            : ""),
                );
                this.displayMessageTempo();
            });
        e.preventDefault();
    }

    view({ attrs }: m.CVnode<ApplauseButtonAttrs>): m.Vnode[] {
        const newId = attrs.getId();
        if (newId !== null && newId !== this.currentId) {
            this.currentId = newId;
            // put the button back on new photo
            this.pressed = false;
        }
        return [
            m(
                `a.nav-item${
                    attrs.mediaIsLoading || this.pressed ? ".hide" : ""
                }`,
                {
                    href: "#",
                    onclick: (e: Event) => {
                        this.clickButton(e);
                    },
                    "data-tippy-content": t(
                        `applause.${attrs.mediaType}.tooltip`,
                    ),
                },
                m(Icon, { src: thumbsUpOutline }),
            ),
            m(
                ".applause-feedback",
                {
                    class:
                        this.displayMessage &&
                        !attrs.mediaIsLoading &&
                        this.pressed
                            ? ""
                            : "hide",
                },
                m(".tippy-box", this.message),
            ),
        ];
    }
}
