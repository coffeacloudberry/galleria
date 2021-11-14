import close from "@/icons/close.svg";
import m from "mithril";

import { t } from "../translate";
import { hideAllForce } from "../utils";
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

interface ModalOptions {
    title: string | m.Vnode;
    content: m.Component;
    size?: ModalSize;
    cancelable?: boolean;
}

export function closeAllModals(): void {
    const allModals = document.getElementsByClassName("modal");
    for (const currentModal of allModals) {
        currentModal.remove();
    }
    scrollableBody(true);
}

export function modal({
    title,
    content,
    size = ModalSize.Medium,
    cancelable = false,
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
        },
        onremove(): void {
            document.removeEventListener("keydown", onKeyPressed);
        },
        view: () => {
            return m(
                ".modal",
                {
                    // close the modal when clicking outside
                    onclick: closeModal,
                },
                m(
                    ".modal-box" +
                        ".modal-box-" +
                        ModalSize[size].toLowerCase(),
                    {
                        onclick: (event: Event) => {
                            // do not close the modal when clicking inside
                            event.stopPropagation();
                        },
                    },
                    [
                        m("h1.modal-title", title),
                        m(".modal-content", m(content)),
                        m(
                            "button.modal-close" +
                                (cancelable ? ".critical" : ""),
                            {
                                onclick: closeModal,
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
