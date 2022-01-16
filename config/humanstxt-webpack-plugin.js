// More info about humans.txt at https://humanstxt.org/

class HumanstxtPlugin {
    constructor(options = {}) {
        this.options = Object.assign(
            {},
            {
                team: [
                    {
                        type: "Chef",
                        name: "Juanjo Bernabeu",
                        twitter: "juanjobernabeu",
                    },
                ],
                languages: ["Català", "Czech", "Deutsch", "English"],
            },
            options,
        );
    }

    apply(compiler) {
        const plugin = { name: this.constructor.name };

        compiler.hooks.compilation.tap(plugin, (compilation) => {
            compilation.hooks.additionalAssets.tapPromise(plugin, () => {
                return new Promise((resolve) => {
                    let s = "/* TEAM */\n";
                    this.options.team.forEach((teamMember) => {
                        s += `\t${teamMember.type}: ${teamMember.name}\n`;

                        if (teamMember.twitter) {
                            s += `\tTwitter: @${teamMember.twitter}\n`;
                        }
                        s += "\n";
                    });

                    s += "/* SITE */\n";
                    const date = new Date()
                        .toISOString()
                        .split("T")[0]
                        .split("-")
                        .join("/");
                    s += `\tLast update: ${date}\n`;
                    if (this.options.languages) {
                        s += `\tLanguage: ${this.options.languages.join(
                            " / ",
                        )}\n`;
                    }

                    const source = {
                        source() {
                            return s;
                        },
                        size() {
                            return s.length;
                        },
                    };

                    if (compilation.emitAsset) {
                        compilation.emitAsset("humans.txt", source);
                    } else {
                        // Remove this after drop support for webpack@4
                        compilation.assets["humans.txt"] = source;
                    }

                    resolve(s);
                });
            });
        });
    }
}

module.exports = HumanstxtPlugin;
