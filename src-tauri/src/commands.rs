use crate::db::*;
use crate::ignore::{load_mouziignore, save_mouziignore};
use crate::rules::{manual_scan_folder, process_file};
use crate::AppState;
use serde::Serialize;
use std::path::Path;
use std::time::Instant;
use tauri::{AppHandle, Manager};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_notification::NotificationExt;

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub fn get_system_language() -> String {
    let locale = sys_locale::get_locale().unwrap_or_else(|| "en".to_string());
    let lang = locale.split('-').next().unwrap_or("en").to_lowercase();
    match lang.as_str() {
        "pl" => "pl".to_string(),
        "it" => "it".to_string(),
        "de" => "de".to_string(),
        "fr" => "fr".to_string(),
        "ru" => "ru".to_string(),
        "ja" => "ja".to_string(),
        "es" => "es".to_string(),
        "uk" => "uk".to_string(),
        "zh" => "zh-CN".to_string(),
        _ => "en".to_string(),
    }
}

#[tauri::command]
pub fn get_rules_cmd() -> Result<Vec<Rule>, String> {
    get_rules().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_rule_cmd(rule: Rule) -> Result<i64, String> {
    add_rule(&rule).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_rule_cmd(rule: Rule) -> Result<(), String> {
    update_rule(&rule).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_rule_cmd(id: i64) -> Result<(), String> {
    delete_rule(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_folders_cmd() -> Result<Vec<WatchedFolder>, String> {
    get_watched_folders().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_folder_cmd(app: tauri::AppHandle, path: String, mode: String) -> Result<i64, String> {
    let _ = std::fs::create_dir_all(&path);
    let id = add_watched_folder(&path, &mode).map_err(|e| e.to_string())?;
    if let Some(state) = app.try_state::<crate::AppState>() {
        let mut watcher = state.watcher.lock().unwrap();
        let _ = watcher.refresh(app.clone());
    }
    Ok(id)
}

#[tauri::command]
pub fn remove_folder_cmd(app: tauri::AppHandle, id: i64) -> Result<(), String> {
    remove_watched_folder(id).map_err(|e| e.to_string())?;
    if let Some(state) = app.try_state::<crate::AppState>() {
        let mut watcher = state.watcher.lock().unwrap();
        let _ = watcher.refresh(app.clone());
    }
    Ok(())
}

#[tauri::command]
pub fn update_folder_mode_cmd(app: tauri::AppHandle, id: i64, mode: String) -> Result<(), String> {
    if !is_valid_folder_mode(&mode) {
        return Err(format!("Invalid folder mode: {}", mode));
    }

    let old_mode = get_watched_folders()
        .ok()
        .and_then(|folders| folders.into_iter().find(|f| f.id == Some(id)))
        .map(|f| f.mode);

    update_folder_mode(id, &mode).map_err(|e| e.to_string())?;

    if let Some(state) = app.try_state::<crate::AppState>() {
        let mut watcher = state.watcher.lock().unwrap();

        // If switching from manual to silent, flush collected files into the auto queue.
        if is_folder_auto_mode(&mode) {
            if let Some(ref old) = old_mode {
                if is_folder_manual_mode(old) {
                    if let Some(folder) = get_watched_folders()
                        .ok()
                        .and_then(|folders| folders.into_iter().find(|f| f.id == Some(id)))
                    {
                        watcher.flush_manual_to_pending(&folder.path);
                    }
                }
            }
        }

        let _ = watcher.refresh(app.clone());
    }
    Ok(())
}

#[tauri::command]
pub fn get_logs_cmd(limit: i64) -> Result<Vec<ActionLog>, String> {
    get_recent_logs(limit).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_stats_cmd() -> Result<Vec<(String, i64)>, String> {
    get_weekly_stats().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn undo_action_cmd(id: i64, state: tauri::State<AppState>) -> Result<bool, String> {
    let db = get_db();
    let conn = db.lock().unwrap();
    let log: Option<(String, String)> = conn
        .query_row(
            "SELECT source_path, destination_path FROM action_logs WHERE id=?1 AND undone=0 AND action='move' AND destination_path IS NOT NULL",
            [id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .ok();

    if let Some((source, dest)) = log {
        if !dest.is_empty() && std::path::Path::new(&dest).exists() {
            let _ = std::fs::rename(&dest, &source);
            // Ignore this file for 5 seconds so the watcher doesn't re-process it
            let mut ignored = state.ignored_files.lock().unwrap();
            ignored.insert(source, Instant::now());
        }
        conn.execute("UPDATE action_logs SET undone=1 WHERE id=?1", [id])
            .map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub fn undo_all_cmd(state: tauri::State<AppState>) -> Result<i32, String> {
    let logs = crate::db::get_undoable_logs().map_err(|e| e.to_string())?;
    let db = get_db();
    let conn = db.lock().unwrap();
    let mut count = 0;

    for (id, source, dest) in logs {
        if !dest.is_empty() && std::path::Path::new(&dest).exists() {
            let _ = std::fs::rename(&dest, &source);
            let mut ignored = state.ignored_files.lock().unwrap();
            ignored.insert(source, Instant::now());
        }
        let _ = conn.execute("UPDATE action_logs SET undone=1 WHERE id=?1", [id]);
        count += 1;
    }

    Ok(count)
}

/// Return the current app version and release date.
#[tauri::command]
pub fn get_version_cmd(app: AppHandle) -> Result<(String, String), String> {
    let version = app.package_info().version.to_string();
    let release_date = "2026-08-27".to_string();
    Ok((version, release_date))
}

#[tauri::command]
pub fn get_settings_cmd() -> Result<AppSettings, String> {
    get_settings().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_settings_cmd(settings: AppSettings) -> Result<(), String> {
    update_settings(&settings).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_logs_cmd() -> Result<(), String> {
    clear_logs().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scan_folder_cmd(path: String) -> Result<Vec<(String, String, String)>, String> {
    let folders = get_watched_folders().map_err(|e| e.to_string())?;
    if folders
        .iter()
        .find(|f| f.path == path)
        .map(|f| is_folder_paused_mode(&f.mode))
        .unwrap_or(false)
    {
        return Ok(vec![]);
    }
    manual_scan_folder(&path)
}

#[tauri::command]
pub fn scan_selected_files_cmd(
    paths: Vec<String>,
) -> Result<Vec<(String, String, String)>, String> {
    let manual_folders: Vec<String> = get_watched_folders()
        .map_err(|e| e.to_string())?
        .into_iter()
        .filter(|folder| folder.enabled && is_folder_manual_mode(&folder.mode))
        .map(|folder| folder.path)
        .collect();

    let mut results = Vec::new();
    for path in paths {
        let path = std::path::PathBuf::from(path);
        let parent = path
            .parent()
            .map(|value| value.to_string_lossy().to_string())
            .unwrap_or_default();
        if !manual_folders.iter().any(|folder| folder == &parent) || !path.is_file() {
            continue;
        }

        if let Some((rule, destination)) = process_file(&path, true)? {
            let file_name = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            results.push((file_name, rule.name, destination.unwrap_or_default()));
        }
    }
    Ok(results)
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveImportSummary {
    pub extracted_count: usize,
    pub sorted_count: usize,
    pub staging_path: String,
    pub results: Vec<(String, String, String)>,
}

#[tauri::command]
pub fn import_archive_cmd(path: String) -> Result<ArchiveImportSummary, String> {
    let extraction = crate::archive::extract_archive(Path::new(&path))?;
    let staging_path = extraction.staging_dir.to_string_lossy().to_string();
    let results = manual_scan_folder(&staging_path)?;

    Ok(ArchiveImportSummary {
        extracted_count: extraction.extracted_files,
        sorted_count: results.len(),
        staging_path,
        results,
    })
}

#[tauri::command]
pub fn open_folder_cmd(path: String) -> Result<(), String> {
    if path.is_empty() {
        return Err("Path is empty".to_string());
    }
    eprintln!("[open_folder_cmd] opening: {}", path);
    #[cfg(target_os = "windows")]
    {
        if path.starts_with("http://") || path.starts_with("https://") {
            std::process::Command::new("cmd")
                .args(["/c", "start", "", &path])
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            // Normalize to backslashes - Windows Explorer requires them
            let win_path = path.replace('/', "\\");
            std::process::Command::new("powershell")
                .args([
                    "-NoProfile",
                    "-NonInteractive",
                    "-Command",
                    &format!("explorer '{}'", win_path),
                ])
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_downloads_folder() -> String {
    directories::UserDirs::new()
        .and_then(|d| d.download_dir().map(|p| p.to_string_lossy().to_string()))
        .unwrap_or_else(|| {
            if cfg!(target_os = "windows") {
                "C:/Users".to_string()
            } else {
                std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string())
            }
        })
}

#[tauri::command]
pub fn initialize_defaults_cmd() -> Result<(), String> {
    let downloads = get_downloads_folder();
    add_watched_folder(&downloads, FOLDER_MODE_SILENT).map_err(|e| e.to_string())?;
    insert_default_rules(&downloads).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn close_popup(app: AppHandle) {
    if let Some(window) = app.get_webview_window("popup") {
        let _ = window.hide();
    }
}

#[tauri::command]
pub fn close_settings(app: AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.close();
    }
}

#[tauri::command]
pub fn show_notification(app: AppHandle, title: String, body: String) {
    let _ = app.notification().builder().title(title).body(body).show();
}

#[tauri::command]
pub fn enable_autostart_cmd(app: AppHandle) -> Result<(), String> {
    app.autolaunch().enable().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn disable_autostart_cmd(app: AppHandle) -> Result<(), String> {
    app.autolaunch().disable().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn is_autostart_enabled_cmd(app: AppHandle) -> Result<bool, String> {
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_mouziignore_cmd(folder_path: String) -> Result<Vec<String>, String> {
    Ok(load_mouziignore(&folder_path))
}

#[tauri::command]
pub fn save_mouziignore_cmd(folder_path: String, patterns: Vec<String>) -> Result<(), String> {
    save_mouziignore(&folder_path, &patterns)
}

/// Returns and clears the pending folder path that should be opened after a notification click.
/// The frontend calls this when the popup is shown/focused to handle the in-app flow as a backup.
#[tauri::command]
pub fn get_pending_open_folder_cmd(state: tauri::State<AppState>) -> Option<String> {
    state.pending_open_folder.lock().unwrap().take()
}

#[tauri::command]
pub fn show_popup_cmd(app: AppHandle) {
    crate::tray::show_popup_window(&app);
}

/// Return files detected in manual-mode folders that are waiting for Organize Now.
#[tauri::command]
pub fn get_pending_files_cmd(
    state: tauri::State<AppState>,
) -> Result<Vec<(String, String)>, String> {
    let watcher = state.watcher.lock().unwrap();
    Ok(watcher.get_pending_files())
}

/// Refresh all folder watchers. Useful after changing folder modes.
#[tauri::command]
pub fn refresh_watcher_cmd(app: AppHandle) -> Result<(), String> {
    if let Some(state) = app.try_state::<crate::AppState>() {
        let mut watcher = state.watcher.lock().unwrap();
        watcher.refresh(app.clone()).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Get the current scheduled-clean settings.
#[tauri::command]
pub fn get_schedule_cmd() -> Result<ScheduleSettings, String> {
    let settings = get_settings().map_err(|e| e.to_string())?;
    Ok(ScheduleSettings {
        schedule_enabled: settings.schedule_enabled,
        schedule_times_per_day: settings.schedule_times_per_day,
        schedule_time_1: settings.schedule_time_1,
        schedule_time_2: settings.schedule_time_2,
        schedule_time_3: settings.schedule_time_3,
        schedule_time_4: settings.schedule_time_4,
    })
}

/// Update scheduled-clean settings.
#[tauri::command]
pub fn update_schedule_cmd(schedule: ScheduleSettings) -> Result<(), String> {
    let mut settings = get_settings().map_err(|e| e.to_string())?;
    settings.schedule_enabled = schedule.schedule_enabled;
    settings.schedule_times_per_day = schedule.schedule_times_per_day.clamp(1, 4);
    settings.schedule_time_1 = schedule.schedule_time_1;
    settings.schedule_time_2 = schedule.schedule_time_2;
    settings.schedule_time_3 = schedule.schedule_time_3;
    settings.schedule_time_4 = schedule.schedule_time_4;
    update_settings(&settings).map_err(|e| e.to_string())
}

/// Export all rules to a JSON file at the given path.
#[tauri::command]
pub fn export_rules_cmd(path: String) -> Result<(), String> {
    let rules = get_rules().map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(&rules).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

/// Import rules from a JSON file at the given path.
/// If `replace` is true, all existing rules are removed before inserting.
/// Each imported rule is inserted with `id` set to None to avoid collisions.
#[tauri::command]
pub fn import_rules_cmd(path: String, replace: bool) -> Result<usize, String> {
    let data = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let rules: Vec<Rule> = serde_json::from_str(&data).map_err(|e| e.to_string())?;

    if replace {
        delete_all_rules().map_err(|e| e.to_string())?;
    }

    let mut count = 0;
    for mut rule in rules {
        rule.id = None;
        add_rule(&rule).map_err(|e| e.to_string())?;
        count += 1;
    }
    Ok(count)
}
