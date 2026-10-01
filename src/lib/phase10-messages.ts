import type { Language } from "./i18n";

const en = { "reliability.featureUnavailable": "This feature is temporarily unavailable.", "reliability.reload3d": "Reload 3D preview" };
const ku = { "reliability.featureUnavailable": "ئەم تایبەتمەندییە کاتیانە بەردەست نییە.", "reliability.reload3d": "پێشبینینی 3D دووبارە بار بکە" };
const ar = { "reliability.featureUnavailable": "هذه الميزة غير متاحة مؤقتاً.", "reliability.reload3d": "إعادة تحميل المعاينة ثلاثية الأبعاد" };

export const phase10Messages: Record<Language, Record<keyof typeof en, string>> = { "en-GB": en, ku, ar };
