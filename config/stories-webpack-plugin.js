import fs from "fs";

import languages from "../src/languages.json" with { type: "json" };
import paths from "./paths.js";
import snarkdown from "./snarkdown.js";

export default class StoriesPlugin {
    constructor() {
        this.plugin = { name: this.constructor.name };
        this.rootDir = paths.build;

        // paths to real folders (manually created):
        this.pathAllPhotos = `${this.rootDir}/content/photos`;
        this.pathAllStories = `${this.rootDir}/content/stories`;

        // cache to reduce the amount of file accesses
        this.geodataPerStory = {};
        this.allPhotos = [];
        this.allStories = [];
    }

    /** Get list of photo IDs. */
    getAllPhotos() {
        if (this.allPhotos.length === 0) {
            this.allPhotos = fs
                .readdirSync(this.pathAllPhotos)
                .filter((v) => !v.startsWith("_"));
            this.allPhotos.sort();
        }
        return this.allPhotos;
    }

    /** Get list of story IDs. */
    getAllStories() {
        if (this.allStories.length === 0) {
            this.allStories = fs
                .readdirSync(this.pathAllStories)
                .filter((v) => !v.startsWith("_"));
        }
        return this.allStories;
    }

    /** Read the manually written info file from a story or a photo. */
    readInfoFile(folderType, docId) {
        const file = `${this.rootDir}/content/${folderType}/${docId}/i.json`;
        if (!fs.existsSync(file)) {
            console.error(`Info file missing for ${docId}`);
            throw new Error("Create info file or delete folder.");
        }
        try {
            return JSON.parse(fs.readFileSync(file).toString());
        } catch (e) {
            if (e instanceof SyntaxError) {
                throw new Error(`Failed to parse JSON file for ${docId}: ${e.message}`);
            }
        }
    }

    /**
     * Prints an error if the story contains a GPX file but no Webtrack.
     * Prints a warning if the story contains a Webtrack file but no GPX.
     * Prints an info if the story does not contain Webtrack/GPX.
     * Return true if the story contains a webtrack.
     */
    storyContainsWebtrack(storyId) {
        const file = `${this.pathAllStories}/${storyId}/${storyId}.`;
        const gpxFile = `${file}gpx`;
        const hasGpx = fs.existsSync(gpxFile);
        const webtrackFile = `${file}webtrack`;
        const hasWebtrack = fs.existsSync(webtrackFile);
        if (!hasWebtrack && !hasGpx) {
            console.info(`Missing WebTrack+GPX for ${storyId}`);
        } else if (hasWebtrack && !hasGpx) {
            console.warn(`Got ${webtrackFile} without ${gpxFile}`);
        } else if (hasGpx && !hasWebtrack) {
            console.error(`Got ${gpxFile} without ${webtrackFile}`);
        }
        return hasWebtrack;
    }

    /** Emit a new asset. */
    emitFile(path, contentObject) {
        this.compilation.hooks.additionalAssets.tapPromise(this.plugin, () => {
            return new Promise((resolve) => {
                const out_str = JSON.stringify(contentObject);
                const source = {
                    source() {
                        return out_str;
                    },
                    size() {
                        return out_str.length;
                    },
                };
                this.compilation.emitAsset(path, source);
                resolve(out_str);
            });
        });
    }

    /**
     * Sort two stories based on the start time. The most recent one will be
     * the first in the list. A story without start time will be at the end.
     * @param firstEl One story.
     * @param secondEl An other story.
     */
    static sortTwoStories(firstEl, secondEl) {
        if (firstEl.metadata === null || secondEl.metadata === null) {
            return 0;
        }
        if (typeof firstEl.metadata.start === "undefined") {
            return typeof secondEl.metadata.start === "undefined" ? 0 : 1;
        }
        if (typeof secondEl.metadata.start === "undefined") {
            return -1;
        }
        return firstEl.metadata.start < secondEl.metadata.start ? 1 : -1;
    }

