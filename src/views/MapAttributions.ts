import informationCircleOutline from "@/icons/information-circle-outline.svg";
import m from "mithril";
import { Placement } from "tippy.js";

import { config } from "../config";
import { t } from "../translate";
import { InteractiveTippy } from "../utils";
import Icon from "./Icon";

/** Ordered list of attribution URLs. */
const attributions = {
    OpenStreetMap: "https://www.openstreetmap.org/copyright",
    Mapbox: "https://www.mapbox.com/about/maps/",
    Maxar: "https://www.maxar.com/",
};

const MapAttributionsTippyContent: m.Component = {
    view(): m.Vnode {
        return m("span", [
            Object.entries(attributions).map(([name, href]) => [
                " © ",
                m("a", { href }, name),
            ]),
            " © ",
            m(
                "a",
                { href: `${config.contentLicense.url}deed.${t.getLang()}` },
                config.contentLicense.holder,
            ),
            ". ",
            m(
                "a",
                { href: "https://www.mapbox.com/map-feedback/" },
                t("map.improve"),
            ),
            ".",
        ]);
    },
};

/**
 * Contains both the icon and Tippy content,
 * even though the Tippy content is actually in the body.
 */
class MapAttributionsIcon extends InteractiveTippy<void> {
    placement = "top" as Placement;
    arrow = false;

    view(): m.Vnode {
        return m("span.vat", [
            m(Icon, { src: informationCircleOutline }), // actually displayed
            m(MapAttributionsTippyContent), // not visible
        ]);
    }
}

/** Map attributions legally required to be visible in/around the map. */
export const MapAttributions: m.Component = {
    view(): m.Vnode {
        return m("p.attributions", [t("map.data"), m(MapAttributionsIcon)]);
    },
};
