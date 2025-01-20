# GPX to WebTrack

## Why The WebTrack Format?

**What GPS data interchange format should you use for a web application?**

The [GPX](https://en.wikipedia.org/wiki/GPS_Exchange_Format "GPS Exchange Format") and [KML](https://en.wikipedia.org/wiki/Keyhole_Markup_Language "Keyhole Markup Language") formats are part of the [XML](https://en.wikipedia.org/wiki/XML "Extensible Markup Language") family, quite verbose. The [Google Encoded Polyline Algorithm Format](https://developers.google.com/maps/documentation/utilities/polylinealgorithm "Polyline Format") is the opposite: very lightweight but contains only one line, had neither elevation data, nor waypoints. The [GeoJSON](https://en.wikipedia.org/wiki/GeoJSON "GeoJSON Format") format has [all features](https://tools.ietf.org/html/rfc7946#section-3.1.1 "The GeoJSON Format Spec") but lacks of extensibility, and it is relatively heavy. [Vector tilesets](https://docs.mapbox.com/help/glossary/tileset/#vector-tilesets "Vector tilesets definition") are great but over-killed (and expensive) to implement for just a bunch of tracks. The [ProtocolBuffer Binary Format](https://github.com/protocolbuffers/protobuf/) is the most attractive solution for transferring GPS tracking data and a JavaScript library [exists](https://github.com/mapbox/pbf "JavaScript library for the Google Protobuf"), but a high-level interface managing tracks and waypoints as well as reading GPX data is still needed. This project aims to fill the gap between the rich GPX file and the simple Google polyline. This repo includes a GPX to WebTrack exporter with an [elevation data](DEM.md) fetcher. A WebTrack to GeoJSON exporter is available in TypeScript and you can see a real-world example with Mapbox in [ExploreWilder.com](https://explorewilder.com).

**[Read the format specifications](SPEC.md)**.

**How efficient is the compression?**

No benchmark, but the result is good enough:

![Basic Perf Overview](./man/basic_perf_overview.png)

## Prerequisites

- Python 3.11,
- GDAL for Python - to handle GeoTIFF images from ASTGTM v3.

If GDAL is installed system-wide, configure the virtual environment to also use the global site packages.

Some Fedora commands that could fix a failed GDAL installation:

```
sudo dnf install python3.11-devel gdal
poetry add GDAL=="$(gdal-config --version).*"
```

### Jonathan de Ferranti JdF1 and JdF3 datasets

Download it yourself and put it in the cache folder with the file format: _N64E025_JdF1.hgt_ if setting _JdF1_ as input parameter. NASA creds are not needed.

### SRTMGL1 v3 and ASTGTM v3 datasets

You need to accept the terms of the NASA's Land Processes Distributed Active Archive Center (LP DAAC) located at the USGS Earth Resources Observation and Science (EROS) Center. By accessing the US Government server, you are consenting to complete monitoring with no expectation of privacy. Unauthorized access or use may subject you to disciplinary action and criminal prosecution. In case of USGS.gov server error, you should see a notification banner [here](https://lpdaac.usgs.gov/products/srtmgl1v003/) such as `LP DAAC websites and HTTP downloads will be unavailable...`. NASA creds are required. Save your creds as env vars or in your .env file:

```
NASA_USERNAME="..."
NASA_PASSWORD="..."
```

## Install

Run `make install`

## Usage

```sh
python -m cli.src.gpx_to_webtrack --help
```

Use the SRTMGL1 v3 or ASTGTM v3 datasets:

```sh
python -m cli.src.gpx_to_webtrack --gpx /.../stories -R --simplify --dem SRTMGL1v3
```

Use the Jonathan de Ferranti datasets:

```sh
python -m cli.src.gpx_to_webtrack --gpx /.../stories -R --simplify --dem JdF1
```

Output:

```
Processing `/.../stories/Hiking_Trip/Hiking_Trip.gpx'...
WebTrack file:
        Total segments: 9
        Total waypoints: 14
        Activities: 3 (WALK, MOTORED_BOAT, ROWING_BOAT)
        Compression: 1194178 -> 20806 bytes => 98 %
Generated `/.../stories/Hiking_Trip/Hiking_Trip.webtrack'
Processing `/.../stories/Bastille_Tramp/Bastille_Tramp.gpx'...
WebTrack file:
        Total segments: 4
        Total waypoints: 3
        Activities: 1 (UNDEFINED)
        Compression: 727707 -> 6237 bytes => 99 %
Generated `/.../stories/Bastille_Tramp/Bastille_Tramp.webtrack'
Processing `/.../stories/Easter_on_Seitseminen/Easter_on_Seitseminen.gpx'...
The track is almost flat (1.4%), elevation removed from track.
WebTrack file:
        Total segments: 1
        Total waypoints: 2
        Activities: 1 (UNDEFINED)
        Compression: 64657 -> 2466 bytes => 96 %
Generated `/.../stories/Easter_on_Seitseminen/Easter_on_Seitseminen.webtrack'
```

In this example, any elevation data from the GPX file will be discarded and replaced by DEM data. The path simplification is based on the [Ramer-Douglas-Peucker algorithm](https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm). Recursive or not, the WebTrack will be saved next to its GPX source file. Tracks are to be ordered beforehand. This tool will save tracks in the same order as they appear in the GPX file. The [GPX Track Segments](https://www.topografix.com/GPX/1/1/#type_trksegType "GPX <trkseg/> definition") are merged.

## What's Next?

I designed the [file format](SPEC.md) to perfectly fit my needs, but maybe not yours.

Here you have a list of ideas that could be implemented:

- The offset often fits in a single byte. So the value could be stored in two types: 1 or 2 bytes.
- Handle more than GPX data, like polygons? No. In that case, [Geobuf](https://github.com/mapbox/geobuf) might be a better solution.

# About the Elevation

This project includes a customized Python parser for [HGT elevation data](DEM.md). Contributors include [Tomo Krajina](http://github.com/tkrajina) and [Nick Wagers](https://github.com/nawagers). The parser is licensed under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0). The original parser is not maintained anymore and does not handle GeoTIFF. Therefore, the parser has been imported and modified.

# Server Compression

## Apache Configuration

[Enable](./man/mod_deflate.md "Enable Apache mod_deflate With cPanel") the mod_deflate for the WebTrack MIME type.

## Vercel Configuration

The compression is only available for [specific MIME types](https://vercel.com/docs/concepts/edge-network/compression#mime-types--compress), the Content-Type can be set to _font/otf_ to enable compression:

[vercel.json](https://vercel.com/docs/cli#project-configuration/headers):

```json
{
    "headers": [
        {
            "source": "/(.*).webtrack",
            "headers": [
                {
                    "key": "Content-Type",
                    "value": "font/otf"
                }
            ]
        }
    ]
}
```

# Embellish GPX

This tool adds an elevation profile to a GPX file, handy for planning your next trip. This tool is optional and not used for the website.

```sh
python -m cli.src.embellish_gpx --gpx /path/to/file.gpx --dem JdF1
```

# Photos Manager

This tool imports a photo into the gallery.

## Prerequisites

Install the `libwebp` utility. Fedora package is [libwebp-tools](https://packages.fedoraproject.org/pkgs/libwebp/libwebp-tools/). Debian package is [libwebp-dev](https://packages.debian.org/trixie/libwebp-dev). `exifread` is also required.

## Usage

```sh
python -m cli.src.photos_manager --tif-path path/to/photo.tif --album-path /home/.../photos/
```

Use the `--gpx-path` option for guessing the GPS location where the photo has been taken according to the nearest (way)point in the GPX file.
This feature is comparing the time when the photo has been taken with the GPS date/time.
Notice that GPS date/time is lost when using the _Save to original_ button in QMapShack.

## Notes

- The WebP converter does not read the Exif orientation metadata, so the image has to be rotated if needed.
- This tool does not use the [webp](https://pypi.org/project/webp/) Python package, nor the Pillow library, because they do not handle the desired WebP options.
- WebP lossy option `-sharp_yuv` is not used. That is actually making the lossy compression look sharper, hence more visible.

# Share For Social Platforms

Run `cargo run` to generate `_to_social.png` images that can be uploaded to social platforms. The metadata of those images do not contain personally identifiable information for safe sharing. The image compression is lossless (PNG) to show text without artifact. It is assumed that the social platform applies a lossy compression.
