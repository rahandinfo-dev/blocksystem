import type { Language } from "./i18n";

const en = {
  "pwa.offline": "You are offline. Saved work remains available on this device.",
  "pwa.online": "Connection restored.",
  "pwa.updateAvailable": "An app update is ready.",
  "pwa.update": "Update now",
  "pwa.install": "Install app",
  "pwa.dismiss": "Not now",
  "pwa.installReady": "BlockSystem can be installed for faster access and offline work.",
  "pwa.offlineTitle": "You are offline",
  "pwa.offlineDescription": "Previously opened BlockSystem pages and saved projects can still be used. Verification, administration and new server documents need an internet connection.",
  "pwa.goHome": "Go to BlockSystem",
  "pwa.retry": "Try again",
  "pwa.loading": "Loading BlockSystem…",
  "pwa.errorTitle": "Something went wrong",
  "pwa.errorDescription": "Your saved work has not been changed. Please try again.",
};

const ku = {
  "pwa.offline": "ئێستا ئۆفلاینیت. کارە پاشەکەوتکراوەکان لەم ئامێرەدا بەردەستن.",
  "pwa.online": "پەیوەندی گەڕایەوە.",
  "pwa.updateAvailable": "نوێکردنەوەیەکی ئەپ ئامادەیە.",
  "pwa.update": "ئێستا نوێی بکەوە",
  "pwa.install": "دامەزراندنی ئەپ",
  "pwa.dismiss": "ئێستا نا",
  "pwa.installReady": "دەتوانیت BlockSystem دابمەزرێنیت بۆ دەستگەیشتنی خێراتر و کاری ئۆفلاین.",
  "pwa.offlineTitle": "ئۆفلاینیت",
  "pwa.offlineDescription": "پەڕە پێشتر کراوەکان و پڕۆژە پاشەکەوتکراوەکان بەردەستن. پشتڕاستکردنەوە، بەڕێوەبردن و بەڵگەی نوێی سێرڤەر پێویستیان بە ئینتەرنێتە.",
  "pwa.goHome": "چوون بۆ BlockSystem",
  "pwa.retry": "دووبارە هەوڵبدە",
  "pwa.loading": "BlockSystem بار دەکرێت…",
  "pwa.errorTitle": "شتێک هەڵە ڕوویدا",
  "pwa.errorDescription": "کارە پاشەکەوتکراوەکانت نەگۆڕاون. تکایە دووبارە هەوڵبدە.",
};

const ar = {
  "pwa.offline": "أنت غير متصل. يظل العمل المحفوظ متاحاً على هذا الجهاز.",
  "pwa.online": "تمت استعادة الاتصال.",
  "pwa.updateAvailable": "تحديث للتطبيق جاهز.",
  "pwa.update": "حدّث الآن",
  "pwa.install": "تثبيت التطبيق",
  "pwa.dismiss": "ليس الآن",
  "pwa.installReady": "يمكن تثبيت BlockSystem للوصول الأسرع والعمل دون اتصال.",
  "pwa.offlineTitle": "أنت غير متصل",
  "pwa.offlineDescription": "تظل صفحات BlockSystem التي فُتحت سابقاً والمشاريع المحفوظة متاحة. يحتاج التحقق والإدارة والمستندات الجديدة من الخادم إلى اتصال بالإنترنت.",
  "pwa.goHome": "الانتقال إلى BlockSystem",
  "pwa.retry": "حاول مرة أخرى",
  "pwa.loading": "جارٍ تحميل BlockSystem…",
  "pwa.errorTitle": "حدث خطأ ما",
  "pwa.errorDescription": "لم يتغير عملك المحفوظ. يرجى المحاولة مرة أخرى.",
};

export const phase9Messages: Record<Language, Record<keyof typeof en, string>> = {
  "en-GB": en,
  ku,
  ar,
};
