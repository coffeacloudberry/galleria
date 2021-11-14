import thumbsUpOutline from "@/icons/thumbs-up-outline.svg";
import m from "mithril";

import CustomLogging, { LogType } from "../CustomLogging";
import { t } from "../translate";
import { toast } from "../utils";
import Icon from "./Icon";

const err = new CustomLogging("error");

interface ApplauseButtonAttrs {
    mediaType: string;
    mediaIsLoading: boolean;
    getId: () => number | string | null;
    applausePromise: () => Promise<void>;
}

/** The applause button on center bottom. */
export default class ApplauseButton
    implements m.ClassComponent<ApplauseButtonAttrs>
{
    pressed = false;
    currentId: number | string | null = null;
    applausePromise: () => Promise<void>;

    constructor({ attrs }: m.CVnode<ApplauseButtonAttrs>) {
        this.applausePromise = attrs.applausePromise;
    }

    clickButton(e: Event): void {
        e.preventDefault();
        this.pressed = true;
        this.applausePromise()
            .then(() => {
                toast("" + t("applause.feedback.pass"));
            })
            .catch((error: Error & { code: number }) => {
                toast(
                    "" +
                        t(
                            "applause.feedback.fail" +
                                (error.code == 429 ? "." + error.code : ""),
                        ),
                    LogType.error,
                );
                err.log(`Failed to like ${this.currentId}`, error);
            });
    }

    view({ attrs }: m.CVnode<ApplauseButtonAttrs>): m.Vnode {
        const newId = attrs.getId();
        if (newId !== null && newId !== this.currentId) {
            this.currentId = newId;
            // put the button back on new photo
            this.pressed = false;
        }
        return m(
            `a.nav-item${attrs.mediaIsLoading || this.pressed ? ".hide" : ""}`,
            {
                href: "#",
                onclick: (e: Event) => {
                    this.clickButton(e);
                },
                "data-tippy-content": t(`applause.${attrs.mediaType}.tooltip`),
            },
            m(Icon, { src: thumbsUpOutline }),
        );
    }
}
