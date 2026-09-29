"use client";

import type { LengthUnit } from "@/lib/units";
import { convertLength } from "@/lib/units";
import { AppSelect } from "./app-select";
import { useI18n } from "@/lib/i18n";

interface LengthFieldProps {
  id: string;
  label: string;
  value: string;
  unit: LengthUnit;
  onChange: (metres: string) => void;
  onUnitChange: (unit: LengthUnit) => void;
  invalid?: boolean;
}

const labels: Record<LengthUnit, string> = {
  mm: "میلیمەتەر",
  cm: "سانتیمەتەر",
  m: "مەتر",
};

function displayValue(value: string, unit: LengthUnit): string {
  if (value === "") return "";
  const converted = convertLength(Number(value), "m", unit);
  return Number.isFinite(converted) ? String(Number(converted.toFixed(8))) : "";
}

export function LengthField({
  id,
  label,
  value,
  unit,
  onChange,
  onUnitChange,
  invalid = false,
}: LengthFieldProps) {
  const { t } = useI18n();
  const update = (raw: string) => {
    const normalized = raw.replace(/,/g, "");
    if (!/^\d*(\.\d*)?$/.test(normalized)) return;
    if (normalized === "" || normalized === ".") {
      onChange("");
      return;
    }
    const metres = convertLength(Number(normalized), unit, "m");
    onChange(Number.isFinite(metres) ? String(metres) : "");
  };

  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">{label}</label>
      <div className="dimension-group">
        <input
          id={id}
          value={displayValue(value, unit)}
          onChange={(event) => update(event.target.value)}
          inputMode="decimal"
          type="text"
          dir="ltr"
          aria-invalid={invalid}
          className={`form-control form-control--numeric px-3 ${invalid ? "border-red-400" : ""}`}
        />
        <AppSelect
          data-select-kind="unit"
          aria-label={`${label} ${t("common.name")}`}
          value={unit}
          onChange={(event) => onUnitChange(event.target.value as LengthUnit)}
          className="h-[3.25rem] w-full rounded-xl px-3 text-sm"
        >
          <option value="m">{labels.m}</option>
          <option value="cm">{labels.cm}</option>
          <option value="mm">{labels.mm}</option>
        </AppSelect>
      </div>
      {invalid ? <p className="form-helper text-red-700">{t("validation.value")}</p> : null}
    </div>
  );
}
