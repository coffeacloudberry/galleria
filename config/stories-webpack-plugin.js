const paths = require("./paths");
const fs = require("fs");
const log = require("webpack-log");

class StoriesPlugin {
    constructor() {
        this.plugin = { name: this.constructor.name };
        this.logger = log({ name: this.constructor.name });
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
            this.logger.error(`Info file missing for ${docId}`);
            throw new Error("Create info file or delete folder.");
        }
        return JSON.parse(fs.readFileSync(file).toString());
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
            console.info(`Missing both ${webtrackFile} and ${gpxFile}`);
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

    /** Metadata needed in the list of stories. */
    static essentialStoryMetadata(storyId, metadata) {
        if (metadata.mostRecentPhoto) {
            return {
                id: storyId,
                metadata: {
                    duration: metadata.duration,
                    season: metadata.season,
                    start: metadata.start,
                    totalPhotos: metadata.totalPhotos,
                    mostRecentPhoto: metadata.mostRecentPhoto,
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

    /** Generate a single story info file. */
    generateStoryInfoFile(storyId) {
        const path = `content/stories/${storyId}/_/i.json`;
        this.emitFile(path, this.storyMetadata[storyId]);
    }

    apply(compiler) {
        compiler.hooks.compilation.tap(this.plugin, (compilation) => {
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
                    const storyMetadata = this.readInfoFile("stories", storyId);
                    if (prevStory !== storyId) {
                        this.addGeodataState(storyId);
                        lastStory = {
                            ...storyMetadata,
                            hasGeodata: this.geodataPerStory[storyId],
                            totalPhotos: 1,
                            mostRecentPhoto: id,
                            geocodedPhotos: [],
                        };
                    } else if (lastStory) {
                        // update
                        lastStory.totalPhotos += 1;
                        lastStory.mostRecentPhoto = id;
                    }
                    if (typeof photoMetadata.position === "object") {
                        lastStory.geocodedPhotos.push({
                            id,
                            position: photoMetadata.position,
                        });
                    }
                    this.storyMetadata[storyId] = lastStory;
                    prevStory = storyId;
                    photoMetadata.storyPhotoIncrement = lastStory.totalPhotos;
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
                        hasGeodata: this.geodataPerStory[storyId],
                        totalPhotos: 0,
                    };
                }
                this.generateStoryInfoFile(storyId);
            }

            const storyList = [];
            // skipcq: JS-D008, JS-0042
            Object.entries(this.storyMetadata).map(([storyId, metadata]) => {
                storyList.push(
                    StoriesPlugin.essentialStoryMetadata(storyId, metadata),
                );
            });
            storyList.sort(StoriesPlugin.sortTwoStories);
            const path = "content/stories/_/all_stories.json";
            this.emitFile(path, storyList);
        });
    }
}

module.exports = StoriesPlugin;
