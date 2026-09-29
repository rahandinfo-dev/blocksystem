"use client";

import {
  Blocks,
  Calculator,
  DoorOpen,
  FileDown,
  FolderOpen,
  HelpCircle,
  Ruler,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { PremiumModal } from "./premium-modal";

type HelpCategory =
  | "calculation"
  | "room-wall"
  | "doors-windows"
  | "openings"
  | "preview"
  | "projects"
  | "pdf"
  | "faq";

type Category = {
  id: HelpCategory;
  label: string;
  icon: typeof Calculator;
  title: string;
  description: string;
  steps?: string[];
};

const categories: Category[] = [
  {
    id: "calculation",
    label: "حیسابکردن",
    icon: Calculator,
    title: "دەستپێکردنی حیساب",
    description: "زانیارییە سەرەکییەکان بنووسە، پاشان ئەنجامی بلۆک و تێچوو ببینە.",
    steps: [
      "پڕۆژەیەکی نوێ دروست بکە یان پڕۆژەی پاشەکەوتکراو بکەرەوە.",
      "قەبارەی ژوور یان دیوارەکە و بەرزییەکەی بە دروستی دیاری بکە.",
      "جۆر و ڕووەبەری بلۆک هەڵبژێرە؛ ئەستووری بلۆک بە تەنها بۆ ژمارەکردن بەکارناهێنرێت.",
      "دوگمەی حیسابکردن بەکاربهێنە بۆ بینینی ژمارەی بلۆکی پێویست و زیادە.",
    ],
  },
  {
    id: "room-wall",
    label: "ژوور و دیوار",
    icon: Ruler,
    title: "دیاریکردنی قەبارە",
    description: "درێژی، پانی و بەرزی بەپێی یەکەی دروست داخل بکە.",
    steps: [
      "لە خانەی ژوورەکەدا درێژی و پانی دیاری بکە.",
      "بەرزی دیوار بنووسە و یەکەی m، cm یان mm هەڵبژێرە.",
      "ئەگەر تەنها یەک دیوار حیساب دەکەیت، دیوارە دیاریکراوەکە هەڵبژێرە.",
      "بەپێی پێویستی پڕۆژەکە، ئەستووری 10cm، 20cm، 30cm یان تایبەت هەڵبژێرە.",
    ],
  },
  {
    id: "doors-windows",
    label: "دەرگا و پەنجەرە",
    icon: DoorOpen,
    title: "کەمکردنەوەی دەرگا و پەنجەرە",
    description: "ڕووەبەری کراوەکان لە ڕووەبەری دیوار کەم دەکرێتەوە.",
    steps: [
      "دەرگا یان پەنجەرە زیاد بکە.",
      "پانی، بەرزی و ژمارەی هەر جۆرە کراوەیەک بنووسە.",
      "دڵنیابە لەوەی یەکەی هەموو قەبارەکان یەکسانە.",
      "دووبارە حیساب بکە؛ سیستەم ڕووەبەری دەرگا و پەنجەرە کەم دەکاتەوە.",
    ],
  },
  {
    id: "openings",
    label: "کراوەکان",
    icon: Blocks,
    title: "بەڕێوەبردنی کراوەکان",
    description: "هەر کراوەیەک لە دیوارە دروستەکەی دابنێ بۆ ئەنجامی وردتر.",
    steps: [
      "کراوەکان لەسەر دیوارە دروستەکە زیاد بکە، نەک بە گشتی لە پڕۆژەکە.",
      "شوێن و قەبارەکانیان لە پێشبینینی 3D بپشکنە.",
      "لە پێش چاپ یان دروستکردنی PDF، زانیارییەکان دووبارە بپشکنە.",
    ],
  },
  {
    id: "preview",
    label: "پێشبینینی 3D",
    icon: Blocks,
    title: "بینینی پڕۆژە بە 3D",
    description: "ژوور، دیوار و کراوەکان بە شێوەی سێ ڕەهەندی بپشکنە.",
    steps: [
      "پێشبینینی 3D بکەرەوە دوای داخڵکردنی قەبارەکان.",
      "بە ڕاکێشان ڕوانگەکە بگۆڕە و بە ویل یان پینچ نزیک و دوور ببەوە.",
      "کۆنتڕۆڵی ڕوانگەکان بەکاربهێنە بۆ Front، Back، Left، Right و Top.",
      "دەرگا و پەنجەرەکان لە هەردوو لای دیوار بپشکنە.",
    ],
  },
  {
    id: "projects",
    label: "پڕۆژەکان",
    icon: FolderOpen,
    title: "پاشەکەوتکردنی پڕۆژە",
    description: "کارەکانت بە ناوی دیاریکراو پاشەکەوت بکە و کاتێک پێویست بوو بیکەرەوە.",
    steps: [
      "ناوێکی ڕوون بۆ پڕۆژەکە دیاری بکە.",
      "پاش هەر گۆڕانکارییەکی گرنگ، پڕۆژەکە پاشەکەوت بکە.",
      "لە بەشی پڕۆژەکانەوە پڕۆژەی پاشەکەوتکراو هەڵبژێرە بۆ بەردەوامبوون.",
      "Undo و Redo بەکاربهێنە بۆ گەڕاندنەوەی گۆڕانکارییە تازەکان.",
    ],
  },
  {
    id: "pdf",
    label: "PDF",
    icon: FileDown,
    title: "ڕاپۆرت و وەسڵی چاپ",
    description: "ئەنجامی حیسابەکە بە ڕاپۆرتێکی ڕێکخراو بۆ چاپ یان PDF ئامادە بکە.",
    steps: [
      "سەرەتا حیسابکردن بە تەواوی بکە و ئەنجامەکان بپشکنە.",
      "ڕاپۆرت یان وەسڵی چاپ هەڵبژێرە.",
      "پێش دروستکردنی PDF، یەکە، دراو و تێچووەکان دڵنیابکەرەوە.",
      "لە پەنجەرەی چاپدا PDF پاشەکەوت بکە یان ڕاستەوخۆ چاپی بکە.",
    ],
  },
  {
    id: "faq",
    label: "پرسیارە باوەکان",
    icon: HelpCircle,
    title: "پرسیارە باوەکان",
    description: "وەڵامی کورت بۆ ئەو پرسیارانەی زۆر دووبارە دەبنەوە.",
  },
];

const faq: Array<[string, ReactNode]> = [
  ["زیادە (Waste) چییە؟", "ژمارەیەکی زیادەی بلۆکە بۆ شکاندن، بڕین و هەڵەی کارگە."],
  ["بۆچی ژمارەی بلۆک دەگۆڕێت؟", "قەبارەی دیوار، کراوەکان، ڕووەبەری بلۆک و ڕێژەی زیادە کاریگەرییان هەیە."],
  ["10cm، 20cm و 30cm چی دەگەیەنن؟", "ئەمە ئەستووری بلۆکن؛ بۆ ژمارەکردن، ڕووەبەری ڕووەوەی بلۆک بەکاردێت."],
  ["بۆچی کراوەکان کەم دەکرێنەوە؟", "چونکە شوێنی دەرگا و پەنجەرە بلۆک ناگرێت."],
  ["چۆن 3D بەکاربهێنم؟", "ڕاکێشە بۆ سوڕان، ویل یان پینچ بۆ زووم، و کۆنتڕۆڵەکان بۆ گۆڕینی ڕوانگە."],
  ["مۆرتەر چییە و بۆچی بەکاردێت؟", <div key="mortar" className="space-y-4">
    <section>
      <h4 className="font-extrabold">مۆرتەر چییە؟</h4>
      <p className="mt-1 leading-7">مۆرتەر ماددەی بەستەن و پڕکەرەوەیە کە لە نێوان بلۆک و یەکەکانی دیوار بەکاردێت؛ بلۆکەکان بەیەکەوە دەبەستێت و جۆینتە نێوانیان پڕ دەکاتەوە.</p>
    </section>
    <section>
      <h4 className="font-extrabold">مۆرتەر بۆ چی بەکاردێت؟</h4>
      <ul className="mt-2 space-y-1.5 text-sm leading-6">
        <li className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--brand-navy)]" />بۆ بەستنەوەی بلۆکەکان بەیەکەوە.</li>
        <li className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--brand-navy)]" />بۆ پڕکردنەوەی بۆشایی و جۆینتەکانی نێوان بلۆکەکان.</li>
        <li className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--brand-navy)]" />بۆ یارمەتیدان بە ڕێکخستنی ڕیزی بلۆک و جێگیرکردنی یەکەکانی دیوار.</li>
      </ul>
    </section>
    <section className="grid gap-2 sm:grid-cols-2">
      <div className="rounded-xl border border-[var(--brand-border)] bg-white p-3"><h4 className="font-extrabold">بلۆک</h4><p className="mt-1 text-sm leading-6">یەکەی سەرەکی دروستکردنی دیوارە.</p></div>
      <div className="rounded-xl border border-[var(--brand-border)] bg-white p-3"><h4 className="font-extrabold">مۆرتەر</h4><p className="mt-1 text-sm leading-6">ماددەی نێوان یەکەکانی دیوارە کە بۆ بەستنەوە و پڕکردنەوەی جۆینتەکان بەکاردێت.</p></div>
    </section>
    <section>
      <h4 className="font-extrabold">جۆینتی مۆرتەر</h4>
      <p className="mt-1 leading-7">جۆینتی مۆرتەر ئەو چینەیە لە نێوان بلۆکەکان. ئەستوورییەکەی بە پێی جۆری و قەبارەی بلۆک، کوالێتی کارکردن، تایبەتمەندییەکانی پڕۆژە و سپێسیفیکەیشنی دروستکردن دیاری دەکرێت؛ هیچ قەبارەیەکی یەکسان بۆ هەموو پڕۆژەکان نییە.</p>
    </section>
    <section>
      <h4 className="font-extrabold">بۆچی بڕی مۆرتەر دەگۆڕێت؟</h4>
      <p className="mt-1 leading-7">قەبارە و جۆری بلۆک، ئەستووری جۆینت، درێژی و بەرزی دیوار، ژمارەی بلۆک، شێوازی کارکردن، بەفیڕۆدان و وردەکارییەکانی پڕۆژە هەموویان کاریگەرییان هەیە.</p>
    </section>
    <section className="rounded-xl border border-[var(--brand-border)] bg-white p-3">
      <h4 className="font-extrabold">نموونەی فێرکاری</h4>
      <p className="mt-1 text-sm leading-6">کاتێک دیوارێک بە ژمارە و قەبارەیەکی دیاریکراوی بلۆک دروست دەکرێت، مۆرتەر بۆ جۆینتە نێوان ئەو بلۆکانە پێویستە. بەڵام بڕی وردی مۆرتەر بە قەبارەی بلۆک، ئەستووری جۆینت، سپێسیفیکەیشنی مۆرتەر و بەفیڕۆدان پەیوەستە.</p>
    </section>
    <section className="rounded-xl border border-[var(--brand-navy)] bg-[var(--brand-cream)] p-3">
      <h4 className="font-extrabold">تێبینی</h4>
      <p className="mt-1 text-sm leading-6">ژمارەی بلۆک و بڕی مۆرتەر یەک حیساب نین. ئەم سیستەمە ژمارەی بلۆکی پێویست پیشان دەدات؛ خەمڵاندنی مۆرتەر داتای زیادە و گریمانەی پێویست دەوێت. بۆ بڕیاری دروستکردنی پەیوەست بە پڕۆژە، نەخشە و سپێسیفیکەیشنە پەسەندکراوەکان و ڕێنمایی ئەندازیاری بەرپرسیار شوێن بکەوە.</p>
    </section>
  </div>],
];

