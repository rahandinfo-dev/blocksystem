"use client";

import dynamic from "next/dynamic";
import { ArrowRight, Box, ChevronDown, Maximize2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppSelect } from "@/components/ui/app-select";
import { languageDetails, languages, useI18n, type Language } from "@/lib/i18n";
import type { BlockDefinition, NumericUnit } from "@/features/calculator/types";
import type { PreviewSelection } from "./room-three-scene";
import { PreviewWorkspace } from "./preview-workspace";

const RoomThreeScene = dynamic(
  () => import("./room-three-scene").then((module) => module.RoomThreeScene),
  {
    ssr: false,
    loading: PreviewLoading,
  },
);
interface Props {
  units: NumericUnit[];
  block: BlockDefinition;
}

function PreviewLoading() {
  const { t } = useI18n();
  return <div className="grid h-full place-items-center" role="status">{t("preview.loading")}</div>;
}

export function WallPreview({ units, block }: Props) {
  const { t, language, direction, setLanguage } = useI18n();
  const viable = units.filter(
    (unit) =>
      unit.length > 0 &&
      unit.height > 0 &&
      (unit.kind === "wall" || (unit.width ?? 0) > 0),
  );
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const historyToken = useRef<string | null>(null);
  const enter = () => {
    const token = crypto.randomUUID();
    historyToken.current = token;
    window.history.pushState({ ...window.history.state, blocksystemPreview: token }, "");
    setDetailsOpen(false);
    setSelection({ type: "wall", id: "front" });
    setOpen(true);
  };
  const close = useCallback(() => {
    if (historyToken.current && window.history.state?.blocksystemPreview === historyToken.current) {
      window.history.back();
    } else {
      setOpen(false);
    }
  }, []);
  useEffect(() => {
    if (!open) return;
    const back = () => { historyToken.current = null; setOpen(false); };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, [open]);
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
        <h2 className="text-xl font-bold">{t("preview.heading")}</h2>
        <p className="mt-2 text-sm text-slate-600">
          {t("preview.enterDimensions")}
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
              <h2 className="text-xl font-bold">{t("preview.title")}</h2>
            </div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-200">
              {t("preview.description")}
            </p>
            <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-200">
              <span dir="ltr">
                {active.length.toFixed(2)} × {width.toFixed(2)} ×{" "}
                {active.height.toFixed(2)} m
              </span>
              <span>{t("preview.wallThickness")}: {block.thicknessCm} cm</span>
            </dl>
          </div>
          <button
            type="button"
            onClick={enter}
            className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-amber-500 px-4 font-bold text-slate-950 hover:bg-amber-400"
          >
            <Maximize2 size={18} /> {t("preview.open")}
          </button>
        </div>
      </section>
      {open ? (
        <PreviewWorkspace onClose={close}>
          <header className="three-workspace-header">
            <div className="three-workspace-introduction">
              <h2 className="text-lg font-bold">{t("preview.title")}</h2>
              <p className="text-sm text-slate-300">
                {t("preview.gestures")}
              </p>
            </div>
              <button
                type="button"
                data-preview-close
                aria-label={t("common.close")}
                onClick={close}
                className="three-close inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-3 font-bold text-slate-900"
              >
                <ArrowRight size={18} style={{ transform: direction === "ltr" ? "rotate(180deg)" : undefined }} /> {t("preview.back")}
              </button>
          </header>
          <div className="three-workspace-content">
            <div className="three-scene-slot">
              <RoomThreeScene
                unit={active}
                block={block}
                selection={selection}
                onSelectionChange={setSelection}
              />
            </div>
            <aside className="three-details bg-slate-900 text-sm shadow-lg" data-open={detailsOpen}>
              <button className="three-details-toggle" type="button" aria-expanded={detailsOpen} aria-controls="three-details-content" onClick={() => setDetailsOpen((value) => !value)}>
                {t("preview.details")} <ChevronDown size={18} />
              </button>
              <div id="three-details-content" className="three-details-content">
              <div className="mb-4 grid gap-3">
                <label className="grid gap-1">{t("preview.chooseModel")}
                  <AppSelect aria-label={t("preview.selectRoom")} value={active.id} onChange={(event) => { setActiveId(event.target.value); setSelection({ type: "wall", id: "front" }); }}>
                    {viable.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                  </AppSelect>
                </label>
                <label className="grid gap-1">{t("navigation.language")}
                  <AppSelect aria-label={t("navigation.language")} value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
                    {languages.map((code) => <option key={code} value={code}>{languageDetails[code].label}</option>)}
                  </AppSelect>
                </label>
              </div>
              <h3 className="text-lg font-bold text-amber-300">
                {t(`preview.${selection.type}`)}
              </h3>
              {opening ? (
                <dl className="mt-4 space-y-3 text-slate-200">
                  <div>
                    <dt className="text-slate-400">{t("preview.widthHeight")}</dt>
                    <dd dir="ltr" className="font-bold">
                      {opening.width.toFixed(2)} × {opening.height.toFixed(2)} m
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">{t("common.area")}</dt>
                    <dd dir="ltr" className="font-bold">
                      {(opening.width * opening.height).toFixed(2)} m²
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">{t("common.wall")}</dt>
                    <dd>{openingWallId ? t(`preview.${openingWallId === "back" ? "backView" : openingWallId}`) : "—"}</dd>
                  </div>
                  {opening.horizontalPosition !== undefined ? (
                    <div>
                      <dt className="text-slate-400">{t("openings.position")}</dt>
                      <dd dir="ltr" className="font-bold">{opening.horizontalPosition.toFixed(2)} m</dd>
                    </div>
                  ) : null}
                  {selection.type === "window" && opening.sillHeight !== undefined ? (
                    <div>
                      <dt className="text-slate-400">{t("openings.sillHeight")}</dt>
                      <dd dir="ltr" className="font-bold">{opening.sillHeight.toFixed(2)} m</dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <dl className="mt-4 space-y-3 text-slate-200">
                  <div>
                    <dt className="text-slate-400">{t("preview.lengthHeight")}</dt>
                    <dd dir="ltr" className="font-bold">
                      {active.length.toFixed(2)} × {active.height.toFixed(2)} m
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">{t("preview.wallThickness")}</dt>
                    <dd>{block.thicknessCm} cm</dd>
                  </div>
                </dl>
              )}
              <hr className="my-5 border-slate-700" />
              <h4 className="font-bold">{t("preview.statistics")}</h4>
              <dl className="mt-3 space-y-2 text-slate-200">
                <div className="flex justify-between">
                  <dt>{t("preview.openings")}</dt>
                  <dd>{openingCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{t("preview.grossArea")}</dt>
                  <dd dir="ltr">{grossArea.toFixed(2)} m²</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{t("preview.openingArea")}</dt>
                  <dd dir="ltr">{openingArea.toFixed(2)} m²</dd>
                </div>
                <div className="flex justify-between font-bold">
                  <dt>{t("preview.netArea")}</dt>
                  <dd dir="ltr">
                    {Math.max(0, grossArea - openingArea).toFixed(2)} m²
                  </dd>
                </div>
              </dl>
              <p className="mt-5 text-xs leading-5 text-slate-400">
                {t("preview.placementNote")}
              </p>
              </div>
            </aside>
          </div>
        </PreviewWorkspace>
      ) : null}
    </>
  );
}
