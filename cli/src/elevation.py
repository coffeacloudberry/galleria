# Copyright 2013 Tomo Krajina
# Copyright 2017 Nick Wagers
# Copyright 2024 Clément Fontaine
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import math as mod_math
import os as mod_os
import os.path as mod_path
import re as mod_re
import struct as mod_struct
import threading as mod_threading
import zipfile as mod_zipfile
from io import BytesIO as cStringIO
from typing import Optional

import requests as mod_requests
from osgeo import gdal as mod_gdal

mod_gdal.UseExceptions()
ONE_DEGREE = 1000.0 * 10000.8 / 90.0


class EarthDataSession(mod_requests.Session):
    """
    Modify requests.Session to preserve Auth headers.

    Class comes from NASA docs on accessing their data servers.
    """

    AUTH_HOST = "urs.earthdata.nasa.gov"

    def __init__(self, username: str, password: str):
        super().__init__()
        self.auth = (username, password)

    def rebuild_auth(
        self,
        prepared_request: mod_requests.PreparedRequest,
        response: mod_requests.Response,
    ) -> None:
        """
        Overrides from the library to keep headers when redirected to or from the NASA auth host.
        """
        headers = prepared_request.headers
        url = prepared_request.url
        if "Authorization" in headers:
            original_parsed = mod_requests.utils.urlparse(response.request.url)  # type: ignore[attr-defined]
            redirect_parsed = mod_requests.utils.urlparse(url)  # type: ignore[attr-defined]
            if redirect_parsed.hostname != self.AUTH_HOST and original_parsed.hostname not in {self.AUTH_HOST, redirect_parsed.hostname}:
                del headers["Authorization"]


class GeoElevationFile:
    """
    Contains data from a single elevation file.

    This class should not be instantiated without its GeoElevationData because
    it may need elevations from nearby files.
    """

    def __init__(self, file_name: str, data: bytes):
        """Data is a raw file contents of the file."""
        self.file_name = file_name
        self.latitude, self.longitude = GeoElevationFile.starting_position(file_name)
        self.data = data
        square_side = mod_math.sqrt(len(self.data) / 2.0)
        self.resolution = 1.0 / (square_side - 1)
        self.square_side = int(square_side)

    def get_row_and_column(self, latitude: float, longitude: float) -> tuple[int, int]:
        return mod_math.floor((self.latitude + 1 - latitude) * float(self.square_side - 1)), mod_math.floor(
            (longitude - self.longitude) * float(self.square_side - 1)
        )

    def get_lat_and_long(self, row, column):
        return (
            self.latitude + 1 - row * self.resolution,
            self.longitude + column * self.resolution,
        )

    def get_elevation(self, latitude: float, longitude: float) -> Optional[float]:
        """
        If approximate is True, then only the points from SRTM grid will be
        used, otherwise a basic approximation of nearby points will be calculated.
        """
        if not self.latitude <= latitude < self.latitude + 1:
            raise ValueError(f"Invalid latitude {latitude} for file {self.file_name}")
        if not self.longitude <= longitude < self.longitude + 1:
            raise ValueError(f"Invalid longitude {longitude} for file {self.file_name}")

        row, column = self.get_row_and_column(latitude, longitude)
        return self.get_elevation_from_row_and_column(row, column)

    def get_elevation_from_row_and_column(self, row: int, column: int) -> Optional[float]:
        """
        Valid range for ASTGTM v003: -500 to 9000 (0 at sea level), fill value = -9999
        Valid range for SRTMGL1 v003: -32767 to 32767, fill value = -32768
        """
        i = row * self.square_side + column

        unpacked = mod_struct.unpack(">h", self.data[i * 2 : i * 2 + 2])
        result = None
        if unpacked and len(unpacked) == 1:
            result = unpacked[0]

        if not ((result is None) or result > 9000 or result < -500):
            return result
        return None

    @staticmethod
    def starting_position(file_name: str) -> tuple[float, float]:
        """Returns (latitude, longitude) of the lower left corner."""
        groups = mod_re.findall(r"([NS])(\d+)([EW])(\d+)_.*", file_name)
        groups = groups[0]
        latitude = float(groups[1]) if groups[0] == "N" else -float(groups[1])
        longitude = float(groups[3]) if groups[2] == "E" else -float(groups[3])
        return latitude, longitude


