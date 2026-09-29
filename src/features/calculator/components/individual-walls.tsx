import { Plus } from "lucide-react";

import { AppSelect } from "@/components/ui/app-select";
import { createOpening } from "@/features/calculator/lib/project-state";
import {
  fitOpeningToBounds,
  resolveInputOpeningCollisions,
} from "@/features/calculator/lib/opening-placement";
import type { OpeningInput, RoomInput, RoomWallInput } from "@/features/calculator/types";
import { OpeningsSection, type OpeningWallOption } from "./openings-section";

interface IndividualWallsProps {
  rooms: RoomInput[];
  onChange: (rooms: RoomInput[]) => void;
  showValidation: boolean;
}

type ListKey = "doors" | "windows" | "otherOpenings" | "structuralDeductions";

function metres(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function resolveWallCollisions(wall: RoomWallInput, length: number): RoomWallInput {
  const resolved = resolveInputOpeningCollisions(
    [
      ...wall.doors,
      ...wall.windows,
      ...wall.otherOpenings,
      ...wall.structuralDeductions,
    ],
    length,
  );
  const byId = new Map(resolved.map((opening) => [opening.id, opening]));
  const apply = (openings: OpeningInput[]) =>
    openings.map((opening) => byId.get(opening.id) ?? opening);
  return {
    ...wall,
    doors: apply(wall.doors),
    windows: apply(wall.windows),
    otherOpenings: apply(wall.otherOpenings),
    structuralDeductions: apply(wall.structuralDeductions),
  };
}

export function IndividualWalls({ rooms, onChange, showValidation }: IndividualWallsProps) {
  const updateWall = (roomId: string, wallId: string, patch: Partial<RoomWallInput>) =>
    onChange(
      rooms.map((room) => {
        if (room.id !== roomId) return room;
        const roomLength = metres(room.length);
        const roomWidth = metres(room.width);
        return {
          ...room,
          walls: room.walls.map((wall, wallIndex) =>
            wall.id !== wallId
              ? wall
              : (() => {
                  const length = wallIndex % 2 === 0 ? roomLength : roomWidth;
                  const nextWall = { ...wall, ...patch };
                  const bounds = { length, height: metres(room.height) };
                  return resolveWallCollisions(
                    {
                      ...nextWall,
                      doors: nextWall.doors.map((opening) => fitOpeningToBounds(opening, bounds)),
                      windows: nextWall.windows.map((opening) => fitOpeningToBounds(opening, bounds)),
                      otherOpenings: nextWall.otherOpenings.map((opening) => fitOpeningToBounds(opening, bounds)),
                      structuralDeductions: nextWall.structuralDeductions.map((opening) => fitOpeningToBounds(opening, bounds)),
                    },
                    length,
                  );
                })(),
          ),
        };
      }),
    );

  const updateOpening = (
    roomId: string,
    wallId: string,
    key: ListKey,
    openingId: string,
    field: keyof Omit<OpeningInput, "id">,
    value: string,
  ) => {
    const room = rooms.find((candidate) => candidate.id === roomId);
    const wall = room?.walls.find((candidate) => candidate.id === wallId);
    if (!room || !wall) return;
    updateWall(roomId, wallId, {
      [key]: wall[key].map((opening) =>
        opening.id === openingId ? { ...opening, [field]: value } : opening,
      ),
    } as Partial<RoomWallInput>);
  };

  const add = (roomId: string, wallId: string, key: ListKey) => {
    const room = rooms.find((candidate) => candidate.id === roomId);
    const wall = room?.walls.find((candidate) => candidate.id === wallId);
    if (!wall) return;
    updateWall(roomId, wallId, {
      [key]: [...wall[key], createOpening(wallId)],
    } as Partial<RoomWallInput>);
  };

  const remove = (roomId: string, wallId: string, key: ListKey, openingId: string) => {
    const room = rooms.find((candidate) => candidate.id === roomId);
    const wall = room?.walls.find((candidate) => candidate.id === wallId);
    if (!wall) return;
    updateWall(roomId, wallId, {
      [key]: wall[key].filter((opening) => opening.id !== openingId),
    } as Partial<RoomWallInput>);
  };

  const section = (
    roomId: string,
    wall: RoomWallInput,
    option: OpeningWallOption,
    key: ListKey,
    kind: "door" | "window" | "other" | "deduction",
  ) => (
    <OpeningsSection
      kind={kind}
      prefix={`advanced-${roomId}-${wall.id}`}
      openings={wall[key]}
      wallOptions={[option]}
      lockedWallId={wall.id}
      onAdd={() => add(roomId, wall.id, key)}
      onRemove={(id) => remove(roomId, wall.id, key, id)}
      onChange={(id, field, value) => updateOpening(roomId, wall.id, key, id, field, value)}
      showValidation={showValidation}
    />
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <Plus size={19} className="text-amber-700" />
        <h2 className="text-xl font-bold text-slate-950">دیوارە تاکەکانی ژوور</h2>
      </div>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        لە دۆخی پێشکەوتوودا هەر دیوارێک بە پێی درێژی و پانی ژوور خۆکارانە دروست دەبێت. تەنها دیوارە بەکارخراوەکان حیساب دەکرێن.
      </p>
      <div className="mt-5 space-y-5">
        {rooms.map((room, roomIndex) => {
          const roomLength = metres(room.length);
          const roomWidth = metres(room.width);
          const roomHeight = metres(room.height);
          return (
            <div key={room.id} className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-bold text-slate-950">{room.name || `ژووری ${roomIndex + 1}`}</h3>
              <div className="mt-4 space-y-3">
                {room.walls.map((wall, wallIndex) => {
                  const option: OpeningWallOption = {
                    id: wall.id,
                    name: wall.name || `دیوار ${wallIndex + 1}`,
                    length: wallIndex % 2 === 0 ? roomLength : roomWidth,
                    height: roomHeight,
                  };
                  return (
                    <details key={wall.id} className="rounded-xl bg-slate-50 p-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                        <span className="font-semibold text-slate-900">
                          {option.name}{" "}
                          <span className="mr-1 text-sm font-normal text-slate-500">
                            ({wallIndex % 2 === 0 ? room.length || "—" : room.width || "—"} × {room.height || "—"} م)
                          </span>
                        </span>
                        <span onClick={(event) => event.stopPropagation()}>
                          <label className="inline-flex items-center gap-2 text-sm font-semibold">
                            <input
                              type="checkbox"
                              checked={wall.enabled}
                              onChange={(event) => updateWall(room.id, wall.id, { enabled: event.target.checked })}
                              className="size-4 accent-amber-600"
                            />
                            لە حیسابدا بێت
                          </label>
                        </span>
                      </summary>
                      <div className="form-field mt-4 max-w-sm">
                        <label htmlFor={`wall-${wall.id}-type`} className="form-label">
                          جۆری دیوار
                        </label>
                        <AppSelect
                            data-select-kind="wall"
                            id={`wall-${wall.id}-type`}
                            value={wall.wallType}
                            onChange={(event) => updateWall(room.id, wall.id, { wallType: event.target.value as RoomWallInput["wallType"] })}
                            className="h-[3.25rem] w-full rounded-xl px-3"
                          >
                            <option value="interior">دیوارەی ناوخۆ</option>
                            <option value="exterior">دیوارەی دەرەوە</option>
                          </AppSelect>
                      </div>
                      <div className="mt-4 space-y-5">
                        {section(room.id, wall, option, "doors", "door")}
                        {section(room.id, wall, option, "windows", "window")}
                        {section(room.id, wall, option, "otherOpenings", "other")}
                        {section(room.id, wall, option, "structuralDeductions", "deduction")}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
