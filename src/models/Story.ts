import m from "mithril";
import snarkdown from "snarkdown";
import { PhotoInfo } from "./Photo";
import { config } from "../config";

const t = require("../translate");

interface Date {
    day: number;
    month: number;
    year: number;
}

enum Season {
    winter,
    spring,
    summer,
    autumn,
}

type SeasonStrings = keyof typeof Season;

/** Structure of the JSON file. */
interface StoryInfo {
    start?: string;
    duration?: number;
    season?: SeasonStrings;
    hasGeodata?: boolean;
    mostRecentPhoto?: string;
}

/** Based on the Markdown file. */
interface ProcessedStoryFile {
    title: string | null;
    content: string | null;
}

/**
 * Replace: '{fine spells}="Moslty sunny"'
 * with: '<abbr data-tippy-content="Moslty sunny">fine spells</abbr>'
 *
 * Regex help: https://www.keycdn.com/support/regex-cheatsheet
 */
function abbrMdToHtml(md: string): string {
    return md.replace(
        /{([^}]*)}="([^"]*)"/g,
        '<abbr data-tippy-content="$2">$1</abbr>',
    );
}

/**
 * Process a TRUSTED story file and return the title separated from the content.
 */
function mdProcessor(text: string): ProcessedStoryFile {
    let blocks = text.trim().split(/(?:\r?\n){2,}/);

    // the story title is excluded from the content
    const titleWords = blocks[0].split(/\r?\n/)[0].split(" ");
    if (titleWords[0] !== "#") {
        return { title: null, content: null };
    }

    titleWords.shift(); // remove the hashtag
    blocks.shift(); // remove the story title

    blocks = blocks.map((l) =>
        [" ", "\t", "#", "-", "*"].some((ch) => l.startsWith(ch))
            ? snarkdown(abbrMdToHtml(l))
            : `<p>${snarkdown(abbrMdToHtml(l))}</p>`,
    );

    return {
        title: titleWords.join(" "),
        content: blocks.join(""),
    };
}

function getOriginPhotoId(): number | null {
    const id = parseInt("" + m.parsePathname(m.route.get()).params.from_photo);
    return isNaN(id) || id > config.firstPhotoId ? null : id;
}

const Story = {
    /** Story title retrieved from the Markdown file. */
    title: null as string | null,

    /** Story content (without title) retrieved from the Markdown file. */
    content: null as string | null,

    /** Start date retrieved from the JSON file. */
    start: null as Date | null,

    /** Total number of days, retrieved from the JSON file. */
    duration: null as number | null,

    /** Local season retrieved from the JSON file. */
    season: null as SeasonStrings | null,

    /** True if the story contains a WebTrack, based on the JSON file. */
    hasGeodata: false,

    /** The most recent photo ID of the story, based on the JSON file. */
    mostRecentPhoto: null as string | null,

    /** Folder name of the story. */
    folderName: null as string | null,

    /** True if the story title and content has been fetched and processed. */
    gotContent: false,

    /** True if the JSON file has been fetched and processed. */
    gotStoryMeta: false,

    /** JSON file of the linked photo. */
    originPhotoMeta: null as PhotoInfo | null,

    /** True if a story is available. */
    isLoaded: (): boolean => {
        return Story.gotContent && Story.gotStoryMeta;
    },

    /**
     * Load the origin photo metadata to be asynchronously inserted in the
     * story page (optional). The story metadata should be available in the
     * URL does not contain the origin photo ID.
     */
    loadOriginPhotoMeta: (): void => {
        let originPhotoId = getOriginPhotoId();
        if (originPhotoId === null) {
            if (Story.mostRecentPhoto === null) {
                return;
            }
            originPhotoId = parseInt(Story.mostRecentPhoto);
        }
        m.request<PhotoInfo>({
            method: "GET",
            url: "/content/photos/:folderName/i.json",
            params: {
                folderName: originPhotoId,
            },
        }).then((result) => {
            Story.originPhotoMeta = result;
        });
    },

    /** Load the story identified by its ID, or do nothing if not existing. */
    reload: (): void => {
        if (Story.folderName) {
            Story.load(Story.folderName);
        }
    },

    /** Load a story from a specific folder (fields are null if not found). */
    load: (folderName: string): void => {
        Story.gotContent = false;
        Story.gotStoryMeta = false;
        Story.folderName = folderName;
        m.request<ProcessedStoryFile>({
            method: "GET",
            url: "/content/stories/:folderName/:lang.md",
            params: {
                folderName: folderName,
                lang: t.getLang(),
            },
            headers: {
                "Content-Type": "text/markdown; charset=utf-8",
                Accept: "text/*",
            },
            // use 'extract' because 'deserialize' gives a null string
            extract: (xhr) => {
                if (xhr.status === 200) {
                    return mdProcessor(xhr.responseText);
                } else {
                    return { title: null, content: null };
                }
            },
        }).then((result) => {
            if (!result.title || !result.content) {
                m.route.set(
                    `/${t.getLang()}/lost`,
                    {},
                    {
                        replace: true,
                    },
                );
            }
            Story.title = result.title;
            Story.content = result.content;
            Story.gotContent = true;
        });
        m.request<StoryInfo>({
            method: "GET",
            url: "/content/stories/:folderName/i.json",
            params: {
                folderName: folderName,
            },
        })
            .then((result) => {
                if (result.start) {
                    const [year, month, day] = result.start.split("-");
                    Story.start = {
                        day: parseInt(day),
                        month: parseInt(month),
                        year: parseInt(year),
                    };
                } else {
                    Story.start = null;
                }
                Story.season = result.season || null;
                Story.duration = result.duration || null;
                Story.hasGeodata = result.hasGeodata || false;
                Story.mostRecentPhoto = result.mostRecentPhoto || null;
                Story.gotStoryMeta = true;
                Story.loadOriginPhotoMeta();
            })
            .catch(() => {
                Story.start = null;
                Story.gotStoryMeta = true;
                Story.hasGeodata = false;
            });
    },

    /** Path the the photo of the loaded story. */
    getPhotoPath: (): string | null => {
        let originPhoto: number | string | null = getOriginPhotoId();

        if (originPhoto === null) {
            if (Story.mostRecentPhoto) {
                originPhoto = Story.mostRecentPhoto;
            } else {
                return null;
            }
        }
        return m.buildPathname("/:lang/photo/:id", {
            lang: t.getLang(),
            id: originPhoto,
        });
    },

    /**
     * POST request, 200 if okay, an error code otherwise, no detailed message
     * is received unless there is no request / no story defined at the time of
     * the request.
     */
    applause: (): Promise<(Error & { code: number }) | undefined> => {
        if (Story.folderName === null) {
            return new Promise((resolve, reject) => {
                const error: Error & { code: number } = Object.assign(
                    new Error("Story undefined"),
                    { code: 0 },
                );
                reject(error);
            });
        }
        return m.request<undefined>({
            method: "POST",
            url: "/api/applause",
            body: { type: "story", id: Story.folderName },
        });
    },
};

module.exports = Story;
