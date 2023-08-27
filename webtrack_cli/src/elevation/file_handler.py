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

import os as mod_os
import os.path as mod_path
import threading as mod_threading

from osgeo import gdal as mod_gdal


class FileHandler:
    """
    The default file handler. It can be changed if you need to save/read SRTM
    files in a database or Amazon S3.

    If you need to change the way the files are saved locally (for example if
    you need to save them locally) -- change/inherit this class.
    """

    def get_srtm_dir(self) -> str:
        """The default path to store files."""
        # Local cache path:
        result = ""
        if "HOME" in mod_os.environ:
            result = mod_os.sep.join([mod_os.environ["HOME"], ".cache", "srtm"])
        elif "HOMEPATH" in mod_os.environ:
            result = mod_os.sep.join([mod_os.environ["HOMEPATH"], ".cache", "srtm"])
        else:
            raise Exception(
                "No default HOME directory found, please specify a path where to store files"
            )

        if not mod_path.exists(result):
            mod_os.makedirs(result)

        return result

    def exists(self, file_name: str) -> bool:
        return mod_path.exists("%s/%s" % (self.get_srtm_dir(), file_name))

    def write(self, file_name: str, contents: bytes) -> bytes:
        srtm_dir = self.get_srtm_dir()
        source_file_path = "%s/%s" % (srtm_dir, file_name)
        with open(source_file_path, "wb") as f:
            f.write(contents)

        # GeoTIFF to HGT conversion if needed
        if file_name.endswith(".tif"):
            # GDAL expects something like N69E021.HGT
            dest_file = file_name.split("_")[0] + ".HGT"
            dest_file_path = "%s/%s" % (srtm_dir, dest_file)
            event = mod_threading.Event()

            def callback(complete: float, message, unknown):
                if complete >= 1:
                    event.set()

            mod_gdal.Translate(dest_file_path, source_file_path, callback=callback)
            event.wait()
            contents = self.read(dest_file)
            mod_os.rename(dest_file_path, source_file_path.replace(".tif", ".hgt"))
            mod_os.remove(dest_file_path + ".aux.xml")
            mod_os.remove(source_file_path)

        return contents

    def read(self, file_name: str) -> bytes:
        with open("%s/%s" % (self.get_srtm_dir(), file_name), "rb") as f:
            return f.read()
