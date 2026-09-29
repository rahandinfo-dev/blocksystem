"use client";

import { Copy, Download, FolderOpen, Pencil, Save, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CalculatorProjectData, SavedProject } from "@/features/calculator/types";
import { createDefaultProject } from "@/features/calculator/lib/project-state";
import { migrateSavedProject } from "@/lib/project-schema";
import { deleteSavedProject, duplicateProject, getRecovery, getSavedProjects, renameSavedProject, saveProject, saveRecovery, subscribeToSavedProjects } from "@/lib/project-storage";

interface Props { data: CalculatorProjectData; onLoad: (data: CalculatorProjectData) => void; }
type SortOrder = "updated" | "created" | "name";

export function SavedProjects({ data, onLoad }: Props) {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("updated");
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const initialData = useRef(data);
  const initialOnLoad = useRef(onLoad);

  useEffect(() => {
    const refresh = () => setProjects(getSavedProjects());
    refresh();
    const recovery = getRecovery();
    const initial = initialData.current;
    if (recovery && !initial.metadata.projectName && !initial.rooms.some((room) => room.length || room.width || room.height)) initialOnLoad.current(recovery);
    return subscribeToSavedProjects(refresh);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMessage(saveRecovery(data) ? "پاشەکەوت کرا" : "پاشەکەوتکردن سەرکەوتوو نەبوو.");
    }, 900);
    return () => window.clearTimeout(timer);
  }, [data]);

  const manual = () => {
    const project = saveProject(data);
    if (!project) { setMessage("پاشەکەوتکردن سەرکەوتوو نەبوو."); return; }
    setProjects((current) => [project, ...current]);
    setMessage("پاشەکەوت کرا");
  };
  const exportProject = () => {
    const blob = new Blob([JSON.stringify({ schemaVersion: 4, data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `${data.metadata.projectName || "project"}.json`; link.click(); URL.revokeObjectURL(url);
  };
  const importProject = async (file: File) => {
    try {
      const raw: unknown = JSON.parse(await file.text());
      const imported = migrateSavedProject({ version: 4, id: "import", data: (raw as { data?: unknown }).data ?? raw });
      if (!imported) throw new Error("invalid project");
      onLoad(imported.data); setMessage("پڕۆژەکە هاوردە کرا");
    } catch { setMessage("فایلی پڕۆژە دروست نییە."); }
  };
  const visible = projects.filter((project) => project.name.toLowerCase().includes(query.toLowerCase())).sort((left, right) => {
    if (sort === "name") return left.name.localeCompare(right.name);
    const leftDate = new Date(sort === "created" ? left.createdAt ?? left.savedAt : left.savedAt).getTime();
    const rightDate = new Date(sort === "created" ? right.createdAt ?? right.savedAt : right.savedAt).getTime();
    return rightDate - leftDate;
  });

  return <section id="projects" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="flex items-center gap-2"><FolderOpen size={20} className="text-amber-700" /><h2 className="text-xl font-bold">پڕۆژەکان</h2></div><p className="mt-1 text-sm text-slate-600">پاشەکەوتی خۆکار لەسەر ئەم ئامێرە کار دەکات.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { if (window.confirm("پڕۆژەی نوێ دروست بکرێت؟")) onLoad(createDefaultProject()); }} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold">پڕۆژەی نوێ</button><button type="button" onClick={manual} className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white"><Save size={17} /> پاشەکەوتکردن</button><button type="button" onClick={exportProject} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold"><Download size={17} /> هەناردەکردن</button><button type="button" onClick={() => input.current?.click()} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold"><Upload size={17} /> هاوردەکردن</button><input ref={input} className="hidden" type="file" accept="application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importProject(file); event.currentTarget.value = ""; }} /></div>
    </div>
    {message ? <p className={`mt-3 text-sm font-semibold ${message.includes("نەبوو") || message.includes("نییە") ? "text-red-700" : "text-emerald-700"}`} role="status">{message}</p> : null}
    <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_11rem]"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="گەڕان بە ناوی پڕۆژە" className="h-11 rounded-lg border border-slate-300 px-3" /><select value={sort} onChange={(event) => setSort(event.target.value as SortOrder)} className="h-11 rounded-lg border border-slate-300 px-3"><option value="updated">نوێترین نوێکردنەوە</option><option value="created">بەرواری دروستکردن</option><option value="name">ناو</option></select></div>
    <div className="mt-4 space-y-2">{visible.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">هیچ پڕۆژەیەک نییە.</p> : visible.map((project) => <div key={project.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><p className="font-bold">{project.name}</p><p className="text-xs text-slate-500">{new Date(project.savedAt).toLocaleString("ckb")}</p></div><div className="flex gap-1"><button type="button" onClick={() => onLoad(project.data)} className="min-h-10 rounded-lg px-3 text-sm font-bold text-amber-800">کردنەوە</button><button type="button" onClick={() => { const name = window.prompt("ناوی نوێی پڕۆژە", project.name)?.trim(); if (!name) return; const renamed = renameSavedProject(project.id, name); if (!renamed) { setMessage("پاشەکەوتکردن سەرکەوتوو نەبوو."); return; } setProjects(renamed); }} className="grid size-10 place-items-center rounded-lg hover:bg-slate-100" aria-label="ناوگۆڕین"><Pencil size={17} /></button><button type="button" onClick={() => { const copy = duplicateProject(project); if (!copy) { setMessage("پاشەکەوتکردن سەرکەوتوو نەبوو."); return; } setProjects((current) => [copy, ...current]); }} className="grid size-10 place-items-center rounded-lg hover:bg-slate-100" aria-label="کۆپیکردن"><Copy size={17} /></button><button type="button" onClick={() => { if (!window.confirm("پڕۆژەکە بسڕدرێتەوە؟")) return; const remaining = deleteSavedProject(project.id); if (!remaining) { setMessage("سڕینەوە سەرکەوتوو نەبوو."); return; } setProjects(remaining); }} className="grid size-10 place-items-center rounded-lg text-red-700 hover:bg-red-50" aria-label="سڕینەوە"><Trash2 size={17} /></button></div></div>)}</div>
  </section>;
}
