import m from "mithril";

import { ProcessedStoryFile, StoryInfo, story } from "./Story";

/** One story item of the JSON list. */
interface OneJsonStory {
    /** The folder name. */
    id: string;

    /** The story metadata, that is everything but the markdown story. */
    metadata: StoryInfo;
}

/** The story metadata and content, plus the application state. */
export interface OneStory extends OneJsonStory, ProcessedStoryFile {
    /** True if the markdown story (title and content) has been fetched. */
    loaded: boolean;

    /** True when downloading and processing the markdown story. */
    loading: boolean;
}

/**
 * Model for listing stories.
 * @notExported
 */
class AllStories {
    protected _fullList: OneStory[] = [];
    protected _noOneRequested = true;

    /** Get all stories and application states. */
    get fullList(): OneStory[] {
        return this._fullList;
    }

    /** Return true if no one markdown story has started to load. */
    get noOneRequested(): boolean {
        return this._noOneRequested;
    }

    /**
     * Sort two stories based on the start time. The most recent one will be
     * the first in the list. A story without start time will be at the end.
     * @param firstEl One story.
     * @param secondEl An other story.
     */
    static sortTwoStories(
        firstEl: OneJsonStory,
        secondEl: OneJsonStory,
    ): number {
        if (firstEl.metadata.start === undefined) {
            return secondEl.metadata.start === undefined ? 0 : 1;
        }
        if (secondEl.metadata.start === undefined) {
            return -1;
        }
        return firstEl.metadata.start < secondEl.metadata.start ? 1 : -1;
    }

    /**
     * Load the JSON file containing the metadata of all stories. The titles,
     * contents, and thumbnails are not yet loaded, this is requested per story
     * with loadOneStory().
     */
    loadFullList(): void {
        this._fullList = [];
        this._noOneRequested = true;
        m.request<OneJsonStory[]>({
            method: "GET",
            url: "/all_stories.json",
        }).then((result) => {
            // skipcq: JS-0387
            result.sort(AllStories.sortTwoStories);
            for (const oneEntry of result) {
                this.fullList.push({
                    ...oneEntry,
                    loaded: false,
                    loading: false,
                    title: null,
                    content: null,
                });
            }
        });
    }

    /** When the story title and content has been successfully retrieved. */
    private static onPromiseThen(
        result: ProcessedStoryFile,
        oneStory: OneStory,
    ): void {
        oneStory.title = result.title;
        oneStory.content = result.content;
        oneStory.loaded = true;
        oneStory.loading = false;
    }

    /** When the story title and content has failed to be retrieved. */
    private static onPromiseCatch(oneStory: OneStory): void {
        oneStory.loaded = true;
        oneStory.loading = false;
    }

    /**
     * Loop through all stories in the dataset and stop when the requested one
     * is found. Then start the title and content load flow.
     * @param id Folder name of the story.
     */
    loadOneStory(id: string): void {
        this._noOneRequested = false;
        for (const oneStory of this.fullList) {
            if (oneStory.id != id) {
                continue;
            }
            if (oneStory.loaded || oneStory.loading) {
                return;
            }
            oneStory.loading = true;
            story
                .getStoryTitleContent(id)
                .then((result: ProcessedStoryFile) => {
                    AllStories.onPromiseThen(result, oneStory);
                })
                .catch(() => {
                    AllStories.onPromiseCatch(oneStory);
                });
            break;
        }
    }

    /**
     * Reload all already loaded stories. That could happen when the user
     * switches the language. That will not load the stories that were not
     * loaded beforehand.
     */
    reload(): void {
        for (const oneStory of this.fullList) {
            if (!oneStory.loaded) {
                continue;
            }
            oneStory.loaded = false;
            oneStory.loading = true;
            oneStory.title = null;
            oneStory.content = null;
            story
                .getStoryTitleContent(oneStory.id)
                .then((result: ProcessedStoryFile) => {
                    AllStories.onPromiseThen(result, oneStory);
                })
                .catch(() => {
                    AllStories.onPromiseCatch(oneStory);
                });
        }
    }
}

/** This is a shared instance. */
export const allStories = new AllStories();
