import bugOutline from "@/icons/bug-outline.svg";
import logoMatrix from "@/icons/logo-matrix.svg";
import logoThreema from "@/icons/logo-threema.svg";
import logoXmpp from "@/icons/logo-xmpp.svg";
import logoMail from "@/icons/mail-outline.svg";
import paperPlaneOutline from "@/icons/paper-plane-outline.svg";
import m from "mithril";

import { config } from "../config";
import { LogType } from "../CustomLogging";
import { t } from "../translate";
import { getWindowSize, toast } from "../utils";
import { SocialNetworkItem } from "./AboutPage";
import Captcha from "./Captcha";
import Icon from "./Icon";
import { modal } from "./Modal";
import { PrivacyPolicy } from "./PrivacyPolicy";

type SubmitEvent = Event & { submitter: HTMLElement };

/** Link opening the Privacy Policy modal. */
export const PrivacyButton: m.Component = {
    view(): m.Vnode {
        return m(
            "a",
            {
                href: "#",
                onclick: (e: Event): void => {
                    e.preventDefault();
                    modal({
                        title: t("privacy.title"),
                        content: PrivacyPolicy,
                    });
                },
            },
            t("read-privacy"),
        );
    },
};

const Status: m.Component = {
    view(): m.Vnode[] {
        return [
            m("p", t("status.notice")),
            m(
                "p",
                m(
                    "a",
                    {
                        href: "https://stats.uptimerobot.com/3JW84TmQoB",
                    },
                    t("status.link"),
                ),
            ),
        ];
    },
};

interface SubmitButtonAttrs {
    processing: boolean;
    success: boolean;
    icon: string;
    okText: string;
}

/** Submit button, always visible. */
const SubmitButton: m.Component<SubmitButtonAttrs> = {
    view({ attrs }: m.Vnode<SubmitButtonAttrs>): m.Vnode {
        let status = "";
        if (attrs.processing) {
            status = `${t("wait")}...`;
        } else if (attrs.success) {
            status = t("thanks");
        } else {
            status = String(t(attrs.okText));
        }
        return m(
            "button[type=submit]",
            attrs.processing || attrs.success
                ? {
                      disabled: "disabled",
                  }
                : {},
            [m(Icon, { src: attrs.icon }), status],
        );
    },
};

function getConfForBugReport(): string {
    const windowSize = getWindowSize();
    const debugInfo = `I'm visiting your website version ${config.rev}.
    My user agent is '${navigator.userAgent}'
    and my window size is ${windowSize.width}x${windowSize.height}px.`;
    return `Hi!\n\nThe bug is...\n\n${debugInfo.replace(
        /\s+/g,
        " ",
    )}\n\nGood luck!`;
}

/** Base form for the contact form. */
class BaseForm {
    /** True if the CAPTCHA is missing/empty/invalid. */
    isBot = false;

    /** True to set the form has successfully processed. */
    success = false;

    /** True if a handled exception happened. */
    unhandledError = false;

    /** True to display a spin as a request is in process. */
    processing = false;

    /** The email input field. */
    email = "";

    /** True to highlight a bad email format. */
    invalidEmailAddress = false;

    /** True to have the CAPTCHA widget in the form. */
    instantiateCaptcha = false;

    /** The Friendly CAPTCHA solution. */
    captchaSolution = "";

    /**
     * Callback updating the Friendly CAPTCHA solution.
     * @param solution New solution.
     */
    doneCallback(solution: string): void {
        this.captchaSolution = solution;
    }

    /**
     * Send the request and change the current status.
     * An exception is raised if the error is unexpected.
     */
    processRequest(bodyRequest: Record<string, string>): void {
        this.processing = true;
        m.request<string | undefined>({
            method: "POST",
            url: "/api/contact",
            body: bodyRequest,
        })
            .then(() => {
                this.processing = false;
                this.success = true;
                this.isBot = false;
                this.unhandledError = false;
            })
            .catch((error) => {
                this.processing = false;
                const fmt_error = Error(
                    `${String(error.code)}: ${String(error.response)}`,
                );
                switch (error.code) {
                    case 418:
                        this.success = false;
                        this.isBot = true;
                        throw fmt_error;
                    case 410:
                        // re-instantiate expired challenge
                        this.instantiateCaptcha = false;
                        this.captchaSolution = "";
                        this.success = false;
                        this.isBot = true;
                        window.setTimeout(() => {
                            this.instantiateCaptcha = true;
                            m.redraw();
                        });
                        throw fmt_error;
                    default:
                        this.success = false;
                        this.unhandledError = true;
                        toast(t("unknown-error-verbose"), "", LogType.error);
                        throw fmt_error;
                }
            });
    }

    /**
     * Return true if the email looks correct.
     * The same check is done in the backend.
     */
    static isEmail(emailAddress: string): boolean {
        const emailFormat = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
        return Boolean(emailAddress) && emailFormat.test(emailAddress);
    }

