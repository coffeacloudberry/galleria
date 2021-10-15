import m from "mithril";
import { injectCode } from "../utils";
import { EntryPhoto, EntryStory } from "../models/Admin";
import { config } from "../config";
import type { TooltipItem } from "chart.js";
declare const Chart: typeof import("chart.js");

const Admin = require("../models/Admin");

interface DatasetElement {
    x: number;
    y: number;
}

class LoginForm implements m.ClassComponent {
    isLoading = false;

    submitForm(e: Event): void {
        this.isLoading = true;
        e.preventDefault();
        Admin.fetchStats();
    }

    updateInput(e: { target: HTMLInputElement }): void {
        Admin.password = e.target.value;
    }

    view(): m.Vnode {
        if (this.isLoading) {
            return m("p", "Authenticating...");
        } else {
            return m(
                "form#login",
                {
                    onsubmit: (e: Event) => {
                        this.submitForm(e);
                    },
                },
                [
                    m("label", "Password"),
                    m("input[type=password]", {
                        oninput: (e: { target: HTMLInputElement }) => {
                            this.updateInput(e);
                        },
                    }),
                    m("p", m("button[type=submit]", "OK")),
                ],
            );
        }
    }
}

/**
 * Login form. Request restricted data on submit.
 * If the authorization succeeded, the charts are displayed. An 'Access Denied'
 * message is displayed otherwise.
 */
const Login: m.Component = {
    view(): m.Vnode {
        return m(
            ".container",
            m(
                ".row",
                m(".one.column", [
                    m("h1", "Super Space"),
                    Admin.authorized === null
                        ? m(LoginForm)
                        : m("p.critical-error", "Access Denied"),
                ]),
            ),
        );
    },
};

/** Cast the unknown raw type as any if the x,y fields exist, or return null. */
function withXYOrNull(el: any): any {
    return "x" in el && "y" in el ? el : null;
}

/**
 * Fill in the two canvases (photos and stories stats).
 * Skip the drawing if there is no data available for a specific canvas.
 */
class Charts implements m.ClassComponent {
    hasPhotoApplause = false;
    hasStoryApplause = false;

    createChart(
        ctx: CanvasRenderingContext2D | null,
        applauseData: (EntryPhoto | EntryStory)[],
        min: number,
        max: number,
        mediaType: string,
        backgroundColor: string,
        borderColor: string,
    ): void {
        if (ctx === null) {
            return;
        }
        const data: DatasetElement[] = [];
        if (applauseData !== null) {
            for (let i = 0; i < applauseData.length; i++) {
                data[i] = {
                    x: applauseData[i].timestamp,
                    y: i,
                };
            }
        }
        const myChartConfig: Record<string, any> = {
            type: "line",
            data: {
                datasets: [
                    {
                        label: `${mediaType} Applause`,
                        data: data,
                    },
                ],
            },
            options: {
                scales: {
                    x: {
                        type: "linear",
                        position: "bottom",
                        display: false,
                        min: min,
                        max: max,
                    },
                    y: {
                        type: "linear",
                        position: "left",
                        display: true,

                        grid: {
                            drawOnChartArea: false,
                        },
                    },
                },
                interaction: {
                    intersect: false,
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (
                                tooltipItem: TooltipItem<"line">,
                            ): string => {
                                const raw = withXYOrNull(tooltipItem.raw);
                                if (raw === null) {
                                    return "";
                                }
                                const t = new Date(raw.x * 1000);
                                return `${t.toLocaleDateString(undefined, {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })} at ${t.toLocaleTimeString(undefined, {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}`;
                            },
                            title: (
                                tooltipItems: TooltipItem<"line">[],
                            ): string => {
                                const raw = withXYOrNull(tooltipItems[0].raw);
                                return raw === null ? "" : `Total: ${raw.y}`;
                            },
                        },
                        displayColors: false,
                    },
                },

                fill: true,
                backgroundColor: backgroundColor,
                borderWidth: 1,
                borderColor: borderColor,
                animation: false,

                // resize the canvas when the container does
                responsive: true,

                // do not keep the original / meaningless ratio
                maintainAspectRatio: false,
            },
        };

        Chart.defaults.font.family = "MyBodyFont";
        Chart.defaults.font.size = 14;
        // @ts-ignore
        const _chartInstance = new Chart.Chart(ctx, myChartConfig);
    }

    oncreate(): void {
        const photos = Admin.applause.photo;
        const stories = Admin.applause.story;
        this.hasPhotoApplause = photos !== null;
        this.hasStoryApplause = stories !== null;
        if (!this.hasPhotoApplause && !this.hasStoryApplause) {
            return;
        }
        injectCode(config.chart.js).then(() => {
            (async () => {
                const Chart = await import("chart.js");
                let tMin: number;
                let tMax: number;

                if (!this.hasPhotoApplause) {
                    tMin = stories[0].timestamp;
                    tMax = stories[stories.length - 1].timestamp;
                } else if (!this.hasStoryApplause) {
                    tMin = photos[0].timestamp;
                    tMax = photos[photos.length - 1].timestamp;
                } else {
                    tMin = Math.min(photos[0].timestamp, stories[0].timestamp);
                    tMax = Math.max(
                        photos[photos.length - 1].timestamp,
                        stories[stories.length - 1].timestamp,
                    );
                }
                const tRangeP = (tMax - tMin) * 0.05;
                const chartTMin = tMin - tRangeP;
                const chartTMax = tMax + tRangeP;

                if (this.hasPhotoApplause) {
                    const canvas = document.getElementById(
                        "chart-photo",
                    ) as HTMLCanvasElement;
                    this.createChart(
                        canvas.getContext("2d"),
                        Admin.applause.photo,
                        chartTMin,
                        chartTMax,
                        "Photo",
                        "rgba(0,166,255,0.42)",
                        "rgba(34,81,104,0.42)",
                    );
                }

                if (this.hasStoryApplause) {
                    const canvas = document.getElementById(
                        "chart-story",
                    ) as HTMLCanvasElement;
                    this.createChart(
                        canvas.getContext("2d"),
                        Admin.applause.story,
                        chartTMin,
                        chartTMax,
                        "Story",
                        "rgba(0,255,25,0.42)",
                        "rgba(39,144,49,0.42)",
                    );
                }
            })();
        });
    }

    view(): m.Vnode {
        return m(
            ".container",
            m(
                ".row",
                m(".one.column", [
                    m("h1", "Statistics"),
                    m(".stats-container", m("canvas#chart-photo")),
                    m(".stats-container", m("canvas#chart-story")),
                ]),
            ),
        );
    }
}

/** Password protected page. */
export default function AdminPage(): m.Component {
    return {
        oncreate(): void {
            document.title = "Admin";
        },
        view(): m.Vnode {
            return m(
                "section",
                Admin.authorized === true ? m(Charts) : m(Login),
            );
        },
    };
}
