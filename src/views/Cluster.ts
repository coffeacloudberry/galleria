import apertureOutline from "@/icons/aperture-outline.svg";
import m from "mithril";

import { t } from "../translate";
import Icon from "./Icon";

export type ClusterItem = {
    id: number;
    image: HTMLImageElement;
    ready: boolean;
};

const PhotoInCluster: m.Component<ClusterItem> = {
    view({ attrs }: m.Vnode<ClusterItem>): m.Vnode {
        return m(
            "li",
            m(
                m.route.Link,
                {
                    href: m.buildPathname("/:lang/photo/:id", {
                        lang: t.getLang(),
                        id: attrs.id,
                    }),
                },
                m("img.cluster-thumbnail", {
                    src: attrs.image.src,
                    alt: "",
                }),
            ),
        );
    },
};

export interface InsideClusterAttrs {
    photos: ClusterItem[];
}

export const InsideCluster: m.Component<InsideClusterAttrs> = {
    view({ attrs }: m.Vnode<InsideClusterAttrs>): m.Vnode {
        return m(
            "ul",
            attrs.photos.map((item) => item.ready && m(PhotoInCluster, item)),
        );
    },
};

export const Loading: m.Component = {
    view(): m.Vnode {
        return m(
            ".loading-icon",
            m(Icon, { src: apertureOutline, style: "height: 1.6rem" }),
        );
    },
};
