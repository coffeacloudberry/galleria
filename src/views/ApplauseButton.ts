import thumbsUpOutline from "@/icons/thumbs-up-outline.svg";
import m from "mithril";

import CustomLogging, { LogType } from "../CustomLogging";
import { t } from "../translate";
import { toast } from "../utils";
import Icon from "./Icon";

const err = new CustomLogging("error");

interface ApplauseButtonAttrs {
    /** Used for the tooltip. */
    mediaType: string;

    /** The button will be hidden if this is true. */
    mediaIsLoading: boolean;

    /**
     * Story or photo ID only used to change the button visibility and error
     * message. The button stays hidden if the return value of this procedure
     * does not change. This procedure should retrieve the element ID from the
     * path whereas the XHR request uses the models or data attributes.
     */
    getId: () => number | string | null;

    /** Called on like click. */
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
                toast(t("applause.feedback.pass"));
            })
            .catch((error: Error & { code: number }) => {
                toast(
                    "" +
                        t(
                            "applause.feedback.fail" +
                                (error.code == 429
                                    ? "." + error.code.toString()
                                    : ""),
                        ),
                    LogType.error,
                );
                err.log(
                    `Failed to like ${
                        this.currentId !== null ? String(this.currentId) : "???"
                    }`,
                    error,
                );
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