    /**
     * When the user changes the email address.
     * Update the field and check it.
     */
    onEmailInput(e: { currentTarget: HTMLInputElement }): void {
        this.email = e.currentTarget.value.trim();
        this.instantiateCaptcha = true;
        if (this.invalidEmailAddress && BaseForm.isEmail(this.email)) {
            this.invalidEmailAddress = false; // reset
        }
    }
}

/** Contact form containing the UI and state. Only one allowed in the page. */
export class ContactForm extends BaseForm implements m.ClassComponent {
    message = "";
    invalidMessage = false;

    onSubmit(): void {
        if (!BaseForm.isEmail(this.email)) {
            this.invalidEmailAddress = true;
        }
        if (!this.message) {
            this.invalidMessage = true;
        }
        if (!this.invalidEmailAddress && !this.invalidMessage) {
            this.processRequest({
                email: this.email,
                message: this.message,
                "frc-captcha-solution": this.captchaSolution,
            });
        }
    }

    onMessageInput(e: { currentTarget: HTMLTextAreaElement }): void {
        this.message = e.currentTarget.value;
        if (this.invalidMessage && this.message) {
            this.invalidMessage = false; // reset
        }
    }

    view(): m.Vnode[] {
        const allItems = [
            {
                tooltip: t("encrypt-pgp"),
                link: `https://keys.openpgp.org/pks/lookup?op=get&options=mr&search=0x${config.openpgp4fpr}`,
                logo: logoMail,
            },
            {
                tooltip: "Matrix",
                link: "https://matrix.to/#/@beebeecoffee:matrix.org",
                logo: logoMatrix,
            },
            {
                tooltip: "XMPP/Jabber",
                link: "xmpp:frozenveggies@nixnet.services",
                logo: logoXmpp,
            },
            {
                tooltip: "Threema",
                link: "https://threema.id/26ZJEA5A",
                logo: logoThreema,
            },
        ];
        return [
            m("h1", t("contact.title")),
            m("p", t("contact.why")),
            m(
                "form#contact-form",
                {
                    onsubmit: (e: SubmitEvent): void => {
                        e.preventDefault();
                        if (e.submitter.id === "bug-report-button") {
                            modal({
                                title: t("status.title"),
                                content: Status,
                            });
                            this.message += getConfForBugReport();
                        } else {
                            this.onSubmit();
                        }
                    },
                },
                [
                    m(
                        "p",
                        m("label", [
                            t("email"),
                            m("input[type=text]", {
                                oninput: (e: {
                                    currentTarget: HTMLInputElement;
                                }): void => {
                                    this.onEmailInput(e);
                                },
                                value: this.email,
                                class: this.invalidEmailAddress
                                    ? "invalid"
                                    : "",
                            }),
                        ]),
                    ),
                    m("p", [
                        m(
                            "button.light-icon-button.float-right.mt-3",
                            {
                                id: "bug-report-button",
                                "data-tippy-content": t("report-bug"),
                                "data-tippy-placement": "right",
                            },
                            m(Icon, { src: bugOutline }),
                        ),
                        m("label", [
                            t("message"),
                            m("textarea[rows=6]", {
                                oninput: (e: {
                                    currentTarget: HTMLTextAreaElement;
                                }): void => {
                                    this.onMessageInput(e);
                                },
                                value: this.message,
                                class: this.invalidMessage ? "invalid" : "",
                            }),
                        ]),
                    ]),
                    this.instantiateCaptcha &&
                        m(Captcha, {
                            doneCallback: (solution) => {
                                this.doneCallback(solution);
                            },
                        }),
                    m("p", m(PrivacyButton)),
                    m("p", [
                        m(SubmitButton, {
                            processing: this.processing,
                            success: this.success,
                            icon: paperPlaneOutline,
                            okText: "send",
                        }),
                        this.invalidEmailAddress && !this.invalidMessage
                            ? m("span.ml-3.critical-error", t("invalid-email"))
                            : "",
                        this.invalidMessage
                            ? m(
                                  "span.ml-3.critical-error",
                                  t("invalid-message"),
                              )
                            : "",
                        this.isBot
                            ? m("span.ml-3.critical-error", t("is-bot"))
                            : "",
                        this.unhandledError
                            ? m("span.ml-3.critical-error", t("unknown-error"))
                            : "",
                    ]),
                    m("p", t("alternative-send")),
                    m(
                        ".bunch-of-icons",
                        m(
                            "ul",
                            allItems.map((item) => {
                                return m(SocialNetworkItem, {
                                    tooltip: item.tooltip,
                                    link: item.link,
                                    logo: item.logo,
                                });
                            }),
                        ),
                    ),
                ],
            ),
        ];
    }
}
