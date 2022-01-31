import cafeSharp from "@/icons/cafe-sharp.svg";
import happyOutline from "@/icons/happy-outline.svg";
import logoGitHub from "@/icons/logo-github.svg";
import logoMastodon from "@/icons/logo-mastodon.svg";
import logoPaypal from "@/icons/logo-paypal.svg";
import logoPixelfed from "@/icons/logo-pixelfed.svg";
import logoRss from "@/icons/logo-rss.svg";
import sunnyOutline from "@/icons/sunny-outline.svg";
import m from "mithril";

import CustomLogging from "../CustomLogging";
import { t } from "../translate";
import { transformExternalLinks } from "../utils";
import { ContactForm, NewsletterForm } from "./Forms";
import { Finder, GifMetadata, Lister, ListerAttrs } from "./Giphy";
import { Header, HeaderAttrs } from "./Header";
import Icon from "./Icon";
import { ModalSize, closeAllModals, modal } from "./Modal";
import { ThirdPartyLicenses } from "./ThirdPartyLicenses";

const warning = new CustomLogging("warning");

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

/** Licenses of home-made content and code. */
const myCopyrightList = [
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

/** The copyright notice including the opener to the dependencies. */
const CopyrightNotice: m.Component = {
    view(): m.Vnode[] {
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
                                content: ThirdPartyLicenses,
                                size: ModalSize.Large,
                            });
                        },
                    },
                    t("copyright.third-parties.link"),
                ),
                ".",
            ]),
            m(
                "p",
                myCopyrightList.map((license) => {
                    return m("p", [
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
                    ]);
                }),
            ),
        ];
    },
};

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
                m(
                    "li",
                    {
                        "data-tippy-content": "Pixelfed",
                    },
                    m(
                        "a.button-icon",
                        {
                            href: "https://pixelfed.social/ExploreWilder",
                        },
                        m(Icon, { src: logoPixelfed }),
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
                        href: "https://www.paypal.com/donate/?hosted_button_id=K44Z5AXPG8FZ2",
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

    /** The time to wait before retrying to fetch the visitor book. */
    bookRequestRetryTimeout = 1000;

    /** Return of setTimeout that is reset onremove. */
    retryTimeoutId: ReturnType<typeof setTimeout> | undefined;

    /** Content of the modal for sharing a new GIF. */
    contentGiphyFinder: m.Component = {
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

    constructor() {
        this.bookRequestRetryTimeout = 1000;
        this.initList();
        this.hasShared = false;
    }

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
            .catch(() => {
                warning.log("Failed to load the Giphies, retry...");
                this.retryTimeoutId = setTimeout(() => {
                    this.bookRequestRetryTimeout *= 2;
                    this.initList();
                }, this.bookRequestRetryTimeout);
            });
    }

    onremove(): void {
        if (this.retryTimeoutId !== undefined) {
            clearTimeout(this.retryTimeoutId);
        }
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
                                    content: this.contentGiphyFinder,
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
    t.init();
    return {
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
