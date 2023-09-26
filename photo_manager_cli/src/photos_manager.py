"""
Manage the photos of my blog.

Usage:
python photos_manager.py add-photo --raw-file photo.tif --album-path /home/.../photos/
python photos_manager.py generate-webp --album-path /home/.../photos/

Notes:
    If the metadata is missing from the TIF file, run `exiftool DSC_9201.tif -tagsFromFile DSC_9201.NEF`
"""

import datetime
import json
import os
import re
import subprocess
import tarfile
from fractions import Fraction
from html.parser import HTMLParser
from math import sqrt
from shutil import copy2
from typing import Dict
from typing import List
from typing import Optional
from typing import Tuple
from typing import Union

import click
import exiftool
import requests
from PIL import Image

TYPICAL_WIDTH = 6028
TYPICAL_HEIGHT = 4012
FOCAL_PLANE_DIAGONAL_FULL_FRAME = sqrt(36**2 + 24**2)

GOOGLE_REPO_LISTING_ENDPOINT = (
    "https://storage.googleapis.com/downloads.webmproject.org/releases/webp/index.html"
)
LIBWEBP_DIRNAME = os.path.join(os.path.dirname(__file__), "..", "libwebp")

LENS_IDS = {}
with open(
    os.path.join(os.path.dirname(__file__), "NikonLensID.json"), "r"
) as nikon_lens_id:
    LENS_IDS["NIKON CORPORATION"] = json.load(nikon_lens_id)
with open(
    os.path.join(os.path.dirname(__file__), "OlympusLensType.json"), "r"
) as olympus_lens_id:
    LENS_IDS["OM Digital Solutions"] = json.load(olympus_lens_id)
with open(
    os.path.join(os.path.dirname(__file__), "OlympusStackedImage.json"), "r"
) as olympus_computational_mode:
    COMPUTATIONAL_MODE = json.load(olympus_computational_mode)


class GoogleRepoParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self._all_links = {}

    def handle_starttag(self, tag, attrs):
        re_semver = re.compile(r".+libwebp-(?P<semver>[\w.-]+)-linux")
        for attr in attrs:
            key, value = attr
            if key == "href" and "-linux-x86-64" in value:
                url = f"https:{value}"
                semver = re_semver.match(url).group("semver")
                if semver in self._all_links:
                    self._all_links[semver].append(url)
                else:
                    self._all_links[semver] = [url]

    @property
    def all_links(self):
        return self._all_links


class WebPUpdaterException(Exception):
    pass


class WebPUpdater:
    def __init__(self):
        self._all_links = WebPUpdater.download_repo_list()
        self._latest_version = WebPUpdater.find_latest(list(self._all_links.keys()))

    @property
    def version(self):
        return self._latest_version

    def download(self):
        all_files = self._all_links[self._latest_version]
        for file in all_files:
            if file.endswith(".tar.gz"):
                WebPUpdater.download_release(file)
                return

    @staticmethod
    def get_latest_downloaded() -> Optional[str]:
        sub_folders = next(os.walk(LIBWEBP_DIRNAME))[1]
        prefix = "libwebp-"
        found_release = WebPUpdater.find_latest(
            [
                version[len(prefix) :]
                for version in sub_folders
                if version.startswith(prefix)
            ]
        )
        return prefix + found_release if found_release else None

    @staticmethod
    def download_release(url_source: str):
        source_filename = os.path.join(LIBWEBP_DIRNAME, url_source.split("/")[-1])
        with open(source_filename, "wb") as fp_source:
            response = requests.get(url_source)
            response.raise_for_status()
            fp_source.write(response.content)
        signature_filename = os.path.join(LIBWEBP_DIRNAME, source_filename + ".asc")
        with open(signature_filename, "wb") as fp_signature:
            response = requests.get(url_source + ".asc")
            response.raise_for_status()
            fp_signature.write(response.content)

        WebPUpdater.import_signing_key()
        WebPUpdater.verify_download(signature_filename, source_filename)
        WebPUpdater.extract_lib(source_filename)
        os.remove(source_filename)
        os.remove(signature_filename)

    @staticmethod
    def extract_lib(path_lib: str) -> None:
        tar = tarfile.open(path_lib)
        tar.extractall(path=LIBWEBP_DIRNAME)
        tar.close()

    @staticmethod
    def import_signing_key() -> None:
        result = subprocess.run(
            [
                "gpg",
                "--import",
                os.path.join(LIBWEBP_DIRNAME, "webmproject.key"),
            ],
            capture_output=True,
            text=True,
        )
        output = result.stderr.lower()
        print(output)
        if "imported" not in output and "not changed" not in output:
            raise WebPUpdaterException("Failed to import WebP release signing key")

    @staticmethod
    def verify_download(signature_filename: str, source_filename: str) -> None:
        result = subprocess.run(
            [
                "gpg",
                "--verify",
                signature_filename,
                source_filename,
            ],
            capture_output=True,
            text=True,
        )
        output = result.stderr.lower()
        print(output)
        if "bad signature" in output:
            raise WebPUpdaterException("Bad PGP signature")

    @staticmethod
    def download_repo_list() -> Dict[str, List[str]]:
        response = requests.get(GOOGLE_REPO_LISTING_ENDPOINT)
        response.raise_for_status()
        parser = GoogleRepoParser()
        parser.feed(response.text)
        return parser.all_links

    @staticmethod
    def find_latest(all_releases: List[str]) -> Optional[str]:
        latest_major, latest_minor, latest_patch, latest_rc = (0, 0, 0, None)
        latest_release = None
        for release in all_releases:
            if not release:
                continue
            extracted_v = release.split(".")
            major = int(extracted_v[0])
            minor = int(extracted_v[1])
            rc = None
            if "-" in extracted_v[2]:
                sub_v = extracted_v[2].split("-")
                patch = int(sub_v[0])
                rc = sub_v[1]
            else:
                patch = int(extracted_v[2])
            is_more_recent = False
            if latest_major < major:
                is_more_recent = True
            elif latest_major == major:
                if latest_minor < minor:
                    is_more_recent = True
                elif latest_minor == minor:
                    if latest_patch < patch:
                        is_more_recent = True
                    elif (
                        latest_patch == patch
                        and latest_rc
                        and (rc is None or latest_rc < rc)
                    ):
                        is_more_recent = True
            if is_more_recent:
                latest_major, latest_minor, latest_patch, latest_rc = (
                    major,
                    minor,
                    patch,
                    rc,
                )
                latest_release = release
        return latest_release


