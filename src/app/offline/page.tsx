"use client";

import Link from "next/link";
import { WifiOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function OfflinePage() {
  const { t, direction } = useI18n();
  return <main className="pwa-offline-page" dir={direction}><section><WifiOff size={34} aria-hidden="true" /><h1>{t("pwa.offlineTitle")}</h1><p>{t("pwa.offlineDescription")}</p><Link href="/">{t("pwa.goHome")}</Link></section></main>;
}
