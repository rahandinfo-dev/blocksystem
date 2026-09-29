"use client";
import { Blocks, Building2, Info, Mail, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AboutDialog } from "./about-dialog";
import { ContactDialog } from "./contact-dialog";
import { CompanyAboutDialog } from "./company-about-dialog";
import { HelpDialog } from "./help-dialog";

const brand = "سیستەمی بلۆکی براندی ڕێک";
export function AppHeader() {
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
  const itemClass = (destination: string) => `w-full rounded-lg px-3 py-3 text-right font-semibold ${active === destination ? "bg-[var(--brand-navy)] text-[var(--brand-cream)]" : "hover:bg-[var(--brand-cream)]"}`;
  return (
    <header className="border-b border-slate-200 bg-[var(--brand-cream)]">
      <div
        className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"
        dir="rtl"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-[var(--brand-navy)] text-[var(--brand-cream)]">
            <Blocks size={20} />
          </span>
          <span className="text-base font-bold tracking-tight text-slate-950">
            {brand}
          </span>
        </div>
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="app-menu"
          className="order-last inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          dir="rtl"
        >
          <Menu size={18} /> مێنوو
        </button>
      </div>
      {open ? (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="مێنوو"
        >
          <button
            aria-label="داخستنی مێنوو"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[color:color-mix(in_srgb,var(--brand-navy)_18%,transparent)]"
          />
          <aside
            id="app-menu"
            className="absolute right-0 top-0 flex h-[100dvh] w-[min(22rem,88vw)] max-w-full flex-col overflow-y-auto bg-white p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <strong>{brand}</strong>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="داخستن"
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
                سەرەکی
              </button>
              <button
                onClick={() => jump("projects", "projects")}
                className={itemClass("projects")}
              >
                پڕۆژەکان
              </button>
              <button
                onClick={() => jump("room-preview", "preview")}
                className={itemClass("preview")}
              >
                پێشبینینی ژوور
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setActive("help");
                  setDialog("help");
                }}
                className={itemClass("help")}
              >
                یارمەتی
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setActive("about");
                  setDialog("about");
                }}
                className={itemClass("about")}
              >
                <Info className="ml-2 inline" size={17} /> زانیاری دەربارەی ئەپ
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setActive("company");
                  setDialog("company");
                }}
                className={itemClass("company")}
              >
                <Building2 className="ml-2 inline" size={17} /> دەربارەی ئێمە
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setActive("contact");
                  setDialog("contact");
                }}
                className={itemClass("contact")}
              >
                <Mail className="ml-2 inline" size={17} /> پەیوەندی
              </button>
            </nav>
          </aside>
        </div>
      ) : null}
      {dialog === "help" ? <HelpDialog onClose={closeDialog} /> : dialog === "about" ? <AboutDialog onClose={closeDialog} /> : dialog === "company" ? <CompanyAboutDialog onClose={closeDialog} /> : dialog === "contact" ? <ContactDialog onClose={closeDialog} /> : null}
    </header>
  );
}
