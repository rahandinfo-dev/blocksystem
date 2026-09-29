"use client";

import dynamic from "next/dynamic";
import { ArrowRight, Box, Maximize2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AppSelect } from "@/components/ui/app-select";
import type { BlockDefinition, NumericUnit } from "@/features/calculator/types";
import { wallName, type PreviewSelection } from "./room-three-scene";

const RoomThreeScene = dynamic(
  () => import("./room-three-scene").then((module) => module.RoomThreeScene),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full min-h-80 place-items-center bg-slate-100">
        بارکردنی دیمەنی 3D…
      </div>
    ),
  },
);
interface Props {
  units: NumericUnit[];
  block: BlockDefinition;
}

function openingLabel(type: PreviewSelection["type"]) {
  return type === "door"
    ? "دەرگا"
    : type === "window"
      ? "پەنجەرە"
      : type === "other"
        ? "کراوەی تر"
        : "دیوار";
}

export function WallPreview({ units, block }: Props) {
  const viable = units.filter(
    (unit) =>
      unit.length > 0 &&
      unit.height > 0 &&
      (unit.kind === "wall" || (unit.width ?? 0) > 0),
  );
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(viable[0]?.id ?? "");
  const [selection, setSelection] = useState<PreviewSelection>({
    type: "wall",
    id: "front",
  });
  const active = useMemo(
    () => viable.find((unit) => unit.id === activeId) ?? viable[0],
    [activeId, viable],
  );
  if (!active)
    return (
      <section
        id="room-preview"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-xl font-bold">پێشبینینی ژوور</h2>
        <p className="mt-2 text-sm text-slate-600">
          درێژی، پانی و بەرزی بنووسە بۆ کردنەوەی پێشبینینی 3D.
        </p>
      </section>
    );
  const width = active.width ?? active.length;
  const opening = selection.type === "wall" ? undefined : selection.opening;
  const openingWallId = selection.type === "wall" ? undefined : selection.wallId;
  const openingCount =
    active.doors.reduce((sum, item) => sum + item.quantity, 0) +
    active.windows.reduce((sum, item) => sum + item.quantity, 0) +
    (active.otherOpenings ?? []).reduce((sum, item) => sum + item.quantity, 0);
  const openingArea = [
    ...active.doors,
    ...active.windows,
    ...(active.otherOpenings ?? []),
  ].reduce((sum, item) => sum + item.width * item.height * item.quantity, 0);
  const grossArea =
    active.kind === "room"
      ? 2 * (active.length + width) * active.height
      : active.length * active.height;
  return (
    <>
      <section
        id="room-preview"
        className="rounded-2xl border border-slate-200 bg-[var(--brand-navy)] p-6 text-[var(--brand-cream)] shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <Box size={22} className="text-amber-300" />
              <h2 className="text-xl font-bold">پێشبینینی ژوور 3D</h2>
            </div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-200">
              دیمەنی تەواوی ژوورەکەت بکەرەوە؛ سوڕان، زووم، هەڵبژاردنی دیوار و
              کراوەکان بەردەستن.
            </p>
            <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-200">
              <span dir="ltr">
                {active.length.toFixed(2)} × {width.toFixed(2)} ×{" "}
                {active.height.toFixed(2)} m
              </span>
              <span>پانی دیوار: {block.thicknessCm} cm</span>
            </dl>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-amber-500 px-4 font-bold text-slate-950 hover:bg-amber-400"
          >
            <Maximize2 size={18} /> کردنەوەی پێشبینینی 3D
          </button>
        </div>
      </section>
      {open ? (
        <div
          className="three-workspace fixed inset-0 z-[70] flex min-h-[100dvh] flex-col bg-slate-950 p-3 text-white sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="پێشبینینی تەواوی 3D"
        >
          <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">پێشبینینی تەواوی 3D</h2>
              <p className="text-sm text-slate-300">
                ڕاکێشان بۆ سوڕان؛ ویل/پینچ بۆ زووم.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <AppSelect
                aria-label="هەڵبژاردنی ژوور"
                value={active.id}
                onChange={(event) => setActiveId(event.target.value)}
                className="min-h-11 max-w-48 rounded-lg bg-white px-3 text-sm font-bold text-slate-900"
              >
                {viable.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </AppSelect>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-3 font-bold text-slate-900"
              >
                <ArrowRight size={18} /> گەڕانەوە
              </button>
            </div>
          </header>
          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="min-h-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-100">
              <RoomThreeScene
                unit={active}
                block={block}
                selection={selection}
                onSelectionChange={setSelection}
              />
            </div>
            <aside className="rounded-2xl bg-slate-900 p-4 text-sm shadow-lg lg:overflow-y-auto">
              <h3 className="text-lg font-bold text-amber-300">
                {openingLabel(selection.type)}
              </h3>
              {opening ? (
                <dl className="mt-4 space-y-3 text-slate-200">
                  <div>
                    <dt className="text-slate-400">پانی × بەرزی</dt>
                    <dd dir="ltr" className="font-bold">
                      {opening.width.toFixed(2)} × {opening.height.toFixed(2)} m
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">ڕووبەر</dt>
                    <dd dir="ltr" className="font-bold">
                      {(opening.width * opening.height).toFixed(2)} m²
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">دیوار</dt>
                    <dd>{openingWallId ? wallName[openingWallId] : "—"}</dd>
                  </div>
                  {opening.horizontalPosition !== undefined ? (
                    <div>
                      <dt className="text-slate-400">شوێنی ئاسۆیی</dt>
                      <dd dir="ltr" className="font-bold">{opening.horizontalPosition.toFixed(2)} m</dd>
                    </div>
                  ) : null}
                  {selection.type === "window" && opening.sillHeight !== undefined ? (
                    <div>
                      <dt className="text-slate-400">بەرزی سەرپەنجەرە</dt>
                      <dd dir="ltr" className="font-bold">{opening.sillHeight.toFixed(2)} m</dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <dl className="mt-4 space-y-3 text-slate-200">
                  <div>
                    <dt className="text-slate-400">درێژی × بەرزی</dt>
                    <dd dir="ltr" className="font-bold">
                      {active.length.toFixed(2)} × {active.height.toFixed(2)} m
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">پانی بلۆک/دیوار</dt>
                    <dd>{block.thicknessCm} cm</dd>
                  </div>
                </dl>
              )}
              <hr className="my-5 border-slate-700" />
              <h4 className="font-bold">ئاماری ژوور</h4>
              <dl className="mt-3 space-y-2 text-slate-200">
                <div className="flex justify-between">
                  <dt>کراوەکان</dt>
                  <dd>{openingCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>ڕووبەری گشتی</dt>
                  <dd dir="ltr">{grossArea.toFixed(2)} m²</dd>
                </div>
                <div className="flex justify-between">
                  <dt>ڕووبەری کراوەکان</dt>
                  <dd dir="ltr">{openingArea.toFixed(2)} m²</dd>
                </div>
                <div className="flex justify-between font-bold">
                  <dt>ڕووبەری پاک</dt>
                  <dd dir="ltr">
                    {Math.max(0, grossArea - openingArea).toFixed(2)} m²
                  </dd>
                </div>
              </dl>
              <p className="mt-5 text-xs leading-5 text-slate-400">
                شوێنی دەرگا و پەنجەرە لە داتای پڕۆژە پاشەکەوت دەکرێت و لە دیمەنی 3D بە هەمان قەبارە و شوێن نیشان دەدرێت.
              </p>
            </aside>
          </div>
        </div>
      ) : null}
    </>
  );
}
