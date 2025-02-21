import close from "@/icons/close.svg";
import m from "mithril";

import { hideAllForce } from "../utils";
import Icon from "./Icon";

interface ModalOptions {
    title: string | m.Vnode;
    content: m.Component;
}

export function openModal({ title, content }: ModalOptions): void {
    const modalContainer = document.createElement("div");

    const closeModal = () => {
        modalContainer.remove();
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
                    ".modal-box",
                    {
                        onclick: (event: Event) => {
                            // do not close the modal when clicking inside
                            event.stopPropagation();
                        },
                    },
                    [
                        m(
                            "button.modal-close",
                            { onclick: closeModal },
                            m(Icon, { src: close }),
                        ),
                        m("h1.modal-title", title),
                        m(".modal-content", m(content)),
                    ],
                ),
            );
        },
    });
}
