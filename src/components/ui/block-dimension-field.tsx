"use client";

import type { LengthUnit } from "@/lib/units";
import { convertLength } from "@/lib/units";
import { AppSelect } from "./app-select";

interface Props {
  id: string;
  label: string;
  valueCm: number;
  unit: LengthUnit;
  onChange: (cm: number) => void;
  onUnitChange: (unit: LengthUnit) => void;
  invalid?: boolean;
}

export function BlockDimensionField({
  id,
  label,
  valueCm,
  unit,
  onChange,
  onUnitChange,
  invalid,
}: Props) {
  const shown = convertLength(valueCm, "cm", unit);

  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">{label}</label>
      <div className="compound-field">
        <input
          id={id}
          value={Number.isFinite(shown) ? String(Number(shown.toFixed(8))) : ""}
          onChange={(event) => {
            const raw = event.target.value;
            if (/^\d*(\.\d*)?$/.test(raw) && raw !== "") {
              onChange(convertLength(Number(raw), unit, "cm"));
            }
            if (raw === "") onChange(0);
          }}
          inputMode="decimal"
          dir="ltr"
          aria-invalid={invalid}
          className={`compound-field__value form-control form-control--numeric px-3 ${invalid ? "border-red-400" : ""}`}
        />
        <AppSelect
          data-select-kind="unit"
          dir="ltr"
          value={unit}
          onChange={(event) => onUnitChange(event.target.value as LengthUnit)}
          className="compound-field__unit h-[3.25rem] w-full rounded-xl px-3 text-sm"
        >
          <option value="mm">mm</option>
          <option value="cm">cm</option>
          <option value="m">m</option>
        </AppSelect>
      </div>
    </div>
  );
}
