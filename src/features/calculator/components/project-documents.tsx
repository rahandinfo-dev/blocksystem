"use client";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AppSelect } from "@/components/ui/app-select";
import {
  buildProjectDocument,
  type DocumentKind,
  type ProjectDocumentData,
} from "@/features/calculator/lib/project-document";
import { documentSections } from "@/features/calculator/lib/document-presentation";
import type { CalculatorProjectData } from "@/features/calculator/types";
import type { VerificationRecord } from "@/lib/verification";
import { useI18n } from "@/lib/i18n";
import { ProjectQr } from "./project-qr";
import { fetchWithSafeRetry } from "@/lib/client-network";

type RecordView = VerificationRecord & { url: string };
const button =
  "min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50";
const control =
  "mt-1 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white p-2";
const defaultOptions: NonNullable<CalculatorProjectData["documentSettings"]> = {
  kind: "estimate",
  issuer: "BlockSystem / RekApps",
};
export function ProjectDocuments({
  data,
  projectId,
  onSettings,
}: {
  data: CalculatorProjectData;
  projectId: string | null;
  onSettings: (options: CalculatorProjectData["documentSettings"]) => void;
}) {
  const { t, language, direction } = useI18n();
  const [password, setPassword] = useState("");
  const [records, setRecords] = useState<RecordView[]>([]);
  const [selected, setSelected] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [diagnostics, setDiagnostics] = useState<{ status: string; version: string; services: { verification: string } }>();
  const options = data.documentSettings ?? defaultOptions;
  const update = (patch: Partial<typeof options>) =>
    onSettings({ ...options, ...patch });
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      setRecords([]);
      setSelected(undefined);
      if (projectId)
        void fetchWithSafeRetry("/api/verification/session")
          .then((r) => r.json())
          .then(async (session) => {
            if (live) setAdminAuthenticated(Boolean(session.authenticated));
            if (!session.authenticated || !live) return;
            const response = await fetchWithSafeRetry(
              `/api/verification/records?projectId=${encodeURIComponent(projectId)}`,
            );
            if (!response.ok) throw new Error();
            const next = (await response.json()) as RecordView[];
            if (live) setRecords(next);
          })
          .catch(() => {
            if (live) setMessage(t("documents.unavailable"));
          });
    }, 0);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [projectId, t]);
  const draft = useMemo(() => {
    try {
      if (!data.metadata.projectName.trim()) return undefined;
      return buildProjectDocument(data, {
        ...options,
        reference: "",
        issuedAt: new Date().toISOString(),
      });
    } catch {
      return undefined;
    }
  }, [data, options]);
  const chosen = records.find((r) => r.verificationToken === selected);
  const snapshot = chosen?.snapshot ?? draft;
  const refresh = async () => {
    if (!projectId) return;
    const response = await fetchWithSafeRetry(
      `/api/verification/records?projectId=${encodeURIComponent(projectId)}`,
    );
    if (!response.ok) throw new Error();
    setRecords((await response.json()) as RecordView[]);
  };
  const action = async (work: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await work();
    } catch (error) {
      setMessage(
        !navigator.onLine
          ? t("security.offline")
          : error instanceof Error && error.message === "429"
            ? t("security.rateLimited")
            : t("documents.error"),
      );
    } finally {
      setBusy(false);
    }
  };
  const login = () =>
    action(async () => {
      const response = await fetch("/api/verification/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      setPassword("");
      if (!response.ok) throw new Error(String(response.status));
      setAdminAuthenticated(true);
      await refresh();
    });
  const refreshDiagnostics = () => action(async () => {
    const response = await fetchWithSafeRetry("/api/verification/diagnostics", { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    setDiagnostics((await response.json()) as { status: string; version: string; services: { verification: string } });
  });
  const issue = (projectOnly = false) =>
    action(async () => {
      const response = await fetch("/api/verification/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, data, options, projectOnly }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const record = (await response.json()) as RecordView;
      setSelected(record.verificationToken);
      await refresh();
    });
  const revoke = (record: RecordView) => {
    if (!window.confirm(t("documents.confirm"))) return;
    void action(async () => {
      const response = await fetch("/api/verification/records", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: record.verificationToken }),
      });
      if (!response.ok) throw new Error(String(response.status));
      await refresh();
    });
  };
  const download = (record: RecordView) =>
    action(async () => {
      const response = await fetch("/api/project-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: record.verificationToken, language }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      if ((await blob.slice(0, 5).text()) !== "%PDF-") throw new Error();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        record.snapshot?.fileName ?? `${record.documentReference}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    });
  const preview = (doc: ProjectDocumentData) => (
    <article
      dir={direction}
      lang={language}
      className="document-preview"
      aria-label={t("documents.preview")}
    >
      <header>
        <strong>{doc.issuer || "BlockSystem"}</strong>
        {doc.contact ? <p>{doc.contact}</p> : null}
        <h3>{t(`documents.${doc.kind}`)}</h3>
        <bdi>{doc.reference}</bdi>
      </header>
      {documentSections(doc, language).map((section, i) => (
        <section key={i}>
          <h4>{section.title}</h4>
          <dl>
            {section.rows.map(([label, value], j) => (
              <div key={j}>
                {label ? <dt>{label}</dt> : null}
                <dd dir="auto">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      {chosen?.snapshot ? (
        <div>
          <p>{t("documents.scan")}</p>
          <p>
            {t(`documents.${chosen.status}`)} ·{" "}
            <bdi>{chosen.fingerprint.slice(0, 24)}</bdi>
          </p>
          <ProjectQr url={chosen.url} reference={chosen.documentReference} />
        </div>
      ) : null}
    </article>
  );
  return (
    <section
      id="project-documents"
      className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-6"
      dir={direction}
    >
      <h2 className="text-xl font-bold text-[#0F2053]">
        {t("documents.title")}
      </h2>
      <details className="mt-4">
        <summary className="min-h-11 cursor-pointer font-semibold">
          {t("documents.login")}
        </summary>
        <form
          className="mt-2 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void login();
          }}
        >
          <label className="min-w-0 flex-1 text-sm">
            {t("documents.password")}
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={control}
            />
          </label>
          <button disabled={busy} className={button}>
            {t("documents.login")}
          </button>
          <button
            type="button"
            className={button}
            onClick={() =>
              void action(async () => {
                await fetch("/api/verification/session", { method: "DELETE" });
                setAdminAuthenticated(false);
                setDiagnostics(undefined);
                setRecords([]);
                setSelected(undefined);
              })
            }
          >
            {t("documents.logout")}
          </button>
        </form>
      </details>
      <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
        <label className="text-sm">
          {t("documents.title")}
          <AppSelect
            className={control}
            value={options.kind}
            onChange={(e) => update({ kind: e.target.value as DocumentKind })}
          >
            {(["estimate", "quotation", "detailed", "scenarios"] as const).map(
              (kind) => (
                <option key={kind} value={kind}>
                  {t(`documents.${kind}`)}
                </option>
              ),
            )}
          </AppSelect>
        </label>
        {(["issuer", "contact", "validUntil", "preparedBy"] as const).map(
          (field) => (
            <label key={field} className="min-w-0 text-sm">
              {t(`documents.${field === "preparedBy" ? "signature" : field}`)}
              <input
                type={field === "validUntil" ? "date" : "text"}
                value={options[field] ?? ""}
                onChange={(e) => update({ [field]: e.target.value })}
                className={control}
                maxLength={field === "issuer" ? 200 : 1000}
              />
            </label>
          ),
        )}
        {(["notes", "terms"] as const).map((field) => (
          <label key={field} className="min-w-0 text-sm">
            {t(`documents.${field}`)}
            <textarea
              className={control}
              value={options[field] ?? ""}
              onChange={(e) => update({ [field]: e.target.value })}
              maxLength={8000}
            />
          </label>
        ))}
      </div>
      <p className="mt-4 text-sm" role="status">
        {!projectId
          ? t("documents.saveFirst")
          : !draft
            ? t("documents.missing")
            : message}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={button}
          disabled={!projectId || !draft || busy}
          onClick={() => void issue()}
        >
          {t("documents.issue")}
        </button>
        <button
          type="button"
          className={button}
          disabled={!projectId || !draft || busy}
          onClick={() => void issue(true)}
        >
          {t("documents.register")}
        </button>
        <button
          type="button"
          className={button}
          disabled={busy || !projectId}
          onClick={() => void action(refresh)}
        >
          {t("documents.refresh")}
        </button>
      </div>
      {adminAuthenticated ? <details className="mt-4 rounded-lg border border-slate-200 p-3"><summary className="min-h-11 cursor-pointer font-semibold">{t("reliability.diagnostics")}</summary><button type="button" className={`${button} mt-2`} disabled={busy} onClick={() => void refreshDiagnostics()}>{t("security.refresh")}</button>{diagnostics ? <dl className="mt-3 space-y-1 text-sm"><div><dt className="inline font-semibold">{t("reliability.health")}: </dt><dd className="inline"><bdi dir="ltr">{diagnostics.status}</bdi></dd></div><div><dt className="inline font-semibold">{t("reliability.version")}: </dt><dd className="inline"><bdi dir="ltr">{diagnostics.version}</bdi></dd></div><div><dt className="inline font-semibold">{t("reliability.verification")}: </dt><dd className="inline"><bdi dir="ltr">{diagnostics.services.verification}</bdi></dd></div></dl> : null}</details> : null}
      <div className="mt-4 space-y-3">
        {records.length ? (
          records.map((record) => (
            <div
              key={record.documentId}
              className="min-w-0 rounded-lg border p-3"
            >
              <p className="break-all">
                <bdi>{record.documentReference}</bdi> ·{" "}
                {t(`documents.${record.kind}`)} ·{" "}
                {t(`documents.${record.status}`)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  className={button}
                  onClick={() => setSelected(record.verificationToken)}
                >
                  {t("documents.preview")}
                </button>
                {record.snapshot ? (
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() => void download(record)}
                  >
                    {t("documents.pdf")}
                  </button>
                ) : null}
                <button
                  className={button}
                  disabled={busy || record.status === "revoked"}
                  onClick={() => revoke(record)}
                >
                  {t("documents.revoke")}
                </button>
              </div>
              {selected === record.verificationToken ? (
                <ProjectQr
                  url={record.url}
                  reference={record.documentReference}
                />
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-600">{t("documents.empty")}</p>
        )}
      </div>
      {snapshot ? (
        <>
          <p className="mt-4 text-sm">
            {chosen?.snapshot ? t("documents.preview") : t("documents.draft")}
          </p>
          <div className="document-preview-container">{preview(snapshot)}</div>
          <button
            className={`${button} mt-3`}
            disabled={!chosen?.snapshot}
            onClick={() => window.print()}
          >
            {t("documents.print")}
          </button>
          {mounted
            ? createPortal(
                <div id="document-print-root">{preview(snapshot)}</div>,
                document.body,
              )
            : null}
        </>
      ) : null}
    </section>
  );
}
