import type { Language } from "./i18n";

const en = {
  "security.backup": "Backup and recovery",
  "security.downloadBackup": "Download backup",
  "security.restoreBackup": "Restore backup",
  "security.restoreWarning": "Restoring replaces saved projects in this browser. A recovery snapshot will be kept first.",
  "security.restoreConfirm": "Restore this validated backup? Current projects remain recoverable.",
  "security.restoreSuccess": "Backup restored safely.",
  "security.restoreError": "This backup is invalid or could not be restored.",
  "security.backupCreated": "Backup created",
};
const ku = {
  "security.backup": "پاڵپشت و گەڕاندنەوە",
  "security.downloadBackup": "داگرتنی پاڵپشت",
  "security.restoreBackup": "گەڕاندنەوەی پاڵپشت",
  "security.restoreWarning": "گەڕاندنەوە پڕۆژە پاشەکەوتکراوەکان لەم وێبگەڕەدا جێگۆڕ دەکات.",
  "security.restoreConfirm": "ئەم پاڵپشتە بگەڕێنرێتەوە؟ پڕۆژەکانی ئێستا دەتوانرێن بگەڕێنرێنەوە.",
  "security.restoreSuccess": "پاڵپشت بە سەلامەتی گەڕایەوە.",
  "security.restoreError": "ئەم پاڵپشتە دروست نییە یان نەکرا بگەڕێنرێتەوە.",
  "security.backupCreated": "پاڵپشت دروست کرا",
};
const ar = {
  "security.backup": "النسخ الاحتياطي والاسترداد",
  "security.downloadBackup": "تنزيل النسخة الاحتياطية",
  "security.restoreBackup": "استعادة النسخة الاحتياطية",
  "security.restoreWarning": "تؤدي الاستعادة إلى استبدال المشاريع المحفوظة في هذا المتصفح.",
  "security.restoreConfirm": "استعادة هذه النسخة الاحتياطية؟ تبقى المشاريع الحالية قابلة للاسترداد.",
  "security.restoreSuccess": "تمت استعادة النسخة الاحتياطية بأمان.",
  "security.restoreError": "هذه النسخة الاحتياطية غير صالحة أو تعذر استعادتها.",
  "security.backupCreated": "تم إنشاء النسخة الاحتياطية",
};

export const phase8Messages: Record<Language, Record<keyof typeof en, string>> = { "en-GB": en, ku, ar };
