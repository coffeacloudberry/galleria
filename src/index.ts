import m from "mithril";
import "ress/dist/ress.min.css";
import "./style/main.sass";
import "tippy.js/dist/tippy.css";
import { routes } from "./routes";
import CustomLogging from "./CustomLogging";

const info = new CustomLogging();
info.log(
    // eslint-disable-next-line max-len
    `Running version ${process.env.GIT_VERSION} committed on ${process.env.GIT_AUTHOR_DATE}.`,
);

m.route(document.body, "/en/photo", routes);
