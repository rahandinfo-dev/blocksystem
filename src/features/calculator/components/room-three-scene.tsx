"use client";

import { Edges, Line, OrbitControls, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Expand,
  Download,
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
import { Box3, DoubleSide, Group, OrthographicCamera, PerspectiveCamera, Plane, TOUCH, Vector3 } from "three";
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
import {
  clampSectionPosition,
  displayDistance,
  explodedOffset,
  screenshotFilename,
  worldDistance,
  type DistanceUnit,
  type SectionAxis,
  type WorldPoint,
} from "@/features/calculator/lib/three-workspace";

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
  validationIds?: string[];
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
  xray,
  wireframe,
  clippingPlanes,
}: {
  item: OpeningModel;
  thickness: number;
  showMeasurements: boolean;
  selected: boolean;
  onSelect: (point: WorldPoint) => void;
  onMeasurementsReady: () => void;
  xray: boolean;
  wireframe: boolean;
  clippingPlanes: Plane[];
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
        onSelect({ x: event.point.x, y: event.point.y, z: event.point.z });
      }}
    >
      {kind === "door" ? (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[innerWidth, innerHeight, panelDepth]} />
          <meshStandardMaterial color={panelColor} roughness={0.7} wireframe={wireframe} transparent={xray} opacity={xray ? 0.36 : 1} clippingPlanes={clippingPlanes} />
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
            wireframe={wireframe}
            clippingPlanes={clippingPlanes}
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
          <meshStandardMaterial color={selected ? "#efb54a" : "#EDE6CC"} wireframe={wireframe} transparent={xray} opacity={xray ? 0.38 : 1} clippingPlanes={clippingPlanes} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={`header-${side}`}
          position={[0, side * (opening.height - horizontalFrame) / 2, 0]}
          castShadow
        >
          <boxGeometry args={[innerWidth, horizontalFrame, frameDepth]} />
          <meshStandardMaterial color={selected ? "#efb54a" : "#EDE6CC"} wireframe={wireframe} transparent={xray} opacity={xray ? 0.38 : 1} clippingPlanes={clippingPlanes} />
        </mesh>
      ))}
      {kind === "window" ? (
        <>
          <mesh castShadow>
            <boxGeometry args={[Math.min(verticalFrame * 0.72, innerWidth), innerHeight, frameDepth]} />
            <meshStandardMaterial color={selected ? "#efb54a" : "#EDE6CC"} wireframe={wireframe} transparent={xray} opacity={xray ? 0.38 : 1} clippingPlanes={clippingPlanes} />
          </mesh>
          <mesh castShadow>
            <boxGeometry args={[innerWidth, Math.min(horizontalFrame * 0.72, innerHeight), frameDepth]} />
            <meshStandardMaterial color={selected ? "#efb54a" : "#EDE6CC"} wireframe={wireframe} transparent={xray} opacity={xray ? 0.38 : 1} clippingPlanes={clippingPlanes} />
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
            <meshStandardMaterial color="#EDE6CC" metalness={0.25} roughness={0.45} wireframe={wireframe} transparent={xray} opacity={xray ? 0.45 : 1} clippingPlanes={clippingPlanes} />
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
  xray,
  wireframe,
  clippingPlanes,
  visible,
  invalid,
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
  onSelect: (id: PreviewWallId, point: WorldPoint) => void;
  xray: boolean;
  wireframe: boolean;
  clippingPlanes: Plane[];
  visible: boolean;
  invalid: boolean;
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
  const edgeColor = invalid ? "#dc2626" : isFront ? "#EDE6CC" : "#8d714b";
  return (
    <group
      position={position}
      rotation={rotation}
      name={`wall:${id}`}
      visible={visible}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(id, { x: event.point.x, y: event.point.y, z: event.point.z });
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
            transparent={opacity < 1 || xray}
            opacity={xray ? Math.min(opacity, 0.28) : opacity}
            wireframe={wireframe}
            clippingPlanes={clippingPlanes}
          />
          <Edges color={edgeColor} threshold={20} />
        </mesh>
      ))}
    </group>
  );
}

