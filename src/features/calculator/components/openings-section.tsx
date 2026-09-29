import { Plus, Trash2 } from "lucide-react";

import { AppSelect } from "@/components/ui/app-select";
import { LengthField } from "@/components/ui/length-field";
import { NumberField } from "@/components/ui/number-field";
import {
  constrainPosition,
  constrainSillHeight,
  isHorizontalPositionValid,
  isSillHeightValid,
} from "@/features/calculator/lib/opening-placement";
import type { OpeningInput } from "@/features/calculator/types";
import { useI18n } from "@/lib/i18n";

export interface OpeningWallOption {
  id: string;
  name: string;
  length: number;
  height: number;
}

interface OpeningsSectionProps {
  kind: "door" | "window" | "other" | "deduction";
  prefix: string;
  openings: OpeningInput[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (
    id: string,
    field: keyof Omit<OpeningInput, "id">,
    value: string,
  ) => void;
  showValidation: boolean;
  /** Available room walls for quick-mode openings. */
  wallOptions?: OpeningWallOption[];
  /** A wall-section owns its openings, so its assignment cannot change here. */
  lockedWallId?: string;
}

const content = {
  door: { heading: "دەرگاکان", add: "زیادکردنی دەرگا", item: "دەرگا" },
  window: {
    heading: "پەنجەرەکان",
    add: "زیادکردنی پەنجەرە",
    item: "پەنجەرە",
  },
  other: { heading: "کراوەی تر", add: "زیادکردنی کراوە", item: "کراوە" },
  deduction: {
    heading: "کەمکردنەوەکانی دیوار",
    add: "زیادکردنی کەمکردنەوە",
    item: "کەمکردنەوە",
  },
} as const;

function valid(value: string, whole = false): boolean {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && (!whole || Number.isInteger(number));
}

function asNumber(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function OpeningsSection({
  kind,
  prefix,
  openings,
  onAdd,
  onRemove,
  onChange,
  showValidation,
  wallOptions = [],
  lockedWallId,
}: OpeningsSectionProps) {
  const { t } = useI18n();
  const text = {
    heading: t(`openings.${kind}`) || content[kind].heading,
    add: t(kind === "door" ? "openings.addDoor" : kind === "window" ? "openings.addWindow" : kind === "other" ? "openings.addOther" : "openings.addDeduction"),
    item: t(`openings.${kind}`),
  };
  const supportsPlacement = kind === "door" || kind === "window";

  const wallFor = (opening: OpeningInput): OpeningWallOption | undefined =>
    wallOptions.find((wall) => wall.id === (opening.wallId || lockedWallId)) ??
    wallOptions[0];

  const syncDimension = (
    opening: OpeningInput,
    field: "width" | "height",
    value: string,
  ) => {
    const wall = wallFor(opening);
    const numericValue = asNumber(value);
    const fittedValue =
      value !== "" && wall && (field === "width" ? wall.length : wall.height) > 0
        ? String(Math.min(numericValue, field === "width" ? wall.length : wall.height))
        : value;
    onChange(opening.id, field, fittedValue);
  };

  const changeWall = (opening: OpeningInput, wallId: string) => {
    onChange(opening.id, "wallId", wallId);
  };

  return (
    <section className="border-t border-slate-200 pt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-slate-900">{text.heading}</h3>
        <button
          type="button"
          onClick={onAdd}
          className="form-add-button inline-flex min-h-11 items-center gap-1 rounded-lg border bg-white px-3 text-sm font-semibold"
        >
          <Plus size={16} /> {text.add}
        </button>
      </div>
      {openings.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{t("openings.none", { label: text.heading })}</p>
      ) : null}
      <div className="mt-3 space-y-3">
        {openings.map((opening, index) => {
          const wall = wallFor(opening);
          const positionInvalid =
            showValidation &&
            opening.horizontalPosition !== "" &&
            wall !== undefined &&
            !isHorizontalPositionValid(
              asNumber(opening.horizontalPosition),
              asNumber(opening.width),
              wall.length,
            );
          const sillInvalid =
            showValidation &&
            kind === "window" &&
            opening.sillHeight !== "" &&
            wall !== undefined &&
            !isSillHeightValid(
              asNumber(opening.sillHeight),
              asNumber(opening.height),
              wall.height,
            );
          return (
            <div key={opening.id} className="opening-card rounded-xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-800">
                  {text.item} {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(opening.id)}
                  className="form-delete-button grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-red-100 hover:text-red-700"
                  aria-label={`${t("common.delete")} ${text.item} ${index + 1}`}
                >
                  <Trash2 size={17} />
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-4">
                <div className="form-field">
                  <label
                    htmlFor={`${prefix}-${kind}-${opening.id}-name`}
                    className="form-label"
                  >
                    {t("common.name")}
                  </label>
                  <input
                    id={`${prefix}-${kind}-${opening.id}-name`}
                    value={opening.name}
                    onChange={(event) =>
                      onChange(opening.id, "name", event.target.value)
                    }
                    dir="ltr"
                    className="form-control form-control--text-ltr px-3"
                  />
                </div>
                <LengthField
                  id={`${prefix}-${kind}-${opening.id}-width`}
                  label={t("common.width")}
                  value={opening.width}
                  unit={opening.widthUnit}
                  onChange={(value) => syncDimension(opening, "width", value)}
                  onUnitChange={(unit) => onChange(opening.id, "widthUnit", unit)}
                  invalid={showValidation && !valid(opening.width)}
                />
                <LengthField
                  id={`${prefix}-${kind}-${opening.id}-height`}
                  label={t("common.height")}
                  value={opening.height}
                  unit={opening.heightUnit}
                  onChange={(value) => syncDimension(opening, "height", value)}
                  onUnitChange={(unit) => onChange(opening.id, "heightUnit", unit)}
                  invalid={showValidation && !valid(opening.height)}
                />
                <NumberField
                  id={`${prefix}-${kind}-${opening.id}-quantity`}
                  label={t("common.quantity")}
                  value={opening.quantity}
                  onChange={(value) => onChange(opening.id, "quantity", value)}
                  wholeNumber
                  invalid={showValidation && !valid(opening.quantity, true)}
                />
              </div>
              {supportsPlacement ? (
                <div className="opening-placement mt-4 rounded-xl border p-4">
                  <p className="mb-4 text-xs font-semibold leading-5 text-slate-600">
                    {t("openings.positionHelp")}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-4">
                    {wallOptions.length > 1 ? (
                      <div className="form-field">
                        <label
                          htmlFor={`${prefix}-${kind}-${opening.id}-wall`}
                          className="form-label"
                        >
                          {t("common.wall")}
                        </label>
                        <AppSelect
                          data-select-kind="wall"
                          id={`${prefix}-${kind}-${opening.id}-wall`}
                          value={opening.wallId || wallOptions[0]?.id || ""}
                          onChange={(event) => changeWall(opening, event.target.value)}
                          className="h-[3.25rem] w-full rounded-xl px-3 text-sm"
                        >
                          {wallOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </AppSelect>
                      </div>
                    ) : wall ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <span className="block text-xs font-semibold text-slate-500">{t("common.wall")}</span>
                        <span className="mt-1 block text-sm font-bold text-slate-800">{wall.name}</span>
                      </div>
                    ) : null}
                    <LengthField
                      id={`${prefix}-${kind}-${opening.id}-horizontal-position`}
                      label={t("openings.position")}
                      value={opening.horizontalPosition}
                      unit={opening.horizontalPositionUnit}
                      onChange={(value) =>
                        onChange(
                          opening.id,
                          "horizontalPosition",
                          wall
                            ? constrainPosition(value, asNumber(opening.width), wall.length)
                            : value,
                        )
                      }
                      onUnitChange={(unit) =>
                        onChange(opening.id, "horizontalPositionUnit", unit)
                      }
                      invalid={positionInvalid}
                    />
                    {kind === "window" ? (
                      <LengthField
                        id={`${prefix}-${kind}-${opening.id}-sill-height`}
                        label={t("openings.sillHeight")}
                        value={opening.sillHeight}
                        unit={opening.sillHeightUnit}
                        onChange={(value) =>
                          onChange(
                            opening.id,
                            "sillHeight",
                            wall
                              ? constrainSillHeight(value, asNumber(opening.height), wall.height)
                              : value,
                          )
                        }
                        onUnitChange={(unit) =>
                          onChange(opening.id, "sillHeightUnit", unit)
                        }
                        invalid={sillInvalid}
                      />
                    ) : (
                      <p className="form-helper self-end pb-1">
                        {t("openings.doorGround")}
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
