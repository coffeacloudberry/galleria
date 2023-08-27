"""
GPX to WebTrack convertor.
"""
import glob
import os
from typing import Dict
from typing import List
from typing import Optional

import click
import gpxpy
import gpxpy.gpx

try:
    import elevation
    from webtrack import WebTrack
except ImportError:  # when testing
    from . import elevation
    from .webtrack import WebTrack

USERNAME = None
PASSWORD = None
DEM_DATASETS = (
    ("SRTMGL1v3", "SRTMGL1v3", "E"),
    ("ASTGTMv3", "ASTGTMv3", "G"),
    ('Jonathan de Ferranti 1"', "JdF1", "J"),
    ('Jonathan de Ferranti 3"', "JdF3", "K"),
)


def absolute_path(filename: str, curr_file: str = __file__) -> str:
    """
    Prepend `filename` with the current path.
    Args:
        filename (str): Can be a sub path without the first '/'.
        curr_file (str): File name of the module.
    Returns:
        str: String which contains the full path to ``filename``.
    """
    return os.path.join(os.path.dirname(os.path.realpath(curr_file)), filename)


def good_webtrack_version(file_path: str) -> bool:
    """
    Check that the WebTrack format version of `file_path` can
    be handled by the WebTrack module. Only the file header is
    checked in order to speed up the verification process.
    A partially corrupted file may pass the test.

    Args:
        file_path (str): Path the the WebTrack file.

    Returns:
        False if the WebTrack module cannot handle the file.
        True otherwise.
    """
    webtrack = WebTrack()
    current_format = webtrack.get_format_information()
    file_format = webtrack.get_format_information(file_path)
    return current_format == file_format


class CustomFileHandler(elevation.FileHandler):
    """
    The custom file handler to choose the cache directory.
    """

    def get_srtm_dir(self) -> str:
        """The default path to store files."""
        # Local cache path:
        result = absolute_path("../cache")

        if not os.path.exists(result):
            os.makedirs(result)  # pragma: no cover

        return result


def replace_extension(filename_src: str, new_ext: str) -> str:
    """
    Replace the extension of `filename_src` to `new_ext`.
    Args:
        filename_src (str): The filename with the old extension.
        new_ext (str): The new extension without dot.
    Returns:
        str: The filename with the new extension.
    """
    pre, _ = os.path.splitext(filename_src)
    return ".".join([pre, new_ext])


@click.command()
@click.option(
    "--gpx",
    required=True,
    help="Path to the GPX file or directory containing GPX files",
)
@click.option(
    "-R",
    "--recursive",
    is_flag=True,
    help="Search for GPX files recursively",
)
@click.option(
    "--username",
    help="NASA Earthdata username",
)
@click.option(
    "--simplify",
    is_flag=True,
    help="Simplify with the Ramer-Douglas-Peucker algorithm",
)
@click.option(
    "-v",
    "--verbose",
    is_flag=True,
    help="Print additional information",
)
@click.option(
    "-f",
    "--fallback",
    is_flag=True,
    help="Generate the WebTrack file without elevation if failed to fetch",
)
@click.option(
    "--dem",
    default="none",
    type=click.Choice(
        [dem[1] for dem in DEM_DATASETS] + ["none"], case_sensitive=False
    ),
    help="Digital Elevation Model",
)
def with_elevation(
    gpx: str,
    recursive: bool,
    username: str,
    simplify: bool,
    verbose: bool,
    fallback: bool,
    dem: str,
) -> None:
    if os.path.isdir(gpx):
        for filename in glob.iglob(gpx + "/**", recursive=recursive):
            if os.path.isfile(filename) and filename.lower().endswith(".gpx"):
                gpx_to_webtrack(filename, username, simplify, verbose, dem, fallback)
    elif recursive:
        click.echo("Recursive mode and input file are incompatible", err=True)
    else:
        gpx_to_webtrack(gpx, username, simplify, verbose, dem, fallback)


def gpx_to_webtrack(
    gpx: str,
    username: str,
    simplify: bool,
    verbose: bool,
    dem: str,
    fallback: bool,
) -> None:
    webtrack = replace_extension(gpx, "webtrack")
    if verbose:
        click.echo(f"Processing `{gpx}'...")
    if dem == "none":
        if verbose:
            click.echo("Generating with no elevation...")
        gpx_to_webtrack_without_elevation(gpx, webtrack, simplify, verbose)
    else:
        try:
            gpx_to_webtrack_with_elevation(
                gpx, webtrack, username, simplify, dem, verbose
            )
        except Exception as err:
            click.echo(str(err), err=True)
            if fallback:
                if verbose:
                    click.echo("Falling back with no elevation...")
                gpx_to_webtrack_without_elevation(gpx, webtrack, simplify, verbose)
            else:
                return
    click.secho(f"Generated `{webtrack}'", fg="green", bold=True)


