"use client";

import { FileDown, LoaderCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { AppSelect } from "@/components/ui/app-select";
import {
  buildReceiptData,
  createReceiptReference,
  getReceiptScopes,
} from "@/features/calculator/lib/receipt-data";
import { downloadReceiptPdf } from "@/features/calculator/lib/receipt-download";
import type {
  BlockDefinition,
  CalculationResult,
  CalculatorProjectData,
} from "@/features/calculator/types";
import { useI18n } from "@/lib/i18n";

interface Props {
  data: CalculatorProjectData;
  block: BlockDefinition;
  result?: CalculationResult;
}

function dailyReference(date: Date): string {
  const day = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, "0")))
    .join("");
  const key = `rek-receipt-sequence-${day}`;
  let sequence = 1;

  try {
    const previous = Number(window.localStorage.getItem(key));
    sequence = Number.isInteger(previous) && previous >= 1 ? previous + 1 : 1;
    window.localStorage.setItem(key, String(sequence));
  } catch {
    // Local storage is optional. The timestamp still produces a practical ID.
  }

  return createReceiptReference(date, sequence);
}

export function PrintReport({ data, block, result }: Props) {
  const { t } = useI18n();
  const scopes = useMemo(() => getReceiptScopes(data), [data]);
  const [scopeId, setScopeId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const selectedScope = scopes.find((scope) => scope.id === scopeId) ?? scopes[0];

  const generate = async () => {
    if (!result || !selectedScope || isGenerating) return;
    setIsGenerating(true);
    setMessage(t("common.loading"));

    try {
      const generatedAt = new Date();
      const receipt = buildReceiptData(data, block, {
        scopeId: selectedScope.id,
        generatedAt,
        reference: dailyReference(generatedAt),
      });
      const size = await downloadReceiptPdf(receipt);
      setMessage(`PDF دروستکرا (${new Intl.NumberFormat("en-US").format(size)} bytes).`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "دروستکردنی PDF سەرکەوتوو نەبوو.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2" aria-live="polite">
      {scopes.length > 1 ? (
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[#0F2053]/25 bg-white px-2 text-sm font-semibold text-[#0F2053]">
          <span>بەشی پسووڵە</span>
          <AppSelect
            value={selectedScope?.id ?? ""}
            onChange={(event) => setScopeId(event.target.value)}
            className="h-9 max-w-44 rounded-md border border-[#0F2053]/25 bg-[#EDE6CC]/45 px-2 text-sm text-slate-950"
            aria-label="بەشی پسووڵە"
          >
            {scopes.map((scope) => (
              <option key={scope.id} value={scope.id}>
                {scope.label}
              </option>
            ))}
          </AppSelect>
        </label>
      ) : null}
      <button
        type="button"
        onClick={generate}
        disabled={!result || !selectedScope || isGenerating}
        title={!result ? "سەرەتا حیساب بکە." : undefined}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0F2053] px-3 text-sm font-bold text-[#EDE6CC] shadow-sm transition hover:bg-[#0b1840] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGenerating ? (
          <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />
        ) : (
          <FileDown size={18} aria-hidden="true" />
        )}
        PDF پسووڵە
      </button>
      {message ? (
        <span className="w-full text-left text-xs text-slate-600 sm:w-auto" dir="rtl" role="status">
          {message}
        </span>
      ) : null}
    </div>
  );
}
