import m from "mithril";
import { modal, ModalSize, closeAllModals } from "./Modal";
import cafeSharp from "@/icons/cafe-sharp.svg";
import logoMastodon from "@/icons/logo-mastodon.svg";
import logoRss from "@/icons/logo-rss.svg";
import logoTwitter from "@/icons/logo-twitter.svg";
import logoGitHub from "@/icons/logo-github.svg";
import happyOutline from "@/icons/happy-outline.svg";
import sunnyOutline from "@/icons/sunny-outline.svg";
import logoPaypal from "@/icons/logo-paypal.svg";
import { transformExternalLinks } from "../utils";
import Icon from "./Icon";
import ThirdPartyLicenses from "./ThirdPartyLicenses";
import CustomLogging from "../CustomLogging";
import { Header, HeaderAttrs } from "./Header";
import { ContactForm, NewsletterForm } from "./Forms";
import { Lister, ListerAttrs, Finder, GifMetadata } from "./Giphy";

const t = require("../translate");
const error = new CustomLogging("error");

/** The big title and text about me. */
const Intro: m.Component = {
    view(): m.Vnode[] {
        return [
            m(
                ".container",
                m(".row", [m(".one.column", m("h1", t("about.me.title")))]),
            ),
            m(
                ".container",
                m(".row", [
                    m(".one.column", [
                        m("p", t("about.me")),
                        m(".me", [
                            m("img", { src: "/content/me.webp" }),
                            m("p.credit", [
                                t("credit"),
                                m(
                                    "a",
                                    {
                                        href: "https://timokoo.neocities.org/timoindex.html",
                                    },
                                    "Timo",
                                ),
                            ]),
                        ]),
                        m("p", t("about.pledge")),
                    ]),
                ]),
            ),
        ];
    },
};

/** The copyright notice including the opener to the dependencies. */
class CopyrightNotice implements m.ClassComponent {
    readonly myCopyrightList = [
        {
            what: "content",
            short: "CC BY-SA 4.0",
            href: "https://creativecommons.org/licenses/by-sa/4.0/",
        },
        {
            what: "source",
            short: "Apache-2.0",
            href: "https://github.com/coffeacloudberry/galleria/blob/master/LICENSE",
        },
    ];

    view(): m.Vnode[] {
        const myCopyrightNodes: m.Vnode[] = [];
        for (const license of this.myCopyrightList) {
            myCopyrightNodes.push(
                m("p", [
                    t(`copyright.${license.what}`),
                    " ",
                    m(
                        "a",
                        {
                            href: license.href,
                        },
                        license.short,
                    ),
                    ".",
                ]),
            );
        }

        return [
            m("h1", t("copyright.title")),
            m("p", [
                "© Clément Fontaine & ",
                m(
                    "a",
                    {
                        href: "#",
                        onclick: (e: Event): void => {
                            e.preventDefault();
                            modal({
                                title: t("copyright.third-parties.title"),
                                content: function (): m.Component {
                                    return {
                                        view() {
                                            return m(ThirdPartyLicenses);
                                        },
                                    };
                                },
                            });
                        },
                    },
                    t("copyright.third-parties.link"),
                ),
                ".",
            ]),
            m("p", myCopyrightNodes),
        ];
    }
}

/** Icons and links to my social networks. */
const SocialNetworks: m.Component = {
    view(): m.Vnode[] {
        return [
            m("h1", t("social-networks")),
            m("ul", [
                m(
                    "li",
                    {
                        "data-tippy-content": "Mastodon",
                    },
                    m(
                        "a.button-icon",
                        {
                            href: "https://photog.social/@explorewilder",
                            rel: "me",
                        },
                        m(Icon, { src: logoMastodon }),
                    ),
                ),
                m(
                    "li",
                    {
                        "data-tippy-content": "RSS Feed",
                    },
                    m(
                        "a.button-icon",
                        {
                            href: "https://photog.social/@explorewilder.rss",
                        },
                        m(Icon, { src: logoRss }),
                    ),
                ),
                m(
                    "li",
                    {
                        "data-tippy-content": "Twitter",
                    },
                    m(
                        "a.button-icon",
                        {
                            href: "https://twitter.com/ExploreWilder",
                        },
                        m(Icon, { src: logoTwitter }),
                    ),
                ),
                m(
                    "li",
                    {
                        "data-tippy-content": "GitHub",
                    },
                    m(
                        "a.button-icon",
                        {
                            href: "https://github.com/coffeacloudberry/galleria",
                        },
                        m(Icon, { src: logoGitHub }),
                    ),
                ),
            ]),
        ];
    },
};

