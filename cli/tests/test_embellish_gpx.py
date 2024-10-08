import datetime
import os
from filecmp import cmp

import pytest

from cli.src.embellish_gpx import add_dem_to_filename
from cli.src.embellish_gpx import embellish_gpx_with_elevation
from cli.src.embellish_gpx import embellish_gpx_without_elevation

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures")
FAKE_TIME = datetime.datetime(2024, 4, 20, 0, 0, 0, 0)


@pytest.fixture
def patch_datetime_today(monkeypatch):

    class StaticDatetime(datetime.datetime):
        @classmethod
        def today(cls):
            return FAKE_TIME

    monkeypatch.setattr(datetime, "datetime", StaticDatetime)


def test_add_dem_to_filename():
    with pytest.raises(ValueError):
        add_dem_to_filename("test.gpx", "asdf", "my/fol/der/")
    with pytest.raises(ValueError):
        add_dem_to_filename("story_name/test.gpx", "", "my/fol/der/")
    assert add_dem_to_filename("story_name/test.gpx", "asdf", "my/fol/der/") == "my/fol/der/story_name.asdf.gpx"
    assert add_dem_to_filename("story_name/test.gpx", "asdf") == "story_name/test.asdf.gpx"


def test_embellish_gpx_without_elevation(patch_datetime_today):
    gpx_file_in = os.path.join(FIXTURES, "Gillespie_Circuit.gpx")
    gpx_file_expected_out = os.path.join(FIXTURES, "embellished_without_elevation.gpx")
    gpx_file_out = "tmp.gpx"
    embellish_gpx_without_elevation(gpx_file_in, gpx_file_out)
    assert cmp(gpx_file_out, gpx_file_expected_out)
    os.remove(gpx_file_out)


def test_embellish_gpx_with_elevation(patch_datetime_today):
    gpx_file_in = os.path.join(FIXTURES, "Gillespie_Circuit.gpx")
    gpx_file_expected_out = os.path.join(FIXTURES, "embellished_with_elevation.gpx")
    gpx_file_out = "tmp.gpx"
    embellish_gpx_with_elevation(gpx_file_in, gpx_file_out, "JdF1")
    assert cmp(gpx_file_out, gpx_file_expected_out)
    os.remove(gpx_file_out)
