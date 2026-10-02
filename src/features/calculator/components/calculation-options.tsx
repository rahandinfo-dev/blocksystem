"use client";
import { Coins } from "lucide-react";
import { useState } from "react";
import { BlockDimensionField } from "@/components/ui/block-dimension-field";
import { CurrencyField } from "@/components/ui/currency-field";
import { NumberField } from "@/components/ui/number-field";
import type { CalculatorSettings } from "@/features/calculator/types";
import { useI18n } from "@/lib/i18n";
import { currencyOptions } from "@/lib/currency";
import {
  areaUnits,
  convertArea,
  convertLength,
  convertVolume,
  lengthUnits,
  volumeUnits,
  type AreaUnit,
  type LengthUnit,
  type VolumeUnit,
} from "@/lib/units";

interface Props {
  settings: CalculatorSettings;
  onChange: (next: CalculatorSettings) => void;
  showValidation: boolean;
}
export function CalculationOptions({
  settings,
  onChange,
  showValidation,
}: Props) {
  const { t } = useI18n();
  const update = (patch: Partial<CalculatorSettings>) =>
    onChange({ ...settings, ...patch });
  const currencyLabel = settings.currency === "USD" ? "USD" : "IQD";
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold text-slate-950">
        {t("options.heading")}
      </h2>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <p id="waste-preset-label" className="block font-bold">{t("options.waste")}</p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4" role="group" aria-labelledby="waste-preset-label">
            {(["0", "3", "5", "7", "7.5", "10", "15", "custom"] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={settings.wastePreset === preset}
                onClick={() => update({ wastePreset: preset })}
                className={`min-h-11 rounded-lg border px-2 text-sm font-bold transition ${settings.wastePreset === preset ? "border-[#0F2053] bg-[#0F2053] text-[#EDE6CC]" : "border-slate-300 bg-white text-[#0F2053] hover:bg-[#EDE6CC]/45"}`}
              >
                {preset === "custom" ? t("options.customWaste") : `${preset}%`}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{t("options.wasteDescription")}</p>
          {settings.wastePreset === "custom" ? (
            <div className="mt-3">
              <NumberField
                id="custom-waste"
                label={t("options.customWaste")}
                value={settings.customWastePercentage}
                onChange={(value) => update({ customWastePercentage: value })}
                unit="%"
              />
            </div>
          ) : null}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Coins size={19} className="text-amber-700" />
            <h3 className="font-bold">{t("options.cost")}</h3>
          </div>
          <label htmlFor="currency" className="mb-2 mt-2 block text-sm font-semibold">
            {t("common.currency")}
          </label>
          <select
            id="currency"
            value={settings.currency}
            onChange={(event) =>
              update({
                currency: event.target.value as CalculatorSettings["currency"],
              })
            }
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3"
          >
            {currencyOptions.map((currency) => (
              <option key={currency.value} value={currency.value}>
                {currency.label}
              </option>
            ))}
          </select>
          <div className="mt-3">
            <CurrencyField
              id="unit-price"
              label={t("options.unitPrice")}
              value={settings.unitPrice}
              onChange={(value) => update({ unitPrice: value })}
              currencyLabel={currencyLabel}
              invalid={
                showValidation &&
                settings.unitPrice !== "" &&
                Number(settings.unitPrice) < 0
              }
            />
          </div>
        </div>
      </div>
      {settings.currency === "USD" ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-bold">{t("options.exchange")}</h3>
          <p className="mt-1 text-sm">{t("options.exchangeHint")}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <CurrencyField
              id="exchange-rate"
              label={t("options.usdIqd")}
              value={settings.exchangeRateIqdPerUsd}
              onChange={(value) => update({ exchangeRateIqdPerUsd: value })}
              currencyLabel="IQD"
            />
            <div>
              <label className="mb-2 block text-sm font-semibold">
                {t("common.source")}
              </label>
              <input
                value={settings.exchangeRateSource}
                onChange={(event) =>
                  update({ exchangeRateSource: event.target.value })
                }
                className="h-12 w-full rounded-xl border border-slate-300 px-3"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">
                {t("common.date")}
              </label>
              <input
                type="date"
                value={settings.exchangeRateUpdatedAt}
                onChange={(event) =>
                  update({ exchangeRateUpdatedAt: event.target.value })
                }
                className="h-12 w-full rounded-xl border border-slate-300 px-3"
              />
            </div>
          </div>
        </div>
      ) : null}
      <details className="mt-6 border-t border-slate-200 pt-5">
        <summary className="cursor-pointer font-bold">
          {t("options.extras")}
        </summary>
        <p className="mt-2 text-xs leading-5 text-slate-500">{t("options.materialCostDescription")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <CurrencyField
            id="transport"
            label={t("options.transport")}
            value={settings.transportCost}
            onChange={(value) => update({ transportCost: value })}
            currencyLabel={currencyLabel}
          />
          <CurrencyField
            id="labor"
            label={t("options.labour")}
            value={settings.laborCost}
            onChange={(value) => update({ laborCost: value })}
            currencyLabel={currencyLabel}
          />
          <div>
            <CurrencyField
              id="mortar-cost"
              label={t("options.mortarCost")}
              value={settings.mortarCost}
              onChange={(value) => update({ mortarCost: value })}
              currencyLabel={currencyLabel}
            />
            <p className="mt-1 text-xs leading-5 text-slate-500">{t("options.mortarCostDescription")}</p>
          </div>
          <CurrencyField
            id="other-cost"
            label={t("options.otherCost")}
            value={settings.otherCost}
            onChange={(value) => update({ otherCost: value })}
            currencyLabel={currencyLabel}
          />
        </div>
      </details>
      <details className="mt-6 border-t border-slate-200 pt-5">
        <summary className="cursor-pointer font-bold">
          {t("options.mortar")}
        </summary>
        <p className="mt-2 text-xs leading-5 text-slate-500">{t("options.mortarDescription")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.mortarEnabled}
              onChange={(event) =>
                update({ mortarEnabled: event.target.checked })
              }
            />{" "}
            {t("options.estimateMortar")}
          </label>
          {settings.mortarEnabled ? (
            <NumberField
              id="mortar-consumption"
              label={t("options.mortarConsumption")}
              value={settings.mortarConsumptionM3PerM2}
              onChange={(value) => update({ mortarConsumptionM3PerM2: value })}
            />
          ) : null}
          <div>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.mortarJointEnabled}
                onChange={(event) =>
                  update({ mortarJointEnabled: event.target.checked })
                }
              />{" "}
              {t("options.mortarJoint")}
            </label>
            <p className="mt-1 text-xs leading-5 text-slate-500">{t("options.jointDescription")}</p>
          </div>
          {settings.mortarJointEnabled ? (
            <div>
              <BlockDimensionField
                id="joint"
                label={t("options.jointWidth")}
                valueCm={Number(settings.mortarJointThicknessCm || 0)}
                unit={settings.mortarJointUnit}
                onChange={(value) =>
                  update({ mortarJointThicknessCm: String(value) })
                }
                onUnitChange={(unit) => update({ mortarJointUnit: unit })}
              />
              <p className="mt-1 text-xs leading-5 text-slate-500">{t("options.jointCalculationNote")}</p>
            </div>
          ) : null}
        </div>
      </details>
      <UnitConverter />
    </section>
  );
}
function UnitConverter() {
  const { t, formatNumber } = useI18n();
  const [value, setValue] = useState("1");
  const [kind, setKind] = useState<"length" | "area" | "volume">("length");
  const [fromLength, setFromLength] = useState<LengthUnit>("m");
  const [toLength, setToLength] = useState<LengthUnit>("cm");
  const [fromArea, setFromArea] = useState<AreaUnit>("m²");
  const [toArea, setToArea] = useState<AreaUnit>("cm²");
  const [fromVolume, setFromVolume] = useState<VolumeUnit>("m³");
  const [toVolume, setToVolume] = useState<VolumeUnit>("cm³");
  const result =
    kind === "length"
      ? convertLength(Number(value), fromLength, toLength)
      : kind === "area"
        ? convertArea(Number(value), fromArea, toArea)
        : convertVolume(Number(value), fromVolume, toVolume);
  const units =
    kind === "length" ? lengthUnits : kind === "area" ? areaUnits : volumeUnits;
  const from =
    kind === "length" ? fromLength : kind === "area" ? fromArea : fromVolume;
  const to = kind === "length" ? toLength : kind === "area" ? toArea : toVolume;
  const setFrom = (next: string) => {
    if (kind === "length") setFromLength(next as LengthUnit);
    else if (kind === "area") setFromArea(next as AreaUnit);
    else setFromVolume(next as VolumeUnit);
  };
  const setTo = (next: string) => {
    if (kind === "length") setToLength(next as LengthUnit);
    else if (kind === "area") setToArea(next as AreaUnit);
    else setToVolume(next as VolumeUnit);
  };
  return (
    <details className="mt-6 border-t border-slate-200 pt-5">
      <summary className="cursor-pointer font-bold">
        {t("converter.heading")}
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-5">
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as typeof kind)}
          className="h-12 rounded-xl border border-slate-300 px-3"
        >
          <option value="length">{t("converter.length")}</option>
          <option value="area">{t("converter.area")}</option>
          <option value="volume">{t("converter.volume")}</option>
        </select>
        <NumberField
          id="converter-value"
          label={t("converter.value")}
          value={value}
          onChange={setValue}
        />
        <select
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          className="h-12 self-end rounded-xl border border-slate-300 px-3"
        >
          {units.map((unit) => (
            <option key={unit}>{unit}</option>
          ))}
        </select>
        <select
          value={to}
          onChange={(event) => setTo(event.target.value)}
          className="h-12 self-end rounded-xl border border-slate-300 px-3"
        >
          {units.map((unit) => (
            <option key={unit}>{unit}</option>
          ))}
        </select>
        <output
          className="self-end rounded-xl bg-slate-100 px-3 py-3 text-center font-bold"
          dir="ltr"
        >
          {Number.isFinite(result)
            ? formatNumber(result, { maximumFractionDigits: 6 })
            : "—"}{" "}
          {to}
        </output>
      </div>
    </details>
  );
}
