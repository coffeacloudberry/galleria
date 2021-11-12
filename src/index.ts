import "ress/dist/ress.min.css";
import "toastify-js/src/toastify.css";
import "tippy.js/dist/tippy.css";

import "./style/main.sass";

import m from "mithril";

import CustomLogging from "./CustomLogging";
import { routes } from "./routes";

const info = new CustomLogging();
info.log(
    // eslint-disable-next-line max-len
    `Running version ${process.env.GIT_VERSION} committed on ${process.env.GIT_AUTHOR_DATE}.`,
);

m.route(document.body, "/en/photo", routes);
