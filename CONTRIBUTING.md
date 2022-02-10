Todo:

* Lint with `npm run lint` and `npm run stylelint` (based on the [SASS guidelines](https://github.com/bjankord/stylelint-config-sass-guidelines/blob/main/index.js)),
* Test as detailed in the [README.md](README.md) file,
* Check the code quality with Sonar.

Rules of Thumb:

* If a script is fetched from CDN, check with `npm bundle-analysis` that it has not been included in the bundle,
* The `export` keyword increases the bundle size, `export` only if used outside the file.
