import m from "mithril";

export interface EntryPhoto {
    id: number;
    timestamp: number;
}

function processEntryPhoto(entry: string): EntryPhoto {
    const [id, timestamp] = entry.split(":");
    return { id: parseInt(id), timestamp: parseInt(timestamp) };
}

export interface EntryStory {
    id: string;
    timestamp: number;
}

function processEntryStory(entry: string): EntryStory {
    const [id, timestamp] = entry.split(":");
    return { id: id, timestamp: parseInt(timestamp) };
}

export interface ApplauseList {
    photo: EntryPhoto[] | null;
    story: EntryStory[] | null;
}

const Admin = {
    applause: { photo: null, story: null } as ApplauseList,
    authorized: null as boolean | null,
    password: null as string | null,

    fetchStats: (): void => {
        const credentials = `user:${Admin.password}`;
        m.request<{ photo: string[]; story: string[] }>({
            method: "GET",
            url: "/api/applause",
            headers: {
                Authorization: "Basic " + window.btoa(credentials),
            },
        })
            .then((data) => {
                data.photo.forEach((entry) => {
                    const processedEntry = processEntryPhoto(entry);
                    if (Admin.applause.photo === null) {
                        Admin.applause.photo = [processedEntry];
                    } else {
                        Admin.applause.photo.push(processedEntry);
                    }
                });
                data.story.forEach((entry) => {
                    const processedEntry = processEntryStory(entry);
                    if (Admin.applause.story === null) {
                        Admin.applause.story = [processedEntry];
                    } else {
                        Admin.applause.story.push(processedEntry);
                    }
                });
                Admin.authorized = true;
            })
            .catch((error) => {
                if (error.code === 401) {
                    Admin.authorized = false;
                }
            });
    },
};

module.exports = Admin;
