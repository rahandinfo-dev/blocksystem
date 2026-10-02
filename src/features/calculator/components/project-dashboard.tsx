"use client";

import { Copy, FolderOpen, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SavedProject } from "@/features/calculator/types";
import { useI18n } from "@/lib/i18n";
import { matchesProjectSearch } from "@/lib/project-search";
import { deleteSavedProject, duplicateProject, getSavedProjects, renameSavedProject, subscribeToSavedProjects } from "@/lib/project-storage";

function roomCount(project: SavedProject) {
  return project.data.mode === "rooms" ? project.data.rooms.length : 0;
}

export function ProjectDashboard() {
  const { t, formatDate } = useI18n();
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [query, setQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const refresh = () => setProjects(getSavedProjects());

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    const unsubscribe = subscribeToSavedProjects(refresh);
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const visibleProjects = useMemo(() => {
    return projects
      .filter((project) => matchesProjectSearch(project, query))
      .sort((left, right) => new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime());
  }, [projects, query]);

  const openProject = (project: SavedProject) => {
    window.dispatchEvent(new CustomEvent("blocksystem:open-project", { detail: { project } }));
  };

  const renameProject = (project: SavedProject) => {
    const name = window.prompt(t("projects.renamePrompt"), project.name)?.trim();
    if (!name) return;
    if (!renameSavedProject(project.id, name)) setMessage(t("projects.saveFailed"));
    setOpenMenuId(null);
    refresh();
  };

  const duplicateSavedProject = (project: SavedProject) => {
    if (!duplicateProject(project, t("projects.copySuffix"))) setMessage(t("projects.saveFailed"));
    setOpenMenuId(null);
    refresh();
  };

  const removeProject = (project: SavedProject) => {
    if (!window.confirm(t("projects.confirmDelete"))) return;
    if (!deleteSavedProject(project.id)) setMessage(t("projects.saveFailed"));
    setOpenMenuId(null);
    refresh();
  };

  const createProject = () => window.dispatchEvent(new CustomEvent("blocksystem:new-project"));

  return (
    <section className="project-dashboard print:hidden" aria-labelledby="project-dashboard-title">
      <div className="project-dashboard__header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="project-dashboard-title" className="text-2xl font-bold text-[#0F2053] sm:text-3xl">{t("projects.heading")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t("projects.dashboardDescription")}</p>
        </div>
        <button type="button" onClick={createProject} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0F2053] px-4 text-sm font-bold text-[#EDE6CC] sm:w-auto">
          <Plus size={18} aria-hidden="true" />
          {t("projects.new")}
        </button>
      </div>

      <div className="relative mt-6">
        <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-5 text-slate-500" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("projects.searchPlaceholder")}
          aria-label={t("projects.search")}
          className="project-dashboard__search min-h-11 w-full border py-2 pe-3 ps-10 text-sm text-slate-900 outline-none transition focus:border-[#0F2053] focus:ring-2 focus:ring-[#0F2053]/15"
        />
      </div>

      {message ? <p className="mt-3 text-sm font-semibold text-red-700" role="status">{message}</p> : null}

      {projects.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[#0F2053]/25 bg-white px-5 py-12 text-center">
          <FolderOpen className="mx-auto size-8 text-[#0F2053]" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-bold text-[#0F2053]">{t("projects.emptyDashboardTitle")}</h3>
          <p className="mt-2 text-sm text-slate-600">{t("projects.emptyDashboardDescription")}</p>
          <button type="button" onClick={createProject} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0F2053] px-4 text-sm font-bold text-[#EDE6CC]">
            <Plus size={18} aria-hidden="true" />
            {t("projects.new")}
          </button>
        </div>
      ) : visibleProjects.length === 0 ? (
        <p className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">{t("projects.noResults")}</p>
      ) : (
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleProjects.map((project) => {
            const rooms = roomCount(project);
            const menuIsOpen = openMenuId === project.id;
            return (
              <article key={project.id} className="project-dashboard__card relative flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-[#0F2053]" title={project.name}>{project.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">{t("projects.updated")} {formatDate(project.savedAt, { dateStyle: "medium" })}</p>
                  </div>
                  <div className="relative shrink-0">
                    <button type="button" onClick={() => setOpenMenuId(menuIsOpen ? null : project.id)} className="grid size-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F2053]/20" aria-label={t("projects.actions")} aria-expanded={menuIsOpen}>
                      <MoreHorizontal size={20} aria-hidden="true" />
                    </button>
                    {menuIsOpen ? (
                      <div className="absolute end-0 z-10 mt-1 min-w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                        <button type="button" onClick={() => renameProject(project)} className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-start text-sm hover:bg-slate-50"><Pencil size={16} aria-hidden="true" />{t("projects.rename")}</button>
                        <button type="button" onClick={() => duplicateSavedProject(project)} className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-start text-sm hover:bg-slate-50"><Copy size={16} aria-hidden="true" />{t("projects.duplicate")}</button>
                        <button type="button" onClick={() => removeProject(project)} className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-start text-sm text-red-700 hover:bg-red-50"><Trash2 size={16} aria-hidden="true" />{t("common.delete")}</button>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                  {rooms > 0 ? <span>{t("projects.rooms", { count: rooms })}</span> : null}
                  <span>{t(`project.${project.data.metadata.status}`)}</span>
                </div>
                <button type="button" onClick={() => openProject(project)} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#0F2053]/25 px-3 text-sm font-bold text-[#0F2053] hover:bg-[#EDE6CC]/45 focus:outline-none focus:ring-2 focus:ring-[#0F2053]/20">
                  <FolderOpen size={17} aria-hidden="true" />
                  {t("projects.open")}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
