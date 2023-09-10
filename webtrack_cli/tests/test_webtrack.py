import os
from filecmp import cmp

from webtrack_cli.src.gpx_to_webtrack import good_webtrack_version
from webtrack_cli.src.gpx_to_webtrack import gpx_to_webtrack_with_elevation
from webtrack_cli.src.gpx_to_webtrack import gpx_to_webtrack_without_elevation

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures")


def test_gpx_to_webtrack_without_elevation_1seg_without_activity():
    """
    Provide a GPX file and compare the generated WebTrack with the expected data.
    The GPX contains many trkseg but only one trk, so only 1 WebTrack segment is expected.
    No activity is specified in the track description.
    """
    gpx_file = os.path.join(FIXTURES, "Gillespie_Circuit.gpx")
    generated_webtrack_file = "Gillespie_Circuit.webtrack"
    expected_webtrack_file = os.path.join(FIXTURES, "Gillespie_Circuit.webtrack")
    gpx_to_webtrack_without_elevation(gpx_file, generated_webtrack_file, False, False)
    assert cmp(generated_webtrack_file, expected_webtrack_file)
    os.remove(generated_webtrack_file)


def test_gpx_to_webtrack_without_elevation_1seg_with_activity():
    """
    Provide a GPX file and compare the generated WebTrack with the expected data.
    The GPX contains many trkseg but only one trk, so only 1 WebTrack segment is expected.
    The track description contains an activity that is listed in the spec.
    """
    gpx_file = os.path.join(FIXTURES, "Gillespie_Circuit_with_activity.gpx")
    generated_webtrack_file = "Gillespie_Circuit_with_activity.webtrack"
    expected_webtrack_file = os.path.join(
        FIXTURES, "Gillespie_Circuit_with_activity.webtrack"
    )
    gpx_to_webtrack_without_elevation(gpx_file, generated_webtrack_file, False, False)
    assert cmp(generated_webtrack_file, expected_webtrack_file)
    os.remove(generated_webtrack_file)


def test_gpx_to_webtrack_without_elevation_3segs_without_activities():
    """
    Provide a GPX file and compare the generated WebTrack with the expected data.
    The GPX contains 3 trk, so 3 WebTrack segments are expected.
    No activities are specified in the track descriptions.
    """
    gpx_file = os.path.join(FIXTURES, "Gillespie_Circuit_3segs.gpx")
    generated_webtrack_file = "Gillespie_Circuit_3segs.webtrack"
    expected_webtrack_file = os.path.join(FIXTURES, "Gillespie_Circuit_3segs.webtrack")
    gpx_to_webtrack_without_elevation(gpx_file, generated_webtrack_file, False, False)
    assert cmp(generated_webtrack_file, expected_webtrack_file)
    os.remove(generated_webtrack_file)


def test_gpx_to_webtrack_without_elevation_3segs_with_activities():
    """
    Provide a GPX file and compare the generated WebTrack with the expected data.
    The GPX contains 3 trk, so 3 WebTrack segments are expected.
    The track descriptions contain 2 activities that are listed in the spec.
    """
    gpx_file = os.path.join(FIXTURES, "Gillespie_Circuit_3segs_with_activities.gpx")
    generated_webtrack_file = "Gillespie_Circuit_3segs_with_activities.webtrack"
    expected_webtrack_file = os.path.join(
        FIXTURES, "Gillespie_Circuit_3segs_with_activities.webtrack"
    )
    gpx_to_webtrack_without_elevation(gpx_file, generated_webtrack_file, False, False)
    assert cmp(generated_webtrack_file, expected_webtrack_file)
    os.remove(generated_webtrack_file)


def test_gpx_to_webtrack_with_elevation_3segs_with_activities():
    """
    Provide a GPX file and compare the generated WebTrack with the expected data.
    The GPX contains 3 trk, so 3 WebTrack segments are expected.
    The track descriptions contain 2 activities that are listed in the spec.
    """
    gpx_file = os.path.join(FIXTURES, "Gillespie_Circuit_3segs_with_activities.gpx")
    generated_webtrack_file = (
        "Gillespie_Circuit_3segs_with_activities_and_elevation.webtrack"
    )
    expected_webtrack_file = os.path.join(
        FIXTURES, "Gillespie_Circuit_3segs_with_activities_and_elevation.webtrack"
    )
    gpx_to_webtrack_with_elevation(
        gpx_file, generated_webtrack_file, None, False, "JdF1", False, True,
    )
    assert cmp(generated_webtrack_file, expected_webtrack_file)
    os.remove(generated_webtrack_file)


def test_waypoints_snapped_to_track():
    """
    Check how waypoints are snapped to the track.
    The GPX contains 2 tracks and 2 waypoints.
    """
    gpx_file = os.path.join(FIXTURES, "test.gpx")
    generated_webtrack_file = "test.webtrack"
    expected_webtrack_file = os.path.join(FIXTURES, "test.webtrack")
    gpx_to_webtrack_without_elevation(gpx_file, generated_webtrack_file, False, False)
    assert cmp(generated_webtrack_file, expected_webtrack_file)
    os.remove(generated_webtrack_file)


def test_good_webtrack_version():
    """Check the read capability."""
    expected_webtrack_file = os.path.join(FIXTURES, "Gillespie_Circuit.webtrack")
    assert good_webtrack_version(expected_webtrack_file)
