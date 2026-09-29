"use client";
import { Calculator as CalculatorIcon, Redo2, RotateCcw, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState, type SetStateAction } from "react";
import { blockDefinitions } from "@/features/calculator/config/blocks";
import { calculateProject } from "@/features/calculator/lib/calculations";
import {
  fitOpeningToBounds,
  resolveInputOpeningCollisions,
} from "@/features/calculator/lib/opening-placement";
import {
  createDefaultProject,
  createOpening,
  createRoom,
  createWall,
} from "@/features/calculator/lib/project-state";
import type {
  BlockDefinition,
  CalculationErrorCode,
  CalculatorProjectData,
  OpeningInput,
  RoomInput,
  WallInput,
} from "@/features/calculator/types";
import { BlockLibrary } from "./block-library";
import { CalculationBreakdown } from "./calculation-breakdown";
import { CalculationOptions } from "./calculation-options";
import { IndividualWalls } from "./individual-walls";
import { ModeSwitcher } from "./mode-switcher";
import { PrintReport } from "./print-report";
import { ProjectInformation } from "./project-information";
import { ResultsDashboard } from "./results-dashboard";
import { RoomsEditor } from "./rooms-editor";
import { SavedProjects } from "./saved-projects";
import { WallPreview } from "./wall-preview";
import { WallsEditor } from "./walls-editor";

const errorMessages: Record<CalculationErrorCode, string> = {
  "invalid-room": "تکایە درێژی، پانی و بەرزی ژوور بنووسە.",
  "invalid-wall": "تکایە درێژی و بەرزی دیوار بنووسە.",
  "invalid-opening": "قەبارە و ژمارەی کراوەکان دروست نییە.",
  "openings-too-large": "ڕووبەری کراوەکان لە دیوار گەورەترە.",
  "invalid-block": "قەبارەی بلۆک دروست نییە.",
  "invalid-waste": "ڕێژەی زیادە دروست نییە.",
  "invalid-price": "نرخێکی دروست بنووسە.",
  "invalid-mortar": "نرخی مۆرتەر دروست نییە.",
};
function numericOpenings(openings: OpeningInput[]) {
  return openings.map((opening) => ({
    id: opening.id,
    // LengthField persists canonical metres and only converts for display.
    width: Number(opening.width),
    height: Number(opening.height),
    quantity: Number(opening.quantity),
    wallId: opening.wallId || undefined,
    horizontalPosition:
      opening.horizontalPosition === ""
        ? undefined
        : Number(opening.horizontalPosition),
    sillHeight:
      opening.sillHeight === ""
        ? undefined
        : Number(opening.sillHeight),
  }));
}

function resolveLists(
  lists: OpeningInput[][],
  wallLength: number,
): OpeningInput[][] {
  if (!(wallLength > 0)) return lists;
  const resolved = resolveInputOpeningCollisions(lists.flat(), wallLength);
  const byId = new Map(resolved.map((opening) => [opening.id, opening]));
  return lists.map((list) => list.map((opening) => byId.get(opening.id) ?? opening));
}

function normalizeStandaloneWallOpenings(wall: WallInput): WallInput {
  const [doors, windows] = resolveLists(
    [wall.doors, wall.windows],
    Number(wall.length),
  );
  return { ...wall, doors, windows };
}

function normalizeRoomOpeningCollisions(room: RoomInput): RoomInput {
  const fallbackWallId = room.walls[0]?.id ?? "";
  const quickGroups = new Map<string, OpeningInput[]>();
  for (const opening of [...room.doors, ...room.windows]) {
    const wallId = opening.wallId || fallbackWallId;
    const group = quickGroups.get(wallId) ?? [];
    group.push(opening);
    quickGroups.set(wallId, group);
  }
  const quickResolved = new Map<string, OpeningInput>();
  for (const [wallId, openings] of quickGroups) {
    const wallIndex = room.walls.findIndex((wall) => wall.id === wallId);
    const wallLength = Number(
      wallIndex > -1 && wallIndex % 2 === 1 ? room.width : room.length,
    );
    for (const opening of resolveInputOpeningCollisions(openings, wallLength)) {
      quickResolved.set(opening.id, opening);
    }
  }
  return {
    ...room,
    doors: room.doors.map((opening) => quickResolved.get(opening.id) ?? opening),
    windows: room.windows.map((opening) => quickResolved.get(opening.id) ?? opening),
    walls: room.walls.map((wall, wallIndex) => {
      const [doors, windows, otherOpenings, structuralDeductions] = resolveLists(
        [wall.doors, wall.windows, wall.otherOpenings, wall.structuralDeductions],
        Number(wallIndex % 2 === 1 ? room.width : room.length),
      );
      return { ...wall, doors, windows, otherOpenings, structuralDeductions };
    }),
  };
}

