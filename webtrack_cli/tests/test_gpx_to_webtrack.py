from webtrack_cli.src.gpx_to_webtrack import guess_activity
from webtrack_cli.src.webtrack import Activity


def test_guess_activity():
    assert guess_activity(None) == Activity.UNDEFINED
    assert (
        guess_activity("Nice walk with friends. (Webtrack activity: Moderate walk)")
        == Activity.MODERATE_WALK
    )
    assert (
        guess_activity(
            '&lt;div>\n&lt;p style=" margin-top:0px; margin-bottom:0px; margin-left:0px; margin-right:0px; -qt-block-indent:0; text-indent:0px;">Nice walk with friends. (Webtrack activity: Moderate walk)&lt;/p>&lt;/div>'
        )
        == Activity.MODERATE_WALK
    )
