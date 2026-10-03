"use client";

import { useI18n } from "@/lib/i18n";

interface NumberFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  wholeNumber?: boolean;
  invalid?: boolean;
}

function normalizeNumber(value: string): string {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

  return value
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace("٫", ".");
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  unit,
  wholeNumber = false,
  invalid = false,
}: NumberFieldProps) {
  const { t } = useI18n();
  const handleChange = (nextValue: string) => {
    const normalized = normalizeNumber(nextValue);
    const pattern = wholeNumber ? /^\d*$/ : /^\d*(\.\d*)?$/;
    if (pattern.test(normalized)) onChange(normalized);
  };

  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">{label}</label>
      <div className={`field-with-affix ${unit ? "field-with-affix--unit" : ""}`}>
        <input
          id={id}
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          inputMode={wholeNumber ? "numeric" : "decimal"}
          type="text"
          dir="ltr"
          aria-invalid={invalid}
          className={`field-with-affix__input form-control form-control--numeric px-3 ${unit ? "pl-14" : ""} ${invalid ? "border-red-400" : ""}`}
        />
        {unit ? (
          <span className="field-affix pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500" dir="ltr">
            {unit}
          </span>
        ) : null}
      </div>
      {invalid ? <p className="form-helper text-red-700">{t("validation.number")}</p> : null}
    </div>
  );
}
