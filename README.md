# Galleria

_Minimalist Blog With Photos, Stories, Maps_

[DeepSource](https://deepsource.io/gh/coffeacloudberry/galleria/) | [Website](https://www.explorewilder.com)

## Yet Another Content Management System?

Because:

- I like seeing and sharing content ads-free, with no subscription or paywall or trackers,
- I want a minimalist / fully-featured / privacy-friendly / user-friendly website,
- I want both the interface and the content lightweight by design, fast to load, and secure,
- I want it translated,
- I want it bug-free,
- I like receiving feedback without pushing you to sign in a specific social platform.

I could not find anything cheap complying to the above requirements, and I was interested in learning great web development tools. Therefore, I designed a Single Page Application using the [Mithril framework](https://mithril.js.org/), the TypeScript language, and some awesome libraries. To sum up the features:

- [x] Interactive 3D maps,
- [x] Interactive charts,
- [x] Home-made track format including elevation profile,
- [x] Fully translated in English, Finnish, and French,
- [x] [Privacy by design](https://en.wikipedia.org/wiki/Privacy_by_design),
- [x] [Humane by design](https://humanebydesign.com/),
- [x] [Ethical](https://www.w3.org/TR/ethical-web-principles/) [by design](https://ind.ie/ethical-design/),
- [x] No cookie, no Local Storage, no IndexedDB,
- [x] Photo viewer with dynamic image optimization,
- [x] Mobile-friendly,
- [x] Lazy-loading heavy scripts (with dynamic import expressions).

This is not a template or a flexible CMS.

## Usage

### Install Dependencies

Clone this repo, install Node.js 22, and run `npm i`. For dev, run `make install`.

### Add Content

Tracks and photos are transformed with [command line tools](cli) written in Python 3.11 and Rust 2021. The list of stories and photo metadata fetched by the website are statically generated at build time thanks to a [custom Webpack plugin](config/stories-webpack-plugin.js) and [utilities](config/utils.js). The app will automatically refresh on file update.

### Running

<details>
  <summary>Run the development server locally</summary>

```sh
npm start
```

You can view the development server at [localhost:8080](http://localhost:8080).

</details>

### Testing

<details>
  <summary>Unit testing</summary>

Run `poetry shell` to enter the Python virtual environment, then `make js-test` and `make py-test`.

</details>
<details>
  <summary>End-to-end testing</summary>

The test uses [Robot Framework](https://github.com/robotframework/robotframework/blob/master/INSTALL.rst) with the [SeleniumLibrary](https://github.com/robotframework/SeleniumLibrary#installation). Run `npm start` in one shell and `make e2e-test` on another one inside the Python virtual environment (because Robot Framework is installed via Poetry). The tests do not use fake fixtures but the actual website content. The most recent photo should have a story, otherwise some tests may fail. An HTML report should have been generated.

</details>

### Analysing

<details>
  <summary>Bundle size analysis</summary>

Run `npm bundle-analysis` to generate the prod bundle and start a local server with a page displaying the bundle analysis, you can check that no extra libraries are bundled.

</details>

### Updating

<details>
  <summary>The dependencies</summary>

Run `poetry shell`, then `make update`.

Also update the lazy-loaded scripts listed in the [configuration file](src/config.ts).

</details>
<details>
  <summary>The logo</summary>

From a new SVG file:

- Generate PNG files of different sizes and generate the .ico with Gimp: File > Open as Layers, File > Export As...,
- Generate an apple-touch-icon file (PNG, 192x192, without alpha channel).

</details>
<details>
  <summary>The font</summary>

The [main SASS file](src/style/main.scss) should point to the font file.

For editing the font, adding glyphs, ligatures, exotic characters, etc. Have a look at this [README file](src/fonts/asap/README.md).

</details>
<details>
  <summary>The map styles</summary>

For better compatibility, only use standard styles, do not use classic styles.

</details>

### Real Deployment

The frontend can be deployed on any server, just install dependencies with `npm ci`. Some third party connections require an account. The good news is that most third parties are cost- and maintenance-free, so that you can focus on what really matters: photos, stories, adventures!

## Thanks

**Thanks to the visitors who shared feedback.** :hugs:
