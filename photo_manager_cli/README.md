# Photos Manager

Notice that the WebP converted does not read the Exif orientation metadata, so the image has to be rotated if needed.

First, install the `libwebp`.
Fedora package is [libwebp-tools](https://packages.fedoraproject.org/pkgs/libwebp/libwebp-tools/).
Debian package is [libwebp-dev](https://packages.debian.org/trixie/libwebp-dev).

## Usage

```sh
python photos_manager.py --raw-file path/to/photo.tif --album-path /home/.../photos/
```

## Notes

* If the metadata is missing from the TIF file, run `exiftool DSC_9201.tif -tagsFromFile DSC_9201.NEF -Orientation=`
* This tool does not use the [webp](https://pypi.org/project/webp/) Python package, nor the Pillow library, because they do not handle the desired WebP options.
* WebP lossy option `-sharp_yuv` is not used. That is actually making the lossy compression look sharper, hence more visible.
