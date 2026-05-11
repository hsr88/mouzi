pub mod commands;
pub mod db;
pub mod rules;
pub mod tray;
pub mod watcher;

use commands::*;
use db::init_db;
use directories::ProjectDirs;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::Manager;
use tauri_plugin_autostart::ManagerExt;
use watcher::FolderWatcher;

pub struct AppState {
    pub watcher: Arc<Mutex<FolderWatcher>>,
    pub ignored_files: Arc<Mutex<HashMap<String, Instant>>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ignored_files = Arc::new(Mutex::new(HashMap::new()));
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ))
        .manage(AppState {
            watcher: Arc::new(Mutex::new(FolderWatcher::new(ignored_files.clone()))),
            ignored_files,
        })
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Initialize database
            if let Some(proj_dirs) = ProjectDirs::from("cc", "mouzi", "mouzi") {
                let data_dir = proj_dirs.data_dir().to_path_buf();
                std::fs::create_dir_all(&data_dir).ok();
                init_db(data_dir.clone()).expect("Failed to initialize database");
            }

            // Initialize default rules on first run
            if let Ok(settings) = db::get_settings() {
                if settings.first_run {
                    let downloads = commands::get_downloads_folder();
                    let _ = db::add_watched_folder(&downloads, "silent");
                    let _ = db::insert_default_rules(&downloads);
                    let mut new_settings = settings;
                    new_settings.first_run = false;
                    let _ = db::update_settings(&new_settings);
                }
            }

            // Setup system tray
            tray::setup_tray(&app_handle)?;

            // Sync autostart with user settings
            if let Ok(settings) = db::get_settings() {
                let auto_manager = app.autolaunch();
                if settings.autostart {
                    let _ = auto_manager.enable();
                } else {
                    let _ = auto_manager.disable();
                }
            }

            // Start folder watcher
            let state = app.state::<AppState>();
            let mut watcher = state.watcher.lock().unwrap();
            let _ = watcher.watch_folders(app_handle.clone());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_system_language,
            get_rules_cmd,
            add_rule_cmd,
            update_rule_cmd,
            delete_rule_cmd,
            get_folders_cmd,
            add_folder_cmd,
            remove_folder_cmd,
            update_folder_mode_cmd,
            get_logs_cmd,
            get_stats_cmd,
            undo_action_cmd,
            undo_all_cmd,
            get_settings_cmd,
            update_settings_cmd,
            enable_autostart_cmd,
            disable_autostart_cmd,
            is_autostart_enabled_cmd,
            clear_logs_cmd,
            scan_folder_cmd,
            open_folder_cmd,
            get_downloads_folder,
            initialize_defaults_cmd,
            close_popup,
            close_settings,
            show_notification
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
