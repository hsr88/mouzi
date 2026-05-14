use std::fs;
use std::path::Path;

/// Load .mouziignore patterns from a folder. Returns Vec of non-empty, non-comment lines.
pub fn load_mouziignore(folder_path: &str) -> Vec<String> {
    let path = Path::new(folder_path).join(".mouziignore");
    if !path.exists() {
        return Vec::new();
    }
    match fs::read_to_string(&path) {
        Ok(content) => content
            .lines()
            .map(|l| l.trim())
            .filter(|l| !l.is_empty() && !l.starts_with('#'))
            .map(|l| l.to_string())
            .collect(),
        Err(_) => Vec::new(),
    }
}

/// Save patterns to .mouziignore in the given folder.
/// Writes a header comment, then one pattern per line.
pub fn save_mouziignore(folder_path: &str, patterns: &[String]) -> Result<(), String> {
    let path = Path::new(folder_path).join(".mouziignore");
    let mut content = String::from("# Mouzi ignore rules\n# https://mouzi.cc/docs\n\n");
    for p in patterns {
        content.push_str(p);
        content.push('\n');
    }
    fs::write(&path, content).map_err(|e| e.to_string())
}

/// Check if a file name matches any of the ignore patterns.
/// Supports: literal match, `*` wildcard, and `folder/` directory suffix.
pub fn is_ignored(name: &str, patterns: &[String]) -> bool {
    for pat in patterns {
        // Directory pattern: ends with /
        if pat.ends_with('/') {
            let dir_pat = &pat[..pat.len() - 1];
            if name.eq_ignore_ascii_case(dir_pat) {
                return true;
            }
            continue;
        }
        // Wildcard pattern: contains *
        if pat.contains('*') {
            let parts: Vec<&str> = pat.split('*').collect();
            if parts.len() == 2 {
                let prefix = parts[0];
                let suffix = parts[1];
                if name.starts_with(prefix) && name.ends_with(suffix) {
                    return true;
                }
            }
            continue;
        }
        // Literal match
        if name.eq_ignore_ascii_case(pat) {
            return true;
        }
    }
    false
}
