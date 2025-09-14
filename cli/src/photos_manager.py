import datetime
import json
import os
import re
import subprocess
import sys
from fractions import Fraction
from math import sqrt
from pathlib import Path
from shutil import copy2
from typing import Optional

import click
import exiftool
import gpxpy
import gpxpy.gpx  # skipcq: PY-W2000
from PIL import Image

DIR_FORMAT = "%y%m%d%H%M%S"
TESTING = "pytest" in sys.modules
REGEX_WEBP_DIMENSION = re.compile(r"Dimension: +(\d+) x (\d+)")
REGEX_WEBP_OVERVIEW = re.compile(r"Output: +(.+)")
FOCAL_PLANE_DIAGONAL_FULL_FRAME = sqrt(36**2 + 24**2)
LENS_IDS = {}
PATH_TO_NIKON_LENSES = os.path.join(os.path.dirname(__file__), "NikonLensID.json")
PATH_TO_OMSYSTEM_LENSES = os.path.join(os.path.dirname(__file__), "OlympusLensType.json")
PATH_TO_COMPUTATIONAL_MODES = os.path.join(os.path.dirname(__file__), "OlympusStackedImage.json")
with open(PATH_TO_NIKON_LENSES, "r", encoding="utf-8") as nikon_lens_id:
    LENS_IDS["NIKON CORPORATION"] = json.load(nikon_lens_id)
with open(PATH_TO_OMSYSTEM_LENSES, "r", encoding="utf-8") as olympus_lens_id:
    LENS_IDS["OM Digital Solutions"] = json.load(olympus_lens_id)
with open(PATH_TO_COMPUTATIONAL_MODES, "r", encoding="utf-8") as olympus_computational_mode:
    COMPUTATIONAL_MODE = json.load(olympus_computational_mode)


def body_lens_model_exif(d) -> tuple[str, str]:
    lens_model: str | None = None
    try:
        maker = d["EXIF:Make"]
    except KeyError as err:
        raise ValueError("Missing camera info!") from err
    try:
        field1, field2, field3 = (
            "Composite:LensID",
            "MakerNotes:LensType",
            "MakerNotes:LensModel",
        )
        if field1 in d and d[field1] in LENS_IDS[maker]:
            lens_model = LENS_IDS[maker][d[field1]]
        elif field2 in d and d[field2] in LENS_IDS[maker]:
            lens_model = LENS_IDS[maker][d[field2]]
        elif d[field3]:
            lens_model = d[field3]
    except KeyError as err:
        raise ValueError("Missing or unknown lens info!") from err
    if not lens_model:
        raise ValueError("Missing lens info!")
    try:
        body_model = d["EXIF:Model"]
        if body_model and " " not in body_model:
            body_model = f"{maker} {body_model}"
    except KeyError as err:
        raise ValueError("Missing camera body info!") from err
    if not body_model:
        raise ValueError("Missing camera body info!")
    return body_model, lens_model


def scanner_model_exif(d) -> str:
    maker = d["EXIF:Make"]
    scanner_model = d["EXIF:Model"]
    return f"{maker} {scanner_model}"


def date_taken_exif(d) -> tuple[datetime.datetime, Optional[str]]:
    """Find out the date and time when the photo has been taken. The datetime is naive local time.
    Use the `EXIF:DateTimeOriginal`. `EXIF:CreateDate` is another useful field but unused because the
    datetime original is always populated. By the specification, DateTimeOriginal should be the time
    of the shutter actuation, and CreateDate should be the time that the file was written to the memory card.
    """
    try:
        exif_tag = d["EXIF:DateTimeOriginal"]
        timezone = d.get("EXIF:OffsetTimeOriginal")
        return datetime.datetime.strptime(exif_tag, "%Y:%m:%d %H:%M:%S"), timezone
    except (KeyError, ValueError) as err:
        raise ValueError("Missing date taken!") from err


