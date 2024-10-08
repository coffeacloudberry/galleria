from enum import Enum
from typing import Any
from typing import Literal


class Activity(Enum):
    UNDEFINED = b"??"
    PACKRAFT = b"A?"
    BUS = b"B?"
    CAR = b"C?"
    SLED_DOG = b"D?"
    ELECTRIC_BICYCLE = b"E?"
    WALK = b"F?"
    SUNDAY_SCHOOL_PICNIC_WALK = b"F1"
    EASY_WALK = b"F2"
    MODERATE_WALK = b"F3"
    DIFFICULT_WALK = b"F4"
    CHALLENGING_WALK = b"F5"
    RUNNING = b"G?"
    HITCHHIKING = b"H?"
    MOTORBIKE = b"I?"
    KAYAK = b"K?"
    CANOE = b"L?"
    MOTORED_BOAT = b"M?"
    BICYCLE = b"O?"
    SNOW_MOBILE = b"Q?"
    ROWING_BOAT = b"R?"
    SKI = b"S?"
    TRAIN = b"T?"
    HORSE = b"V?"
    SAILING_BOAT = b"W?"
    SNOW_SHOES = b"X?"
    SWIM = b"Y?"
    VIA_FERRATA = b"Z?"
    EASY_VIA_FERRATA = b"ZA"
    MODERATELY_DIFFICULT_VIA_FERRATA = b"ZB"
    DIFFICULT_VIA_FERRATA = b"ZC"
    VERY_DIFFICULT_VIA_FERRATA = b"ZD"
    EXTREMELY_DIFFICULT_VIA_FERRATA = b"ZE"


