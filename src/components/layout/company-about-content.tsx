import {
  Boxes,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  LayoutDashboard,
  MonitorSmartphone,
  ShoppingCart,
  Smartphone,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { menuPageCopy } from "./menu-page-copy";

const services = [
  { icon: ChartNoAxesCombined, title: "سیستەمی ژمێریاری و حسابات", text: "ئامرازە دیجیتاڵییەکان بۆ ڕێکخستن و چاودێریکردنی حسابات." },
  { icon: ShoppingCart, title: "سیستەمی فرۆشگا و POS", text: "چارەسەر بۆ بەڕێوەبردنی فرۆشتن و کارە ڕۆژانەکانی فرۆشگا." },
  { icon: Boxes, title: "بەڕێوەبردنی کۆگا", text: "ڕێکخستنی کاڵا و داتای کۆگا بە شێوەیەکی ڕوون." },
  { icon: LayoutDashboard, title: "سیستەمی ERP و کاروبار", text: "یەکخستنی زانیاری و پرۆسەکانی بەڕێوەبردنی کاروبار." },
  { icon: MonitorSmartphone, title: "وێبسایت و Web Application", text: "دروستکردنی ئەزموونی وێب بە شێوەی خێرا و گونجاو بۆ ئامێرە جیاوازەکان." },
  { icon: BriefcaseBusiness, title: "سیستەمی تایبەت", text: "چارەسەری تایبەت بە پێی پێداویستی کار و ڕێکخراوەکان." },
];

const strengths = [
  "ئاسانکردنی کار و خێراکردنی پرۆسەکان",
  "ڕێکخستنی داتا و کەمکردنەوەی هەڵە",
  "UI/UX ـێکی سادە و ئاسان بۆ بەکارهێنەر",
  "دیزاینی خێرا و responsive بۆ ئامێرە جیاوازەکان",
  "ڕێگاکانی گونجاو بۆ پاراستن و بەڕێوەبردنی داتا",
  "گەشەپێدانی چارەسەر بە پێی پێداویستی کاروبار",
];

export function CompanyAboutContent() {
  const { language } = useI18n();
  const copy = menuPageCopy[language];
  return (
    <div className="info-document company-page space-y-6 text-[var(--brand-navy)]">
      <section aria-labelledby="company-introduction" className="info-document__hero">
        <p className="text-xs font-bold">دەربارەی RekApps</p>
        <h3 id="company-introduction" className="mt-1 text-xl font-extrabold sm:text-2xl">تێکنەلۆجیا بۆ کارێکی ڕێکخراوتر</h3>
        <p className="mt-3 max-w-3xl leading-7">RekApps کۆمپانیایەکی گەشەپێدانی نەرمامێرە کە لە دروستکردنی سیستەمی مۆدێرن، زیرەک و کرداریک بۆ کاروبار و کۆمپانیاکان کار دەکات. ئامانجمان ئەوەیە کار ئاسانتر بکرێت، پرۆسەکان خێراتر بڕۆن و داتا بە شێوەیەکی ڕێکخراو بەکارهێنرێت.</p>
      </section>

      <section aria-labelledby="company-services" className="border-t border-[var(--brand-border)] pt-5">
        <div className="flex items-baseline justify-between gap-3"><h3 id="company-services" className="text-lg font-extrabold">خزمەتگوزارییەکانمان</h3><span className="text-xs font-bold">چارەسەرە دیجیتاڵییەکان</span></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {services.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-xl border border-[var(--brand-border)] bg-white p-3.5"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--brand-cream)]"><Icon size={18} aria-hidden="true" /></span><div className="min-w-0"><h4 className="font-extrabold">{title}</h4><p className="mt-0.5 text-sm leading-6">{text}</p></div></div></article>)}
        </div>
      </section>

      <section aria-labelledby="company-goals" className="border-t border-[var(--brand-border)] pt-5">
        <h3 id="company-goals" className="text-lg font-extrabold">ئامانج و تایبەتمەندییەکانمان</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {strengths.map((strength) => <li key={strength} className="flex gap-2 rounded-xl border border-[var(--brand-border)] bg-[#fffdf5] p-3 text-sm leading-6"><span className="mt-2 size-2 shrink-0 rounded-full bg-[var(--brand-navy)]" aria-hidden="true" /><span>{strength}</span></li>)}
        </ul>
      </section>

      <section aria-labelledby="company-digital" className="border-t border-[var(--brand-border)] pt-5">
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-cream)] p-4"><Smartphone className="mt-1 shrink-0" size={21} aria-hidden="true" /><div><h3 id="company-digital" className="font-extrabold">بۆچی سیستەمی دیجیتاڵ؟</h3><p className="mt-1 text-sm leading-6">سیستەمی گونجاو دەتوانێت زانیاری و کارە ڕۆژانەکانت لە یەک شوێن ڕێک بخات، شوێنکەوتنی کار ئاسان بکات و بڕیاردان پشتگیری بکات.</p></div></div>
      </section>

      <section aria-labelledby="company-contact" className="border-t border-[var(--brand-border)] pt-5">
        <h3 id="company-contact" className="text-lg font-extrabold">پەیوەندی</h3>
        <p className="mt-1 text-sm leading-6">بۆ گفتوگۆ دەربارەی سیستەمی کاروبار یان چارەسەری تایبەت، پەیوەندی بە RekApps بکە.</p>
        <a id="company-phone" href="tel:07762916675" dir="ltr" className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-[var(--brand-navy)] bg-white px-4 py-2 text-xl font-extrabold tracking-wide transition hover:bg-[var(--brand-cream)]">07762916675</a>
      </section>
      <footer className="developer-signature">
        <p>{copy.developerSignature}</p>
        <strong>RekApps</strong>
      </footer>
    </div>
  );
}
