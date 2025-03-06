import copyOutline from "@/icons/copy-outline.svg";
import logoKofi from "@/icons/logo-kofi.svg";
import logoMastodon from "@/icons/logo-mastodon.svg";
import logoMatrix from "@/icons/logo-matrix.svg";
import logoMonero from "@/icons/logo-monero.svg";
import logoNano from "@/icons/logo-nano.svg";
import logoPeertube from "@/icons/logo-peertube.svg";
import logoRss from "@/icons/logo-rss.svg";
import logoThreema from "@/icons/logo-threema.svg";
import logoXmpp from "@/icons/logo-xmpp.svg";
import logoZcash from "@/icons/logo-zcash.svg";
import logoMail from "@/icons/mail-outline.svg";
import newspaperOutline from "@/icons/newspaper-outline.svg";
import shieldCheckmarkOutline from "@/icons/shield-checkmark-outline.svg";
import m from "mithril";

import { config } from "../config";
import { t } from "../translate";
import { hideAllForce, toast } from "../utils";
import { Feedback } from "./Feedback";
import { Header, HeaderAttrs } from "./Header";
import Icon from "./Icon";
import { openModal } from "./Modal";

interface SocialNetworkItemAttrs {
    /** Translated tooltip content as text. */
    tooltip: string;

    /** URL to a social platform. */
    link: string;

    /** Crypto wallet address. */
    address?: string;

    /** Encoded icon. */
    logo: string;
}

/** Copy a given address to the clipboard and open a toast on success only. */
function copyToClipboard(address: string): void {
    navigator.clipboard.writeText(address).then((): void => {
        toast(t("copied"));
    });
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
                            copyToClipboard(address);
                        },
                    },
                    m(Icon, { src: copyOutline }),
                ),
            ]),
        ]);
    },
};

/** Open the modal with the crypto address. */
function showCryptoAddress(metadata: SocialNetworkItemAttrs): void {
    openModal({
        title: metadata.tooltip,
        content: {
            view: () => {
                return m(CryptoCode, metadata);
            },
        },
    });
}

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
                            showCryptoAddress(attrs);
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

export class Contact implements m.ClassComponent {
    view(): m.Vnode[] {
        const domain = location.hostname.split(".").slice(1).join(".");
        const contactItems = [
            {
                tooltip: t("mailto"),
                link: `mailto:hello@${domain}`,
                logo: logoMail,
            },
            {
                tooltip: "Matrix",
                link: "https://matrix.to/#/@beebeecoffee:matrix.org",
                logo: logoMatrix,
            },
            {
                tooltip: "XMPP",
                link: "xmpp:frozenveggies@nixnet.services",
                logo: logoXmpp,
            },
            {
                tooltip: "Threema",
                link: "https://threema.id/26ZJEA5A",
                logo: logoThreema,
            },
        ];
        const feedItems = [
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
                tooltip: "PeerTube",
                link: "https://lone.earth/c/explorewilder/videos",
                logo: logoPeertube,
            },
            {
                tooltip: t("blog"),
                link: "https://blog.explorewilder.com",
                logo: newspaperOutline,
            },
        ];
        return [
            m("h1", [t("contact.title"), m(ShieldLink)]),
            m("p", t("contact.why")),
            m(
                ".bunch-of-icons",
                m(
                    "ul",
                    contactItems.map((item) => {
                        return m(SocialNetworkItem, {
                            tooltip: item.tooltip,
                            link: item.link,
                            logo: item.logo,
                        });
                    }),
                ),
            ),
            m("p", t("social-networks")),
            m(
                ".bunch-of-icons",
                m(
                    "ul",
                    feedItems.map((item) => {
                        return m(SocialNetworkItem, {
                            tooltip: item.tooltip,
                            link: item.link,
                            logo: item.logo,
                        });
                    }),
                ),
            ),
        ];
    }
}

class AsyncPhotoMe implements m.ClassComponent {
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

    view(): m.Vnode | false {
        return this.ready && m(".me", m("img", { src: this.image.src }));
    }
}

/** The big title and text about me. */
class Intro implements m.ClassComponent {
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
                        m(AsyncPhotoMe),
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
                short: "Hippocratic License 3.0",
                href: "https://github.com/coffeacloudberry/galleria/blob/master/LICENSE.pdf",
            },
        ];
        return [
            m("h1", t("copyright")),
            m("p", `© ${config.contentLicense.holder}`),
            m(
                "p",
                myCopyrightList.map((license) =>
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
                ),
            ),
        ];
    },
};

/**
 * Link to donation platforms.
 * Update a QR code: qrencode -s 6 -o sth.png 'sth:addr'
 */
const Donate: m.Component = {
    view(): m.Vnode[] {
        const allItems = [
            {
                tooltip: t("donate-kofi"),
                link: "https://ko-fi.com/explorewilder",
                logo: logoKofi,
            },
            {
                tooltip: t("donate-zcash"),
                link: "#",
                address: "zcash:t1M7Ybfezx9VZ5ToDi3vZVpjUZ2PewzN6Vr",
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
        ];
        return [
            m("h1", t("donate")),
            m("p", t("donate.why")),
            m(
                ".bunch-of-icons",
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
            ),
        ];
    },
};

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
                m(Feedback),
                m(Header, {
                    refPage: "about",
                }),
                m("section.about", [
                    m(Intro),
                    m(
                        ".container",
                        m(".row", [
                            m(".half.column", m(Contact)),
                            m(".half.column", m(Donate)),
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
