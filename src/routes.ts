import m from "mithril";

import languages from "./languages.json";
import AboutPage from "./views/AboutPage";
import NotFoundPage from "./views/NotFoundPage";
import PhotoPage from "./views/PhotoPage";
import StoriesOverviewPage from "./views/StoriesOverviewPage";
import StoryPage from "./views/StoryPage";

type Page = () => m.Component;

interface RoutedComponents {
    [index: string]: Page;
}

interface RoutedResolvers {
    [index: string]: m.RouteResolver;
}

function routeResolver(Component: Page): m.RouteResolver {
    return {
        onmatch() {
            return Component;
        },
        render(vnode) {
            return [vnode];
        },
    };
}

// All translated pages, the language will be prepended
const plainRoutes: RoutedComponents = {
    "/photo": PhotoPage /* will load the most recent photo */,
    "/photo/:title": PhotoPage,
    "/stories": StoriesOverviewPage,
    "/story/:title": StoryPage /* also includes key parameters: origin photo */,
    "/about": AboutPage,
    "/lost": NotFoundPage,
    "/:other": NotFoundPage,
};

// Build all routes for all the languages
export const routes: RoutedResolvers = {
    "/:other": routeResolver(NotFoundPage),
};
for (const language of languages) {
    Object.keys(plainRoutes).forEach((route) => {
        routes[`/${language.slug}${route}`] = routeResolver(plainRoutes[route]);
    });
}