def get_image_exif(path: str) -> List:
    """
    Get EXIF data.

    Args:
        path (str): Path to the image (tiff or jpg).

    Returns:
        (date taken in a datetime format or None if not available, focal length
        35mm-format as integer or None if not available, exposure time as a
        formatted string in seconds or None if not available, f-number ratio as
        float or None if not available, ISO as integer or None if not available,
        camera body model as string or None, lens model name as string or None,
        computational mode as string or None)
    """
    lens_model: Union[str, None] = None
    body_model: Union[str, None] = None
    date_taken: Union[datetime.datetime, None] = None
    focal_length_35mm: Union[int, None] = None
    exposure_time_s: Union[str, None] = None
    f_number: Union[float, None] = None
    iso: Union[int, None] = None
    computational_mode: Union[str, None] = None
    with exiftool.ExifToolHelper() as et:
        for d in et.get_metadata(path):
            try:
                maker = d["EXIF:Make"]
            except KeyError:
                continue
            try:
                field1, field2, field3 = "Composite:LensID", "MakerNotes:LensType", "MakerNotes:LensModel"
                if field1 in d and d[field1] in LENS_IDS[maker]:
                    lens_model = LENS_IDS[maker][d[field1]]
                elif field2 in d and d[field2] in LENS_IDS[maker]:
                    lens_model = LENS_IDS[maker][d[field2]]
                elif d[field3]:
                    lens_model = d[field3]
            except KeyError:
                pass
            try:
                body_model = d["EXIF:Model"]
                # Nikon: NIKON D7100
                # OM Digital Solutions: OM-5 (the manufacturer is in the EXIF:Make field)
                if body_model and " " not in body_model:
                    body_model = f"{maker} {body_model}"
            except KeyError:
                pass
            try:
                date_taken = datetime.datetime.strptime(
                    d["EXIF:DateTimeOriginal"], "%Y:%m:%d %H:%M:%S"
                )
            except KeyError:
                pass
            try:
                focal_length_35mm = round(d["EXIF:FocalLengthIn35mmFormat"])
            except KeyError:
                try:
                    focal_length = d["EXIF:FocalLength"]
                    diagonal = d["MakerNotes:FocalPlaneDiagonal"]
                    focal_length_35mm = round(
                        focal_length * FOCAL_PLANE_DIAGONAL_FULL_FRAME / diagonal
                    )
                except KeyError:
                    pass
            try:
                exposure_time_s = str(
                    Fraction(d["EXIF:ExposureTime"]).limit_denominator()
                )
            except KeyError:
                pass
            try:
                f_number = d["EXIF:FNumber"]
            except KeyError:
                pass
            try:
                iso = d["EXIF:ISO"]
            except KeyError:
                pass
            try:
                coded_mode = d["MakerNotes:StackedImage"]
                computational_group, computational_detail = coded_mode.split(" ")
                h_group = COMPUTATIONAL_MODE[computational_group]
                if isinstance(h_group, dict):
                    computational_mode = h_group[computational_detail]
                else:
                    computational_mode = h_group
            except KeyError:
                pass
    return [
        date_taken,
        focal_length_35mm,
        exposure_time_s,
        f_number,
        iso,
        body_model,
        lens_model,
        computational_mode,
    ]


