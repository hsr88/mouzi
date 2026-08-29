use crate::db::{get_watched_folders, is_folder_manual_mode, is_folder_paused_mode};
use crate::i18n::TrayI18n;
use crate::rules::{is_file_ignored_by_mouziignore, process_file, should_ignore_file};
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::Emitter;
#[cfg(not(target_os = "windows"))]
use tauri_plugin_notification::NotificationExt;

const IGNORE_DURATION_SECS: u64 = 5;

fn render_notification_message(
    template: &str,
    file: &str,
    rule: &str,
    destination: &str,
) -> String {
    template
        .replace("{file}", file)
        .replace("{rule}", rule)
        .replace("{destination}", destination)
}

#[derive(Debug, Clone)]
struct PendingFile {
    path: PathBuf,
    scheduled: Instant,
}

pub struct FolderWatcher {
    watchers: HashMap<String, RecommendedWatcher>,
    pending: Arc<Mutex<Vec<PendingFile>>>,
    /// Files detected in manual-mode folders, waiting for the user to trigger Organize Now.
    pending_manual: Arc<Mutex<HashSet<String>>>,
    ignored_files: Arc<Mutex<HashMap<String, Instant>>>,
    /// Shared with AppState — stores the last destination folder to open on notification click
    pending_open_folder: Arc<Mutex<Option<String>>>,
    handle: Option<std::thread::JoinHandle<()>>,
    app_handle: Option<tauri::AppHandle>,
}

impl FolderWatcher {
    pub fn new(
        ignored_files: Arc<Mutex<HashMap<String, Instant>>>,
        pending_open_folder: Arc<Mutex<Option<String>>>,
    ) -> Self {
        Self {
            watchers: HashMap::new(),
            pending: Arc::new(Mutex::new(Vec::new())),
            pending_manual: Arc::new(Mutex::new(HashSet::new())),
            ignored_files,
            pending_open_folder,
            handle: None,
            app_handle: None,
        }
    }

    pub fn start(&mut self, app_handle: tauri::AppHandle) {
        let pending = self.pending.clone();
        let handle = app_handle.clone();
        let pending_open_folder = self.pending_open_folder.clone();

        // Spawn a thread that processes pending files after a delay
        let handle_thread = std::thread::spawn(move || {
            loop {
                std::thread::sleep(Duration::from_millis(500));
                let now = Instant::now();
                let to_process: Vec<PathBuf> = {
                    let mut guard = pending.lock().unwrap();
                    let ready: Vec<_> = guard
                        .iter()
                        .filter(|p| now >= p.scheduled)
                        .cloned()
                        .collect();
                    guard.retain(|p| now < p.scheduled);
                    ready.into_iter().map(|p| p.path).collect()
                };

                let mut organized_count = 0;
                let mut last_file_name = String::new();
                let mut last_rule_name = String::new();
                let mut last_dest_folder = String::new();
                let mut last_notification_message: Option<String> = None;

                for path in to_process {
                    if path.exists() && path.is_file() {
                        // Defensive check: if the folder has been switched to manual or paused
                        // since the file was queued, skip it instead of auto-organizing.
                        let should_skip = path
                            .parent()
                            .and_then(|parent| {
                                let parent_str = parent.to_string_lossy().to_string();
                                get_watched_folders()
                                    .ok()?
                                    .into_iter()
                                    .find(|f| f.path == parent_str)
                            })
                            .map(|f| {
                                !f.enabled
                                    || is_folder_paused_mode(&f.mode)
                                    || is_folder_manual_mode(&f.mode)
                            })
                            .unwrap_or(false);
                        if should_skip {
                            continue;
                        }
                        // Files in the pending queue have already waited for the grace period,
                        // so we bypass the grace check here to avoid files being skipped forever
                        // if their modification time changes while queued.
                        match process_file(&path, true) {
                            Ok(Some((rule, dest))) => {
                                let file_name = path
                                    .file_name()
                                    .unwrap_or_default()
                                    .to_string_lossy()
                                    .to_string();
                                let destination = dest.clone().unwrap_or_default();
                                let destination_label = if rule.action == "delete" {
                                    "Recycle Bin".to_string()
                                } else {
                                    destination.clone()
                                };
                                let dest_folder = dest
                                    .as_deref()
                                    .and_then(|value| std::path::Path::new(value).parent())
                                    .map(|p| p.to_string_lossy().to_string())
                                    .unwrap_or_else(|| {
                                        path.parent()
                                            .map(|p| p.to_string_lossy().to_string())
                                            .unwrap_or_default()
                                    });

                                last_file_name = file_name.clone();
                                last_rule_name = rule.name.clone();
                                last_dest_folder = dest_folder.clone();
                                last_notification_message = rule
                                    .notification_message
                                    .as_deref()
                                    .filter(|message| !message.trim().is_empty())
                                    .map(|message| {
                                        render_notification_message(
                                            message,
                                            &file_name,
                                            &rule.name,
                                            &destination_label,
                                        )
                                    });
                                organized_count += 1;

                                // Emit event to frontend (in-app toast)
                                let _ = handle.emit(
                                    "file-organized",
                                    serde_json::json!({
                                        "file": file_name,
                                        "rule": rule.name,
                                        "destination": destination,
                                        "destination_folder": dest_folder,
                                        "message": last_notification_message.clone(),
                                        "action": rule.action,
                                        "success": true
                                    }),
                                );
                            }
                            Ok(None) => {}
                            Err(e) => {
                                let _ = handle.emit(
                                    "file-organized",
                                    serde_json::json!({
                                        "file": path.to_string_lossy(),
                                        "error": e,
                                        "success": false
                                    }),
                                );
                            }
                        }
                    }
                }

                // Show a single notification for this batch
                if organized_count > 0 {
                    // Store the destination folder so single-instance handler can open it
                    // when the user clicks the notification (Windows activates the app)
                    *pending_open_folder.lock().unwrap() = Some(last_dest_folder.clone());

                    let lang = crate::db::get_settings()
                        .map(|settings| settings.language)
                        .unwrap_or_else(|_| "en".to_string());
                    let i18n = TrayI18n::new(&lang);
                    let notification_title = i18n.get("notification_title").to_string();
                    let body = if organized_count == 1 {
                        last_notification_message
                            .clone()
                            .unwrap_or_else(|| format!("{} → {}", last_file_name, last_rule_name))
                    } else {
                        i18n.get("organized").replace("{}", &organized_count.to_string())
                    };

                    #[cfg(target_os = "windows")]
                    {
                        let dest_folder_clone = last_dest_folder.clone();
                        let body_clone = body.clone();
                        let title_clone = notification_title.clone();
                        let _ = std::thread::spawn(move || {
                            let _ = tauri_winrt_notification::Toast::new("cc.mouzi.app")
                                .title(&title_clone)
                                .text1(&body_clone)
                                .on_activated(move |_action| {
                                    // Open the folder in Explorer robustly
                                    let _ = std::process::Command::new("cmd")
                                        .args(["/c", "start", "", &dest_folder_clone])
                                        .spawn();
                                    Ok(())
                                })
                                .show();
                        });
                    }

                    #[cfg(not(target_os = "windows"))]
                    {
                        let _ = handle
                            .notification()
                            .builder()
                            .title(notification_title)
                            .body(body)
                            .extra("destFolder", last_dest_folder)
                            .show();
                    }
                }
            }
        });

        self.handle = Some(handle_thread);
    }

