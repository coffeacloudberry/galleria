import close from "@/icons/close.svg";
import cloudDownloadOutline from "@/icons/cloud-download-outline.svg";
import ShieldCheckmarkOutline from "@/icons/shield-checkmark-outline.svg";
import m from "mithril";

import { t } from "../translate";
import { hideAllForce, transformExternalLinks } from "../utils";
import Icon from "./Icon";

function scrollableBody(scrollable: boolean) {
    const scrollableEl = document.getElementById("about");
    if (scrollableEl) {
        scrollableEl.style.overflow = scrollable ? "auto" : "hidden";
    }
}

export enum ModalSize {
    /// Fixed maximum width
    Medium,

    /// Fixed large width
    Large,
}

type CloudLink = string | null | false;

interface LinkToCloudAttrs {
    cloudLink: CloudLink;
    text: string;
    iconSrc: string;
}

const LinkToCloud: m.Component<LinkToCloudAttrs> = {
    view({ attrs }: m.Vnode<LinkToCloudAttrs>): m.Vnode {
        const cloudLink =
            attrs.text === "download.signature"
                ? `${String(attrs.cloudLink)}.SHA256.asc`
                : attrs.cloudLink;
        return m(
            "a.button.mr-3",
            {
                href: attrs.cloudLink ? cloudLink : "#",
                class: attrs.cloudLink ? "" : "disabled",
                onclick: (e: Event): void => {
                    if (!attrs.cloudLink) {
                        e.preventDefault();
                    }
                },
            },
            [m(Icon, { src: attrs.iconSrc }), t(attrs.text)],
        );
    },
};

interface ModalOptions {
    title: string | m.Vnode;
    content: m.Component;
    size?: ModalSize;
    cancelable?: boolean;
    cloudLinkFn?: () => CloudLink;
}

export function modal({
    title,
    content,
    size = ModalSize.Medium,
    cancelable = false,
    cloudLinkFn = undefined,
}: ModalOptions): void {
    const modalContainer = document.createElement("div");

    const closeModal = () => {
        modalContainer.remove();
        scrollableBody(true);
    };

    /** Close all modals on escape. */
    const onKeyPressed = (e: KeyboardEvent) => {
        if (e.code === "Escape") {
            closeModal();
        }
    };

    hideAllForce(); // remove residual tippies (touchscreen fix)
    document.body.appendChild(modalContainer);
    m.mount(modalContainer, {
        oncreate(): void {
            document.addEventListener("keydown", onKeyPressed);
            transformExternalLinks();
        },
        onupdate(): void {
            transformExternalLinks();
        },
        onremove(): void {
            document.removeEventListener("keydown", onKeyPressed);
        },
        view: () => {
            const displayCloudLink = Boolean(cloudLinkFn);
            const cloudLink =
                displayCloudLink && cloudLinkFn ? cloudLinkFn() : null;
            return m(
                ".modal",
                {
                    // close the modal when clicking outside
                    onclick: closeModal,
                },
                m(
                    ".modal-box",
                    {
                        class: `modal-box-${ModalSize[size].toLowerCase()}`,
                        onclick: (event: Event) => {
                            // do not close the modal when clicking inside
                            event.stopPropagation();
                        },
                    },
                    [
                        m("h1.modal-title", title),
                        m(".modal-content", m(content)),
                        displayCloudLink &&
                            m(LinkToCloud, {
                                cloudLink,
                                iconSrc: cloudDownloadOutline,
                                text: "download",
                            }),
                        displayCloudLink &&
                            m(LinkToCloud, {
                                cloudLink,
                                iconSrc: ShieldCheckmarkOutline,
                                text: "download.signature",
                            }),
                        m(
                            "button.modal-close",
                            {
                                onclick: closeModal,
                                class: cancelable ? "critical" : "",
                            },
                            [
                                m(Icon, { src: close }),
                                cancelable ? t("cancel") : t("close"),
                            ],
                        ),
                    ],
                ),
            );
        },
    });
    scrollableBody(false);
}
