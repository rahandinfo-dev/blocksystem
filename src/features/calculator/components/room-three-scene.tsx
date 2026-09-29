"use client";

import { Edges, OrbitControls, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Expand,
  Eye,
  EyeOff,
  Focus,
  Layers,
  Minus,
  Plus,
  RotateCcw,
  Scissors,
  SlidersHorizontal,
} from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Box3, DoubleSide, Group, PerspectiveCamera, TOUCH, Vector3 } from "three";
import type {
  BlockDefinition,
  NumericOpening,
  NumericUnit,
} from "@/features/calculator/types";
import { resolveOpeningIntervals } from "@/features/calculator/lib/opening-placement";
import { perspectiveBoundsFit } from "@/features/calculator/lib/camera-fit";
import { useI18n } from "@/lib/i18n";
import {
  createWallSolidSegments,
  type WallOpeningRect,
} from "@/features/calculator/lib/wall-opening-geometry";

export type PreviewWallId = "front" | "back" | "right" | "left";
export type PreviewSelection =
  | { type: "wall"; id: PreviewWallId }
  | {
      type: "door" | "window" | "other";
      id: string;
      wallId: PreviewWallId;
      opening: NumericOpening;
    };

interface Props {
  unit: NumericUnit;
  block: BlockDefinition;
  selection?: PreviewSelection;
  onSelectionChange?: (selection: PreviewSelection) => void;
}

export const wallName: Record<PreviewWallId, string> = {
  front: "دیوارێ پێشەوە",
  back: "دیوارێ پشتەوە",
  right: "دیوارێ لای ڕاست",
  left: "دیوارێ لای چەپ",
};
type OpeningModel = {
  id: string;
  kind: "door" | "window" | "other";
  opening: NumericOpening;
  wallId: PreviewWallId;
  x: number;
  bottom: number;
  wallLength: number;
  position: [number, number, number];
  rotation: [number, number, number];
};

type WallTransform = {
  length: number;
  position: [number, number, number];
  rotation: [number, number, number];
};

function wallTransforms(
  length: number,
  width: number,
): Record<PreviewWallId, WallTransform> {
  return {
    front: {
      length,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    },
    back: {
      length,
      position: [0, 0, width],
      rotation: [0, Math.PI, 0],
    },
    right: {
      length: width,
      position: [length / 2, 0, width / 2],
      rotation: [0, Math.PI / 2, 0],
    },
    left: {
      length: width,
      position: [-length / 2, 0, width / 2],
      rotation: [0, -Math.PI / 2, 0],
    },
  };
}

function openingBottom(
  opening: NumericOpening,
  kind: OpeningModel["kind"],
  wallHeight: number,
): number {
  if (kind === "door") return 0;
  const maximum = Math.max(0, wallHeight - opening.height);
  const requested = Number.isFinite(opening.sillHeight)
    ? opening.sillHeight ?? 0
    : Math.min(maximum, wallHeight * 0.48);
  return Math.min(Math.max(requested, 0), maximum);
}

