use walkdir::{DirEntry, WalkDir};
use resvg::render;
use std::fs;
use std::cmp;
use std::path::{Path, PathBuf};
use tiny_skia::{Pixmap, Transform};
use usvg::{Options, Tree};
use image::{ImageError, ImageFormat, ImageReader};
use serde::Deserialize;
use tempfile::TempDir;
use std::time::Instant;

const PHOTO_BOX_SIZE: u32 = 900;
const IMAGE_BORDER: u32 = 100; // big enough to avoid the Mastodon buttons in the photo

#[derive(Deserialize, Debug)]
struct Title {
    en: String,
    fi: String,
    fr: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct PhotoInfo {
    title: Title,
    date_taken: String,
}

/// Return true if the file extension is .tif. Return false otherwise.
fn is_tif(entry: &DirEntry) -> bool {
    let path = entry.path();
    path.is_file() && path.extension().map(|s| s == "tif").unwrap_or(false)
}

fn process_ok_path(photo_id: u64, curr_path: PathBuf, photos_list: &mut Vec<(u64, PathBuf)>) {
    let walker = WalkDir::new(&curr_path).into_iter().filter_map(|e| e.ok());
    let mut all_tif_files = walker.filter(is_tif);
    if let Some(tif_file) = all_tif_files.next() {
        if all_tif_files.next().is_some() {
            eprintln!("[{photo_id}] Found multiple .tif!");
        }
        photos_list.push((photo_id, tif_file.clone().into_path()));
    } else {
        eprintln!("[{photo_id}] Missing .tif!");
        let fallback_photo = curr_path.join("photo.jpg");
        if fallback_photo.clone().is_file() {
            photos_list.push((photo_id, fallback_photo));
        } else {
            eprintln!("[{photo_id}] Missing .tif and photo.jpg!");
        }
    }
}

fn process_dir_entry(path: fs::DirEntry, photos_list: &mut Vec<(u64, PathBuf)>) {
    let curr_path = path.path();
    if curr_path.is_dir() {
        let dir_name = path.file_name();
        if let Ok(photo_id) = dir_name.into_string().unwrap().parse::<u64>() {
            process_ok_path(photo_id, curr_path, photos_list);
        }
    }
}

fn get_metadata(path_to_photo: &Path) -> Option<PhotoInfo> {
    let info_data = fs::read(path_to_photo.parent().unwrap().join("i.json"));
    let json: PhotoInfo = serde_json::from_str(&String::from_utf8_lossy(info_data.unwrap().as_slice())).unwrap();
    if json.title.en.is_empty() || json.title.fi.is_empty() || json.title.fr.is_empty() {
        None
    } else {
        Some(json)
    }
}

/// Convert the photo to PNG and resize to fit in a square box while preserving the aspect ratio.
fn to_small_png(tif_file: &PathBuf, png_file: &PathBuf) -> Result<(u32, u32), ImageError> {
    let mut reader = ImageReader::open(tif_file)?;
    reader.no_limits();
    let dyn_img = reader.decode()?;
    let img = dyn_img.thumbnail(PHOTO_BOX_SIZE, PHOTO_BOX_SIZE).to_rgb8();
    img.save_with_format(png_file, ImageFormat::Png)?;
    Ok(img.dimensions())
}

/// Generate a PNG file.
fn get_png(input_path: &PathBuf, tmp_dir: &TempDir) -> Result<(PathBuf, (u32, u32)), ImageError> {
    let tmp_file_path = tmp_dir.path().join("tmp.png");
    let now = Instant::now();
    let png_dim = to_small_png(input_path, &tmp_file_path)?;
    let elapsed = now.elapsed();
    println!(
        "Converted {:?} in {:.1?}; Size: {:?} x {:?} px",
        input_path,
        elapsed,
        png_dim.0,
        png_dim.1,
    );
    Ok((tmp_file_path, png_dim))
}

fn sanitize_text(text: &str) -> String {
    text.replace('&', "&amp;")
}

fn generate(photo_id: u64, metadata: &PhotoInfo, png: (PathBuf, (u32, u32)), out_path: &PathBuf) {
    let now = Instant::now();
    let template = liquid::ParserBuilder::with_stdlib()
        .build()
        .unwrap()
        .parse(include_str!("templates/photo_to_social.tpl.svg"))
        .unwrap();

    let image_width = cmp::max(png.1.0, 600) + 2 * IMAGE_BORDER;
    let image_height = png.1.1 + 2 * IMAGE_BORDER + 24 * 5;
    let globals = liquid::object!({
        "photo": png.0.to_str().unwrap(),
        "photo_width": png.1.0,
        "photo_translate": png.1.0 / 2,
        "photo_height": png.1.1,
        "border": IMAGE_BORDER,
        "image_width": image_width,
        "image_height": image_height,
        "line_1_y": png.1.1 + IMAGE_BORDER + 24 * 2,
        "line_2_y": png.1.1 + IMAGE_BORDER + ((24.0 * 3.5) as u32),
        "line_3_y": png.1.1 + IMAGE_BORDER + 24 * 5,
        "line_1_x_r": image_width - IMAGE_BORDER,
        "line_2_x": image_width / 2,
        "date": metadata.date_taken.split('T').next(),
        "text_en": sanitize_text(&metadata.title.en),
        "text_fi": sanitize_text(&metadata.title.fi),
        "text_fr": sanitize_text(&metadata.title.fr),
    });
    let svg = template.render(&globals).unwrap();
    let mut pixmap = Pixmap::new(image_width, image_height).unwrap();
    let tree = {
        let mut options = Options::default();
        options.fontdb_mut().load_fonts_dir("src/fonts/asap");
        Tree::from_str(&svg, &options).unwrap()
    };
    render(&tree, Transform::default(), &mut pixmap.as_mut());

    pixmap.save_png(out_path).expect("Failed to save PNG");
    let elapsed = now.elapsed();
    println!("[{photo_id}] Generated in {:.1?}", elapsed);
}

fn process_photos() {
    let mut photos_list: Vec<(u64, PathBuf)> = Vec::new();
    let photos = "public/content/photos";
    for entry in fs::read_dir(photos).unwrap().flatten() {
        process_dir_entry(entry, &mut photos_list);
    }
    photos_list.sort_by(|a, b| a.0.cmp(&b.0));

    let tmp_dir = tempfile::tempdir().unwrap();
    for (photo_id, path) in photos_list {
        if let Some(metadata) = get_metadata(&path) {
            let out_path = path.as_path().parent().unwrap().join("_to_social.png");
            if out_path.exists() {
                continue;
            }
            match get_png(&path, &tmp_dir) {
                Ok(png) => generate(photo_id, &metadata, png, &out_path),
                Err(err) => eprintln!("[{photo_id}] Failed to convert! {:?}", err),
            }
        } else {
            eprintln!("[{photo_id}] Missing title!");
        }
    }
}

fn main() {
    process_photos();
}
