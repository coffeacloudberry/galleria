import hashlib as mod_hashlib
import os as mod_os

import pytest
from dotenv import load_dotenv

from cli.src.elevation import GeoElevationData
from cli.src.elevation import GeoElevationFile

load_dotenv()
NASA_USERNAME = mod_os.environ["NASA_USERNAME"]
NASA_PASSWORD = mod_os.environ["NASA_PASSWORD"]
ASTGTM_PREFIX = "https://e4ftl01.cr.usgs.gov/ASTT/ASTGTM.003/2000.03.01/ASTGTMV003_"
SRTMGL_PREFIX = "https://e4ftl01.cr.usgs.gov/MEASURES/SRTMGL1.003/2000.02.11/"
HGT_ASTGTM3_N42E000 = "de652cd7109bd9cc032a8abafc4951ffbf3c9c97"


@pytest.mark.vcr()
def test_fetch():
    tilename = "N42E000"

    tile_map = GeoElevationData("ASTGTMv3", NASA_USERNAME, NASA_PASSWORD)
    url = f"{ASTGTM_PREFIX}{tilename}.zip"
    archive = tile_map._fetch(url)
    assert mod_hashlib.sha1(archive).hexdigest() == "1ac7518ff4ca039ce50a52dc4ba865d7f91c08f4"

    tile_map = GeoElevationData("SRTMGL1v3", NASA_USERNAME, NASA_PASSWORD)
    url = f"{SRTMGL_PREFIX}{tilename}.SRTMGL1.hgt.zip"
    archive = tile_map._fetch(url)
    assert mod_hashlib.sha1(archive).hexdigest() == "9cfa436f69c5603284d3d2e7f9cfa3b738d3f149"


@pytest.mark.vcr()
def test_download_tile_srtm_from_remote():
    tilename = "N42E000"

    tile_map = GeoElevationData("SRTMGL1v3", NASA_USERNAME, NASA_PASSWORD)
    # the HGT data is from the ZIP archive
    hgt_data = tile_map._download_tile(tilename)
    assert mod_hashlib.sha1(hgt_data).hexdigest() == "1277e866bb9aca17090cdce91e6bc0a546801623"


@pytest.mark.vcr()
def test_download_tile_astgtm_from_remote():
    tilename = "N42E000"

    tile_map = GeoElevationData("ASTGTMv3", NASA_USERNAME, NASA_PASSWORD)
    # the HGT data is from the GeoTIFF conversion extracted from the ZIP archive
    hgt_data = tile_map._download_tile(tilename)
    # the hash is different from the archive which is the wrapper
    assert mod_hashlib.sha1(hgt_data).hexdigest() == HGT_ASTGTM3_N42E000


def test_load_tile_astgtm_from_cache():
    tilename = "N42E000"

    tile_map = GeoElevationData("ASTGTMv3", NASA_USERNAME, NASA_PASSWORD)
    tile_file = tile_map._load_tile(tilename)
    hgt_data = tile_file.data
    assert mod_hashlib.sha1(hgt_data).hexdigest() == HGT_ASTGTM3_N42E000


def test_starting_position():
    assert GeoElevationFile.starting_position("S48E167_SRTMGL1v3.hgt") == (-48.0, 167.0)
    assert GeoElevationFile.starting_position("N48W167_JdF1.hgt") == (48.0, -167.0)


def test_coordinates_row_col_conversion():
    geo_elevation_data = GeoElevationData("JdF1")
    geo_file = geo_elevation_data._load_tile(GeoElevationData.get_tilename(-41.0, 175.99))

    r, c = geo_file.get_row_and_column(-41, 175)
    lat, long = geo_file.get_lat_and_long(r, c)
    assert lat == -41
    assert long == 175

    r, c = geo_file.get_row_and_column(-41.5371, 175.1264)
    lat, long = geo_file.get_lat_and_long(r, c)
    assert abs(lat - -41.5371) <= geo_file.resolution
    assert abs(long - 175.1264) <= geo_file.resolution