export function HelpDialog({ onClose }: { onClose: () => void }) {
  const [activeCategory, setActiveCategory] = useState<HelpCategory>("calculation");
  const active = categories.find((category) => category.id === activeCategory) ?? categories[0];

  return (
    <PremiumModal id="help-dialog" label="یارمەتی و ڕێنمایی" labelledBy="help-dialog-title" onClose={onClose} panelClassName="max-w-4xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--brand-border)] bg-[var(--brand-cream)] px-4 py-4 sm:px-6">
          <button data-dialog-autofocus id="help-dialog-close" type="button" onClick={onClose} aria-label="داخستن" className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--brand-border)] bg-[#fffdf5] text-[var(--brand-navy)] transition hover:bg-[var(--brand-navy)] hover:text-[var(--brand-cream)]">
            <X size={20} aria-hidden="true" />
          </button>
          <div className="min-w-0 text-right">
            <p className="text-xs font-bold tracking-wide text-[var(--brand-navy)]">سیستەمی بلۆکی براندی ڕێک</p>
            <h2 id="help-dialog-title" className="mt-1 text-xl font-extrabold leading-8 text-[var(--brand-navy)] sm:text-2xl">یارمەتی و ڕێنمایی</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--brand-navy)]">ڕێنمایی کورت و کرداریک بۆ بەکارهێنانی هەموو بەشە سەرەکییەکان.</p>
          </div>
        </header>
        <div id="help-modal-scroll" className="help-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
          <nav aria-label="بەشەکانی یارمەتی" className="flex gap-2 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible" role="tablist">
            {categories.map((category) => {
              const Icon = category.icon;
              const selected = activeCategory === category.id;
              return <button key={category.id} type="button" role="tab" aria-selected={selected} aria-controls="help-guide" data-help-category={category.id} onClick={() => setActiveCategory(category.id)} className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${selected ? "help-category--active border-[var(--brand-navy)] bg-slate-900 text-[var(--brand-cream)] shadow-sm" : "border-[var(--brand-border)] bg-[#fffdf5] text-[var(--brand-navy)] hover:bg-[var(--brand-cream)]"}`}>
                <Icon size={16} aria-hidden="true" /><span className="whitespace-nowrap">{category.label}</span>
              </button>;
            })}
          </nav>
          <section id="help-guide" role="tabpanel" className="mt-5 rounded-2xl border border-[var(--brand-border)] bg-white p-4 sm:p-5">
            <div className="border-b border-[var(--brand-border)] pb-4">
              <p className="text-xs font-bold text-[var(--brand-navy)]">ڕێنمایی بە پێی بەش</p>
              <h3 className="mt-1 text-lg font-extrabold text-[var(--brand-navy)] sm:text-xl">{active.title}</h3>
              <p className="mt-1 leading-7 text-[var(--brand-navy)]">{active.description}</p>
            </div>
            {active.steps ? <ol className="mt-4 space-y-3">
              {active.steps.map((step, index) => <li key={step} className="flex items-start gap-3 rounded-xl border border-[var(--brand-border)] bg-[#fffdf5] p-3.5 sm:p-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--brand-cream)] text-sm font-extrabold text-[var(--brand-navy)]">{String(index + 1).padStart(2, "0")}</span>
                <span className="min-w-0 pt-0.5 leading-7 text-[var(--brand-navy)]">{step}</span>
              </li>)}
            </ol> : <div className="mt-4 space-y-3">
              {faq.map(([question, answer]) => <details key={question} className="rounded-xl border border-[var(--brand-border)] bg-[#fffdf5] px-4 py-3">
                <summary className="cursor-pointer font-bold text-[var(--brand-navy)]">{question}</summary>
                {typeof answer === "string" ? <p className="mt-3 border-t border-[var(--brand-border)] pt-3 leading-7 text-[var(--brand-navy)]">{answer}</p> : <div className="mt-3 border-t border-[var(--brand-border)] pt-3 leading-7 text-[var(--brand-navy)]">{answer}</div>}
              </details>)}
            </div>}
          </section>
        </div>
    </PremiumModal>
  );
}
