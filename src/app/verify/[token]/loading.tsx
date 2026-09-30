"use client";
import { useI18n } from "@/lib/i18n";
export default function Loading() {
  const { t } = useI18n();
  return (
    <main className="p-8" role="status">
      {t("documents.loading")}
    </main>
  );
}
