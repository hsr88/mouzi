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
  RotateCcw,
  Download,
  ExternalLink,
  Heart,
} from "lucide-react";


type Tab = "folders" | "rules" | "history" | "ignore" | "general";

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
    undoAll,
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
              invoke("close_settings");
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
            active={tab === "ignore"}
            onClick={() => setTab("ignore")}
            icon={<X size={16} />}
            label="Ignore"
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
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => { await undoAll(); }}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-text hover:bg-surface-dark"
                >
                  <RotateCcw size={14} />
                  Revert All
                </button>
                <button
                  onClick={clearLogs}
                  className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  {t("settings.history.clear")}
                </button>
              </div>
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
            {/* Settings */}
            <div className="space-y-4">
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
              <div className="flex items-center justify-between">
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
            </div>

            <div className="border-t border-border" />

            {/* Logo + tagline */}
            <div className="flex items-center gap-3">
              <img
                src="/mouzilogo.png"
                alt="Mouzi"
                className="h-12 w-12 rounded-xl"
              />
              <div>
                <h2 className="text-xl font-semibold">Mouzi</h2>
                <p className="text-sm text-text-muted">Your downloads, tamed.</p>
              </div>
            </div>

            <p className="text-sm text-text-muted leading-relaxed">
              Mouzi is a silent, elegant file organizer that lives in your system
              tray and keeps your Downloads folder (and any other folder)
              automatically tidy. It runs quietly in the background, monitors
              selected folders, and moves, renames, or sorts files based on
              customizable rules.
            </p>

            {/* Check for Updates */}
            <button
              onClick={() =>
                invoke("open_folder_cmd", {
                  path: "https://mouzi.cc/#download",
                })
              }
              className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text hover:bg-surface-hover transition-colors"
            >
              <Download size={16} className="text-primary" />
              Check for Updates
              <ExternalLink size={14} className="ml-auto text-text-muted" />
            </button>

            {/* Author */}
            <div className="pt-2 border-t border-border">
              <button
                onClick={() =>
                  invoke("open_folder_cmd", { path: "https://github.com/hsr88" })
                }
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink size={16} />
                github.com/hsr88
              </button>
              <p className="text-xs text-text-muted mt-1">Built with care by hsr</p>
            </div>

            {/* Ko-fi - big & bold */}
            <div className="pt-4 border-t border-border text-center">
              <button
                onClick={() =>
                  invoke("open_folder_cmd", { path: "https://ko-fi.com/hsr" })
                }
                className="inline-flex items-center gap-2 rounded-xl bg-[#ff5e5b] px-8 py-3 text-base font-semibold text-white shadow-lg shadow-[#ff5e5b]/20 hover:bg-[#e05451] hover:shadow-xl hover:shadow-[#ff5e5b]/30 hover:-translate-y-0.5 transition-all"
              >
                <Heart size={20} className="fill-white" />
                Support Mouzi on Ko-fi
              </button>
              <p className="text-xs text-text-muted mt-3">
                Your support keeps Mouzi improving. Thank you! 🙏
              </p>
            </div>
          </div>
        )}

        {tab === "ignore" && (
          <IgnoreTab />
        )}
      </div>
    </div>
  );
}

function IgnoreTab() {
  const { folders } = useAppStore();
  const [selectedFolder, setSelectedFolder] = useState("");
  const [patterns, setPatterns] = useState<string[]>([]);
  const [newPattern, setNewPattern] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (selectedFolder) {
      invoke<string[]>("load_mouziignore_cmd", { folderPath: selectedFolder })
        .then(setPatterns)
        .catch(() => setPatterns([]));
    } else {
      setPatterns([]);
    }
  }, [selectedFolder]);

  const handleAdd = () => {
    const trimmed = newPattern.trim();
    if (!trimmed || patterns.includes(trimmed)) return;
    setPatterns([...patterns, trimmed]);
    setNewPattern("");
    setSaved(false);
  };

  const handleRemove = (idx: number) => {
    setPatterns(patterns.filter((_, i) => i !== idx));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!selectedFolder) return;
    try {
      await invoke("save_mouziignore_cmd", {
        folderPath: selectedFolder,
        patterns,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("save_mouziignore failed:", e);
    }
  };

  return (
    <div className="space-y-6 max-w-md">
      <h2 className="text-lg font-semibold">Ignore Rules</h2>
      <p className="text-sm text-text-muted">
        Choose a watched folder and set patterns for files Mouzi should skip.
        Patterns are saved as a <code>.mouziignore</code> file in that folder.
      </p>

      <div>
        <label className="text-sm font-medium text-text-muted block mb-2">
          Folder
        </label>
        <select
          value={selectedFolder}
          onChange={(e) => setSelectedFolder(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">Select a folder...</option>
          {folders.map((f) => (
            <option key={f.id} value={f.path}>
              {f.path}
            </option>
          ))}
        </select>
      </div>

      {selectedFolder && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-muted block">
              Patterns
            </label>
            {patterns.length === 0 && (
              <p className="text-sm text-text-muted italic">
                No ignore rules yet. Add one below.
              </p>
            )}
            {patterns.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2"
              >
                <code className="text-sm text-primary">{p}</code>
                <button
                  onClick={() => handleRemove(i)}
                  className="text-text-muted hover:text-red-400 transition-colors"
                  title="Remove"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="e.g. *.tmp or node_modules/"
              className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={handleAdd}
              disabled={!newPattern.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-bg hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              Add
            </button>
          </div>

          <div className="rounded-md border border-border bg-surface p-3">
            <p className="text-xs text-text-muted mb-1">
              <strong className="text-text">Tips:</strong>
            </p>
            <ul className="text-xs text-text-muted space-y-1 list-disc pl-4">
              <li><code>*.tmp</code> — ignore all .tmp files</li>
              <li><code>node_modules/</code> — ignore the folder</li>
              <li><code>~$*</code> — ignore Office temp files</li>
              <li><code>.DS_Store</code> — ignore exact file name</li>
            </ul>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-bg hover:bg-primary/90 transition-colors"
          >
            <Save size={16} />
            {saved ? "Saved!" : "Save .mouziignore"}
          </button>
        </>
      )}
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
