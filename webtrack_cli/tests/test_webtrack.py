import os
from filecmp import cmp

from src.gpx_to_webtrack import good_webtrack_version
from src.gpx_to_webtrack import gpx_to_webtrack_without_elevation


def test_gpx_to_webtrack_without_elevation_1seg():
    """
    Provide a GPX file and compare the generated WebTrack with the expected data.
    The GPX contains many trkseg but only one trk, so only 1 WebTrack segment is expected.
    """
    #
    gpx_file = "tests/fixtures/Gillespie_Circuit.gpx"
    generated_webtrack_file = "tmp_Gillespie_Circuit.webtrack"
    expected_webtrack_file = "tests/fixtures/Gillespie_Circuit.webtrack"
    gpx_to_webtrack_without_elevation(gpx_file, generated_webtrack_file, False, False)
    assert cmp(generated_webtrack_file, expected_webtrack_file)
    os.remove(generated_webtrack_file)


def test_gpx_to_webtrack_without_elevation_3segs():
    """
    Provide a GPX file and compare the generated WebTrack with the expected data.
    The GPX contains 3 trk, so 3 WebTrack segments are expected.
    """
    gpx_file = "tests/fixtures/Gillespie_Circuit_3segs.gpx"
    generated_webtrack_file = "tmp_Gillespie_Circuit.webtrack"
    expected_webtrack_file = "tests/fixtures/Gillespie_Circuit_3segs.webtrack"
    gpx_to_webtrack_without_elevation(gpx_file, generated_webtrack_file, False, False)
    assert cmp(generated_webtrack_file, expected_webtrack_file)
    os.remove(generated_webtrack_file)


def test_good_webtrack_version():
    """Check the read capability."""
    expected_webtrack_file = "tests/fixtures/Gillespie_Circuit.webtrack"
    assert good_webtrack_version(expected_webtrack_file)
