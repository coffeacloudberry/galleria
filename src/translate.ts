import m from "mithril";
import { default as tjs } from "translate.js";
import tippy, { Instance as TippyInstance } from "tippy.js";

export interface Language {
    id: number;
    slug: string;
    name: string;
}

type OneDictLang = { [key: string]: any };

interface Translatable {
    getLang(): string;
    init(lang?: string): void;
    prependLang(path: string): string;
    replaceLang(lang: string, originHref: string | undefined): string;
    createTippies(): void;
    getTranslations(): OneDictLang;
    (key: string, args: any, params: any): m.Vnode<any, any> | string;
}

const translations: Record<string, OneDictLang> = {
    en: require("./locales/en"),
    fi: require("./locales/fi"),
    fr: require("./locales/fr"),
};

const options = {
    debug: true,
    resolveAliases: true,
};

let messages: OneDictLang = translations.en;

const translate: Translatable = (key: string, args: any, params: any) => {
    const t = tjs(messages, options);
    return args ? t(key, args, params) : t(key);
};

translate.getLang = (): string => {
    const inputLang = m.parsePathname(m.route.get()).path.split("/")[1];
    return translations.hasOwnProperty(inputLang) ? inputLang : "en";
};

translate.init = (lang?: string) => {
    if (lang === undefined) {
        lang = translate.getLang();
    }
    document.documentElement.lang = lang;
    messages = translations[lang];
};

translate.prependLang = (path: string): string => {
    return `/${translate.getLang()}${path}`;
};

translate.replaceLang = (
    lang: string,
    originHref: string | undefined,
): string => {
    if (!originHref) {
        originHref = m.route.get();
    }
    const params = m.parsePathname(originHref).params;
    const fromPhoto = params["from_photo"];
    return (
        [
            "",
            lang,
            ...m.parsePathname(originHref).path.split("/").splice(2),
        ].join("/") + (fromPhoto ? "?from_photo=" + fromPhoto : "")
    );
};

translate.createTippies = () => {
    const tippyAttr = "data-tippy-content";

    // Refresh the tooltip content on update (not automatic by default)
    const allTippies = document.querySelectorAll("[data-tippy-content]");
    allTippies.forEach((targetNode: Element) => {
        const tippyNode = targetNode as HTMLElement & { _tippy: TippyInstance };
        if (!tippyNode._tippy) {
            // Create only if not existing to avoid duplication
            tippy(tippyNode);
        }

        // Observe mutations on the specific tippy content
        const config: MutationObserverInit = {
            attributes: true,
            attributeFilter: [tippyAttr],
        };

        // Callback function to execute when mutations are observed
        const callback = () => {
            tippyNode._tippy.setProps({
                content: "" + targetNode.getAttribute(tippyAttr),
            });
        };

        // Create an observer instance linked to the callback function
        const observer = new MutationObserver(callback);

        // Start observing the target node for configured mutations
        observer.observe(targetNode, config);
    });
};

translate.getTranslations = (): OneDictLang => messages;

module.exports = translate;
