import m from "mithril";

import { config } from "../config";
import { t } from "../translate";
import { clearSelection } from "../utils";

/** JSON metadata of the photo. */
export interface PhotoInfo {
    /** Main photo title. */
    title: {
        en: string;
        fi: string;
        fr: string;
    };

    /** The photo description is longer than the title. Not used. */
    description?: {
        en: string;
        fi: string;
        fr: string;
    };

    /** The story folder. No link to the story if this is missing or empty. */
    story?: string;

    /** Date time when the story has been taken, f.i. "2014-07-06T06:02:58" */
    dateTaken?: string;

    /** Focal length in 35mm equivalent. */
    focalLength35mm?: number;

    /** The exposure time as a fraction, f.i. "1/800" */
    exposureTime?: string;

    /** F-number, f.i. 15.4 */
    fNumber?: number;

    /** ISO number. */
    iso?: number;

    /** GPS coordinates. */
    position?: {
        lat: number;
        lon: number;
    };

    /** Each photo folder links to the next one, except the last one. */
    next?: number;

    /** Same logic as "next"... but the other way. */
    prev?: number;
}

/**
 * Process a TRUSTED story file and return the title only.
 */
function mdProcessorTitle(text: string): string | null {
    const titleWords = text.trim().split(/\r?\n/)[0].split(" ");
    if (titleWords[0] !== "#") {
        return null;
    }
    titleWords.shift(); // remove the hashtag
    return titleWords.join(" ");
}

/**
 * Model for managing one photo.
 * @notExported
 */
class Photo {
    /** JSON metadata of the photo. */
    meta: PhotoInfo | null = null;

    /**
     * True if the photo is considered loading.
     * False once the story title is fetched.
     */
    isLoading = true;

    /**
     * True on user action to provide instant feedback even though the photo is
     * really loading after routing and XHR call. Unset synchronised with
     * isLoading.
     */
    isPreloading = true;

    /** Folder containing the photos and JSON file. */
    folderName: number | null = null;

    /** Photo ID. */
    id: number | null = null;

    /**
     * The story title from the Markdown file.
     * Empty string if the title is loading.
     * Null when there is no story linked to the loaded photo.
     */
    storyTitle: string | null = null;

    /**
     * The language of the story title. Used to compare with
     * the language of the photo when switching the language.
     */
    storyLang: string | null = null;

    /** Duration in microseconds of the loading time of the last load. */
    lastLoadingTime: number | null = null;

    /** Link to the current image. */
    currentImageSrc: string | null = null;

    /** Return true if the photo has any metadata available. */
    containsExif(): boolean {
        return this.meta === null
            ? false
            : !!(
                  this.meta.focalLength35mm ||
                  this.meta.exposureTime ||
                  this.meta.fNumber ||
                  this.meta.iso ||
                  this.meta.position
              );
    }

    /**
     * True if the "prev" button should be hidden:
     * no photo or currently the first one.
     */
    isFirst(): boolean {
        if (this.meta !== null) {
            return this.meta.next === undefined;
        } else {
            return true;
        }
    }

    /**
     * True if the "next" button should be hidden:
     * no photo or currently the last one.
     * Use Photo.load(config.lastPhotoId) for loading the last photo.
     */
    isLast(): boolean {
        if (this.meta !== null) {
            return this.meta.prev === undefined;
        } else {
            return true;
        }
    }

    /**
     * Called when the user first visits the website without specifying any
     * photo ID. Load the first photo only if it is the really first time -- if
     * no one photo has already been loaded. Use Photo.load(config.firstPhotoId)
     * for loading the first photo at any time. The history is replaced because
     * the root path is meaningless.
     */
    loadFirst(): void {
        if (this.meta === null) {
            // skipcq: JS-0328
            this.load(config.firstPhotoId).then(() => {
                this.loadNext(true);
            });
        }
    }

    /**
     * Load the story metadata. Once fetched, the interface would be updated
     * consequently. That would trigger an additional onupdate event on which
     * the image is considered loaded.
     */
    loadOriginStoryTitle(): void {
        if (this.meta === null || !this.meta.story) {
            this.storyTitle = null;
            this.isLoading = false;
            this.isPreloading = false;
            m.redraw(); // outside the m.request
            return;
        }

        if (this.storyLang !== t.getLang()) {
            this.storyTitle = ""; // reset
        }
        this.storyLang = t.getLang();

        m.request<string | null>({
            method: "GET",
            url: "/content/stories/:folderName/:lang.md",
            params: {
                folderName: this.meta.story,
                lang: this.storyLang,
            },
            headers: {
                "Content-Type": "text/markdown; charset=utf-8",
                Accept: "text/*",
            },
            extract: (xhr) => {
                if (xhr.status === 200) {
                    return mdProcessorTitle(xhr.responseText);
                } else {
                    return null;
                }
            },
        })
            .then((storyTitle) => {
                this.storyTitle = storyTitle;
                this.isLoading = false;
                this.isPreloading = false;
            })
            .catch(() => {
                this.isLoading = false;
                this.isPreloading = false;
            });
    }

    /**
     * Load a photo at a specific position. The image size depends on the screen
     * size (in pixels). A large photo is loaded if the window height is above
     * 780px. A medium-size photo is loaded otherwise. The loading time is
     * recorded. If it is shorter than 1400 ms and if the photo is large, then
     * the next large photo will be high-def.
     *
     * The photo is in the WebP format, converted from the TIF format.
     * The WebP converter is libwebp-1.2.0-linux-x86-64. The WebP configuration
     * is: `-preset photo -mt -m 6 -q {quality} -af -resize 0 {height}`
     * with `{quality}` = 90 for `t.webp` (thumbnail) and `m.webp`
     * (medium-size), 86 for `l.webp` (large), 98 for `l.hd.webp` (large
     * high-def), and `{height}` = 200 for `t.webp`, 760 for `m.webp`, and 1030
     * for `l(.hd).webp`.
     *
     * Statistics for the 233 photos:
     *
     * * Thumbnail: 4.4 MiB, 19 KiB per photo,
     * * Medium: 43 MiB, 185 KiB per photo,
     * * Large: 56 MiB, 243 KiB per photo,
     * * Large high-def: 130 MiB, 569 KiB per photo.
     *
     * Howto: `find public/content/photos/ -iname 'l.hd.webp' -print0 | du
     * --files0-from - -c -h | sort -h`
     */
    load(id: number): Promise<void> {
        this.isLoading = true;
        this.isPreloading = true;
        return m
            .request<PhotoInfo>({
                method: "GET",
                url: "/content/photos/:folderName/i.json",
                params: {
                    folderName: id,
                },
            })
            .then((result) => {
                const nextImageSrc = this.getImageSrc(id);
                const image = new Image();
                const startTime = performance.now();
                image.onload = () => {
                    this.currentImageSrc = nextImageSrc;
                    this.lastLoadingTime = performance.now() - startTime;
                    // only update the interface when the photo has changed
                    this.meta = result;
                    this.folderName = id;
                    this.id = id;

                    // clicking fast may select the icon, deselect it
                    clearSelection();

                    this.loadOriginStoryTitle();
                };
                image.src = nextImageSrc;
            })
            .catch((error: Error & { code: number }) => {
                if (error.code === 404) {
                    m.route.set(`/${t.getLang()}/lost`);
                } else {
                    throw error;
                }
            });
    }

    /** Return the network-optimized source link of the photo. */
    protected getImageSrc(id: number): string {
        let filename = window.innerHeight > 780 ? "l" : "m";
        if (
            filename === "l" &&
            this.lastLoadingTime &&
            this.lastLoadingTime < 1400
        ) {
            filename += ".hd";
        }
        return `/content/photos/${id}/${filename}.webp`;
    }

    /**
     * Load the previous photo (selected based on the metadata)
     * or the first one if the previous one is not linked.
     */
    loadPrev(): void {
        this.isPreloading = true;
        const prevFolderId =
            this.meta === null || this.meta.next === undefined
                ? config.firstPhotoId
                : this.meta.next;

        m.route.set("/:lang/photo/:title", {
            lang: t.getLang(),
            title: prevFolderId,
        });
    }

    /**
     * Load the next photo (selected based on the metadata)
     * or the first one if the next one is not linked.
     */
    loadNext(replaceHistory = false): void {
        this.isPreloading = true;
        const nextFolderId =
            this.meta === null || this.meta.prev === undefined
                ? config.firstPhotoId
                : this.meta.prev;

        m.route.set(
            "/:lang/photo/:title",
            {
                lang: t.getLang(),
                title: nextFolderId,
            },
            {
                replace: replaceHistory,
            },
        );
    }

    /** Path to the story of the loaded photo or null if not available. */
    getStoryPath(): string | null {
        if (
            this.meta === null ||
            this.meta.story === undefined ||
            this.meta.story === ""
        ) {
            return null;
        }
        return m.buildPathname("/:lang/story/:folderName", {
            lang: t.getLang(),
            folderName: this.meta.story,
            /* key to go back to the photo once in the story page */
            from_photo: this.id,
        });
    }
}

/** This is a shared instance. */
export const photo = new Photo();