def focal_length_35mm_exif(d) -> int:
    """Find out the focal length in 35mm format.
    Use the `EXIF:FocalLengthIn35mmFormat` tag if existing. Otherwise, use the `EXIF:FocalLength` alongside
    the `MakerNotes:FocalPlaneDiagonal`. The `Composite:FocalLength35efl` is not used because that field
    is determined/computed using the aforementioned fields. Notice that the focal length does not depend
    on the sensor size, e.g. 30mm MFT is 30mm full frame. What changes with the sensor crop is the field
    of view. It is however common in the photography community to take the sensor crop into account when
    talking about focal length.
    """
    try:
        return round(d["EXIF:FocalLengthIn35mmFormat"])
    except KeyError:
        try:
            focal_length = d["EXIF:FocalLength"]
            diagonal = d["MakerNotes:FocalPlaneDiagonal"]
            return round(focal_length * FOCAL_PLANE_DIAGONAL_FULL_FRAME / diagonal)
        except KeyError as err:
            raise ValueError("Missing focal length!") from err


def exposure_time_s_exif(d) -> str:
    try:
        exif_tag = d["EXIF:ExposureTime"]
        return str(Fraction(exif_tag).limit_denominator())
    except KeyError as err:
        raise ValueError("Missing exposure time!") from err


def f_number_exif(d) -> float:
    try:
        return d["EXIF:FNumber"]
    except KeyError as err:
        raise ValueError("Missing F-number!") from err


def iso_exif(d) -> int:
    try:
        return d["EXIF:ISO"]
    except KeyError as err:
        raise ValueError("Missing ISO!") from err


def computational_mode_exif(d) -> Optional[str]:
    try:
        coded_mode = d["MakerNotes:StackedImage"]
        computational_group, computational_detail = coded_mode.split(" ")
        h_group = COMPUTATIONAL_MODE[computational_group]
        if isinstance(h_group, dict):
            return h_group[computational_detail]
        return h_group
    except KeyError:
        return None


def get_image_size(path: str | Path) -> tuple[int, int]:
    """Open the file to find out the image size (width, height)."""
    img = Image.open(path)
    return img.size


def generate_info_json(prev_photo: Optional[str], next_photo: Optional[str], exif: list, position: tuple[float, float] | None) -> dict:
    """Generate the content of the story metadata file."""
    data = {
        "title": {"en": "", "fi": "", "fr": ""},
        "description": {"en": "", "fi": "", "fr": ""},
        "downloadable": False,
        "story": "",
        "dateTaken": exif[0].isoformat(),
        "focalLength35mm": exif[1],
        "exposureTime": exif[2],
        "fNumber": exif[3],
        "iso": exif[4],
        "body": exif[5],
        "lens": exif[6],
        "computationalMode": exif[7],
    }
    if prev_photo is not None:
        data["prev"] = int(prev_photo)
    if next_photo is not None:
        data["next"] = int(next_photo)
    if position is not None:
        data["position"] = {"lat": position[1], "lon": position[0]}
    film = exif[8]
    if film:
        data["film"] = film
    scanner = exif[9]
    if scanner:
        data["scanner"] = scanner
    return data


def get_exif_data(tif_path: str | Path):
    exif_data = exiftool.ExifToolHelper().get_metadata(tif_path)[0]
    # discard lists that are not hashable and causing issues
    return {k: v for k, v in exif_data.items() if not isinstance(v, list)}


def has_valid_export(original_path: str | Path, exported_path: str | Path) -> bool:
    if not os.path.exists(exported_path):
        return False
    # invalidate existing generated file if older than original
    return os.path.getmtime(exported_path) > os.path.getmtime(original_path)


def decode_webp_output(std_output: str) -> tuple[int, int, str]:
    dim_out = REGEX_WEBP_DIMENSION.search(std_output, re.MULTILINE | re.IGNORECASE)
    if not dim_out:
        raise ValueError("Failed to get WebP dimension!")
    overview_out = REGEX_WEBP_OVERVIEW.search(std_output, re.MULTILINE | re.IGNORECASE)
    if not overview_out:
        raise ValueError("Failed to get WebP output overview!")
    return int(dim_out[1]), int(dim_out[2]), overview_out[1]


