# Contributing

So glad you land on this page! Feel free to share any idea. Your contribution is more than welcome.

Feel free to open an issue or a discussion.

## Todo Before Committing

- Lint with `npm run lint` and `npm run stylelint`,
- Test as detailed in the [README.md](README.md) file.

## Rules of Thumb

- If a script is fetched from CDN, check with `npm bundle-analysis` that it has not been included in the bundle,
- The `export` keyword increases the bundle size, `export` only if used outside the file.
