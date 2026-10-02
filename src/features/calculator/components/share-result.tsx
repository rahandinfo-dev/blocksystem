"use client";

import { Copy, Share2 } from "lucide-react";
import { useState } from "react";
import { formatMoney } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";
import { buildShareSummary, shareSummary } from "@/features/calculator/lib/share-result";
import type { CalculationResult, CalculatorProjectData } from "@/features/calculator/types";

export function ShareResult({ data, result }: { data: CalculatorProjectData; result?: CalculationResult }) {
  const { t } = useI18n();
  const [status, setStatus] = useState<"" | "shared" | "copied" | "failed">("");
  const supportsNativeShare = typeof navigator !== "undefined" && typeof (navigator as { share?: unknown }).share === "function";
  const share = async () => {
    if (!result) return;
    const summary = buildShareSummary(data, result, {
      blocks: t("share.blocks"), netArea: t("share.netArea"), mortar: t("share.mortar"), total: t("share.total"), measurement: t("share.measurement"),
    }, formatMoney);
    try {
      const outcome = await shareSummary(data.metadata.projectName.trim() || "BlockSystem", summary, navigator);
      setStatus(outcome);
    } catch {
      setStatus("failed");
    }
  };
  return <div className="flex flex-wrap items-center gap-2" aria-live="polite">
    <button type="button" onClick={() => void share()} disabled={!result} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#0F2053]/25 bg-white px-3 text-sm font-semibold text-[#0F2053] disabled:cursor-not-allowed disabled:opacity-50">
      {supportsNativeShare ? <Share2 size={17} /> : <Copy size={17} />}
      {t("share.action")}
    </button>
    {status ? <span className={`text-xs ${status === "failed" ? "text-red-700" : "text-emerald-700"}`} role="status">{t(`share.${status}`)}</span> : null}
  </div>;
}