function fitRenderedModel(group: Group, orbit: OrbitControlsImpl, width: number, height: number, singleWall: boolean) {
    const camera = orbit.object;
    if (!(camera instanceof PerspectiveCamera || camera instanceof OrthographicCamera) || width <= 0 || height <= 0) return false;
    // This group contains the actual walls, frames, openings and measurements.
    // The decorative ground is deliberately outside its measured bounds.
    group.updateWorldMatrix(true, true);
    const bounds = new Box3().setFromObject(group);
    if (bounds.isEmpty() || !Number.isFinite(bounds.min.lengthSq() + bounds.max.lengthSq())) return false;
    if (camera instanceof OrthographicCamera) {
      const target = bounds.getCenter(new Vector3());
      const size = bounds.getSize(new Vector3());
      const aspect = width / height;
      const halfHeight = Math.max(0.5, size.y * 0.72, size.x / Math.max(aspect, 0.01) * 0.62, size.z * 0.72) * 1.18;
      camera.left = -halfHeight * aspect;
      camera.right = halfHeight * aspect;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.near = Math.max(0.005, Math.min(0.05, size.length() / 1000));
      camera.far = Math.max(100, size.length() * 20);
      camera.position.copy(target).add(new Vector3(1, 0.72, singleWall ? 1 : 1.2).normalize().multiplyScalar(Math.max(8, size.length() * 2)));
      camera.updateProjectionMatrix();
      orbit.target.copy(target);
      orbit.minDistance = 0.08;
      orbit.maxDistance = Math.max(8, size.length() * 6);
      orbit.update();
      return true;
    }
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
  selected,
  fitSelection: fitSelectionRef,
}: {
  model: React.RefObject<Group | null>;
  controls: React.RefObject<OrbitControlsImpl | null>;
  fitView: React.RefObject<(() => void) | null>;
  geometryKey: string;
  singleWall: boolean;
  selected: PreviewSelection;
  fitSelection: React.RefObject<(() => void) | null>;
}) {
  const size = useThree((state) => state.size);
  const lastFit = useRef("");
  const requested = useRef(true);

  useEffect(() => {
    fitViewRef.current = () => { requested.current = true; };
    fitSelectionRef.current = () => {
      const model = modelRef.current;
      const orbit = controlsRef.current;
      if (!model || !orbit) return;
      const name = selected.type === "wall" ? `wall:${selected.id}` : `opening:${selected.id}`;
      const selectedObject = model.getObjectByName(name);
      if (!selectedObject) return;
      fitRenderedModel(selectedObject as Group, orbit, size.width, size.height, false);
    };
    return () => { fitViewRef.current = null; fitSelectionRef.current = null; };
  }, [controlsRef, fitSelectionRef, fitViewRef, modelRef, selected, size.height, size.width]);

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
  fitSelection,
  choose,
  xray,
  wireframe,
  exploded,
  section,
  hidden,
  measureMode,
  measurementPoints,
  recordMeasurement,
  validationIds,
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
  fitSelection: React.RefObject<(() => void) | null>;
  choose: (selection: PreviewSelection) => void;
  xray: boolean;
  wireframe: boolean;
  exploded: boolean;
  section: { enabled: boolean; axis: SectionAxis; position: number };
  hidden: Set<string>;
  measureMode: boolean;
  measurementPoints: WorldPoint[];
  recordMeasurement: (point: WorldPoint) => void;
  validationIds: Set<string>;
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
  const modelSize = Math.max(length, width, height);
  const sectionPlane = useMemo(() => {
    if (!section.enabled) return [];
    const normal = section.axis === "x" ? new Vector3(1, 0, 0) : section.axis === "y" ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
    return [new Plane(normal, -section.position)];
  }, [section]);
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
  const wallVisible = (id: PreviewWallId) => {
    if (hidden.has(id)) return false;
    if (!isolated) return true;
    return selected.type === "wall" ? selected.id === id : selected.wallId === id;
  };
  const positionedWall = (id: PreviewWallId) => {
    const base = transforms[id].position;
    const offset = exploded ? explodedOffset(`wall:${id}`, Math.max(length, width, height) * 0.12) : [0, 0, 0] as [number, number, number];
    return [base[0] + offset[0], base[1] + offset[1], base[2] + offset[2]] as [number, number, number];
  };
  const chooseAtPoint = (next: PreviewSelection, point: WorldPoint) => {
    choose(next);
    if (measureMode) recordMeasurement(point);
  };
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
        position={positionedWall("front")}
        rotation={transforms.front.rotation}
        openings={openingsByWall.front}
        selected={selected.type === "wall" && selected.id === "front"}
        opacity={wallOpacity("front")}
        onSelect={(id, point) => chooseAtPoint({ type: "wall", id }, point)}
        xray={xray}
        wireframe={wireframe}
        clippingPlanes={sectionPlane}
        visible={wallVisible("front")}
        invalid={validationIds.has(unit.id)}
      />
      {!singleWall ? (
        <>
          <WallSurface
            id="right"
            length={transforms.right.length}
            height={height}
            thickness={thickness}
            position={positionedWall("right")}
            rotation={transforms.right.rotation}
            openings={openingsByWall.right}
            selected={selected.type === "wall" && selected.id === "right"}
            opacity={wallOpacity("right")}
            onSelect={(id, point) => chooseAtPoint({ type: "wall", id }, point)}
            xray={xray}
            wireframe={wireframe}
            clippingPlanes={sectionPlane}
            visible={wallVisible("right")}
            invalid={validationIds.has(unit.id)}
          />
          <WallSurface
            id="back"
            length={transforms.back.length}
            height={height}
            thickness={thickness}
            position={positionedWall("back")}
            rotation={transforms.back.rotation}
            openings={openingsByWall.back}
            selected={selected.type === "wall" && selected.id === "back"}
            opacity={wallOpacity("back")}
            onSelect={(id, point) => chooseAtPoint({ type: "wall", id }, point)}
            xray={xray}
            wireframe={wireframe}
            clippingPlanes={sectionPlane}
            visible={wallVisible("back")}
            invalid={validationIds.has(unit.id)}
          />
          <WallSurface
            id="left"
            length={transforms.left.length}
            height={height}
            thickness={thickness}
            position={positionedWall("left")}
            rotation={transforms.left.rotation}
            openings={openingsByWall.left}
            selected={selected.type === "wall" && selected.id === "left"}
            opacity={wallOpacity("left")}
            onSelect={(id, point) => chooseAtPoint({ type: "wall", id }, point)}
            xray={xray}
            wireframe={wireframe}
            clippingPlanes={sectionPlane}
            visible={wallVisible("left")}
            invalid={validationIds.has(unit.id)}
          />
        </>
      ) : null}
      {openings.map((item) => (
        <group key={item.id} name={`opening:${item.id}`} visible={!hidden.has(item.id) && (!isolated || selected.type !== "wall" || selected.id === item.wallId)} position={(exploded ? (() => { const offset = explodedOffset(`opening:${item.kind}`, Math.max(length, width, height) * 0.12); return [item.position[0] + offset[0], item.position[1] + offset[1], item.position[2] + offset[2]] as [number, number, number]; })() : item.position)} rotation={item.rotation}>
          <Opening
            item={item}
            thickness={thickness}
            showMeasurements={labels}
            selected={selected.type === item.kind && selected.id === item.id}
            onMeasurementsReady={measurementsReady}
            onSelect={(point) =>
              chooseAtPoint({
                type: item.kind,
                id: item.id,
                wallId: item.wallId,
                opening: item.opening,
              }, point)
            }
            xray={xray}
            wireframe={wireframe}
            clippingPlanes={sectionPlane}
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
      {measurementPoints.length === 2 ? (
        <>
          <Line points={measurementPoints.map((point) => [point.x, point.y, point.z])} color="#dc2626" lineWidth={2} />
          <Text position={[(measurementPoints[0].x + measurementPoints[1].x) / 2, (measurementPoints[0].y + measurementPoints[1].y) / 2 + 0.12, (measurementPoints[0].z + measurementPoints[1].z) / 2]} fontSize={Math.max(0.1, modelSize / 42)} color="#991b1b">{worldDistance(measurementPoints[0], measurementPoints[1]).toFixed(3)} m</Text>
        </>
      ) : null}
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
        selected={selected}
        fitSelection={fitSelection}
      />
    </>
  );
}

export function RoomThreeScene({
  unit,
  block,
  selection,
  onSelectionChange,
  validationIds = [],
}: Props) {
  const { t } = useI18n();
  const controls = useRef<OrbitControlsImpl>(null);
  const fitView = useRef<(() => void) | null>(null);
  const fitSelection = useRef<(() => void) | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [labels, setLabels] = useState(true);
  const [fullScreen, setFullScreen] = useState(false);
  const [isolated, setIsolated] = useState(false);
  const [cutaway, setCutaway] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [xray, setXray] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [measureMode, setMeasureMode] = useState(false);
  const [measurementPoints, setMeasurementPoints] = useState<WorldPoint[]>([]);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>("m");
  const [section, setSection] = useState<{ enabled: boolean; axis: SectionAxis; position: number }>({ enabled: false, axis: "z", position: 0 });
  const [projection, setProjection] = useState<"perspective" | "orthographic">("perspective");
  const [screenshotError, setScreenshotError] = useState(false);
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
  const recordMeasurement = (point: WorldPoint) => {
    if (!measureMode) return;
    setMeasurementPoints((current) => current.length >= 2 ? [point] : [...current, point]);
  };
  useEffect(() => {
    const listener = () => setFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", listener);
    return () => document.removeEventListener("fullscreenchange", listener);
  }, []);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "Escape") { setMeasureMode(false); setMeasurementPoints([]); }
      if (event.key.toLowerCase() === "f") fit();
      if (event.key.toLowerCase() === "m") { setMeasureMode((value) => !value); setMeasurementPoints([]); }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  });
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
  const hideSelection = () => setHidden((current) => new Set(current).add(activeSelection.id));
  const captureScreenshot = () => {
    const canvas = containerRef.current?.querySelector("canvas");
    if (!canvas || typeof canvas.toBlob !== "function") { setScreenshotError(true); return; }
    canvas.toBlob((blob) => {
      if (!blob) { setScreenshotError(true); return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = screenshotFilename(unit.name);
      link.click();
      URL.revokeObjectURL(url);
      setScreenshotError(false);
    }, "image/png");
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
        <button type="button" onClick={() => { setMeasureMode((value) => !value); setMeasurementPoints([]); }} className={toolButton} aria-pressed={measureMode}>
          {t("three.measure")}
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
        <button type="button" onClick={hideSelection} className={toolButton}>{t("three.hide")}</button>
        <button type="button" onClick={() => { setHidden(new Set()); setIsolated(false); }} className={toolButton}>{t("three.showAll")}</button>
        <button
          type="button"
          onClick={() => setCutaway((value) => !value)}
          className={toolButton}
          aria-pressed={cutaway}
        >
          <Scissors size={14} />
          {t("preview.cutaway")}
        </button>
        <button type="button" onClick={() => setExploded((value) => !value)} className={toolButton} aria-pressed={exploded}>{t("three.exploded")}</button>
        <button type="button" onClick={() => setExploded(false)} className={toolButton}>{t("three.resetExploded")}</button>
        <button type="button" onClick={() => setXray((value) => !value)} className={toolButton} aria-pressed={xray}>{t("three.xray")}</button>
        <button type="button" onClick={() => setWireframe((value) => !value)} className={toolButton} aria-pressed={wireframe}>{t("three.wireframe")}</button>
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
        <button type="button" onClick={captureScreenshot} className={toolButton}><Download size={14} />{t("three.screenshot")}</button>
      </div>
      <div className="flex w-full flex-wrap gap-1">
        <button
          type="button"
          onClick={fit}
          className={toolButton}
        >
          {t("three.view")}
        </button>
        <button type="button" onClick={() => fitSelection.current?.()} className={toolButton}>{t("three.fitSelection")}</button>
        <button type="button" onClick={fit} className={toolButton}>{t("three.resetCamera")}</button>
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
        <button type="button" onClick={() => setCamera(modelSize * 1.55, modelSize * 1.3, target.z - modelSize * 1.55)} className={toolButton}>{t("three.isometric")}</button>
        <button type="button" onClick={() => setCamera(0, -modelSize * 1.3, target.z + 0.01)} className={toolButton}>{t("three.bottom")}</button>
        <button type="button" onClick={() => setProjection((value) => value === "perspective" ? "orthographic" : "perspective")} className={toolButton} aria-pressed={projection === "orthographic"}>{t(projection === "orthographic" ? "three.orthographic" : "three.perspective")}</button>
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
      <div className="mt-1 grid w-full gap-1 rounded bg-white/70 p-1 text-xs text-slate-800">
        <button type="button" onClick={() => setSection((current) => ({ ...current, enabled: !current.enabled }))} className={toolButton} aria-pressed={section.enabled}>{t("three.section")}</button>
        {section.enabled ? <div className="flex flex-wrap items-center gap-2 p-1"><label className="flex items-center gap-1">{t("three.sectionAxis")}<select value={section.axis} onChange={(event) => setSection((current) => ({ ...current, axis: event.target.value as SectionAxis }))}><option value="x">X</option><option value="y">Y</option><option value="z">Z</option></select></label><label className="flex min-w-40 flex-1 items-center gap-1"><span>{t("three.sectionPosition")}</span><input className="min-w-20 flex-1" type="range" min={-modelSize} max={modelSize} step="0.01" value={section.position} onChange={(event) => setSection((current) => ({ ...current, position: clampSectionPosition(Number(event.target.value), modelSize) }))} /></label><button type="button" onClick={() => setSection((current) => ({ ...current, enabled: false, position: 0 }))} className={toolButton}>{t("three.resetSection")}</button></div> : null}
      </div>
      </div> : null}</div>
      <Canvas
        key={projection}
        shadows
        frameloop={autoRotate ? "always" : "demand"}
        dpr={[1, 1.75]}
        camera={cameraOptions}
        orthographic={projection === "orthographic"}
        gl={{ antialias: true, localClippingEnabled: true, preserveDrawingBuffer: true }}
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
          fitSelection={fitSelection}
          choose={choose}
          xray={xray}
          wireframe={wireframe}
          exploded={exploded}
          section={section}
          hidden={hidden}
          measureMode={measureMode}
          measurementPoints={measurementPoints}
          recordMeasurement={recordMeasurement}
          validationIds={new Set(validationIds)}
        />
      </Canvas>
      <div className="sr-only" aria-live="polite">{measureMode ? t("three.measureHint") : ""}</div>
      {measurementPoints.length === 2 ? <div className="three-measurement" dir="ltr"><span>{t("three.measurement")}: {displayDistance(worldDistance(measurementPoints[0], measurementPoints[1]), distanceUnit).toFixed(distanceUnit === "m" ? 3 : 1)}</span><label className="sr-only" htmlFor="three-distance-unit">{t("three.worldUnits")}</label><select id="three-distance-unit" value={distanceUnit} onChange={(event) => setDistanceUnit(event.target.value as DistanceUnit)}><option value="m">m</option><option value="cm">cm</option><option value="mm">mm</option></select><button type="button" onClick={() => setMeasurementPoints([])}>{t("three.clearMeasure")}</button></div> : null}
      {screenshotError ? <p className="three-toast" role="alert">{t("three.screenshotUnavailable")}</p> : null}
    </div>
  );
}
