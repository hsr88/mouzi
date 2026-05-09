use crate::db::get_watched_folders;
use crate::rules::process_file;
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::Emitter;
use tauri_plugin_notification::NotificationExt;

#[derive(Debug, Clone)]
struct PendingFile {
    path: std::path::PathBuf,
    scheduled: Instant,
}

pub struct FolderWatcher {
    watchers: HashMap<String, RecommendedWatcher>,
    pending: Arc<Mutex<Vec<PendingFile>>>,
    handle: Option<std::thread::JoinHandle<()>>,
}

impl FolderWatcher {
    pub fn new() -> Self {
        Self {
            watchers: HashMap::new(),
            pending: Arc::new(Mutex::new(Vec::new())),
            handle: None,
        }
    }

    pub fn start(&mut self, app_handle: tauri::AppHandle) {
        let pending = self.pending.clone();
        let handle = app_handle.clone();

        // Spawn a thread that processes pending files after a delay
        let handle_thread = std::thread::spawn(move || {
            loop {
                std::thread::sleep(Duration::from_millis(500));
                let now = Instant::now();
                let to_process: Vec<std::path::PathBuf> = {
                    let mut guard = pending.lock().unwrap();
                    let ready: Vec<_> = guard
                        .iter()
                        .filter(|p| now.duration_since(p.scheduled) >= Duration::from_secs(2))
                        .cloned()
                        .collect();
                    guard.retain(|p| now.duration_since(p.scheduled) < Duration::from_secs(2));
                    ready.into_iter().map(|p| p.path).collect()
                };

                let mut organized_count = 0;
                let mut last_file_name = String::new();
                let mut last_rule_name = String::new();

                for path in to_process {
                    if path.exists() && path.is_file() {
                        match process_file(&path) {
                            Ok(Some((rule, dest))) => {
                                let file_name = path.file_name()
                                    .unwrap_or_default()
                                    .to_string_lossy()
                                    .to_string();
                                last_file_name = file_name.clone();
                                last_rule_name = rule.name.clone();
                                organized_count += 1;
                                let _ = handle.emit("file-organized", serde_json::json!({
                                    "file": file_name,
                                    "rule": rule.name,
                                    "destination": dest,
                                    "success": true
                                }));
                            }
                            Ok(None) => {}
                            Err(e) => {
                                let _ = handle.emit("file-organized", serde_json::json!({
                                    "file": path.to_string_lossy(),
                                    "error": e,
                                    "success": false
                                }));
                            }
                        }
                    }
                }

                if organized_count > 0 {
                    let body = if organized_count == 1 {
                        format!("{} → {}", last_file_name, last_rule_name)
                    } else {
                        format!("Organized {} files", organized_count)
                    };
                    let _ = handle
                        .notification()
                        .builder()
                        .title("Mouzi")
                        .body(body)
                        .show();
                }
            }
        });

        self.handle = Some(handle_thread);
    }

    pub fn watch_folders(&mut self, app_handle: tauri::AppHandle) -> Result<(), String> {
        let folders = get_watched_folders().map_err(|e| e.to_string())?;
        let pending = self.pending.clone();

        for folder in folders {
            if !folder.enabled {
                continue;
            }
            let path = folder.path.clone();
            let p = pending.clone();

            let mut watcher = RecommendedWatcher::new(
                move |res: Result<Event, notify::Error>| {
                    if let Ok(event) = res {
                        for path in event.paths {
                            if path.is_file() {
                                let mut guard = p.lock().unwrap();
                                // Remove existing pending entry for this path to reschedule
                                guard.retain(|x| x.path != path);
                                guard.push(PendingFile {
                                    path,
                                    scheduled: Instant::now(),
                                });
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

            self.watchers.insert(folder.path, watcher);
        }

        self.start(app_handle);
        Ok(())
    }

    pub fn refresh(&mut self, app_handle: tauri::AppHandle) -> Result<(), String> {
        self.watchers.clear();
        self.watch_folders(app_handle)
    }
}
