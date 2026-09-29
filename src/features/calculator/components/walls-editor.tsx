import { Plus, Trash2 } from "lucide-react";

import { LengthField } from "@/components/ui/length-field";
import type { OpeningInput, WallInput } from "@/features/calculator/types";
import { OpeningsSection, type OpeningWallOption } from "./openings-section";
import { useI18n } from "@/lib/i18n";

interface WallsEditorProps {
  walls: WallInput[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onWallChange: (
    id: string,
    field: keyof Pick<WallInput, "name" | "length" | "height" | "lengthUnit" | "heightUnit">,
    value: string,
  ) => void;
  onOpeningChange: (
    wallId: string,
    kind: "doors" | "windows",
    openingId: string,
    field: keyof Omit<OpeningInput, "id">,
    value: string,
  ) => void;
  onOpeningAdd: (wallId: string, kind: "doors" | "windows") => void;
  onOpeningRemove: (wallId: string, kind: "doors" | "windows", openingId: string) => void;
  showValidation: boolean;
}

function metres(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function WallsEditor(props: WallsEditorProps) {
  const { t } = useI18n();
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-950">{t("walls.heading")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("walls.description")}</p>
        </div>
        <button
          type="button"
          onClick={props.onAdd}
          className="form-add-button inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border bg-white px-3 text-sm font-semibold"
        >
          <Plus size={17} /> {t("walls.add")}
        </button>
      </div>
      <div className="mt-5 space-y-5">
        {props.walls.map((wall, index) => {
          const option: OpeningWallOption = {
            id: wall.id,
            name: wall.name.trim() || `دیوار ${index + 1}`,
            length: metres(wall.length),
            height: metres(wall.height),
          };
          return (
            <article key={wall.id} className="rounded-xl border border-slate-200 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-bold text-slate-950">{option.name}</h3>
                <button
                  type="button"
                  disabled={props.walls.length === 1}
                  onClick={() => props.onRemove(wall.id)}
                  className="form-delete-button grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                  aria-label={t("walls.delete")}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div className="form-field">
                  <label className="form-label">{t("walls.name")}</label>
                  <input
                    value={wall.name}
                    onChange={(event) => props.onWallChange(wall.id, "name", event.target.value)}
                    dir="ltr"
                    className="form-control form-control--text-ltr px-3"
                  />
                </div>
                <LengthField
                  id={`wall-${wall.id}-length`}
                  label="درێژی دیوار"
                  value={wall.length}
                  unit={wall.lengthUnit}
                  onChange={(value) => props.onWallChange(wall.id, "length", value)}
                  onUnitChange={(unit) => props.onWallChange(wall.id, "lengthUnit", unit)}
                  invalid={props.showValidation && !(Number(wall.length) > 0)}
                />
                <LengthField
                  id={`wall-${wall.id}-height`}
                  label="بەرزی دیوار"
                  value={wall.height}
                  unit={wall.heightUnit}
                  onChange={(value) => props.onWallChange(wall.id, "height", value)}
                  onUnitChange={(unit) => props.onWallChange(wall.id, "heightUnit", unit)}
                  invalid={props.showValidation && !(Number(wall.height) > 0)}
                />
              </div>
              <div className="mt-5 space-y-5">
                <OpeningsSection
                  kind="door"
                  prefix={`wall-${wall.id}`}
                  openings={wall.doors}
                  wallOptions={[option]}
                  lockedWallId={wall.id}
                  onAdd={() => props.onOpeningAdd(wall.id, "doors")}
                  onRemove={(openingId) => props.onOpeningRemove(wall.id, "doors", openingId)}
                  onChange={(openingId, field, value) => props.onOpeningChange(wall.id, "doors", openingId, field, value)}
                  showValidation={props.showValidation}
                />
                <OpeningsSection
                  kind="window"
                  prefix={`wall-${wall.id}`}
                  openings={wall.windows}
                  wallOptions={[option]}
                  lockedWallId={wall.id}
                  onAdd={() => props.onOpeningAdd(wall.id, "windows")}
                  onRemove={(openingId) => props.onOpeningRemove(wall.id, "windows", openingId)}
                  onChange={(openingId, field, value) => props.onOpeningChange(wall.id, "windows", openingId, field, value)}
                  showValidation={props.showValidation}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
