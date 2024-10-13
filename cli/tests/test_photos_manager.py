import os
import shutil
from datetime import datetime

import pytest
from PIL import Image

from cli.src.photos_manager import add_photo_to_album
from cli.src.photos_manager import body_lens_model_exif
from cli.src.photos_manager import computational_mode_exif
from cli.src.photos_manager import convert_to_webp
from cli.src.photos_manager import date_taken_exif
from cli.src.photos_manager import decode_webp_output
from cli.src.photos_manager import exposure_time_s_exif
from cli.src.photos_manager import f_number_exif
from cli.src.photos_manager import find_prev_next
from cli.src.photos_manager import focal_length_35mm_exif
from cli.src.photos_manager import generate_social
from cli.src.photos_manager import generate_webp
from cli.src.photos_manager import get_exif_data
from cli.src.photos_manager import get_image_size
from cli.src.photos_manager import guess_position_from_gpx
from cli.src.photos_manager import import_exif_to_tif
from cli.src.photos_manager import iso_exif
from cli.src.photos_manager import map_link

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures")
SAMPLE_NIKON_TIF = os.path.join(FIXTURES, "sample_nikon.tif")
SAMPLE_OMSYSTEM_TIF = os.path.join(FIXTURES, "sample_omsystem.tif")
SAMPLE_CORRUPTED_EXIF_TIF = os.path.join(FIXTURES, "corrupted_exif.tif")
FILES = [SAMPLE_NIKON_TIF, SAMPLE_OMSYSTEM_TIF]


def create_album(tmp_path):
    for photo_id, filename in enumerate(FILES):
        photo_dir = tmp_path / str(photo_id + 1)
        photo_dir.mkdir()
        shutil.copyfile(filename, photo_dir / "photo.tif")


def test_exif_data_nikon():
    exif_data = get_exif_data(SAMPLE_NIKON_TIF)
    body_lens = body_lens_model_exif(exif_data)
    assert body_lens == ("NIKON D7100", "AF-S DX Nikkor 55-300mm f/4.5-5.6G ED VR")
    date_taken = date_taken_exif(exif_data)
    assert date_taken == (datetime(2015, 8, 30, 19, 43, 23), None)
    assert focal_length_35mm_exif(exif_data) == 450
    assert exposure_time_s_exif(exif_data) == "1/320"
    assert f_number_exif(exif_data) == 5.6
    assert iso_exif(exif_data) == 100
    assert computational_mode_exif(exif_data) is None


def test_exif_data_omsystem():
    exif_data = get_exif_data(SAMPLE_OMSYSTEM_TIF)
    body_lens = body_lens_model_exif(exif_data)
    assert body_lens == ("OM Digital Solutions OM-5", "Olympus M.Zuiko Digital ED 40-150mm F4.0 Pro")
    date_taken = date_taken_exif(exif_data)
    assert date_taken == (datetime(2023, 8, 7, 16, 18, 11), "+02:00")
    assert focal_length_35mm_exif(exif_data) == 300
    assert exposure_time_s_exif(exif_data) == "1/400"
    assert iso_exif(exif_data) == 320
    assert computational_mode_exif(exif_data) is None


def test_corrupted_exif():
    exif_data = get_exif_data(SAMPLE_CORRUPTED_EXIF_TIF)
    with pytest.raises(ValueError, match="Missing or unknown lens info!"):
        body_lens_model_exif(exif_data)


def test_import_exif_to_tif(tmp_path):
    orphan_tif = tmp_path / "orphan.tif"
    shutil.copyfile(SAMPLE_OMSYSTEM_TIF, orphan_tif)
    with pytest.raises(ValueError, match="Failed to find RAW file!"):
        import_exif_to_tif(orphan_tif)
    input_tif, input_orf = tmp_path / "in.tif", tmp_path / "in.ORF"
    shutil.copyfile(SAMPLE_CORRUPTED_EXIF_TIF, input_tif)
    shutil.copyfile(f"{os.path.splitext(SAMPLE_CORRUPTED_EXIF_TIF)[0]}.ORF", input_orf)
    changed_fields = import_exif_to_tif(input_tif)
    assert len(changed_fields) >= 229
    exif_data = get_exif_data(input_tif)
    body_lens = body_lens_model_exif(exif_data)
    assert body_lens == ("OM Digital Solutions OM-5", "Olympus M.Zuiko Digital ED 60mm F2.8 Macro")


def test_find_prev_next(tmp_path):
    create_album(tmp_path)
    assert find_prev_next(tmp_path, "0") == (None, "1")
    with pytest.raises(ValueError, match="Photo already in the album!"):
        find_prev_next(tmp_path, "1")
    with pytest.raises(ValueError, match="Photo already in the album!"):
        find_prev_next(tmp_path, "2")
    assert find_prev_next(tmp_path, "3") == ("2", None)


def test_get_image_size():
    assert get_image_size(SAMPLE_NIKON_TIF) == (1986, 1322)
    assert get_image_size(SAMPLE_OMSYSTEM_TIF) == (2460, 1836)


