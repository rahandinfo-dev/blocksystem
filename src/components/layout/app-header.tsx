"use client";
import { Blocks, Building2, Calculator, CircleHelp, FolderKanban, Home, Info, Languages, Mail, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AboutDialog } from "./about-dialog";
import { ContactDialog } from "./contact-dialog";
import { CompanyAboutDialog } from "./company-about-dialog";
import { HelpDialog } from "./help-dialog";
import { languageDetails, languages, useI18n, type Language } from "@/lib/i18n";

export function AppHeader() {
  const { language, setLanguage, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("home");
  const [dialog, setDialog] = useState<"about" | "help" | "contact" | "company" | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setDialog(null);
        setActive("home");
        requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
    };
    addEventListener("keydown", close);
    return () => removeEventListener("keydown", close);
  }, []);
  const jump = (id: string, destination: string) => {
    setOpen(false);
    setActive(destination);
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const closeDialog = () => {
    setDialog(null);
    setActive("home");
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  };
  const itemClass = (destination: string) => `w-full rounded-lg px-3 py-3 text-start font-semibold ${active === destination ? "bg-[var(--brand-navy)] text-[var(--brand-cream)]" : "hover:bg-[var(--brand-cream)]"}`;
  return (
    <header className="border-b border-slate-200 bg-[var(--brand-cream)]">
      <div
        className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-[var(--brand-navy)] text-[var(--brand-cream)]">
            <Blocks size={20} />
          </span>
          <span className="text-base font-bold tracking-tight text-slate-950">
            {t("app.name")}
          </span>
        </div>
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="app-menu"
          className="order-last inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        >
          <Menu size={18} /> {t("common.menu")}
        </button>
      </div>
      {open ? (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label={t("common.menu")}
        >
          <button
            aria-label={t("common.close")}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[color:color-mix(in_srgb,var(--brand-navy)_18%,transparent)]"
          />
          <aside
            id="app-menu"
            className="absolute end-0 top-0 flex h-[100dvh] w-[min(22rem,88vw)] max-w-full flex-col overflow-y-auto bg-white p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <strong>{t("app.name")}</strong>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("common.close")}
                className="grid size-10 place-items-center rounded-lg hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="mt-5 space-y-1">
              <button
                onClick={() => jump("main-content", "home")}
                className={itemClass("home")}
              >
                <Home className="me-2 inline" size={17} /> {t("navigation.home")}
              </button>
              <button
                onClick={() => jump("projects", "projects")}
                className={itemClass("projects")}
              >
                <FolderKanban className="me-2 inline" size={17} /> {t("navigation.projects")}
              </button>
              <button
                onClick={() => jump("room-preview", "preview")}
                className={itemClass("preview")}
              >
                <Calculator className="me-2 inline" size={17} /> {t("navigation.preview")}
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setActive("help");
                  setDialog("help");
                }}
                className={itemClass("help")}
              >
                <CircleHelp className="me-2 inline" size={17} /> {t("navigation.help")}
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setActive("about");
                  setDialog("about");
                }}
                className={itemClass("about")}
              >
                <Info className="me-2 inline" size={17} /> {t("navigation.aboutApp")}
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setActive("company");
                  setDialog("company");
                }}
                className={itemClass("company")}
              >
                <Building2 className="me-2 inline" size={17} /> {t("navigation.aboutCompany")}
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setActive("contact");
                  setDialog("contact");
                }}
                className={itemClass("contact")}
              >
                <Mail className="me-2 inline" size={17} /> {t("navigation.contact")}
              </button>
            </nav>
            <label className="mt-auto border-t border-slate-200 pt-5 text-sm font-bold text-slate-700">
              <span className="mb-2 flex items-center gap-2"><Languages size={17} /> {t("navigation.language")}</span>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as Language)}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-semibold"
                aria-label={t("navigation.language")}
              >
                {languages.map((code) => <option key={code} value={code}>{languageDetails[code].label}</option>)}
              </select>
            </label>
          </aside>
        </div>
      ) : null}
      {dialog === "help" ? <HelpDialog onClose={closeDialog} /> : dialog === "about" ? <AboutDialog onClose={closeDialog} /> : dialog === "company" ? <CompanyAboutDialog onClose={closeDialog} /> : dialog === "contact" ? <ContactDialog onClose={closeDialog} /> : null}
    </header>
  );
}
