import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { Download, ExternalLink, Heart } from "lucide-react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

interface VersionInfo {
  version: string;
  releaseDate: string;
}

export default function About() {
  const { t } = useTranslation();
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [updateStatus, setUpdateStatus] = useState<
    "idle" | "checking" | "current" | "installing" | "error"
  >("idle");

  useEffect(() => {
    invoke<[string, string]>("get_version_cmd")
      .then(([version, releaseDate]) => setVersionInfo({ version, releaseDate }))
      .catch((err) => console.error("[About] failed to get version:", err));
  }, []);

  const handleUpdate = async () => {
    try {
      if (availableUpdate) {
        setUpdateStatus("installing");
        await availableUpdate.downloadAndInstall();
        await relaunch();
        return;
      }
      setUpdateStatus("checking");
      const update = await check();
      if (update) {
        setAvailableUpdate(update);
        setUpdateStatus("idle");
      } else {
        setUpdateStatus("current");
      }
    } catch (error) {
      console.error("[updater] check or installation failed:", error);
      setUpdateStatus("error");
    }
  };

  return (
    <div className="space-y-6 max-w-md">
      {/* Logo + tagline */}
      <div className="flex items-center gap-3">
        <img
          src="/mouzilogo.png"
          alt={t("app.name")}
          className="h-12 w-12 rounded-xl"
        />
        <div>
          <h2 className="text-xl font-semibold">Mouzi</h2>
          <p className="text-sm text-text-muted">{t("settings.about.tagline")}</p>
        </div>
      </div>

      <p className="text-sm text-text-muted leading-relaxed">
        {t("settings.about.description")}
      </p>

      {/* Version & release date */}
      {versionInfo && (
        <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-muted">
          <div className="flex justify-between">
            <span>{t("settings.about.versionLabel")}</span>
            <span className="font-medium text-text">{versionInfo.version}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>{t("settings.about.releaseDateLabel")}</span>
            <span className="font-medium text-text">{versionInfo.releaseDate}</span>
          </div>
        </div>
      )}

      {/* Check for Updates */}
      <button
        onClick={handleUpdate}
        disabled={updateStatus === "checking" || updateStatus === "installing"}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text hover:bg-border transition-colors"
      >
        <Download size={16} className="text-primary" />
        {availableUpdate
          ? t("updater.installVersion", { version: availableUpdate.version })
          : updateStatus === "checking"
            ? t("updater.checking")
            : updateStatus === "installing"
              ? t("updater.installing")
              : t("settings.about.checkUpdates")}
      </button>
      {updateStatus === "current" && (
        <p className="-mt-4 text-xs text-green-600">{t("updater.current")}</p>
      )}
      {updateStatus === "error" && (
        <p className="-mt-4 text-xs text-red-500">{t("updater.error")}</p>
      )}

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
        <p className="text-xs text-text-muted mt-1">{t("settings.about.builtBy")}</p>
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
          {t("settings.about.support")}
        </button>
        <p className="text-xs text-text-muted mt-3">
          {t("settings.about.supportDesc")}
        </p>
      </div>
    </div>
  );
}
