import datetime
import json
import os
import subprocess
from fractions import Fraction
from math import sqrt
from shutil import copy2
from typing import Dict
from typing import List
from typing import Optional
from typing import Tuple
from typing import Union

import click
import exiftool
from PIL import Image

TYPICAL_WIDTH = 6028
TYPICAL_HEIGHT = 4012
FOCAL_PLANE_DIAGONAL_FULL_FRAME = sqrt(36**2 + 24**2)

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


def body_lens_model_exif(d) -> Tuple[str, str]:
    lens_model: Union[str, None] = None
    try:
        maker = d["EXIF:Make"]
    except KeyError as err:
        raise KeyError("Missing camera info") from err
    try:
        field1, field2, field3 = "Composite:LensID", "MakerNotes:LensType", "MakerNotes:LensModel"
        if field1 in d and d[field1] in LENS_IDS[maker]:
            lens_model = LENS_IDS[maker][d[field1]]
        elif field2 in d and d[field2] in LENS_IDS[maker]:
            lens_model = LENS_IDS[maker][d[field2]]
        elif d[field3]:
            lens_model = d[field3]
    except KeyError as err:
        raise KeyError("Missing lens info") from err
    if not lens_model:
        raise KeyError("Missing lens info")
    try:
        body_model = d["EXIF:Model"]
        if body_model and " " not in body_model:
            body_model = f"{maker} {body_model}"
    except KeyError as err:
        raise KeyError("Missing camera body info") from err
    if not body_model:
        raise KeyError("Missing camera body info")
    return body_model, lens_model


def date_taken_exif(d) -> datetime.datetime:
    try:
        exif_tag = d["EXIF:DateTimeOriginal"]
        return datetime.datetime.strptime(exif_tag, "%Y:%m:%d %H:%M:%S")
    except KeyError as err:
        raise KeyError("Missing date taken") from err


def focal_length_35mm_exif(d) -> int:
    try:
        return round(d["EXIF:FocalLengthIn35mmFormat"])
    except KeyError:
        try:
            focal_length = d["EXIF:FocalLength"]
            diagonal = d["MakerNotes:FocalPlaneDiagonal"]
            return round(focal_length * FOCAL_PLANE_DIAGONAL_FULL_FRAME / diagonal)
        except KeyError as err:
            raise KeyError("Missing focal length") from err


def exposure_time_s_exif(d) -> str:
    try:
        exif_tag = d["EXIF:ExposureTime"]
        return str(Fraction(exif_tag).limit_denominator())
    except KeyError as err:
        raise KeyError("Missing exposure time") from err


def f_number_exif(d) -> float:
    try:
        return d["EXIF:FNumber"]
    except KeyError as err:
        raise KeyError("Missing F-number") from err


def iso_exif(d) -> int:
    try:
        return d["EXIF:ISO"]
    except KeyError as err:
        raise KeyError("Missing ISO") from err


def computational_mode_exif(d) -> Optional[str]:
    try:
        coded_mode = d["MakerNotes:StackedImage"]
        computational_group, computational_detail = coded_mode.split(" ")
        h_group = COMPUTATIONAL_MODE[computational_group]
        if isinstance(h_group, dict):
            return h_group[computational_detail]
        else:
            return h_group
    except KeyError:
        return None


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


@click.command()
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
    if not os.path.exists(raw_file):
        click.echo("RAW file does not exist.", err=True)
        return
    d = exiftool.ExifToolHelper().get_metadata(raw_file)[0]
    body_model, lens_model = body_lens_model_exif(d)
    exif = [
        date_taken_exif(d),
        focal_length_35mm_exif(d),
        exposure_time_s_exif(d),
        f_number_exif(d),
        iso_exif(d),
        body_model,
        lens_model,
        computational_mode_exif(d),
    ]

    # find the date taken that will be the folder name
    dirname = exif[0].strftime("%y%m%d%H%M%S")

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
    generate_social(album_path)
    generate_webp(album_path)


def generate_social(album_path: str) -> None:
    all_photos = [
        dirname
        for dirname in os.listdir(album_path)
        if os.path.isdir(os.path.join(album_path, dirname))
    ]
    all_photos.sort()
    for dirname in all_photos:
        dirname = os.path.join(album_path, dirname)
        output_image_path = os.path.join(dirname, "_to_social.jpg")
        if os.path.exists(output_image_path):
            continue
        input_image_path = os.path.join(dirname, guess_original(dirname))
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


def generate_webp(album_path: str) -> None:
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
        input_image_path = None
        for curr_config in all_var_options:
            name = curr_config[0]
            webp_path = dirname + "/" + name + ".webp"
            webp_option_1 = [
                "cwebp",
                "-preset",
                "photo",
                "-mt",
                "-m",
                "6",
                "-q",
                str(curr_config[3]),
                "-af",
            ]
            if os.path.exists(webp_path):
                continue  # TODO: invalidate existing generated WebP if older than original
            if input_image_path is None:
                # guess input file once per folder after checking WebP existence
                input_image_path = os.path.join(dirname, guess_original(dirname))
            if name == "f":
                original_size = get_image_size(input_image_path)
                height_after_crop = round(
                    original_size[0] * TYPICAL_HEIGHT / TYPICAL_WIDTH
                )
                if height_after_crop <= original_size[1]:
                    subprocess.run(  # landscape to fixed width/height thumbnail
                        webp_option_1
                        + [
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
                        webp_option_1
                        + [
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
                    webp_option_1
                    + [
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
                if file.lower().endswith("." + ext) and priority > best_priority:
                    best_priority, best_file = priority, file
    if best_file:
        return best_file
    raise FileNotFoundError(f"Missing original photo in `{dir_path}'")


if __name__ == "__main__":
    add_photo()
