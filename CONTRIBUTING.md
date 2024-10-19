# Contributing

So glad you land on this page! Feel free to share any idea. Your contribution is more than welcome.

Feel free to open an issue or a discussion.

## Todo Before Committing

-   Lint with `npm run lint`,
-   Test as detailed in the [README.md](README.md) file.

## Rules of Thumb

-   If a script is fetched from CDN, check with `npm bundle-analysis` that it has not been included in the bundle,
-   The `export` keyword increases the bundle size, `export` only if used outside the file.

## PyCharm Pro / WebStorm Users

The README.md file contains some tips. Also, [mark](https://www.jetbrains.com/help/webstorm/configuring-project-structure.html) `src/` and `src/style/` as _Resource Root_ so that the IDE finds the icons, and mark `tests/end_to_end/results/` as _Excluded_ so that the IDE does not analyse test results.
