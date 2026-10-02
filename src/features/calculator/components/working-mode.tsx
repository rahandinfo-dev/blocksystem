import type { CalculatorSettings } from "@/features/calculator/types";
import { useI18n } from "@/lib/i18n";

interface WorkingModeProps {
  mode: CalculatorSettings["interfaceMode"];
  onChange: (mode: CalculatorSettings["interfaceMode"]) => void;
}

export function WorkingMode({ mode, onChange }: WorkingModeProps) {
  const { t } = useI18n();

  return (
    <section className="workspace-card p-5" aria-labelledby="working-mode-heading">
      <h2 id="working-mode-heading" className="font-bold text-slate-950">{t("workMode.heading")}</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">{t("workMode.description")}</p>
      <div className="segmented-control mt-3">
        <button
          type="button"
          onClick={() => onChange("quick")}
          aria-pressed={mode === "quick"}
          className="segment"
        >
          <span className="block font-semibold">{t("workMode.quick")}</span>
          <span className="mt-1 block text-xs font-normal leading-5 text-slate-600">{t("workMode.quickDescription")}</span>
        </button>
        <button
          type="button"
          onClick={() => onChange("advanced")}
          aria-pressed={mode === "advanced"}
          className="segment"
        >
          <span className="block font-semibold">{t("workMode.advanced")}</span>
          <span className="mt-1 block text-xs font-normal leading-5 text-slate-600">{t("workMode.advancedDescription")}</span>
        </button>
      </div>
      <div className="mt-4 border-t border-slate-200 pt-3">
        <h3 className="text-sm font-semibold text-slate-800">{t("workMode.comparisonTitle")}</h3>
        <p className="mt-2 text-xs leading-5 text-slate-500">{t("workMode.comparisonDescription")}</p>
        <div className="mt-3 grid gap-3 text-xs leading-5 text-slate-600 sm:grid-cols-2">
          <div>
            <p className="font-semibold text-slate-800">{t("workMode.quick")}</p>
            <ul className="mt-1 list-disc space-y-1 ps-5">
              <li>{t("workMode.quickFeatureOne")}</li>
              <li>{t("workMode.quickFeatureTwo")}</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-800">{t("workMode.advanced")}</p>
            <ul className="mt-1 list-disc space-y-1 ps-5">
              <li>{t("workMode.advancedFeatureOne")}</li>
              <li>{t("workMode.advancedFeatureTwo")}</li>
              <li>{t("workMode.advancedFeatureThree")}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
