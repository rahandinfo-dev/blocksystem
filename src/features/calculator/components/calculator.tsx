"use client";
import { Calculator as CalculatorIcon, Redo2, RotateCcw, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import { blockDefinitions } from "@/features/calculator/config/blocks";
import { calculateProject } from "@/features/calculator/lib/calculations";
import {
  fitOpeningToBounds,
  resolveInputOpeningCollisions,
} from "@/features/calculator/lib/opening-placement";
import {
  createDefaultProject,
  duplicateRoom,
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
import { WorkingMode } from "./working-mode";
import { PrintReport } from "./print-report";
import { ProjectInformation } from "./project-information";
import { ResultsDashboard } from "./results-dashboard";
import { RoomsEditor } from "./rooms-editor";
import { SavedProjects } from "./saved-projects";
import { WallPreview } from "./wall-preview";
import { WallsEditor } from "./walls-editor";
import { useI18n } from "@/lib/i18n";
import { getActiveProjectId, getWorkspacePreferences, persistProject, setActiveProjectId } from "@/lib/project-storage";
import { WorkspaceConsole } from "./workspace-console";
import { ScenarioComparison } from "./scenario-comparison";
import { BackupRecovery } from "./backup-recovery";
import { FloorPlanPreview } from "./floor-plan-workspace";

const errorMessageKeys: Record<CalculationErrorCode, string> = {
  "invalid-room": "errors.invalidRoom",
  "invalid-wall": "errors.invalidWall",
  "invalid-opening": "errors.invalidOpening",
  "openings-too-large": "errors.openingsTooLarge",
  "invalid-block": "errors.invalidBlock",
  "invalid-waste": "errors.invalidWaste",
  "invalid-price": "errors.invalidPrice",
  "invalid-mortar": "errors.invalidMortar",
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
  const { t } = useI18n();
  const [data, setRawData] = useState<CalculatorProjectData>(createDefaultProject);
  const [past, setPast] = useState<CalculatorProjectData[]>([]);
  const [future, setFuture] = useState<CalculatorProjectData[]>([]);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [activeProjectId, setActiveProject] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved" | "failed">("saved");
  const [isDirty, setIsDirty] = useState(false);
  const dataRef = useRef(data);
  const activeProjectRef = useRef<string | null>(null);
  const saveInFlight = useRef(false);
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => {
    const timer = window.setTimeout(() => { const active = getActiveProjectId(); activeProjectRef.current = active; setActiveProject(active); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const setData = (next: SetStateAction<CalculatorProjectData>) => {
    const current = dataRef.current;
    const resolved = typeof next === "function" ? next(current) : next;
    if (JSON.stringify(resolved) === JSON.stringify(current)) return;
    dataRef.current = resolved;
    setPast((entries) => [...entries, current].slice(-40));
    setFuture([]);
    setIsDirty(true);
    setSaveState("unsaved");
    setRawData(resolved);
  };
  const undo = () => setPast((entries) => { const previous = entries.at(-1); if (!previous) return entries; setFuture((items) => [data, ...items].slice(0, 40)); setRawData(previous); setHasCalculated(false); return entries.slice(0, -1); });
  const redo = () => setFuture((entries) => { const next = entries[0]; if (!next) return entries; setPast((items) => [...items, data].slice(-40)); setRawData(next); setHasCalculated(false); return entries.slice(1); });
  useEffect(() => { const shortcut = (event: KeyboardEvent) => { if (!(event.ctrlKey || event.metaKey)) return; if (event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); } else if (event.key.toLowerCase() === "y") { event.preventDefault(); redo(); } }; window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut); });
  const saveWorkspace = useCallback((kind: "manual" | "autosave" = "manual") => {
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    const snapshot = dataRef.current;
    const fingerprint = JSON.stringify(snapshot);
    setSaveState("saving");
    const saved = persistProject(snapshot, kind, activeProjectRef.current);
    saveInFlight.current = false;
    if (!saved.ok) {
      setSaveState("failed");
      return;
    }
    activeProjectRef.current = saved.project.id;
    setActiveProject(saved.project.id);
    setActiveProjectId(saved.project.id);
    const unchangedSinceSave = JSON.stringify(dataRef.current) === fingerprint;
    setIsDirty(!unchangedSinceSave);
    setSaveState(unchangedSinceSave ? "saved" : "unsaved");
  }, []);
  useEffect(() => {
    if (!isDirty) return;
    const enabled = getWorkspacePreferences().autosave;
    if (!enabled) return;
    const timer = window.setTimeout(() => saveWorkspace("autosave"), 900);
    return () => window.clearTimeout(timer);
  }, [data, isDirty, saveWorkspace]);
  useEffect(() => {
    const flushWhenBackgrounded = () => {
      if (document.visibilityState === "hidden" && isDirty) saveWorkspace("autosave");
    };
    document.addEventListener("visibilitychange", flushWhenBackgrounded);
    return () => document.removeEventListener("visibilitychange", flushWhenBackgrounded);
  }, [isDirty, saveWorkspace]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (!isDirty) return; event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);
  const loadWorkspaceProject = useCallback((loaded: CalculatorProjectData, projectId: string) => {
    if (isDirty && !window.confirm(t("workspace.discardConfirm"))) return;
    setRawData(loaded); setPast([]); setFuture([]); setHasCalculated(false); setIsDirty(false); setSaveState("saved");
    activeProjectRef.current = projectId; setActiveProject(projectId); setActiveProjectId(projectId);
  }, [isDirty, t]);
  const newWorkspaceProject = useCallback(() => {
    if (isDirty && !window.confirm(t("workspace.discardConfirm"))) return;
    setRawData(createDefaultProject()); setPast([]); setFuture([]); setHasCalculated(false); setIsDirty(false); setSaveState("saved");
    activeProjectRef.current = null; setActiveProject(null); setActiveProjectId(null);
  }, [isDirty, t]);
  useEffect(() => {
    const open = (event: Event) => {
      const project = (event as CustomEvent<{ project?: { id: string; data: CalculatorProjectData } }>).detail?.project;
      if (project) loadWorkspaceProject(project.data, project.id);
    };
    const create = () => newWorkspaceProject();
    window.addEventListener("blocksystem:open-project", open);
    window.addEventListener("blocksystem:new-project", create);
    return () => { window.removeEventListener("blocksystem:open-project", open); window.removeEventListener("blocksystem:new-project", create); };
  }, [loadWorkspaceProject, newWorkspaceProject]);
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
  // Calculation is pure and memoized above, so a valid change is reflected
  // immediately. `hasCalculated` is retained only to avoid showing errors
  // before the user has asked the form to validate incomplete input.
  const result = calculation.isValid ? calculation.result : undefined;
  const error =
    hasCalculated && !calculation.isValid
      ? t(errorMessageKeys[calculation.error])
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
      "name" | "length" | "height" | "thickness" | "lengthUnit" | "heightUnit" | "thicknessUnit" | "wallType" | "notes"
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
      <WorkspaceConsole
        saveState={saveState}
        onSave={() => saveWorkspace("manual")}
      />
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
          onClick={newWorkspaceProject}
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
          <WorkingMode
            mode={data.settings.interfaceMode}
            onChange={(interfaceMode) =>
              setData((current) => ({
                ...current,
                settings: { ...current.settings, interfaceMode },
              }))
            }
          />
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
                onDuplicate={(id) => setData((current) => { const room = current.rooms.find((item) => item.id === id); return room ? { ...current, rooms: [...current.rooms, duplicateRoom(room)] } : current; })}
                onMove={(id, direction) => setData((current) => { const index = current.rooms.findIndex((room) => room.id === id); const nextIndex = index + direction; if (index < 0 || nextIndex < 0 || nextIndex >= current.rooms.length) return current; const rooms = [...current.rooms]; [rooms[index], rooms[nextIndex]] = [rooms[nextIndex], rooms[index]]; return { ...current, rooms }; })}
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
        <FloorPlanPreview data={data} onChange={setData} />
        <BackupRecovery />
        <ScenarioComparison data={data} onChange={setData} />
        <SavedProjects
          data={data}
          activeProjectId={activeProjectId}
          onSave={() => saveWorkspace("manual")}
          onLoad={loadWorkspaceProject}
          onNew={newWorkspaceProject}
        />
      </div>
    </div>
  );
}