def print_webp_conversion_summary(photo_id: str, name: str, data: tuple[int, int, str]) -> None:
    click.echo(f"[Photo {photo_id}] Converted to '{name}' WebP / {data[0]} x {data[1]} px / {data[2]}")


def convert_to_webp(
    original_path: str | Path,
    webp_path: str | Path,
    quality: int,
    w: Optional[int],
    h: Optional[int],
    cut_w: Optional[int] = None,
    cut_h: Optional[int] = None,
    cut_x: Optional[int] = None,
    cut_y: Optional[int] = None,
) -> tuple[int, int, str]:
    """
    Args:
        original_path: path to TIF file
        webp_path: path to generated WebP file
        quality: compression factor for RGB channels between 75 and 99
        w: width of the WebP photo
        h: height of the WebP photo
        cut_w: width of the original photo or None for no cropping
        cut_h: height of the original photo or None for no cropping
        cut_x: left corner of the original photo or None for no cropping
        cut_y: top corner of the original photo or None for no cropping
    """
    if w is None and h is None:
        raise ValueError("Both width and height are missing")
    if cut_x is None and cut_y is None and cut_w is None and cut_h is None:
        crop = []
    else:
        if cut_w is None or cut_h is None:
            raise ValueError("Crop shall be sized")
        crop = [
            "-crop",
            str(cut_x) if cut_x else "0",
            str(cut_y) if cut_y else "0",
            str(cut_w),
            str(cut_h),
        ]
    completed_process = subprocess.run(
        [
            "cwebp",
            "-preset",
            "photo",
            "-mt",
            "-m",
            "6",
            "-q",
            str(quality),
            "-af",
        ]
        + crop
        + [
            "-resize",
            str(w) if w else "0",  # 0 means preserve the aspect-ratio
            str(h) if h else "0",
            str(original_path),
            "-o",
            str(webp_path),
        ],
        check=True,
        capture_output=True,
    )
    if completed_process.returncode != 0:
        raise RuntimeError("Failed to convert")
    return decode_webp_output(completed_process.stderr.decode("utf-8"))


def guess_original(dir_path: str) -> str:
    """Find out the original photo (most probably TIF, but could also be other formats)
    File name with at least one dot (f.i. DSC_9102.sth.tif) is skipped."""
    priorities = (
        ("tif", 100),
        ("png", 60),
        ("jpg", 30),
    )
    best_priority = -1
    best_file = None
    for file in os.listdir(dir_path):
        if os.path.isfile(os.path.join(dir_path, file)):
            if file.startswith("_"):
                continue
            for ext, priority in priorities:
                if file.lower().endswith("." + ext) and priority > best_priority:
                    best_priority, best_file = priority, file
    if best_file:
        return best_file
    raise FileNotFoundError(f"Missing original photo in `{dir_path}'")


def generate_webp(album_path: str | Path) -> list[tuple[str, str]]:
    generated_webp = []
    all_photos = [dirname for dirname in os.listdir(album_path) if os.path.isdir(os.path.join(album_path, dirname))]
    all_photos.sort()

    all_var_options = (
        ("f", 300, 200, 90),  # fixed width/height thumbnail
        ("t", None, 200, 90),
        ("s.p", 375, None, 90),  # small screen, mobile portrait
        ("s.l", None, 375, 90),  # small screen, mobile landscape
        ("m", None, 760, 90),
        ("l", None, 1030, 86),
        ("l.hd", None, 1030, 98),
    )

    for photo_id in all_photos:
        dirname = os.path.join(album_path, photo_id)
        input_image_path = None
        for curr_config in all_var_options:
            name, webp_w, webp_h, quality = curr_config
            webp_path = dirname + "/" + name + ".webp"
            if input_image_path is None:
                # guess input file only once per folder
                input_image_path = os.path.join(dirname, guess_original(dirname))
            if has_valid_export(input_image_path, webp_path):
                continue
            if name == "f":
                original_w, original_h = get_image_size(input_image_path)
                # crop enough to preserve the aspect-ratio
                height_after_crop = round(original_w * webp_h / webp_w)  # type: ignore[operator]
                if height_after_crop <= original_h:
                    data_webp = convert_to_webp(
                        original_path=input_image_path,
                        webp_path=webp_path,
                        quality=quality,
                        w=webp_w,
                        h=None,
                        cut_w=original_w,
                        cut_h=height_after_crop,
                        cut_x=None,
                        cut_y=int((original_h - height_after_crop) / 2),
                    )
                else:
                    width_after_crop = round(original_h * webp_w / webp_h)  # type: ignore[operator]
                    data_webp = convert_to_webp(
                        original_path=input_image_path,
                        webp_path=webp_path,
                        quality=quality,
                        w=webp_w,
                        h=None,
                        cut_w=width_after_crop,
                        cut_h=original_h,
                        cut_x=int((original_w - width_after_crop) / 2),
                        cut_y=None,
                    )
            else:  # just resize
                data_webp = convert_to_webp(input_image_path, webp_path, quality, webp_w, webp_h)
            print_webp_conversion_summary(photo_id, name, data_webp)
            generated_webp.append((photo_id, name))
    return generated_webp


