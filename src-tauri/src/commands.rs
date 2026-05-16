use crate::db::*;
use crate::ignore::{load_mouziignore, save_mouziignore};
use crate::rules::manual_scan_folder;
use crate::AppState;
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
pub fn update_folder_mode_cmd(id: i64, mode: String) -> Result<(), String> {
    update_folder_mode(id, &mode).map_err(|e| e.to_string())
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
            "SELECT source_path, destination_path FROM action_logs WHERE id=?1 AND undone=0",
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
    manual_scan_folder(&path)
}

#[tauri::command]
pub fn open_folder_cmd(path: String) -> Result<(), String> {
    let _ = std::process::Command::new("explorer")
        .arg(path)
        .spawn();
    Ok(())
}

#[tauri::command]
pub fn get_downloads_folder() -> String {
    directories::UserDirs::new()
        .and_then(|d| d.download_dir().map(|p| p.to_string_lossy().to_string()))
        .unwrap_or_else(|| "C:/Users".to_string())
}

#[tauri::command]
pub fn initialize_defaults_cmd() -> Result<(), String> {
    let downloads = get_downloads_folder();
    add_watched_folder(&downloads, "silent").map_err(|e| e.to_string())?;
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
    let _ = app.notification()
        .builder()
        .title(title)
        .body(body)
        .show();
}

#[tauri::command]
pub fn enable_autostart_cmd(app: AppHandle) -> Result<(), String> {
    app.autolaunch()
        .enable()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn disable_autostart_cmd(app: AppHandle) -> Result<(), String> {
    app.autolaunch()
        .disable()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn is_autostart_enabled_cmd(app: AppHandle) -> Result<bool, String> {
    app.autolaunch()
        .is_enabled()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_mouziignore_cmd(folder_path: String) -> Result<Vec<String>, String> {
    Ok(load_mouziignore(&folder_path))
}

#[tauri::command]
pub fn save_mouziignore_cmd(folder_path: String, patterns: Vec<String>) -> Result<(), String> {
    save_mouziignore(&folder_path, &patterns)
}
