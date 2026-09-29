"use client";

import { useI18n } from "@/lib/i18n";
import { Calculator } from "@/features/calculator/components/calculator";
import { AppHeader } from "./app-header";

export function HomeContent() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <AppHeader />
      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-8 max-w-3xl sm:mb-10">
          <p className="mb-3 text-sm font-semibold text-amber-700">{t("home.eyebrow")}</p>
          <h1 className="text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">{t("home.title")}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">{t("home.description")}</p>
        </div>
        <Calculator />
      </main>
      <footer className="border-t border-[var(--brand-border)] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <p className="mx-auto max-w-3xl text-center text-sm leading-7 text-[var(--brand-navy)] sm:text-base">{t("home.footer")}</p>
      </footer>
    </div>
  );
}
