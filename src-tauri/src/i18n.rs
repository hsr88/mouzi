use std::collections::HashMap;

pub struct TrayI18n {
    strings: HashMap<&'static str, &'static str>,
}

impl TrayI18n {
    pub fn new(lang: &str) -> Self {
        let mut strings = HashMap::new();
        match lang {
            "pl" => {
                strings.insert("quit", "Zamknij");
                strings.insert("settings", "Ustawienia");
                strings.insert("clean_now", "Uporządkuj teraz");
                strings.insert("tooltip", "Mouzi");
                strings.insert("tooltip_one_pending", "Mouzi – {} plik czeka");
                strings.insert("tooltip_many_pending", "Mouzi – {} pliki czekają");
                strings.insert("popup_title", "Mouzi");
                strings.insert("settings_title", "Ustawienia Mouzi");
                strings.insert("organized", "Uporządkowano {} plik(i)");
            }
            "it" => {
                strings.insert("quit", "Esci");
                strings.insert("settings", "Impostazioni");
                strings.insert("clean_now", "Organizza ora");
                strings.insert("tooltip", "Mouzi");
                strings.insert("tooltip_one_pending", "Mouzi – {} file in attesa");
                strings.insert("tooltip_many_pending", "Mouzi – {} file in attesa");
                strings.insert("popup_title", "Mouzi");
                strings.insert("settings_title", "Impostazioni Mouzi");
                strings.insert("organized", "Organizzati {} file");
            }
            "de" => {
                strings.insert("quit", "Beenden");
                strings.insert("settings", "Einstellungen");
                strings.insert("clean_now", "Jetzt organisieren");
                strings.insert("tooltip", "Mouzi");
                strings.insert("tooltip_one_pending", "Mouzi – {} Datei wartend");
                strings.insert("tooltip_many_pending", "Mouzi – {} Dateien wartend");
                strings.insert("popup_title", "Mouzi");
                strings.insert("settings_title", "Mouzi Einstellungen");
                strings.insert("organized", "{} Datei(en) organisiert");
            }
            "fr" => {
                strings.insert("quit", "Quitter");
                strings.insert("settings", "Paramètres");
                strings.insert("clean_now", "Organiser maintenant");
                strings.insert("tooltip", "Mouzi");
                strings.insert("tooltip_one_pending", "Mouzi – {} fichier en attente");
                strings.insert("tooltip_many_pending", "Mouzi – {} fichiers en attente");
                strings.insert("popup_title", "Mouzi");
                strings.insert("settings_title", "Paramètres Mouzi");
                strings.insert("organized", "{} fichier(s) organisé(s)");
            }
            "ru" => {
                strings.insert("quit", "Выход");
                strings.insert("settings", "Настройки");
                strings.insert("clean_now", "Организовать сейчас");
                strings.insert("tooltip", "Mouzi");
                strings.insert("tooltip_one_pending", "Mouzi – {} файл ожидает");
                strings.insert("tooltip_many_pending", "Mouzi – {} файла ожидают");
                strings.insert("popup_title", "Mouzi");
                strings.insert("settings_title", "Настройки Mouzi");
                strings.insert("organized", "Организовано {} файл(ов)");
            }
            "ja" => {
                strings.insert("quit", "終了");
                strings.insert("settings", "設定");
                strings.insert("clean_now", "今すぐ整理");
                strings.insert("tooltip", "Mouzi");
                strings.insert("tooltip_one_pending", "Mouzi – {} 個のファイルが待機中");
                strings.insert("tooltip_many_pending", "Mouzi – {} 個のファイルが待機中");
                strings.insert("popup_title", "Mouzi");
                strings.insert("settings_title", "Mouziの設定");
                strings.insert("organized", "{}個のファイルを整理しました");
            }
            "vi" => {
                strings.insert("quit", "Thoát");
                strings.insert("settings", "Cài đặt");
                strings.insert("clean_now", "Sắp xếp ngay");
                strings.insert("tooltip", "Mouzi");
                strings.insert("tooltip_one_pending", "Mouzi – {} tệp đang chờ");
                strings.insert("tooltip_many_pending", "Mouzi – {} tệp đang chờ");
                strings.insert("popup_title", "Mouzi");
                strings.insert("settings_title", "Cài đặt Mouzi");
                strings.insert("organized", "Đã sắp xếp {} tệp");
            }
            "es" => {
                strings.insert("quit", "Salir");
                strings.insert("settings", "Configuración");
                strings.insert("clean_now", "Organizar ahora");
                strings.insert("tooltip", "Mouzi");
                strings.insert("tooltip_one_pending", "Mouzi – {} archivo esperando");
                strings.insert("tooltip_many_pending", "Mouzi – {} archivos esperando");
                strings.insert("popup_title", "Mouzi");
                strings.insert("settings_title", "Configuración de Mouzi");
                strings.insert("organized", "{} archivo(s) organizado(s)");
            }
            "zh-CN" => {
                strings.insert("quit", "退出");
                strings.insert("settings", "设置");
                strings.insert("clean_now", "立即整理");
                strings.insert("tooltip", "Mouzi");
                strings.insert("tooltip_one_pending", "Mouzi – {} 个文件等待整理");
                strings.insert("tooltip_many_pending", "Mouzi – {} 个文件等待整理");
                strings.insert("popup_title", "Mouzi");
                strings.insert("settings_title", "Mouzi 设置");
                strings.insert("organized", "已整理 {} 个文件");
                strings.insert("notification_title", "Mouzi – 点击打开文件夹");
            }
            "uk" => {
                strings.insert("quit", "Вийти");
                strings.insert("settings", "Налаштування");
                strings.insert("clean_now", "Упорядкувати зараз");
                strings.insert("tooltip", "Mouzi");
                strings.insert("tooltip_one_pending", "Mouzi — очікує {} файл");
                strings.insert("tooltip_many_pending", "Mouzi — очікує файлів: {}");
                strings.insert("popup_title", "Mouzi");
                strings.insert("settings_title", "Налаштування Mouzi");
                strings.insert("organized", "Впорядковано файлів: {}");
            }
            _ => {
                strings.insert("quit", "Quit");
                strings.insert("settings", "Settings");
                strings.insert("clean_now", "Organize Now");
                strings.insert("tooltip", "Mouzi");
                strings.insert("tooltip_one_pending", "Mouzi – {} file waiting");
                strings.insert("tooltip_many_pending", "Mouzi – {} files waiting");
                strings.insert("popup_title", "Mouzi");
                strings.insert("settings_title", "Mouzi Settings");
                strings.insert("organized", "Organized {} file(s)");
            }
        }
        Self { strings }
    }

    pub fn get<'a>(&self, key: &'a str) -> &'a str {
        self.strings.get(key).copied().unwrap_or_else(|| match key {
            "notification_title" => "Mouzi – click to open folder",
            _ => key,
        })
    }
}
