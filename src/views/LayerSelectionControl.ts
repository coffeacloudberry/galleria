import m from "mithril";

import { config } from "../config";
import { globalMapState } from "../models/Map";
import { MapTheme, MapThemeStrings } from "../models/Story";
import { t } from "../translate";

interface LayerSelectionControlAttrs {
    map: mapboxgl.Map;
}

class LayerSelectionControlComponent
    implements m.ClassComponent<LayerSelectionControlAttrs>
{
    /** Map instance. */
    map: mapboxgl.Map | undefined;

    constructor({ attrs }: m.CVnode<LayerSelectionControlAttrs>) {
        this.map = attrs.map;
    }

    static getNextLayer(): MapTheme {
        if (globalMapState.theme + 1 in MapTheme) {
            return globalMapState.theme + 1;
        } else {
            return 0;
        }
    }

    setNextLayer(layer: MapTheme): void {
        if (!this.map) {
            return;
        }
        globalMapState.isLoadingLayers = true;
        globalMapState.theme = layer;
        this.map.setStyle(
            config.mapbox.style[
                MapTheme[globalMapState.theme] as MapThemeStrings
            ].url,
        );
    }

    onupdate(): void {
        t.createTippies();
    }

    view(): m.Vnode {
        const nextLayer = LayerSelectionControlComponent.getNextLayer();
        return m(
            "button.mapboxgl-ctrl-my-layer",
            {
                type: "button",
                disabled: globalMapState.isLoadingLayers,
                "data-tippy-content":
                    t("map.control.select-layer") +
                    t("map.theme", MapTheme[nextLayer]),
                "data-tippy-placement": "left",
                onclick: () => {
                    this.setNextLayer(nextLayer);
                },
            },
            m("span.mapboxgl-ctrl-icon.select-layer"),
        );
    }
}

/**
 * This is a custom Mapbox GL JS widget.
 */
export default class LayerSelectionControl implements mapboxgl.IControl {
    /** Map instance. */
    map: mapboxgl.Map | undefined;

    /** DIV container of this custom control. */
    container: HTMLDivElement | undefined;

    /**
     * Called by Mapbox GL JS when the control is added. That mount the
     * Component.
     * @param paramMap The map instance.
     */
    onAdd(paramMap: mapboxgl.Map): HTMLDivElement {
        this.map = paramMap;
        this.container = document.createElement("div");
        this.container.className = "mapboxgl-ctrl mapboxgl-ctrl-group";
        m.mount(this.container, {
            view: () => {
                return m(LayerSelectionControlComponent, {
                    map: paramMap,
                });
            },
        });
        m.redraw(); // create tippies
        return this.container;
    }

    /**
     * Remove the custom control from the map.
     */
    onRemove(): void {
        if (this.container && this.container.parentNode) {
            // added manually => remove manually
            m.mount(this.container, null);

            this.container.parentNode.removeChild(this.container);
        }
        this.map = undefined;
    }
}
