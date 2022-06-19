const paths = require("./paths");
const { readdirSync, readFileSync } = require("fs");

class StoriesPlugin {
    static listStories() {
        const combinedStories = [];
        try {
            const allPhotos = readdirSync(`${paths.build}/content/photos/`);
            allPhotos.sort();
            let prevStory = "";
            let lastStory = undefined;
            for (const dirPhoto of allPhotos) {
                try {
                    const photoMetadata = JSON.parse(
                        readFileSync(
                            `${paths.build}/content/photos/${dirPhoto}/i.json`,
                        ).toString(),
                    );
                    const dirStory = photoMetadata["story"];
                    if (!dirStory) {
                        continue; // photo not linked to any story
                    }
                    const storyMetadata = JSON.parse(
                        readFileSync(
                            `${paths.build}/content/stories/${dirStory}/i.json`,
                        ).toString(),
                    );
                    if (prevStory !== dirStory) {
                        lastStory = {
                            id: dirStory,
                            metadata: storyMetadata,
                            totalPhotos: 1,
                        };
                        combinedStories.push(lastStory);
                    } else if (lastStory) {
                        // TODO: use this information
                        lastStory.totalPhotos += 1;
                    }
                    prevStory = dirStory;
                } catch (err) {
                    console.error(err);
                }
            }
            return combinedStories;
        } catch (err) {
            console.error(err);
            return [];
        }
    }

    apply(compiler) {
        const plugin = { name: this.constructor.name };

        compiler.hooks.compilation.tap(plugin, (compilation) => {
            compilation.hooks.additionalAssets.tapPromise(plugin, () => {
                return new Promise((resolve) => {
                    const s = JSON.stringify(StoriesPlugin.listStories());

                    const source = {
                        source() {
                            return s;
                        },
                        size() {
                            return s.length;
                        },
                    };

                    if (compilation.emitAsset) {
                        compilation.emitAsset("all_stories.json", source);
                    } else {
                        // Remove this after drop support for webpack@4
                        compilation.assets["all_stories.json"] = source;
                    }

                    resolve(s);
                });
            });
        });
    }
}

module.exports = StoriesPlugin;
