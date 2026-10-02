"use client";

import { useI18n } from "@/lib/i18n";
import { Calculator } from "@/features/calculator/components/calculator";
import { ProjectDashboard } from "@/features/calculator/components/project-dashboard";
import { AppHeader } from "./app-header";

export function HomeContent() {
  const { t } = useI18n();
  return (
    <div className="app-shell flex min-h-screen flex-col text-slate-900">
      <AppHeader />
      <main id="main-content" className="workspace-page mx-auto w-full flex-1 px-4 sm:px-6 lg:px-8">
        <div className="workspace-intro">
          <p className="workspace-intro__eyebrow">{t("home.eyebrow")}</p>
          <h1 className="text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">{t("home.title")}</h1>
          <p className="workspace-intro__description text-base leading-7 sm:text-lg">{t("home.description")}</p>
        </div>
        <ProjectDashboard />
        <Calculator />
      </main>
      <footer className="border-t border-[var(--brand-border)] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <p className="mx-auto max-w-3xl text-center text-sm leading-7 text-[var(--brand-navy)] sm:text-base">{t("home.footer")}</p>
      </footer>
    </div>
  );
}
