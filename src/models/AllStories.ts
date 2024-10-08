import m from "mithril";

import { t } from "../translate";
import type { BaseStoryInfo } from "./Story";

export interface OneMetadata extends BaseStoryInfo {
    appetizer: string;
}

/** One story item of the JSON list. */
export interface OneStory {
    /** The folder name. */
    id: string;

    /** The story. */
    metadata: OneMetadata;
}

/** Model for listing stories. */
class AllStories {
    protected _fullList: OneStory[] = [];
    public scrollTop = NaN;

    /** Get all stories and application states. */
    get fullList(): OneStory[] {
        return this._fullList;
    }

    /** Load the JSON file containing the metadata of all stories. */
    loadFullList(): void {
        this._fullList = [];
        m.request<OneStory[]>({
            method: "GET",
            url: "/content/stories/_/all_stories.:lang.json",
            params: {
                lang: t.getLang(),
            },
        }).then((result) => {
            this._fullList = result;
        });
    }
}

/** This is a shared instance. */
export const allStories = new AllStories();