function Opening({
  item,
  thickness,
  showMeasurements,
  selected,
  onSelect,
  onMeasurementsReady,
}: {
  item: OpeningModel;
  thickness: number;
  showMeasurements: boolean;
  selected: boolean;
  onSelect: () => void;
  onMeasurementsReady: () => void;
}) {
  const { opening, kind } = item;
  if (opening.width <= 0 || opening.height <= 0) return null;

  const y = item.bottom + opening.height / 2;
  const panelColor = selected
    ? "#efb54a"
    : kind === "door"
      ? "#172033"
      : kind === "window"
        ? "#8fc9e8"
        : "#64748b";
  const frame = Math.max(
    0.018,
    Math.min(0.085, opening.width * 0.1, opening.height * 0.1),
  );
  const verticalFrame = Math.min(frame, opening.width / 3);
  const horizontalFrame = Math.min(frame, opening.height / 3);
  const innerWidth = Math.max(0.012, opening.width - verticalFrame * 2);
  const innerHeight = Math.max(0.012, opening.height - horizontalFrame * 2);
  // The frame extends a fraction beyond both wall faces.  It is deliberately
  // centred at z=0 so it reveals the real opening from either side instead of
  // becoming a decorative panel on one face only.
  const frameDepth = Math.max(thickness + 0.024, 0.07);
  const panelDepth = Math.max(0.03, Math.min(thickness * 0.68, 0.16));
  const knobSize = Math.min(0.05, opening.width * 0.06);
  const measurementZ = frameDepth / 2 + 0.015;
  return (
    <group
      position={[item.x, y, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      {kind === "door" ? (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[innerWidth, innerHeight, panelDepth]} />
          <meshStandardMaterial color={panelColor} roughness={0.7} />
        </mesh>
      ) : null}
      {kind === "window" ? (
        <mesh>
          <boxGeometry args={[innerWidth, innerHeight, Math.max(0.012, thickness * 0.12)]} />
          <meshStandardMaterial
            color={panelColor}
            transparent
            opacity={0.5}
            side={DoubleSide}
            depthWrite={false}
            roughness={0.18}
            metalness={0.05}
          />
        </mesh>
      ) : null}
      {[-1, 1].map((side) => (
        <mesh
          key={`jamb-${side}`}
          position={[side * (opening.width - verticalFrame) / 2, 0, 0]}
          castShadow
        >
          <boxGeometry args={[verticalFrame, opening.height, frameDepth]} />
          <meshStandardMaterial color={selected ? "#efb54a" : "#EDE6CC"} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={`header-${side}`}
          position={[0, side * (opening.height - horizontalFrame) / 2, 0]}
          castShadow
        >
          <boxGeometry args={[innerWidth, horizontalFrame, frameDepth]} />
          <meshStandardMaterial color={selected ? "#efb54a" : "#EDE6CC"} />
        </mesh>
      ))}
      {kind === "window" ? (
        <>
          <mesh castShadow>
            <boxGeometry args={[Math.min(verticalFrame * 0.72, innerWidth), innerHeight, frameDepth]} />
            <meshStandardMaterial color={selected ? "#efb54a" : "#EDE6CC"} />
          </mesh>
          <mesh castShadow>
            <boxGeometry args={[innerWidth, Math.min(horizontalFrame * 0.72, innerHeight), frameDepth]} />
            <meshStandardMaterial color={selected ? "#efb54a" : "#EDE6CC"} />
          </mesh>
        </>
      ) : null}
      {kind === "door" ? (
        [-1, 1].map((side) => (
          <mesh
            key={`knob-${side}`}
            position={[opening.width * 0.28, 0, side * (panelDepth / 2 + 0.012)]}
          >
            <sphereGeometry args={[knobSize, 12, 12]} />
            <meshStandardMaterial color="#EDE6CC" metalness={0.25} roughness={0.45} />
          </mesh>
        ))
      ) : null}
      {showMeasurements ? (
        <Suspense fallback={null}>
        <Text
          font="/fonts/NRT-Reg.ttf"
          onSync={onMeasurementsReady}
          position={[0, opening.height / 2 + 0.14, measurementZ]}
          fontSize={Math.max(0.08, Math.min(opening.width, opening.height) / 7)}
          color="#0F2053"
          anchorX="center"
        >
          {`${opening.width.toFixed(2)} × ${opening.height.toFixed(2)} m`}
        </Text>
        </Suspense>
      ) : null}
    </group>
  );
}

function WallSurface({
  id,
  length,
  height,
  thickness,
  position,
  rotation,
  openings,
  selected,
  opacity,
  onSelect,
}: {
  id: PreviewWallId;
  length: number;
  height: number;
  thickness: number;
  openings: OpeningModel[];
  position: [number, number, number];
  rotation: [number, number, number];
  selected: boolean;
  opacity: number;
  onSelect: (id: PreviewWallId) => void;
}) {
  const segments = useMemo(
    () =>
      createWallSolidSegments(
        length,
        height,
        openings.map<WallOpeningRect>((opening) => ({
          id: opening.id,
          x: opening.x,
          bottom: opening.bottom,
          width: opening.opening.width,
          height: opening.opening.height,
        })),
      ),
    [height, length, openings],
  );
  const isFront = id === "front";
  const wallColor = selected
    ? isFront
      ? "#2d4d8b"
      : "#d99c42"
    : isFront
      ? "#0F2053"
      : "#c6a36f";
  const edgeColor = isFront ? "#EDE6CC" : "#8d714b";
  return (
    <group
      position={position}
      rotation={rotation}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(id);
      }}
    >
      {segments.map((segment, index) => (
        <mesh
          key={`${index}-${segment.x}-${segment.y}`}
          position={[segment.x, segment.y, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[segment.width, segment.height, thickness]} />
          <meshStandardMaterial
            color={wallColor}
            roughness={0.88}
            transparent={opacity < 1}
            opacity={opacity}
          />
          <Edges color={edgeColor} threshold={20} />
        </mesh>
      ))}
    </group>
  );
}

