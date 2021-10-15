import m from "mithril";
import close from "@/icons/close.svg";
import Icon from "./Icon";
import { hideAllForce } from "../utils";

const t = require("../translate");

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
    content: () => m.Component;
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

    hideAllForce(); // remove residual tippies (touchscreen fix)
    document.body.appendChild(modalContainer);
    m.mount(modalContainer, {
        view: () => {
            return m(
                ".modal",
                m(
                    ".modal-box" +
                        ".modal-box-" +
                        ModalSize[size].toLowerCase(),
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
