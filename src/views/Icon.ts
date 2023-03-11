import m from "mithril";

interface IconAttrs {
    src: string;
    style?: string;
}

export default class Icon implements m.ClassComponent<IconAttrs> {
    // skipcq: JS-0105
    view({ attrs }: m.CVnode<IconAttrs>): m.Vnode {
        return m("img.icon", {
            src: attrs.src,
            style: attrs.style,
        });
    }
}