function fitRenderedModel(group: Group, orbit: OrbitControlsImpl, width: number, height: number, singleWall: boolean) {
    const camera = orbit.object;
    if (!(camera instanceof PerspectiveCamera) || width <= 0 || height <= 0) return false;
    // This group contains the actual walls, frames, openings and measurements.
    // The decorative ground is deliberately outside its measured bounds.
    group.updateWorldMatrix(true, true);
    const bounds = new Box3().setFromObject(group);
    if (bounds.isEmpty() || !Number.isFinite(bounds.min.lengthSq() + bounds.max.lengthSq())) return false;
    camera.aspect = width / height;
    const fitted = perspectiveBoundsFit(
      bounds,
      camera.fov,
      camera.aspect,
      new Vector3(1, 0.72, singleWall ? 1 : 1.2),
    );
    // Clear a gesture's remaining damping before placing the fitted view.
    const damping = orbit.enableDamping;
    orbit.enableDamping = false;
    orbit.update();
    orbit.enableDamping = damping;
    camera.position.copy(fitted.position);
    camera.near = fitted.near;
    camera.far = fitted.far;
    camera.updateProjectionMatrix();
    orbit.target.copy(fitted.target);
    orbit.minDistance = fitted.minDistance;
    orbit.maxDistance = fitted.maxDistance;
    orbit.update();
    return true;
}

function FitRenderedModel({
  model: modelRef,
  controls: controlsRef,
  fitView: fitViewRef,
  geometryKey,
  singleWall,
}: {
  model: React.RefObject<Group | null>;
  controls: React.RefObject<OrbitControlsImpl | null>;
  fitView: React.RefObject<(() => void) | null>;
  geometryKey: string;
  singleWall: boolean;
}) {
  const size = useThree((state) => state.size);
  const lastFit = useRef("");
  const requested = useRef(true);

  useEffect(() => {
    fitViewRef.current = () => { requested.current = true; };
    return () => { fitViewRef.current = null; };
  }, [fitViewRef]);

  useFrame(() => {
    const nextFit = `${size.width}:${size.height}:${geometryKey}`;
    // R3F owns canvas observation and renderer sizing. Fit in its frame
    // lifecycle, when the rendered group and OrbitControls actually exist.
    const model = modelRef.current;
    const orbit = controlsRef.current;
    if ((requested.current || lastFit.current !== nextFit) && model && orbit && fitRenderedModel(model, orbit, size.width, size.height, singleWall)) {
      lastFit.current = nextFit;
      requested.current = false;
    }
  });
  return null;
}

