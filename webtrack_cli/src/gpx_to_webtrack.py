"""
GPX to WebTrack convertor.
"""
import glob
import os
import re
from collections import defaultdict
from typing import Dict
from typing import List
from typing import Optional
from typing import Tuple

import click
import gpxpy
import gpxpy.gpx

try:
    import elevation
    from webtrack import Activity
    from webtrack import WebTrack
except ImportError:  # when testing
    from . import elevation
    from .webtrack import Activity
    from .webtrack import WebTrack

USERNAME = None
PASSWORD = None
ACTIVITY_PATTERN = re.compile(
    r".*\(webtrack activity: ([a-z ]+)\).*", re.IGNORECASE | re.DOTALL
)
DEM_DATASETS = (
    ("SRTMGL1v3", "SRTMGL1v3", "E"),
    ("ASTGTMv3", "ASTGTMv3", "G"),
    ('Jonathan de Ferranti 1"', "JdF1", "J"),
    ('Jonathan de Ferranti 3"', "JdF3", "K"),
)

# Distance where the position is approaching the track closely
CLOSE_ENOUGH_METERS = 500

# Distance where the position is leaving the track far enough
FAR_ENOUGH_METERS = CLOSE_ENOUGH_METERS * 2


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
    username: Optional[str],
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
    username: Optional[str],
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
    activities = data["trackInformation"]["lengths"]["activities"]
    activities_str = ", ".join([activity["activity"].name for activity in activities])
    click.echo(f"\tActivities: {len(activities)} ({activities_str})")
    gpx_size = os.path.getsize(gpx_path)
    webtrack_size = os.path.getsize(webtrack_path)
    click.echo(
        "\tCompression: %d -> %d bytes => %d %%"
        % (gpx_size, webtrack_size, 100 * (gpx_size - webtrack_size) / gpx_size)
    )


def guess_activity(description: Optional[str]) -> Activity:
    if not description:
        return Activity.UNDEFINED
    try:
        match = ACTIVITY_PATTERN.match(description)
        if match:
            return Activity[match.group(1).upper().replace(" ", "_")]
    except TypeError:
        pass
    return Activity.UNDEFINED


def guess_close_enough(gpx: gpxpy.gpx.GPX, waypoint: gpxpy.gpx.GPXWaypoint) -> int:
    """Find out the first closest point."""
    min_dist = 1.0 + 2**32
    idx_closest_point = 0
    idx_point = 0
    entered_close_enough = False
    for track in gpx.tracks:
        for segment in track.segments:
            for point in segment.points:
                idx_point += 1
                dist = gpxpy.geo.haversine_distance(
                    point.latitude,
                    point.longitude,
                    waypoint.latitude,
                    waypoint.longitude,
                )
                if dist < CLOSE_ENOUGH_METERS:
                    entered_close_enough = True
                    if dist < min_dist:
                        min_dist = dist
                        idx_closest_point = idx_point
                # hysteresis
                elif dist > FAR_ENOUGH_METERS and entered_close_enough:
                    return idx_closest_point
    return idx_closest_point


def flat_full_profile(all_points, waypoints, current_length, activities):
    return {
        "segments": [
            {
                "activity": seg[1],
                "withEle": False,
                "points": seg[0],
            }
            for seg in all_points
        ],
        "waypoints": waypoints,
        "trackInformation": {
            "lengths": {
                "total": current_length,
                "activities": [
                    {
                        "activity": activity,
                        "length": length,
                    }
                    for activity, length in activities.items()
                ],
            },
        },
    }


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
        all_points: List[Tuple[List[Tuple[float, float, float]], Activity]] = []
        activities: Dict[Activity, float] = defaultdict(float)
        for track in gpx.tracks:
            activity = guess_activity(track.description)
            all_points.append(([], activity))
            track_length = 0
            gps_prev_point = None
            for segment in track.segments:
                for gps_curr_point in segment.points:
                    if gps_prev_point is not None:
                        dist = gpxpy.geo.haversine_distance(
                            gps_curr_point.latitude,
                            gps_curr_point.longitude,
                            gps_prev_point.latitude,
                            gps_prev_point.longitude,
                        )
                        current_length += dist
                        track_length += dist
                    gps_prev_point = gpxpy.geo.Location(
                        gps_curr_point.latitude,
                        gps_curr_point.longitude,
                    )
                    all_points[-1][0].append(
                        (
                            gps_curr_point.longitude,
                            gps_curr_point.latitude,
                            current_length,
                        )
                    )
            activities[activity] += track_length

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
                    guess_close_enough(gpx, waypoint),
                ]
            )

        full_profile = flat_full_profile(all_points, waypoints, current_length, activities)
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
    username: Optional[str],
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
    needs_creds = "JdF" not in dem_dataset
    global USERNAME
    if USERNAME is None:
        if needs_creds and not username:
            USERNAME = click.prompt("Earthdata Username", prompt_suffix="? ")
        else:
            USERNAME = username
    global PASSWORD
    if PASSWORD is None and needs_creds:
        PASSWORD = click.prompt(
            "Earthdata Password", prompt_suffix="? ", hide_input=True
        )
    password = PASSWORD
    elevation_data = elevation.GeoElevationData(
        version=dem_dataset,
        earth_data_user=username,
        earth_data_password=password,
    )
    with open(gpx_path, "r") as input_gpx_file:
        gpx = gpxpy.parse(input_gpx_file)
        if simplify:
            gpx.simplify()
        elevation_data.add_elevations(gpx, smooth=True)
        elevation_profiles: List[
            Tuple[List[Tuple[float, float, float, float]], Activity]
        ] = []
        activities: Dict[Activity, float] = defaultdict(float)
        elevation_min = 10000
        elevation_max = -elevation_min
        elevation_total_gain = 0
        elevation_total_loss = 0
        current_length = 0
        for track in gpx.tracks:
            activity = guess_activity(track.description)
            elevation_profiles.append(([], activity))  # add one WebTrack segment
            track_length = 0
            delta_h = None
            for segment in track.segments:
                for gps_curr_point in segment.points:
                    if gps_curr_point.elevation is None:
                        raise ValueError("Expected elevation")
                    # add point to segment:
                    if delta_h is not None:
                        dist = gpxpy.geo.haversine_distance(
                            gps_curr_point.latitude,
                            gps_curr_point.longitude,
                            gps_prev_point.latitude,
                            gps_prev_point.longitude,
                        )
                        current_length += dist
                        track_length += dist
                    elevation_profiles[-1][0].append(
                        (
                            gps_curr_point.longitude,
                            gps_curr_point.latitude,
                            current_length,
                            gps_curr_point.elevation,
                        )
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
            activities[activity] += track_length

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
                    guess_close_enough(gpx, waypoint),
                ]
            )

        derivative = 100.0 * (elevation_total_gain + elevation_total_loss) / current_length
        track_is_flat = derivative < 3.0
        if track_is_flat:
            click.echo("The track is almost flat ({:.1f}%), elevation removed from track.".format(derivative))
            full_profile = flat_full_profile(elevation_profiles, waypoints, current_length, activities)
        else:
            full_profile = {
                "segments": [
                    {
                        "activity": seg[1],
                        "withEle": elevation_source,
                        "points": seg[0],
                    }
                    for seg in elevation_profiles
                ],
                "waypoints": waypoints,
                "trackInformation": {
                    "activity": Activity.UNDEFINED,
                    "lengths": {
                        "total": current_length,
                        "activities": [
                            {
                                "activity": activity,
                                "length": length,
                            }
                            for activity, length in activities.items()
                        ],
                    },
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
