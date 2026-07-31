use crate::db::{get_rules, get_settings, log_action, ActionLog, Rule};
use crate::ignore::{is_ignored, load_mouziignore};
use chrono::Utc;
use regex::Regex;
use std::fs;
use std::path::{Path, PathBuf};

/// Check if a file is currently locked by another process.
/// On Windows this tries to open with write access; if another process holds
/// the file without FILE_SHARE_WRITE the open will fail.
fn is_file_locked(path: &Path) -> bool {
    match fs::OpenOptions::new().write(true).open(path) {
        Ok(_) => false,
        Err(_) => true,
    }
}

/// Check whether a file has passed its grace period since last modification.
/// Returns true if the file is ready to be moved.
fn check_grace_period(path: &Path, grace_seconds: i64) -> bool {
    if grace_seconds <= 0 {
        return true;
    }
    if let Ok(metadata) = fs::metadata(path) {
        if let Ok(modified) = metadata.modified() {
            if let Ok(elapsed) = modified.elapsed() {
                return elapsed.as_secs() >= grace_seconds as u64;
            }
        }
    }
    true
}

#[derive(Debug, Clone)]
pub struct FileInfo {
    pub path: PathBuf,
    pub name: String,
    pub extension: String,
    pub size: u64,
}

pub fn should_ignore_file(path: &Path) -> bool {
    let name = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_lowercase();

    let ignored_names = [
        "desktop.ini", "thumbs.db", "ntuser.dat", "ntuser.ini",
        "boot.ini", "bootmgr", "pagefile.sys", "hiberfil.sys",
        "swapfile.sys", "autorun.inf", "config.sys", "io.sys",
        "msdos.sys", "command.com", "ntldr", "bootsect.bak",
    ];
    if ignored_names.contains(&name.as_str()) {
        return true;
    }

    // Browser temporary download files
    let temp_extensions = [".crdownload", ".part", ".download", ".tmp"];
    for ext in &temp_extensions {
        if name.ends_with(ext) {
            return true;
        }
    }

    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if let Ok(metadata) = fs::metadata(path) {
            let attrs = metadata.file_attributes();
            const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;
            const FILE_ATTRIBUTE_SYSTEM: u32 = 0x4;
            if attrs & (FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM) != 0 {
                return true;
            }
        }
    }

    if name.starts_with('.') {
        return true;
    }

    false
}

/// Check whether a file is ignored by the `.mouziignore` in its parent folder.
/// This is the single helper used by both the watcher and the manual Clean Now path
/// so both code paths behave identically.
pub fn is_file_ignored_by_mouziignore(path: &Path) -> bool {
    if let Some(parent) = path.parent() {
        let patterns = load_mouziignore(&parent.to_string_lossy());
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            return is_ignored(name, &patterns);
        }
    }
    false
}

pub fn scan_file(path: &Path) -> Option<FileInfo> {
    if should_ignore_file(path) {
        return None;
    }
    let metadata = fs::metadata(path).ok()?;
    let name = path.file_name()?.to_string_lossy().to_string();
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    Some(FileInfo {
        path: path.to_path_buf(),
        name,
        extension,
        size: metadata.len(),
    })
}

fn matches_rule(file: &FileInfo, rule: &Rule) -> bool {
    if !rule.enabled {
        return false;
    }

    let ext_matches = rule.extensions.contains(&"*".to_string())
        || rule.extensions.contains(&file.extension);

    let pattern_matches = if let Some(ref pattern) = rule.pattern {
        if pattern.is_empty() {
            true
        } else {
            Regex::new(pattern)
                .map(|re| re.is_match(&file.name))
                .unwrap_or(false)
        }
    } else {
        true
    };

    ext_matches && pattern_matches
}

fn resolve_destination(destination: &str, file: &FileInfo) -> PathBuf {
    let now = Utc::now();
    let resolved = destination
        .replace("{year}", &now.format("%Y").to_string())
        .replace("{month}", &now.format("%m").to_string())
        .replace("{day}", &now.format("%d").to_string())
        .replace("{extension}", &file.extension)
        .replace("{filename}", &file.name);
    PathBuf::from(resolved)
}

pub fn find_matching_rule(file: &FileInfo) -> Option<Rule> {
    let rules = get_rules().ok()?;
    rules.into_iter().find(|rule| matches_rule(file, rule))
}

fn move_file_cross_device(src: &Path, dst: &Path) -> Result<(), std::io::Error> {
    // Try a fast atomic rename first (same filesystem).
    match fs::rename(src, dst) {
        Ok(()) => Ok(()),
        Err(_) => {
            // Fallback: copy and remove for cross-device / cross-drive moves.
            fs::copy(src, dst)?;
            fs::remove_file(src)?;
            Ok(())
        }
    }
}

pub fn execute_rule(file_info: &FileInfo, rule: &Rule) -> Result<String, String> {
    let base_folder = file_info
        .path
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| ".".to_string());

    let dest = if Path::new(&rule.destination).is_absolute() {
        // Backwards compatibility: old rules with absolute paths
        resolve_destination(&rule.destination, file_info)
    } else {
        // New behavior: relative to the source folder
        PathBuf::from(&base_folder).join(resolve_destination(&rule.destination, file_info))
    };

    match rule.action.as_str() {
        "move" => {
            fs::create_dir_all(&dest).map_err(|e| e.to_string())?;
            let new_path = dest.join(&file_info.name);
            if new_path.exists() {
                let stem = file_info
                    .path
                    .file_stem()
                    .unwrap_or_default()
                    .to_string_lossy();
                let new_name = format!("{}_{}.{}", stem, Utc::now().timestamp(), file_info.extension);
                let new_path = dest.join(&new_name);
                move_file_cross_device(&file_info.path, &new_path).map_err(|e| e.to_string())?;
                Ok(new_path.to_string_lossy().to_string())
            } else {
                move_file_cross_device(&file_info.path, &new_path).map_err(|e| e.to_string())?;
                Ok(new_path.to_string_lossy().to_string())
            }
        }
        "ignore" => Ok(file_info.path.to_string_lossy().to_string()),
        _ => Err(format!("Unknown action: {}", rule.action)),
    }
}

pub fn process_file(path: &Path, bypass_grace: bool) -> Result<Option<(Rule, String)>, String> {
    let (grace_period, lock_check) = get_settings()
        .map(|s| (s.grace_period_seconds, s.lock_check_enabled))
        .unwrap_or((300, true));

    if !bypass_grace && !check_grace_period(path, grace_period) {
        return Ok(None);
    }
    if lock_check && is_file_locked(path) {
        return Ok(None);
    }

    // Safety net: also check .mouziignore inside process_file.
    if is_file_ignored_by_mouziignore(path) {
        return Ok(None);
    }

    let file_info = scan_file(path).ok_or("Cannot read file metadata")?;
    let rule = find_matching_rule(&file_info).ok_or("No matching rule")?;

    if rule.action == "ignore" {
        return Ok(None);
    }

    let dest = execute_rule(&file_info, &rule)?;

    let log = ActionLog {
        id: None,
        timestamp: Utc::now(),
        source_path: file_info.path.to_string_lossy().to_string(),
        destination_path: Some(dest.clone()),
        action: rule.action.clone(),
        file_name: file_info.name.clone(),
        file_type: rule.name.clone(),
        undone: false,
    };
    let _ = log_action(&log);

    Ok(Some((rule, dest)))
}

pub fn manual_scan_folder(folder: &str) -> Result<Vec<(String, String, String)>, String> {
    let mut results = Vec::new();
    let entries = fs::read_dir(folder).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
        if should_ignore_file(&path) {
            eprintln!("[manual_scan] ignoring system/hidden/temp file: {}", file_name);
            continue;
        }
        if is_file_ignored_by_mouziignore(&path) {
            eprintln!("[manual_scan] ignoring due to .mouziignore: {}", file_name);
            continue;
        }
        match process_file(&path, true) {
            Ok(Some((rule, dest))) => {
                eprintln!("[manual_scan] organized: {} -> {} ({})", file_name, dest, rule.name);
                results.push((file_name, rule.name, dest));
            }
            Ok(None) => {
                eprintln!("[manual_scan] no matching rule or skipped: {}", file_name);
            }
            Err(e) => {
                eprintln!("[manual_scan] error processing {}: {}", file_name, e);
            }
        }
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_move_file_cross_device() {
        let test_root = std::env::temp_dir().join(format!(
            "mouzi-move-test-{}",
            std::process::id()
        ));
        let src_dir = test_root.join("src");
        let dst_dir = test_root.join("dst");
        fs::create_dir_all(&src_dir).unwrap();
        fs::create_dir_all(&dst_dir).unwrap();

        let src = src_dir.join("cross_device_test.txt");
        let dst = dst_dir.join("cross_device_test.txt");

        fs::write(&src, "hello cross-device").unwrap();
        if dst.exists() {
            fs::remove_file(&dst).unwrap();
        }

        move_file_cross_device(&src, &dst).unwrap();

        assert!(dst.exists(), "destination file should exist after cross-device move");
        assert!(!src.exists(), "source file should be removed after cross-device move");

        // cleanup
        let _ = fs::remove_file(&dst);
        let _ = fs::remove_file(&src);
        let _ = fs::remove_dir_all(&test_root);
    }
}
