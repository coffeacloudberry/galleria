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
                    let out_str = "/* TEAM */\n";
                    this.options.team.forEach((teamMember) => {
                        out_str += `\t${teamMember.type}: ${teamMember.name}\n`;

                        if (teamMember.twitter) {
                            out_str += `\tTwitter: @${teamMember.twitter}\n`;
                        }
                        out_str += "\n";
                    });

                    out_str += "/* SITE */\n";
                    const date = new Date()
                        .toISOString()
                        .split("T")[0]
                        .split("-")
                        .join("/");
                    out_str += `\tLast update: ${date}\n`;
                    if (this.options.languages) {
                        out_str += `\tLanguage: ${this.options.languages.join(
                            " / ",
                        )}\n`;
                    }

                    const source = {
                        source() {
                            return out_str;
                        },
                        size() {
                            return out_str.length;
                        },
                    };

                    if (compilation.emitAsset) {
                        compilation.emitAsset("humans.txt", source);
                    } else {
                        // Remove this after drop support for webpack@4
                        compilation.assets["humans.txt"] = source;
                    }

                    resolve(out_str);
                });
            });
        });
    }
}

module.exports = HumanstxtPlugin;
