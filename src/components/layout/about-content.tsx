import {
  Blocks,
  Calculator,
  ChartNoAxesCombined,
  DoorOpen,
  Eye,
  FileText,
  FolderOpen,
  Ruler,
  type LucideIcon,
} from "lucide-react";

type Feature = { icon: LucideIcon; title: string; text: string };

const features: Feature[] = [
  { icon: Calculator, title: "حیسابکردنی ژوور", text: "قەبارەی ژوور و پێویستییەکانی بلۆک بە شێوەی ڕێکخراو حساب بکە." },
  { icon: Ruler, title: "حیسابکردنی دیوار", text: "درێژی، پانی و بەرزی دیوار دیاری بکە بۆ ئەنجامی ورد." },
  { icon: Blocks, title: "بلۆک و یەکەکان", text: "جۆری بلۆک، ڕووەبەری و یەکەکانی m، cm و mm بەکاربهێنە." },
  { icon: DoorOpen, title: "دەرگا و پەنجەرە", text: "کراوەکان زیاد بکە؛ ڕووەبەریان خۆکارانە لە حساب کەم دەکرێتەوە." },
  { icon: ChartNoAxesCombined, title: "زیادە و تێچوو", text: "ڕێژەی زیادە، نرخ و دراوی IQD یان USD بۆ کۆی تێچوو حساب بکە." },
  { icon: Eye, title: "پێشبینینی 3D", text: "ژوور، دیوار و کراوەکان لە پێشبینینی سێ ڕەهەندی بپشکنە." },
  { icon: FolderOpen, title: "پڕۆژەکان", text: "پڕۆژەکان پاشەکەوت بکە، بکەرەوە و گۆڕانکارییەکان بەڕێوەببە." },
  { icon: FileText, title: "ڕاپۆرت و PDF", text: "ئەنجامەکە بە وەسڵی ڕێکخراو بۆ چاپ یان PDF ئامادە بکە." },
];

const benefits = [
  "حسابکردن خێراتر دەکات و پێویستی بە حسابی دەستی ئاڵۆز کەم دەکات.",
  "هەڵەی حسابی کەم دەکاتەوە بە کەمکردنەوەی ڕووەبەری کراوەکان.",
  "زانیاری و ئەنجامەکان بە شێوەیەکی ڕێکخراو پیشان دەدات.",
  "پێداویستییەکان و تێچووی ماددە پێش دەستپێکردنی کار ڕوون دەکاتەوە.",
  "پێشبینینی ژوور و دیوار پێش جێبەجێکردن ئاسان دەکات.",
  "پڕۆژەکانت هەڵدەگرێت و ڕاپۆرتێکی ئامادەی PDF پێشکەش دەکات.",
];

const workflow = [
  "زانیاری پڕۆژە داخل بکە",
  "قەبارەی ژوور یان دیوار دیاری بکە",
  "دەرگا و پەنجەرەکان زیاد بکە",
  "یەکە و وردەکارییەکان دیاری بکە",
  "حساب ئەنجام بدە",
  "ئەنجام و 3D ببینە",
  "PDF دروست بکە",
];

export function AboutContent() {
  return (
    <div className="info-document about-page space-y-6 leading-7 text-[var(--brand-navy)]">
      <section aria-labelledby="about-introduction" className="info-document__hero">
        <p className="text-xs font-bold text-[var(--brand-navy)]">ناسنامەی سیستەم</p>
        <h3 id="about-introduction" className="mt-1 text-xl font-extrabold sm:text-2xl">سیستەمی بلۆکی براندی ڕێک</h3>
        <p className="mt-3 max-w-3xl text-[var(--brand-navy)]">ئەم ئەپە بۆ خێراتر، ئاسانتر و وردترکردنی حسابی ژوور و دیوار دروست کراوە. قەبارەکانت داخل بکە و بەبێ حسابی دەستی ئاڵۆز، ئەنجامی بلۆک و تێچوو بە شێوەیەکی ڕێکخراو و ڕوون وەربگرە.</p>
      </section>

      <section aria-labelledby="about-features" className="border-t border-[var(--brand-border)] pt-5">
        <div className="flex items-baseline justify-between gap-3"><h3 id="about-features" className="text-lg font-extrabold">تایبەتمەندییەکان</h3><span className="text-xs font-bold">ئامرازە سەرەکییەکان</span></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-xl border border-[var(--brand-border)] bg-white p-3.5"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--brand-cream)] text-[var(--brand-navy)]"><Icon size={18} aria-hidden="true" /></span><div className="min-w-0"><h4 className="font-extrabold">{title}</h4><p className="mt-0.5 text-sm leading-6">{text}</p></div></div></article>)}
        </div>
      </section>

      <section aria-labelledby="about-benefits" className="border-t border-[var(--brand-border)] pt-5">
        <h3 id="about-benefits" className="text-lg font-extrabold">سوودەکانی ئەپ</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {benefits.map((benefit) => <li key={benefit} className="flex gap-2 rounded-xl border border-[var(--brand-border)] bg-[#fffdf5] p-3 text-sm leading-6"><span className="mt-2 size-2 shrink-0 rounded-full bg-[var(--brand-navy)]" aria-hidden="true" /><span>{benefit}</span></li>)}
        </ul>
      </section>

      <section aria-labelledby="about-workflow" className="border-t border-[var(--brand-border)] pt-5">
        <h3 id="about-workflow" className="text-lg font-extrabold">چۆن کار دەکات؟</h3>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {workflow.map((step, index) => <li key={step} className="flex items-center gap-3 rounded-xl border border-[var(--brand-border)] bg-white p-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--brand-cream)] text-xs font-extrabold">{String(index + 1).padStart(2, "0")}</span><span className="text-sm font-bold leading-6">{step}</span></li>)}
        </ol>
      </section>
    </div>
  );
}
