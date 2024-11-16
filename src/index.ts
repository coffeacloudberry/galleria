import "ress/dist/ress.min.css";
import "toastify-js/src/toastify.css";
import "tippy.js/dist/tippy.css";

import "./style/main.sass";

import m from "mithril";

import { config } from "./config";
import { routes } from "./routes";

m.route(document.body, "/en/photo", routes);
m.request({
    method: "GET",
    url: "/dyn/:ver.json",
    params: {
        ver: config.siteVersion,
    },
}).catch(() => {
    window.location.reload();
});
