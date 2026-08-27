import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore, Rule, ScheduleSettings } from "../store/useAppStore";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import About from "./About";
import {
  Folder,
  FolderOpen,
  List,
  History,
  Inbox,
  Globe,
  Plus,
  Trash2,
  Save,
  X,
  Check,
  ChevronLeft,
  RotateCcw,
  Download,
  Upload,
  Info,
  ExternalLink,
  Pencil,
} from "lucide-react";


type Tab = "folders" | "rules" | "history" | "ignore" | "general" | "about";
type GraceUnit = "seconds" | "minutes" | "hours";
type ArchiveImportResult = {
  extractedCount: number;
  sortedCount: number;
  stagingPath: string;
};

const GRACE_STEPS = [
  0, 30, 60, 300, 900, 1800, 3600, 7200, 21600, 43200, 86400, 172800, 604800,
];
const MAX_GRACE_SECONDS = 604800; // 7 days

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);
  return parts.join(" ") || "0s";
}

function secondsToUnit(seconds: number): { value: number; unit: GraceUnit } {
  if (seconds % 3600 === 0 && seconds >= 3600) {
    return { value: seconds / 3600, unit: "hours" };
  }
  if (seconds % 60 === 0 && seconds >= 60) {
    return { value: seconds / 60, unit: "minutes" };
  }
  return { value: seconds, unit: "seconds" };
}

function unitToSeconds(value: number, unit: GraceUnit): number {
  switch (unit) {
    case "hours":
      return value * 3600;
    case "minutes":
      return value * 60;
    default:
      return value;
  }
}

function nearestGraceStep(seconds: number): number {
  return GRACE_STEPS.reduce((prev, curr) =>
    Math.abs(curr - seconds) < Math.abs(prev - seconds) ? curr : prev
  );
}

function getDirectoryFromPath(filePath: string | null): string | null {
  if (!filePath) return null;
  const normalized = filePath.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash <= 0) return normalized;
  return normalized.slice(0, lastSlash);
}

