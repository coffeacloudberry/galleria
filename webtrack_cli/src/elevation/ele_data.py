# Copyright 2013 Tomo Krajina
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

import logging as mod_logging
import math as mod_math
import zipfile as mod_zipfile
from io import BytesIO as cStringIO
from typing import Dict
from typing import Optional

from . import earth_data_session as mod_earth_data_session
from . import ele_file as mod_ele_file
from . import file_handler as mod_file_handler


class GeoElevationData:
    """
    The main class with utility methods for elevations.

    Note that files are loaded in memory, so if you need to find
    elevations for multiple points on the earth -- this will load
    *many* files in memory!
    """

    # tiles currently loaded in memory for fast access.
    # Keys are of form: 'N00E000v2.1a'.
    # Share memory with other instances.
    tiles: Dict[str, mod_ele_file.GeoElevationFile] = {}

    def __init__(
        self,
        version: str,
        file_handler: Optional[mod_file_handler.FileHandler] = None,
        batch_mode: Optional[bool] = False,
        earth_data_user: Optional[str] = "",
        earth_data_password: Optional[str] = "",
    ):
        """
        Args:
            version: str of version to load by default.
            file_handler: FileHandler used for reading and writing to
                disk cache
            batch_mode: bool, when true, keeps at most 1 tile in memory.
                If batch_mode is True, only the most recent file will be stored. This is
                ideal for situations where you want to use this function to enrich a very
                large dataset. If your data are spread over a wide geographic area, this
                setting will make this function slower but will greatly reduce the risk
                of out-of-memory errors. Default is False.
            earth_data_user: str of EarthData username
            earth_data_password: str of EarthData password

        """
        self.version = version
        self.file_handler = (
            file_handler if file_handler else mod_file_handler.FileHandler()
        )
        self.batch_mode = batch_mode
        self.earth_data_user = str(earth_data_user)
        self.earth_data_password = str(earth_data_password)

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
            return "https://e4ftl01.cr.usgs.gov/ASTT/ASTGTM.003/2000.03.01/ASTGTMV003_{}.zip".format(
                tilename
            )
        elif version == "SRTMGL1v3":
            return "https://e4ftl01.cr.usgs.gov/MEASURES/SRTMGL1.003/2000.02.11/{}.SRTMGL1.hgt.zip".format(
                tilename
            )
        raise AttributeError("Bad version")

    def get_elevation(
        self,
        latitude: float,
        longitude: float,
        approximate: Optional[bool] = None,
        version: Optional[str] = None,
    ) -> Optional[float]:
        """
        Return the elevation at the point specified.

        Args:
            latitude: float of the latitude in decimal degrees
            longitude: float of the longitude in decimal degrees
            approximate: bool passed to GeoElevationFile.get_elevation
            version: str of the SRTM data version and resolution to get.
                Values are determined by build_url()

        Returns:
            A float passed back from GeoElevationFile.get_elevation().
            Value should be the elevation of the point in meters.

        """
        if version is None:
            version = self.version
        tilename = GeoElevationData.get_tilename(latitude, longitude)
        geo_elevation_file: Optional[mod_ele_file.GeoElevationFile]
        filename = f"{tilename}_{version}"
        if filename in self.tiles:
            geo_elevation_file = self.tiles[filename]
        else:
            geo_elevation_file = self._load_tile(tilename, version)

        if geo_elevation_file:
            return geo_elevation_file.get_elevation(latitude, longitude, approximate)
        return None

    def _fetch(self, url: str) -> bytes:
        """
        Download the given URL using the credentials stored in earth_data_user and earth_data_password.

        Args:
            url: str of the URL to download

        Returns:
            Data contained in the file at the requested URL.

        """
        with mod_earth_data_session.EarthDataSession(
            self.earth_data_user, self.earth_data_password
        ) as s:
            response = s.get(url, timeout=30)
            response.raise_for_status()
            return response.content

    def _load_tile(self, tilename: str, version: str) -> mod_ele_file.GeoElevationFile:
        """
        Load the requested tile from cache or the network.

        Check to see if the tile needed is stored in local cache.
        If it isn't, download the tile from the network and save it
        in the local cache in uncompressed form. Load the tile into memory as a
        GeoElevationFile in the GeoElevationData.tiles dictionary.
        Return the tile.

        Args:
            tilename: str of the tile (form "N00E000")
            version: str of the SRTM data version and resolution to get.
                Values are determined by build_url()

        Returns:
            GeoElevationFile containing the requested tile and version.

        """
        # Check local cache first
        data = None
        filename = f"{tilename}_{version}"
        if self.file_handler.exists(f"{filename}.hgt"):
            data = self.file_handler.read(f"{filename}.hgt")

        # Download and save tile if needed
        if data is None:
            if "JdF" in self.version:
                raise NotImplementedError(
                    f"Please download `{tilename}_{version}.hgt' and retry."
                )
            url = GeoElevationData.build_url(tilename, version)
            data = self._fetch(url)
            data = GeoElevationData.unzip(data)
            extension = "tif" if version == "ASTGTMv3" else "hgt"
            data = self.file_handler.write(f"{filename}.{extension}", data)

        # Create GeoElevationFile
        tile = mod_ele_file.GeoElevationFile(tilename + ".hgt", data, self)
        if self.batch_mode:
            self.tiles = {filename: tile}
        else:
            self.tiles[filename] = tile
        return tile

    @staticmethod
    def unzip(contents: bytes) -> bytes:
        mod_logging.debug("Unzipping %s bytes" % len(contents))
        zip_file = mod_zipfile.ZipFile(cStringIO(contents))
        zip_info_list = zip_file.infolist()
        zip_info = zip_info_list[0]  # DEM file (HGT or GeoTIFF)
        result = zip_file.open(zip_info).read()
        mod_logging.debug("Unzipped")
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
        return (
            ns
            + str(int(abs(mod_math.floor(latitude)))).zfill(2)
            + ew
            + str(int(abs(mod_math.floor(longitude)))).zfill(3)
        )

    def add_elevations(
        self, gpx, smooth: Optional[bool] = False, gpx_smooth_no: Optional[int] = 0
    ) -> None:
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

    def _add_interval_elevations(
        self, gpx, min_interval_length: Optional[int] = 100
    ) -> None:
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

                    if (
                        no == 0
                        or no == len(segment.points) - 1
                        or length > last_interval_changed
                    ):
                        last_interval_changed += min_interval_length  # type: ignore[operator]
                        point.elevation = self.get_elevation(
                            point.latitude, point.longitude
                        )
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
            if (
                elevations_1[n] is not None
                and elevations_2[n] is not None
                and elevations_3[n] is not None
            ):
                point.elevation = (
                    elevations_1[n] + elevations_2[n] + elevations_3[n]
                ) / 3.0
            else:
                point.elevation = None
            n += 1
