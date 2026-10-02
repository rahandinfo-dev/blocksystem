import type { Language } from "@/lib/i18n";

type Key = "share.action" | "share.blocks" | "share.netArea" | "share.mortar" | "share.total" | "share.measurement" | "share.shared" | "share.copied" | "share.failed";

export const releaseMessages: Record<Language, Record<Key, string>> = {
  "en-GB": { "share.action": "Share result", "share.blocks": "Required blocks", "share.netArea": "Net wall area", "share.mortar": "Estimated mortar", "share.total": "Estimated total", "share.measurement": "Measurement", "share.shared": "Shared", "share.copied": "Summary copied", "share.failed": "Unable to share right now." },
  ku: { "share.action": "هاوبەشکردنی ئەنجام", "share.blocks": "کۆی بلۆکی پێویست", "share.netArea": "ڕووبەری پاکی دیوار", "share.mortar": "مۆرتەری خەمڵێنراو", "share.total": "کۆی خەمڵێنراوی تێچوو", "share.measurement": "سیستەمی پێوانە", "share.shared": "هاوبەشکرا", "share.copied": "کورتەی ئەنجام کۆپی کرا", "share.failed": "ئێستا هاوبەشکردن نەکرا." },
  ar: { "share.action": "مشاركة النتيجة", "share.blocks": "البلوك المطلوب", "share.netArea": "صافي مساحة الجدار", "share.mortar": "تقدير المونة", "share.total": "الإجمالي التقديري", "share.measurement": "نظام القياس", "share.shared": "تمت المشاركة", "share.copied": "تم نسخ الملخص", "share.failed": "تعذرت المشاركة الآن." },
};
