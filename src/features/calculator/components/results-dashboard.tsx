"use client";

import { AlertTriangle, CheckCircle2, WalletCards } from "lucide-react";
import { useState } from "react";
import type { CalculationResult } from "@/features/calculator/types";
import { useI18n } from "@/lib/i18n";
import { formatMoney } from "@/lib/currency";
import {
  convertArea,
  convertVolume,
  volumeUnits,
  type AreaUnit,
  type VolumeUnit,
} from "@/lib/units";

export function ResultsDashboard({ result, error }: { result?: CalculationResult; error?: string }) {
  const { t, formatNumber } = useI18n();
  const [areaUnit, setAreaUnit] = useState<AreaUnit>("m²");
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>("m³");
  const areas: Array<[string, number]> = result
    ? [[t("results.gross"), result.grossWallArea], [t("results.openings"), result.totalOpeningArea], [t("results.deductions"), result.totalStructuralDeductionArea], [t("results.net"), result.netWallArea]]
    : [];
  const number = (value: number) => formatNumber(value, { maximumFractionDigits: 2 });
  const costRows = result?.cost
    ? [
        result.cost.recommendedTotalCost > 0 ? [t("results.blockCost"), result.cost.recommendedTotalCost] : null,
        result.cost.mortarCost > 0 ? [t("options.mortarCost"), result.cost.mortarCost] : null,
        result.cost.laborCost > 0 ? [t("options.labour"), result.cost.laborCost] : null,
        result.cost.transportCost > 0 ? [t("options.transport"), result.cost.transportCost] : null,
        result.cost.otherCost > 0 ? [result.cost.otherCostLabel || t("options.otherCost"), result.cost.otherCost] : null,
      ].filter((row): row is [string, number] => row !== null)
    : [];

  return (
    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-live="polite">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-lg bg-amber-100 text-amber-800"><CheckCircle2 size={20} /></span>
        <h2 className="text-xl font-bold text-slate-950">{t("results.heading")}</h2>
      </div>
      {error ? <div className="mt-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert"><AlertTriangle size={19} /><p>{error}</p></div> : null}
      {!result && !error ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{t("results.empty")}</p> : null}
      {result ? <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <label htmlFor="result-area-unit" className="text-sm font-semibold">{t("results.areaUnit")}</label>
          <select id="result-area-unit" value={areaUnit} onChange={(event) => setAreaUnit(event.target.value as AreaUnit)} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm">
            <option value="m²">m²</option><option value="cm²">cm²</option><option value="mm²">mm²</option>
          </select>
        </div>
        <dl className="divide-y divide-slate-100 border-y border-slate-100">
          {areas.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 py-3.5"><dt className="text-sm text-slate-600">{label}</dt><dd className="shrink-0 font-bold" dir="ltr">{number(convertArea(value, "m²", areaUnit))} {areaUnit}</dd></div>)}
          <div className="flex items-center justify-between gap-4 py-3.5"><dt className="text-sm text-slate-600">{t("results.required")}</dt><dd className="font-bold">{formatNumber(result.requiredBlocks, { maximumFractionDigits: 0 })}</dd></div>
          {result.wastePercentage > 0 ? <div className="flex items-center justify-between gap-4 py-3.5"><dt className="text-sm text-slate-600">{t("results.waste", { value: `${number(result.wastePercentage)}%` })}</dt><dd className="font-bold">{formatNumber(result.wasteBlocks, { maximumFractionDigits: 0 })}</dd></div> : null}
        </dl>
        <div className="mt-5 rounded-xl bg-slate-900 p-5 text-white"><p className="text-sm text-slate-300">{t("results.recommended")}</p><p className="mt-2 text-4xl font-bold">{formatNumber(result.recommendedBlocks, { maximumFractionDigits: 0 })}</p></div>
        {result.cost && result.cost.grandTotal > 0 ? <div className="mt-3 rounded-xl border border-[#0F2053]/15 bg-[#EDE6CC]/55 p-4"><p className="text-sm font-semibold text-[#0F2053]">{t("results.totalCost")}</p><p className="mt-1 text-2xl font-bold text-[#0F2053]" dir="ltr">{formatMoney(result.cost.grandTotal, result.cost.currency)}</p></div> : null}
        {result.cost && costRows.length > 0 ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-center gap-2 text-amber-900"><WalletCards size={19} /><h3 className="font-bold">{t("results.cost")}</h3></div><dl className="mt-3 space-y-2 text-sm">{costRows.map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd dir="ltr">{formatMoney(value, result.cost!.currency)}</dd></div>)}<div className="flex justify-between gap-3 border-t border-amber-200 pt-2 font-bold"><dt>{t("results.totalCost")}</dt><dd dir="ltr">{formatMoney(result.cost.grandTotal, result.cost.currency)}</dd></div></dl></div> : null}
        {result.mortar ? <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm"><div className="flex flex-wrap items-center gap-2"><label htmlFor="result-volume-unit" className="font-bold">{t("results.estimatedMortar")}</label><select id="result-volume-unit" value={volumeUnit} onChange={(event) => setVolumeUnit(event.target.value as VolumeUnit)} className="rounded border border-slate-300 px-2 py-1">{volumeUnits.map((unit) => <option key={unit}>{unit}</option>)}</select></div><p className="mt-2" dir="ltr">{number(convertVolume(result.mortar.estimatedVolumeM3, "m³", volumeUnit))} {volumeUnit}</p></div> : null}
      </div> : null}
    </aside>
  );
}
