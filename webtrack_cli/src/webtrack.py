from typing import Any
from typing import Dict
from typing import Tuple
from typing import Union


class WebTrack:
    """
    Implementation of the WebTrack format.
    """

    #: Big-endian order as specified.
    byteorder: str = "big"

    #: The WebTrack file data.
    webtrack: Any = None

    #: The data to write into the WebTrack.
    data_src: Dict = {}

    #: The total amount of segments in the current WebTrack.
    total_segments: int = 0

    #: The total amount of waypoints in the current WebTrack.
    total_waypoints: int = 0

    #: True if there is at least one segment with elevation.
    has_some_ele: bool = False

    def __init__(
        self,
        format_name: bytes = b"webtrack-bin",
        format_version: bytes = b"0.2.0",
    ):
        self.format_name = format_name
        self.format_version = format_version

    def get_format_information(self, file_path: str = "") -> Dict[str, bytes]:
        """
        Returns the format name and version.
        Returns:
            The default values if `file_path` is not specified.
            The information from the file `file_path` if specified.
        """
        if file_path:
            with open(file_path, "rb") as stream:
                self.webtrack = stream
                self._read_format_information()
        return {
            "format_name": self.format_name,
            "format_version": self.format_version,
        }

    def to_file(self, file_path: str, data: Dict) -> None:
        """Open the binary file and write the WebTrack data."""
        with open(file_path, "wb") as stream:
            self.webtrack = stream
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
        self.webtrack.write(b":")

    def _w_sep_wpt(self):
        """Append a waypoint separator to the stream."""
        self.webtrack.write(b"\n")

    def _w_uint8(self, c: int) -> None:
        """
        Append an unsigned byte (character) to the stream.
        Raises:
            OverflowError: int too big to convert
        """
        self.webtrack.write(bytes([c]))

    def _w_uint16(self, n: int) -> None:
        """
        Append an unsigned 2-byte integer to the stream.
        Raises:
            OverflowError: int too big to convert
        """
        self.webtrack.write(
            (int(round(n))).to_bytes(2, byteorder=self.byteorder, signed=False)
        )

    def _w_int16(self, n: int) -> None:
        """
        Append a signed 2-byte integer to the stream.
        Raises:
            OverflowError: int too big to convert
        """
        self.webtrack.write(
            (int(round(n))).to_bytes(2, byteorder=self.byteorder, signed=True)
        )

    def _w_uint32(self, n: int) -> None:
        """
        Append an unsigned 4-byte integer to the stream.
        Raises:
            OverflowError: int too big to convert
        """
        self.webtrack.write(
            (int(round(n))).to_bytes(4, byteorder=self.byteorder, signed=False)
        )

    def _w_int32(self, n: int) -> None:
        """
        Append a signed 4-byte integer to the stream.
        Raises:
            OverflowError: int too big to convert
        """
        self.webtrack.write(
            (int(round(n))).to_bytes(4, byteorder=self.byteorder, signed=True)
        )

    def _w_str(self, s: str) -> None:
        """Append a string to the stream. The string is UTF-8 encoded."""
        self.webtrack.write(s.encode("utf-8"))

    def _write_format_information(self) -> None:
        """Write the "Format Information" section of the WebTrack file."""
        self.webtrack.write(self.format_name)
        self._w_sep()
        self.webtrack.write(self.format_version)
        self._w_sep()
        self._w_uint8(self.total_segments)
        self._w_uint16(self.total_waypoints)

    def _read_up_to_separator(self, separator: bytes = b":") -> bytes:
        """
        Read the WebTrack until the 1-byte `separator`.
        Returns:
            The block read excluding the separator.
        """
        c = self.webtrack.read(1)
        arr_bytes = bytearray([c[0]])
        while c != separator:
            c = self.webtrack.read(1)
            arr_bytes.append(c[0])
        return bytes(arr_bytes[:-1])

    def _read_format_information(self) -> None:
        """Read the "Format Information" section of the WebTrack file."""
        if self.webtrack.tell() > 0:
            self.webtrack.seek(0)
        self.format_name = self._read_up_to_separator()
        self.format_version = self._read_up_to_separator()

    def _write_segment_headers(self) -> None:
        """Write the "Segment Headers" section of the WebTrack file."""
        if "segments" not in self.data_src:
            return
        segments = self.data_src["segments"]
        for segment in segments:
            if segment["withEle"]:  # E, G, J, M
                self.webtrack.write(segment["withEle"].encode("utf-8"))
                self.has_some_ele = True
            else:
                self.webtrack.write(b"F")
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
        if "length" in track_info:
            self._w_uint32(track_info["length"])
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
        for segment in segments:
            points = segment["points"]
            with_ele = segment["withEle"]
            prev_point: Union[Tuple[float, float], None] = None
            for point in points:
                curr_point = (point[0] * 1e5, point[1] * 1e5)  # lon, lat
                if prev_point is None:
                    self._w_int32(curr_point[0])  # lon
                    self._w_int32(curr_point[1])  # lat
                else:
                    delta_lon = round(curr_point[0]) - round(
                        prev_point[0]  # pylint: disable=unsubscriptable-object
                    )
                    delta_lat = round(curr_point[1]) - round(
                        prev_point[1]  # pylint: disable=unsubscriptable-object
                    )
                    self._w_int16(delta_lon)
                    self._w_int16(delta_lat)
                prev_point = curr_point
                self._w_uint16(point[2] / 10.0)
                if with_ele:
                    self._w_int16(point[3])

    def _write_waypoints(self) -> None:
        """Write all waypoints in the stream."""
        if "waypoints" not in self.data_src:
            return
        waypoints = self.data_src["waypoints"]
        for waypoint in waypoints:
            self._w_int32(waypoint[0] * 1e5)
            self._w_int32(waypoint[1] * 1e5)
            if waypoint[2]:  # with elevation
                self.webtrack.write(waypoint[2].encode("utf-8"))
                self._w_int16(waypoint[3])
            else:  # without elevation
                self.webtrack.write(b"F")
            if waypoint[4]:  # symbol
                self._w_str(waypoint[4])
            self._w_sep_wpt()
            if waypoint[5]:  # name
                self._w_str(waypoint[5])
            self._w_sep_wpt()
