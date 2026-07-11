import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { Download, ExternalLink, Heart } from "lucide-react";

interface VersionInfo {
  version: string;
  releaseDate: string;
}

export default function About() {
  const { t } = useTranslation();
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    invoke<[string, string]>("get_version_cmd")
      .then(([version, releaseDate]) => setVersionInfo({ version, releaseDate }))
      .catch((err) => console.error("[About] failed to get version:", err));
  }, []);

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
        onClick={() =>
          invoke("open_folder_cmd", {
            path: "https://mouzi.cc/#download",
          })
        }
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text hover:bg-border transition-colors"
      >
        <Download size={16} className="text-primary" />
        {t("settings.about.checkUpdates")}
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
