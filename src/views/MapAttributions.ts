import m from "mithril";

import { config } from "../config";
import { AttribUrls, Attribution, globalMapState } from "../models/Map";
import { MapTheme, MapThemeStrings } from "../models/Story";
import { t } from "../translate";

/** Map attributions legally required to be visible in/around the map. */
export const MapAttributions: m.Component = {
    view(): m.Vnode {
        const theme = MapTheme[globalMapState.theme] as MapThemeStrings;
        return m("p.attributions", [
            t("map.data"),
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
