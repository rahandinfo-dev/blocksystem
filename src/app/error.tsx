"use client";

import { useI18n } from "@/lib/i18n";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  void error; // Deliberately do not expose implementation details in the recovery UI.
  const { t, direction } = useI18n();
  return <main className="pwa-offline-page" dir={direction}><section><h1>{t("pwa.errorTitle")}</h1><p>{t("pwa.errorDescription")}</p><button type="button" onClick={reset}>{t("pwa.retry")}</button></section></main>;
}