def test_build_url():
    tilename = "N44W072"
    assert GeoElevationData.build_url(tilename, "ASTGTMv3") == f"{ASTGTM_PREFIX}{tilename}.zip"
    assert GeoElevationData.build_url(tilename, "ASTGTMv3") == f"{ASTGTM_PREFIX}{tilename}.zip"
    assert GeoElevationData.build_url(tilename, "ASTGTMv3") == f"{ASTGTM_PREFIX}{tilename}.zip"
    assert GeoElevationData.build_url(tilename, "SRTMGL1v3") == f"{SRTMGL_PREFIX}{tilename}.SRTMGL1.hgt.zip"
    assert GeoElevationData.build_url(tilename, "SRTMGL1v3") == f"{SRTMGL_PREFIX}{tilename}.SRTMGL1.hgt.zip"
    assert GeoElevationData.build_url(tilename, "SRTMGL1v3") == f"{SRTMGL_PREFIX}{tilename}.SRTMGL1.hgt.zip"


def test_get_elevation_jdf1():
    """Compare elevation provided by this application and the actual topographic data.

    Data sources:
    * Norway: norgeskart.no / Kartverket / Norwegian Mapping Authority
    * Finland: maanmittauslaitos.fi / Maanmittauslaitos / National Land Survey of Finland
    * France: geoportail.gouv.fr / Institut national de l'information géographique et forestière (IGN)
    * New Zealand / Aotearoa: data.linz.govt.nz / Land Information New Zealand (LINZ)
    """
    tile_map = GeoElevationData("JdF1")
    survey_data = [
        # Kvennsjøen, Hardangervidda, Norway:
        (60.0669437, 7.19087290, 1166.0),
        # Varangerhalvøya, Norway:
        (70.3302999, 29.6062986, 593.3),
        # Bukketindvatnet, tarn in Lofoten, Norway:
        (68.4498145, 15.6736844, 527.0),
        # Ráisduottarháldi, summit in Norway:
        (69.3231528, 21.2788314, 1359.0),
        # Paatari, nearby Inari, Finland:
        (68.8608644, 26.5709925, 144.9),
        # Elevation line nearby Saariselkä, Finland:
        (68.4326350, 27.4372714, 420.0),
        # Pieni Pyhätunturi nearby Salla, Finland:
        (66.7618183, 28.7892042, 460.0),
        # Lake down Pieni Pyhätunturi, Finland:
        (66.7705339, 28.8194756, 328.9),
        # Around Refuge des Merveilles, Mercantour, France:
        (44.0568690, 7.45115200, 2135),
        # Cime du Diable, Mercantour, France:
        (44.0489860, 7.42276100, 2673),
        # Lac du Portillon, Pyrénée, France:
        (42.7008790, 0.50821700, 2569),
        # Mont Blanc:
        (45.8325440, 6.86477000, 4801),
        # Mt Hector, North Island, New Zealand / Aotearoa:
        (-40.951685, 175.281541, 1524),
        # Waikaremoana, North Island, New Zealand / Aotearoa:
        (-38.769274, 177.091248, 582),
        # Swamp in Stewart Island / Rakiura, New Zealand / Aotearoa:
        (-46.793784, 167.806615, 20),
        # Tarn in New Zealand Southern Alps:
        (-45.246132, 167.280198, 871),
    ]

    for entry in survey_data:
        assert abs(tile_map.get_elevation(entry[0], entry[1]) - entry[2]) <= 2.0


@pytest.mark.vcr()
def test_get_elevation_astgtm():
    tile_map = GeoElevationData("ASTGTMv3", NASA_USERNAME, NASA_PASSWORD)
    survey_data = [
        # Pieni Pyhätunturi nearby Salla, Finland:
        (66.7618183, 28.7892042, 460.0),
        # Lake down Pieni Pyhätunturi, Finland:
        (66.7705339, 28.8194756, 328.9),
    ]

    for entry in survey_data:
        assert abs(tile_map.get_elevation(entry[0], entry[1]) - entry[2]) <= 30.0


def test_get_tilename():
    # Each quadrant
    assert "N01E001" == GeoElevationData.get_tilename(1.5, 1.5)
    assert "N01W002" == GeoElevationData.get_tilename(1.5, -1.5)
    assert "S02E001" == GeoElevationData.get_tilename(-1.5, 1.5)
    assert "S02W002" == GeoElevationData.get_tilename(-1.5, -1.5)
    # Equator and Prime Meridian
    assert "N00E001" == GeoElevationData.get_tilename(0, 1.5)
    assert "N01E000" == GeoElevationData.get_tilename(1.5, 0)
    assert "N00E000" == GeoElevationData.get_tilename(0, 0)
