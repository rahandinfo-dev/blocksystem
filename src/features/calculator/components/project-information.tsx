import type { ProjectMetadata } from "@/features/calculator/types";
import { useI18n } from "@/lib/i18n";

interface ProjectInformationProps { metadata: ProjectMetadata; onChange: (next: ProjectMetadata) => void; }

export function ProjectInformation({ metadata, onChange }: ProjectInformationProps) {
  const { t } = useI18n();
  const field = (key: keyof ProjectMetadata, label: string, multiline = false) => <div className="form-field"><label htmlFor={`project-${key}`} className="form-label">{label} <span className="font-normal text-slate-500">({t("common.optional")})</span></label>{multiline ? <textarea id={`project-${key}`} value={metadata[key]} onChange={(event) => onChange({ ...metadata, [key]: event.target.value })} rows={3} className="form-control min-h-24 px-3 py-2" /> : <input id={`project-${key}`} value={metadata[key]} onChange={(event) => onChange({ ...metadata, [key]: event.target.value })} className="form-control px-3" />}</div>;
  return <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><summary className="cursor-pointer text-lg font-bold text-slate-950">{t("projectInfo.heading")} <span className="ms-2 text-sm font-normal text-slate-500">({t("common.optional")})</span></summary><div className="mt-5 grid gap-4 sm:grid-cols-2">{field("projectName", t("projectInfo.projectName"))}{field("ownerName", t("projectInfo.owner"))}{field("location", t("projectInfo.location"))}{field("notes", t("projectInfo.notes"), true)}</div></details>;
}
