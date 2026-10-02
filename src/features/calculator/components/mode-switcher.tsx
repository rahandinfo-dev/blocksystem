import { House, PanelsTopLeft } from "lucide-react";

import type { CalculationMode } from "@/features/calculator/types";
import { useI18n } from "@/lib/i18n";

interface ModeSwitcherProps { mode: CalculationMode; onChange: (mode: CalculationMode) => void; }

export function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  const { t } = useI18n();
  return (
    <section className="workspace-card p-5" aria-labelledby="calculation-mode-heading">
      <h2 id="calculation-mode-heading" className="text-lg font-bold text-slate-950">{t("mode.heading")}</h2>
      <div className="segmented-control mt-3">
        <button type="button" onClick={() => onChange("rooms")} aria-pressed={mode === "rooms"} className="segment outline-none">
          <House size={19} aria-hidden="true" /><span className="ms-2 font-bold">{t("mode.rooms")}</span>
        </button>
        <button type="button" onClick={() => onChange("walls")} aria-pressed={mode === "walls"} className="segment outline-none">
          <PanelsTopLeft size={19} aria-hidden="true" /><span className="ms-2 font-bold">{t("mode.walls")}</span>
        </button>
      </div>
    </section>
  );
}
