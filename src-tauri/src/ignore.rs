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
            .map(|l| {
                let l = l.trim();
                let mut escaped = false;
                let mut end = l.len();

                for (i, c) in l.char_indices() {
                    match c {
                        '\\' => escaped = !escaped,
                        '#' if !escaped => {
                            end = i;
                            break;
                        }
                        _ => escaped = false,
                    }
                }

                l[..end].trim().to_string()
            })
            .filter(|l| !l.is_empty() && !l.starts_with('#'))
            .map(|l| l.replace(r"\#", "#"))
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
/// Supports: literal match, `*` wildcard (any number of `*`), and `folder/` directory suffix.
/// On Windows, matching is case-insensitive for both literals and wildcards.
pub fn is_ignored(name: &str, patterns: &[String]) -> bool {
    #[cfg(windows)]
    let name = name.to_lowercase();

    for original_pat in patterns {
        #[cfg(windows)]
        let pat = original_pat.to_lowercase();
        #[cfg(not(windows))]
        let pat = original_pat.as_str();

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
            if glob_match(&name, &pat) {
                return true;
            }
            continue;
        }
        // Literal match
        if name.eq_ignore_ascii_case(&pat) {
            return true;
        }
    }
    false
}

/// Simple glob matcher supporting multiple `*` wildcards.
/// On Windows both `name` and `pat` are expected to already be lowercased.
fn glob_match(name: &str, pat: &str) -> bool {
    let parts: Vec<&str> = pat.split('*').collect();
    if parts.is_empty() {
        return true;
    }

    let starts_with_star = pat.starts_with('*');
    let ends_with_star = pat.ends_with('*');
    let mut rest = name;

    for (i, part) in parts.iter().enumerate() {
        if part.is_empty() {
            continue;
        }
        if i == 0 && !starts_with_star {
            // First non-empty part must match the start of the name.
            if !rest.starts_with(part) {
                return false;
            }
            rest = &rest[part.len()..];
        } else {
            // Subsequent parts must appear somewhere in the remaining name.
            match rest.find(part) {
                Some(pos) => rest = &rest[pos + part.len()..],
                None => return false,
            }
        }
    }

    // If the pattern does not end with `*`, the remaining text must be empty.
    if !ends_with_star && !rest.is_empty() {
        return false;
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(windows)]
    fn wildcard_case_insensitive_on_windows() {
        assert!(is_ignored("FOO.TMP", &["*.tmp".to_string()]));
        assert!(is_ignored("Foo.Tmp", &["*.tmp".to_string()]));
        assert!(is_ignored("BAR.EXE", &["*.exe".to_string()]));
        assert!(is_ignored("prefixSUFFIX.txt", &["prefix*.TXT".to_string()]));
        assert!(is_ignored("README", &["readme".to_string()]));
        assert!(!is_ignored("foo.tmp", &["*.txt".to_string()]));
        assert!(!is_ignored("FOO.TMP", &["*.txt".to_string()]));
    }

    #[test]
    fn multiple_wildcards_and_spaces() {
        assert!(is_ignored("The Chronicle Herald (Metro)_20260612.txt", &["*metro*".to_string()]));
        assert!(is_ignored("The Chronicle Herald (Metro)_20260612.txt", &["*chronicle herald*".to_string()]));
        assert!(is_ignored("some.Metro.file.txt", &["*metro*.txt".to_string()]));
        assert!(is_ignored("file.name.txt", &["file.*.txt".to_string()]));
        assert!(!is_ignored("foo.txt", &["*metro*".to_string()]));
    }

    #[test]
    #[cfg(not(windows))]
    fn wildcard_case_sensitive_on_non_windows() {
        assert!(is_ignored("foo.tmp", &["*.tmp".to_string()]));
        assert!(!is_ignored("FOO.TMP", &["*.tmp".to_string()]));
    }
}
