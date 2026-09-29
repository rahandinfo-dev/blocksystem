"use client";

import { useRef } from "react";
import { formatMoneyInput } from "@/lib/currency";

interface CurrencyFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  currencyLabel: string;
  invalid?: boolean;
}

/** The model receives an unformatted numeric string; commas are display-only. */
export function CurrencyField({
  id,
  label,
  value,
  onChange,
  currencyLabel,
  invalid = false,
}: CurrencyFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const change = (next: string, position: number | null) => {
    const raw = next.replace(/,/g, "");
    if (!/^\d*(\.\d*)?$/.test(raw)) return;
    onChange(raw);
    const digitsBefore = (next.slice(0, position ?? next.length).match(/[\d.]/g) ?? []).length;

    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      const formatted = formatMoneyInput(raw);
      let seen = 0;
      let target = formatted.length;
      for (let index = 0; index < formatted.length; index += 1) {
        if (/[\d.]/.test(formatted[index])) seen += 1;
        if (seen === digitsBefore) {
          target = index + 1;
          break;
        }
      }
      input.setSelectionRange(target, target);
    });
  };

  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          dir="ltr"
          inputMode="decimal"
          aria-invalid={invalid}
          value={formatMoneyInput(value)}
          onChange={(event) => change(event.target.value, event.target.selectionStart)}
          className={`form-control form-control--numeric px-3 pl-20 ${invalid ? "border-red-400" : ""}`}
        />
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500" dir="ltr">
          {currencyLabel}
        </span>
      </div>
      {invalid ? <p className="form-helper text-red-700">تکایە نرخێکی دروست بنووسە.</p> : null}
    </div>
  );
}
