"use client";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { AuditEvent } from "@/lib/audit";
import { fetchWithSafeRetry } from "@/lib/client-network";

export function AuditHistory() {
  const { t, direction, formatDate } = useI18n();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [query, setQuery] = useState("");
  const load = async () => {
    setState("loading");
    try {
      const response = await fetchWithSafeRetry("/api/verification/audit?limit=100", {
        cache: "no-store",
        retries: 1,
      });
      if (!response.ok) throw new Error();
      const value = (await response.json()) as { events?: AuditEvent[] };
      setEvents(Array.isArray(value.events) ? value.events : []);
      setState("idle");
    } catch {
      setState("error");
    }
  };
  const visible = useMemo(
    () =>
      events.filter((event) =>
        `${event.action} ${event.entityReference ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [events, query],
  );
  return (
    <section
      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      dir={direction}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-[#0F2053]">
          {t("security.audit")}
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          disabled={state === "loading"}
          className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
        >
          {t("security.refresh")}
        </button>
      </div>
      <label className="mt-4 block text-sm">
        {t("security.filter")}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
        />
      </label>
      {state === "loading" ? (
        <p role="status" className="mt-3 text-sm">
          {t("security.auditLoading")}
        </p>
      ) : null}
      {state === "error" ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {t("security.auditError")}
        </p>
      ) : null}
      <div className="mt-4 space-y-2">
        {visible.map((event) => (
          <article
            key={event.id}
            className="min-w-0 rounded-lg border border-slate-200 p-3"
          >
            <p className="font-semibold">
              {t(`security.auditAction.${event.action}`)}
            </p>
            <p className="text-xs text-slate-600">
              {formatDate(event.timestamp, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
            {event.entityReference ? (
              <p className="mt-1 break-all text-sm">
                <bdi dir="ltr">{event.entityReference}</bdi>
              </p>
            ) : null}
          </article>
        ))}
        {state === "idle" && !visible.length ? (
          <p className="text-sm text-slate-600">{t("security.auditEmpty")}</p>
        ) : null}
      </div>
    </section>
  );
}