class WebTrack:
    """
    Implementation of the WebTrack format.
    """

    #: Big-endian order as specified.
    byteorder: Literal["little", "big"] = "big"

    #: The WebTrack file data.
    fp: Any = None

    #: The data to write into the WebTrack.
    data_src: dict = {}

    #: The total number of segments in the current WebTrack.
    total_segments: int = 0

    #: The total number of waypoints in the current WebTrack.
    total_waypoints: int = 0

    #: True if there is at least one segment with elevation.
    has_some_ele: bool = False

    def __init__(
        self,
        format_name: bytes = b"webtrack-bin",
        format_version: bytes = b"2.0.0",
    ):
        self.format_name = format_name
        self.format_version = format_version

    def get_format_information(self, file_path: str = "") -> dict[str, bytes]:
        """
        Returns the format name and version.
        Returns:
            The default values if `file_path` is not specified.
            The information from the file `file_path` if specified.
        """
        if file_path:
            with open(file_path, "rb") as stream:
                self.fp = stream
                self._read_format_information()
        return {
            "format_name": self.format_name,
            "format_version": self.format_version,
        }

    def to_file(self, file_path: str, data: dict) -> None:
        """Open the binary file and write the WebTrack data."""
        with open(file_path, "wb") as stream:
            self.fp = stream
            self.data_src = data
            self.total_segments = len(data["segments"]) if "segments" in data else 0
            self.total_waypoints = len(data["waypoints"]) if "waypoints" in data else 0

            self._write_format_information()
            self._write_segment_headers()
            self._write_track_information()
            self._write_segments()
            self._write_waypoints()

    def _w_sep(self):
        """Append a separator to the stream."""
        self.fp.write(b":")

    def _w_sep_wpt(self):
        """Append a waypoint separator to the stream."""
        self.fp.write(b"\n")

    def _w_uint8(self, c: int) -> None:
        """
        Append an unsigned byte (character) to the stream.
        Raises:
            OverflowError: int too big to convert
        """
        self.fp.write(bytes([c]))

    def _w_uint16(self, n: int) -> None:
        """
        Append an unsigned 2-byte integer to the stream.
        Raises:
            OverflowError: int too big to convert
        """
        self.fp.write((int(round(n))).to_bytes(2, byteorder=self.byteorder, signed=False))

    def _w_int16(self, n: int) -> None:
        """
        Append a signed 2-byte integer to the stream.
        Raises:
            OverflowError: int too big to convert
        """
        self.fp.write((int(round(n))).to_bytes(2, byteorder=self.byteorder, signed=True))

    def _w_uint32(self, n: int) -> None:
        """
        Append an unsigned 4-byte integer to the stream.
        Raises:
            OverflowError: int too big to convert
        """
        self.fp.write((int(round(n))).to_bytes(4, byteorder=self.byteorder, signed=False))

    def _w_int32(self, n: int) -> None:
        """
        Append a signed 4-byte integer to the stream.
        Raises:
            OverflowError: int too big to convert
        """
        self.fp.write((int(round(n))).to_bytes(4, byteorder=self.byteorder, signed=True))

    def _w_str(self, s: str) -> None:
        """Append a string to the stream. The string is UTF-8 encoded."""
        self.fp.write(s.encode("utf-8"))

    def _write_format_information(self) -> None:
        """Write the "Format Information" section of the WebTrack file."""
        self.fp.write(self.format_name)
        self._w_sep()
        self.fp.write(self.format_version)
        self._w_sep()
        self._w_uint8(self.total_segments)
        self._w_uint16(self.total_waypoints)

    def _read_up_to_separator(self, separator: bytes = b":") -> bytes:
        """
        Read the WebTrack until the 1-byte `separator`.
        Returns:
            The block read excluding the separator.
        """
        c = self.fp.read(1)
        arr_bytes = bytearray([c[0]])
        while c != separator:
            c = self.fp.read(1)
            arr_bytes.append(c[0])
        return bytes(arr_bytes[:-1])

    def _read_format_information(self) -> None:
        """Read the "Format Information" section of the WebTrack file."""
        if self.fp.tell() > 0:
            self.fp.seek(0)
        self.format_name = self._read_up_to_separator()
        self.format_version = self._read_up_to_separator()

    def _write_segment_headers(self) -> None:
        """Write the "Segment Headers" section of the WebTrack file."""
        if "segments" not in self.data_src:
            return
        segments = self.data_src["segments"]
        for segment in segments:
            self.fp.write(segment["activity"].value)
            if segment["withEle"]:  # E, G, J, M
                self.fp.write(segment["withEle"].encode("utf-8"))
                self.has_some_ele = True
            else:
                self.fp.write(b"F")
            self._w_uint32(len(segment["points"]))

    def _write_track_information(self) -> None:
        """
        Write the "Track Information" section of the WebTrack file.
        Raises:
            KeyError: when expected fields are missing in the "Track Information".
        """
        if "trackInformation" not in self.data_src:
            raise KeyError("Missing track information")
        track_info = self.data_src["trackInformation"]
        if "lengths" in track_info:
            self._w_uint32(track_info["lengths"]["total"])
            all_activities = track_info["lengths"]["activities"]
            if len(all_activities) > 1:
                for activity in all_activities:
                    self.fp.write(activity["activity"].value)
                    self._w_uint32(activity["length"])
        else:
            raise KeyError("Missing track length")
        if self.has_some_ele:
            if "minimumAltitude" in track_info:
                self._w_int16(track_info["minimumAltitude"])
            else:
                raise KeyError("Missing minimum altitude")
            if "maximumAltitude" in track_info:
                self._w_int16(track_info["maximumAltitude"])
            else:
                raise KeyError("Missing maximum altitude")
            if "elevationGain" in track_info:
                self._w_uint32(track_info["elevationGain"])
            else:
                raise KeyError("Missing elevation gain")
            if "elevationLoss" in track_info:
                self._w_uint32(track_info["elevationLoss"])
            else:
                raise KeyError("Missing elevation loss")

    def _write_segments(self) -> None:
        """Write all segments in the stream."""
        if "segments" not in self.data_src:
            return
        segments = self.data_src["segments"]
        point_id = 0
        for segment in segments:
            points = segment["points"]
            with_ele = segment["withEle"]
            prev_point: tuple[float, float] | None = None
            for point in points:
                curr_point = (point[0] * 1e5, point[1] * 1e5)  # lon, lat
                if prev_point is None:
                    self._w_int32(curr_point[0])  # lon
                    self._w_int32(curr_point[1])  # lat
                else:
                    delta_lon = round(curr_point[0]) - round(prev_point[0])  # pylint: disable=unsubscriptable-object
                    delta_lat = round(curr_point[1]) - round(prev_point[1])  # pylint: disable=unsubscriptable-object
                    try:
                        self._w_int16(delta_lon)
                        self._w_int16(delta_lat)
                    except OverflowError as err:
                        raise OverflowError(f"Point at index {point_id} too far from previous point") from err
                prev_point = curr_point
                try:
                    self._w_uint32(point[2] / 10.0)
                except OverflowError as err:
                    raise OverflowError(f"Point at index {point_id} too far from start point") from err
                if with_ele:
                    self._w_int16(point[3])
                point_id += 1

    def _write_waypoints(self) -> None:
        """Write all waypoints in the stream."""
        if "waypoints" not in self.data_src:
            return
        waypoints = self.data_src["waypoints"]
        for waypoint in waypoints:
            self._w_int32(waypoint[0] * 1e5)
            self._w_int32(waypoint[1] * 1e5)
            self._w_uint32(waypoint[6])
            if waypoint[2]:  # with elevation
                self.fp.write(waypoint[2].encode("utf-8"))
                self._w_int16(waypoint[3])
            else:  # without elevation
                self.fp.write(b"F")
            if waypoint[4]:  # symbol
                self._w_str(waypoint[4])
            self._w_sep_wpt()
            if waypoint[5]:  # name
                self._w_str(waypoint[5])
            self._w_sep_wpt()