function Scene({
  unit,
  block,
  controls,
  labels,
  selected,
  isolated,
  cutaway,
  autoRotate,
  fitView,
  choose,
}: {
  unit: NumericUnit;
  block: BlockDefinition;
  controls: React.RefObject<OrbitControlsImpl | null>;
  labels: boolean;
  selected: PreviewSelection;
  isolated: boolean;
  cutaway: boolean;
  autoRotate: boolean;
  fitView: React.RefObject<(() => void) | null>;
  choose: (selection: PreviewSelection) => void;
}) {
  const model = useRef<Group>(null);
  const length = unit.length;
  const width =
    unit.width ?? Math.max(unit.length * 0.25, (block.thicknessCm / 100) * 2);
  const height = unit.height;
  const thickness = Math.min(
    Math.max(block.thicknessCm / 100, 0.04),
    Math.min(length, width) * 0.18,
  );
  const singleWall = unit.kind === "wall";
  const transforms = useMemo(() => wallTransforms(length, width), [length, width]);
  const openings = useMemo<OpeningModel[]>(() => {
    const assignedSide = (opening: NumericOpening): PreviewWallId => {
      if (singleWall) return "front";
      return (
        unit.wallAssignments?.find((wall) => wall.id === opening.wallId)?.side ??
        "front"
      );
    };
    const source = [
      ...unit.doors.map((opening, index) => ({
        opening,
        kind: "door" as const,
        source: index,
      })),
      ...unit.windows.map((opening, index) => ({
        opening,
        kind: "window" as const,
        source: index,
      })),
      ...(unit.otherOpenings ?? []).map((opening, index) => ({
        opening,
        kind: "other" as const,
        source: index,
      })),
    ];
    const candidates = source.flatMap((item) => {
      const wallId = assignedSide(item.opening);
      const transform = transforms[wallId];
      const opening = {
        ...item.opening,
        width: Number.isFinite(item.opening.width)
          ? Math.min(Math.max(item.opening.width, 0), transform.length)
          : 0,
        height: Number.isFinite(item.opening.height)
          ? Math.min(Math.max(item.opening.height, 0), height)
          : 0,
      };
      const copies = Math.max(1, Math.min(20, Math.round(opening.quantity) || 1));
      return Array.from({ length: copies }, (_, copyIndex) => {
        const id = `${opening.id ?? `${item.kind}-${item.source}`}-${copyIndex}`;
        return {
          ...item,
          opening,
          id,
          wallId,
          wallLength: transform.length,
          position: transform.position,
          rotation: transform.rotation,
          preferredStart: Number.isFinite(item.opening.horizontalPosition)
            ? (item.opening.horizontalPosition ?? 0) + copyIndex * (opening.width + 0.12)
            : undefined,
        };
      });
    });
    const starts = new Map<string, number>();
    for (const side of ["front", "back", "right", "left"] as const) {
      const onWall = candidates.filter((candidate) => candidate.wallId === side);
      if (onWall.length === 0) continue;
      for (const interval of resolveOpeningIntervals(
        onWall.map((candidate) => ({
          id: candidate.id,
          width: candidate.opening.width,
          preferredStart: candidate.preferredStart,
        })),
        onWall[0].wallLength,
      )) {
        starts.set(interval.id, interval.start);
      }
    }
    return candidates.map((candidate): OpeningModel => ({
      id: candidate.id,
      kind: candidate.kind,
      opening: candidate.opening,
      wallId: candidate.wallId,
      x:
        -candidate.wallLength / 2 +
        (starts.get(candidate.id) ?? 0) +
        candidate.opening.width / 2,
      bottom: openingBottom(candidate.opening, candidate.kind, height),
      wallLength: candidate.wallLength,
      position: candidate.position,
      rotation: candidate.rotation,
    }));
  }, [height, singleWall, transforms, unit.doors, unit.otherOpenings, unit.wallAssignments, unit.windows]);
  const openingsByWall = useMemo(() => {
    const grouped: Record<PreviewWallId, OpeningModel[]> = {
      front: [],
      back: [],
      right: [],
      left: [],
    };
    for (const opening of openings) grouped[opening.wallId].push(opening);
    return grouped;
  }, [openings]);
  const wallOpacity = (id: PreviewWallId) =>
    isolated && selected.type === "wall" && selected.id !== id
      ? 0.12
      : cutaway && id === "back"
        ? 0.16
        : 1;
  // Values, rather than object identities, keep ordinary selection/language
  // rerenders from interrupting an orbit or an interior camera preset.
  const geometryKey = JSON.stringify([
    unit.id, unit.kind, length, width, height, thickness, labels,
    openings.map(({ id, wallId, x, bottom, opening }) => [
      id, wallId, x, bottom, opening.width, opening.height,
    ]),
  ]);
  const measurementsReady = useCallback(() => fitView.current?.(), [fitView]);
  return (
    <>
      <ambientLight intensity={1.35} />
      <directionalLight
        position={[length, height * 2, width]}
        intensity={2.1}
        castShadow
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry
          args={[length * 2.3, Math.max(width, length * 0.5) * 2.3]}
        />
        <meshStandardMaterial color="#d9e0e5" />
      </mesh>
      <group ref={model} name="preview-model">
      <WallSurface
        id="front"
        length={transforms.front.length}
        height={height}
        thickness={thickness}
        position={transforms.front.position}
        rotation={transforms.front.rotation}
        openings={openingsByWall.front}
        selected={selected.type === "wall" && selected.id === "front"}
        opacity={wallOpacity("front")}
        onSelect={(id) => choose({ type: "wall", id })}
      />
      {!singleWall ? (
        <>
          <WallSurface
            id="right"
            length={transforms.right.length}
            height={height}
            thickness={thickness}
            position={transforms.right.position}
            rotation={transforms.right.rotation}
            openings={openingsByWall.right}
            selected={selected.type === "wall" && selected.id === "right"}
            opacity={wallOpacity("right")}
            onSelect={(id) => choose({ type: "wall", id })}
          />
          <WallSurface
            id="back"
            length={transforms.back.length}
            height={height}
            thickness={thickness}
            position={transforms.back.position}
            rotation={transforms.back.rotation}
            openings={openingsByWall.back}
            selected={selected.type === "wall" && selected.id === "back"}
            opacity={wallOpacity("back")}
            onSelect={(id) => choose({ type: "wall", id })}
          />
          <WallSurface
            id="left"
            length={transforms.left.length}
            height={height}
            thickness={thickness}
            position={transforms.left.position}
            rotation={transforms.left.rotation}
            openings={openingsByWall.left}
            selected={selected.type === "wall" && selected.id === "left"}
            opacity={wallOpacity("left")}
            onSelect={(id) => choose({ type: "wall", id })}
          />
        </>
      ) : null}
      {openings.map((item) => (
        <group key={item.id} position={item.position} rotation={item.rotation}>
          <Opening
            item={item}
            thickness={thickness}
            showMeasurements={labels}
            selected={selected.type === item.kind && selected.id === item.id}
            onMeasurementsReady={measurementsReady}
            onSelect={() =>
              choose({
                type: item.kind,
                id: item.id,
                wallId: item.wallId,
                opening: item.opening,
              })
            }
          />
        </group>
      ))}
      {labels ? (
        <Suspense fallback={null}>
          <Text
            font="/fonts/NRT-Reg.ttf"
            onSync={measurementsReady}
            position={[0, height + 0.2, 0]}
            fontSize={Math.max(0.12, length / 34)}
            color="#172033"
          >{`${length.toFixed(2)} m`}</Text>
          {!singleWall ? (
            <Text
              font="/fonts/NRT-Reg.ttf"
              onSync={measurementsReady}
              position={[length / 2 + 0.2, height / 2, width / 2]}
              fontSize={Math.max(0.12, width / 28)}
              color="#172033"
            >{`${width.toFixed(2)} m`}</Text>
          ) : null}
          <Text
            font="/fonts/NRT-Reg.ttf"
            onSync={measurementsReady}
            position={[-length / 2 - 0.2, height / 2, 0]}
            fontSize={Math.max(0.12, height / 15)}
            color="#172033"
          >{`${height.toFixed(2)} m`}</Text>
        </Suspense>
      ) : null}
      </group>
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan
        enableZoom
        enableRotate
        enableDamping
        dampingFactor={0.08}
        screenSpacePanning
        touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
        autoRotate={autoRotate}
        autoRotateSpeed={0.8}
      />
      <FitRenderedModel
        model={model}
        controls={controls}
        fitView={fitView}
        geometryKey={geometryKey}
        singleWall={singleWall}
      />
    </>
  );
}

