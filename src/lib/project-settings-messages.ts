import type { Language } from "@/lib/i18n";

type Key =
  | "blocks.heading"
  | "blocks.helper"
  | "workMode.heading"
  | "workMode.description"
  | "workMode.quick"
  | "workMode.quickDescription"
  | "workMode.advanced"
  | "workMode.advancedDescription"
  | "workMode.comparisonTitle"
  | "workMode.comparisonDescription"
  | "workMode.quickFeatureOne"
  | "workMode.quickFeatureTwo"
  | "workMode.advancedFeatureOne"
  | "workMode.advancedFeatureTwo"
  | "workMode.advancedFeatureThree"
  | "options.mortarDescription"
  | "options.mortarJoint"
  | "options.jointWidth"
  | "options.jointDescription"
  | "options.jointCalculationNote"
  | "options.mortarCostDescription"
  | "options.materialCostDescription"
  | "workspace.autoSavedStatus";

const en: Record<Key, string> = {
  "blocks.heading": "Block",
  "blocks.helper": "Choose the block size used in this project.",
  "workMode.heading": "Working mode",
  "workMode.description": "For room calculations, Quick mode keeps things simple; Advanced mode gives you control of each wall.",
  "workMode.quick": "Quick mode",
  "workMode.quickDescription": "For a fast calculation with fewer details.",
  "workMode.advanced": "Advanced mode",
  "workMode.advancedDescription": "For detailed calculations and more project control.",
  "workMode.comparisonTitle": "Mode comparison",
  "workMode.comparisonDescription": "Shows the real differences between Quick and Advanced modes so you can choose the right one for the job.",
  "workMode.quickFeatureOne": "Calculates each room as one perimeter.",
  "workMode.quickFeatureTwo": "Use doors and windows for the room.",
  "workMode.advancedFeatureOne": "Calculate enabled room walls separately.",
  "workMode.advancedFeatureTwo": "Set each wall's type and openings.",
  "workMode.advancedFeatureThree": "Add other openings and structural deductions.",
  "options.mortarDescription": "Mortar is the mixture placed between blocks to bind and secure them.",
  "options.mortarJoint": "Mortar joint thickness",
  "options.jointWidth": "Mortar joint thickness",
  "options.jointDescription": "The thickness of mortar placed between blocks.",
  "options.jointCalculationNote": "Used for the estimated row count.",
  "options.mortarCostDescription": "Included when estimating the total mortar cost for this project.",
  "options.materialCostDescription": "These entered extra costs are included in the project's total cost estimate.",
  "workspace.autoSavedStatus": "Saved automatically ✓",
};

