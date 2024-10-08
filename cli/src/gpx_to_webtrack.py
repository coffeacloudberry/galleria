import glob
import os
import re
from collections import defaultdict
from typing import Optional

import click
import gpxpy
import gpxpy.geo
import gpxpy.gpx
from dotenv import load_dotenv

from cli.src import elevation
from cli.src.webtrack import Activity
from cli.src.webtrack import WebTrack

load_dotenv()
NASA_USERNAME = os.environ.get("NASA_USERNAME", "")
NASA_PASSWORD = os.environ.get("NASA_PASSWORD", "")
DEM_DATASETS = (
    ("SRTMGL1v3", "E"),
    ("ASTGTMv3", "G"),
    ("JdF1", "J"),
    ("JdF3", "K"),
)
DEM_CHOICES = [dem[0] for dem in DEM_DATASETS] + ["none"]


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
    "--simplify",
    is_flag=True,
    help="Simplify with the Ramer-Douglas-Peucker algorithm",
)
@click.option(
    "--fallback",
    is_flag=True,
    help="Generate the WebTrack file without elevation if failed to fetch",
)
@click.option(
    "--not-flat",
    is_flag=True,
    help="Put the elevation data in the track even if considered very flat",
)
@click.option(
    "--dem",
    default="none",
    type=click.Choice(DEM_CHOICES, case_sensitive=False),
    help="Digital Elevation Model",
)
def with_elevation(gpx: str, recursive: bool, simplify: bool, fallback: bool, not_flat: bool, dem: str) -> None:
    if os.path.isdir(gpx):
        for filename in glob.iglob(gpx + "/**", recursive=recursive):
            if os.path.isfile(filename) and filename.lower().endswith(".gpx"):
                gpx_to_webtrack(filename, simplify, dem, fallback, not_flat)
    elif recursive:
        click.echo("Recursive mode and input file are incompatible", err=True)
    else:
        gpx_to_webtrack(gpx, simplify, dem, fallback, not_flat)


def gpx_to_webtrack(gpx: str, simplify: bool, dem: str, fallback: bool, not_flat: bool) -> None:
    pre, _ = os.path.splitext(gpx)
    webtrack = ".".join([pre, "webtrack"])
    click.echo(f"Processing `{gpx}'...")
    if dem == "none":
        click.echo("Generating with no elevation...")
        analysis = AnalysisWithoutElevation(gpx, webtrack, simplify)
        analysis.analyse_and_save()
    else:
        try:
            analysis = AnalysisWithElevation(gpx, webtrack, simplify, dem, not_flat)  # type: ignore[assignment]
            analysis.analyse_and_save()
        except Exception as err:
            click.echo(str(err), err=True)
            if fallback:
                click.echo("Falling back with no elevation...")
                analysis = AnalysisWithoutElevation(gpx, webtrack, simplify)
                analysis.analyse_and_save()
            else:
                return
    click.echo(f"Generated `{webtrack}'")