def print_transcompilation_summary(
    gpx_path: str, webtrack_path: str, data: Dict, dem_dataset: Optional[str] = None
) -> None:
    click.echo("WebTrack file:")
    click.echo("\tTotal segments: %d" % len(data["segments"]))
    click.echo("\tTotal waypoints: %d" % len(data["waypoints"]))
    verbose_dem = "None"
    if dem_dataset:
        for dem in DEM_DATASETS:
            if dem[1] == dem_dataset:
                verbose_dem = dem[0]
    click.echo(
        "\tElevation source code: %s (%s)"
        % (data["segments"][0]["withEle"], verbose_dem)
    )
    gpx_size = os.path.getsize(gpx_path)
    webtrack_size = os.path.getsize(webtrack_path)
    click.echo(
        "\tCompression: %d -> %d bytes => %d %%"
        % (gpx_size, webtrack_size, 100 * (gpx_size - webtrack_size) / gpx_size)
    )


def gpx_to_webtrack_without_elevation(
    gpx_path: str, webtrack_path: str, simplify: bool, verbose: bool
) -> None:
    """
    Convert the GPX path to WebTrack without elevation and save the result
    into ``webtrack_path`` which is overwritten if already existing.

    .. note::
        This is the fallback when the elevation profile failed. The logic is
        the same otherwise.

    Args:
        gpx_path (str): Secured path to the input file.
        webtrack_path (str): Secured path to the overwritten output file.
        simplify (bool): Simplify the GPX data with the Ramer-Douglas-Peucker algorithm.
        verbose (bool): Print additional information about the data and conversion.

    Returns:
        The result is saved into a file, nothing is returned.
    """
    with open(gpx_path, "r") as input_gpx_file:
        gpx = gpxpy.parse(input_gpx_file)
        if simplify:
            gpx.simplify()
        current_length = 0
        all_points: List = []
        gps_prev_point = None
        for track in gpx.tracks:
            all_points.append([])
            for segment in track.segments:
                for gps_curr_point in segment.points:
                    if gps_prev_point is not None:
                        current_length += gpxpy.geo.haversine_distance(
                            gps_curr_point.latitude,
                            gps_curr_point.longitude,
                            gps_prev_point.latitude,
                            gps_prev_point.longitude,
                        )
                    gps_prev_point = gpxpy.geo.Location(
                        gps_curr_point.latitude,
                        gps_curr_point.longitude,
                    )
                    all_points[-1].append(
                        [
                            gps_curr_point.longitude,
                            gps_curr_point.latitude,
                            current_length,
                        ]
                    )

        waypoints = []
        for waypoint in gpx.waypoints:
            waypoints.append(
                [
                    waypoint.longitude,
                    waypoint.latitude,
                    False,  # without elevation
                    None,
                    waypoint.symbol,
                    waypoint.name,
                ]
            )

        full_profile = {
            "segments": [{"withEle": False, "points": seg} for seg in all_points],
            "waypoints": waypoints,
            "trackInformation": {
                "length": current_length,
            },
        }

        webtrack = WebTrack()
        webtrack.to_file(webtrack_path, full_profile)
        if verbose:
            print_transcompilation_summary(gpx_path, webtrack_path, full_profile)


def get_webtrack_source(dem_dataset: str) -> str:
    """Return DEM code according to the WebTrack spec."""
    for dem in DEM_DATASETS:
        if dem[1] == dem_dataset:
            return dem[2]
    return ""