const ku: Record<Key, string> = {
  "blocks.heading": "بلۆک",
  "blocks.helper": "قەبارەی بلۆکی بەکارهاتوو لە پڕۆژەکەت هەڵبژێرە.",
  "workMode.heading": "دۆخی کارکردن",
  "workMode.description": "لە حیسابی ژووردا، دۆخی خێرا بۆ حیسابی سادە و خێرایە؛ دۆخی پێشکەوتوو بۆ وردەکاری و کۆنترۆڵی زیاترە.",
  "workMode.quick": "دۆخی خێرا",
  "workMode.quickDescription": "بۆ حیسابکردنی خێرا بە کەمترین وردەکاری.",
  "workMode.advanced": "دۆخی پێشکەوتوو",
  "workMode.advancedDescription": "بۆ حیسابی وردتر و کۆنترۆڵی زیاتر لە پڕۆژە.",
  "workMode.comparisonTitle": "بەراوردی دۆخەکان",
  "workMode.comparisonDescription": "جیاوازی نێوان دۆخی خێرا و دۆخی پێشکەوتوو پیشان دەدات، بۆ ئەوەی دۆخی گونجاو بۆ کارەکەت هەڵبژێریت.",
  "workMode.quickFeatureOne": "هەر ژوورێک وەک یەک دەور حیساب دەکرێت.",
  "workMode.quickFeatureTwo": "دەرگا و پەنجەرەی ژوور بەکاربهێنە.",
  "workMode.advancedFeatureOne": "دیوارە بەکارهاتووەکانی ژوور بە تاکەیی حیساب بکە.",
  "workMode.advancedFeatureTwo": "جۆر و کراوەکانی هەر دیوارێک دیاری بکە.",
  "workMode.advancedFeatureThree": "کراوەی تر و کەمکردنەوەی سازەیی زیاد بکە.",
  "options.mortarDescription": "مۆرتەر ئەو تێکەڵە ماددەیەیە کە لەنێوان بلۆکەکان بەکاردێت بۆ بەستن و جێگیرکردنیان.",
  "options.mortarJoint": "ئەستووری مۆرتەر",
  "options.jointWidth": "ئەستووری مۆرتەر",
  "options.jointDescription": "ئەستووری ئەو مۆرتەرەیە کە لەنێوان بلۆکەکان دادەنرێت.",
  "options.jointCalculationNote": "بۆ خەمڵاندنی ژمارەی ڕیزەکان بەکاردێت.",
  "options.mortarCostDescription": "بۆ خەمڵاندنی تێچووی مۆرتەری پێویست لە پڕۆژە بەکاردێت.",
  "options.materialCostDescription": "ئەم نرخانە لە خەمڵاندنی کۆی تێچووی پڕۆژەدا بەکاردێن.",
  "workspace.autoSavedStatus": "خۆکارانە پاشەکەوت کرا ✓",
};

const ar: Record<Key, string> = {
  "blocks.heading": "بلوك",
  "blocks.helper": "اختر مقاس البلوك المستخدم في هذا المشروع.",
  "workMode.heading": "وضع العمل",
  "workMode.description": "في حساب الغرف، الوضع السريع للحساب البسيط والسريع؛ الوضع المتقدم يمنحك تحكماً أكبر في كل جدار.",
  "workMode.quick": "الوضع السريع",
  "workMode.quickDescription": "لحساب سريع بتفاصيل أقل.",
  "workMode.advanced": "الوضع المتقدم",
  "workMode.advancedDescription": "لحسابات أدق وتحكم أكبر في المشروع.",
  "workMode.comparisonTitle": "مقارنة الأوضاع",
  "workMode.comparisonDescription": "يوضح الفروق الفعلية بين الوضعين السريع والمتقدم لتختار الأنسب للعمل.",
  "workMode.quickFeatureOne": "يحسب كل غرفة كمحيط واحد.",
  "workMode.quickFeatureTwo": "استخدم أبواب ونوافذ الغرفة.",
  "workMode.advancedFeatureOne": "احسب جدران الغرفة المفعلة بشكل منفصل.",
  "workMode.advancedFeatureTwo": "حدد نوع وفتحات كل جدار.",
  "workMode.advancedFeatureThree": "أضف فتحات أخرى وخصومات إنشائية.",
  "options.mortarDescription": "المونة هي الخليط الذي يوضع بين البلوك لربطه وتثبيته.",
  "options.mortarJoint": "سماكة فاصل المونة",
  "options.jointWidth": "سماكة فاصل المونة",
  "options.jointDescription": "سماكة المونة الموضوعة بين البلوك.",
  "options.jointCalculationNote": "تستخدم لتقدير عدد الصفوف.",
  "options.mortarCostDescription": "تدخل في تقدير تكلفة المونة الكلية لهذا المشروع.",
  "options.materialCostDescription": "تدخل هذه التكاليف الإضافية في تقدير التكلفة الكلية للمشروع.",
  "workspace.autoSavedStatus": "تم الحفظ تلقائياً ✓",
};

export const projectSettingsMessages: Record<Language, Record<Key, string>> = {
  "en-GB": en,
  ku,
  ar,
};
