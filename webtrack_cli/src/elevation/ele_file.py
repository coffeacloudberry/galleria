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

"""
Classes containing parsed elevation data.
"""
from __future__ import annotations

import math as mod_math
import re as mod_re
import struct as mod_struct
from typing import Optional
from typing import Tuple

from . import ele_data as mod_ele_data

ONE_DEGREE = 1000.0 * 10000.8 / 90.0


class GeoElevationFile:
    """
    Contains data from a single elevation file.

    This class should not be instantiated without its GeoElevationData because
    it may need elevations from nearby files.
    """

    url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    def __init__(
        self,
        file_name: str,
        data: bytes,
        geo_elevation_data: mod_ele_data.GeoElevationData,
    ):
        """Data is a raw file contents of the file."""

        self.geo_elevation_data = geo_elevation_data
        self.file_name = file_name

        self.parse_file_name_starting_position()

        self.data = data

        square_side = mod_math.sqrt(len(self.data) / 2.0)
        assert square_side == int(
            square_side
        ), "Invalid file size: {0} for file {1}".format(len(self.data), self.file_name)

        self.resolution = 1.0 / (square_side - 1)
        self.square_side = int(square_side)

    def get_row_and_column(self, latitude: float, longitude: float) -> Tuple[int, int]:
        if self.latitude is None or self.longitude is None:
            raise ValueError("Expected lat,lon values")
        return mod_math.floor(
            (self.latitude + 1 - latitude) * float(self.square_side - 1)
        ), mod_math.floor((longitude - self.longitude) * float(self.square_side - 1))

    @staticmethod
    def distance(
        latitude_1: float, longitude_1: float, latitude_2: float, longitude_2: float
    ) -> float:
        """
        Distance between two points.
        """

        coef = mod_math.cos(latitude_1 / 180.0 * mod_math.pi)
        x = latitude_1 - latitude_2
        y = (longitude_1 - longitude_2) * coef

        return mod_math.sqrt(x * x + y * y) * ONE_DEGREE

    def get_elevation(
        self, latitude: float, longitude: float, approximate: Optional[bool] = False
    ) -> Optional[float]:
        """
        If approximate is True then only the points from SRTM grid will be
        used, otherwise a basic approximation of nearby points will be calculated.
        """
        if self.latitude is None or self.longitude is None:
            raise ValueError("Expected lat,lon values")
        if not (self.latitude <= latitude < self.latitude + 1):
            raise Exception(
                "Invalid latitude %s for file %s" % (latitude, self.file_name)
            )
        if not (self.longitude <= longitude < self.longitude + 1):
            raise Exception(
                "Invalid longitude %s for file %s" % (longitude, self.file_name)
            )

        row, column = self.get_row_and_column(latitude, longitude)

        if approximate:
            return self.approximation(latitude, longitude)
        else:
            return self.get_elevation_from_row_and_column(row, column)

    def approximation(self, latitude: float, longitude: float) -> Optional[float]:
        """
        Dummy approximation with nearest points. The nearest the neighbour the
        more important will be its elevation.
        """
        d = 1.0 / self.square_side
        d_meters = d * ONE_DEGREE

        # Since the less the distance => the more important should be the
        # distance of the point, we'll use d-distance as importance coef
        # here:
        importance_1 = d_meters - GeoElevationFile.distance(
            latitude + d, longitude, latitude, longitude
        )
        elevation_1 = self.geo_elevation_data.get_elevation(
            latitude + d, longitude, approximate=False
        )

        importance_2 = d_meters - GeoElevationFile.distance(
            latitude - d, longitude, latitude, longitude
        )
        elevation_2 = self.geo_elevation_data.get_elevation(
            latitude - d, longitude, approximate=False
        )

        importance_3 = d_meters - GeoElevationFile.distance(
            latitude, longitude + d, latitude, longitude
        )
        elevation_3 = self.geo_elevation_data.get_elevation(
            latitude, longitude + d, approximate=False
        )

        importance_4 = d_meters - GeoElevationFile.distance(
            latitude, longitude - d, latitude, longitude
        )
        elevation_4 = self.geo_elevation_data.get_elevation(
            latitude, longitude - d, approximate=False
        )
        # TODO: Check if coordinates inside the same file, and only then decide if to call
        # self.geo_elevation_data.get_elevation or just self.get_elevation

        if (
            elevation_1 is None
            or elevation_2 is None
            or elevation_3 is None
            or elevation_4 is None
        ):
            elevation = self.get_elevation(latitude, longitude, approximate=False)
            if not elevation:
                return None
            elevation_1 = elevation_1 or elevation
            elevation_2 = elevation_2 or elevation
            elevation_3 = elevation_3 or elevation
            elevation_4 = elevation_4 or elevation

        # Normalize importance:
        sum_importances = float(
            importance_1 + importance_2 + importance_3 + importance_4
        )

        # Check normalization:
        assert (
            abs(
                importance_1 / sum_importances
                + importance_2 / sum_importances
                + importance_3 / sum_importances
                + importance_4 / sum_importances
                - 1
            )
            < 0.000001
        )

        result = (
            importance_1 / sum_importances * elevation_1
            + importance_2 / sum_importances * elevation_2
            + importance_3 / sum_importances * elevation_3
            + importance_4 / sum_importances * elevation_4
        )

        return result

    def get_elevation_from_row_and_column(
        self, row: int, column: int
    ) -> Optional[float]:
        """
        Valid range for ASTGTM v003: -500 to 9000 (0 at sea level), fill value = -9999
        Valid range for SRTMGL1 v003: -32767 to 32767, fill value = -32768
        """
        i = row * self.square_side + column
        assert i < len(self.data) - 1

        unpacked = mod_struct.unpack(">h", self.data[i * 2 : i * 2 + 2])
        result = None
        if unpacked and len(unpacked) == 1:
            result = unpacked[0]

        if not ((result is None) or result > 9000 or result < -500):
            return result
        return None

    def parse_file_name_starting_position(self) -> None:
        """Returns (latitude, longitude) of lower left point of the file"""
        groups = mod_re.findall("([NS])(\d+)([EW])(\d+)\.hgt", self.file_name)

        assert (
            groups and len(groups) == 1 and len(groups[0]) == 4
        ), "Invalid file name {0}".format(self.file_name)

        groups = groups[0]

        if groups[0] == "N":
            latitude = float(groups[1])
        else:
            latitude = -float(groups[1])

        if groups[2] == "E":
            longitude = float(groups[3])
        else:
            longitude = -float(groups[3])

        self.latitude = latitude
        self.longitude = longitude

    def __str__(self) -> str:
        return "[{0}:{1}]".format(self.__class__, self.file_name)
