# Galleria

[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black) [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier) [![Imports: isort](https://img.shields.io/badge/%20imports-isort-%231674b1?style=flat&labelColor=ef8336)](https://pycqa.github.io/isort/) [![Checked with mypy](https://camo.githubusercontent.com/34b3a249cd6502d0a521ab2f42c8830b7cfd03fa/687474703a2f2f7777772e6d7970792d6c616e672e6f72672f7374617469632f6d7970795f62616467652e737667)](https://mypy.readthedocs.io/en/stable/introduction.html "Mypy is an optional static type checker for Python") [![Static Analysis](https://github.com/coffeacloudberry/galleria/actions/workflows/static-analysis.yml/badge.svg)](https://github.com/coffeacloudberry/galleria/actions/workflows/static-analysis.yml) [![DeepSource](https://deepsource.io/gh/coffeacloudberry/galleria.svg/?label=active+issues&token=3otGYqRTLk0en07piBlR3puH)](https://deepsource.io/gh/coffeacloudberry/galleria/) [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=coffeacloudberry_galleria&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=coffeacloudberry_galleria) ![Vercel](https://therealsujitk-vercel-badge.vercel.app/?app=galleria-coffeacloudberry) [![Uptime Robot ratio (30 days)](https://img.shields.io/uptimerobot/ratio/m788439617-62d9f70af5b1f4ff4ff03be5)](https://stats.uptimerobot.com/3JW84TmQoB)

<div align="center">
    <a href="https://www.explorewilder.com">
        <img src="https://raw.githubusercontent.com/coffeacloudberry/galleria/master/src/icons/favicon/favicon.svg" height="128" width="128" alt="ExploreWilder logo" />
    </a>
    <h3 align="center">
        <a href="https://www.explorewilder.com">ExploreWilder</a>
    </h3>
    <p align="center">Minimalist Blog With Photos, Stories, Maps</p>
</div>

## Why This Website?

Because:

* I like seeing and sharing content ads-free, with no subscription or paywall or trackers,
* I want a minimalist / fully-featured / privacy-friendly / user-friendly website,
* I want both the interface and the content lightweight by design, fast to load, and secure,
* I want it translated,
* I want it bug-free,
* I like receiving feedback without forcing you to sign in a specific social platform.

I could not find anything cheap complying to the above requirements, and I was interested in learning great web development tools. Therefore, I designed a Single Page Application using the [Mithril framework](https://mithril.js.org/), the TypeScript language, and some awesome libraries. It is deployed as a serverless application thanks to Vercel and connects to some 3rd parties to create a real interactivity. To sum up the features:

- [x] Interactive 3D maps,
- [x] Interactive charts,
- [x] Home-made track format including elevation profile,
- [x] Contact form,
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

Clone this repo, install Node.js 14, and run `npm i`.

### Add Content

* Use the [PhotosManagerCLI](photo_manager_cli) to put a new picture,
* Use the [WebTrackCLI](webtrack_cli) to get elevation data and convert GPX to webtrack.

Notice:

* The list of stories and photos metadata are statically generated at build time (by a custom Webpack plugins) as well as the [Web Labels](config/generate-weblabels-webpack-plugin/README.md). Rebuild or rerun the local server to apply the changes.
* Install the [WebP Support plugin](https://plugins.jetbrains.com/plugin/15037-webp-support) to view images from the JetBrains IDE.

### Running

<details>
  <summary>Run the development server locally</summary>

```sh
npm start
```

You can view the development server at [localhost:8080](http://localhost:8080).

> To run the debug session from an IntelliJ-based IDE, configure the browser to be Chrome-based (File > Settings... > search for *browser*), and start the local server as usual but press Ctrl+Shift+Click on the local URL.

</details>
<details>
  <summary>Run the development server locally with the API (aka Vercel Functions)</summary>

1. Install the Vercel CLI: `npm i --location=global vercel`,
2. Pull the environment variables: `vercel env pull`,
3. Check that the *.env* file has been created,
4. Run the server on port 3000: `vercel dev`,
5. Visit the frontend at [localhost:3000](http://localhost:3000) or backend at [localhost:3000/api/health](http://localhost:3000/api/health).

Notes:

* `vercel dev` is for development purpose, it runs the prod version of the application with the dev environment variables.
* Do not try `127.0.0.1:3000` when running `vercel dev`, the API only works with `localhost:3000`.
* If the response of `ping localhost` is `::1` and you get `ECONNREFUSED` errors, [disable IPv6 for localhost](https://www.xmodulo.com/disable-ipv6-linux.html).

</details>
<details>
  <summary>Run the production build</summary>

```sh
npm run build
```

> Note: Install [http-server](https://www.npmjs.com/package/http-server) globally to deploy a simple server locally.

```sh
npm i --location=global http-server
```

You can view the deployment by creating a server in `public`.

```sh
cd public
http-server
```

</details>

### Testing

<details>
  <summary>Unit testing</summary>

Just run `npm run test`

> For running specific tests on PyCharm Professional, the Node.js plugin has to be installed.

</details>
<details>
  <summary>End-to-end testing</summary>

Install [Robot Framework](https://github.com/robotframework/robotframework/blob/master/INSTALL.rst) with the [SeleniumLibrary](https://github.com/robotframework/SeleniumLibrary#installation) and the drivers to your web browser(s).

```sh
pip install -U robotframework robotframework-seleniumlibrary webdrivermanager
webdrivermanager firefox
export PATH=$PATH:/home/.../.local/share/WebDriverManager/bin
mkdir tests/end_to_end/results
```

Then run the test:

```sh
npm start &
cd tests/end_to_end/results
robot ..
```

> Replace `npm start` with `vercel dev` if you want to test the Vercel Functions (to be defined). In that case, the Robot configuration should also be changed with the port exposed by Vercel.

> If the driver is not found, you may need to `export PATH=$PATH:/home/.../.local/share/WebDriverManager/bin`

> The tests do not use fake fixtures but the actual website content. The most recent photo should have a story or some tests may fail.

An HTML report should have been generated.

</details>

### Analysing

<details>
  <summary>SonarQube analysis</summary>

1. Download and install the [SonarQube Community Edition](https://docs.sonarqube.org/latest/setup/get-started-2-minutes/),
2. Download and install the [SonarScanner](https://docs.sonarqube.org/latest/analysis/scan/sonarscanner/),
3. Run the server with `sh /opt/sonarqube/sonarqube-9.0.0.45539/bin/linux-x86-64/sonar.sh console` and finish the installation,
4. Create a project named *coffeacloudberry_galleria* and generate *YOURTOKEN*,
5. Run the analysis with `sonar-scanner -Dsonar.login=YOURTOKEN`,
6. Find out the report on [localhost:9000/dashboard?id=coffeacloudberry_galleria](http://localhost:9000/dashboard?id=coffeacloudberry_galleria).

> If the scanner is not found, you may need to `export PATH=$PATH:/opt/sonarqube/sonar-scanner-4.6.2.2472-linux/bin/`

</details>
<details>
  <summary>SonarLint analysis</summary>

While SonarQube offers a great interface for project-wide analysis, [SonarLint](https://www.sonarlint.org/) offers realtime static code analysis. The installation depends on your IDE. For IntelliJ-based IDE, go to "File > Settings... > Plugins > Marketplace" and search for SonarLint.

</details>
<details>
  <summary>Bundle size analysis</summary>

Run `npm bundle-analysis` to generate the prod bundle and start a local server with a page displaying the bundle analysis, you can check that no extra libraries are bundled.

</details>

### Updating

<details>
  <summary>The dependencies</summary>

```sh
# run `npm i npm-check-updates --location=global` only once
# optionally run `ncu --version` beforehand to see if there is any update of the tool itself
ncu -u
npm install
```

Also update the lazy-loaded scripts listed in the [configuration file](src/config.ts) as well as FriendlyCaptcha in the [webpack config](config/webpack.prod.js).

</details>
<details>
  <summary>The logo</summary>

From a new SVG file:

* Generate PNG files of different sizes and generate the .ico with Gimp: File > Open as Layers, File > Export As...,
* Generate an apple-touch-icon file (PNG, 192x192, without alpha channel).

</details>
<details>
  <summary>The font</summary>

The [main SASS file](src/style/main.sass) should point to the font files.

For editing the font, adding glyphs, ligatures, exotic characters, etc. Have a look at this [README file](src/fonts/asap/README.md).

</details>
<details>
  <summary>The map styles</summary>

The Mapbox Studio styles are public:

* *Sunny Summer* theme: [view](https://api.mapbox.com/styles/v1/onvbjzhghu/ckp9oa8nw216718o43dskmvsg.html?title=view&access_token=YOURTOKEN&zoomwheel=true&fresh=true#10.26/45.9278/6.9381/120/3), [copy](https://api.mapbox.com/styles/v1/onvbjzhghu/ckp9oa8nw216718o43dskmvsg.html?title=copy&access_token=YOURTOKEN&zoomwheel=true&fresh=true#10.26/45.9278/6.9381/120/3),
* *Sunny Tundra* theme: [view](https://api.mapbox.com/styles/v1/onvbjzhghu/clng3anjs007q01pi6j8zfi7h.html?title=view&access_token=YOURTOKEN&zoomwheel=true&fresh=true#15.12/68.667283/27.535102/-20/66), [copy](https://api.mapbox.com/styles/v1/onvbjzhghu/clng3anjs007q01pi6j8zfi7h.html?title=copy&access_token=YOURTOKEN&zoomwheel=true&fresh=true#15.12/68.667283/27.535102/-20/66),
* *Dark Tundra* theme: [view](https://api.mapbox.com/styles/v1/onvbjzhghu/ckwdyvlrl2gn715su45kulnvr.html?title=view&access_token=YOURTOKEN&zoomwheel=true&fresh=true#12.34/68.42216/27.41957/20.8/63), [copy](https://api.mapbox.com/styles/v1/onvbjzhghu/ckwdyvlrl2gn715su45kulnvr.html?title=copy&access_token=YOURTOKEN&zoomwheel=true&fresh=true#12.34/68.42216/27.41957/20.8/63).

In the above links, replace YOURTOKEN with your token. Use a Mapbox token with the `styles:read` and `fonts:read` scopes.

</details>

### Real Deployment

The frontend can be deployed on any server, just install dependencies with `npm ci`. The backend (API endpoints) is designed to run on Vercel, but any server capable of executing a Node.js application should be okay. Most third party connections require an account. The good news is that most third parties are cost- and maintenance-free, so that you can focus on what really matters: photos, stories, adventures!

## Thanks

**Thanks to the visitors who shared feedback.** :hugs:

---------------------------------------

<div align="center">
    <a href="https://www.jetbrains.com/">
        <img src="https://resources.jetbrains.com/storage/products/company/brand/logos/jb_square.svg" height="128" width="128" alt="JetBrains logo" />
    </a>
    <p align="center">Project sponsored by <a href="https://www.jetbrains.com/">JetBrains</a></p>
</div>