    /** Add geodata state to a story if needed. */
    addGeodataState(storyId) {
        if (this.geodataPerStory[storyId] === undefined) {
            this.geodataPerStory[storyId] = this.storyContainsWebtrack(storyId);
        }
    }

    /** Keep only the first few words of a text. */
    static cutText(longText) {
        let cutPosition = 280;
        // cut to the first characters minus the last word,
        // which is probably cut
        while (longText[cutPosition] !== " " && cutPosition) {
            cutPosition--;
        }
        return longText.slice(0, cutPosition);
    }

    /**
     * Cut the text and replace all HTML tags to whitespaces.
     * It is easier to remove HTML tags than Markdown elements, that is why the
     * Markdown story is converted to HTML beforehand.
     * Titles in the content are removed. The multi-line text is transformed
     * to one line by replacing paragraph jumps into whitespaces.
     */
    static cleanUpText(longText) {
        const cleanText = longText
            .replace(/<h\d>[^<]*<\/h\d>/g, "")
            .replace(/<\/p>\n*<p>/g, " ")
            .replace(/<[^<>]*>/g, "");
        if (cleanText.length < 80) {
            return cleanText;
        }
        const result = StoriesPlugin.cutText(cleanText).trim();
        return result + "...";
    }

    /** Metadata needed in the list of stories. */
    static essentialStoryMetadata(storyId, metadata, slug) {
        const title = metadata.lang[slug].title;
        const appetizer = StoriesPlugin.cleanUpText(
            metadata.lang[slug].content,
        );
        if (metadata.mostRecentPhoto) {
            return {
                id: storyId,
                metadata: {
                    duration: metadata.duration,
                    season: metadata.season,
                    start: metadata.start,
                    totalPhotos: metadata.totalPhotos,
                    mostRecentPhoto: metadata.mostRecentPhoto,
                    activities: metadata.activities,
                    title,
                    appetizer,
                },
            };
        }
        return {
            id: storyId,
            metadata: {
                duration: metadata.duration,
                season: metadata.season,
                start: metadata.start,
                totalPhotos: 0,
                activities: metadata.activities,
                title,
                appetizer,
            },
        };
    }

    /** Add the total photos on the album to the photo metadata. */
    addTotalToPhoto(photoData) {
        if (photoData.story) {
            return {
                ...photoData,
                photosInStory: this.storyMetadata[photoData.story].totalPhotos,
            };
        }
        return photoData;
    }

    /** Generate all photo info files. All at once, when totals are known. */
    generatePhotoInfoFiles(genPhotos) {
        for (const photoId of this.getAllPhotos()) {
            const path = `content/photos/${photoId}/_/i.json`;
            this.emitFile(path, this.addTotalToPhoto(genPhotos[photoId]));
        }
    }

    /** Process a story file and return the title separated from the content. */
    static mdProcessor(text, language) {
        let blocks = text.trim().split(/(?:\r?\n){2,}/);

        // the story title is excluded from the content
        const titleWords = blocks[0].split(/\r?\n/)[0].split(" ");
        if (titleWords[0] !== "#") {
            return { title: null, content: null };
        }

        titleWords.shift(); // remove the hashtag
        blocks.shift(); // remove the story title

        blocks = blocks.map((l) =>
            [" ", "\t", "#", "- ", "* "].some((ch) => l.startsWith(ch))
                ? snarkdown(l, language)
                : `<p>${snarkdown(l, language)}</p>`,
        );

        return {
            title: titleWords.join(" "),
            content: blocks.join(""),
        };
    }

    /** Process the Markdown files to return titles and content for all languages. */
    processMd(storyId) {
        const content = {};
        for (const { slug } of languages) {
            const story = `${this.pathAllStories}/${storyId}/${slug}.md`;
            if (!fs.existsSync(story)) {
                console.error(`Story file missing for ${storyId}`);
                throw new Error("Create story file or delete folder.");
            }
            content[slug] = StoriesPlugin.mdProcessor(
                fs.readFileSync(story).toString(),
                slug,
            );
        }
        return content;
    }

    /** Generate one story info file per language. */
    generateStoryInfoFile(storyId) {
        for (const { slug } of languages) {
            const path = `content/stories/${storyId}/_/i.${slug}.json`;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { lang, ...metadata } = this.storyMetadata[storyId];
            const content = {
                ...metadata,
                ...this.storyMetadata[storyId].lang[slug],
            };
            this.emitFile(path, content);
        }
    }

    /** Log the list of activities from all stories. */
    static printActivities(storyList) {
        const unique_activities = new Set([
            "walk",
            ...storyList.flatMap((entry) => entry.metadata.activities),
        ]);
        const all_activities = [...unique_activities]
            .filter((e) => e)
            .join(", ");
        console.info(`All activities are: ${all_activities}`);
    }

    apply(compiler) {
        compiler.hooks.compilation.tap(
            this.plugin,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            (compilation, compilationParams) => {
                // keep watching for updates to stories or photo metadata
                compilation.contextDependencies.add(this.rootDir);
            },
        );
        compiler.hooks.thisCompilation.tap(
            this.plugin,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            (compilation, compilationParams) => {
                const genPhotos = {};
                this.storyMetadata = {};
                this.compilation = compilation;
                let prevStory = "";
                let lastStory = null;
                for (const photoId of this.getAllPhotos()) {
                    const id = parseInt(photoId, 10);
                    const photoMetadata = this.readInfoFile("photos", photoId);
                    const storyId = photoMetadata.story;
                    if (storyId) {
                        const storyMetadata = this.readInfoFile(
                            "stories",
                            storyId,
                        );
                        if (prevStory !== storyId) {
                            this.addGeodataState(storyId);
                            lastStory = {
                                ...storyMetadata,
                                lang: this.processMd(storyId),
                                hasGeodata: this.geodataPerStory[storyId],
                                totalPhotos: 1,
                                mostRecentPhoto: id,
                                photos: [],
                            };
                        } else if (lastStory) {
                            // update
                            lastStory.totalPhotos += 1;
                            lastStory.mostRecentPhoto = id;
                        }
                        if (typeof photoMetadata.position === "object") {
                            lastStory.photos.push({
                                id,
                                position: photoMetadata.position,
                            });
                        } else {
                            lastStory.photos.push({
                                id,
                            });
                        }
                        this.storyMetadata[storyId] = lastStory;
                        prevStory = storyId;
                        photoMetadata.storyPhotoIncrement =
                            lastStory.totalPhotos;
                    }
                    genPhotos[photoId] = photoMetadata;
                }
                this.generatePhotoInfoFiles(genPhotos);

                for (const storyId of this.getAllStories()) {
                    if (!this.storyMetadata[storyId]) {
                        // In case a story has no photo
                        this.addGeodataState(storyId);
                        this.storyMetadata[storyId] = {
                            ...this.readInfoFile("stories", storyId),
                            lang: this.processMd(storyId),
                            hasGeodata: this.geodataPerStory[storyId],
                            totalPhotos: 0,
                        };
                    }
                    this.generateStoryInfoFile(storyId);
                }

                let storyList = [];
                for (const { slug } of languages) {
                    storyList = [];
                    // skipcq: JS-D008, JS-0042
                    Object.entries(this.storyMetadata).map(
                        ([storyId, metadata]) => {
                            storyList.push(
                                StoriesPlugin.essentialStoryMetadata(
                                    storyId,
                                    metadata,
                                    slug,
                                ),
                            );
                        },
                    );
                    storyList.sort(StoriesPlugin.sortTwoStories);
                    const path = `content/stories/_/all_stories.${slug}.json`;
                    this.emitFile(path, storyList);
                }
                StoriesPlugin.printActivities(storyList);
            },
        );
    }
}
