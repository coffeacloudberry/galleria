enum LogType {
    warning,
    error,
}

type LogTypeString = keyof typeof LogType;

export default class CustomLogging {
    private readonly type: string;
    private readonly color: string;
    private readonly fLog: typeof console.log;

    constructor(type?: LogTypeString) {
        switch (type) {
            case "warning":
                this.type = type;
                this.color = "orange";
                this.fLog = console.warn;
                break;

            case "error":
                this.type = type;
                this.color = "tomato";
                this.fLog = console.error;
                break;

            default:
                this.type = "info";
                this.color = "springgreen";
                this.fLog = console.info;
        }
    }

    log(what: string, err?: Error): void {
        this.fLog(
            `%cApplication ${this.type}: ${what}`,
            `color: ${this.color};
            font-weight: bold;
            background: black`,
        );
        if (err) {
            throw err;
        } else if (this.type === "error") {
            console.trace();
        }
    }
}