def gpx_to_webtrack_with_elevation(
    gpx_path: str,
    webtrack_path: str,
    username: str,
    simplify: bool,
    dem_dataset: str,
    verbose: bool,
) -> None:
    """
    Find out the elevation profile of ``gpx_path`` thanks to SRTM data
    version 3.0 with 1-arc-second for the whole world and save the result
    into ``webtrack_path`` which is overwritten if already existing.

    SRTM data are stored in the folder specified in CustomFileHandler().get_srtm_dir()

    * Data source: https://e4ftl01.cr.usgs.gov/MEASURES/SRTMGL1.003/
    * Also: https://lpdaac.usgs.gov/products/srtmgl1v003/

    .. note::
        In case of USGS.gov server error, you should see a notification banner in:
        https://lpdaac.usgs.gov/products/srtmgl1v003/
        such as `LP DAAC websites and HTTP downloads will be unavailable...`

    .. note::
        SRTMGL1.003 data requires user authentication through the NASA Earthdata Login.

    .. note::
        Whereas the WebTrack spec supports multiple DEM (per segment/waypoint). The DEM
        source in this implementation is the same for the entire WebTrack so that you can
        pick the one that looks better on the elevation profile.

    Args:
        gpx_path (str): Secured path to the input file.
        webtrack_path (str): Secured path to the overwritten output file.
        username (str): NASA Earthdata username.
        simplify (bool): Simplify the GPX data with the Ramer-Douglas-Peucker algorithm.
        dem_dataset (str): DEM dataset.
        verbose (bool): Print additional information about the data and conversion.

    Returns:
        The result is saved into a file, nothing is returned.
    """
    global USERNAME
    if USERNAME is None:
        if not username:
            USERNAME = click.prompt("Earthdata Username", prompt_suffix="? ")
        else:
            USERNAME = username
    global PASSWORD
    if PASSWORD is None and "JdF" not in dem_dataset:
        PASSWORD = click.prompt(
            "Earthdata Password", prompt_suffix="? ", hide_input=True
        )
    password = PASSWORD
    elevation_data = elevation.GeoElevationData(
        version=dem_dataset,
        earth_data_user=username,
        earth_data_password=password,
        file_handler=CustomFileHandler(),
    )
    with open(gpx_path, "r") as input_gpx_file:
        gpx = gpxpy.parse(input_gpx_file)
        if simplify:
            gpx.simplify()
        elevation_data.add_elevations(gpx, smooth=True)
        elevation_profiles: List = []
        elevation_min = 10000
        elevation_max = -elevation_min
        elevation_total_gain = 0
        elevation_total_loss = 0
        current_length = 0
        for track in gpx.tracks:
            delta_h = None
            elevation_profiles.append([])  # add one WebTrack segment
            for segment in track.segments:
                for gps_curr_point in segment.points:
                    # add point to segment:
                    if delta_h is not None:
                        current_length += gpxpy.geo.haversine_distance(
                            gps_curr_point.latitude,
                            gps_curr_point.longitude,
                            gps_prev_point.latitude,
                            gps_prev_point.longitude,
                        )
                    elevation_profiles[-1].append(
                        [
                            gps_curr_point.longitude,
                            gps_curr_point.latitude,
                            current_length,
                            gps_curr_point.elevation,
                        ]
                    )

                    # statistics:
                    if gps_curr_point.elevation is None:
                        raise ValueError("Expected elevation to be known.")
                    if elevation_min > gps_curr_point.elevation:  # type: ignore[operator]
                        elevation_min = gps_curr_point.elevation  # type: ignore[assignment]
                    if elevation_max < gps_curr_point.elevation:  # type: ignore[operator]
                        elevation_max = gps_curr_point.elevation  # type: ignore[assignment]
                    if delta_h is None:
                        delta_h = gps_curr_point.elevation
                    else:
                        delta_h = gps_curr_point.elevation - gps_prev_point.elevation
                        if delta_h > 0:
                            elevation_total_gain += delta_h
                        else:
                            elevation_total_loss -= (
                                delta_h  # keep loss positive/unsigned
                            )

                    gps_prev_point = gpxpy.geo.Location(
                        gps_curr_point.latitude,
                        gps_curr_point.longitude,
                        gps_curr_point.elevation,
                    )

        elevation_source = get_webtrack_source(dem_dataset)
        waypoints = []
        for waypoint in gpx.waypoints:
            point_ele = elevation_data.get_elevation(
                waypoint.latitude, waypoint.longitude, approximate=False
            )
            waypoints.append(
                [
                    waypoint.longitude,
                    waypoint.latitude,
                    elevation_source,  # with elevation
                    point_ele,
                    waypoint.symbol,
                    waypoint.name,
                ]
            )

        full_profile = {
            "segments": [
                {"withEle": elevation_source, "points": one_profile}
                for one_profile in elevation_profiles
            ],
            "waypoints": waypoints,
            "trackInformation": {
                "length": current_length,
                "minimumAltitude": elevation_min,
                "maximumAltitude": elevation_max,
                "elevationGain": elevation_total_gain,
                "elevationLoss": elevation_total_loss,
            },
        }

        webtrack = WebTrack()
        webtrack.to_file(webtrack_path, full_profile)
        if verbose:
            print_transcompilation_summary(
                gpx_path, webtrack_path, full_profile, dem_dataset
            )


if __name__ == "__main__":
    with_elevation()
