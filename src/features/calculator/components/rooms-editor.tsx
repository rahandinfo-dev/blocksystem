import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from "lucide-react";

import { LengthField } from "@/components/ui/length-field";
import type { OpeningInput, RoomInput } from "@/features/calculator/types";
import { OpeningsSection, type OpeningWallOption } from "./openings-section";
import { useI18n } from "@/lib/i18n";

interface RoomsEditorProps {
  rooms: RoomInput[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRoomChange: (
    id: string,
    field: keyof Pick<
      RoomInput,
      "name" | "length" | "width" | "height" | "lengthUnit" | "widthUnit" | "heightUnit"
    >,
    value: string,
  ) => void;
  onOpeningChange: (
    roomId: string,
    kind: "doors" | "windows",
    openingId: string,
    field: keyof Omit<OpeningInput, "id">,
    value: string,
  ) => void;
  onOpeningAdd: (
    roomId: string,
    kind: "doors" | "windows",
    wallId?: string,
  ) => void;
  onOpeningRemove: (
    roomId: string,
    kind: "doors" | "windows",
    openingId: string,
  ) => void;
  showValidation: boolean;
}

function asMetres(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function wallOptions(room: RoomInput): OpeningWallOption[] {
  const length = asMetres(room.length);
  const width = asMetres(room.width);
  const height = asMetres(room.height);
  const defaultNames = ["دیوارێ پێشەوە", "دیوارێ ڕاست", "دیوارێ پشتەوە", "دیوارێ چەپ"];
  return room.walls.map((wall, index) => ({
    id: wall.id,
    name: wall.name.trim() || defaultNames[index] || `دیوار ${index + 1}`,
    length: index % 2 === 0 ? length : width,
    height,
  }));
}

export function RoomsEditor(props: RoomsEditorProps) {
  const { t } = useI18n();
  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="rooms-heading"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="rooms-heading" className="text-xl font-bold text-slate-950">{t("rooms.heading")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("rooms.description")}</p>
        </div>
        <button
          type="button"
          onClick={props.onAdd}
          className="form-add-button inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border bg-white px-3 text-sm font-semibold"
        >
          <Plus size={17} /> {t("rooms.add")}
        </button>
      </div>
      <div className="mt-5 space-y-5">
        {props.rooms.map((room, index) => {
          const options = wallOptions(room);
          const defaultWallId = options[0]?.id;
          return (
            <article key={room.id} className="rounded-xl border border-slate-200 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-bold text-slate-950">{room.name.trim() || `ژووری ${index + 1}`}</h3>
                <div className="flex gap-1">
                <button type="button" disabled={index === 0} onClick={() => props.onMove(room.id, -1)} aria-label={t("rooms.moveUp")} className="grid size-10 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-40"><ChevronUp size={18} /></button>
                <button type="button" disabled={index === props.rooms.length - 1} onClick={() => props.onMove(room.id, 1)} aria-label={t("rooms.moveDown")} className="grid size-10 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-40"><ChevronDown size={18} /></button>
                <button type="button" onClick={() => props.onDuplicate(room.id)} aria-label={t("rooms.duplicate")} className="grid size-10 place-items-center rounded-lg hover:bg-slate-100"><Copy size={17} /></button>
                <button
                  type="button"
                  disabled={props.rooms.length === 1}
                  onClick={() => props.onRemove(room.id)}
                  aria-label={t("rooms.delete")}
                  className="form-delete-button grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                >
                  <Trash2 size={18} />
                </button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div className="form-field">
                  <label htmlFor={`room-${room.id}-name`} className="form-label">{t("rooms.name")}</label>
                  <input
                    id={`room-${room.id}-name`}
                    value={room.name}
                    onChange={(event) => props.onRoomChange(room.id, "name", event.target.value)}
                    dir="ltr"
                    className="form-control form-control--text-ltr px-3"
                  />
                </div>
                <LengthField
                  id={`room-${room.id}-length`}
                  label="درێژی ژوور"
                  value={room.length}
                  unit={room.lengthUnit}
                  onChange={(value) => props.onRoomChange(room.id, "length", value)}
                  onUnitChange={(unit) => props.onRoomChange(room.id, "lengthUnit", unit)}
                  invalid={props.showValidation && !(Number(room.length) > 0)}
                />
                <LengthField
                  id={`room-${room.id}-width`}
                  label="پانی ژوور"
                  value={room.width}
                  unit={room.widthUnit}
                  onChange={(value) => props.onRoomChange(room.id, "width", value)}
                  onUnitChange={(unit) => props.onRoomChange(room.id, "widthUnit", unit)}
                  invalid={props.showValidation && !(Number(room.width) > 0)}
                />
                <LengthField
                  id={`room-${room.id}-height`}
                  label="بەرزی دیوار"
                  value={room.height}
                  unit={room.heightUnit}
                  onChange={(value) => props.onRoomChange(room.id, "height", value)}
                  onUnitChange={(unit) => props.onRoomChange(room.id, "heightUnit", unit)}
                  invalid={props.showValidation && !(Number(room.height) > 0)}
                />
              </div>
              <div className="mt-5 space-y-5">
                <OpeningsSection
                  kind="door"
                  prefix={`room-${room.id}`}
                  openings={room.doors}
                  wallOptions={options}
                  onAdd={() => props.onOpeningAdd(room.id, "doors", defaultWallId)}
                  onRemove={(openingId) => props.onOpeningRemove(room.id, "doors", openingId)}
                  onChange={(openingId, field, value) => props.onOpeningChange(room.id, "doors", openingId, field, value)}
                  showValidation={props.showValidation}
                />
                <OpeningsSection
                  kind="window"
                  prefix={`room-${room.id}`}
                  openings={room.windows}
                  wallOptions={options}
                  onAdd={() => props.onOpeningAdd(room.id, "windows", defaultWallId)}
                  onRemove={(openingId) => props.onOpeningRemove(room.id, "windows", openingId)}
                  onChange={(openingId, field, value) => props.onOpeningChange(room.id, "windows", openingId, field, value)}
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
