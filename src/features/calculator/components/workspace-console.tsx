"use client";

import { Bell, Check, Clock3, FolderOpen, History, LoaderCircle, Plus, Save, Search, Star, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CalculatorProjectData, SavedProject, WorkspacePreferences } from "@/features/calculator/types";
import { addRecentSearch, addWorkspaceNotification, getFavorites, getProjectVersions, getRecentSearches, getSavedProjects, getWorkspaceActivity, getWorkspaceNotifications, getWorkspacePreferences, markNotificationsRead, restoreProjectVersion, saveWorkspacePreferences, subscribeToSavedProjects, toggleFavorite } from "@/lib/project-storage";
import { useI18n } from "@/lib/i18n";

type SaveState = "saved" | "saving" | "unsaved" | "failed";
type Props = {
  data: CalculatorProjectData;
  activeProjectId: string | null;
  saveState: SaveState;
  onSave: () => void;
  onNew: () => void;
  onOpen: (data: CalculatorProjectData, projectId: string) => void;
};

type SearchResult = { id: string; project: SavedProject; label: string; kind: "project" | "room" | "wall" };

function versionLabel(saveKind: string, t: (key: string) => string) {
  if (saveKind === "autosave") return t("workspace.autosaveVersion");
  if (saveKind === "restore") return t("workspace.restoreVersion");
  return t("workspace.manualVersion");
}

