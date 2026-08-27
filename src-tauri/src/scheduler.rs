use crate::db::{get_settings, get_watched_folders, is_folder_manual_mode, is_folder_paused_mode};
use crate::rules::manual_scan_folder;
use chrono::{Duration, Local, NaiveDate, NaiveTime};
use serde_json::json;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration as StdDuration;
use tauri::{AppHandle, Emitter};

const CHECK_INTERVAL_SECONDS: u64 = 60;

/// Background scheduler for organizing files at configured local times.
pub struct Scheduler {
    /// Last run date (local) for each schedule slot, to avoid double-triggering.
    last_run_dates: Arc<Mutex<HashMap<usize, NaiveDate>>>,
}

impl Scheduler {
    pub fn new() -> Self {
        Self {
            last_run_dates: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Spawn the scheduler thread. It wakes every 60 seconds and checks whether
    /// any configured schedule time has been reached in the last minute.
    pub fn start(&self, app_handle: AppHandle) {
        let last_run_dates = self.last_run_dates.clone();
        thread::spawn(move || loop {
            thread::sleep(StdDuration::from_secs(CHECK_INTERVAL_SECONDS));
            if let Err(e) = check_and_run(&app_handle, &last_run_dates) {
                eprintln!("[scheduler] error: {}", e);
            }
        });
    }
}

fn check_and_run(
    app_handle: &AppHandle,
    last_run_dates: &Arc<Mutex<HashMap<usize, NaiveDate>>>,
) -> Result<(), String> {
    let settings = get_settings().map_err(|e| e.to_string())?;
    if !settings.schedule_enabled {
        return Ok(());
    }

    let times_per_day = settings.schedule_times_per_day.clamp(1, 4) as usize;
    let schedule_times: Vec<Option<String>> = vec![
        settings.schedule_time_1,
        settings.schedule_time_2,
        settings.schedule_time_3,
        settings.schedule_time_4,
    ];

    let now = Local::now();
    let today = now.date_naive();

    for slot in 0..times_per_day {
        let Some(time_str) = schedule_times.get(slot).and_then(|t| t.as_ref()) else {
            continue;
        };
        let scheduled_time = parse_time(time_str)?;
        let scheduled_dt = today.and_time(scheduled_time);
        let scheduled_local = scheduled_dt
            .and_local_timezone(Local)
            .single()
            .ok_or_else(|| "Invalid local time".to_string())?;
        let diff = now.signed_duration_since(scheduled_local);

        if diff >= Duration::zero() && diff < Duration::minutes(1) {
            let already_run = {
                let guard = last_run_dates.lock().unwrap();
                guard.get(&slot).copied() == Some(today)
            };
            if !already_run {
                perform_scheduled_clean(app_handle)?;
                last_run_dates.lock().unwrap().insert(slot, today);
            }
        }
    }

    Ok(())
}

fn parse_time(time_str: &str) -> Result<NaiveTime, String> {
    NaiveTime::parse_from_str(time_str.trim(), "%H:%M")
        .or_else(|_| NaiveTime::parse_from_str(time_str.trim(), "%H:%M:%S"))
        .map_err(|e| format!("Invalid schedule time '{}': {}", time_str, e))
}

fn perform_scheduled_clean(app_handle: &AppHandle) -> Result<(), String> {
    println!("[scheduler] running scheduled organization");

    let folders = get_watched_folders().map_err(|e| e.to_string())?;
    let mut total = 0usize;
    for folder in folders {
        if !folder.enabled
            || is_folder_paused_mode(&folder.mode)
            || is_folder_manual_mode(&folder.mode)
        {
            continue;
        }
        if !std::path::Path::new(&folder.path).exists() {
            continue;
        }
        match manual_scan_folder(&folder.path) {
            Ok(results) => total += results.len(),
            Err(e) => eprintln!("[scheduler] failed to clean {}: {}", folder.path, e),
        }
    }

    println!("[scheduler] organized {} files", total);

    let _ = app_handle.emit(
        "scheduled-clean-done",
        json!({
            "organized": total,
        }),
    );

    Ok(())
}
