export enum LogType {
    info,
    warning,
    error,
}

type LogTypeString = keyof typeof LogType;

export default class CustomLogging {
    private readonly type: string;
    private readonly color: string;
    private readonly fLog: typeof console.log;

    /**
     * Configure the logger style and type.
     * @param type 'info' if not defined. 'error' is intended for exceptions.
     */
    constructor(type?: LogTypeString) {
        switch (type) {
            case "warning":
                this.type = type;
                this.color = "orange";
                this.fLog = console.warn; // skipcq: JS-0002
                break;

            case "error":
                this.type = type;
                this.color = "tomato";
                this.fLog = console.error; // skipcq: JS-0002
                break;

            default:
                this.type = "info";
                this.color = "springgreen";
                this.fLog = console.info; // skipcq: JS-0002
        }
    }

    /**
     * Actually log the message.
     * @param what Message to print in the log.
     * @param err If set, the error will be thrown.
     */
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
            console.trace(); // skipcq: JS-0002
        }
    }
}