export function WorkspaceConsole({ data, activeProjectId, saveState, onSave, onNew, onOpen }: Props) {
  const { t, formatDate } = useI18n();
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notices, setNotices] = useState<ReturnType<typeof getWorkspaceNotifications>>([]);
  const [activities, setActivities] = useState<ReturnType<typeof getWorkspaceActivity>>([]);
  const [preferences, setPreferences] = useState<WorkspacePreferences>({ autosave: true, quickActions: ["new", "save", "search", "favorites"] });
  const [searchOpen, setSearchOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const favoritesRef = useRef<HTMLDivElement>(null);

  const refresh = () => {
    setProjects(getSavedProjects()); setFavorites(getFavorites()); setNotices(getWorkspaceNotifications());
    setActivities(getWorkspaceActivity()); setPreferences(getWorkspacePreferences());
  };
  useEffect(() => { const timer = window.setTimeout(refresh, 0); const unsubscribe = subscribeToSavedProjects(refresh); return () => { window.clearTimeout(timer); unsubscribe(); }; }, []);
  useEffect(() => { const timer = window.setTimeout(() => setSearchTerm(query.trim().toLocaleLowerCase()), 180); return () => window.clearTimeout(timer); }, [query]);
  useEffect(() => { if (searchOpen) window.setTimeout(() => searchInput.current?.focus(), 0); }, [searchOpen]);
  useEffect(() => { const openSearch = () => setSearchOpen(true); window.addEventListener("blocksystem:workspace-search", openSearch); return () => window.removeEventListener("blocksystem:workspace-search", openSearch); }, []);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "k") { event.preventDefault(); setNoticeOpen(false); setHistoryOpen(false); setSearchOpen(true); }
      if (event.key.toLowerCase() === "s") { event.preventDefault(); onSave(); }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [onSave]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setSearchOpen(false); setNoticeOpen(false); setHistoryOpen(false); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const activeVersions = activeProjectId ? getProjectVersions(activeProjectId) : [];
  const favoriteProjects = useMemo(() => projects.filter((project) => favorites.includes(project.id)), [favorites, projects]);
  const unreadCount = notices.filter((notice) => !notice.read).length;
  const results = useMemo<SearchResult[]>(() => {
    if (!searchTerm) return [];
    return projects.flatMap((project) => {
      const rows: SearchResult[] = [];
      if (`${project.name} ${project.data.metadata.ownerName} ${project.data.metadata.location}`.toLocaleLowerCase().includes(searchTerm)) rows.push({ id: `project-${project.id}`, project, label: project.name, kind: "project" });
      project.data.rooms.forEach((room, index) => { if (`${room.name} ${room.length} ${room.width}`.toLocaleLowerCase().includes(searchTerm)) rows.push({ id: `room-${project.id}-${room.id}`, project, label: room.name || `${t("rooms.name")} ${index + 1}`, kind: "room" }); });
      project.data.walls.forEach((wall, index) => { if (`${wall.name} ${wall.length} ${wall.height}`.toLocaleLowerCase().includes(searchTerm)) rows.push({ id: `wall-${project.id}-${wall.id}`, project, label: wall.name || `${t("walls.name")} ${index + 1}`, kind: "wall" }); });
      return rows;
    }).slice(0, 30);
  }, [projects, searchTerm, t]);
  const state = saveState === "saving" ? t("workspace.saving") : saveState === "failed" ? t("workspace.failed") : saveState === "unsaved" ? t("workspace.unsaved") : t("workspace.saved");
  const stateClass = saveState === "failed" ? "text-red-700" : saveState === "unsaved" ? "text-amber-800" : "text-emerald-700";

  const openProject = (project: SavedProject) => { onOpen(project.data, project.id); setSearchOpen(false); addRecentSearch(query || project.name); refresh(); };
  const selectQuickAction = (action: WorkspacePreferences["quickActions"][number]) => {
    if (action === "new") onNew();
    if (action === "save") onSave();
    if (action === "search") setSearchOpen(true);
    if (action === "favorites") favoritesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const toggleQuickAction = (action: WorkspacePreferences["quickActions"][number]) => {
    const next = preferences.quickActions.includes(action) ? preferences.quickActions.filter((item) => item !== action) : [...preferences.quickActions, action];
    const value = { ...preferences, quickActions: next };
    if (saveWorkspacePreferences(value)) setPreferences(value);
  };
  const restore = (versionId: string) => {
    if (!activeProjectId || !window.confirm(t("workspace.restoreConfirm"))) return;
    const result = restoreProjectVersion(activeProjectId, versionId);
    if (!result.ok) { addWorkspaceNotification({ title: t("workspace.failed"), detail: t("workspace.saveFailed"), level: "error", persistent: true }); refresh(); return; }
    addWorkspaceNotification({ title: t("workspace.restoreSuccess"), level: "success", persistent: true });
    onOpen(result.project.data, result.project.id); refresh();
  };

  return <section className="print:hidden mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label={t("workspace.heading")}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-bold text-slate-950">{t("workspace.heading")}</h2><p className="text-sm text-slate-600">{t("workspace.description")}</p></div>
      <div className="flex items-center gap-2">
        <span className={`inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-50 px-3 text-sm font-semibold ${stateClass}`} aria-live="polite">{saveState === "saving" ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}{state}</span>
        <button type="button" onClick={() => { setNoticeOpen((open) => !open); setHistoryOpen(false); }} className="relative grid size-10 place-items-center rounded-lg border border-slate-300" aria-label={t("workspace.notifications")} aria-expanded={noticeOpen}><Bell size={18} />{unreadCount ? <span className="absolute -end-1 -top-1 grid min-w-5 place-items-center rounded-full bg-red-600 px-1 text-xs text-white">{unreadCount}</span> : null}</button>
      </div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      {preferences.quickActions.map((action) => <button key={action} type="button" onClick={() => selectQuickAction(action)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-bold hover:bg-slate-50">{action === "new" ? <Plus size={17} /> : action === "save" ? <Save size={17} /> : action === "search" ? <Search size={17} /> : <Star size={17} />}{t(action === "new" ? "workspace.newProject" : action === "save" ? "workspace.manualSave" : action === "search" ? "workspace.search" : "workspace.favorites")}{action === "search" ? <kbd className="rounded border border-slate-300 px-1 text-[10px] font-medium">{t("workspace.keyboardHint")}</kbd> : null}</button>)}
      <button type="button" onClick={() => setHistoryOpen((open) => !open)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-bold hover:bg-slate-50" aria-expanded={historyOpen}><History size={17} />{t("workspace.history")}</button>
    </div>
    {noticeOpen ? <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3" role="region" aria-label={t("workspace.notifications")}><div className="mb-2 flex items-center justify-between gap-2"><strong>{t("workspace.notifications")}</strong>{unreadCount ? <button type="button" onClick={() => { markNotificationsRead(); refresh(); }} className="text-sm font-bold text-amber-800">{t("workspace.markAllRead")}</button> : null}</div>{notices.length ? <div className="space-y-2">{notices.slice(0, 8).map((notice) => <button key={notice.id} type="button" onClick={() => { markNotificationsRead([notice.id]); refresh(); }} className={`block w-full rounded-lg p-3 text-start text-sm ${notice.read ? "bg-white text-slate-600" : "bg-amber-50 text-slate-900"}`}><strong>{notice.title}</strong>{notice.detail ? <span className="mt-1 block">{notice.detail}</span> : null}</button>)}</div> : <p className="text-sm text-slate-600">{t("workspace.noNotifications")}</p>}</div> : null}
    {historyOpen ? <div className="mt-4 rounded-xl border border-slate-200 p-3" role="region" aria-label={t("workspace.history")}>{activeVersions.length ? <div className="space-y-2">{activeVersions.map((version) => <div key={version.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3"><div><strong className="text-sm">{t("workspace.revision", { value: version.revision })}</strong><p className="text-xs text-slate-600">{versionLabel(version.saveKind, t)} · {formatDate(version.savedAt, { dateStyle: "medium", timeStyle: "short" })}</p></div><button type="button" onClick={() => restore(version.id)} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-bold">{t("workspace.restore")}</button></div>)}</div> : <p className="text-sm text-slate-600">{t("workspace.historyEmpty")}</p>}</div> : null}
    <div className="mt-5 grid gap-4 lg:grid-cols-3">
      <div className="rounded-xl bg-slate-950 p-4 text-white"><p className="text-sm text-slate-300">{t("workspace.statistics")}</p><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div><strong className="block text-xl">{projects.length}</strong><span className="text-xs text-slate-300">{t("workspace.projectsCount")}</span></div><div><strong className="block text-xl">{data.rooms.length}</strong><span className="text-xs text-slate-300">{t("workspace.roomsCount")}</span></div><div><strong className="block text-xl">{data.walls.length}</strong><span className="text-xs text-slate-300">{t("workspace.wallsCount")}</span></div></div></div>
      <div ref={favoritesRef} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-2"><strong>{t("workspace.favorites")}</strong><button type="button" onClick={() => setHistoryOpen(false)} className="text-sm font-bold text-amber-800">{t("workspace.openFavorites")}</button></div>{favoriteProjects.length ? <div className="mt-2 space-y-1">{favoriteProjects.slice(0, 3).map((project) => <div key={project.id} className="flex items-center justify-between gap-2"><button type="button" onClick={() => openProject(project)} className="min-h-9 truncate text-start text-sm font-semibold">{project.name}</button><button type="button" onClick={() => { toggleFavorite(project.id); refresh(); }} aria-label={t("workspace.removeFavorite")} className="grid size-9 place-items-center text-amber-600"><Star size={17} fill="currentColor" /></button></div>)}</div> : <p className="mt-2 text-sm text-slate-600">{t("workspace.noFavorites")}</p>}</div>
      <div className="rounded-xl border border-slate-200 p-4"><strong>{t("workspace.recentActivity")}</strong>{activities.length ? <div className="mt-2 space-y-2">{activities.slice(0, 3).map((activity) => <p key={activity.id} className="flex gap-2 text-sm text-slate-600"><Clock3 size={15} className="mt-0.5 shrink-0" /><span><strong className="text-slate-900">{activity.projectName}</strong><span className="block text-xs">{formatDate(activity.createdAt, { dateStyle: "short", timeStyle: "short" })}</span></span></p>)}</div> : <p className="mt-2 text-sm text-slate-600">{t("workspace.loading")}</p>}</div>
    </div>
    <div className="mt-4 border-t border-slate-200 pt-3"><details><summary className="cursor-pointer text-sm font-bold text-slate-700">{t("workspace.preferences")}</summary><label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={preferences.autosave} onChange={(event) => { const next = { ...preferences, autosave: event.target.checked }; if (saveWorkspacePreferences(next)) setPreferences(next); }} />{t("workspace.autosave")}</label><fieldset className="mt-3"><legend className="text-sm font-semibold">{t("workspace.customiseActions")}</legend><div className="mt-2 flex flex-wrap gap-3">{(["new", "save", "search", "favorites"] as const).map((action) => <label key={action} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={preferences.quickActions.includes(action)} onChange={() => toggleQuickAction(action)} />{t(action === "new" ? "workspace.newProject" : action === "save" ? "workspace.manualSave" : action === "search" ? "workspace.search" : "workspace.favorites")}</label>)}</div></fieldset></details></div>
    {searchOpen ? <div className="fixed inset-0 z-[110] grid place-items-start overflow-y-auto bg-slate-950/35 p-4 pt-[max(1rem,10vh)]" role="dialog" aria-modal="true" aria-label={t("workspace.search")}><div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-2xl"><div className="flex items-center gap-2"><Search size={20} /><input ref={searchInput} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("workspace.searchPlaceholder")} className="h-12 min-w-0 flex-1 rounded-lg border border-slate-300 px-3" /><button type="button" onClick={() => setSearchOpen(false)} className="grid size-11 place-items-center rounded-lg hover:bg-slate-100" aria-label={t("workspace.close")}><X size={20} /></button></div><div className="mt-4 max-h-[60dvh] overflow-y-auto">{!searchTerm ? <><p className="text-sm text-slate-600">{t("workspace.searchEmpty")}</p>{getRecentSearches().length ? <div className="mt-4"><strong className="text-sm">{t("workspace.recentSearches")}</strong><div className="mt-2 flex flex-wrap gap-2">{getRecentSearches().map((item) => <button key={item} type="button" onClick={() => setQuery(item)} className="rounded-full bg-slate-100 px-3 py-2 text-sm">{item}</button>)}</div></div> : null}</> : results.length ? <div className="space-y-1">{results.map((result) => <button key={result.id} type="button" onClick={() => openProject(result.project)} className="flex w-full items-center gap-3 rounded-lg p-3 text-start hover:bg-slate-100"><FolderOpen size={18} className="shrink-0 text-amber-700" /><span><strong className="block">{result.label}</strong><span className="text-xs text-slate-600">{result.project.name} · {result.kind}</span></span></button>)}</div> : <p className="text-sm text-slate-600">{t("workspace.searchNoResults")}</p>}</div></div></div> : null}
  </section>;
}
