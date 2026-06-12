use flate2::read::GzDecoder;
use std::fs::{self, File, FileTimes};
use std::io;
use std::path::{Component, Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tar::Archive;
use zip::ZipArchive;

#[derive(Debug, Clone)]
pub struct ArchiveExtraction {
    pub staging_dir: PathBuf,
    pub extracted_files: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ArchiveFormat {
    Zip,
    Tgz,
}

pub fn extract_archive(path: &Path) -> Result<ArchiveExtraction, String> {
    let staging_dir = create_staging_dir()?;
    match extract_archive_to(path, &staging_dir) {
        Ok(extracted_files) => Ok(ArchiveExtraction {
            staging_dir,
            extracted_files,
        }),
        Err(err) => {
            let _ = fs::remove_dir_all(&staging_dir);
            Err(err)
        }
    }
}

fn create_staging_dir() -> Result<PathBuf, String> {
    let base_dir = directories::ProjectDirs::from("cc", "mouzi", "mouzi")
        .map(|dirs| dirs.cache_dir().join("archive-imports"))
        .unwrap_or_else(|| std::env::temp_dir().join("mouzi").join("archive-imports"));

    fs::create_dir_all(&base_dir).map_err(|e| {
        format!(
            "Failed to create archive import folder {}: {}",
            base_dir.display(),
            e
        )
    })?;

    for attempt in 0..100 {
        let millis = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);
        let dir = base_dir.join(format!(
            "import-{}-{}-{}",
            std::process::id(),
            millis,
            attempt
        ));
        match fs::create_dir(&dir) {
            Ok(()) => return Ok(dir),
            Err(e) if e.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(e) => {
                return Err(format!(
                    "Failed to create archive import folder {}: {}",
                    dir.display(),
                    e
                ))
            }
        }
    }

    Err("Failed to create a unique archive import folder".to_string())
}

fn extract_archive_to(path: &Path, staging_dir: &Path) -> Result<usize, String> {
    fs::create_dir_all(staging_dir).map_err(|e| {
        format!(
            "Failed to create archive import folder {}: {}",
            staging_dir.display(),
            e
        )
    })?;

    match archive_format(path)? {
        ArchiveFormat::Zip => extract_zip_to(path, staging_dir),
        ArchiveFormat::Tgz => extract_tgz_to(path, staging_dir),
    }
}

fn archive_format(path: &Path) -> Result<ArchiveFormat, String> {
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("")
        .to_lowercase();

    if name.ends_with(".zip") {
        Ok(ArchiveFormat::Zip)
    } else if name.ends_with(".tgz") || name.ends_with(".tar.gz") {
        Ok(ArchiveFormat::Tgz)
    } else {
        Err("Unsupported archive format. Choose a .zip, .tgz, or .tar.gz file.".to_string())
    }
}

fn extract_zip_to(path: &Path, staging_dir: &Path) -> Result<usize, String> {
    let file = File::open(path)
        .map_err(|e| format!("Failed to open archive {}: {}", path.display(), e))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| format!("Failed to read zip archive: {}", e))?;

    let mut extracted = 0;
    for i in 0..archive.len() {
        let mut entry = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read zip entry: {}", e))?;

        if entry.is_dir() {
            continue;
        }

        let entry_path = entry
            .enclosed_name()
            .map(Path::to_path_buf)
            .ok_or_else(|| format!("Archive contains an unsafe path: {}", entry.name()))?;
        let target = flattened_target_path(staging_dir, &entry_path)?;
        let mut output = File::create(&target)
            .map_err(|e| format!("Failed to extract {}: {}", target.display(), e))?;
        io::copy(&mut entry, &mut output)
            .map_err(|e| format!("Failed to extract {}: {}", target.display(), e))?;
        mark_ready_for_scan(&output, &target)?;
        extracted += 1;
    }

    Ok(extracted)
}

fn extract_tgz_to(path: &Path, staging_dir: &Path) -> Result<usize, String> {
    let file = File::open(path)
        .map_err(|e| format!("Failed to open archive {}: {}", path.display(), e))?;
    let decoder = GzDecoder::new(file);
    let mut archive = Archive::new(decoder);
    let entries = archive
        .entries()
        .map_err(|e| format!("Failed to read tar archive: {}", e))?;

    let mut extracted = 0;
    for entry in entries {
        let mut entry = entry.map_err(|e| format!("Failed to read tar entry: {}", e))?;
        if !entry.header().entry_type().is_file() {
            continue;
        }

        let entry_path = entry
            .path()
            .map_err(|e| format!("Failed to read tar entry path: {}", e))?
            .into_owned();
        ensure_safe_relative_path(&entry_path)?;
        let target = flattened_target_path(staging_dir, &entry_path)?;
        let mut output = File::create(&target)
            .map_err(|e| format!("Failed to extract {}: {}", target.display(), e))?;
        io::copy(&mut entry, &mut output)
            .map_err(|e| format!("Failed to extract {}: {}", target.display(), e))?;
        mark_ready_for_scan(&output, &target)?;
        extracted += 1;
    }

    Ok(extracted)
}

fn flattened_target_path(staging_dir: &Path, entry_path: &Path) -> Result<PathBuf, String> {
    ensure_safe_relative_path(entry_path)?;
    let file_name = entry_path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| format!("Archive entry has no file name: {}", entry_path.display()))?;

    if file_name.is_empty() {
        return Err(format!(
            "Archive entry has no file name: {}",
            entry_path.display()
        ));
    }

    Ok(collision_safe_path(staging_dir, file_name))
}

fn ensure_safe_relative_path(path: &Path) -> Result<(), String> {
    let mut has_name = false;

    for component in path.components() {
        match component {
            Component::Normal(_) => has_name = true,
            Component::CurDir => {}
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err(format!(
                    "Archive contains an unsafe path: {}",
                    path.display()
                ))
            }
        }
    }

    if has_name {
        Ok(())
    } else {
        Err(format!(
            "Archive entry has no file name: {}",
            path.display()
        ))
    }
}

fn collision_safe_path(dir: &Path, file_name: &str) -> PathBuf {
    let mut candidate = dir.join(file_name);
    if !candidate.exists() {
        return candidate;
    }

    let file_path = Path::new(file_name);
    let stem = file_path
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or(file_name);
    let extension = file_path.extension().and_then(|ext| ext.to_str());

    for index in 1.. {
        let renamed = match extension {
            Some(ext) if !ext.is_empty() => format!("{} ({}).{}", stem, index, ext),
            _ => format!("{} ({})", stem, index),
        };
        candidate = dir.join(renamed);
        if !candidate.exists() {
            return candidate;
        }
    }

    unreachable!("unbounded collision loop should always find a file name")
}

fn mark_ready_for_scan(file: &File, path: &Path) -> Result<(), String> {
    let times = FileTimes::new().set_modified(SystemTime::UNIX_EPOCH);
    file.set_times(times)
        .map_err(|e| format!("Failed to prepare {} for sorting: {}", path.display(), e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use zip::write::FileOptions;

    static TEST_DIR_COUNTER: AtomicUsize = AtomicUsize::new(0);

    fn test_dir(prefix: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "mouzi-archive-test-{}-{}-{}",
            prefix,
            std::process::id(),
            TEST_DIR_COUNTER.fetch_add(1, Ordering::SeqCst)
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn file_names(dir: &Path) -> Vec<String> {
        let mut names: Vec<String> = fs::read_dir(dir)
            .unwrap()
            .map(|entry| entry.unwrap().file_name().to_string_lossy().to_string())
            .collect();
        names.sort();
        names
    }

    fn write_zip(path: &Path, files: &[(&str, &[u8])]) {
        let file = File::create(path).unwrap();
        let mut writer = zip::ZipWriter::new(file);
        let options = FileOptions::default();

        for (name, bytes) in files {
            writer.start_file(*name, options).unwrap();
            writer.write_all(bytes).unwrap();
        }

        writer.finish().unwrap();
    }

    fn write_tgz(path: &Path, files: &[(&str, &[u8])]) {
        let file = File::create(path).unwrap();
        let encoder = flate2::write::GzEncoder::new(file, flate2::Compression::default());
        let mut builder = tar::Builder::new(encoder);

        for (name, bytes) in files {
            let mut header = tar::Header::new_gnu();
            header.set_size(bytes.len() as u64);
            header.set_cksum();
            builder.append_data(&mut header, *name, *bytes).unwrap();
        }

        builder.finish().unwrap();
    }

    #[test]
    fn zip_extracts_nested_files_flat() {
        let root = test_dir("zip-flat");
        let archive_path = root.join("takeout.zip");
        let staging = root.join("staging");
        write_zip(
            &archive_path,
            &[
                ("Photos/2023/01/img.jpg", b"image"),
                ("Drive/doc.pdf", b"document"),
            ],
        );

        let count = extract_archive_to(&archive_path, &staging).unwrap();

        assert_eq!(count, 2);
        assert_eq!(file_names(&staging), vec!["doc.pdf", "img.jpg"]);
        assert_eq!(fs::read(staging.join("img.jpg")).unwrap(), b"image");
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn duplicate_file_names_are_renamed() {
        let root = test_dir("zip-duplicates");
        let archive_path = root.join("takeout.zip");
        let staging = root.join("staging");
        write_zip(
            &archive_path,
            &[("a/IMG_0001.jpg", b"first"), ("b/IMG_0001.jpg", b"second")],
        );

        let count = extract_archive_to(&archive_path, &staging).unwrap();

        assert_eq!(count, 2);
        assert_eq!(
            file_names(&staging),
            vec!["IMG_0001 (1).jpg", "IMG_0001.jpg"]
        );
        assert_eq!(fs::read(staging.join("IMG_0001.jpg")).unwrap(), b"first");
        assert_eq!(
            fs::read(staging.join("IMG_0001 (1).jpg")).unwrap(),
            b"second"
        );
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn tgz_extracts_nested_files_flat() {
        let root = test_dir("tgz-flat");
        let archive_path = root.join("takeout.tgz");
        let staging = root.join("staging");
        write_tgz(
            &archive_path,
            &[
                ("Photos/2023/01/img.jpg", b"image"),
                ("Drive/doc.pdf", b"document"),
            ],
        );

        let count = extract_archive_to(&archive_path, &staging).unwrap();

        assert_eq!(count, 2);
        assert_eq!(file_names(&staging), vec!["doc.pdf", "img.jpg"]);
        assert_eq!(fs::read(staging.join("doc.pdf")).unwrap(), b"document");
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn zip_slip_entries_are_rejected() {
        let root = test_dir("zip-slip");
        let archive_path = root.join("takeout.zip");
        let staging = root.join("staging");
        write_zip(&archive_path, &[("../../evil.txt", b"bad")]);

        let err = extract_archive_to(&archive_path, &staging).unwrap_err();

        assert!(err.contains("unsafe path"));
        assert!(!root.join("evil.txt").exists());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn unsupported_archive_extensions_are_rejected() {
        let root = test_dir("unsupported");
        let archive_path = root.join("takeout.rar");
        fs::write(&archive_path, b"not an archive").unwrap();
        let staging = root.join("staging");

        let err = extract_archive_to(&archive_path, &staging).unwrap_err();

        assert!(err.contains("Unsupported archive format"));
        let _ = fs::remove_dir_all(root);
    }
}
