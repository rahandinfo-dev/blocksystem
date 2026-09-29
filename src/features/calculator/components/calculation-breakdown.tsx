import { ChevronDown } from "lucide-react";
import type { CalculationResult } from "@/features/calculator/types";
import { useI18n } from "@/lib/i18n";

export function CalculationBreakdown({ result }: { result?: CalculationResult }) {
  const { t, formatNumber } = useI18n();
  if (!result) return null;
  const area = (value: number) => formatNumber(value, { maximumFractionDigits: 2 });
  const integer = (value: number) => formatNumber(value, { maximumFractionDigits: 0 });
  return <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-lg font-bold text-slate-950">{t("breakdown.heading")} <ChevronDown size={20} aria-hidden="true" /></summary><div className="mt-5 space-y-3 text-sm leading-7 text-slate-700"><p>{t("results.gross")} = <strong dir="ltr">{area(result.grossWallArea)} m²</strong></p><p>{t("results.openings")} = <strong dir="ltr">{area(result.totalOpeningArea)} m²</strong></p><p>{t("results.net")} = <strong dir="ltr">{area(result.netWallArea)} m²</strong></p><p>{t("breakdown.blockFace")} = <strong dir="ltr">{area(result.blockFaceArea)} m²</strong></p><p>{t("results.net")} ÷ {t("breakdown.blockFace")} = <strong>{integer(result.requiredBlocks)}</strong> ({t("breakdown.rounded")})</p><p>{t("results.waste", { value: `${area(result.wastePercentage)}%` })} = <strong>{integer(result.wasteBlocks)}</strong></p><p className="border-t border-slate-200 pt-3 text-base font-bold text-slate-950">{t("results.recommended")} = {integer(result.recommendedBlocks)}</p><div className="border-t border-slate-200 pt-4"><h3 className="font-bold text-slate-900">{t("breakdown.unitDetails")}</h3><ul className="mt-2 space-y-2">{result.units.map((unit, index) => <li key={unit.id} className="flex justify-between gap-3"><span>{unit.name || `${t("common.name")} ${index + 1}`}</span><span dir="ltr">{area(unit.grossWallArea)} − {area(unit.totalOpeningArea)} = {area(unit.netWallArea)} m²</span></li>)}</ul></div></div></details>;
}