def get_image_size(path: str) -> Tuple[int, int]:
    """Open the file to find out the image size."""
    img = Image.open(path)
    return img.size


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


def generate_info_json(
    prev_photo: Optional[str], next_photo: Optional[str], exif: List
) -> Dict:
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
    return data


@click.group()
def cli_add_photo():
    pass


@cli_add_photo.command()
@click.option(
    "--album-path",
    required=True,
    prompt="Path to current photos",
    help="Path to the photos already existing in the blog.",
)
@click.option(
    "--raw-file",
    required=True,
    prompt="RAW file",
    help="RAW file. Other files starting with the same name will be copied. Export to TIF beforehand.",
)
def add_photo(album_path: str, raw_file: str) -> None:
    """Add one photo to the album."""
    exif = get_image_exif(raw_file)

    # find the date taken that will be the folder name
    date_taken = exif[0]
    dir_format = "%y%m%d%H%M%S"
    if date_taken:
        dirname = date_taken.strftime(dir_format)
    else:
        dirname = click.prompt("When the photo has been taken? (format=YYMMDDhhmmss)")
        exif[0] = datetime.datetime.strptime(dirname, dir_format)

    # find the position where the photo will be dropped on the album
    all_existing_photos_list_list = [
        other_dirs for _, other_dirs, _ in os.walk(album_path) if other_dirs
    ]
    all_existing_photos = all_existing_photos_list_list[0]
    all_existing_photos.sort()
    position = 0
    for current_photo in all_existing_photos:
        if dirname == current_photo:
            click.echo("Photo already in the album!", err=True)
            return
        if int(dirname) > int(current_photo):
            position += 1
        else:
            break
    prev_photo = all_existing_photos[position - 1] if position > 1 else None
    next_photo = (
        all_existing_photos[position] if position < len(all_existing_photos) else None
    )

    # create the new photo
    new_info_data = json.dumps(
        generate_info_json(prev_photo, next_photo, exif), indent=4, ensure_ascii=False
    )
    new_dir_path = os.path.join(album_path, dirname)
    os.mkdir(new_dir_path)
    with open(os.path.join(new_dir_path, "i.json"), "w") as json_file:
        json_file.write(new_info_data + "\n")

    # copy all files starting with the same name as the raw file
    raw_file_dir = os.path.dirname(raw_file)
    raw_file_name = os.path.basename(raw_file).split(".")[0]
    for associated_file in os.listdir(raw_file_dir):
        path_to_file = os.path.join(raw_file_dir, associated_file)
        if os.path.isfile(path_to_file) and associated_file.startswith(raw_file_name):
            copy2(path_to_file, new_dir_path)

    click.echo("Created " + dirname)

    # edit the neighbours
    def update_neighbor(next_or_prev_item: str, neighbor_name: Optional[str]) -> None:
        if neighbor_name is None:
            return
        with open(
            os.path.join(album_path, neighbor_name, "i.json"), "r"
        ) as neighbor_photo_file:
            info_data = json.load(neighbor_photo_file)
        info_data[next_or_prev_item] = int(dirname)
        with open(
            os.path.join(album_path, neighbor_name, "i.json"), "w"
        ) as neighbor_photo_file:
            neighbor_photo_file.write(
                json.dumps(info_data, indent=4, ensure_ascii=False) + "\n"
            )
        click.echo("Edited " + neighbor_name)

    update_neighbor("next", prev_photo)
    update_neighbor("prev", next_photo)


@click.group()
def cli_generate_social():
    pass


@cli_generate_social.command()
@click.option(
    "--album-path",
    required=True,
    prompt="Path to current photos",
    help="Path to the photos already existing in the blog.",
)
def generate_social(album_path: str) -> None:
    all_photos = [
        dirname
        for dirname in os.listdir(album_path)
        if os.path.isdir(os.path.join(album_path, dirname))
    ]
    all_photos.sort()
    for dirname in all_photos:
        dirname = os.path.join(album_path, dirname)
        input_image_path = os.path.join(dirname, guess_original(dirname))
        output_image_path = os.path.join(dirname, "_to_social.jpg")
        im = Image.open(input_image_path)
        im = im.convert("RGB")
        ratio = im.size[1] / im.size[0]
        output_image_width = 1000
        output_image_height = int(output_image_width * ratio)
        if output_image_height > output_image_width:
            output_image_height = 1000
            output_image_width = int(output_image_height / ratio)
        im.thumbnail((output_image_width, output_image_height), Image.Resampling.LANCZOS)
        im.save(output_image_path, "JPEG", quality=94)
        click.echo(f"Generated {output_image_path}")