function defaultSchedule(): ScheduleSettings {
  return {
    schedule_enabled: false,
    schedule_times_per_day: 1,
    schedule_time_1: "08:00",
    schedule_time_2: null,
    schedule_time_3: null,
    schedule_time_4: null,
  };
}

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
    updateFolderMode,
    addRule,
    updateRule,
    deleteRule,
    clearLogs,
    undoAction,
    undoAll,
    settings,
    saveSettings,
    setAutostart,
    schedule,
    getSchedule,
    updateSchedule,
    exportRules,
    importRules,
  } = useAppStore();

  const [tab, setTab] = useState<Tab>("folders");
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [newFolderPath, setNewFolderPath] = useState("");

  const [graceValue, setGraceValue] = useState(300);
  const [graceUnit, setGraceUnit] = useState<GraceUnit>("seconds");
  const [graceError, setGraceError] = useState<string | null>(null);

  const [localSchedule, setLocalSchedule] = useState<ScheduleSettings>(defaultSchedule());
  const [ruleToast, setRuleToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [replaceOnImport, setReplaceOnImport] = useState(false);
  const [archiveToast, setArchiveToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
    stagingPath?: string;
  } | null>(null);
  const [isImportingArchive, setIsImportingArchive] = useState(false);

  useEffect(() => {
    loadRules();
    loadFolders();
    loadLogs();
    getSchedule();
  }, [loadRules, loadFolders, loadLogs, getSchedule]);

  // Sync local grace editor with loaded settings
  useEffect(() => {
    if (settings) {
      const clamped = Math.min(settings.grace_period_seconds, MAX_GRACE_SECONDS);
      const converted = secondsToUnit(clamped);
      setGraceValue(converted.value);
      setGraceUnit(converted.unit);
      setGraceError(null);
    }
  }, [settings?.grace_period_seconds]);

  // Sync local schedule editor with loaded schedule
  useEffect(() => {
    if (schedule) {
      setLocalSchedule(schedule);
    }
  }, [schedule]);

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

  const handlePickRuleDestination = async () => {
    if (!editingRule) return;
    const selected = await open({ directory: true, multiple: false });
    const selectedPath = Array.isArray(selected) ? selected[0] : selected;
    if (!selectedPath) return;

    const watchedFolder =
      folders.find((folder) => folder.id === editingRule.folder_id) || folders[0];
    let destination = selectedPath;
    if (watchedFolder) {
      const base = watchedFolder.path.replace(/\\/g, "/").replace(/\/$/, "");
      const target = selectedPath.replace(/\\/g, "/").replace(/\/$/, "");
      const windowsPath = watchedFolder.path.includes("\\");
      const baseForComparison = windowsPath ? base.toLowerCase() : base;
      const targetForComparison = windowsPath ? target.toLowerCase() : target;
      if (targetForComparison === baseForComparison) {
        destination = ".";
      } else if (targetForComparison.startsWith(`${baseForComparison}/`)) {
        destination = target.slice(base.length + 1);
      }
    }
    setEditingRule({ ...editingRule, destination });
  };

  const handleChangeLanguage = async (lang: string) => {
    if (!settings) return;
    await i18n.changeLanguage(lang);
    await saveSettings({ ...settings, language: lang });
  };

  const handleGraceSliderChange = (stepIndex: number) => {
    if (!settings) return;
    const seconds = GRACE_STEPS[stepIndex];
    const converted = secondsToUnit(seconds);
    setGraceValue(converted.value);
    setGraceUnit(converted.unit);
    setGraceError(null);
    saveSettings({ ...settings, grace_period_seconds: seconds });
  };

  const handleGraceNumberChange = (value: number, unit: GraceUnit) => {
    if (!settings) return;
    const seconds = unitToSeconds(value, unit);
    if (seconds > MAX_GRACE_SECONDS) {
      setGraceError(t("settings.general.gracePeriodMaxError"));
      setGraceValue(value);
      setGraceUnit(unit);
      return;
    }
    setGraceError(null);
    setGraceValue(value);
    setGraceUnit(unit);
    saveSettings({ ...settings, grace_period_seconds: Math.max(0, seconds) });
  };

  const handleScheduleChange = (patch: Partial<ScheduleSettings>) => {
    setLocalSchedule((prev) => {
      const next = { ...prev, ...patch };
      const times = Math.max(1, Math.min(4, next.schedule_times_per_day || 1));
      // Ensure required time slots have defaults when increasing count
      if (times >= 1 && !next.schedule_time_1) next.schedule_time_1 = "08:00";
      if (times >= 2 && !next.schedule_time_2) next.schedule_time_2 = "14:00";
      if (times >= 3 && !next.schedule_time_3) next.schedule_time_3 = "20:00";
      if (times >= 4 && !next.schedule_time_4) next.schedule_time_4 = "23:00";
      return { ...next, schedule_times_per_day: times };
    });
  };

  const handleSaveSchedule = async () => {
    try {
      await updateSchedule(localSchedule);
    } catch (e) {
      console.error("Failed to save schedule:", e);
    }
  };

  const handleExportRules = async () => {
    try {
      const path = await save({
        filters: [{ name: "JSON", extensions: ["json"] }],
        defaultPath: "mouzi-rules.json",
      });
      if (path) {
        await exportRules(path);
        setRuleToast({ message: t("settings.rules.exportSuccess"), type: "success" });
      }
    } catch (e) {
      console.error("Export rules failed:", e);
      setRuleToast({ message: t("settings.rules.exportError"), type: "error" });
    }
    setTimeout(() => setRuleToast(null), 3000);
  };

  const handleImportRules = async () => {
    try {
      const selected = await open({
        filters: [{ name: "JSON", extensions: ["json"] }],
        multiple: false,
      });
      const path = Array.isArray(selected) ? selected[0] : selected;
      if (path) {
        const count = await importRules(path, replaceOnImport);
        setRuleToast({
          message: t("settings.rules.importSuccess", { count }),
          type: "success",
        });
      }
    } catch (e) {
      console.error("Import rules failed:", e);
      setRuleToast({ message: t("settings.rules.importError"), type: "error" });
    }
    setTimeout(() => setRuleToast(null), 3000);
  };

  const handleImportArchive = async () => {
    try {
      const selected = await open({
        filters: [{ name: "Archives", extensions: ["zip", "tgz", "gz"] }],
        multiple: false,
      });
      const path = Array.isArray(selected) ? selected[0] : selected;
      if (!path) return;

      setIsImportingArchive(true);
      setArchiveToast({ message: t("settings.archive.importing"), type: "info" });

      const summary = await invoke<ArchiveImportResult>("import_archive_cmd", { path });
      await loadLogs();
      setArchiveToast({
        message: t("settings.archive.importSuccess", {
          count: summary.sortedCount,
          extracted: summary.extractedCount,
        }),
        type: "success",
        stagingPath: summary.stagingPath,
      });
    } catch (e) {
      console.error("Import archive failed:", e);
      setArchiveToast({
        message: t("settings.archive.importError", { error: String(e) }),
        type: "error",
      });
    } finally {
      setIsImportingArchive(false);
    }
  };

  const currentGraceSeconds = useMemo(
    () => unitToSeconds(graceValue, graceUnit),
    [graceValue, graceUnit]
  );

  const sliderIndex = useMemo(() => {
    const clamped = Math.min(currentGraceSeconds, MAX_GRACE_SECONDS);
    const nearest = nearestGraceStep(clamped);
    return GRACE_STEPS.indexOf(nearest);
  }, [currentGraceSeconds]);

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
            title={t("common.back")}
            aria-label={t("common.back")}
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
            label={t("settings.ignore.title")}
          />
          <SidebarButton
            active={tab === "general"}
            onClick={() => setTab("general")}
            icon={<Globe size={16} />}
            label={t("settings.general.title")}
          />
          <SidebarButton
            active={tab === "about"}
            onClick={() => setTab("about")}
            icon={<Info size={16} />}
            label={t("settings.about.title")}
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
                placeholder={t("settings.folders.placeholder")}
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
            <div className="rounded-lg border border-border bg-surface-dark p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">{t("settings.archive.title")}</h3>
                  <p className="mt-1 text-xs text-text-muted">
                    {t("settings.archive.description")}
                  </p>
                </div>
                <button
                  onClick={handleImportArchive}
                  disabled={isImportingArchive}
                  className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-surface transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Upload size={14} />
                  {isImportingArchive
                    ? t("settings.archive.importingShort")
                    : t("settings.archive.import")}
                </button>
              </div>
              {archiveToast && (
                <div
                  className={`text-xs px-3 py-2 rounded-md ${
                    archiveToast.type === "success"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : archiveToast.type === "error"
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}
                >
                  <div>{archiveToast.message}</div>
                  {archiveToast.stagingPath && (
                    <button
                      onClick={() =>
                        invoke("open_folder_cmd", { path: archiveToast.stagingPath })
                      }
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium underline"
                    >
                      <ExternalLink size={12} />
                      {t("settings.archive.openImportFolder")}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              {folders.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3 gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{f.path}</div>
                    <div className="mt-1.5">
                      <label className="text-[10px] uppercase tracking-wide text-text-muted block mb-1">
                        {t("settings.folders.mode")}
                      </label>
                      <select
                        value={f.mode || "silent"}
                        onChange={(e) => f.id && updateFolderMode(f.id, e.target.value)}
                        className="appearance-none w-full max-w-xs rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary"
                      >
                        <option value="silent">{t("settings.folders.modeSilent")}</option>
                        <option value="manual">{t("settings.folders.modeManual")}</option>
                        <option value="paused">{t("settings.folders.modePaused")}</option>
                      </select>
                      <p className="text-[10px] text-text-muted mt-1">
                        {t("settings.folders.modeDesc")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => f.id && removeFolder(f.id)}
                    className="p-1.5 rounded-md text-red-500 hover:bg-red-50 shrink-0"
                    title={t("settings.folders.remove")}
                    aria-label={`${t("settings.folders.remove")}: ${f.path}`}
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
                    notification_message: null,
                    normalize_extensions: false,
                    extension_mappings: "jpeg:jpg",
                  })
                }
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                <Plus size={14} />
                {t("settings.rules.add")}
              </button>
            </div>

            {/* Export / Import */}
            <div className="rounded-lg border border-border bg-surface-dark p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportRules}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-surface transition-colors"
                >
                  <Download size={14} />
                  {t("settings.rules.export")}
                </button>
                <button
                  onClick={handleImportRules}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-surface transition-colors"
                >
                  <Upload size={14} />
                  {t("settings.rules.import")}
                </button>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={replaceOnImport}
                  onChange={(e) => setReplaceOnImport(e.target.checked)}
                />
                {t("settings.rules.replaceOnImport")}
              </label>
              {ruleToast && (
                <div
                  className={`text-xs px-3 py-2 rounded-md ${ruleToast.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                >
                  {ruleToast.message}
                </div>
              )}
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
                      placeholder={t("settings.rules.extensions")}
                      className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-muted">{t("settings.rules.pattern")}</label>
                    <input
                      value={editingRule.pattern || ""}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          pattern: e.target.value.trim() === "" ? null : e.target.value,
                        })
                      }
                      placeholder="(?i)report.*\.pdf"
                      className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-muted">{t("settings.rules.destination")}</label>
                    <div className="mt-1 flex gap-1.5">
                      <input
                        value={editingRule.destination}
                        disabled={editingRule.action !== "move"}
                        onChange={(e) => setEditingRule({ ...editingRule, destination: e.target.value })}
                        className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={handlePickRuleDestination}
                        disabled={editingRule.action !== "move"}
                        className="rounded-md border border-border px-2 hover:bg-surface disabled:opacity-50"
                        title={t("settings.rules.pickDestination")}
                        aria-label={t("settings.rules.pickDestination")}
                      >
                        <FolderOpen size={14} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-muted">{t("settings.rules.action")}</label>
                    <select
                      value={editingRule.action}
                      onChange={(e) => setEditingRule({ ...editingRule, action: e.target.value })}
                      className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary"
                    >
                      <option value="move">{t("settings.rules.actionMove")}</option>
                      <option value="delete">{t("settings.rules.actionRecycle")}</option>
                      <option value="ignore">{t("settings.rules.actionIgnore")}</option>
                    </select>
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
                {editingRule.action === "move" && (
                  <div className="rounded-md border border-border bg-surface p-3 space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editingRule.normalize_extensions}
                        onChange={(e) =>
                          setEditingRule({ ...editingRule, normalize_extensions: e.target.checked })
                        }
                      />
                      {t("settings.rules.normalizeExtensions")}
                    </label>
                    {editingRule.normalize_extensions && (
                      <input
                        value={editingRule.extension_mappings}
                        onChange={(e) =>
                          setEditingRule({ ...editingRule, extension_mappings: e.target.value })
                        }
                        placeholder="jpeg:jpg, tiff:tif"
                        className="w-full rounded-md border border-border bg-surface-dark px-2 py-1.5 text-sm outline-none focus:border-primary"
                      />
                    )}
                    <p className="text-[11px] text-text-muted">{t("settings.rules.normalizeHelp")}</p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-text-muted">
                    {t("settings.rules.notificationMessage")}
                  </label>
                  <input
                    value={editingRule.notification_message || ""}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        notification_message: e.target.value || null,
                      })
                    }
                    placeholder={t("settings.rules.notificationPlaceholder")}
                    className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <p className="mt-1 text-[11px] text-text-muted">{t("settings.rules.notificationHelp")}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveRule}
                    className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
                  >
                    <Save size={14} />
                    {t("settings.rules.save")}
                  </button>
                  <button
                    onClick={() => setEditingRule(null)}
                    className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface"
                  >
                    <X size={14} />
                    {t("common.cancel")}
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
                          {t("common.off")}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {r.extensions.join(", ")} → {r.action === "delete" ? t("settings.rules.recycleBin") : r.destination}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={r.enabled}
                      aria-label={`${r.name}: ${r.enabled ? t("settings.rules.enabled") : t("common.off")}`}
                      title={`${r.name}: ${r.enabled ? t("settings.rules.enabled") : t("common.off")}`}
                      onClick={() => updateRule({ ...r, enabled: !r.enabled })}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${r.enabled ? "bg-primary" : "bg-border"
                        }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${r.enabled ? "translate-x-5" : "translate-x-1"
                          }`}
                      />
                    </button>
                    <button
                      onClick={() => setEditingRule({ ...r })}
                      className="p-1.5 rounded-md hover:bg-border text-text-muted"
                      title={t("settings.rules.edit")}
                      aria-label={t("settings.rules.edit")}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => r.id && deleteRule(r.id)}
                      className="p-1.5 rounded-md text-red-500 hover:bg-red-50"
                      title={t("settings.rules.delete")}
                      aria-label={t("settings.rules.delete")}
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
                  disabled={logs.every((log) => log.undone || log.action !== "move" || !log.destination_path)}
                  title={logs.every((log) => log.undone || log.action !== "move" || !log.destination_path) ? t("settings.history.revertAllDisabled") : undefined}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-text hover:bg-surface-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw size={14} />
                  {t("settings.history.revertAll")}
                </button>
                <button
                  onClick={() => setConfirmClearHistory(true)}
                  className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  {t("settings.history.clear")}
                </button>
              </div>
            </div>
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                <Inbox size={48} className="mb-3 opacity-50" />
                <span>{t("settings.history.empty")}</span>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 ${log.undone ? "border-border bg-surface-dark opacity-50" : "border-border"
                      }`}
                  >
                    <div>
                      <div className="text-sm">{log.file_name}</div>
                      <div className="text-xs text-text-muted">
                        {log.file_type} → {log.action === "delete" ? t("settings.rules.recycleBin") : (log.destination_path || "-")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {log.destination_path && (
                        <button
                          onClick={async () => {
                            const folderPath = getDirectoryFromPath(log.destination_path);
                            if (folderPath) {
                              try {
                                await invoke("open_folder_cmd", { path: folderPath });
                              } catch (e) {
                                console.error("Failed to open folder:", e);
                              }
                            }
                          }}
                          className="p-1.5 rounded-md text-text-muted hover:bg-border"
                          title={t("popup.openActionFolder")}
                          aria-label={t("popup.openActionFolder")}
                        >
                          <FolderOpen size={16} />
                        </button>
                      )}
                      {log.undone ? (
                        <span className="text-xs text-text-muted flex items-center gap-1">
                          <Check size={12} />
                          {t("settings.history.undone")}
                        </span>
                      ) : log.action === "move" && log.destination_path ? (
                        <button
                          onClick={() => log.id && undoAction(log.id)}
                          className="text-xs text-primary hover:underline"
                        >
                          {t("settings.history.undo")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {confirmClearHistory && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-medium">{t("settings.history.confirmTitle")}</p>
                <p className="mt-1 text-xs">{t("settings.history.confirmDescription")}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={async () => {
                      await clearLogs();
                      setConfirmClearHistory(false);
                    }}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    {t("settings.history.confirmDelete")}
                  </button>
                  <button
                    onClick={() => setConfirmClearHistory(false)}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-xs hover:bg-white"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
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
                  className="appearance-none w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="en">English</option>
                  <option value="pl">Polski</option>
                  <option value="it">Italiano</option>
                  <option value="de">Deutsch</option>
                  <option value="fr">Français</option>
                  <option value="ru">Русский</option>
                  <option value="ja">日本語</option>
                  <option value="vi">Tiếng Việt</option>
                  <option value="es">Español</option>
                  <option value="uk">Українська</option>
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
                  className="appearance-none w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="system">{t("settings.general.themeSystem")}</option>
                  <option value="light">{t("settings.general.themeLight")}</option>
                  <option value="dark">{t("settings.general.themeDark")}</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-muted">
                  {t("settings.general.startWithSystem")}
                </label>
                <button
                  onClick={() => setAutostart(!settings?.autostart)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings?.autostart ? "bg-primary" : "bg-surface-dark"
                    }`}
                  role="switch"
                  aria-checked={settings?.autostart || false}
                  aria-label={t("settings.general.startWithSystem")}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings?.autostart ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-text-muted">
                    {t("settings.general.autoUpdates")}
                  </label>
                  <p className="text-xs text-text-muted">
                    {t("settings.general.autoUpdatesDesc")}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (!settings) return;
                    saveSettings({
                      ...settings,
                      auto_update_enabled: !settings.auto_update_enabled,
                    });
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings?.auto_update_enabled ? "bg-primary" : "bg-surface-dark"}`}
                  role="switch"
                  aria-checked={settings?.auto_update_enabled || false}
                  aria-label={t("settings.general.autoUpdates")}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings?.auto_update_enabled ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              </div>

              {/* Grace Period */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-text-muted">
                    {t("settings.general.gracePeriod")}
                  </label>
                  <span className="text-xs text-text-muted">
                    {formatDuration(currentGraceSeconds)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={GRACE_STEPS.length - 1}
                  step={1}
                  value={sliderIndex}
                  onChange={(e) => handleGraceSliderChange(parseInt(e.target.value, 10))}
                  className="w-full"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={graceValue}
                    onChange={(e) =>
                      handleGraceNumberChange(parseInt(e.target.value, 10) || 0, graceUnit)
                    }
                    className="w-24 rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <select
                    value={graceUnit}
                    onChange={(e) =>
                      handleGraceNumberChange(graceValue, e.target.value as GraceUnit)
                    }
                    className="appearance-none rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary"
                  >
                    <option value="seconds">{t("settings.general.gracePeriodSeconds")}</option>
                    <option value="minutes">{t("settings.general.gracePeriodMinutes")}</option>
                    <option value="hours">{t("settings.general.gracePeriodHours")}</option>
                  </select>
                </div>
                {graceError && (
                  <p className="text-xs text-red-500">{graceError}</p>
                )}
                <p className="text-xs text-text-muted">
                  {t("settings.general.gracePeriodDesc")}
                </p>
              </div>

              {/* Lock Check */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-text-muted">
                    {t("settings.general.checkFileLock")}
                  </label>
                  <p className="text-xs text-text-muted">
                    {t("settings.general.checkFileLockDesc")}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (!settings) return;
                    const updated = { ...settings, lock_check_enabled: !settings.lock_check_enabled };
                    saveSettings(updated);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings?.lock_check_enabled ? "bg-primary" : "bg-surface-dark"
                    }`}
                  role="switch"
                  aria-checked={settings?.lock_check_enabled || false}
                  aria-label={t("settings.general.checkFileLock")}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings?.lock_check_enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>

            </div>

            {/* Scheduler */}
            <div className="border-t border-border pt-6 space-y-4">
              <div>
                <h3 className="text-base font-semibold">{t("settings.scheduler.title")}</h3>
                <p className="text-xs text-text-muted">{t("settings.scheduler.desc")}</p>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-muted">
                  {t("settings.scheduler.enable")}
                </label>
                <button
                  onClick={() => handleScheduleChange({ schedule_enabled: !localSchedule.schedule_enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localSchedule.schedule_enabled ? "bg-primary" : "bg-surface-dark"
                    }`}
                  role="switch"
                  aria-checked={localSchedule.schedule_enabled}
                  aria-label={t("settings.scheduler.enable")}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSchedule.schedule_enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>

              <div>
                <label className="text-sm font-medium text-text-muted block mb-2">
                  {t("settings.scheduler.timesPerDay")}
                </label>
                <select
                  value={localSchedule.schedule_times_per_day}
                  onChange={(e) =>
                    handleScheduleChange({ schedule_times_per_day: parseInt(e.target.value, 10) })
                  }
                  className="appearance-none w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value={1}>{t("settings.scheduler.once")}</option>
                  <option value={2}>{t("settings.scheduler.twice")}</option>
                  <option value={3}>{t("settings.scheduler.thrice")}</option>
                  <option value={4}>{t("settings.scheduler.fourTimes")}</option>
                </select>
              </div>

              <div className="space-y-2">
                {Array.from({ length: localSchedule.schedule_times_per_day }).map((_, idx) => {
                  const key = `schedule_time_${idx + 1}` as keyof ScheduleSettings;
                  return (
                    <div key={idx}>
                      <label className="text-xs font-medium text-text-muted block mb-1">
                        {t("settings.scheduler.time", { number: idx + 1 })}
                      </label>
                      <input
                        type="time"
                        value={(localSchedule[key] as string | null) || ""}
                        onChange={(e) =>
                          handleScheduleChange({ [key]: e.target.value || null } as Partial<ScheduleSettings>)
                        }
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleSaveSchedule}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                <Save size={14} />
                {t("settings.rules.save")}
              </button>
            </div>

          </div>
        )}

        {tab === "ignore" && (
          <IgnoreTab />
        )}

        {tab === "about" && (
          <About />
        )}
      </div>
    </div>
  );
}

function IgnoreTab() {
  const { t } = useTranslation();
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
      <h2 className="text-lg font-semibold">{t("settings.ignore.rulesTitle")}</h2>
      <p className="text-sm text-text-muted">
        {t("settings.ignore.description")}
      </p>

      <div>
        <label className="text-sm font-medium text-text-muted block mb-2">
          {t("settings.ignore.folder")}
        </label>
        <select
          value={selectedFolder}
          onChange={(e) => setSelectedFolder(e.target.value)}
          className="appearance-none w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">{t("settings.ignore.selectFolder")}</option>
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
              {t("settings.ignore.patterns")}
            </label>
            {patterns.length === 0 && (
              <p className="text-sm text-text-muted italic">
                {t("settings.ignore.noRules")}
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
                  title={t("settings.ignore.remove")}
                  aria-label={`${t("settings.ignore.remove")}: ${p}`}
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
              placeholder={t("settings.ignore.placeholder")}
              className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={handleAdd}
              disabled={!newPattern.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-40 transition-colors"
            >
              {t("settings.ignore.add")}
            </button>
          </div>

          <div className="rounded-md border border-border bg-surface p-3">
            <p className="text-xs text-text-muted mb-1">
              <strong className="text-text">{t("settings.ignore.tips")}</strong>
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
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            <Save size={16} />
            {saved ? t("settings.ignore.saved") : t("settings.ignore.save")}
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
      className={`w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${active
        ? "bg-primary/10 text-primary"
        : "text-text-muted hover:bg-border hover:text-text"
        }`}
    >
      {icon}
      {label}
    </button>
  );
}
