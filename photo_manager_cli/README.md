# Photos Manager

The [Google webp command line encoder](https://developers.google.com/speed/webp/docs/using) is required. This project includes a downloader. Any internet connection (specifically to Google servers) will be prompted. The downloaded archive is the official library, which is PGP-signed by the WebM team and verified before opening the archive.

Notice that the WebP converted does not read the Exif orientation metadata, so the image has to be rotated if needed.

## Usage

```sh
python photos_manager.py add-photo --raw-file path/to/photo.tif --album-path /home/.../photos/
python photos_manager.py generate-webp --album-path /home/.../photos/
python photos_manager.py generate-social --album-path /home/.../photos/
```

## Notes

If the metadata is missing from the TIF file, run `exiftool DSC_9201.tif -tagsFromFile DSC_9201.NEF -Orientation=`
