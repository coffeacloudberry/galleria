import logoGitHub from "@/icons/logo-github.svg";
import logoMastodon from "@/icons/logo-mastodon.svg";
import logoMatrix from "@/icons/logo-matrix.svg";
import logoPixelfed from "@/icons/logo-pixelfed.svg";
import logoRss from "@/icons/logo-rss.svg";
import logoXmpp from "@/icons/logo-xmpp.svg";
import ShieldCheckmarkOutline from "@/icons/shield-checkmark-outline.svg";
import m from "mithril";

import { t } from "../translate";
import { transformExternalLinks } from "../utils";
import { ContactForm, NewsletterForm } from "./Forms";
import { Header, HeaderAttrs } from "./Header";
import Icon from "./Icon";
import { ModalSize, modal } from "./Modal";
import { ThirdPartyLicenses } from "./ThirdPartyLicenses";
import { VisitorsBook } from "./VisitorsBook";

/** The big title and text about me. */
class Intro implements m.ClassComponent {
    /** True when the image is cached and ready to be displayed. */
    private ready = false;

    /** The preloaded image. */
    private image = new Image();

    /** Cache the image to display it synchronously alongside the credit. */
    constructor() {
        this.image.onload = () => {
            this.ready = true;
            m.redraw();
        };
        this.image.src = "/content/me.webp";
    }

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
                        this.ready &&
                            m(".me", [
                                m("img", { src: this.image.src }),
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
    }
}

/** Licenses of home-made content and code. */
const myCopyrightList = [
    {
        what: "content",
        short: "CC BY-SA 4.0",
        href: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
    {
        what: "source",
        short: "AGPL-3.0+",
        href: "/jssources/jslicenses.html",
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

interface SocialNetworkItemAttrs {
    tooltip: string;
    link: string;
    logo: string;
}

/** One social platform. */
const SocialNetworkItem: m.Component<SocialNetworkItemAttrs> = {
    view({ attrs }: m.Vnode<SocialNetworkItemAttrs>): m.Vnode {
        return m(
            "li",
            {
                "data-tippy-content": attrs.tooltip,
            },
            m(
                "a.button-icon",
                {
                    href: attrs.link,
                    rel: "me",
                },
                m(Icon, { src: attrs.logo }),
            ),
        );
    },
};

/** "Verified" icon pointing the verifier. */
const ShieldLink: m.Component = {
    view(): m.Vnode {
        return m(
            "a.ml-3",
            {
                href: "https://keyoxide.org/hkp/FFD0B3DDAD69CB71BAE13B1DDFFF34860D361C52",
                "data-tippy-content": t("verified"),
                "data-tippy-placement": "right",
            },
            m(Icon, { src: ShieldCheckmarkOutline }),
        );
    },
};

/** Icons and links to my social networks. */
const SocialNetworks: m.Component = {
    view(): m.Vnode[] {
        const allItems = [
            {
                tooltip: "Mastodon",
                link: "https://photog.social/@explorewilder",
                logo: logoMastodon,
            },
            {
                tooltip: t("rss-feed"),
                link: "https://photog.social/@explorewilder.rss",
                logo: logoRss,
            },
            {
                tooltip: "GitHub",
                link: "https://github.com/coffeacloudberry/galleria",
                logo: logoGitHub,
            },
            {
                tooltip: "Pixelfed",
                link: "https://pixelfed.social/ExploreWilder",
                logo: logoPixelfed,
            },
            {
                tooltip: "Matrix",
                link: "https://matrix.to/#/@beebeecoffee:matrix.org",
                logo: logoMatrix,
            },
            {
                tooltip: "XMPP/Jabber",
                link: "xmpp:frozenveggies@nixnet.services",
                logo: logoXmpp,
            },
        ];
        return [
            m("h1", [t("social-networks"), m(ShieldLink)]),
            m(
                "ul",
                allItems.map((item) => {
                    return m(SocialNetworkItem, {
                        tooltip: item.tooltip,
                        link: item.link,
                        logo: item.logo,
                    });
                }),
            ),
        ];
    },
};

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
                            m(".one.column", m(CopyrightNotice)),
                        ),
                    ),
                ]),
            ];
        },
    };
}