class Analysis:
    ACTIVITY_PATTERN = r".*\(webtrack activity: ([a-z ]+)\).*"
    ACTIVITY_RE = re.compile(ACTIVITY_PATTERN, re.IGNORECASE | re.DOTALL)

    # Distance where the position is approaching the track closely
    CLOSE_ENOUGH_METERS = 500

    # Distance where the position is leaving the track far enough
    FAR_ENOUGH_METERS = CLOSE_ENOUGH_METERS * 2

    def __init__(
        self,
        gpx_path: str,
        webtrack_path: str,
        simplify: bool,
        dem_dataset: Optional[str] = None,
        forced_elevation: Optional[bool] = False,
    ):
        """
        Args:
            gpx_path (str): Secured path to the input file.
            webtrack_path (str): Secured path to the overwritten output file.
            simplify (bool): Simplify the GPX data with the Ramer-Douglas-Peucker algorithm.
            dem_dataset (str): DEM dataset.
            forced_elevation (bool): True to force elevation data on track even if considered relatively flat.
        """
        self.gpx_path = gpx_path
        self.webtrack_path = webtrack_path
        self.simplify = simplify
        self.dem_dataset = dem_dataset
        self.forced_elevation = forced_elevation
        self.elevation_profiles: list[tuple[list[tuple[float, float, float, Optional[float]]], Activity]] = []
        self.activities: dict[Activity, float] = defaultdict(float)
        self.current_length = 0
        self.gps_prev_point = None
        self.track_length = 0
        self.gpx: Optional[gpxpy.gpx.GPX] = None

    def save_to_webtrack(self, full_profile):
        webtrack = WebTrack()
        webtrack.to_file(self.webtrack_path, full_profile)
        self.print_transcompilation_summary(full_profile)

    def flat_full_profile(self, waypoints):
        return {
            "segments": [
                {
                    "activity": seg[1],
                    "withEle": False,
                    "points": seg[0],
                }
                for seg in self.elevation_profiles
            ],
            "waypoints": waypoints,
            "trackInformation": {
                "lengths": {
                    "total": self.current_length,
                    "activities": [
                        {
                            "activity": activity,
                            "length": length,
                        }
                        for activity, length in self.activities.items()
                    ],
                },
            },
        }

    def print_transcompilation_summary(self, full_profile: dict) -> None:
        total_segments = len(full_profile["segments"])
        total_waypoints = len(full_profile["waypoints"])
        activities = full_profile["trackInformation"]["lengths"]["activities"]
        total_activities = len(activities)
        activities_str = ", ".join([activity["activity"].name for activity in activities])
        gpx_size = os.path.getsize(self.gpx_path)
        webtrack_size = os.path.getsize(self.webtrack_path)
        percent = (gpx_size - webtrack_size) / gpx_size
        click.echo("WebTrack file:")
        click.echo(f"\tTotal segments: {total_segments}")
        click.echo(f"\tTotal waypoints: {total_waypoints}")
        click.echo(f"\tActivities: {total_activities} ({activities_str})")
        click.echo(f"\tCompression: {gpx_size} -> {webtrack_size} bytes => {percent:.1%}")

    def guess_activity(self, description: Optional[str]) -> Activity:
        if not description:
            return Activity.UNDEFINED
        try:
            match = self.ACTIVITY_RE.match(description)
            if match:
                return Activity[match.group(1).upper().replace(" ", "_")]
        except TypeError:
            pass
        return Activity.UNDEFINED

    def guess_close_enough(self, waypoint: gpxpy.gpx.GPXWaypoint) -> int:
        """Find out the first closest point."""
        min_dist = 1.0 + 2**32
        idx_closest_point = 0
        idx_point = 0
        entered_close_enough = False
        if self.gpx is None:
            raise ValueError("Missing GPX data")
        for track in self.gpx.tracks:
            for segment in track.segments:
                for point in segment.points:
                    idx_point += 1
                    dist = Analysis.dist_between(point, waypoint)
                    if dist < self.CLOSE_ENOUGH_METERS:
                        entered_close_enough = True
                        if dist < min_dist:
                            min_dist = dist
                            idx_closest_point = idx_point
                    # hysteresis
                    elif dist > self.FAR_ENOUGH_METERS and entered_close_enough:
                        return idx_closest_point
        return idx_closest_point

    @staticmethod
    def dist_between(pt1, pt2):
        return gpxpy.geo.haversine_distance(
            pt1.latitude,
            pt1.longitude,
            pt2.latitude,
            pt2.longitude,
        )


class AnalysisWithoutElevation(Analysis):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def process_point(self, gps_curr_point):
        if self.gps_prev_point is not None:
            dist = gpxpy.geo.haversine_distance(
                gps_curr_point.latitude,
                gps_curr_point.longitude,
                self.gps_prev_point.latitude,
                self.gps_prev_point.longitude,
            )
            self.current_length += dist
            self.track_length += dist
        self.gps_prev_point = gpxpy.geo.Location(
            gps_curr_point.latitude,
            gps_curr_point.longitude,
        )
        self.elevation_profiles[-1][0].append(
            (
                gps_curr_point.longitude,
                gps_curr_point.latitude,
                self.current_length,
                None,
            )
        )

    def process_tracks(self):
        for track in self.gpx.tracks:
            activity = self.guess_activity(track.description)
            self.elevation_profiles.append(([], activity))
            self.track_length = 0
            self.gps_prev_point = None
            for segment in track.segments:
                for gps_curr_point in segment.points:
                    self.process_point(gps_curr_point)
            self.activities[activity] += self.track_length

    def analyse_and_save(self) -> None:
        with open(self.gpx_path, "r", encoding="utf-8") as input_gpx_file:
            self.gpx = gpxpy.parse(input_gpx_file)
            if self.simplify:
                self.gpx.simplify()
            self.process_tracks()

            waypoints = []
            for waypoint in self.gpx.waypoints:
                waypoints.append(
                    [
                        waypoint.longitude,
                        waypoint.latitude,
                        False,  # without elevation
                        None,
                        waypoint.symbol,
                        waypoint.name,
                        self.guess_close_enough(waypoint),
                    ]
                )

            full_profile = self.flat_full_profile(waypoints)
            self.save_to_webtrack(full_profile)