def update_neighbor(album_path: str | Path, photo_id: str, next_or_prev: str, neighbor_id: Optional[str]) -> None:
    if neighbor_id is None:
        return
    with open(os.path.join(album_path, neighbor_id, "i.json"), "r", encoding="utf-8") as neighbor_photo_file:
        info_data = json.load(neighbor_photo_file)
    info_data[next_or_prev] = int(photo_id)
    with open(os.path.join(album_path, neighbor_id, "i.json"), "w", encoding="utf-8") as neighbor_photo_file:
        neighbor_photo_file.write(json.dumps(info_data, indent=4, ensure_ascii=False) + "\n")
    click.echo(f"[Photo {neighbor_id}] Linked to {photo_id} with '{next_or_prev}' field")


def find_prev_next(album_path: str | Path, photo_id: str) -> tuple[str | None, str | None]:
    """Find the position where the photo will be dropped on the album."""
    prev_photo, next_photo = None, None
    all_existing_photos_list_list = [other_dirs for _, other_dirs, _ in os.walk(album_path) if other_dirs]
    if len(all_existing_photos_list_list):
        all_existing_photos = all_existing_photos_list_list[0]
        if len(all_existing_photos):
            all_existing_photos.sort()
            position = 0
            for existing_photo_id in all_existing_photos:
                if photo_id == existing_photo_id:
                    raise ValueError("Photo already in the album!")
                if int(photo_id) > int(existing_photo_id):
                    position += 1
                else:
                    break
            prev_photo = all_existing_photos[position - 1] if position > 0 else None
            next_photo = all_existing_photos[position] if position < len(all_existing_photos) else None
    return prev_photo, next_photo


def copy_all_related_files(tif_path, new_dir_path):
    """Copy all files starting with the same name as the TIF file."""
    tif_file_dir = os.path.dirname(tif_path)
    tif_file_name = os.path.basename(tif_path).split(".")[0]
    for associated_file in os.listdir(tif_file_dir):
        path_to_file = os.path.join(tif_file_dir, associated_file)
        if os.path.isfile(path_to_file) and associated_file.startswith(tif_file_name):
            copy2(path_to_file, new_dir_path)


def import_exif_to_tif(tif_path: str | Path) -> set[tuple[str, str | int | float]]:
    """Guess RAW file from TIF and import the metadata from the RAW file into the TIF.
    Notice that the `EXIF:Software` field is replaced from the editor (RawTherapee) to
    the camera firmware version.
    Returns:
        The list of added or modified metadata fields (MakerNotes, EXIF, Composite).
    """
    found_cam = False
    for raw_ext in ("ORF", "NEF", "dng"):
        cam_path = f"{os.path.splitext(tif_path)[0]}.{raw_ext}"
        if os.path.exists(cam_path):
            found_cam = True
            break
    if not found_cam:
        cam_path = click.prompt("Failed to find RAW file. Enter manually")
    if not cam_path:
        raise ValueError("Failed to find RAW file!")
    exif_data_before = set(get_exif_data(tif_path).items())
    completed_process = subprocess.run(
        [
            "exiftool",
            str(tif_path),
            "-tagsFromFile",
            str(cam_path),
            "-Orientation=",
        ],
        check=True,
        capture_output=True,
    )
    if completed_process.returncode != 0:
        raise RuntimeError("Failed to import EXIF")
    changed_exif_data = set(get_exif_data(tif_path).items()) - exif_data_before
    click.echo(f"Copied {tif_path} to {tif_path}_original")
    click.echo(f"Added or modified {len(changed_exif_data)} metadata fields")
    return changed_exif_data