def test_generate_social(tmp_path):
    create_album(tmp_path)
    assert generate_social(tmp_path) == ["1", "2"]

    # increase test coverage by checking that the right exception is raised
    exif_data = get_exif_data(tmp_path / "1" / "_to_social.jpg")
    with pytest.raises(ValueError, match="Missing camera info!"):
        body_lens_model_exif(exif_data)
    with pytest.raises(ValueError, match="Missing date taken!"):
        date_taken_exif(exif_data)
    with pytest.raises(ValueError, match="Missing focal length!"):
        focal_length_35mm_exif(exif_data)
    with pytest.raises(ValueError, match="Missing exposure time!"):
        exposure_time_s_exif(exif_data)
    with pytest.raises(ValueError, match="Missing F-number!"):
        f_number_exif(exif_data)
    with pytest.raises(ValueError, match="Missing ISO!"):
        iso_exif(exif_data)
    # the computational mode is optional
    assert computational_mode_exif(exif_data) is None

    for photo_id in range(len(FILES)):
        path_to_new = tmp_path / str(photo_id + 1) / "_to_social.jpg"
        assert os.path.exists(path_to_new)

        # fitting in 1000x1000 px
        width, height = get_image_size(path_to_new)
        assert 100 < width <= 1000 and 100 < height <= 1000

        # does not contains PII
        for key in get_exif_data(path_to_new).keys():
            assert not (key.startswith("EXIF:") or key.startswith("XMP:"))

    original_to_update = "1"
    one_original = tmp_path / original_to_update / "photo.tif"
    one_original.touch()
    # make sure an update from the original photo triggers photo re-generation
    assert generate_social(tmp_path) == [original_to_update]


def test_decode_webp_output():
    std_output = "Saving file 'out.webp'\nFile:      /sample_nikon.tif\nDimension: 100 x 40\nOutput:    66 bytes Y-U-V-All-PSNR 64.68 99.00 99.00   66.44 dB\n           (0.13 bpp)\nblock count:  intra4:          0  (0.00%)\n              intra16:        21  (100.00%)\n              skipped:        20  (95.24%)\nbytes used:  header:             14  (21.2%)\n             mode-partition:     13  (19.7%)\n Residuals bytes  |segment 1|segment 2|segment 3|segment 4|  total\n    macroblocks:  |       5%|       0%|       0%|      95%|      21\n      quantizer:  |      15 |      15 |      13 |       8 |\n   filter level:  |       0 |       0 |       0 |       0 |\n"  # noqa: E501
    width, height, overview = decode_webp_output(std_output)
    assert width == 100
    assert height == 40
    assert overview == "66 bytes Y-U-V-All-PSNR 64.68 99.00 99.00   66.44 dB"


def test_convert_to_webp(tmp_path):
    with pytest.raises(ValueError):
        convert_to_webp("", "", 90, None, None)
    with pytest.raises(ValueError):
        convert_to_webp("", "", 90, 1, None, None, None, 1)
    data_webp = convert_to_webp(SAMPLE_NIKON_TIF, tmp_path / "out.webp", 90, 100, None)
    assert data_webp == (100, 67, "470 bytes Y-U-V-All-PSNR 47.37 99.00 99.00   49.13 dB")
    data_webp = convert_to_webp(SAMPLE_NIKON_TIF, tmp_path / "out.webp", 90, 100, None, 50, 20)
    assert data_webp == (100, 40, "66 bytes Y-U-V-All-PSNR 64.68 99.00 99.00   66.44 dB")


def test_generate_webp(tmp_path):
    create_album(tmp_path)
    expected_webp = ("f", "t", "s.p", "s.l", "m", "l", "l.hd")
    photo_1 = list(map(lambda x: ("1", x), expected_webp))
    photo_2 = list(map(lambda x: ("2", x), expected_webp))
    assert generate_webp(tmp_path) == photo_1 + photo_2

    for photo_id in range(len(FILES)):
        path_to_sub_dir = tmp_path / str(photo_id + 1)
        for filename in expected_webp:
            assert os.path.exists(os.path.join(path_to_sub_dir, f"{filename}.webp"))
        # verify fixed size
        assert get_image_size(path_to_sub_dir / "f.webp") == (300, 200)

    one_original = tmp_path / "2" / "photo.tif"
    im = Image.open(one_original)
    # touch the file and test the portrait mode
    rotated_photo = im.rotate(90, expand=True)
    rotated_photo.save(one_original)
    # make sure an update from the original photo triggers WebP re-generation
    assert generate_webp(tmp_path) == photo_2
    for photo_id in range(len(FILES)):
        assert get_image_size(tmp_path / str(photo_id + 1) / "f.webp") == (300, 200)


def test_add_photo(tmp_path):
    with pytest.raises(ValueError, match="RAW file does not exist!"):
        add_photo_to_album(tmp_path, SAMPLE_NIKON_TIF + "f", None)
    add_photo_to_album(tmp_path, SAMPLE_NIKON_TIF, None)
    with pytest.raises(ValueError, match="Photo already in the album!"):
        add_photo_to_album(tmp_path, SAMPLE_NIKON_TIF, None)
    add_photo_to_album(tmp_path, SAMPLE_OMSYSTEM_TIF, None)


def test_map_link():
    assert map_link((60.5, 40.2)) == "https://www.openstreetmap.org/?mlat=40.2&mlon=60.5#map=15/40.2/60.5&layers=P"


def test_guess_position_from_gpx():
    gpx_file = os.path.join(FIXTURES, "Gillespie_Circuit_without_elevation.gpx")
    date_taken = datetime.fromisoformat("2018-11-30T19:27:10")
    point_in_track = (169.18058859179999, -44.264991497600001)
    assert guess_position_from_gpx(gpx_file, date_taken, "+01:00") == point_in_track
    date_taken = datetime.fromisoformat("2018-12-02T21:25:26")
    point_in_waypoint = (169.15906000000001, -44.188572999999998)
    assert guess_position_from_gpx(gpx_file, date_taken, "-02:00") == point_in_waypoint
