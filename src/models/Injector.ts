/** A promise function. */
type ResolveFunction = (value: void | PromiseLike<void>) => void;

/** One injected script or style. */
interface InjectedScript {
    /** List of resolvers common to the source. */
    resolvers: ResolveFunction[];

    /** Source of the injected script or style. */
    src: string;

    /** True if the source has been loaded and resolvers have been called. */
    resolved: boolean;
}

/** Handle all dynamically injected scripts and styles. */
class Injector {
    private allInjectedScripts: InjectedScript[] = [];

    /** Call all resolvers common to this source. */
    popAll(src: string): void {
        for (const injectedScript of this.allInjectedScripts) {
            if (injectedScript.src === src) {
                injectedScript.resolvers.forEach((resolver) => {
                    resolver();
                });
                injectedScript.resolved = true;
                break;
            }
        }
    }

    /** Check if the source has been added, and add it again. */
    push(src: string, resolve: ResolveFunction): boolean {
        for (const injectedScript of this.allInjectedScripts) {
            if (injectedScript.src === src) {
                injectedScript.resolvers.push(resolve);
                return true;
            }
        }
        this.allInjectedScripts.push({
            resolvers: [resolve],
            src,
            resolved: false,
        });
        return false;
    }

    /** Return true if the resolvers for this source have been called. */
    alreadyResolved(src: string): boolean {
        for (const injectedScript of this.allInjectedScripts) {
            if (injectedScript.src === src) {
                return injectedScript.resolved;
            }
        }
        return false;
    }
}

/** This is a shared instance. Global scope because scripts are cached. */
export const injector = new Injector();