class AnalysisWithElevation(Analysis):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.elevation_min = 10000
        self.elevation_max = -self.elevation_min
        self.elevation_total_gain = 0
        self.elevation_total_loss = 0
        self.delta_h = None

    def get_webtrack_source(self) -> str:
        """Return DEM code according to the WebTrack spec."""
        for dem in DEM_DATASETS:
            if dem[0] == self.dem_dataset:
                return dem[1]
        return ""

    def process_point(self, gps_curr_point):
        # add point to the segment:
        if self.delta_h is not None:
            dist = Analysis.dist_between(gps_curr_point, self.gps_prev_point)
            self.current_length += dist
            self.track_length += dist
        self.elevation_profiles[-1][0].append(
            (
                gps_curr_point.longitude,
                gps_curr_point.latitude,
                self.current_length,
                gps_curr_point.elevation,
            )
        )

        # statistics:
        if gps_curr_point.elevation is None:
            raise ValueError("Expected elevation to be known.")
        self.elevation_min = min(self.elevation_min, gps_curr_point.elevation)  # type: ignore[assignment]
        self.elevation_max = max(self.elevation_max, gps_curr_point.elevation)  # type: ignore[assignment]
        if self.delta_h is None:
            self.delta_h = gps_curr_point.elevation
        else:
            self.delta_h = gps_curr_point.elevation - self.gps_prev_point.elevation
            if self.delta_h > 0:
                self.elevation_total_gain += self.delta_h
            else:
                # keep loss positive/unsigned
                self.elevation_total_loss -= self.delta_h

        self.gps_prev_point = gpxpy.geo.Location(
            gps_curr_point.latitude,
            gps_curr_point.longitude,
            gps_curr_point.elevation,
        )

    def process_tracks(self):
        for track in self.gpx.tracks:
            activity = self.guess_activity(track.description)
            self.elevation_profiles.append(([], activity))  # add one WebTrack segment
            self.track_length = 0
            self.delta_h = None
            for segment in track.segments:
                for gps_curr_point in segment.points:
                    if gps_curr_point.elevation is None:
                        raise ValueError("Expected elevation")
                    self.process_point(gps_curr_point)
            self.activities[activity] += self.track_length

    def analyse_and_save(self) -> None:
        """
        .. note::
            Whereas the WebTrack spec supports multiple DEM (per segment/waypoint). The DEM
            source in this implementation is the same for the entire WebTrack so that you can
            pick the one that looks better on the elevation profile.
        """
        if self.dem_dataset is None:
            raise ValueError("Missing DEM type")
        elevation_data = elevation.GeoElevationData(
            version=self.dem_dataset,
            earth_data_user=NASA_USERNAME,
            earth_data_password=NASA_PASSWORD,
        )
        with open(self.gpx_path, "r", encoding="utf-8") as input_gpx_file:
            self.gpx = gpxpy.parse(input_gpx_file)
            if self.simplify:
                self.gpx.simplify()
            elevation_data.add_elevations(self.gpx, smooth=True)
            self.process_tracks()
            elevation_source = self.get_webtrack_source()

            waypoints = []
            for waypoint in self.gpx.waypoints:
                point_ele = elevation_data.get_elevation(waypoint.latitude, waypoint.longitude)
                waypoints.append(
                    [
                        waypoint.longitude,
                        waypoint.latitude,
                        elevation_source,  # with elevation
                        point_ele,
                        waypoint.symbol,
                        waypoint.name,
                        self.guess_close_enough(waypoint),
                    ]
                )

            derivative = 100.0 * (self.elevation_total_gain + self.elevation_total_loss) / self.current_length
            track_is_flat = derivative < 2.0
            if track_is_flat and not self.forced_elevation:
                click.echo(f"The track is almost flat ({derivative:.1f}%), elevation removed!")
                full_profile = self.flat_full_profile(waypoints)
            else:
                full_profile = {
                    "segments": [
                        {
                            "activity": seg[1],
                            "withEle": elevation_source,
                            "points": seg[0],
                        }
                        for seg in self.elevation_profiles
                    ],
                    "waypoints": waypoints,
                    "trackInformation": {
                        "lengths": {
                            "total": self.current_length,
                            "activities": [
                                {
                                    "activity": activity,
                                    "length": length,
                                }
                                for activity, length in self.activities.items()
                            ],
                        },
                        "minimumAltitude": self.elevation_min,
                        "maximumAltitude": self.elevation_max,
                        "elevationGain": self.elevation_total_gain,
                        "elevationLoss": self.elevation_total_loss,
                    },
                }

            self.save_to_webtrack(full_profile)


if __name__ == "__main__":
    with_elevation()