def import_and_get_exif_data(err: str, tif_path: str):
    click.echo(err, err=True)
    if not TESTING:
        import_exif_to_tif(tif_path)
    return get_exif_data(tif_path)


def map_link(position: tuple[float, float]) -> str:
    lon, lat = position
    return f"https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=15/{lat}/{lon}&layers=P"


def guess_position_from_gpx(gpx_path: str | Path | None, date_taken: datetime.datetime, timezone: str) -> tuple[float, float] | None:
    """
    Args:
        gpx_path: Path to the GPX file
        date_taken: Naive local date time
        timezone: Time zone string in the ±hh:mm format
    """
    if not gpx_path:
        return None
    # attach timezone to naive local time without adjustment of date and time data
    date_taken_timezone_aware = date_taken.replace(tzinfo=datetime.datetime.strptime(timezone, "%z").tzinfo)
    smallest_diff_ms = float("inf")
    best_match: tuple[float, float] | None = None
    gpx_missing_datetime = True
    with open(gpx_path, "r", encoding="utf-8") as input_gpx_file:
        gpx = gpxpy.parse(input_gpx_file)
        for track in gpx.tracks:
            for segment in track.segments:
                for point in segment.points:
                    if point.time:  # this time is UTC
                        gpx_missing_datetime = False
                        diff_ms = abs(date_taken_timezone_aware - point.time) / datetime.timedelta(milliseconds=1)
                        if diff_ms < smallest_diff_ms:
                            smallest_diff_ms = diff_ms
                            best_match = (point.longitude, point.latitude)
        for waypoint in gpx.waypoints:
            if waypoint.time:
                gpx_missing_datetime = False
                diff_ms = abs(date_taken_timezone_aware - waypoint.time) / datetime.timedelta(milliseconds=1)
                if diff_ms < smallest_diff_ms:
                    smallest_diff_ms = diff_ms
                    best_match = (waypoint.longitude, waypoint.latitude)
    if gpx_missing_datetime:
        raise ValueError("GPX file does not contain any date/time!")
    click.echo(f"Position guessed with the following time delta: {datetime.timedelta(seconds=smallest_diff_ms / 1000)}")
    return best_match


