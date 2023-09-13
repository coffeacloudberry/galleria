import datetime
import os

from photo_manager_cli.src.photos_manager import get_image_exif

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures")


def test_get_image_exif():
    om5_highres_file = os.path.join(FIXTURES, "om5_highres_sample.ORF")
    metadata = get_image_exif(om5_highres_file)
    expected_metadata = [
        datetime.datetime(2023, 1, 29, 12, 59, 32),
        112,
        "1/13",
        8,
        200,
        "OM Digital Solutions OM-5",
        "SIGMA 56mm F1.4 DC DN | C 018",
        "Hand-held high resolution",
    ]
    assert metadata == expected_metadata
