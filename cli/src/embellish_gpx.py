import datetime
import os
from pathlib import Path
from typing import Optional

import click
import gpxpy
from dotenv import load_dotenv

from cli.src import elevation

load_dotenv()
DEM_DATASETS = [
    "SRTMGL1v3",
    "ASTGTMv3",
    "JdF1",
    "JdF3",
]
NASA_USERNAME = os.environ.get("NASA_USERNAME", "")
NASA_PASSWORD = os.environ.get("NASA_PASSWORD", "")
GPX_CREATOR = os.environ.get("GPX_CREATOR", "gpxpy")
GPX_AUTHOR_EMAIL = os.environ.get("GPX_AUTHOR_EMAIL", "contact@example.com")
GPX_AUTHOR_LINK = os.environ.get("GPX_AUTHOR_LINK", "https://example.com")
GPX_AUTHOR_NAME = os.environ.get("GPX_AUTHOR_NAME", "John Doe")
GPX_COPYRIGHT_LICENSE = os.environ.get("GPX_COPYRIGHT_LICENSE", "All Rights Reserved")


def add_dem_to_filename(filename_src: str, dem: str, output_path: Optional[str] = None) -> str:
    """
    Add the DEM source to the filename.
    Args:
        filename_src (str): The filename with the old extension.
            If `output_path` is provided, the filename is ignored and the parent folder
            of `filename_src` is used as filename. If `output_path` is missing, this
            function simply inserts the DEM source to `filename_src`.
        dem (str): The DEM source. Shall not be empty.
        output_path (str): Output path or same as input GPX file if missing.
            If provided, the `filename_src` parent folder is used as filename.
    Returns:
        str: The filename ending with .[DEM].gpx.
    """
    if not dem:
        raise ValueError("DEM required")
    if output_path:
        story_name = Path(filename_src).parent.name
        if not story_name:
            raise ValueError("Invalid output path")
        pre = os.path.join(output_path, story_name)
    else:
        pre, _ = os.path.splitext(filename_src)
    return ".".join([pre, dem, "gpx"])


@click.command()
@click.option(
    "--gpx",
    required=True,
    help="Path to the GPX file",
)
@click.option(
    "-o",
    "--output",
    help="Path to the directory where to save the embellished GPX file",
)
@click.option(
    "--dem",
    default="none",
    type=click.Choice(DEM_DATASETS + ["none"], case_sensitive=False),
    help="Digital Elevation Model",
)
def embellish_gpx(gpx: str, output: Optional[str], dem: str) -> None:
    embellished_gpx = add_dem_to_filename(gpx, dem, output)
    click.echo(f"Exporting `{gpx}'...")
    if dem == "none":
        embellish_gpx_without_elevation(gpx, embellished_gpx)
    else:
        embellish_gpx_with_elevation(gpx, embellished_gpx, dem)
    click.echo(f"Exported `{embellished_gpx}'")


class GPXFile:
    def __init__(self, gpx_path, dem_dataset: Optional[str] = None):
        self.gpx_path = gpx_path
        self.dem_dataset = dem_dataset
        self.file = None

    def __enter__(self):
        self.file = open(self.gpx_path, "r", encoding="utf-8")
        gpx = gpxpy.parse(self.file)
        gpx.creator = GPX_CREATOR
        gpx.author_email = GPX_AUTHOR_EMAIL
        gpx.author_link = GPX_AUTHOR_LINK
        gpx.author_name = GPX_AUTHOR_NAME
        gpx.copyright_author = GPX_AUTHOR_NAME
        gpx.copyright_license = GPX_COPYRIGHT_LICENSE
        current_date = datetime.datetime.today()
        gpx.copyright_year = str(current_date.year)
        printable_date = current_date.strftime("%d-%m-%Y")
        description = ""
        if self.dem_dataset:
            description += f"Elevation data source of tracks and routes is {self.dem_dataset}. "
        description += f"Last update: {printable_date}."
        gpx.description = description
        return gpx

    def __exit__(self, *args):
        self.file.close()


def embellish_gpx_without_elevation(gpx_path: str, embellished_gpx_path: str) -> None:
    """
    Embellish the GPX file without elevation and save the result
    into ``embellished_gpx_path`` which is overwritten if already existing.

    .. note::
        This is the fallback when the elevation profile failed. The logic is
        the same otherwise.

    Args:
        gpx_path (str): Secured path to the input file.
        embellished_gpx_path (str): Secured path to the overwritten output file.

    Returns:
        The result is saved into a file, nothing is returned.
    """
    with GPXFile(gpx_path) as gpx, open(embellished_gpx_path, "w", encoding="utf-8") as fp:
        fp.write(gpx.to_xml(version="1.1") + "\n")


def embellish_gpx_with_elevation(gpx_path: str, embellished_gpx_path: str, dem_dataset: str) -> None:
    """
    Find out the elevation profile of ``gpx_path`` thanks to elevation data
    and save the result into ``embellished_gpx_path`` which is overwritten if already existing.

    Args:
        gpx_path (str): Secured path to the input file.
        embellished_gpx_path (str): Secured path to the overwritten output file.
        dem_dataset (str): DEM dataset.

    Returns:
        The result is saved into a file, nothing is returned.
    """
    elevation_data = elevation.GeoElevationData(
        version=dem_dataset,
        earth_data_user=NASA_USERNAME,
        earth_data_password=NASA_PASSWORD,
    )
    with GPXFile(gpx_path, dem_dataset) as gpx:
        # remove GPS elevation that may not be as accurate as DEM
        for track in gpx.tracks:
            for segment in track.segments:
                for point_track in segment.points:
                    point_track.elevation = None
        for waypoint in gpx.waypoints:
            waypoint.elevation = None
        for route in gpx.routes:
            for point_route in route.points:
                point_route.elevation = None

        elevation_data.add_elevations(gpx, smooth=True)
        with open(embellished_gpx_path, "w", encoding="utf-8") as fp:
            fp.write(gpx.to_xml(version="1.1") + "\n")


if __name__ == "__main__":
    embellish_gpx()