def add_photo_to_album(album_path: str | Path, tif_path: str, gpx_path: str | Path | None) -> None:
    """Add one photo to the album."""
    if not os.path.exists(tif_path):
        raise ValueError("RAW file does not exist!")
    d = get_exif_data(tif_path)
    try:
        body_model, lens_model = body_lens_model_exif(d)
    except ValueError as err:
        d = import_and_get_exif_data(str(err), tif_path)
        body_model, lens_model = body_lens_model_exif(d)

    # Find the date taken that will be the folder name.
    # In case the timezone is unexpected, fix it:
    # https://gist.github.com/coffeacloudberry/89d45ff812c11ee9e35dd2e787ca71eb
    try:
        date_taken, timezone = date_taken_exif(d)
        if timezone:
            click.echo(f"Timezone is {timezone}")
        else:
            d = import_and_get_exif_data("Missing timezone!", tif_path)
            date_taken, timezone = date_taken_exif(d)
            if timezone:
                click.echo(f"Timezone is {timezone}")
            else:
                click.echo("Really, missing timezone!", err=True)
        photo_id = date_taken.strftime(DIR_FORMAT)
    except KeyError:
        photo_id = click.prompt("When the photo has been taken? (format=YYMMDDhhmmss)")
        date_taken, timezone = datetime.datetime.strptime(photo_id, DIR_FORMAT), None

    click.echo(f"Adding photo {photo_id}...")
    exif = [
        date_taken,
        focal_length_35mm_exif(d),
        exposure_time_s_exif(d),
        f_number_exif(d),
        iso_exif(d),
        body_model,
        lens_model,
        computational_mode_exif(d),
        None,
        None,
    ]

    prev_photo, next_photo = find_prev_next(album_path, photo_id)
    if gpx_path and not timezone:
        # the time zone is only needed if a story is provided, assuming the story contains a GPX file
        timezone = click.prompt("What is the UTC offset of the photo? (format=±hh:mm)")
    if gpx_path and timezone:
        position = guess_position_from_gpx(gpx_path, date_taken, timezone)
        if position:
            click.echo("The photo is most likely located here:")
            click.echo(map_link(position))
    else:
        position = None

    # create the new photo
    new_info_data = json.dumps(generate_info_json(prev_photo, next_photo, exif, position), indent=4, ensure_ascii=False)
    new_dir_path = os.path.join(album_path, photo_id)
    os.mkdir(new_dir_path)
    with open(os.path.join(new_dir_path, "i.json"), "w", encoding="utf-8") as json_file:
        json_file.write(new_info_data + "\n")

    copy_all_related_files(tif_path, new_dir_path)
    update_neighbor(album_path, photo_id, "next", prev_photo)
    update_neighbor(album_path, photo_id, "prev", next_photo)

    # triggers global check and update of generated photos to make sure everything is synced
    generate_webp(album_path)
    click.echo(f"[Photo {photo_id}] Added")


def add_film_to_album(album_path: str | Path, film_path: str, iso: int, film: str) -> None:
    if not os.path.exists(film_path):
        raise ValueError("Film file does not exist!")
    photo_id = click.prompt("What is the local time when the photo has been taken? (format=YYMMDDhhmmss)")
    prev_photo, next_photo = find_prev_next(album_path, photo_id)
    date_taken, _ = datetime.datetime.strptime(photo_id, DIR_FORMAT), None
    scanner = scanner_model_exif(d)
    click.echo(f"Adding photo {photo_id}...")
    exif = [
        date_taken,
        37,
        None,
        None,
        iso,
        "Pentax 17",
        None,
        None,
        film,
        scanner,
    ]
    new_info_data = json.dumps(generate_info_json(prev_photo, next_photo, exif, None), indent=4, ensure_ascii=False)
    new_dir_path = os.path.join(album_path, photo_id)
    os.mkdir(new_dir_path)
    with open(os.path.join(new_dir_path, "i.json"), "w", encoding="utf-8") as json_file:
        json_file.write(new_info_data + "\n")
    copy_all_related_files(film_path, new_dir_path)
    update_neighbor(album_path, photo_id, "next", prev_photo)
    update_neighbor(album_path, photo_id, "prev", next_photo)
    generate_webp(album_path)
    click.echo(f"[Photo {photo_id}] Added")


@click.command()
@click.option(
    "--album-path",
    required=True,
    prompt="Path to current photos",
    help="Path to the photos already existing in the blog.",
)
@click.option(
    "--tif-path",
    help="Path to TIF file. Other files starting with the same name will be copied.",
)
@click.option(
    "--film-path",
    help="Path to film file. Other files starting with the same name will be copied.",
)
@click.option(
    "--iso",
    help="ISO of the film.",
)
@click.option(
    "--film",
    help="Film name.",
)
@click.option(
    "--gpx-path",
    help="Path to the GPX file used to geotag the photo by comparing GPS/EXIF date/time.",
)
def add_photo(
    album_path: str,
    tif_path: str | None = None,
    film_path: str | None = None,
    iso: int | None = None,
    film: str | None = None,
    gpx_path: str | None = None,
) -> None:
    try:
        if tif_path:
            add_photo_to_album(album_path, tif_path, gpx_path)
        elif film_path and iso and film:
            add_film_to_album(album_path, film_path, iso, film)
        else:
            generate_webp(album_path)
    except ValueError as err:
        click.echo(err, err=True)


if __name__ == "__main__":
    add_photo()
