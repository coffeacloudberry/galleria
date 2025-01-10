import "ress/dist/ress.min.css";
import "toastify-js/src/toastify.css";
import "tippy.js/dist/tippy.css";

import "./style/main.scss";

import m from "mithril";

import { routes } from "./routes";

m.route(document.body, "/en/photo", routes);
