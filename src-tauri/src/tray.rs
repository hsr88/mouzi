use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager};
use crate::db::{get_settings, get_watched_folders, is_folder_paused_mode};
use crate::i18n::TrayI18n;
use crate::rules::manual_scan_folder;

pub fn setup_tray(app: &AppHandle, lang: &str) -> Result<(), Box<dyn std::error::Error>> {
    let i18n = TrayI18n::new(lang);

    let quit_i = MenuItem::with_id(app, "quit", i18n.get("quit"), true, None::<&str>)?;
    let settings_i = MenuItem::with_id(app, "settings", i18n.get("settings"), true, None::<&str>)?;
    let clean_i = MenuItem::with_id(app, "clean", i18n.get("clean_now"), true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(app, &[&clean_i, &settings_i, &separator, &quit_i])?;

    let mut builder = TrayIconBuilder::with_id("tray")
        .tooltip(i18n.get("tooltip"))
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                app.exit(0);
            }
            "settings" => {
                show_settings_window(app);
            }
            "clean" => {
                let _ = perform_clean(app);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button, .. } = event {
                if button == MouseButton::Left {
                    show_popup_window(tray.app_handle());
                }
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    let _tray = builder.build(app)?;

    Ok(())
}

fn tray_lang(_app: &AppHandle) -> String {
    get_settings()
        .map(|s| s.language)
        .unwrap_or_else(|_| "en".to_string())
}

pub fn show_popup_window(app: &AppHandle) {
    let i18n = TrayI18n::new(&tray_lang(app));
    if let Some(window) = app.get_webview_window("popup") {
        let _ = window.show();
        let _ = window.set_focus();
    } else {
        #[cfg(target_os = "macos")]
        let window = tauri::WebviewWindowBuilder::new(
            app,
            "popup",
            tauri::WebviewUrl::App("/#/popup".into()),
        )
        .title(i18n.get("popup_title"))
        .inner_size(300.0, 420.0)
        .decorations(false)
        .always_on_top(true)
        .shadow(false)
        .build();

        #[cfg(not(target_os = "macos"))]
        let window = tauri::WebviewWindowBuilder::new(
            app,
            "popup",
            tauri::WebviewUrl::App("/#/popup".into()),
        )
        .title(i18n.get("popup_title"))
        .inner_size(300.0, 420.0)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .shadow(false)
        .build();

        if let Ok(win) = window {
            let _ = win.show();
            let _ = win.set_focus();
        }
    }
}

fn perform_clean(app: &AppHandle) -> Result<(), String> {
    let i18n = TrayI18n::new(&tray_lang(app));
    let folders = get_watched_folders().map_err(|e| e.to_string())?;
    let mut total = 0;
    for folder in folders {
        if !folder.enabled || is_folder_paused_mode(&folder.mode) { continue; }
        if let Ok(results) = manual_scan_folder(&folder.path) {
            total += results.len();
        }
    }
    if total > 0 {
        let msg = i18n.get("organized").replace("{}", &total.to_string());
        let _ = app.emit("show-notification", msg);
    }
    Ok(())
}

pub fn update_tray_tooltip(app: &AppHandle, count: usize) {
    let i18n = TrayI18n::new(&tray_lang(app));
    let tooltip = if count == 0 {
        i18n.get("tooltip").to_string()
    } else if count == 1 {
        i18n.get("tooltip_one_pending").replace("{}", "1")
    } else {
        i18n.get("tooltip_many_pending")
            .replace("{}", &count.to_string())
    };
    if let Some(tray) = app.tray_by_id("tray") {
        let _ = tray.set_tooltip(Some(&tooltip));
    }
}

pub fn show_settings_window(app: &AppHandle) {
    let i18n = TrayI18n::new(&tray_lang(app));
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.show();
        let _ = window.set_focus();
    } else {
        let window = tauri::WebviewWindowBuilder::new(
            app,
            "settings",
            tauri::WebviewUrl::App("/#/settings".into()),
        )
        .title(i18n.get("settings_title"))
        .inner_size(900.0, 650.0)
        .min_inner_size(700.0, 500.0)
        .build();

        if let Ok(win) = window {
            let _ = win.show();
            let _ = win.set_focus();
        }
    }
}
