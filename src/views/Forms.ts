import bugOutline from "@/icons/bug-outline.svg";
import calendarOutline from "@/icons/calendar-outline.svg";
import logoMatrix from "@/icons/logo-matrix.svg";
import logoThreema from "@/icons/logo-threema.svg";
import logoXmpp from "@/icons/logo-xmpp.svg";
import newspaperOutline from "@/icons/newspaper-outline.svg";
import paperPlaneOutline from "@/icons/paper-plane-outline.svg";
import shieldCheckmarkOutline from "@/icons/shield-checkmark-outline.svg";
import trashOutline from "@/icons/trash-outline.svg";
import m from "mithril";

import { config } from "../config";
import CustomLogging from "../CustomLogging";
import { t } from "../translate";
import { getWindowSize } from "../utils";
import { SocialNetworkItem } from "./AboutPage";
import Captcha from "./Captcha";
import Icon from "./Icon";
import { modal } from "./Modal";
import { PrivacyPolicy } from "./PrivacyPolicy";

const info = new CustomLogging();

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
    tooManyRequests: boolean;
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
        } else if (attrs.tooManyRequests) {
            status = `${t("wait-minute")}...`;
        } else {
            status = "" + t(attrs.okText);
        }
        return m(
            "button[type=submit]",
            attrs.processing || attrs.success || attrs.tooManyRequests
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
    return `I'm visiting your website version ${config.rev}.
    My user agent is '${navigator.userAgent}'
    and my window size is ${windowSize.width}x${windowSize.height}px.`.replace(
        /\s+/g,
        " ",
    );
}

/** Base form for the contact and newsletter forms. */
class BaseForm {
    /** True to highlight a detected bruteforce attempt. */
    tooManyRequests = false;

    /** True if the CAPTCHA is missing/empty/invalid. */
    isBot = false;

    /** True to set the form has successfully processed. */
    success = false;

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
        info.log(
            `Captcha successfully solved - solution '${solution.slice(
                0,
                5,
            )}...'`,
        );
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
                this.tooManyRequests = false;
                this.isBot = false;
            })
            .catch((error) => {
                this.processing = false;
                const fmt_error = Error(
                    `${String(error.code)}: ${String(error.response)}`,
                );
                switch (error.code) {
                    case 429:
                        this.tooManyRequests = true;
                        // skipcq: JS-0328
                        BaseForm.handleTooManyRequests().then(() => {
                            this.tooManyRequests = false;
                            this.success = false;
                        });
                        break;
                    case 418:
                        this.success = false;
                        this.isBot = true;
                        throw fmt_error;
                    default:
                        this.success = false;
                        throw fmt_error;
                }
            });
    }

    /**
     * Promise returned after some time.
     * A 'redraw' is made to refresh the UI.
     */
    static handleTooManyRequests(): Promise<void> {
        return new Promise((resolve) => {
            window.setTimeout(() => {
                resolve();
                m.redraw();
            }, config.minTimeGapBetweenContactRequest * 1000);
        });
    }

    /**
     * Return true if the email looks correct.
     * The same check is done in the backend.
     */
    static isEmail(emailAddress: string): boolean {
        const emailFormat = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
        return !!emailAddress && emailFormat.test(emailAddress);
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
                action: "send",
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
                            this.message +=
                                "Hi!\n\n" +
                                "The bug is...\n\n" +
                                getConfForBugReport() +
                                "\n\nGood luck!";
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
                        m(
                            "a.light-icon-button.float-right.mt-3.mr-3",
                            {
                                href: config.id,
                                "data-tippy-content": t("encrypt-pgp"),
                                "data-tippy-placement": "right",
                            },
                            m(Icon, { src: shieldCheckmarkOutline }),
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
                            tooManyRequests: this.tooManyRequests,
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
                        this.tooManyRequests
                            ? m(
                                  "span.ml-3.critical-error",
                                  t("too-many-requests"),
                              )
                            : "",
                        this.isBot
                            ? m("span.ml-3.critical-error", t("is-bot"))
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

/** Newsletter form containing the UI and state. */
export class NewsletterForm extends BaseForm implements m.ClassComponent {
    subscribe = true;

    onSubmit(event: Event): void {
        event.preventDefault();
        if (BaseForm.isEmail(this.email)) {
            this.processRequest({
                action: this.subscribe ? "subscribe" : "unsubscribe",
                email: this.email,
                "frc-captcha-solution": this.captchaSolution,
            });
        } else {
            this.invalidEmailAddress = true;
        }
    }

    view(): m.Vnode[] {
        return [
            m("h1", t("newsletter")),
            m("p", [
                m(Icon, { src: newspaperOutline }),
                " ",
                t("newsletter.what"),
                m("br"),
                m(Icon, { src: calendarOutline }),
                " ",
                t("newsletter.when"),
                m("br"),
                m(Icon, { src: trashOutline }),
                " ",
                t("newsletter.trash"),
            ]),
            m(
                "form#newsletter-form",
                {
                    onsubmit: (e: Event): void => {
                        this.onSubmit(e);
                    },
                },
                [
                    m("label", [
                        t("email"),
                        m("input[type=text]", {
                            oninput: (e: {
                                currentTarget: HTMLInputElement;
                            }): void => {
                                this.onEmailInput(e);
                            },
                            value: this.email,
                            class: this.invalidEmailAddress ? "invalid" : "",
                        }),
                    ]),
                    m("p", [
                        m("input[type=radio]", {
                            name: "subscription-action",
                            id: "form-subscribe",
                            checked: this.subscribe,
                            onchange: (e: {
                                currentTarget: HTMLInputElement;
                            }): void => {
                                this.subscribe = e.currentTarget.checked;
                            },
                        }),
                        m(
                            "label.radio",
                            { for: "form-subscribe" },
                            t("subscribe"),
                        ),
                        m("br"),
                        m("input[type=radio]", {
                            name: "subscription-action",
                            id: "form-unsubscribe",
                            checked: !this.subscribe,
                            onchange: (e: {
                                currentTarget: HTMLInputElement;
                            }): void => {
                                this.subscribe = !e.currentTarget.checked;
                            },
                        }),
                        m(
                            "label.radio",
                            { for: "form-unsubscribe" },
                            t("unsubscribe"),
                        ),
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
                            tooManyRequests: this.tooManyRequests,
                            icon: this.subscribe
                                ? newspaperOutline
                                : trashOutline,
                            okText: this.subscribe
                                ? "subscribe"
                                : "unsubscribe",
                        }),
                        this.invalidEmailAddress
                            ? m("span.ml-3.critical-error", t("invalid-email"))
                            : "",
                        this.tooManyRequests
                            ? m(
                                  "span.ml-3.critical-error",
                                  t("too-many-requests"),
                              )
                            : "",
                        this.isBot
                            ? m("span.ml-3.critical-error", t("is-bot"))
                            : "",
                    ]),
                ],
            ),
        ];
    }
}
