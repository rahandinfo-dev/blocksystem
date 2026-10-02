"use client";

import { Check, LoaderCircle, Save } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type SaveState = "saved" | "saving" | "unsaved" | "failed";

interface Props {
  saveState: SaveState;
  onSave: () => void;
}

export function WorkspaceConsole({ saveState, onSave }: Props) {
  const { t } = useI18n();
  const state = saveState === "saving"
    ? t("workspace.saving")
    : saveState === "failed"
      ? t("workspace.failed")
      : saveState === "unsaved"
        ? t("workspace.unsaved")
        : t("workspace.autoSavedStatus");
  const stateClass = saveState === "failed"
    ? "text-red-700"
    : saveState === "unsaved"
      ? "text-amber-800"
      : "text-emerald-700";

  return (
    <div className="print:hidden mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
      <p className={`inline-flex min-h-10 items-center gap-2 text-sm font-semibold ${stateClass}`} aria-live="polite">
        {saveState === "saving" ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
        {state}
      </p>
      <button type="button" onClick={onSave} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#0F2053]/25 px-3 text-sm font-semibold text-[#0F2053] hover:bg-[#EDE6CC]/45">
        <Save size={17} aria-hidden="true" />
        {t("workspace.manualSave")}
      </button>
    </div>
  );
}