/** Donation section: title, text and a button pointing to Ko-fi. */
const Support: m.Component = {
    view(): m.Vnode[] {
        return [
            m("h1", t("support")),
            m("p", t("support.why")),
            m(
                "p",
                m(
                    "a.button.mr-3",
                    {
                        href: "https://ko-fi.com/explorewilder",
                    },
                    [m(Icon, { src: cafeSharp }), "Ko-fi"],
                ),
                m(
                    "a.button",
                    {
                        href: "https://paypal.me/explorewilder",
                    },
                    [m(Icon, { src: logoPaypal }), "PayPal"],
                ),
            ),
        ];
    },
};

/** Display the latest GIFs shared by visitors + interactive buttons. */
class VisitorsBook implements m.ClassComponent {
    /** The most recent GIFs. */
    storedGiphies: GifMetadata[] = [];

    /** True when fetching the stored giphies. Only on init. */
    isRequesting = true;

    /** True when the current visitor shared its GIF. */
    hasShared = false;

    /** Fetch the stored giphies. */
    initList(): void {
        this.storedGiphies = [];
        this.isRequesting = true;
        m.request<GifMetadata[]>({
            method: "GET",
            url: "/api/giphy",
        })
            .then((result) => {
                this.storedGiphies = result;
                this.isRequesting = false;
            })
            .catch((err: Error) => {
                error.log("Failed to load the Giphies.", err);
            });
    }

    /** Content of the modal for sharing a new GIF. */
    contentGiphyFinder(): m.Component {
        return {
            view: () => {
                return m(Finder, {
                    callbackSelection: () => {
                        this.initList();
                        this.hasShared = true;
                        closeAllModals();
                    },
                });
            },
        };
    }

    oninit(): void {
        this.initList();
        this.hasShared = false;
    }

    view(): (boolean | m.Vnode<ListerAttrs>)[] {
        return [
            m("h1", t("visitors-book")),
            m("p.text-center", t("visitors-book.what")),
            this.isRequesting &&
                m(".loading-icon.text-center.m-30", [
                    m(
                        "",
                        m(Icon, {
                            src: sunnyOutline,
                            style: "height: 1.6rem",
                        }),
                    ),
                    t("loading.tooltip") + "...",
                ]),
            m(Lister, { list: this.storedGiphies }),
            !this.hasShared &&
                m(
                    "p.text-center",
                    m(
                        "button",
                        {
                            onclick: () => {
                                modal({
                                    title: t("visitors-book.involve.title"),
                                    content: () => {
                                        return this.contentGiphyFinder();
                                    },
                                    size: ModalSize.Large,
                                    cancelable: true,
                                });
                            },
                        },
                        [
                            m(Icon, { src: happyOutline }),
                            t("visitors-book.involve"),
                        ],
                    ),
                ),
        ];
    }
}

/** About page including contact form and newsletter subscription. */
export default function AboutPage(): m.Component {
    return {
        oninit(): void {
            t.init();
        },
        oncreate(): void {
            document.title = t("about");
            t.createTippies();
            transformExternalLinks();
        },
        onupdate(): void {
            t.createTippies();
            transformExternalLinks();
        },
        view(): m.Vnode<HeaderAttrs>[] {
            return [
                m(Header, {
                    aboutButton: false,
                    refPage: "about",
                }),
                m("section#about", [
                    m(Intro),
                    m(
                        ".container",
                        m(".row", [
                            m(".half.column", m(ContactForm)),
                            m(".half.column", m(NewsletterForm)),
                        ]),
                    ),
                    m(
                        ".container",
                        m(
                            ".row",
                            m(".one.column.yydchtxork", m(SocialNetworks)),
                            m(".one.column", m(VisitorsBook)),
                        ),
                    ),
                    m(
                        ".container",
                        m(".row", [
                            m(".half.column", m(Support)),
                            m(".half.column", m(CopyrightNotice)),
                        ]),
                    ),
                ]),
            ];
        },
    };
}
