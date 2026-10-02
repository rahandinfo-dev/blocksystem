import type { Language } from "@/lib/i18n";

type Key =
  | "projects.dashboardDescription"
  | "projects.searchPlaceholder"
  | "projects.updated"
  | "projects.rooms"
  | "projects.actions"
  | "projects.emptyDashboardTitle"
  | "projects.emptyDashboardDescription"
  | "projects.noResults"
  | "projects.copySuffix";

const en: Record<Key, string> = {
  "projects.dashboardDescription": "Manage your projects and keep your work moving.",
  "projects.searchPlaceholder": "Search by project name...",
  "projects.updated": "Updated",
  "projects.rooms": "{count} rooms",
  "projects.actions": "Project actions",
  "projects.emptyDashboardTitle": "There are no projects yet",
  "projects.emptyDashboardDescription": "Create your first project and get started.",
  "projects.noResults": "No projects match your search.",
  "projects.copySuffix": "Copy",
};

const ku: Record<Key, string> = {
  "projects.dashboardDescription": "پڕۆژەکانت بەڕێوەببە و کارەکانت بەردەوام بکە.",
  "projects.searchPlaceholder": "گەڕان بە ناوی پڕۆژە...",
  "projects.updated": "نوێکرایەوە",
  "projects.rooms": "{count} ژوور",
  "projects.actions": "کردارەکانی پڕۆژە",
  "projects.emptyDashboardTitle": "هێشتا هیچ پڕۆژەیەکت نییە",
  "projects.emptyDashboardDescription": "یەکەم پڕۆژەت دروست بکە و دەست بە کار بکە.",
  "projects.noResults": "هیچ پڕۆژەیەک بۆ گەڕانەکەت نەدۆزرایەوە.",
  "projects.copySuffix": "کۆپی",
};

const ar: Record<Key, string> = {
  "projects.dashboardDescription": "أدر مشاريعك وواصل عملك.",
  "projects.searchPlaceholder": "البحث باسم المشروع...",
  "projects.updated": "آخر تحديث",
  "projects.rooms": "{count} غرف",
  "projects.actions": "إجراءات المشروع",
  "projects.emptyDashboardTitle": "لا توجد مشاريع بعد",
  "projects.emptyDashboardDescription": "أنشئ مشروعك الأول وابدأ العمل.",
  "projects.noResults": "لا توجد مشاريع مطابقة لبحثك.",
  "projects.copySuffix": "نسخة",
};

export const projectDashboardMessages: Record<Language, Record<Key, string>> = {
  "en-GB": en,
  ku,
  ar,
};
