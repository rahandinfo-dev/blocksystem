"use client";
import { useI18n, languages, languageDetails } from "@/lib/i18n";
import type { PublicVerification } from "@/lib/verification";
export function VerificationView({
  record,
  unavailable,
}: {
  record: PublicVerification | null;
  unavailable: boolean;
}) {
  const { t, language, direction, setLanguage, formatDate } = useI18n();
  const state = unavailable ? "unavailable" : (record?.status ?? "invalid");
  return (
    <main
      dir={direction}
      lang={language}
      className="mx-auto min-h-dvh w-full max-w-xl p-4 sm:p-8"
    >
      <nav className="mb-5 flex flex-wrap gap-2">
        {languages.map((lang) => (
          <button
            key={lang}
            type="button"
            lang={lang}
            onClick={() => setLanguage(lang)}
            aria-pressed={language === lang}
            className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
          >
            {languageDetails[lang].label}
          </button>
        ))}
      </nav>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="font-bold text-[#0F2053]">BlockSystem</p>
        <h1 className="mt-4 text-2xl font-bold" data-verification-state={state}>
          {t(`documents.${state}`)}
        </h1>
        {record ? (
          <dl className="mt-5 space-y-4 text-sm">
            {[
              ["reference", record.documentReference],
              ["projectReference", record.projectReference],
              ["issued", formatDate(record.createdAt, { dateStyle: "medium" })],
              ["fingerprint", `${record.fingerprint.slice(0, 24)}…`],
              ...(record.revokedAt
                ? [
                    [
                      "revokedAt",
                      formatDate(record.revokedAt, { dateStyle: "medium" }),
                    ],
                  ]
                : []),
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-slate-600">{t(`documents.${label}`)}</dt>
                <dd className="break-all font-semibold">
                  <bdi dir="ltr">{value}</bdi>
                </dd>
              </div>
            ))}
            <div>
              <dt>{t("documents.title")}</dt>
              <dd>{t(`documents.${record.kind}`)}</dd>
            </div>
          </dl>
        ) : null}
        <p className="mt-6 text-sm leading-6 text-slate-600">
          {t("documents.context")}
        </p>
        {unavailable ? (
          <button
            className="mt-4 min-h-11 rounded-lg border px-4"
            onClick={() => location.reload()}
          >
            {t("documents.refresh")}
          </button>
        ) : null}
      </section>
    </main>
  );
}
