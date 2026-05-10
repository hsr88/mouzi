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
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

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

export default function Popup() {
  const { t } = useTranslation();
  const {
    logs,
    stats,
    isLoading,
    loadLogs,
    loadStats,
    scanFolder,
    undoAction,
    folders,
  } = useAppStore();
  const [scanResults, setScanResults] = useState<
    { file: string; rule: string; destination: string }[]
  >([]);

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [loadLogs, loadStats]);

  const handleClean = async () => {
    const downloads = folders[0]?.path || (await invoke<string>("get_downloads_folder"));
    const results = await scanFolder(downloads);
    setScanResults(results);
    if (results.length > 0) {
      await invoke("show_notification", {
        title: "Mouzi",
        body: t("notifications.cleaned", { count: results.length }),
      });
    }
  };

  const handleOpenDownloads = async () => {
    const downloads = folders[0]?.path || (await invoke<string>("get_downloads_folder"));
    await invoke("open_folder_cmd", { path: downloads });
  };

  const handleQuit = () => {
    invoke("close_popup");
  };

  const totalStats = stats.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="flex h-full flex-col bg-surface text-text rounded-xl shadow-2xl border border-border overflow-hidden">
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
          {isLoading ? "..." : t("popup.cleanNow")}
        </button>
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
          <div className="text-center py-4 text-sm text-text-muted">
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
                {!log.undone && log.id && (
                  <button
                    onClick={() => undoAction(log.id!)}
                    className="p-1 rounded hover:bg-border text-text-muted hover:text-text"
                    title={t("popup.undo")}
                  >
                    <RotateCcw size={12} />
                  </button>
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

      {/* Scan results toast */}
      {scanResults.length > 0 && (
        <div className="px-3 pb-3">
          <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
            {t("notifications.cleaned", { count: scanResults.length })}
          </div>
        </div>
      )}
    </div>
  );
}
