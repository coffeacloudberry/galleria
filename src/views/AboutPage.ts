import logoCard from "@/icons/card-outline.svg";
import logoCardRecurrent from "@/icons/card-recurrent-outline.svg";
import copyOutline from "@/icons/copy-outline.svg";
import logoBat from "@/icons/logo-bat.svg";
import logoGitHub from "@/icons/logo-github.svg";
import logoMastodon from "@/icons/logo-mastodon.svg";
import logoMonero from "@/icons/logo-monero.svg";
import logoNano from "@/icons/logo-nano.svg";
import logoOdysee from "@/icons/logo-odysee.svg";
import logoPixelfed from "@/icons/logo-pixelfed.svg";
import logoPlume from "@/icons/logo-plume.svg";
import logoRss from "@/icons/logo-rss.svg";
import logoZcash from "@/icons/logo-zcash.svg";
import shieldCheckmarkOutline from "@/icons/shield-checkmark-outline.svg";
import m from "mithril";

import { config } from "../config";
import { t } from "../translate";
import { hideAllForce, toast } from "../utils";
import { ContactForm } from "./Forms";
import { Header, HeaderAttrs } from "./Header";
import Icon from "./Icon";
import { ModalSize, modal } from "./Modal";
import { ThirdPartyLicenses } from "./ThirdPartyLicenses";

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

/** The copyright notice including the opener to the dependencies. */
const CopyrightNotice: m.Component = {
    view(): m.Vnode[] {
        /** Licenses of home-made content and code. */
        const myCopyrightList = [
            {
                what: "content",
                short: config.contentLicense.shortName,
                href: `${config.contentLicense.url}deed.${t.getLang()}`,
            },
            {
                what: "source",
                short: "AGPL-3.0+",
                href: "/jssources/jslicenses.html",
            },
        ];
        return [
            m("h1", t("copyright")),
            m("p", [
                `© ${config.contentLicense.holder} & `,
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
    /** Translated tooltip content as text. */
    tooltip: string;

    /** URL to social platform. */
    link: string;

    /** Crypto wallet address. */
    address?: string;

    /** Encoded icon. */
    logo: string;
}

/** Wallet information. */
const CryptoCode: m.Component<SocialNetworkItemAttrs> = {
    view({ attrs }: m.Vnode<SocialNetworkItemAttrs>): m.Vnode | null {
        if (!attrs.address) {
            return null;
        }
        const [currency, address] = attrs.address.split(":");
        return m(".text-center", [
            m("img", { src: `/assets/qr_codes/${currency}.png` }),
            m("p.address", [
                m("input[type=text][readonly]", { value: address }),
                m(
                    "span.copy-button",
                    {
                        "data-tippy-content": t("copy"),
                        "data-tippy-placement": "right",
                        onclick: (e: Event): void => {
                            e.preventDefault();
                            if (address) {
                                navigator.clipboard
                                    .writeText(address)
                                    .then((): void => {
                                        toast(t("copied"));
                                    });
                            }
                        },
                    },
                    m(Icon, { src: copyOutline }),
                ),
            ]),
        ]);
    },
};

/** One social platform. */
export const SocialNetworkItem: m.Component<SocialNetworkItemAttrs> = {
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
                    onclick: (e: Event): void => {
                        if (attrs.address) {
                            e.preventDefault();
                            modal({
                                title: attrs.tooltip,
                                content: {
                                    view: () => {
                                        return m(CryptoCode, attrs);
                                    },
                                },
                            });
                        }
                    },
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
                href: config.id,
                "data-tippy-content": t("verified"),
                "data-tippy-placement": "right",
            },
            m(Icon, { src: shieldCheckmarkOutline }),
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
                tooltip: "Odysee",
                link: "https://odysee.com/@ExploreWilder:b",
                logo: logoOdysee,
            },
            {
                tooltip: "Plume",
                link: "https://fediverse.blog/~/ExploreWilder",
                logo: logoPlume,
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

/** Link to donation platform. */
const Donate: m.Component = {
    view(): m.Vnode[] {
        const allItems = [
            {
                tooltip: t("donate-card"),
                link: `https://donate.stripe.com/7sIdU4gpEeN321qbII?locale=${t.getLang()}`,
                logo: logoCard,
            },
            {
                tooltip: t("donate-recurrent"),
                link: `https://${t.getLang()}.liberapay.com/ExploreWilder/`,
                logo: logoCardRecurrent,
            },
            {
                tooltip: t("donate-zcash"),
                link: "https://free2z.com/explorewilder",
                logo: logoZcash,
            },
            {
                tooltip: t("donate-monero"),
                link: "#",
                address:
                    "monero:8Bzm9pp36LES13YcP631eaV8tKs2iX3mpfpWwUmGAUUC8MPUoNCKMm4c24poa8QfspVfS83xxvfvSZ74TK1SqPD5UjPUp8a",
                logo: logoMonero,
            },
            {
                tooltip: t("donate-nano"),
                link: "#",
                address:
                    "nano:nano_3i6d6o8k9ypczju6i1r6zrkrspqdp4wiuxtmt6acnuyxsscyju6nsk1yf3if",
                logo: logoNano,
            },
            {
                tooltip: t("donate-bat"),
                link: "https://publishers.basicattentiontoken.org",
                logo: logoBat,
            },
        ];
        return [
            m("h1", t("donate")),
            m(
                "ul",
                allItems.map((item) => {
                    return m(SocialNetworkItem, {
                        tooltip: item.tooltip,
                        link: item.link,
                        address: item.address,
                        logo: item.logo,
                    });
                }),
            ),
        ];
    },
};

/** About page including contact form. */
export default function AboutPage(): m.Component {
    t.init();
    return {
        oncreate(): void {
            document.title = t("about");
            t.createTippies();
        },
        onupdate(): void {
            t.createTippies();
        },
        onremove(): void {
            hideAllForce();
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
                            m(".half.column", [
                                m(
                                    ".bunch-of-icons.yydchtxork",
                                    m(SocialNetworks),
                                ),
                                m(".bunch-of-icons.yydchtxork", m(Donate)),
                            ]),
                        ]),
                    ),
                    m(
                        ".container",
                        m(".row", m(".one.column", m(CopyrightNotice))),
                    ),
                ]),
            ];
        },
    };
}
