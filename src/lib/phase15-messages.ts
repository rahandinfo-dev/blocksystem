import type { Language } from "@/lib/i18n";

const en = {
  "three.select": "Select",
  "three.measure": "Measure",
  "three.measureHint": "Select two points on the model to measure a world-space distance.",
  "three.clearMeasure": "Clear measurement",
  "three.section": "Section",
  "three.sectionAxis": "Section axis",
  "three.sectionPosition": "Section position",
  "three.resetSection": "Reset section",
  "three.exploded": "Exploded view",
  "three.resetExploded": "Reset exploded view",
  "three.hide": "Hide selection",
  "three.showAll": "Show all",
  "three.xray": "X-ray",
  "three.wireframe": "Wireframe",
  "three.perspective": "Perspective",
  "three.orthographic": "Orthographic",
  "three.isometric": "Isometric",
  "three.bottom": "Bottom",
  "three.fitProject": "Fit project",
  "three.fitSelection": "Fit selection",
  "three.resetCamera": "Reset camera",
  "three.properties": "Properties",
  "three.material": "Block material",
  "three.materialLegend": "Material legend",
  "three.validation": "Validation",
  "three.showIssues": "Show validation issues",
  "three.screenshot": "Screenshot",
  "three.screenshotUnavailable": "Screenshot export is not available in this browser.",
  "three.measurement": "Distance",
  "three.worldUnits": "World units",
  "three.noSelection": "Select a wall or opening to inspect it.",
  "three.hidden": "Hidden items are a temporary view preference.",
  "three.invalid": "This item has a validation issue.",
  "three.view": "3D view",
} as const;
type Key = keyof typeof en;

export const phase15Messages: Record<Language, Record<Key, string>> = {
  "en-GB": en,
  ku: {
    "three.select": "هەڵبژاردن", "three.measure": "پێوانە", "three.measureHint": "دوو خاڵ لەسەر مۆدێلەکە هەڵبژێرە بۆ پێوانەی دووری لە جیهانی ڕاستەقینە.", "three.clearMeasure": "سڕینەوەی پێوانە", "three.section": "بڕین", "three.sectionAxis": "تەوەری بڕین", "three.sectionPosition": "شوێنی بڕین", "three.resetSection": "ڕێکخستنەوەی بڕین", "three.exploded": "دیمەنی جیاکراو", "three.resetExploded": "ڕێکخستنەوەی دیمەنی جیاکراو", "three.hide": "شاردنەوەی هەڵبژاردە", "three.showAll": "پیشاندانی هەموو", "three.xray": "تیشکی ئێکس", "three.wireframe": "تۆڕی هێڵ", "three.perspective": "ڕوانگە", "three.orthographic": "ئۆرتۆگرافی", "three.isometric": "ئایزۆمەتریک", "three.bottom": "خوارەوە", "three.fitProject": "گونجاندنی پڕۆژە", "three.fitSelection": "گونجاندنی هەڵبژاردە", "three.resetCamera": "ڕێکخستنەوەی کامێرا", "three.properties": "تایبەتمەندییەکان", "three.material": "ماتریاڵی بلۆک", "three.materialLegend": "ڕێبەری ماتریاڵ", "three.validation": "پشکنین", "three.showIssues": "پیشاندانی کێشەکانی پشکنین", "three.screenshot": "وێنەی شاشە", "three.screenshotUnavailable": "هەناردەی وێنەی شاشە لەم وێبگەڕە بەردەست نییە.", "three.measurement": "دووری", "three.worldUnits": "یەکەکانی جیهان", "three.noSelection": "دیوارێک یان کراوەیەک هەڵبژێرە بۆ پشکنین.", "three.hidden": "بڕگە شاردراوەکان تەنها هەڵبژاردەیەکی کاتی دیمەنن.", "three.invalid": "ئەم بڕگەیە کێشەی پشکنینی هەیە.", "three.view": "دیمەنی 3D",
  },
  ar: {
    "three.select": "تحديد", "three.measure": "قياس", "three.measureHint": "حدد نقطتين على النموذج لقياس مسافة في الإحداثيات الحقيقية.", "three.clearMeasure": "مسح القياس", "three.section": "مقطع", "three.sectionAxis": "محور المقطع", "three.sectionPosition": "موضع المقطع", "three.resetSection": "إعادة ضبط المقطع", "three.exploded": "عرض تفكيكي", "three.resetExploded": "إعادة ضبط العرض التفكيكي", "three.hide": "إخفاء المحدد", "three.showAll": "إظهار الكل", "three.xray": "أشعة سينية", "three.wireframe": "هيكل سلكي", "three.perspective": "منظور", "three.orthographic": "متعامد", "three.isometric": "متساوي القياس", "three.bottom": "أسفل", "three.fitProject": "ملاءمة المشروع", "three.fitSelection": "ملاءمة المحدد", "three.resetCamera": "إعادة ضبط الكاميرا", "three.properties": "الخصائص", "three.material": "مادة البلوك", "three.materialLegend": "دليل المواد", "three.validation": "التحقق", "three.showIssues": "إظهار مشاكل التحقق", "three.screenshot": "لقطة شاشة", "three.screenshotUnavailable": "تصدير لقطة الشاشة غير متاح في هذا المتصفح.", "three.measurement": "المسافة", "three.worldUnits": "وحدات العالم", "three.noSelection": "حدد جداراً أو فتحة لفحصها.", "three.hidden": "العناصر المخفية تفضيل عرض مؤقت.", "three.invalid": "يوجد في هذا العنصر مشكلة تحقق.", "three.view": "عرض ثلاثي الأبعاد",
  },
};