class GeoElevationData:
    """
    The main class with utility methods for elevations.

    Note that files are loaded in memory, so if you need to find
    elevations for multiple points on the earth -- this will load
    *many* files in memory!
    """

    # Tiles currently loaded in memory for fast access.
    # Keys are of form: 'N00E000v2.1a'.
    # Share memory with other instances.
    tiles: dict[str, GeoElevationFile] = {}

    def __init__(
        self,
        version: str,
        earth_data_user: Optional[str] = "",
        earth_data_password: Optional[str] = "",
    ):
        """
        Args:
            version: str of a version to load by default.
            earth_data_user: str of EarthData username
            earth_data_password: str of EarthData password

        """
        self.version = version
        self.extension = "tif" if self.version == "ASTGTMv3" else "hgt"
        needs_creds = "JdF" not in self.version
        if needs_creds and not (earth_data_user or earth_data_password):
            raise ValueError("Missing NASA creds")
        self.earth_data_user = str(earth_data_user)
        self.earth_data_password = str(earth_data_password)

    @staticmethod
    def get_srtm_dir() -> str:
        """The default path to store files."""
        result = mod_path.join(mod_os.environ["HOME"], ".cache", "srtm")

        try:
            mod_os.makedirs(result)
        except FileExistsError:
            pass

        return result

    @staticmethod
    def file_exists(file_name: str) -> bool:
        """
        Return True if the path refers to an existing path or an open file descriptor.
        Returns False for broken symbolic links (that could happen if it is linked
        to an external hard drive that is not mounted).
        """
        return mod_path.exists(mod_path.join(GeoElevationData.get_srtm_dir(), file_name))

    @staticmethod
    def file_write(file_name: str, contents: bytes) -> bytes:
        srtm_dir = GeoElevationData.get_srtm_dir()
        source_file_path = mod_path.join(srtm_dir, file_name)
        with open(source_file_path, "wb") as f:
            f.write(contents)

        # GeoTIFF to HGT conversion if needed
        if file_name.endswith(".tif"):
            # GDAL expects something like N69E021.HGT
            dest_file = file_name.split("_")[0] + ".HGT"
            dest_file_path = mod_path.join(srtm_dir, dest_file)
            event = mod_threading.Event()

            def callback(complete: float, *_):
                if complete >= 1:
                    event.set()

            mod_gdal.Translate(dest_file_path, source_file_path, callback=callback)
            event.wait()
            contents = GeoElevationData.file_read(dest_file)
            mod_os.rename(dest_file_path, source_file_path.replace(".tif", ".hgt"))
            mod_os.remove(dest_file_path + ".aux.xml")
            mod_os.remove(source_file_path)

        return contents

    @staticmethod
    def file_read(file_name: str) -> bytes:
        with open(mod_path.join(GeoElevationData.get_srtm_dir(), file_name), "rb") as f:
            return f.read()

    @staticmethod
    def build_url(tilename: str, version: str) -> str:
        """
        Return the URL to for the given tilename and version.

        Args:
            tilename: str of the tile (form "N00E000")
            version: str of the SRTM data version and resolution to get.
                Values can be _ASTGTMv003, v3.1a

        Returns:
            The URL to the file or None if the tile does not exist

        """
        if version == "ASTGTMv3":
            return f"https://e4ftl01.cr.usgs.gov/ASTT/ASTGTM.003/2000.03.01/ASTGTMV003_{tilename}.zip"
        if version == "SRTMGL1v3":
            return f"https://e4ftl01.cr.usgs.gov/MEASURES/SRTMGL1.003/2000.02.11/{tilename}.SRTMGL1.hgt.zip"
        raise AttributeError("Bad version")

    def get_elevation(self, latitude: float, longitude: float) -> Optional[float]:
        """
        Return the elevation at the point specified.

        Args:
            latitude: float of the latitude in decimal degrees
            longitude: float of the longitude in decimal degrees

        Returns:
            A float passed back from GeoElevationFile.get_elevation().
            Value should be the elevation of the point in meters.

        """
        version = self.version
        tilename = GeoElevationData.get_tilename(latitude, longitude)
        geo_elevation_file: Optional[GeoElevationFile]
        filename = f"{tilename}_{version}"
        if filename in self.tiles:
            geo_elevation_file = self.tiles[filename]
        else:
            geo_elevation_file = self._load_tile(tilename)

        if geo_elevation_file:
            return geo_elevation_file.get_elevation(latitude, longitude)
        return None

    def _fetch(self, url: str) -> bytes:
        """
        Download the given URL using the credentials stored in earth_data_user and earth_data_password.

        Args:
            url: str of the URL to download

        Returns:
            Data contained in the file at the requested URL.

        """
        with EarthDataSession(self.earth_data_user, self.earth_data_password) as s:
            response = s.get(url, timeout=30)
            response.raise_for_status()
            return response.content

    def _download_tile(self, tilename: str) -> bytes:
        filename = f"{tilename}_{self.version}"
        if "JdF" in self.version:
            srtm_dir = GeoElevationData.get_srtm_dir()
            raise NotImplementedError(f"Please download `{filename}.hgt' to {srtm_dir} and retry.")
        url = GeoElevationData.build_url(tilename, self.version)
        data = GeoElevationData.unzip(self._fetch(url))
        return GeoElevationData.file_write(f"{filename}.{self.extension}", data)

    def _load_tile(self, tilename: str) -> GeoElevationFile:
        """
        Load the requested tile from cache or the network.

        Check to see if the tile needed is stored in the local cache.
        If it isn't, download the tile from the network and save it
        in the local cache in uncompressed form. Load the tile into memory as a
        GeoElevationFile in the GeoElevationData.tiles dictionary.
        Return the tile.

        Args:
            tilename: str of the tile (form "N00E000")

        Returns:
            GeoElevationFile containing the requested tile and version.

        """
        # Check local cache first
        data = None
        filename = f"{tilename}_{self.version}"
        file_with_ext = f"{filename}.hgt"
        if GeoElevationData.file_exists(file_with_ext):
            data = GeoElevationData.file_read(file_with_ext)

        # download and save tile if needed
        if data is None:
            data = self._download_tile(tilename)

        tile = GeoElevationFile(file_with_ext, data)
        self.tiles[filename] = tile
        return tile

    @staticmethod
    def unzip(contents: bytes) -> bytes:
        with mod_zipfile.ZipFile(cStringIO(contents)) as zip_file:
            zip_info_list = zip_file.infolist()
            zip_info = zip_info_list[0]  # DEM file (HGT or GeoTIFF)
            with zip_file.open(zip_info) as hgt_file:
                result = hgt_file.read()
                return result

    @staticmethod
    def get_tilename(latitude: float, longitude: float) -> str:
        """
        Return the tile name for the given coordinates.

        Tiles are 1 deg x 1 deg in size named after the bottom left
        corner cell. The corner cell is aligned on an integer value.
        Note that 0.x latitude is N and 0.x longitude is E.

        Args:
            latitude: float of the latitude in decimal degrees
            longitude: float of the longitude in decimal degrees

        Returns:
            str of the tilename (may not be a valid tile)

        """
        ns = "N" if latitude >= 0 else "S"
        ew = "E" if longitude >= 0 else "W"
        return ns + str(int(abs(mod_math.floor(latitude)))).zfill(2) + ew + str(int(abs(mod_math.floor(longitude)))).zfill(3)

    def add_elevations(self, gpx, smooth: Optional[bool] = False, gpx_smooth_no: Optional[int] = 0) -> None:
        """
        smooth -- if True interpolate between points

        if gpx_smooth_no > 0 -- execute gpx.smooth(vertical=True)
        """
        if smooth:
            self._add_sampled_elevations(gpx)
        else:
            for point in gpx.walk(only_points=True):
                point.elevation = self.get_elevation(point.latitude, point.longitude)

        for _ in range(gpx_smooth_no):  # type: ignore[arg-type]
            gpx.smooth(vertical=True, horizontal=False)

    def _add_interval_elevations(self, gpx, min_interval_length: Optional[int] = 100) -> None:
        """
        Adds elevation on points every min_interval_length and add missing
        elevation between
        """
        for track in gpx.tracks:
            for segment in track.segments:
                last_interval_changed = 0
                previous_point = None
                length = 0
                for no, point in enumerate(segment.points):
                    if previous_point:
                        length += point.distance_2d(previous_point)

                    if no == 0 or no == len(segment.points) - 1 or length > last_interval_changed:
                        last_interval_changed += min_interval_length  # type: ignore[operator]
                        point.elevation = self.get_elevation(point.latitude, point.longitude)
                    else:
                        point.elevation = None
                    previous_point = point
        gpx.add_missing_elevations()

    def _add_sampled_elevations(self, gpx) -> None:
        # Use some random intervals here to randomize a bit:
        self._add_interval_elevations(gpx, min_interval_length=35)
        elevations_1 = list(map(lambda pt: pt.elevation, gpx.walk(only_points=True)))
        self._add_interval_elevations(gpx, min_interval_length=141)
        elevations_2 = list(map(lambda pt: pt.elevation, gpx.walk(only_points=True)))
        self._add_interval_elevations(gpx, min_interval_length=241)
        elevations_3 = list(map(lambda pt: pt.elevation, gpx.walk(only_points=True)))

        n = 0
        for point in gpx.walk(only_points=True):
            if elevations_1[n] is not None and elevations_2[n] is not None and elevations_3[n] is not None:
                point.elevation = (elevations_1[n] + elevations_2[n] + elevations_3[n]) / 3.0
            else:
                point.elevation = None
            n += 1