export function Calculator() {
  const [data, setRawData] = useState<CalculatorProjectData>(createDefaultProject);
  const [past, setPast] = useState<CalculatorProjectData[]>([]);
  const [future, setFuture] = useState<CalculatorProjectData[]>([]);
  const [hasCalculated, setHasCalculated] = useState(false);
  const setData = (next: SetStateAction<CalculatorProjectData>) => setRawData((current) => {
    const resolved = typeof next === "function" ? next(current) : next;
    if (JSON.stringify(resolved) === JSON.stringify(current)) return current;
    setPast((entries) => [...entries, current].slice(-40));
    setFuture([]);
    return resolved;
  });
  const undo = () => setPast((entries) => { const previous = entries.at(-1); if (!previous) return entries; setFuture((items) => [data, ...items].slice(0, 40)); setRawData(previous); setHasCalculated(false); return entries.slice(0, -1); });
  const redo = () => setFuture((entries) => { const next = entries[0]; if (!next) return entries; setPast((items) => [...items, data].slice(-40)); setRawData(next); setHasCalculated(false); return entries.slice(1); });
  useEffect(() => { const shortcut = (event: KeyboardEvent) => { if (!(event.ctrlKey || event.metaKey)) return; if (event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); } else if (event.key.toLowerCase() === "y") { event.preventDefault(); redo(); } }; window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut); });
  const selectedBlock = useMemo<BlockDefinition>(
    () =>
      data.settings.blockMode === "custom"
        ? { id: "custom", name: "بلۆکی تایبەت", ...data.settings.customBlock }
        : (blockDefinitions.find(
            (block) => block.id === data.settings.selectedBlockId,
          ) ?? blockDefinitions[1]),
    [
      data.settings.blockMode,
      data.settings.customBlock,
      data.settings.selectedBlockId,
    ],
  );
  const numericUnits = useMemo(
    () =>
      data.mode === "rooms"
        ? data.settings.interfaceMode === "advanced"
          ? data.rooms.flatMap((room, roomIndex) =>
              room.walls.map((wall, wallIndex) => ({
                id: wall.id,
                name: `${room.name || `ژووری ${roomIndex + 1}`} — ${wall.name}`,
                kind: "wall" as const,
                length: Number(wallIndex % 2 === 0 ? room.length : room.width),
                height: Number(room.height),
                doors: numericOpenings(wall.doors).map((opening) => ({
                  ...opening,
                  wallId: opening.wallId ?? wall.id,
                })),
                windows: numericOpenings(wall.windows).map((opening) => ({
                  ...opening,
                  wallId: opening.wallId ?? wall.id,
                })),
                otherOpenings: numericOpenings(wall.otherOpenings).map((opening) => ({
                  ...opening,
                  wallId: opening.wallId ?? wall.id,
                })),
                structuralDeductions: numericOpenings(wall.structuralDeductions).map((opening) => ({
                  ...opening,
                  wallId: opening.wallId ?? wall.id,
                })),
                enabled: wall.enabled,
                wallType: wall.wallType,
                wallAssignments: [{ id: wall.id, side: "front" as const }],
              })),
            )
          : data.rooms.map((room, index) => ({
              id: room.id,
              name: room.name || `ژووری ${index + 1}`,
              kind: "room" as const,
              length: Number(room.length),
              width: Number(room.width),
              height: Number(room.height),
              doors: numericOpenings(room.doors),
              windows: numericOpenings(room.windows),
              wallAssignments: room.walls.map((wall, wallIndex) => ({
                id: wall.id,
                side: (["front", "right", "back", "left"] as const)[
                  wallIndex % 4
                ],
              })),
            }))
        : data.walls.map((wall, index) => ({
            id: wall.id,
            name: wall.name || `دیوار ${index + 1}`,
            kind: "wall" as const,
            length: Number(wall.length),
            height: Number(wall.height),
            doors: numericOpenings(wall.doors).map((opening) => ({
              ...opening,
              wallId: opening.wallId ?? wall.id,
            })),
            windows: numericOpenings(wall.windows).map((opening) => ({
              ...opening,
              wallId: opening.wallId ?? wall.id,
            })),
            wallAssignments: [{ id: wall.id, side: "front" as const }],
          })),
    [data],
  );
  const waste =
    data.settings.wastePreset === "custom"
      ? Number(data.settings.customWastePercentage)
      : Number(data.settings.wastePreset);
  const calculation = useMemo(
    () =>
      calculateProject({
        mode: data.mode,
        units: numericUnits,
        block: selectedBlock,
        wastePercentage: waste,
        unitPrice:
          data.settings.unitPrice === ""
            ? undefined
            : Number(data.settings.unitPrice),
        currency: data.settings.currency,
        exchangeRateIqdPerUsd:
          data.settings.exchangeRateIqdPerUsd === ""
            ? undefined
            : Number(data.settings.exchangeRateIqdPerUsd),
        mortarConsumptionM3PerM2: data.settings.mortarEnabled
          ? Number(data.settings.mortarConsumptionM3PerM2)
          : undefined,
        mortarJointThicknessCm: data.settings.mortarJointEnabled
          ? Number(data.settings.mortarJointThicknessCm)
          : 0,
        costExtras: {
          transportCost: Number(data.settings.transportCost || 0),
          laborCost: Number(data.settings.laborCost || 0),
          mortarCost: Number(data.settings.mortarCost || 0),
          otherCost: Number(data.settings.otherCost || 0),
          otherCostLabel: data.settings.otherCostLabel || undefined,
        },
      }),
    [data, numericUnits, selectedBlock, waste],
  );
  const result =
    hasCalculated && calculation.isValid ? calculation.result : undefined;
  const error =
    hasCalculated && !calculation.isValid
      ? errorMessages[calculation.error]
      : undefined;
  const updateRoom = (
    id: string,
    field: keyof Pick<
      RoomInput,
      | "name"
      | "length"
      | "width"
      | "height"
      | "lengthUnit"
      | "widthUnit"
      | "heightUnit"
    >,
    value: string,
  ) =>
    setData((current) => ({
      ...current,
      rooms: current.rooms.map((room) => {
        if (room.id !== id) return room;
        const nextRoom = { ...room, [field]: value };
        if (field !== "length" && field !== "width" && field !== "height") {
          return nextRoom;
        }
        const boundsFor = (wallId: string) => {
          const wallIndex = nextRoom.walls.findIndex((wall) => wall.id === wallId);
          return {
            length: Number(wallIndex > -1 && wallIndex % 2 === 1 ? nextRoom.width : nextRoom.length),
            height: Number(nextRoom.height),
          };
        };
        const fit = (opening: OpeningInput) =>
          fitOpeningToBounds(
            opening,
            boundsFor(opening.wallId || nextRoom.walls[0]?.id || ""),
          );
        return normalizeRoomOpeningCollisions({
          ...nextRoom,
          doors: nextRoom.doors.map(fit),
          windows: nextRoom.windows.map(fit),
          walls: nextRoom.walls.map((wall, wallIndex) => {
            const bounds = {
              length: Number(wallIndex % 2 === 1 ? nextRoom.width : nextRoom.length),
              height: Number(nextRoom.height),
            };
            return {
              ...wall,
              doors: wall.doors.map((opening) => fitOpeningToBounds(opening, bounds)),
              windows: wall.windows.map((opening) => fitOpeningToBounds(opening, bounds)),
              otherOpenings: wall.otherOpenings.map((opening) => fitOpeningToBounds(opening, bounds)),
              structuralDeductions: wall.structuralDeductions.map((opening) => fitOpeningToBounds(opening, bounds)),
            };
          }),
        });
      }),
    }));
  const updateWall = (
    id: string,
    field: keyof Pick<
      WallInput,
      "name" | "length" | "height" | "lengthUnit" | "heightUnit"
    >,
    value: string,
  ) =>
    setData((current) => ({
      ...current,
      walls: current.walls.map((wall) => {
        if (wall.id !== id) return wall;
        const nextWall = { ...wall, [field]: value };
        if (field !== "length" && field !== "height") return nextWall;
        const bounds = { length: Number(nextWall.length), height: Number(nextWall.height) };
        return normalizeStandaloneWallOpenings({
          ...nextWall,
          doors: nextWall.doors.map((opening) => fitOpeningToBounds(opening, bounds)),
          windows: nextWall.windows.map((opening) => fitOpeningToBounds(opening, bounds)),
        });
      }),
    }));
  const updateOpening = (
    unitId: string,
    kind: "doors" | "windows",
    openingId: string,
    field: keyof Omit<OpeningInput, "id">,
    value: string,
    group: "rooms" | "walls",
  ) =>
    setData((current) => {
      if (group === "rooms") {
        return {
          ...current,
          rooms: current.rooms.map((room) =>
            room.id !== unitId
              ? room
              : (() => {
                  const nextList = room[kind].map((opening) => {
                    if (opening.id !== openingId) return opening;
                    const nextOpening = { ...opening, [field]: value };
                    const wallId = nextOpening.wallId || room.walls[0]?.id || "";
                    const wallIndex = room.walls.findIndex((wall) => wall.id === wallId);
                    return fitOpeningToBounds(nextOpening, {
                      length: Number(wallIndex > -1 && wallIndex % 2 === 1 ? room.width : room.length),
                      height: Number(room.height),
                    });
                  });
                  return normalizeRoomOpeningCollisions({ ...room, [kind]: nextList });
                })(),
          ),
        };
      }
      return {
        ...current,
        walls: current.walls.map((wall) =>
          wall.id !== unitId
            ? wall
            : normalizeStandaloneWallOpenings({
                ...wall,
                [kind]: wall[kind].map((opening) =>
                  opening.id === openingId
                    ? fitOpeningToBounds(
                        { ...opening, [field]: value },
                        { length: Number(wall.length), height: Number(wall.height) },
                      )
                    : opening,
                ),
              }),
        ),
      };
    });
  const addOpening = (
    unitId: string,
    kind: "doors" | "windows",
    group: "rooms" | "walls",
    openingWallId?: string,
  ) =>
    setData((current) => {
      if (group === "rooms") {
        return {
          ...current,
          rooms: current.rooms.map((room) =>
            room.id === unitId
              ? normalizeRoomOpeningCollisions({
                  ...room,
                  [kind]: [
                    ...room[kind],
                    createOpening(openingWallId ?? room.walls[0]?.id ?? ""),
                  ],
                })
              : room,
          ),
        };
      }
      return {
        ...current,
        walls: current.walls.map((wall) =>
          wall.id === unitId
            ? normalizeStandaloneWallOpenings({
                ...wall,
                [kind]: [...wall[kind], createOpening(openingWallId ?? wall.id)],
              })
            : wall,
        ),
      };
    });
  const removeOpening = (
    unitId: string,
    kind: "doors" | "windows",
    openingId: string,
    group: "rooms" | "walls",
  ) =>
    setData((current) => ({
      ...current,
      [group]: current[group].map((unit) =>
        unit.id === unitId
          ? {
              ...unit,
              [kind]: unit[kind].filter((opening) => opening.id !== openingId),
            }
          : unit,
      ),
    }));
  return (
    <div className="space-y-6">
      <div className="print:hidden flex flex-wrap justify-end gap-2">
        <button type="button" onClick={undo} disabled={past.length === 0} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"><Undo2 size={18} /> گەڕاندنەوە</button>
        <button type="button" onClick={redo} disabled={future.length === 0} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"><Redo2 size={18} /> دووبارەکردنەوە</button>
        <PrintReport
          data={data}
          block={selectedBlock}
          result={result}
        />
        <button
          type="button"
          onClick={() => {
            setData(createDefaultProject());
            setHasCalculated(false);
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold"
        >
          <RotateCcw size={18} /> پاککردنەوەی هەموو
        </button>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setHasCalculated(true);
          }}
          className="space-y-6 print:hidden"
        >
          <ProjectInformation
            metadata={data.metadata}
            onChange={(metadata) =>
              setData((current) => ({ ...current, metadata }))
            }
          />
          <ModeSwitcher
            mode={data.mode}
            onChange={(mode) => setData((current) => ({ ...current, mode }))}
          />
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-bold">دۆخی کارکردن</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setData((current) => ({
                    ...current,
                    settings: { ...current.settings, interfaceMode: "quick" },
                  }))
                }
                className={`min-h-11 rounded-lg border px-3 font-semibold ${data.settings.interfaceMode === "quick" ? "border-amber-600 bg-amber-50" : "border-slate-200"}`}
              >
                دۆخی خێرا
              </button>
              <button
                type="button"
                onClick={() =>
                  setData((current) => ({
                    ...current,
                    settings: {
                      ...current.settings,
                      interfaceMode: "advanced",
                    },
                  }))
                }
                className={`min-h-11 rounded-lg border px-3 font-semibold ${data.settings.interfaceMode === "advanced" ? "border-amber-600 bg-amber-50" : "border-slate-200"}`}
              >
                دۆخی پێشکەوتوو
              </button>
            </div>
          </section>
          {data.mode === "rooms" ? (
            <>
              <RoomsEditor
                rooms={data.rooms}
                onAdd={() =>
                  setData((current) => ({
                    ...current,
                    rooms: [...current.rooms, createRoom()],
                  }))
                }
                onRemove={(id) =>
                  setData((current) => ({
                    ...current,
                    rooms:
                      current.rooms.length > 1
                        ? current.rooms.filter((room) => room.id !== id)
                        : current.rooms,
                  }))
                }
                onRoomChange={updateRoom}
                onOpeningAdd={(id, kind, wallId) =>
                  addOpening(id, kind, "rooms", wallId)
                }
                onOpeningRemove={(id, kind, openingId) =>
                  removeOpening(id, kind, openingId, "rooms")
                }
                onOpeningChange={(id, kind, openingId, field, value) =>
                  updateOpening(id, kind, openingId, field, value, "rooms")
                }
                showValidation={hasCalculated && !calculation.isValid}
              />
              {data.settings.interfaceMode === "advanced" ? (
                <IndividualWalls
                  rooms={data.rooms}
                  onChange={(rooms) =>
                    setData((current) => ({ ...current, rooms }))
                  }
                  showValidation={hasCalculated && !calculation.isValid}
                />
              ) : null}
            </>
          ) : (
            <WallsEditor
              walls={data.walls}
              onAdd={() =>
                setData((current) => ({
                  ...current,
                  walls: [...current.walls, createWall()],
                }))
              }
              onRemove={(id) =>
                setData((current) => ({
                  ...current,
                  walls:
                    current.walls.length > 1
                      ? current.walls.filter((wall) => wall.id !== id)
                      : current.walls,
                }))
              }
              onWallChange={updateWall}
              onOpeningAdd={(id, kind) => addOpening(id, kind, "walls")}
              onOpeningRemove={(id, kind, openingId) =>
                removeOpening(id, kind, openingId, "walls")
              }
              onOpeningChange={(id, kind, openingId, field, value) =>
                updateOpening(id, kind, openingId, field, value, "walls")
              }
              showValidation={hasCalculated && !calculation.isValid}
            />
          )}
          <BlockLibrary
            settings={data.settings}
            onChange={(settings) =>
              setData((current) => ({ ...current, settings }))
            }
            showValidation={hasCalculated && !calculation.isValid}
          />
          <CalculationOptions
            settings={data.settings}
            onChange={(settings) =>
              setData((current) => ({ ...current, settings }))
            }
            showValidation={hasCalculated && !calculation.isValid}
          />
          <button
            type="submit"
            className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 text-lg font-bold text-white sm:w-auto sm:min-w-56"
          >
            <CalculatorIcon size={21} /> حیسابکردن
          </button>
        </form>
        <div className="space-y-6">
          <ResultsDashboard result={result} error={error} />
          <WallPreview units={numericUnits} block={selectedBlock} />
        </div>
      </div>
      <div className="print:hidden space-y-6">
        <CalculationBreakdown result={result} />
        <SavedProjects
          data={data}
          onLoad={(loaded) => {
            setData(loaded);
            setHasCalculated(false);
          }}
        />
      </div>
    </div>
  );
}
