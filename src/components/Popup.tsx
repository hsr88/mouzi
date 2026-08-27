import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import {
  FolderOpen,
  Sparkles,
  RotateCcw,
  X,
  FileText,
  Image,
  Music,
  Video,
  Archive,
  Package,
  File,
  ExternalLink,
  Inbox,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

function getIconForType(typeName: string) {
  const lower = typeName.toLowerCase();
  if (lower.includes("image")) return <Image size={14} />;
  if (lower.includes("music")) return <Music size={14} />;
  if (lower.includes("video")) return <Video size={14} />;
  if (lower.includes("archive")) return <Archive size={14} />;
  if (lower.includes("install")) return <Package size={14} />;
  if (lower.includes("document")) return <FileText size={14} />;
  return <File size={14} />;
}

function getFolderFromPath(filePath: string | null | undefined): string | null {
  if (!filePath) return null;
  const lastSlash = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  if (lastSlash === -1) return filePath;
  return filePath.slice(0, lastSlash) || filePath;
}

export default function Popup() {
  const { t } = useTranslation();
  const {
    logs,
    stats,
    isLoading,
    loadLogs,
    loadStats,
    loadFolders,
    scanFolder,
    undoAction,
    folders,
    pendingFiles,
    getPendingFiles,
    scanSelectedFiles,
    settings,
    loadSettings,
  } = useAppStore();
  const [scanResults, setScanResults] = useState<
    { file: string; rule: string; destination: string }[]
  >([]);
  const [toast, setToast] = useState<{
    file: string;
    rule: string;
    destination: string;
    destination_folder: string;
    message?: string;
  } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [updateBusy, setUpdateBusy] = useState(false);

  const pendingPath = (folder: string, file: string) => {
    const separator = folder.includes("\\") ? "\\" : "/";
    return `${folder.replace(/[\\/]$/, "")}${separator}${file}`;
  };

  useEffect(() => {
    loadLogs();
    loadStats();
    loadFolders();
    loadSettings();
    getPendingFiles();

    // Listen for file-organized events from Rust watcher — show in-app toast
    const unlisten = listen("file-organized", (event: any) => {
      const payload = event.payload;
      if (payload?.success) {
        const destFolder: string = payload.destination_folder || payload.destination;
        // Show in-app toast (popup must be open/visible for this to appear)
        setToast({
          file: payload.file,
          rule: payload.rule,
          destination: payload.destination,
          destination_folder: destFolder,
          message: payload.message || undefined,
        });
        setTimeout(() => setToast(null), 30000);
        loadLogs();
        loadStats();
        getPendingFiles();
      }
    });

    // Poll for pending files in manual-mode folders
    const interval = setInterval(() => {
      getPendingFiles();
    }, 3000);

    return () => {
      unlisten.then((f) => f());
      clearInterval(interval);
    };
  }, [loadLogs, loadStats, loadFolders, loadSettings, getPendingFiles]);

  useEffect(() => {
    if (!settings?.auto_update_enabled) return;
    check()
      .then((update) => setAvailableUpdate(update))
      .catch((error) => console.error("[updater] automatic check failed:", error));
  }, [settings?.auto_update_enabled]);

  useEffect(() => {
    const available = new Set(
      pendingFiles.map(([folder, file]) => pendingPath(folder, file))
    );
    setSelectedFiles((current) =>
      new Set([...current].filter((path) => available.has(path)))
    );
  }, [pendingFiles]);



  const handleClean = async () => {
    let allResults: { file: string; rule: string; destination: string }[] = [];
    const activeFolders = folders.filter((f) => f.mode !== "paused");
    const targets = activeFolders.length > 0 ? activeFolders.map((f) => f.path) : [await invoke<string>("get_downloads_folder")];
    for (const path of targets) {
      const results = await scanFolder(path);
      allResults = allResults.concat(results);
    }
    setScanResults(allResults);
    await getPendingFiles();
    if (allResults.length > 0) {
      await invoke("show_notification", {
        title: t("app.name"),
        body: t("notifications.cleaned", { count: allResults.length }),
      });
    }
  };

  const handleOpenDownloads = async () => {
    const downloads = folders[0]?.path || (await invoke<string>("get_downloads_folder"));
    await invoke("open_folder_cmd", { path: downloads });
  };

  const handleSelected = async () => {
    if (selectedFiles.size === 0) return;
    const results = await scanSelectedFiles([...selectedFiles]);
    setScanResults(results);
    setSelectedFiles(new Set());
  };

  const handleInstallUpdate = async () => {
    if (!availableUpdate) return;
    setUpdateBusy(true);
    try {
      await availableUpdate.downloadAndInstall();
      await relaunch();
    } catch (error) {
      console.error("[updater] installation failed:", error);
      setUpdateBusy(false);
    }
  };

  const handleOpenActionFolder = async (filePath: string | null | undefined) => {
    const folderPath = getFolderFromPath(filePath);
    if (!folderPath) return;
    try {
      await invoke("open_folder_cmd", { path: folderPath });
    } catch {
      console.error("Failed to open folder");
    }
  };

  const handleQuit = () => {
    invoke("close_popup");
  };

  const totalStats = stats.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="flex h-full flex-col bg-surface text-text border border-border overflow-hidden">
      {/* Header */}
      <div data-tauri-drag-region className="flex items-center justify-between px-4 py-3 bg-surface-dark border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <span className="font-semibold text-sm">{t("popup.title")}</span>
        </div>
        <button
          onClick={handleQuit}
          className="p-1.5 rounded-md hover:bg-border transition-colors"
          title={t("popup.quit")}
          aria-label={t("popup.quit")}
        >
          <X size={14} />
        </button>
      </div>

      {/* Actions */}
      <div className="p-3 space-y-2">
        <button
          onClick={handleClean}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-60"
        >
          <Sparkles size={15} />
          {isLoading ? "..." : t("popup.organizeNow")}
        </button>
        {pendingFiles.length > 0 && (
          <div className="rounded-lg border border-border bg-surface-dark p-2 space-y-2">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>{t("popup.pendingFiles", { count: pendingFiles.length })}</span>
              <button
                onClick={() => {
                  const all = pendingFiles.map(([folder, file]) => pendingPath(folder, file));
                  setSelectedFiles(
                    selectedFiles.size === all.length ? new Set() : new Set(all)
                  );
                }}
                className="text-primary hover:underline"
              >
                {selectedFiles.size === pendingFiles.length
                  ? t("popup.clearSelection")
                  : t("popup.selectAll")}
              </button>
            </div>
            <div className="max-h-20 overflow-auto space-y-1">
              {pendingFiles.map(([folder, file]) => {
                const path = pendingPath(folder, file);
                return (
                  <label key={path} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(path)}
                      onChange={() =>
                        setSelectedFiles((current) => {
                          const next = new Set(current);
                          if (next.has(path)) next.delete(path);
                          else next.add(path);
                          return next;
                        })
                      }
                    />
                    <span className="truncate" title={path}>{file}</span>
                  </label>
                );
              })}
            </div>
            <button
              onClick={handleSelected}
              disabled={selectedFiles.size === 0 || isLoading}
              className="w-full rounded-md border border-primary px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              {t("popup.organizeSelected", { count: selectedFiles.size })}
            </button>
          </div>
        )}
        <button
          onClick={handleOpenDownloads}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface-dark transition-colors"
        >
          <FolderOpen size={15} />
          {t("popup.openDownloads")}
        </button>
      </div>

      {/* Recent */}
      <div className="flex-1 overflow-auto px-3">
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
          {t("popup.recentActions")}
        </div>
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-sm text-text-muted">
            <Inbox size={28} className="mb-2 opacity-60" />
            {t("popup.noActions")}
          </div>
        ) : (
          <div className="space-y-1.5">
            {logs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-2 rounded-md bg-surface-dark px-2.5 py-2 text-xs"
              >
                <span className="text-text-muted shrink-0">
                  {getIconForType(log.file_type)}
                </span>
                <span className="flex-1 truncate" title={log.file_name}>
                  {log.file_name}
                </span>
                <span className="text-text-muted truncate max-w-[80px]">
                  {log.file_type}
                </span>
                {!log.undone && log.id && log.action === "move" && log.destination_path && (
                  <>
                    <button
                      onClick={() => handleOpenActionFolder(log.destination_path)}
                      className="p-1 rounded hover:bg-border text-text-muted hover:text-text"
                      title={t("popup.openActionFolder")}
                      aria-label={t("popup.openActionFolder")}
                    >
                      <FolderOpen size={12} />
                    </button>
                    <button
                      onClick={() => undoAction(log.id!)}
                      className="p-1 rounded hover:bg-border text-text-muted hover:text-text"
                      title={t("popup.undo")}
                      aria-label={t("popup.undo")}
                    >
                      <RotateCcw size={12} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {stats.length > 0 && (
        <div className="border-t border-border p-3">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            {t("popup.weeklyStats")}
          </div>
          <div className="space-y-1.5">
            {stats.map((s) => {
              const pct = totalStats > 0 ? Math.round((s.count / totalStats) * 100) : 0;
              return (
                <div key={s.file_type} className="flex items-center gap-2 text-xs">
                  <span className="w-16 truncate text-text-muted">{s.file_type}</span>
                  <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-text-muted">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Clickable toast for auto-organized files */}
      {toast && (
        <div className="px-3 pb-2">
          <div
            onPointerDown={async () => {
              try {
                await invoke("open_folder_cmd", { path: toast.destination_folder });
              } catch {
                console.error("Failed to open folder");
              }
              setToast(null);
            }}
            className="w-full text-left rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-xs hover:bg-primary/20 transition-colors cursor-pointer"
            role="button"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-primary">
                <ExternalLink size={12} />
                <span className="font-medium">
                  {toast.message || t("popup.organized", { file: toast.file })}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setToast(null);
                }}
                className="p-0.5 rounded hover:bg-primary/20 text-primary"
                title={t("common.close")}
                aria-label={t("common.close")}
              >
                <X size={10} />
              </button>
            </div>
            <div className="text-text-muted mt-0.5 truncate">
              {t("popup.openFolder", { folder: toast.destination_folder })}
            </div>
          </div>
        </div>
      )}

      {/* Scan results toast */}
      {scanResults.length > 0 && (
        <div className="px-3 pb-3">
          <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
            {t("notifications.cleaned", { count: scanResults.length })}
          </div>
        </div>
      )}

      {availableUpdate && (
        <div className="px-3 pb-3">
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-2.5 text-xs">
            <div className="font-medium">
              {t("updater.available", { version: availableUpdate.version })}
            </div>
            <button
              onClick={handleInstallUpdate}
              disabled={updateBusy}
              className="mt-2 w-full rounded-md bg-primary px-2 py-1.5 font-medium text-white disabled:opacity-60"
            >
              {updateBusy ? t("updater.installing") : t("updater.installRestart")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