export function RoomThreeScene({
  unit,
  block,
  selection,
  onSelectionChange,
}: Props) {
  const { t } = useI18n();
  const controls = useRef<OrbitControlsImpl>(null);
  const fitView = useRef<(() => void) | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [labels, setLabels] = useState(true);
  const [fullScreen, setFullScreen] = useState(false);
  const [isolated, setIsolated] = useState(false);
  const [cutaway, setCutaway] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [internalSelection, setInternalSelection] = useState<PreviewSelection>({
    type: "wall",
    id: "front",
  });
  const activeSelection = selection ?? internalSelection;
  const width =
    unit.width ?? Math.max(unit.length * 0.25, block.thicknessCm / 50);
  const modelSize = Math.max(unit.length, width, unit.height);
  const target = new Vector3(
    0,
    unit.height / 2,
    unit.kind === "wall" ? 0 : width / 2,
  );
  const setCamera = (x: number, y: number, z: number) => {
    const orbit = controls.current;
    if (!orbit) return;
    orbit.object.position.set(x, y, z);
    orbit.target.set(0, unit.height / 2, unit.kind === "wall" ? 0 : width / 2);
    orbit.object.near = 0.05;
    orbit.object.far = Math.max(100, modelSize * 20);
    orbit.object.updateProjectionMatrix();
    orbit.update();
  };
  const viewInterior = () => {
    if (unit.kind === "wall") {
      setCamera(
        modelSize * 0.32,
        unit.height * 0.52,
        target.z + modelSize * 0.45,
      );
      return;
    }

    // Keep the camera between the inner faces of the front and back walls.
    // The previous preset was derived from modelSize, which could position it
    // beyond the back wall for rectangular rooms.
    const previewThickness = Math.min(
      Math.max(block.thicknessCm / 100, 0.04),
      Math.min(unit.length, width) * 0.18,
    );
    const interiorInset =
      previewThickness / 2 + Math.min(0.08, Math.max(0.015, previewThickness * 0.35));
    const minimumZ = interiorInset;
    const maximumZ = width - interiorInset;
    // View the front wall from within the room. This makes the preset useful
    // for inspecting openings from their interior face immediately; Orbit
    // controls can still rotate to any other interior wall.
    const interiorZ =
      minimumZ <= maximumZ
        ? Math.min(Math.max(width * 0.84, minimumZ), maximumZ)
        : width / 2;
    setCamera(0, unit.height * 0.52, interiorZ);
  };
  const fit = () => fitView.current?.();
  useEffect(() => {
    const listener = () => setFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", listener);
    return () => document.removeEventListener("fullscreenchange", listener);
  }, []);
  const choose = (next: PreviewSelection) => {
    setInternalSelection(next);
    onSelectionChange?.(next);
  };
  const fullscreen = async () => {
    try {
      if (!document.fullscreenElement)
        await containerRef.current?.closest(".three-workspace")?.requestFullscreen?.();
      else await document.exitFullscreen();
    } catch {
      setFullScreen(false);
    }
  };
  const zoom = (scale: number) => {
    const orbit = controls.current;
    if (!orbit) return;
    orbit.object.position.sub(orbit.target).multiplyScalar(scale).add(orbit.target);
    orbit.update();
  };
  const cameraOptions = useMemo(() => ({ fov: 42 }), []);
  const toolButton = "flex min-h-11 min-w-11 items-center justify-center gap-1 rounded bg-white px-2 py-2 text-xs font-bold text-slate-900 shadow-sm";
  return (
    <div
      id="three-canvas"
      ref={containerRef}
      className="three-canvas relative h-full min-h-0 overflow-hidden rounded-xl bg-slate-100"
    >
      <div className="three-toolbar" role="group" aria-label={t("preview.controls")}>
        <button type="button" onClick={fit} aria-label={t("preview.fit")} title={t("preview.fit")} className="grid size-11 place-items-center rounded-xl bg-[var(--brand-navy)] text-[var(--brand-cream)] shadow-lg"><Focus size={19} /></button>
        <button type="button" onClick={() => setToolbarOpen((value) => !value)} aria-expanded={toolbarOpen} aria-controls="three-toolbar-panel" aria-label={t("preview.controls")} title={t("preview.controls")} className="grid size-11 place-items-center rounded-xl bg-[var(--brand-navy)] text-[var(--brand-cream)] shadow-lg"><SlidersHorizontal size={19} /></button>
        {toolbarOpen ? <div id="three-toolbar-panel" className="three-toolbar-panel">
      <div className="flex max-w-full flex-wrap gap-1.5">
        <button
          type="button"
          onClick={fit}
          className={toolButton}
        >
          <Focus size={14} />
          {t("preview.fit")}
        </button>
        <button
          type="button"
          onClick={fit}
          className={toolButton}
        >
          <RotateCcw size={14} />
          {t("preview.reset")}
        </button>
        <button
          type="button"
          onClick={() => setLabels((value) => !value)}
          className={toolButton}
          aria-pressed={labels}
        >
          {labels ? (
            <EyeOff size={14} />
          ) : (
            <Eye size={14} />
          )}
          {t("preview.measurements")}
        </button>
        <button
          type="button"
          onClick={() => setIsolated((value) => !value)}
          className={toolButton}
          aria-pressed={isolated}
        >
          <Layers size={14} />
          {t("preview.isolate")}
        </button>
        <button
          type="button"
          onClick={() => setCutaway((value) => !value)}
          className={toolButton}
          aria-pressed={cutaway}
        >
          <Scissors size={14} />
          {t("preview.cutaway")}
        </button>
        <button
          type="button"
          onClick={() => setAutoRotate((value) => !value)}
          className={toolButton}
          aria-pressed={autoRotate}
        >
          {t("preview.autoRotate")}
        </button>
        <button
          type="button"
          onClick={fullscreen}
          className={toolButton}
        >
          <Expand size={14} />
          {t(fullScreen ? "preview.exitFullscreen" : "preview.fullscreen")}
        </button>
      </div>
      <div className="flex w-full flex-wrap gap-1">
        <button
          type="button"
          onClick={fit}
          className={toolButton}
        >
          3D
        </button>
        <button
          type="button"
          onClick={() => setCamera(0, modelSize * 1.9, target.z + 0.01)}
          className={toolButton}
        >
          {t("preview.top")}
        </button>
        <button
          type="button"
          onClick={() => setCamera(0, modelSize * 0.8, -modelSize * 1.6)}
          className={toolButton}
        >
          {t("preview.front")}
        </button>
        <button
          type="button"
          onClick={() =>
            setCamera(0, modelSize * 0.8, target.z + modelSize * 1.7)
          }
          className={toolButton}
        >
          {t("preview.backView")}
        </button>
        <button
          type="button"
          onClick={() => setCamera(modelSize * 1.7, modelSize * 0.8, target.z)}
          className={toolButton}
        >
          {t("preview.right")}
        </button>
        <button
          type="button"
          onClick={() => setCamera(-modelSize * 1.7, modelSize * 0.8, target.z)}
          className={toolButton}
        >
          {t("preview.left")}
        </button>
        <button
          type="button"
          onClick={viewInterior}
          className={toolButton}
        >
          {t("preview.interior")}
        </button>
        <button
          type="button"
          onClick={() => zoom(1.16)}
          className={toolButton}
          aria-label={t("preview.zoomOut")}
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          onClick={() => zoom(0.86)}
          className={toolButton}
          aria-label={t("preview.zoomIn")}
        >
          <Plus size={15} />
        </button>
      </div>
      </div> : null}</div>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={cameraOptions}
        resize={{ scroll: false, debounce: 0 }}
        style={{ height: "100%", touchAction: "none" }}
        fallback={<p>{t("preview.webgl")}</p>}
      >
        <Scene
          unit={unit}
          block={block}
          controls={controls}
          labels={labels}
          selected={activeSelection}
          isolated={isolated}
          cutaway={cutaway}
          autoRotate={autoRotate}
          fitView={fitView}
          choose={choose}
        />
      </Canvas>
    </div>
  );
}
