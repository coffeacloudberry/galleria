import vcr
from src.photos_manager import WebPUpdater


@vcr.use_cassette("fixtures/vcr_cassettes/repo_list.yaml")
def test_download_repo_list():
    all_links = WebPUpdater.download_repo_list()
    for symver, url_list in all_links.items():
        assert isinstance(symver, str)
        assert len(url_list) == 2  # file + signature
        for url in url_list:
            assert symver in url
            assert "-linux-x86-64" in url


def test_find_latest():
    assert WebPUpdater.find_latest(["1.2.3", "1.2.3-rc1"]) == "1.2.3"
    assert WebPUpdater.find_latest(["1.2.3", "1.1.4"]) == "1.2.3"
    assert WebPUpdater.find_latest(["1.2.3", "0.1.4"]) == "1.2.3"
    assert WebPUpdater.find_latest(["1.2.3", "1.2.4"]) == "1.2.4"
    assert WebPUpdater.find_latest(["1.2.5", "1.2.5-rc2", "1.2.4-rc1", "1.2.4"]) == "1.2.5"


@vcr.use_cassette("fixtures/vcr_cassettes/release.yaml")
def test_download_release():
    WebPUpdater.download_release(
        "https://storage.googleapis.com/downloads.webmproject.org/releases/webp/libwebp-1.2.2-linux-x86-64.tar.gz",
    )
