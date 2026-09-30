"use client";
import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import {
  downloadWorkspaceBackup,
  restoreWorkspaceBackup,
} from "@/lib/project-storage";
import { useI18n } from "@/lib/i18n";

export function BackupRecovery() {
  const { t, direction } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const download = () => {
    const backup = downloadWorkspaceBackup();
    if (!backup) {
      setMessage(t("security.restoreError"));
      return;
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `blocksystem-backup-${backup.createdAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(t("security.backupCreated"));
  };
  const restore = async (file: File) => {
    if (busy || file.size > 10_000_000)
      return setMessage(t("security.restoreError"));
    if (!window.confirm(t("security.restoreConfirm"))) return;
    setBusy(true);
    setMessage("");
    try {
      const raw: unknown = JSON.parse(await file.text());
      if (!restoreWorkspaceBackup(raw)) throw new Error();
      setMessage(t("security.restoreSuccess"));
      window.dispatchEvent(new Event("yek-block-projects-changed"));
    } catch {
      setMessage(t("security.restoreError"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      dir={direction}
    >
      <h2 className="text-xl font-bold text-[#0F2053]">
        {t("security.backup")}
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        {t("security.restoreWarning")}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={download}
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
        >
          <Download size={17} />
          {t("security.downloadBackup")}
        </button>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
        >
          <Upload size={17} />
          {t("security.restoreBackup")}
        </button>
        <input
          ref={input}
          className="hidden"
          type="file"
          accept="application/json"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void restore(file);
          }}
        />
      </div>
      {message ? (
        <p role="status" className="mt-3 text-sm font-semibold">
          {message}
        </p>
      ) : null}
    </section>
  );
}
