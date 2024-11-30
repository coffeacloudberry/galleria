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

I could not find anything cheap complying to the above requirements, and I was interested in learning great web development tools. Therefore, I designed a Single Page Application using the [Mithril framework](https://mithril.js.org/), the TypeScript language, and some awesome libraries. It is deployed as a serverless application thanks to Vercel. To sum up the features:

- [x] Interactive 3D maps,
- [x] Interactive charts,
- [x] Home-made track format including elevation profile,
- [x] Fully translated in English, Finnish, and French,
- [x] [Privacy by design](https://en.wikipedia.org/wiki/Privacy_by_design),
- [x] [Humane by design](https://humanebydesign.com/),
- [x] [Ethical by design](https://ind.ie/ethical-design/),
- [x] No cookie, no Local Storage, no IndexedDB,
- [x] Photo viewer with dynamic image optimization,
- [x] Mobile-friendly,
- [x] Lazy-loading heavy scripts (with dynamic import expressions).

The project was not created to be a template or a flexible CMS, but for my own use. Feel free to take whatever inspiration from it that you want.

## Usage

### Install Dependencies

Clone this repo, install Node.js 20, and run `npm i`. For dev, run `make install`.

### Add Content

Tracks and photos are transformed with [command line tools](cli) written in Python 3.11 and Rust 2021. The list of stories and photo metadata fetched by the website are statically generated at build time thanks to a [custom Webpack plugin](config/stories-webpack-plugin.js) and [utilities](config/utils.js). Rebuild or rerun the local server to apply the changes.

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

Run `make js-test` and `make py-test` after `poetry shell` to enter the Python virtual environment.

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

```sh
# run `npm i npm-check-updates --location=global` only once
ncu -u
npm install
```

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

The [main SASS file](src/style/main.sass) should point to the font file.

For editing the font, adding glyphs, ligatures, exotic characters, etc. Have a look at this [README file](src/fonts/asap/README.md).

</details>
<details>
  <summary>The map styles</summary>

The Mapbox Studio styles are public:

- _Sunny Summer_ theme: [view](https://api.mapbox.com/styles/v1/onvbjzhghu/ckp9oa8nw216718o43dskmvsg.html?title=view&access_token=YOURTOKEN&zoomwheel=true&fresh=true#10.26/45.9278/6.9381/120/3), [copy](https://api.mapbox.com/styles/v1/onvbjzhghu/ckp9oa8nw216718o43dskmvsg.html?title=copy&access_token=YOURTOKEN&zoomwheel=true&fresh=true#10.26/45.9278/6.9381/120/3),
- _Sunny Tundra_ theme: [view](https://api.mapbox.com/styles/v1/onvbjzhghu/clng3anjs007q01pi6j8zfi7h.html?title=view&access_token=YOURTOKEN&zoomwheel=true&fresh=true#15.12/68.667283/27.535102/-20/66), [copy](https://api.mapbox.com/styles/v1/onvbjzhghu/clng3anjs007q01pi6j8zfi7h.html?title=copy&access_token=YOURTOKEN&zoomwheel=true&fresh=true#15.12/68.667283/27.535102/-20/66),
- _Dark Tundra_ theme: [view](https://api.mapbox.com/styles/v1/onvbjzhghu/ckwdyvlrl2gn715su45kulnvr.html?title=view&access_token=YOURTOKEN&zoomwheel=true&fresh=true#12.34/68.42216/27.41957/20.8/63), [copy](https://api.mapbox.com/styles/v1/onvbjzhghu/ckwdyvlrl2gn715su45kulnvr.html?title=copy&access_token=YOURTOKEN&zoomwheel=true&fresh=true#12.34/68.42216/27.41957/20.8/63).

In the above links, replace YOURTOKEN with your token. Use a Mapbox token with the `styles:read` and `fonts:read` scopes.

</details>

### Real Deployment

The frontend can be deployed on any server, just install dependencies with `npm ci`. Some third party connections require an account. The good news is that most third parties are cost- and maintenance-free, so that you can focus on what really matters: photos, stories, adventures!

## Thanks

**Thanks to the visitors who shared feedback.** :hugs:
