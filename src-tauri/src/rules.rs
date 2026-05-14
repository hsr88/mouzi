use crate::db::{get_rules, log_action, ActionLog, Rule};
use crate::ignore::{is_ignored, load_mouziignore};
use chrono::Utc;
use regex::Regex;
use std::fs;
use std::path::{Path, PathBuf};

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
                fs::rename(&file_info.path, &new_path).map_err(|e| e.to_string())?;
                Ok(new_path.to_string_lossy().to_string())
            } else {
                fs::rename(&file_info.path, &new_path).map_err(|e| e.to_string())?;
                Ok(new_path.to_string_lossy().to_string())
            }
        }
        "ignore" => Ok(file_info.path.to_string_lossy().to_string()),
        _ => Err(format!("Unknown action: {}", rule.action)),
    }
}

pub fn process_file(path: &Path) -> Result<Option<(Rule, String)>, String> {
    if let Some(parent) = path.parent() {
        let patterns = load_mouziignore(&parent.to_string_lossy());
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if is_ignored(name, &patterns) {
                return Ok(None);
            }
        }
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
        if path.is_file() && !should_ignore_file(&path) {
            if let Ok(Some((rule, dest))) = process_file(&path) {
                results.push((
                    path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                    rule.name,
                    dest,
                ));
            }
        }
    }

    Ok(results)
}
