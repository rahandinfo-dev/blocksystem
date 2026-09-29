import { House, PanelsTopLeft } from "lucide-react";

import type { CalculationMode } from "@/features/calculator/types";

interface ModeSwitcherProps { mode: CalculationMode; onChange: (mode: CalculationMode) => void; }

export function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="calculation-mode-heading">
      <h2 id="calculation-mode-heading" className="text-lg font-bold text-slate-950">شێوازی حیساب</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button type="button" onClick={() => onChange("rooms")} aria-pressed={mode === "rooms"} className={`min-h-20 rounded-xl border p-3 text-right outline-none focus:ring-2 focus:ring-amber-500/40 ${mode === "rooms" ? "border-amber-600 bg-amber-50 text-amber-950" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}>
          <House size={19} aria-hidden="true" /><span className="mr-2 font-bold">حیسابی ژوور</span>
        </button>
        <button type="button" onClick={() => onChange("walls")} aria-pressed={mode === "walls"} className={`min-h-20 rounded-xl border p-3 text-right outline-none focus:ring-2 focus:ring-amber-500/40 ${mode === "walls" ? "border-amber-600 bg-amber-50 text-amber-950" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}>
          <PanelsTopLeft size={19} aria-hidden="true" /><span className="mr-2 font-bold">حیسابی دیوار</span>
        </button>
      </div>
    </section>
  );
}
