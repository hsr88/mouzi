import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore, Rule } from "../store/useAppStore";
import { invoke } from "@tauri-apps/api/core";
import {
  Folder,
  List,
  History,
  Globe,
  Plus,
  Trash2,
  Save,
  X,
  Check,
  ChevronLeft,
} from "lucide-react";


type Tab = "folders" | "rules" | "history" | "general";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const {
    rules,
    folders,
    logs,
    loadRules,
    loadFolders,
    loadLogs,
    addFolder,
    removeFolder,
    addRule,
    updateRule,
    deleteRule,
    clearLogs,
    undoAction,
    settings,
    saveSettings,
    setAutostart,
  } = useAppStore();

  const [tab, setTab] = useState<Tab>("folders");
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [newFolderPath, setNewFolderPath] = useState("");

  useEffect(() => {
    loadRules();
    loadFolders();
    loadLogs();
  }, [loadRules, loadFolders, loadLogs]);

  const handleAddFolder = async () => {
    if (!newFolderPath.trim()) return;
    await addFolder(newFolderPath.trim(), "silent");
    setNewFolderPath("");
  };

  const handleSaveRule = async () => {
    if (!editingRule) return;
    if (editingRule.id) {
      await updateRule(editingRule);
    } else {
      await addRule(editingRule);
    }
    setEditingRule(null);
  };

  const handleChangeLanguage = async (lang: string) => {
    if (!settings) return;
    await i18n.changeLanguage(lang);
    await saveSettings({ ...settings, language: lang });
  };

  return (
    <div className="flex h-full bg-surface text-text">
      {/* Sidebar */}
      <div className="w-56 border-r border-border bg-surface-dark flex flex-col">
        <div className="px-4 py-4 flex items-center gap-2">
          <button
            onClick={() => {
              window.location.hash = "#/popup";
              window.location.reload();
            }}
            className="p-1.5 rounded-md hover:bg-border transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-semibold text-sm">{t("settings.title")}</span>
        </div>
        <nav className="flex-1 px-2 space-y-0.5">
          <SidebarButton
            active={tab === "folders"}
            onClick={() => setTab("folders")}
            icon={<Folder size={16} />}
            label={t("settings.folders.title")}
          />
          <SidebarButton
            active={tab === "rules"}
            onClick={() => setTab("rules")}
            icon={<List size={16} />}
            label={t("settings.rules.title")}
          />
          <SidebarButton
            active={tab === "history"}
            onClick={() => setTab("history")}
            icon={<History size={16} />}
            label={t("settings.history.title")}
          />
          <SidebarButton
            active={tab === "general"}
            onClick={() => setTab("general")}
            icon={<Globe size={16} />}
            label={t("settings.general.title")}
          />
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {tab === "folders" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t("settings.folders.title")}</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFolderPath}
                onChange={(e) => setNewFolderPath(e.target.value)}
                placeholder="C:/Users/.../Downloads"
                className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={handleAddFolder}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                <Plus size={14} />
                {t("settings.folders.add")}
              </button>
            </div>
            <div className="space-y-2">
              {folders.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium">{f.path}</div>
                    <div className="text-xs text-text-muted capitalize">{f.mode}</div>
                  </div>
                  <button
                    onClick={() => f.id && removeFolder(f.id)}
                    className="p-1.5 rounded-md text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "rules" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("settings.rules.title")}</h2>
              <button
                onClick={() =>
                  setEditingRule({
                    name: "",
                    priority: 0,
                    enabled: true,
                    extensions: [],
                    pattern: null,
                    destination: "",
                    action: "move",
                    folder_id: 0,
                  })
                }
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                <Plus size={14} />
                {t("settings.rules.add")}
              </button>
            </div>

            {editingRule && (
              <div className="rounded-lg border border-border bg-surface-dark p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-text-muted">{t("settings.rules.name")}</label>
                    <input
                      value={editingRule.name}
                      onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                      className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-muted">{t("settings.rules.extensions")}</label>
                    <input
                      value={editingRule.extensions.join(", ")}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          extensions: e.target.value.split(",").map((s) => s.trim()),
                        })
                      }
                      className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-muted">{t("settings.rules.destination")}</label>
                    <input
                      value={editingRule.destination}
                      onChange={(e) => setEditingRule({ ...editingRule, destination: e.target.value })}
                      className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-muted">{t("settings.rules.priority")}</label>
                    <input
                      type="number"
                      value={editingRule.priority}
                      onChange={(e) =>
                        setEditingRule({ ...editingRule, priority: parseInt(e.target.value) || 0 })
                      }
                      className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={editingRule.enabled}
                      onChange={(e) => setEditingRule({ ...editingRule, enabled: e.target.checked })}
                    />
                    {t("settings.rules.enabled")}
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveRule}
                    className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
                  >
                    <Save size={14} />
                    {t("settings.rules.edit")}
                  </button>
                  <button
                    onClick={() => setEditingRule(null)}
                    className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface"
                  >
                    <X size={14} />
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {rules.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{r.name}</span>
                      {!r.enabled && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-border text-text-muted">
                          OFF
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {r.extensions.join(", ")} → {r.destination}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingRule({ ...r })}
                      className="p-1.5 rounded-md hover:bg-border text-text-muted"
                    >
                      <Save size={14} />
                    </button>
                    <button
                      onClick={() => r.id && deleteRule(r.id)}
                      className="p-1.5 rounded-md text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("settings.history.title")}</h2>
              <button
                onClick={clearLogs}
                className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 size={14} />
                {t("settings.history.clear")}
              </button>
            </div>
            {logs.length === 0 ? (
              <div className="text-center py-12 text-text-muted">{t("settings.history.empty")}</div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                      log.undone ? "border-border bg-surface-dark opacity-50" : "border-border"
                    }`}
                  >
                    <div>
                      <div className="text-sm">{log.file_name}</div>
                      <div className="text-xs text-text-muted">
                        {log.file_type} → {log.destination_path || "-"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {log.undone ? (
                        <span className="text-xs text-text-muted flex items-center gap-1">
                          <Check size={12} />
                          {t("settings.history.undone")}
                        </span>
                      ) : (
                        <button
                          onClick={() => log.id && undoAction(log.id)}
                          className="text-xs text-primary hover:underline"
                        >
                          {t("settings.history.undo")}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "general" && (
          <div className="space-y-6 max-w-md">
            <h2 className="text-lg font-semibold">{t("settings.general.title")}</h2>
            <div>
              <label className="text-sm font-medium text-text-muted block mb-2">
                {t("settings.general.language")}
              </label>
              <select
                value={settings?.language || "en"}
                onChange={(e) => handleChangeLanguage(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="en">English</option>
                <option value="pl">Polski</option>
                <option value="it">Italiano</option>
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted block mb-2">
                {t("settings.general.theme")}
              </label>
              <select
                value={settings?.theme || "system"}
                onChange={(e) =>
                  settings && saveSettings({ ...settings, theme: e.target.value })
                }
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div className="flex items-center justify-between pt-2">
              <label className="text-sm font-medium text-text-muted">
                {t("settings.general.startWithSystem")}
              </label>
              <button
                onClick={() => setAutostart(!settings?.autostart)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings?.autostart ? "bg-primary" : "bg-surface-dark"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings?.autostart ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <div className="space-y-3 pt-4 border-t border-border">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  invoke("open_folder_cmd", { path: "https://mouzi.cc" });
                }}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                🌐 mouzi.cc
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  invoke("open_folder_cmd", { path: "https://ko-fi.com/hsr" });
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#ff5e5b] px-4 py-2 text-sm font-medium text-white hover:bg-[#e05451] transition-colors"
              >
                ☕ Support Mouzi on Ko-fi
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SidebarButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-text-muted hover:bg-border hover:text-text"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
