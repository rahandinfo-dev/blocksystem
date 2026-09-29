"use client";

import { Phone, X } from "lucide-react";
import { ContactContent } from "./contact-content";
import { PremiumModal } from "./premium-modal";

export function ContactDialog({ onClose }: { onClose: () => void }) {
  return (
    <PremiumModal id="contact-dialog" label="پەیوەندی" labelledBy="contact-dialog-title" onClose={onClose} panelClassName="max-w-xl">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--brand-border)] bg-[var(--brand-cream)] px-4 py-4 sm:px-6">
        <button data-dialog-autofocus id="contact-dialog-close" type="button" onClick={onClose} aria-label="داخستن" className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--brand-border)] bg-[#fffdf5] text-[var(--brand-navy)] transition hover:bg-[var(--brand-navy)] hover:text-[var(--brand-cream)]"><X size={20} aria-hidden="true" /></button>
        <div className="min-w-0 text-right"><div className="flex items-center justify-end gap-2 text-xs font-bold text-[var(--brand-navy)]"><span>RekApps</span><Phone size={15} aria-hidden="true" /></div><h2 id="contact-dialog-title" className="mt-1 text-xl font-extrabold leading-8 text-[var(--brand-navy)] sm:text-2xl">پەیوەندی بە RekApps</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--brand-navy)]">بۆ پرسیار و ڕێنمایی، سیستەمی ژمێریاری، فرۆشگا، ERP، سیستەمی تایبەت، وێبسایت و Web Application، یان چارەسەری دیجیتاڵ و گەشەپێدانی سیستەم پەیوەندیمان پێوە بکە.</p></div>
      </header>
      <div id="contact-modal-scroll" className="contact-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6"><ContactContent /></div>
    </PremiumModal>
  );
}
