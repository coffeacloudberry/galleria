use walkdir::{DirEntry, WalkDir};
use resvg::render;
use std::fs;
use std::path::PathBuf;
use tiny_skia::{Pixmap, Transform};
use usvg::{Options, Tree};
use image::{ImageError, ImageFormat, ImageReader};
use tempfile;
use serde::Deserialize;
use tempfile::TempDir;
use std::time::Instant;

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

/// Return true if the file extension is .jpg. Panic in case of unexpected result.
fn is_jpg(path: &PathBuf) -> bool {
    path.extension().map(|s| s == "jpg").unwrap()
}

fn process_ok_path(photo_id: u64, curr_path: PathBuf, photos_list: &mut Vec<(u64, PathBuf)>) {
    let walker = WalkDir::new(&curr_path).into_iter().filter_map(|e| e.ok());
    let mut all_tif_files = walker.filter(|e| is_tif(e));
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

fn get_metadata(path_to_photo: &PathBuf) -> Option<PhotoInfo> {
    let info_data = fs::read(path_to_photo.as_path().parent().unwrap().join("i.json"));
    let json: PhotoInfo = serde_json::from_str(&*String::from_utf8_lossy(info_data.unwrap().as_slice())).unwrap();
    if json.title.en.len() == 0 || json.title.fi.len() == 0 || json.title.fr.len() == 0 {
        None
    } else {
        Some(json)
    }
}

fn tif_to_jpg(tif_file: &PathBuf, jpg_file: &PathBuf) -> Result<(), ImageError> {
    let mut reader = ImageReader::open(tif_file)?;
    reader.no_limits();
    let dyn_img = reader.decode()?;
    let img = dyn_img.thumbnail(1000, 1000).to_rgb8();
    img.save_with_format(jpg_file, ImageFormat::Jpeg)?;
    Ok(())
}

fn get_jpg(photo_id: u64, input_path: &PathBuf, tmp_dir: &TempDir) -> Result<PathBuf, ImageError> {
    if is_jpg(&input_path) {
        Ok(input_path.to_owned())
    } else {
        let tmp_file_path = tmp_dir.path().join("tmp.jpg");
        let now = Instant::now();
        tif_to_jpg(input_path, &tmp_file_path)?;
        let elapsed = now.elapsed();
        println!("[{photo_id}] Converted {:?} in {:.1?}", input_path, elapsed);
        Ok(tmp_file_path)
    }
}

fn sanitize_text(text: &String) -> String {
    text.replace('&', "&amp;")
}

fn generate(photo_id: u64, metadata: &PhotoInfo, jpg: &PathBuf, out_path: &PathBuf) {
    let now = Instant::now();
    let template = liquid::ParserBuilder::with_stdlib()
        .build()
        .unwrap()
        .parse(include_str!("templates/photo_to_social.tpl.svg"))
        .unwrap();

    let globals = liquid::object!({
        "image": jpg.to_str().unwrap(),
        "date": metadata.date_taken.to_string().split('T').next(),
        "text_en": sanitize_text(&metadata.title.en),
        "text_fi": sanitize_text(&metadata.title.fi),
        "text_fr": sanitize_text(&metadata.title.fr),
    });
    let svg = template.render(&globals).unwrap();
    let mut pixmap = Pixmap::new(1200, 1300).unwrap();
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
    for entry in fs::read_dir(photos).unwrap() {
        if let Ok(path) = entry {
            process_dir_entry(path, &mut photos_list);
        }
    }
    photos_list.sort_by(|a, b| a.0.cmp(&b.0));

    let tmp_dir = tempfile::tempdir().unwrap();
    for (photo_id, path) in photos_list {
        if let Some(metadata) = get_metadata(&path) {
            let out_path = path.as_path().parent().unwrap().join("_to_social.jpg");
            if out_path.exists() {
                continue;
            }
            match get_jpg(photo_id, &path, &tmp_dir) {
                Ok(jpg) => generate(photo_id, &metadata, &jpg, &out_path),
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
