import { StoryInfo, ProcessedStoryFile } from "./Story";
import m from "mithril";

const Story = require("../models/Story");

interface OneJsonStory {
    id: string;
    metadata: StoryInfo;
}

export interface OneStory extends OneJsonStory, ProcessedStoryFile {
    loaded: boolean;
    loading: boolean;
}

const AllStories = {
    fullList: [] as OneStory[],
    noOneRequested: true,

    /**
     * Sort two stories based on the start time. The most recent one will be
     * the first in the list. A story without start time will be at the end.
     * @param firstEl One story.
     * @param secondEl An other story.
     */
    sortTwoStories: (firstEl: OneJsonStory, secondEl: OneJsonStory): number => {
        if (firstEl.metadata.start === undefined) {
            return secondEl.metadata.start === undefined ? 0 : 1;
        }
        if (secondEl.metadata.start === undefined) {
            return -1;
        }
        return firstEl.metadata.start < secondEl.metadata.start ? 1 : -1;
    },

    /**
     * Load the JSON file containing the metadata of all stories. The titles,
     * contents, and thumbnails are not yet loaded, this is requested per story
     * with loadOneStory().
     */
    loadFullList: (): void => {
        AllStories.fullList = [];
        AllStories.noOneRequested = true;
        m.request<OneJsonStory[]>({
            method: "GET",
            url: "/all_stories.json",
        }).then((result) => {
            result.sort(AllStories.sortTwoStories);
            for (const oneEntry of result) {
                AllStories.fullList.push({
                    ...oneEntry,
                    loaded: false,
                    loading: false,
                    title: null,
                    content: null,
                });
            }
        });
    },

    /**
     * Loop through all stories in the dataset and stop when the requested one
     * is found. Then start the title and content load flow.
     * @param id Folder name of the story.
     */
    loadOneStory: (id: string): void => {
        AllStories.noOneRequested = false;
        for (const oneStory of AllStories.fullList) {
            if (oneStory.id != id) {
                continue;
            }
            if (oneStory.loaded || oneStory.loading) {
                return;
            }
            oneStory.loading = true;
            Story.getStoryTitleContent(id)
                .then((result: ProcessedStoryFile) => {
                    oneStory.title = result.title;
                    oneStory.content = result.content;
                    oneStory.loaded = true;
                    oneStory.loading = false;
                })
                .catch(() => {
                    oneStory.loaded = true;
                    oneStory.loading = false;
                });
            break;
        }
    },

    /**
     * Reload all already loaded stories. That could happen when the user
     * switches the language. That will not load the stories that were not
     * loaded beforehand.
     */
    reload: (): void => {
        for (const oneStory of AllStories.fullList) {
            if (!oneStory.loaded) {
                continue;
            }
            oneStory.loaded = false;
            oneStory.loading = true;
            oneStory.title = null;
            oneStory.content = null;
            Story.getStoryTitleContent(oneStory.id)
                .then((result: ProcessedStoryFile) => {
                    oneStory.title = result.title;
                    oneStory.content = result.content;
                    oneStory.loaded = true;
                    oneStory.loading = false;
                })
                .catch(() => {
                    oneStory.loaded = true;
                    oneStory.loading = false;
                });
        }
    },
};

module.exports = AllStories;
