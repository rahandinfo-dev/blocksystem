import type { Language } from "@/lib/i18n";

type HelpCopy = { quickStart: string; quickStartDescription: string; steps: string[]; developerSignature: string };

export const menuPageCopy: Record<Language, HelpCopy> = {
  ku: {
    quickStart: "دەستپێکی خێرا",
    quickStartDescription: "ڕێڕەوی سادەی کارکردن لە پڕۆژەوە بۆ ڕاپۆرت.",
    developerSignature: "درووستکراوە بۆ کار ئاسانی ئەندازیان، لەلایەن ڕەهەند جاف، گەشەپێدەری RekApps.",
    steps: ["پڕۆژەی نوێ دروست بکە", "زانیاری و پێوانەکانی پڕۆژە داخڵ بکە", "ژوور یان دیوارەکان زیاد بکە", "جۆر و قەبارەی بلۆک هەڵبژێرە", "دەرگا و پەنجەرە زیاد بکە", "مۆرتەر و نرخەکان دیاری بکە", "ئەنجامی حیسابکردن ببینە", "پلانێکی 2D یان پێشبینینی 3D بکەرەوە", "ڕاپۆرت چاپ/PDF بکە یان هاوبەشی بکە"],
  },
  ar: {
    quickStart: "بدء سريع",
    quickStartDescription: "مسار بسيط من المشروع إلى التقرير.",
    developerSignature: "صُمم لتسهيل عمل المهندسين بواسطة رهند جاف، مطور RekApps.",
    steps: ["أنشئ مشروعاً جديداً", "أدخل معلومات المشروع ووحداته", "أضف الغرف أو الجدران", "اختر نوع البلوك وأبعاده", "أضف الأبواب والنوافذ", "حدد المونة والتكاليف", "راجع نتيجة الحساب", "افتح مخطط 2D أو معاينة 3D", "اطبع أو صدّر PDF أو شارك التقرير"],
  },
  "en-GB": {
    quickStart: "Quick start",
    quickStartDescription: "A clear route from a project to a report.",
    developerSignature: "Made to make engineers’ work easier by Rahand Jaf, RekApps developer.",
    steps: ["Create a new project", "Enter the project information and units", "Add rooms or walls", "Choose the block type and dimensions", "Add doors and windows", "Set mortar and costs", "Review the calculation result", "Open the 2D plan or 3D preview", "Print, export a PDF, or share the report"],
  },
};