    pub fn watch_folders(&mut self, app_handle: tauri::AppHandle) -> Result<(), String> {
        self.app_handle = Some(app_handle.clone());
        let folders = get_watched_folders().map_err(|e| e.to_string())?;
        let pending = self.pending.clone();
        let pending_manual = self.pending_manual.clone();
        let ignored = self.ignored_files.clone();
        let handle = app_handle.clone();

        for folder in folders {
            if !folder.enabled {
                continue;
            }
            if is_folder_paused_mode(&folder.mode) {
                // Paused folders are kept in the DB but not watched.
                continue;
            }
            if !Path::new(&folder.path).exists() {
                eprintln!("[watcher] Skipping missing folder: {}", folder.path);
                continue;
            }

            let is_manual = is_folder_manual_mode(&folder.mode);
            let folder_path = folder.path.clone();
            let p = pending.clone();
            let pm = pending_manual.clone();
            let ig = ignored.clone();
            let h = handle.clone();

            // Initial scan: process files that already exist in the folder.
            // This ensures files present before the folder was added are not ignored forever.
            if let Ok(entries) = std::fs::read_dir(&folder.path) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file()
                        && !should_ignore_file(&path)
                        && !is_file_ignored_by_mouziignore(&path)
                    {
                        let path_str = path.to_string_lossy().to_string();
                        let mut ignore_guard = ig.lock().unwrap();
                        if let Some(&instant) = ignore_guard.get(&path_str) {
                            if Instant::now().duration_since(instant)
                                < Duration::from_secs(IGNORE_DURATION_SECS)
                            {
                                continue;
                            }
                            ignore_guard.remove(&path_str);
                        }
                        drop(ignore_guard);

                        if is_manual {
                            let file_name = path
                                .file_name()
                                .unwrap_or_default()
                                .to_string_lossy()
                                .to_string();
                            let mut manual = pm.lock().unwrap();
                            manual.insert(path_str.clone());
                            let count = manual.len();
                            drop(manual);
                            let _ = h.emit(
                                "file-detected",
                                serde_json::json!({
                                    "folder": folder_path,
                                    "file": file_name,
                                }),
                            );
                            crate::tray::update_tray_tooltip(&h, count);
                        } else {
                            let grace = crate::db::get_settings()
                                .map(|s| s.grace_period_seconds as u64)
                                .unwrap_or(300);
                            let mut guard = p.lock().unwrap();
                            guard.retain(|x| x.path != path);
                            guard.push(PendingFile {
                                path,
                                scheduled: Instant::now() + Duration::from_secs(grace),
                            });
                        }
                    }
                }
            }

