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

import requests as mod_requests


class EarthDataSession(mod_requests.Session):
    """
    Modify requests.Session to preserve Auth headers.

    Class comes from NASA docs on accessing their data servers.
    """

    AUTH_HOST = "urs.earthdata.nasa.gov"

    def __init__(self, username: str, password: str):
        super(EarthDataSession, self).__init__()
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
            if (
                (original_parsed.hostname != redirect_parsed.hostname)
                and redirect_parsed.hostname != self.AUTH_HOST
                and original_parsed.hostname != self.AUTH_HOST
            ):
                del headers["Authorization"]
