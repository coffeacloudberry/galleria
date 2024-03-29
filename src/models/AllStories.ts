import m from "mithril";

import { ProcessedStoryFile, Story, StoryInfo } from "./Story";

/** One story item of the JSON list. */
interface OneJsonStory {
    /** The folder name. */
    id: string;

    /** The story metadata, that is everything but the markdown story. */
    metadata: StoryInfo | null;

    /** The amount of photos linked to that story. Can be 1 or more. */
    totalPhotos: number;
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
    public scrollTop = NaN;

    /** Get all stories and application states. */
    get fullList(): OneStory[] {
        return this._fullList;
    }

    /** Return true if no one markdown story has started to load. */
    noOneRequested(): boolean {
        return !this._fullList.some((element) => {
            return element.loaded || element.loading;
        });
    }

    /**
     * Load the JSON file containing the metadata of all stories. The titles,
     * contents, and thumbnails are not yet loaded, this is requested per story
     * with loadOneStory().
     */
    loadFullList(): void {
        this._fullList = [];
        m.request<OneJsonStory[]>({
            method: "GET",
            url: "/content/stories/_/all_stories.json",
        }).then((result) => {
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
    loadOneStory(id: string): Promise<ProcessedStoryFile> {
        return new Promise<ProcessedStoryFile>((resolve, reject) => {
            let theStory: OneStory | null = null;
            for (const oneStory of this.fullList) {
                if (oneStory.id !== id) {
                    continue;
                }
                if (oneStory.loaded || oneStory.loading) {
                    resolve(oneStory);
                    return;
                }
                oneStory.loading = true;
                theStory = oneStory;
                break;
            }

            // empty or corrupted full list, add unlisted story
            if (theStory === null) {
                theStory = {
                    id,
                    metadata: null,
                    totalPhotos: 0,
                    loaded: false,
                    loading: true,
                    title: null,
                    content: null,
                };
                // append without sorting because the current loadFullList()
                // implementation reset the list and fill it in order
                this.fullList.push(theStory);
            }

            Story.getStoryTitleContent(id)
                .then((result: ProcessedStoryFile) => {
                    if (theStory) {
                        AllStories.onPromiseThen(result, theStory);
                        resolve(result);
                    }
                    reject(new Error("Expected story"));
                })
                .catch((error) => {
                    if (theStory) {
                        AllStories.onPromiseCatch(theStory);
                    }
                    reject(error);
                });
        });
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
            Story.getStoryTitleContent(oneStory.id)
                .then((result: ProcessedStoryFile) => {
                    AllStories.onPromiseThen(result, oneStory);
                })
                .catch(() => {
                    AllStories.onPromiseCatch(oneStory);
                });
        }
    }

    /** Remove the language-specific information (title and content) from all
     * stories, which can be used when switching language.
     */
    unload(): void {
        this.fullList.forEach((oneStory) => {
            oneStory.loaded = false;
            oneStory.loading = false;
            oneStory.title = null;
            oneStory.content = null;
        });
    }
}

/** This is a shared instance. */
export const allStories = new AllStories();