            let p = pending.clone();
            let pm = pending_manual.clone();
            let ig = ignored.clone();
            let h = handle.clone();

            let mut watcher = RecommendedWatcher::new(
                move |res: Result<Event, notify::Error>| {
                    if let Ok(event) = res {
                        for path in event.paths {
                            if path.is_file()
                                && !should_ignore_file(&path)
                                && !is_file_ignored_by_mouziignore(&path)
                            {
                                let path_str = path.to_string_lossy().to_string();
                                let mut ignore_guard = ig.lock().unwrap();
                                if let Some(&instant) = ignore_guard.get(&path_str) {
                                    if Instant::now().duration_since(instant)
                                        < Duration::from_secs(IGNORE_DURATION_SECS)
                                    {
                                        continue;
                                    }
                                    ignore_guard.remove(&path_str);
                                }
                                drop(ignore_guard);

                                if is_manual {
                                    // Manual mode: collect for later, do not auto-organize.
                                    let file_name = path
                                        .file_name()
                                        .unwrap_or_default()
                                        .to_string_lossy()
                                        .to_string();
                                    let mut manual = pm.lock().unwrap();
                                    manual.insert(path_str.clone());
                                    let count = manual.len();
                                    drop(manual);

                                    let _ = h.emit(
                                        "file-detected",
                                        serde_json::json!({
                                            "folder": folder_path,
                                            "file": file_name,
                                        }),
                                    );
                                    crate::tray::update_tray_tooltip(&h, count);
                                } else {
                                    // Silent mode: schedule for auto-organize after grace period.
                                    let grace = crate::db::get_settings()
                                        .map(|s| s.grace_period_seconds as u64)
                                        .unwrap_or(300);
                                    let mut guard = p.lock().unwrap();
                                    // Remove existing pending entry for this path to reschedule
                                    guard.retain(|x| x.path != path);
                                    guard.push(PendingFile {
                                        path,
                                        scheduled: Instant::now() + Duration::from_secs(grace),
                                    });
                                }
                            }
                        }
                    }
                },
                Config::default()
                    .with_poll_interval(Duration::from_secs(2))
                    .with_compare_contents(true),
            )
            .map_err(|e| e.to_string())?;

            watcher
                .watch(Path::new(&folder.path), RecursiveMode::NonRecursive)
                .map_err(|e| e.to_string())?;

            self.watchers.insert(folder.path.clone(), watcher);
        }

        // Only start the processing thread once. refresh() reuses the same thread.
        if self.handle.is_none() {
            self.start(app_handle);
        }
        Ok(())
    }

    pub fn refresh(&mut self, app_handle: tauri::AppHandle) -> Result<(), String> {
        self.watchers.clear();
        self.watch_folders(app_handle)
    }

    pub fn set_ignored_files(&mut self, ignored_files: Arc<Mutex<HashMap<String, Instant>>>) {
        self.ignored_files = ignored_files;
    }

    fn update_tray_tooltip(&self) {
        if let Some(app) = &self.app_handle {
            let count = self.pending_manual.lock().unwrap().len();
            crate::tray::update_tray_tooltip(app, count);
        }
    }

    /// Return the list of files detected in manual-mode folders that have not yet
    /// been organized. Non-existent files are pruned automatically.
    pub fn get_pending_files(&self) -> Vec<(String, String)> {
        let mut manual = self.pending_manual.lock().unwrap();
        manual.retain(|p| Path::new(p).exists());
        let result: Vec<(String, String)> = manual
            .iter()
            .filter_map(|path| {
                let p = Path::new(path);
                let folder = p.parent()?.to_string_lossy().to_string();
                let name = p.file_name()?.to_string_lossy().to_string();
                Some((folder, name))
            })
            .collect();
        drop(manual);
        self.update_tray_tooltip();
        result
    }

    /// Move any manually-collected files for the given folder into the auto-organize
    /// queue. Called when a folder is switched from manual back to silent.
    pub fn flush_manual_to_pending(&mut self, folder_path: &str) {
        let mut manual = self.pending_manual.lock().unwrap();
        let to_move: Vec<String> = manual
            .iter()
            .filter(|p| {
                Path::new(p)
                    .parent()
                    .map(|parent| parent.to_string_lossy() == folder_path)
                    .unwrap_or(false)
            })
            .cloned()
            .collect();
        for p in &to_move {
            manual.remove(p);
        }
        drop(manual);
        self.update_tray_tooltip();

        let grace = crate::db::get_settings()
            .map(|s| s.grace_period_seconds as u64)
            .unwrap_or(300);
        let mut pending = self.pending.lock().unwrap();
        for path_str in to_move {
            let path = PathBuf::from(path_str);
            pending.retain(|x| x.path != path);
            pending.push(PendingFile {
                path,
                scheduled: Instant::now() + Duration::from_secs(grace),
            });
        }
    }
}
