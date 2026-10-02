import type { Language } from "@/lib/i18n";

type Key =
  | "geometry.duplicateWall"
  | "geometry.deleteWallConfirm"
  | "geometry.addDoor"
  | "geometry.addWindow"
  | "geometry.selectedWall"
  | "geometry.undo"
  | "geometry.redo";

export const geometryMessages: Record<Language, Record<Key, string>> = {
  "en-GB": {
    "geometry.duplicateWall": "Duplicate wall",
    "geometry.deleteWallConfirm": "Delete this wall and its openings?",
    "geometry.addDoor": "Add door",
    "geometry.addWindow": "Add window",
    "geometry.selectedWall": "Selected wall",
    "geometry.undo": "Undo",
    "geometry.redo": "Redo",
  },
  ku: {
    "geometry.duplicateWall": "دووبارەکردنەوەی دیوار",
    "geometry.deleteWallConfirm": "ئەم دیوارە و کراوەکانی بسڕدرێنەوە؟",
    "geometry.addDoor": "زیادکردنی دەرگا",
    "geometry.addWindow": "زیادکردنی پەنجەرە",
    "geometry.selectedWall": "دیواری هەڵبژێردراو",
    "geometry.undo": "گەڕاندنەوە",
    "geometry.redo": "دووبارەکردنەوە",
  },
  ar: {
    "geometry.duplicateWall": "نسخ الجدار",
    "geometry.deleteWallConfirm": "حذف هذا الجدار وفتحاتِه؟",
    "geometry.addDoor": "إضافة باب",
    "geometry.addWindow": "إضافة نافذة",
    "geometry.selectedWall": "الجدار المحدد",
    "geometry.undo": "تراجع",
    "geometry.redo": "إعادة",
  },
};
