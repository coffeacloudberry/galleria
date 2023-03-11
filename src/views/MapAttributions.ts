import informationCircleOutline from "@/icons/information-circle-outline.svg";
import m from "mithril";
import tippy, { Instance as TippyInstance } from "tippy.js";

import { config } from "../config";
import { AttribUrls, Attribution, globalMapState } from "../models/Map";
import { MapTheme, MapThemeStrings } from "../models/Story";
import { t } from "../translate";
import { transformExternalLinks } from "../utils";
import Icon from "./Icon";

const MapAttributionsTippyContent: m.Component = {
    view(): m.Vnode {
        const theme = MapTheme[globalMapState.theme] as MapThemeStrings;
        return m("span", [
            config.mapbox.style[theme].attributions.map((keyAttrib: number) => {
                return [
                    " © ",
                    m(
                        "a",
                        { href: AttribUrls[keyAttrib] },
                        Attribution[keyAttrib],
                    ),
                ];
            }),
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
class MapAttributionsIcon implements m.ClassComponent {
    private tippyInstance: TippyInstance | undefined;

    /** Put the Tippy content in the right place. */
    oncreate({ dom }: m.CVnodeDOM): void {
        this.tippyInstance = tippy(dom, {
            interactive: true,
            allowHTML: true,
            hideOnClick: false,
            interactiveBorder: 30,
            interactiveDebounce: 70,
            content: dom.children[1], // MapAttributionsTippyContent
            placement: "top",
            appendTo: () => document.body,
            arrow: false,
            maxWidth: "none",
        });
    }

    // skipcq: JS-0105
    onupdate(): void {
        transformExternalLinks();
    }

    onbeforeremove(): void {
        if (this.tippyInstance) {
            this.tippyInstance.unmount();
        }
    }

    onremove(): void {
        if (this.tippyInstance) {
            this.tippyInstance.destroy();
        }
    }

    // skipcq: JS-0105
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
