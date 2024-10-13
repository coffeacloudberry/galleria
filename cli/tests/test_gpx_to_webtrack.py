"""
Needed fixtures generated with:
```
python -m cli.src.gpx_to_webtrack --gpx cli/tests/fixtures/Gillespie_Circuit_without_elevation.gpx --dem none
python -m cli.src.gpx_to_webtrack --gpx cli/tests/fixtures/Gillespie_Circuit_with_activity_without_elevation.gpx --dem none
python -m cli.src.gpx_to_webtrack --gpx cli/tests/fixtures/Gillespie_Circuit_3segs_without_elevation.gpx --dem none
python -m cli.src.gpx_to_webtrack --gpx cli/tests/fixtures/Gillespie_Circuit_3segs_with_activities_without_elevation.gpx --dem none
python -m cli.src.gpx_to_webtrack --gpx cli/tests/fixtures/Gillespie_Circuit_3segs_with_activities.gpx --dem JdF1 --not-flat
```
"""

import os
from filecmp import cmp

from cli.src.gpx_to_webtrack import Analysis
from cli.src.gpx_to_webtrack import AnalysisWithElevation
from cli.src.gpx_to_webtrack import AnalysisWithoutElevation
from cli.src.webtrack import Activity

WEBTRACK_OUT = "Gillespie_Circuit_without_elevation.webtrack"
FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures")
WEBTRACK_IN = os.path.join(FIXTURES, WEBTRACK_OUT)


def test_guess_activity():
    analysis = Analysis("", "", False)
    assert analysis.guess_activity(None) == Activity.UNDEFINED
    texts = [
        "Nice walk with friends. (Webtrack activity: Moderate walk)"
        '&lt;div>\n&lt;p style=" margin-top:0px; margin-bottom:0px; margin-left:0px; margin-right:0px; -qt-block-indent:0; text-indent:0px;">Nice walk with friends. (Webtrack activity: Moderate walk)&lt;/p>&lt;/div>'  # noqa: E501
    ]
    for entry in texts:
        assert analysis.guess_activity(entry) == Activity.MODERATE_WALK


def test_gpx_to_webtrack_without_elevation_1seg_without_activity():
    """
    Provide a GPX file and compare the generated WebTrack with the expected data.
    The GPX contains many trkseg but only one trk, so only one WebTrack segment is expected.
    No activity is specified in the track description.
    """
    gpx_file = os.path.join(FIXTURES, "Gillespie_Circuit_without_elevation.gpx")
    analysis = AnalysisWithoutElevation(gpx_file, WEBTRACK_OUT, False)
    analysis.analyse_and_save()
    assert cmp(WEBTRACK_OUT, WEBTRACK_IN)
    os.remove(WEBTRACK_OUT)


def test_gpx_to_webtrack_without_elevation_1seg_with_activity():
    """
    Provide a GPX file and compare the generated WebTrack with the expected data.
    The GPX contains many trkseg but only one trk, so only one WebTrack segment is expected.
    The track description contains an activity listed in the spec.
    """
    gpx_file = os.path.join(FIXTURES, "Gillespie_Circuit_with_activity_without_elevation.gpx")
    generated_webtrack_file = "Gillespie_Circuit_with_activity_without_elevation.webtrack"
    expected_webtrack_file = os.path.join(FIXTURES, "Gillespie_Circuit_with_activity_without_elevation.webtrack")
    analysis = AnalysisWithoutElevation(gpx_file, generated_webtrack_file, False)
    analysis.analyse_and_save()
    assert cmp(generated_webtrack_file, expected_webtrack_file)
    os.remove(generated_webtrack_file)


def test_gpx_to_webtrack_without_elevation_3segs_without_activities():
    """
    Provide a GPX file and compare the generated WebTrack with the expected data.
    The GPX contains 3 trk, so three WebTrack segments are expected.
    No activities are specified in the track descriptions.
    """
    gpx_file = os.path.join(FIXTURES, "Gillespie_Circuit_3segs_without_elevation.gpx")
    generated_webtrack_file = "Gillespie_Circuit_3segs_without_elevation.webtrack"
    expected_webtrack_file = os.path.join(FIXTURES, "Gillespie_Circuit_3segs_without_elevation.webtrack")
    analysis = AnalysisWithoutElevation(gpx_file, generated_webtrack_file, False)
    analysis.analyse_and_save()
    assert cmp(generated_webtrack_file, expected_webtrack_file)
    os.remove(generated_webtrack_file)


def test_gpx_to_webtrack_without_elevation_3segs_with_activities():
    """
    Provide a GPX file and compare the generated WebTrack with the expected data.
    The GPX contains 3 trk, so three WebTrack segments are expected.
    The track descriptions contain two activities that are listed in the spec.
    """
    gpx_file = os.path.join(FIXTURES, "Gillespie_Circuit_3segs_with_activities_without_elevation.gpx")
    generated_webtrack_file = "Gillespie_Circuit_3segs_with_activities_without_elevation.webtrack"
    expected_webtrack_file = os.path.join(FIXTURES, "Gillespie_Circuit_3segs_with_activities_without_elevation.webtrack")
    analysis = AnalysisWithoutElevation(gpx_file, generated_webtrack_file, False)
    analysis.analyse_and_save()
    assert cmp(generated_webtrack_file, expected_webtrack_file)
    os.remove(generated_webtrack_file)


def test_gpx_to_webtrack_with_elevation_3segs_with_activities():
    """
    Provide a GPX file and compare the generated WebTrack with the expected data.
    The GPX contains 3 trk, so three WebTrack segments are expected.
    The track descriptions contain two activities that are listed in the spec.
    """
    gpx_file = os.path.join(FIXTURES, "Gillespie_Circuit_3segs_with_activities.gpx")
    generated_webtrack_file = "Gillespie_Circuit_3segs_with_activities.webtrack"
    expected_webtrack_file = os.path.join(FIXTURES, "Gillespie_Circuit_3segs_with_activities.webtrack")
    analysis = AnalysisWithElevation(
        gpx_file,
        generated_webtrack_file,
        False,
        "JdF1",
        True,
    )
    analysis.analyse_and_save()
    assert cmp(generated_webtrack_file, expected_webtrack_file)
    os.remove(generated_webtrack_file)


def test_waypoints_snapped_to_track():
    """
    Check how waypoints are snapped to the track.
    The GPX contains two tracks and two waypoints.
    """
    gpx_file = os.path.join(FIXTURES, "test.gpx")
    generated_webtrack_file = "test.webtrack"
    expected_webtrack_file = os.path.join(FIXTURES, "test.webtrack")
    analysis = AnalysisWithoutElevation(gpx_file, generated_webtrack_file, False)
    analysis.analyse_and_save()
    assert cmp(generated_webtrack_file, expected_webtrack_file)
    os.remove(generated_webtrack_file)
