const paths = require("./paths");
const { readdirSync, readFileSync } = require("fs");

class StoriesPlugin {
    listStories() {
        let combinedStories = [];
        try {
            const allStories = readdirSync(`${paths.build}/content/stories/`);
            for (const dirStory of allStories) {
                try {
                    const storyMetadata = JSON.parse(
                        readFileSync(
                            `${paths.build}/content/stories/${dirStory}/i.json`,
                        ).toString(),
                    );
                    combinedStories.push({
                        id: dirStory,
                        metadata: storyMetadata,
                    });
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
                    let s = JSON.stringify(this.listStories());

                    const source = {
                        source: function () {
                            return s;
                        },
                        size: function () {
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
