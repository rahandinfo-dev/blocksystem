"use client";

import { useEffect, useRef, type ReactNode } from "react";

type PremiumModalProps = {
  id: string;
  label: string;
  labelledBy?: string;
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
};

/** Shared shell for the Home-overlay informational dialogs. */
export function PremiumModal({
  id,
  label,
  labelledBy,
  onClose,
  children,
  panelClassName = "",
}: PremiumModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("[data-dialog-autofocus]")?.focus();

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", trapFocus);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", trapFocus);
      previousFocus?.focus();
    };
  }, []);

  return (
    <div id={id} className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy} dir="rtl">
      <button id={`${id}-backdrop`} type="button" tabIndex={-1} aria-label="داخستن" onClick={onClose} className="absolute inset-0 cursor-default bg-[rgb(15_32_83_/_22%)] backdrop-blur-[2px]" />
      <div ref={dialogRef} className={`premium-modal-panel relative flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-[1.35rem] border border-[var(--brand-border)] bg-[#fffdf5] shadow-[0_18px_50px_rgb(15_32_83_/_18%)] sm:max-h-[calc(100dvh-3rem)] ${panelClassName}`.trim()}>
        {children}
      </div>
    </div>
  );
}
