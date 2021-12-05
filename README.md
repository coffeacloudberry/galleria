# Galleria [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier) [![CodeQL](https://github.com/coffeacloudberry/galleria/workflows/CodeQL/badge.svg)](https://github.com/coffeacloudberry/galleria/actions/workflows/codeql-analysis.yml) [![DeepSource](https://deepsource.io/gh/coffeacloudberry/galleria.svg/?label=active+issues&token=3otGYqRTLk0en07piBlR3puH)](https://deepsource.io/gh/coffeacloudberry/galleria/)

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

I could not find anything cheap complying to the above requirements, and I was interested in learning great web development tools. Therefore, I designed a Single Page Application using the Mithril framework, the TypeScript language, and some awesome libraries. It is deployed as a serverless application thanks to Vercel and connects to some 3rd parties to create a real interactivity. To sum up the features:

- [x] Interactive 3D maps,
- [x] Interactive charts,
- [x] Home-made track format including elevation profile,
- [x] Newsletter system and contact form,
- [x] Home-made like buttons and emotion sharing with a GIF,
- [x] Fully translated in English, Finnish, and French,
- [x] GDPR-compliant and privacy by design,
- [x] Do not use any cookie or Local Storage,
- [x] Photo viewer with dynamic image optimization,
- [x] Mobile-friendly,
- [x] Lazy-loading heavy scripts.

The project was not created to be a template or a flexible CMS, but for my own use. Feel free to take whatever inspiration from it that you want.

## Usage

### Install Dependencies

Clone this repo and npm install.

```sh
npm i
```

### Add Content

* Use the [PhotosManagerCLI](https://github.com/ExploreWilder/PhotosManagerCLI) to put a new picture,
* Use the [WebTrackCLI](https://github.com/ExploreWilder/WebTrackCLI) to get elevation data and convert GPX to webtrack.

Notice that the list of stories are statically generated at build time (by a custom Webpack plugin). Rebuild or rerun the local server to apply the changes.

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

1. Install the Vercel CLI: `npm i -g vercel`,
2. Pull the environment variables: `vercel env pull`,
3. Check that the *.env* file has been created,
4. Run the server on port 3000: `vercel dev`,
5. Visit [localhost:3000](http://localhost:3000).

> `vercel dev` is for development purpose, it runs the prod version of the application with the dev environment variables.

> Do not try `127.0.0.1:3000` when running `vercel dev`, the API only works with `localhost:3000`.

</details>
<details>
  <summary>Run the production build</summary>

```sh
npm run build
```

> Note: Install [http-server](https://www.npmjs.com/package/http-server) globally to deploy a simple server locally.

```sh
npm i -g http-server
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
npm i -g npm-check-updates # only once
ncu -u
npm install
```

Also update the lazy-loaded scripts listed in the [configuration file](src/config.ts) (the lazy-loaded Sentry SDK is automatically updated.)

</details>
<details>
  <summary>The logo</summary>

From a new SVG file:

* Generate PNG files of different sizes and generate the .ico with Gimp: File > Open as Layers, File > Export As...,
* Generate an apple-touch-icon file (PNG, 192x192, without alpha channel),
* Generate a compressed version with Inkscape: File > Save As... > Optimized SVG.

</details>

### Real Deployment

The frontend can be deployed on any server. The backend is designed to run on Vercel. Most third party connections require an account. The good news is that most third parties are cost- and maintenance-free, so that you can focus on what really matters: photographies, stories, adventures!

## Thanks

**Thanks to the visitors who shared feedback.** :hugs:

---------------------------------------

<div align="center">
    <a href="https://www.jetbrains.com/">
        <img src="https://resources.jetbrains.com/storage/products/company/brand/logos/jb_square.svg" height="128" width="128" alt="JetBrains logo" />
    </a>
    <p align="center">Project sponsored by <a href="https://www.jetbrains.com/">JetBrains</a></p>
</div>
