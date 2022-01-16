import m from "mithril";
import snarkdown from "snarkdown";

import { config } from "../config";
import CustomLogging from "../CustomLogging";
import { t } from "../translate";
import { PhotoInfo } from "./Photo";

const error = new CustomLogging("error");

export interface EasyDate {
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

export type SeasonStrings = keyof typeof Season;

export enum MapTheme {
    default,
    darkSnow,
    whiteSnow,
}

export type MapThemeStrings = keyof typeof MapTheme;

/** GPS model and configuration */
export interface GpsConfig {
    /**
     * Example: 'Garmin 64sc' or 'Garmin 66sr'
     */
    model: string;

    /**
     * Single-band: false, multi-band: true
     */
    multiBandEnabled: boolean;

    /**
     * GPS only: false, GPS+others: true
     * Other constellations include:
     * * GLONASS (64sc + 66sr)
     * * GALILEO (64sc + 66sr)
     * * QZSS (66sr)
     * * IRNSS (66sr)
     */
    multiGNSSEnabled: boolean;

    /**
     * Use Wide Area Augmentation System/European Geostationary Navigation
     * Overlay Service (WAAS/EGNOS) data.
     * WAAS/EGNOS is not available on the multi-band Garmin GPSMAP 66sr.
     */
    waasEgnosEnabled: boolean;
}

/** Default GPS configuration when no details are provided in the JSON file. */
const defaultGpsConfig = [
    {
        model: "Garmin 64sc",
        multiBandEnabled: false,
        multiGNSSEnabled: true,
        waasEgnosEnabled: false,
    },
];

/** Structure of the JSON file. */
export interface StoryInfo {
    /** Start date in the YYYY-MM-DD format. */
    start?: string;

    /** Trip duration in days. Can be half. */
    duration?: number;

    /**
     * The meteorological season, which depend not only on the start date,
     * but also the hemisphere.
     */
    season?: SeasonStrings;

    /** True if there is a WebTrack to load. */
    hasGeodata?: boolean;

    /** The theme used for the map if the story has geodata. */
    mapTheme?: MapThemeStrings;

    /** Photo folder name of the latest photo taken on that trip. */
    mostRecentPhoto?: string;

    /**
     * GPS model and configuration. Such information is not included in the
     * GPX file, therefore not included in the WebTrack metadata.
     * This config is skipped if hasGeodata is false.
     */
    gpsConfig?: GpsConfig[];
}

/** Based on the Markdown file. */
export interface ProcessedStoryFile {
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

/**
 * Model handling one story.
 * @notExported
 */
class Story {
    /** Story title retrieved from the Markdown file. */
    title: string | null = null;

    /** Story content (without title) retrieved from the Markdown file. */
    content: string | null = null;

    /** Start date retrieved from the JSON file. */
    start: EasyDate | null = null;

    /** Total number of days, retrieved from the JSON file. */
    duration: number | null = null;

    /** Local season retrieved from the JSON file. */
    season: SeasonStrings | null = null;

    /** True if the story contains a WebTrack, based on the JSON file. */
    hasGeodata = false;

    /** The map theme used if the story has geodata. */
    mapTheme: MapThemeStrings = "default";

    /** The most recent photo ID of the story, based on the JSON file. */
    mostRecentPhoto: string | null = null;

    /** GPS model and configuration, based on the JSON file or default conf. */
    gpsConfig: GpsConfig[] | null = null;

    /** Folder name of the story. */
    folderName: string | null = null;

    /** True if the story title and content has been fetched and processed. */
    gotContent = false;

    /** True if the JSON file has been fetched and processed. */
    gotStoryMeta = false;

    /** JSON file of the linked photo. */
    originPhotoMeta: PhotoInfo | null = null;

    /** True if the user applauded and is waiting for a confirmation. */
    isApplauding = false;

    /** True if a story is available. */
    isLoaded(): boolean {
        return this.gotContent && this.gotStoryMeta;
    }

    /** Static method converting a string date like 2020-10-25. */
    strToEasyDate(strDate: string): EasyDate | null {
        if (!strDate) {
            return null;
        }
        try {
            const [year, month, day] = strDate.split("-");
            return {
                day: parseInt(day),
                month: parseInt(month),
                year: parseInt(year),
            };
        } catch {
            return null;
        }
    }

    /** Static method fetching the story title and content. */
    getStoryTitleContent(folderName: string): Promise<ProcessedStoryFile> {
        return new Promise((resolve, reject) => {
            m.request<ProcessedStoryFile>({
                method: "GET",
                url: "/content/stories/:folderName/:lang.md",
                params: {
                    folderName,
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
            })
                .then((result) => {
                    if (!result.title || !result.content) {
                        reject();
                    }
                    resolve(result);
                })
                .catch(reject);
        });
    }

    /**
     * The origin photo ID is provided by the URL parameter. If not found, it
     * would be the default photo of the story based on the metadata file.
     * Load the origin photo metadata to be asynchronously inserted in the
     * story page.
     */
    loadOriginPhotoMeta(): void {
        let originPhotoId = getOriginPhotoId();
        if (originPhotoId === null) {
            if (this.mostRecentPhoto === null) {
                return;
            }
            originPhotoId = parseInt(this.mostRecentPhoto);
        }
        m.request<PhotoInfo>({
            method: "GET",
            url: "/content/photos/:folderName/i.json",
            params: {
                folderName: originPhotoId,
            },
        }).then((result) => {
            this.originPhotoMeta = result;
        });
    }

    /** Load the story identified by its ID, or do nothing if not existing. */
    reload(): void {
        if (this.folderName) {
            this.load(this.folderName);
        }
    }

    /** Load a story from a specific folder (fields are null if not found). */
    load(folderName: string): void {
        this.isApplauding = false;
        this.gotContent = false;
        this.gotStoryMeta = false;
        this.originPhotoMeta = null;
        this.folderName = folderName;
        this.getStoryTitleContent(folderName)
            .then((result) => {
                this.title = result.title;
                this.content = result.content;
                this.gotContent = true;
            })
            .catch(() => {
                m.route.set(
                    `/${t.getLang()}/lost`,
                    {},
                    {
                        replace: true,
                    },
                );
            });
        m.request<StoryInfo>({
            method: "GET",
            url: "/content/stories/:folderName/i.json",
            params: {
                folderName,
            },
        })
            .then((result) => {
                if (result.start) {
                    this.start = this.strToEasyDate(result.start);
                } else {
                    this.start = null;
                }
                if (result.season !== undefined) {
                    if (Season[result.season] !== undefined) {
                        this.season = result.season;
                    } else {
                        error.log(`Unknown season '${result.season}'`);
                        this.season = null;
                    }
                } else {
                    this.season = null;
                }
                this.duration = result.duration || null;
                this.hasGeodata = result.hasGeodata || false;
                this.mostRecentPhoto = result.mostRecentPhoto || null;
                if (this.hasGeodata) {
                    this.gpsConfig = result.gpsConfig || defaultGpsConfig;
                } else {
                    this.gpsConfig = null;
                }
                if (result.mapTheme && MapTheme[result.mapTheme]) {
                    this.mapTheme = result.mapTheme;
                } else {
                    this.mapTheme = "default";
                }
                this.gotStoryMeta = true;
                this.loadOriginPhotoMeta();
            })
            .catch(() => {
                this.start = null;
                this.gotStoryMeta = true;
                this.hasGeodata = false;
            });
    }

    /** Path the the photo of the loaded story. */
    getPhotoPath(): string | null {
        let originPhoto: number | string | null = getOriginPhotoId();

        if (originPhoto === null) {
            if (this.mostRecentPhoto) {
                originPhoto = this.mostRecentPhoto;
            } else {
                return null;
            }
        }
        return m.buildPathname("/:lang/photo/:id", {
            lang: t.getLang(),
            id: originPhoto,
        });
    }

    /**
     * This method is pseudo-static. Static if the folder name is given,
     * otherwise the folder name of the current story would be used.
     * POST request, 200 if okay, an error code otherwise, no detailed message
     * is received unless there is no request / no story defined at the time of
     * the request.
     */
    applause(folderName?: string): Promise<void> {
        const actualFolderName = folderName || this.folderName;
        if (!actualFolderName) {
            return new Promise((resolve, reject) => {
                const err: Error & { code: number } = Object.assign(
                    new Error("Story undefined"),
                    { code: 0 },
                );
                reject(err);
            });
        }
        this.isApplauding = true;
        return new Promise((resolve, reject) => {
            m.request<undefined>({
                method: "POST",
                url: "/api/applause",
                body: { type: "story", id: actualFolderName },
            })
                .then(() => {
                    this.isApplauding = false;
                    resolve();
                })
                .catch((err: Error & { code: number }) => {
                    this.isApplauding = false;
                    reject(err);
                });
        });
    }
}

/** This is a shared instance. */
export const story = new Story();
