import { AppHeader } from "@/components/layout/app-header";
import { Calculator } from "@/features/calculator/components/calculator";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <AppHeader />
      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-8 max-w-3xl sm:mb-10">
          <p className="mb-3 text-sm font-semibold text-amber-700">بۆ حیسابکردنی خێرا و وردی بیناسازی</p>
          <h1 className="text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">
            سیستەمی بلۆکی براندی ڕێک
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            حیسابکردنی ژمارەی بلۆک و تێچووی بیناسازی بە شێوەی خێرا و ورد
          </p>
        </div>
        <Calculator />
      </main>
      <footer className="border-t border-[var(--brand-border)] px-4 py-5 sm:px-6 sm:py-6 lg:px-8" dir="rtl">
        <p className="mx-auto max-w-3xl text-center text-sm leading-7 text-[var(--brand-navy)] sm:text-base">
          درووستکراوە بۆ کار ئاسانی ئەندازیاران، لەلایەن ڕەهەند جاف گەشەپێدەری <bdi dir="ltr" className="font-bold">RekApps</bdi>
        </p>
      </footer>
    </div>
  );
}
