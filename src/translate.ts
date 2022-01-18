import m from "mithril";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { Messages, Options, default as tjs } from "translate.js";

export interface Language {
    id: number;
    slug: string;
    name: string;
}

interface Translatable {
    getLang(): string;
    init(lang?: string): void;
    prependLang(path: string): string;
    replaceLang(lang: string, originHref?: string): string;
    createTippies(): void;
    (
        key: string,
        subKey?: string | number,
        params?: Record<string, unknown>,
    ): string;
}

const translations: Record<string, Messages> = {
    en: require("./locales/en"),
    fi: require("./locales/fi"),
    fr: require("./locales/fr"),
};

const options: Options = {
    debug: true, // to detect missing translations when e2e testing
    resolveAliases: true,
};

let messages: Messages = translations.en;

const t: Translatable = (key, subKey, params) => {
    const translate = tjs(messages, options);
    // false positive on type
    // @ts-ignore
    return subKey ? translate(key, subKey, params) : translate(key);
};

t.getLang = (): string => {
    const inputLang = m.parsePathname(m.route.get()).path.split("/")[1];
    return Object.prototype.hasOwnProperty.call(translations, inputLang)
        ? inputLang
        : "en";
};

t.init = (lang) => {
    if (lang === undefined) {
        lang = t.getLang();
    }
    document.documentElement.lang = lang;
    messages = translations[lang];
};

t.prependLang = (path) => {
    return `/${t.getLang()}${path}`;
};

t.replaceLang = (lang, originHref) => {
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

t.createTippies = () => {
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
                content: targetNode.getAttribute(tippyAttr) || "",
            });
        };

        // Create an observer instance linked to the callback function
        const observer = new MutationObserver(callback);

        // Start observing the target node for configured mutations
        observer.observe(targetNode, config);
    });
};

export { t };
