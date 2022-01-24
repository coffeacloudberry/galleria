import "ress/dist/ress.min.css";
import "toastify-js/src/toastify.css";
import "tippy.js/dist/tippy.css";

import "./style/main.sass";

import m from "mithril";

import CustomLogging from "./CustomLogging";
import { routes } from "./routes";

const info = new CustomLogging();
info.log(
    `Running version https://github.com/coffeacloudberry/galleria/commit/${String(
        process.env.GIT_VERSION,
    )}`,
);

m.route(document.body, "/en/photo", routes);
