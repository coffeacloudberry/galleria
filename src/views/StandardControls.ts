// @ts-nocheck

import type mapboxgl from "mapbox-gl";
const t = require("../translate");

/**
 * Force using the tippy instead of the default title.
 * Language switch is handled by re-adding the control instance.
 * @param button The Mapbox GL control button.
 * @param title The tippy content.
 */
function setTippy(button: HTMLButtonElement, title: string) {
    button.setAttribute("data-tippy-content", title);
    button.setAttribute("data-tippy-placement", "left");
}

export type ControlsType = Record<string, mapboxgl.IControl>;

/**
 * Wrap the controls into a function to lazy load the class extension.
 * Each class overwrite the title attribute handler to have a good looking
 * tippy. The translation is handled directly by the application so that it is
 * dynamically/automatically updated on language switch.
 */
export default function Controls(): ControlsType {
    class FullscreenControl extends mapboxgl.FullscreenControl {
        // override
        _getTitle() {
            return t(
                "mapbox",
                `FullscreenControl.${this._isFullscreen() ? "Exit" : "Enter"}`,
            );
        }

        // override
        _updateTitle() {
            setTippy(this._fullscreenButton, this._getTitle());
        }
    }

    class NavigationControl extends mapboxgl.NavigationControl {
        isEnabled = true;

        // override
        _setButtonTitle(button: HTMLButtonElement, title: string) {
            setTippy(button, t("mapbox", `NavigationControl.${title}`));
        }

        // override, otherwise the native updater will mess up enableButtons()
        _updateZoomButtons() {
            const zoom = this._map.getZoom();

            const isMax = zoom === this._map.getMaxZoom();
            this._zoomInButton.disabled = !this.isEnabled || isMax;
            this._zoomInButton.setAttribute(
                "aria-disabled",
                this._zoomInButton.disabled.toString(),
            );
            const isMin = zoom === this._map.getMinZoom();
            this._zoomOutButton.disabled = !this.isEnabled || isMin;
            this._zoomOutButton.setAttribute(
                "aria-disabled",
                this._zoomOutButton.disabled.toString(),
            );
        }

        /** Enable/disable the zoom and rotate buttons */
        enableButtons(enable = true) {
            this.isEnabled = enable;
            const domContainer = this._container as HTMLElement;
            domContainer.querySelectorAll("button").forEach((button) => {
                button.disabled = !enable;
                button.setAttribute("aria-disabled", enable.toString());
            });
        }
    }

    return {
        fullscreen: new FullscreenControl(),
        navigation: new NavigationControl(),
    };
}