@click.group()
def cli_generate_webp():
    pass


@cli_generate_webp.command()
@click.option(
    "--album-path",
    required=True,
    prompt="Path to current photos",
    help="Path to the photos already existing in the blog.",
)
@click.option(
    "--cwebp-path",
    required=False,
    help="Path to the cwebp command of libwebp.",
)
def generate_webp(album_path: str, cwebp_path: Optional[str]) -> None:
    if not cwebp_path:
        local_lib = WebPUpdater.get_latest_downloaded()
        if not local_lib:
            click.confirm(
                "Failed to find libwebp locally, download from Google servers?",
                abort=True,
                default=False,
                err=True,
            )
            webp_updater = WebPUpdater()
            print(f"Latest WebP release: {webp_updater.version}")
            webp_updater.download()
            local_lib = WebPUpdater.get_latest_downloaded()
            if not local_lib:
                raise WebPUpdaterException("Failed again to find libwebp locally")
        cwebp_path = os.path.join(LIBWEBP_DIRNAME, local_lib, "bin", "cwebp")
    all_photos = [
        dirname
        for dirname in os.listdir(album_path)
        if os.path.isdir(os.path.join(album_path, dirname))
    ]
    all_photos.sort()

    all_var_options = (
        ("f", 300, 200, 90),
        ("t", None, 200, 90),
        ("s.p", 375, None, 90),  # small screen, mobile portrait
        ("s.l", None, 375, 90),  # small screen, mobile landscape
        ("m", None, 760, 90),
        ("l", None, 1030, 86),
        ("l.hd", None, 1030, 98),
    )

    for dirname in all_photos:
        dirname = os.path.join(album_path, dirname)
        input_image_path = os.path.join(dirname, guess_original(dirname))
        for curr_config in all_var_options:
            name = curr_config[0]
            webp_path = dirname + "/" + name + ".webp"
            if os.path.exists(webp_path):
                continue  # TODO: invalidate existing generated WebP if older than original
            if name == "f":
                original_size = get_image_size(input_image_path)
                height_after_crop = round(
                    original_size[0] * TYPICAL_HEIGHT / TYPICAL_WIDTH
                )
                if height_after_crop <= original_size[1]:
                    subprocess.run(  # landscape to fixed width/height thumbnail
                        [
                            cwebp_path,
                            "-preset",
                            "photo",
                            "-mt",
                            "-m",
                            "6",
                            "-q",
                            str(curr_config[3]),
                            "-af",
                            "-crop",
                            "0",  # x position
                            str(
                                int((original_size[1] - height_after_crop) / 2)
                            ),  # y position
                            str(original_size[0]),  # full width
                            str(height_after_crop),  # typical height for landscapes
                            "-resize",
                            str(curr_config[1]),  # fixed width
                            "0",  # height calculated preserving the aspect-ratio
                            input_image_path,
                            "-o",
                            webp_path,
                        ]
                    )
                else:
                    width_after_crop = round(
                        original_size[1] * TYPICAL_WIDTH / TYPICAL_HEIGHT
                    )
                    subprocess.run(  # portrait to fixed width/height thumbnail
                        [
                            cwebp_path,
                            "-preset",
                            "photo",
                            "-mt",
                            "-m",
                            "6",
                            "-q",
                            str(curr_config[3]),
                            "-af",
                            "-crop",
                            str(
                                int((original_size[0] - width_after_crop) / 2)
                            ),  # x position
                            "0",  # y position
                            str(width_after_crop),  # typical width for portraits
                            str(original_size[1]),  # full height
                            "-resize",
                            str(curr_config[1]),  # fixed width
                            "0",  # height calculated preserving the aspect-ratio
                            input_image_path,
                            "-o",
                            webp_path,
                        ]
                    )
            else:
                resize = (
                    [str(curr_config[1]), "0"]
                    if curr_config[2] is None
                    else ["0", str(curr_config[2])]
                )
                subprocess.run(  # just resize
                    [
                        cwebp_path,
                        "-preset",
                        "photo",
                        "-mt",
                        "-m",
                        "6",
                        "-q",
                        str(curr_config[3]),
                        "-af",
                        "-resize",
                    ]
                    + resize
                    + [
                        input_image_path,
                        "-o",
                        webp_path,
                    ]
                )


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
            for ext, priority in priorities:
                if (
                    len(file.split(".")) < 3
                    and file.lower().endswith("." + ext)
                    and priority > best_priority
                ):
                    best_priority, best_file = priority, file
    if best_file:
        return best_file
    raise FileNotFoundError(f"Missing original photo in `{dir_path}'")


cli = click.CommandCollection(sources=[cli_add_photo, cli_generate_social, cli_generate_webp])

if __name__ == "__main__":
    cli()
