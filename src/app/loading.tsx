"use client";

import { useI18n } from "@/lib/i18n";

export default function Loading() {
  const { t, direction } = useI18n();
  return <main className="pwa-loading" dir={direction} role="status">{t("pwa.loading")}</main>;
}
