# Data Sources

Elevation profiles you see from the interactive charts in [ExploreWilder.com](https://www.explorewilder.com) are based on data from the following Digital Elevation Models.

## Jonathan de Ferranti

The DEM is mainly based on SRTM 3" with a custom voidfill algorithm and the combination of alternative sources for the best global coverage including the highest and lowest latitudes. Alternative sources include Aster GDEM v2, Russian 200k and 100k, Nepal 50k, local 50k and 100k topos, 200m DEM from NSIDC, [ArcticDEM](https://www.pgc.umn.edu/data/arcticdem/).

**Good point**: the dataset is not just data processed by a computer, but carefully made with details in mind. More impressive, it is a really global dataset, and really free.

**Bad point**: nothing really.

-   File Format: HGT
-   Datum: WGS84/EGM96

More information: [3"](http://viewfinderpanoramas.org/dem3.html) (or about 93 meters) and [1"](http://viewfinderpanoramas.org/dem1.html) (or about 31 meters) links.

Handle ZIP files: `find . -name "*.zip" | while read filename; do unzip -j "$filename"; done; rename -v .hgt _JdF1.hgt *.hgt; rm *.zip`

## SRTMGL1 v3 [![Uptime Robot status](https://img.shields.io/uptimerobot/status/m788629198-fb02c8547f60cd66a8245b6b)](https://stats.uptimerobot.com/3JW84TmQoB/788629198)

The world-famous dataset provided by the LP DAAC located at the U.S. DoI, USGS EROS Center in Sioux Falls. The German and Italian space agencies also collaborated in the SRTM data sets to generate a DEM of the Earth using radar interferometry.

**Good point**: because it is a famous data source, there are plenty of tools available.

**Bad point**: the dataset is limited between 60° N and 56° S latitude, and I found a few artifacts invisible in the Jonathan de Ferranti's dataset.

-   File Format: HGT or NetCDF4
-   Datum: WGS84/EGM96

More information: https://lpdaac.usgs.gov/products/srtmgl1v003/

## ASTGTM v3 [![Uptime Robot status](https://img.shields.io/uptimerobot/status/m788629198-fb02c8547f60cd66a8245b6b)](https://stats.uptimerobot.com/3JW84TmQoB/788629198)

The ASTGTM dataset is a collaborative effort between NASA and Japan's METI. Released in 2019, it is the latest publicly available dataset. Voids are filled by interpolation with Aster GDEM, PRISM, SRTM. The dataset includes a layer indicating the actual source of the data.

**Good point**: the coverage is great (83° N to 83° S) and - based on a few samples - artifacts visible in the SRTM v3 are invisible in ASTGTM v3.

**Bad point**: there are officially known issues like voids in Greenland, known inaccuracies and artifacts.

-   File Format: GeoTIFF
-   Datum: WGS84/EGM96

More information: https://lpdaac.usgs.gov/products/astgtmv003/

# Acronyms

-   **DEM**: Digital Elevation Model
-   **GDEM**: Global DEM
-   **ASTGTM**: Aster GDEM
-   **SRTM**: Shuttle Radar Topography Mission
-   **NSIDC**: National Snow and Ice Data Center
-   **LP DAAC**: Land Processes Distributed Active Archive Center
-   **DoI**: Department of the Interior
-   **USGS**: U.S. Geological Survey
-   **EROS**: Earth Resources Observation and Science
-   **NASA**: National Aeronautics and Space Administration
-   **METI**: Ministry of Economy, Trade, and Industry
-   **GeoTIFF**: Georeferenced Tagged Image File Format
