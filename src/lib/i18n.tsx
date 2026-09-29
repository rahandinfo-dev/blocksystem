"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { previewMessages } from "@/lib/preview-messages";

export const languages = ["ku", "ar", "en-GB"] as const;
export type Language = (typeof languages)[number];

export const languageDetails: Record<Language, { label: string; direction: "rtl" | "ltr" }> = {
  ku: { label: "کوردی", direction: "rtl" },
  ar: { label: "عربي", direction: "rtl" },
  "en-GB": { label: "English (United Kingdom)", direction: "ltr" },
};

type MessageValues = Record<string, string | number>;
type Messages = Record<string, string>;

const en: Messages = {
  "app.name": "Rek Brand Block System",
  "app.description": "Fast, accurate block and construction cost calculations.",
  "home.eyebrow": "For fast, accurate construction calculations",
  "home.title": "Rek Brand Block System",
  "home.description": "Calculate block quantities and construction costs quickly and accurately.",
  "home.footer": "Made to make engineers' work easier by RekApps developer Rahand Jaf.",
  "common.close": "Close",
  "common.menu": "Menu",
  "common.add": "Add",
  "common.remove": "Remove",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.optional": "optional",
  "common.name": "Name",
  "common.length": "Length",
  "common.width": "Width",
  "common.height": "Height",
  "common.quantity": "Quantity",
  "common.wall": "Wall",
  "common.area": "Area",
  "common.currency": "Currency",
  "common.date": "Date",
  "common.source": "Source",
  "common.loading": "Loading…",
  "common.notAvailable": "Not available",
  "navigation.home": "Home",
  "navigation.projects": "Projects",
  "navigation.preview": "Room preview",
  "navigation.help": "Help",
  "navigation.aboutApp": "About the app",
  "navigation.aboutCompany": "About us",
  "navigation.contact": "Contact",
  "navigation.language": "Language",
  "mode.heading": "Calculation mode",
  "mode.rooms": "Room calculation",
  "mode.walls": "Wall calculation",
  "projects.heading": "Projects",
  "projects.description": "Automatic saving works on this device.",
  "projects.new": "New project",
  "projects.save": "Save",
  "projects.export": "Export",
  "projects.import": "Import",
  "projects.search": "Search by project name",
  "projects.sortUpdated": "Recently updated",
  "projects.sortCreated": "Date created",
  "projects.sortName": "Name",
  "projects.empty": "There are no saved projects.",
  "projects.open": "Open",
  "projects.rename": "Rename",
  "projects.duplicate": "Duplicate",
  "projects.confirmNew": "Create a new project?",
  "projects.confirmDelete": "Delete this project?",
  "projects.renamePrompt": "New project name",
  "projects.saveFailed": "Project could not be saved.",
  "projects.importFailed": "The project file could not be imported.",
  "projectInfo.heading": "Project information",
  "projectInfo.projectName": "Project name",
  "projectInfo.owner": "Project owner",
  "projectInfo.location": "Location",
  "projectInfo.notes": "Notes",
  "rooms.heading": "Rooms",
  "rooms.description": "Set dimensions and openings for each room.",
  "rooms.add": "Add room",
  "rooms.name": "Room name",
  "rooms.delete": "Delete room",
  "walls.heading": "Walls",
  "walls.description": "Add each wall separately.",
  "walls.add": "Add wall",
  "walls.name": "Wall name",
  "walls.delete": "Delete wall",
  "walls.individual": "Individual room walls",
  "walls.advancedDescription": "In advanced mode, walls are created from the room dimensions. Only enabled walls are included in the calculation.",
  "walls.include": "Include in calculation",
  "walls.type": "Wall type",
  "walls.interior": "Interior wall",
  "walls.exterior": "Exterior wall",
  "openings.door": "Doors",
  "openings.window": "Windows",
  "openings.other": "Other openings",
  "openings.deduction": "Structural deductions",
  "openings.addDoor": "Add door",
  "openings.addWindow": "Add window",
  "openings.addOther": "Add opening",
  "openings.addDeduction": "Add deduction",
  "openings.none": "No {label} have been added.",
  "openings.position": "Horizontal position",
  "openings.sillHeight": "Sill height",
  "openings.positionHelp": "Position is measured from the start of the wall to the left edge. Collisions are resolved automatically.",
  "openings.doorGround": "Doors are placed on the floor automatically.",
  "blocks.heading": "Block library",
  "blocks.description": "Block quantity is calculated from the face (length × height), not thickness.",
  "blocks.face": "Face",
  "blocks.thickness": "Thickness",
  "blocks.custom": "Custom dimensions",
  "blocks.customHint": "Enter your own dimensions",
  "blocks.customHeading": "Custom block dimensions",
  "options.heading": "Calculation settings",
  "options.waste": "Waste allowance",
  "options.customWaste": "Custom percentage",
  "options.cost": "Prices and costs",
  "options.unitPrice": "Price per block",
  "options.exchange": "Manual exchange rate",
  "options.exchangeHint": "No rate is fetched automatically.",
  "options.usdIqd": "1 USD in IQD",
  "options.extras": "Additional costs",
  "options.transport": "Transport cost",
  "options.labour": "Labour cost",
  "options.mortarCost": "Mortar cost",
  "options.otherCost": "Other cost",
  "options.mortar": "Mortar and joints",
  "options.estimateMortar": "Estimate mortar",
  "options.mortarConsumption": "Mortar consumption (m³/m²)",
  "options.mortarJoint": "Mortar joint",
  "options.jointWidth": "Joint width",
  "converter.heading": "Unit conversion",
  "converter.value": "Value",
  "converter.length": "Length",
  "converter.area": "Area",
  "converter.volume": "Volume",
  "results.heading": "Calculation result",
  "results.empty": "Fill in the details and calculate.",
  "results.areaUnit": "Area unit",
  "results.volumeUnit": "Volume unit",
  "results.gross": "Gross wall area",
  "results.openings": "Door and window area",
  "results.deductions": "Structural deductions",
  "results.net": "Net wall area",
  "results.required": "Required blocks",
  "results.waste": "Extra blocks ({value})",
  "results.recommended": "Recommended blocks",
  "results.cost": "Cost",
  "results.totalCost": "Total cost",
  "breakdown.heading": "Calculation breakdown",
  "breakdown.blockFace": "Block face area",
  "breakdown.rounded": "rounded up",
  "breakdown.unitDetails": "Section details",
  "preview.heading": "Room preview",
  "preview.title": "3D room preview",
  "preview.description": "Open the complete room view. Pan, zoom and select walls or openings.",
  "preview.open": "Open 3D preview",
  "preview.back": "Back",
  "preview.selectRoom": "Select room",
  "preview.controls": "3D controls",
  "preview.zoomOut": "Zoom out",
  "preview.zoomIn": "Zoom in",
  "preview.webgl": "WebGL is not available; calculations remain available.",
  "preview.openings": "Openings",
  "preview.grossArea": "Gross area",
  "preview.openingArea": "Opening area",
  "preview.netArea": "Net area",
  "validation.number": "Please enter a valid number.",
  "validation.value": "Please enter a valid value.",
  "errors.invalidRoom": "Enter a valid room length, width and height.",
  "errors.invalidWall": "Enter a valid wall length and height.",
  "errors.invalidOpening": "Opening dimensions and quantity are invalid.",
  "errors.openingsTooLarge": "Opening area is greater than the wall area.",
  "errors.invalidBlock": "Block dimensions are invalid.",
  "errors.invalidWaste": "Waste percentage is invalid.",
  "errors.invalidPrice": "Enter a valid price.",
  "errors.invalidMortar": "Mortar value is invalid.",
  "export.pdfFailed": "PDF could not be created.",
  "about.title": "About the app",
  "about.description": "A professional tool for accurately and quickly calculating room and wall construction requirements.",
  "company.title": "About us",
  "contact.title": "Contact RekApps",
  "help.title": "Help and guidance",
};

// The interface defaults to Kurdish. Arabic and English are complete for shared
// application controls; feature-specific text is added through the same keys.
const ku: Messages = {
  ...en,
  "app.name": "سیستەمی بلۆکی براندی ڕێک", "app.description": "حیسابکردنی ژمارەی بلۆک و تێچووی بیناسازی بە شێوەی خێرا و ورد",
  "home.eyebrow": "بۆ حیسابکردنی خێرا و وردی بیناسازی", "home.title": "سیستەمی بلۆکی براندی ڕێک", "home.description": "حیسابکردنی ژمارەی بلۆک و تێچووی بیناسازی بە شێوەی خێرا و ورد", "home.footer": "درووستکراوە بۆ کار ئاسانی ئەندازیاران، لەلایەن ڕەهەند جاف گەشەپێدەری RekApps.",
  "common.close": "داخستن", "common.menu": "مێنوو", "common.add": "زیادکردن", "common.remove": "سڕینەوە", "common.delete": "سڕینەوە", "common.edit": "دەستکاری", "common.save": "پاشەکەوتکردن", "common.cancel": "هەڵوەشاندنەوە", "common.optional": "ئارەزوومەندانە", "common.name": "ناو", "common.length": "درێژی", "common.width": "پانی", "common.height": "بەرزی", "common.quantity": "ژمارە", "common.wall": "دیوار", "common.area": "ڕووبەر", "common.currency": "دراو", "common.date": "بەروار", "common.source": "سەرچاوە", "common.loading": "بارکردن…", "common.notAvailable": "بەردەست نییە",
  "navigation.home": "سەرەکی", "navigation.projects": "پڕۆژەکان", "navigation.preview": "پێشبینینی ژوور", "navigation.help": "یارمەتی", "navigation.aboutApp": "زانیاری دەربارەی ئەپ", "navigation.aboutCompany": "دەربارەی ئێمە", "navigation.contact": "پەیوەندی", "navigation.language": "زمان",
  "mode.heading": "شێوازی حیساب", "mode.rooms": "حیسابی ژوور", "mode.walls": "حیسابی دیوار",
  "projects.heading": "پڕۆژەکان", "projects.description": "پاشەکەوتی خۆکار لەسەر ئەم ئامێرە کار دەکات.", "projects.new": "پڕۆژەی نوێ", "projects.save": "پاشەکەوتکردن", "projects.export": "هەناردەکردن", "projects.import": "هاوردەکردن", "projects.search": "گەڕان بە ناوی پڕۆژە", "projects.sortUpdated": "نوێترین نوێکردنەوە", "projects.sortCreated": "بەرواری دروستکردن", "projects.sortName": "ناو", "projects.empty": "هیچ پڕۆژەیەک نییە.", "projects.open": "کردنەوە", "projects.rename": "ناوگۆڕین", "projects.duplicate": "کۆپیکردن", "projects.confirmNew": "پڕۆژەی نوێ دروست بکرێت؟", "projects.confirmDelete": "پڕۆژەکە بسڕدرێتەوە؟", "projects.renamePrompt": "ناوی نوێی پڕۆژە", "projects.saveFailed": "پاشەکەوتکردن سەرکەوتوو نەبوو.", "projects.importFailed": "فایلی پڕۆژەکە نەتوانرا هاوردە بکرێت.",
  "projectInfo.heading": "زانیاری پڕۆژە", "projectInfo.projectName": "ناوی پڕۆژە", "projectInfo.owner": "ناوی خاوەن پڕۆژە", "projectInfo.location": "شوێن", "projectInfo.notes": "تێبینی",
  "rooms.heading": "ژوورەکان", "rooms.description": "بۆ هەر ژوورێک قەبارە و کراوەکان دیاری بکە.", "rooms.add": "زیادکردنی ژوور", "rooms.name": "ناوی ژوور", "rooms.delete": "سڕینەوەی ژوور",
  "walls.heading": "دیوارەکان", "walls.description": "هەر دیوارێک بە جیاوازی زیاد بکە.", "walls.add": "زیادکردنی دیوار", "walls.name": "ناوی دیوار", "walls.delete": "سڕینەوەی دیوار", "walls.individual": "دیوارە تاکەکانی ژوور", "walls.advancedDescription": "لە دۆخی پێشکەوتوودا هەر دیوارێک بە پێی درێژی و پانی ژوور خۆکارانە دروست دەبێت. تەنها دیوارە بەکارخراوەکان حیساب دەکرێن.", "walls.include": "لە حیسابدا بێت", "walls.type": "جۆری دیوار", "walls.interior": "دیواری ناوخۆ", "walls.exterior": "دیواری دەرەوە",
  "openings.door": "دەرگاکان", "openings.window": "پەنجەرەکان", "openings.other": "کراوەی تر", "openings.deduction": "کەمکردنەوەی سازەیی", "openings.addDoor": "زیادکردنی دەرگا", "openings.addWindow": "زیادکردنی پەنجەرە", "openings.addOther": "زیادکردنی کراوە", "openings.addDeduction": "زیادکردنی کەمکردنەوە", "openings.none": "هیچ {label} زیاد نەکراوە.", "openings.position": "شوێنی ئاسۆیی", "openings.sillHeight": "بەرزی سەرپەنجەرە", "openings.positionHelp": "شوێن: دووری لە سەرەتای دیوار بۆ لێواری چەپ. شوێنی بەتاڵ بە شێوەی خۆکار ڕێکدەخرێت.", "openings.doorGround": "دەرگا خۆکارانە لەسەر زەوی دادەنرێت.",
  "blocks.heading": "کتێبخانەی بلۆک", "blocks.description": "ژمارەی بلۆک بە ڕووکار (درێژی × بەرزی) حیساب دەکرێت، نەک بە پانی.", "blocks.face": "ڕووکار", "blocks.thickness": "پانی", "blocks.custom": "قەبارەی تایبەت", "blocks.customHint": "قەبارەی خۆت بنووسە", "blocks.customHeading": "قەبارەی بلۆکی تایبەت",
  "options.heading": "ڕێکخستنەکانی حیساب", "options.waste": "ڕێژەی زیادە بۆ شکان و زیان", "options.customWaste": "ڕێژەی تایبەت", "options.cost": "پارە و نرخ", "options.unitPrice": "نرخی یەک بلۆک", "options.exchange": "ڕێژەی گۆڕینی دەستی", "options.exchangeHint": "هیچ نرخێک بە خۆکار وەردەناگیرێت.", "options.usdIqd": "١ USD بە دینار", "options.extras": "نرخە زیادەکان", "options.transport": "نرخی گواستنەوە", "options.labour": "نرخی کرێکار", "options.mortarCost": "نرخی مۆرتەر", "options.otherCost": "نرخی تر", "options.mortar": "مۆرتەر و پەیوەندی", "options.estimateMortar": "خەمڵاندنی مۆرتەر", "options.mortarConsumption": "بەکارهێنانی مۆرتەر (m³/m²)", "options.mortarJoint": "پەیوەندی مۆرتەر", "options.jointWidth": "پانی پەیوەندی", "converter.heading": "گۆڕینی یەکەکان", "converter.value": "بڕ", "converter.length": "درێژی", "converter.area": "ڕووبەر", "converter.volume": "قەبارە",
  "results.heading": "ئەنجامی حیساب", "results.empty": "زانیارییەکان پڕ بکەرەوە و حیساب بکە.", "results.areaUnit": "یەکەی ڕووبەر", "results.volumeUnit": "یەکەی قەبارە", "results.gross": "ڕووبەری گشتی دیوارەکان", "results.openings": "ڕووبەری دەرگا و پەنجەرە", "results.deductions": "کەمکردنەوەی سازەیی", "results.net": "ڕووبەری پاکی دیوار", "results.required": "ژمارەی بلۆکی پێویست", "results.waste": "بلۆکی زیادە ({value})", "results.recommended": "کۆی بلۆکی پێشنیارکراو", "results.cost": "تێچوو", "results.totalCost": "کۆی تێچوو",
  "breakdown.heading": "وردەکاری حیساب", "breakdown.blockFace": "ڕووبەری ڕووکارى بلۆک", "breakdown.rounded": "بەرەو سەرەوە ڕاوکراوەتەوە", "breakdown.unitDetails": "وردەکاری هەر بەش", "preview.heading": "پێشبینینی ژوور", "preview.title": "پێشبینینی ژوور 3D", "preview.description": "دیمەنی تەواوی ژوورەکەت بکەرەوە؛ سوڕان، زوووم و هەڵبژاردنی دیوار و کراوەکان بەردەستن.", "preview.open": "کردنەوەی پێشبینینی 3D", "preview.back": "گەڕانەوە", "preview.selectRoom": "هەڵبژاردنی ژوور", "preview.controls": "کۆنترۆڵی 3D", "preview.zoomOut": "کەمکردنەوەی زوووم", "preview.zoomIn": "زیادکردنی زوووم", "preview.webgl": "WebGL بەردەست نییە؛ حیسابکردن بەردەوامە.", "preview.openings": "کراوەکان", "preview.grossArea": "ڕووبەری گشتی", "preview.openingArea": "ڕووبەری کراوەکان", "preview.netArea": "ڕووبەری پاک",
  "validation.number": "تکایە نرخێکی دروست بنووسە.", "validation.value": "تکایە بەهایەکی دروست بنووسە.", "errors.invalidRoom": "تکایە درێژی، پانی و بەرزی ژوور بنووسە.", "errors.invalidWall": "تکایە درێژی و بەرزی دیوار بنووسە.", "errors.invalidOpening": "قەبارە و ژمارەی کراوەکان دروست نییە.", "errors.openingsTooLarge": "ڕووبەری کراوەکان لە دیوار گەورەترە.", "errors.invalidBlock": "قەبارەی بلۆک دروست نییە.", "errors.invalidWaste": "ڕێژەی زیادە دروست نییە.", "errors.invalidPrice": "نرخێکی دروست بنووسە.", "errors.invalidMortar": "نرخی مۆرتەر دروست نییە.", "export.pdfFailed": "درووستکردنی فایلی PDF سەرکەوتوو نەبوو.", "about.title": "زانیاری دەربارەی ئەپ", "about.description": "ئامرازێکی پیشەیی بۆ حسابکردنی پێداویستییەکانی دروستکردنی ژوور و دیوار بە وردی و خێرایی.", "company.title": "دەربارەی ئێمە", "contact.title": "پەیوەندی بە RekApps", "help.title": "یارمەتی و ڕێنمایی",
};

const ar: Messages = {
  ...en,
  "app.name": "نظام بلوك ريك", "app.description": "حساب كميات البلوك وتكاليف البناء بسرعة ودقة.",
  "home.eyebrow": "لحسابات البناء السريعة والدقيقة", "home.title": "نظام بلوك ريك", "home.description": "احسب كميات البلوك وتكاليف البناء بسرعة ودقة.", "home.footer": "صُمم لتسهيل عمل المهندسين بواسطة مطور RekApps، رهند جاف.",
  "common.close": "إغلاق", "common.menu": "القائمة", "common.add": "إضافة", "common.remove": "إزالة", "common.delete": "حذف", "common.edit": "تعديل", "common.save": "حفظ", "common.cancel": "إلغاء", "common.optional": "اختياري", "common.name": "الاسم", "common.length": "الطول", "common.width": "العرض", "common.height": "الارتفاع", "common.quantity": "الكمية", "common.wall": "الجدار", "common.area": "المساحة", "common.currency": "العملة", "common.date": "التاريخ", "common.source": "المصدر", "common.loading": "جارٍ التحميل…", "common.notAvailable": "غير متاح",
  "navigation.home": "الرئيسية", "navigation.projects": "المشاريع", "navigation.preview": "معاينة الغرفة", "navigation.help": "المساعدة", "navigation.aboutApp": "حول التطبيق", "navigation.aboutCompany": "من نحن", "navigation.contact": "اتصل بنا", "navigation.language": "اللغة",
  "mode.heading": "وضع الحساب", "mode.rooms": "حساب الغرفة", "mode.walls": "حساب الجدار",
  "projects.heading": "المشاريع", "projects.description": "يعمل الحفظ التلقائي على هذا الجهاز.", "projects.new": "مشروع جديد", "projects.save": "حفظ", "projects.export": "تصدير", "projects.import": "استيراد", "projects.search": "البحث باسم المشروع", "projects.sortUpdated": "آخر تحديث", "projects.sortCreated": "تاريخ الإنشاء", "projects.sortName": "الاسم", "projects.empty": "لا توجد مشاريع محفوظة.", "projects.open": "فتح", "projects.rename": "إعادة تسمية", "projects.duplicate": "نسخ", "projects.confirmNew": "إنشاء مشروع جديد؟", "projects.confirmDelete": "حذف هذا المشروع؟", "projects.renamePrompt": "اسم المشروع الجديد", "projects.saveFailed": "تعذر حفظ المشروع.", "projects.importFailed": "تعذر استيراد ملف المشروع.",
  "projectInfo.heading": "معلومات المشروع", "projectInfo.projectName": "اسم المشروع", "projectInfo.owner": "مالك المشروع", "projectInfo.location": "الموقع", "projectInfo.notes": "ملاحظات",
  "rooms.heading": "الغرف", "rooms.description": "حدّد الأبعاد والفتحات لكل غرفة.", "rooms.add": "إضافة غرفة", "rooms.name": "اسم الغرفة", "rooms.delete": "حذف الغرفة",
  "walls.heading": "الجدران", "walls.description": "أضف كل جدار بشكل منفصل.", "walls.add": "إضافة جدار", "walls.name": "اسم الجدار", "walls.delete": "حذف الجدار", "walls.individual": "جدران الغرفة المنفردة", "walls.advancedDescription": "في الوضع المتقدم، تُنشأ الجدران تلقائياً من أبعاد الغرفة. تُحسب الجدران المفعّلة فقط.", "walls.include": "تضمين في الحساب", "walls.type": "نوع الجدار", "walls.interior": "جدار داخلي", "walls.exterior": "جدار خارجي",
  "openings.door": "الأبواب", "openings.window": "النوافذ", "openings.other": "فتحات أخرى", "openings.deduction": "خصومات إنشائية", "openings.addDoor": "إضافة باب", "openings.addWindow": "إضافة نافذة", "openings.addOther": "إضافة فتحة", "openings.addDeduction": "إضافة خصم", "openings.none": "لم تتم إضافة {label}.", "openings.position": "الموضع الأفقي", "openings.sillHeight": "ارتفاع عتبة النافذة", "openings.positionHelp": "يُقاس الموضع من بداية الجدار إلى الحافة اليسرى. تُحل التداخلات تلقائياً.", "openings.doorGround": "توضع الأبواب على الأرض تلقائياً.",
  "blocks.heading": "مكتبة البلوك", "blocks.description": "تُحسب كمية البلوك من الواجهة (الطول × الارتفاع)، وليس من السمك.", "blocks.face": "الواجهة", "blocks.thickness": "السمك", "blocks.custom": "أبعاد مخصصة", "blocks.customHint": "أدخل أبعادك", "blocks.customHeading": "أبعاد بلوك مخصصة",
  "options.heading": "إعدادات الحساب", "options.waste": "بدل الهدر والكسر", "options.customWaste": "نسبة مخصصة", "options.cost": "الأسعار والتكاليف", "options.unitPrice": "سعر البلوك الواحد", "options.exchange": "سعر صرف يدوي", "options.exchangeHint": "لا يتم جلب أي سعر تلقائياً.", "options.usdIqd": "1 دولار أمريكي بالدينار العراقي", "options.extras": "تكاليف إضافية", "options.transport": "تكلفة النقل", "options.labour": "تكلفة العمالة", "options.mortarCost": "تكلفة المونة", "options.otherCost": "تكلفة أخرى", "options.mortar": "المونة والفواصل", "options.estimateMortar": "تقدير المونة", "options.mortarConsumption": "استهلاك المونة (م³/م²)", "options.mortarJoint": "فاصل المونة", "options.jointWidth": "عرض الفاصل", "converter.heading": "تحويل الوحدات", "converter.value": "القيمة", "converter.length": "الطول", "converter.area": "المساحة", "converter.volume": "الحجم",
  "results.heading": "نتيجة الحساب", "results.empty": "أدخل التفاصيل ثم احسب.", "results.areaUnit": "وحدة المساحة", "results.volumeUnit": "وحدة الحجم", "results.gross": "إجمالي مساحة الجدران", "results.openings": "مساحة الأبواب والنوافذ", "results.deductions": "الخصومات الإنشائية", "results.net": "صافي مساحة الجدران", "results.required": "البلوك المطلوب", "results.waste": "بلوك إضافي ({value})", "results.recommended": "إجمالي البلوك المقترح", "results.cost": "التكلفة", "results.totalCost": "إجمالي التكلفة",
  "breakdown.heading": "تفاصيل الحساب", "breakdown.blockFace": "مساحة واجهة البلوك", "breakdown.rounded": "مقرب للأعلى", "breakdown.unitDetails": "تفاصيل القسم", "preview.heading": "معاينة الغرفة", "preview.title": "معاينة الغرفة ثلاثية الأبعاد", "preview.description": "افتح العرض الكامل للغرفة. حرّك، كبّر واختر الجدران أو الفتحات.", "preview.open": "فتح المعاينة ثلاثية الأبعاد", "preview.back": "رجوع", "preview.selectRoom": "اختر الغرفة", "preview.controls": "عناصر تحكم ثلاثية الأبعاد", "preview.zoomOut": "تصغير", "preview.zoomIn": "تكبير", "preview.webgl": "WebGL غير متاح؛ الحسابات ما زالت متاحة.", "preview.openings": "الفتحات", "preview.grossArea": "المساحة الإجمالية", "preview.openingArea": "مساحة الفتحات", "preview.netArea": "المساحة الصافية",
  "validation.number": "يرجى إدخال رقم صالح.", "validation.value": "يرجى إدخال قيمة صالحة.", "errors.invalidRoom": "أدخل طول الغرفة وعرضها وارتفاعها بشكل صحيح.", "errors.invalidWall": "أدخل طول الجدار وارتفاعه بشكل صحيح.", "errors.invalidOpening": "أبعاد الفتحات أو كميتها غير صحيحة.", "errors.openingsTooLarge": "مساحة الفتحات أكبر من مساحة الجدار.", "errors.invalidBlock": "أبعاد البلوك غير صحيحة.", "errors.invalidWaste": "نسبة الهدر غير صحيحة.", "errors.invalidPrice": "أدخل سعراً صالحاً.", "errors.invalidMortar": "قيمة المونة غير صحيحة.", "export.pdfFailed": "تعذر إنشاء ملف PDF.", "about.title": "حول التطبيق", "about.description": "أداة احترافية لحساب متطلبات بناء الغرف والجدران بسرعة ودقة.", "company.title": "من نحن", "contact.title": "تواصل مع RekApps", "help.title": "المساعدة والإرشاد",
};

const dictionaries: Record<Language, Messages> = {
  ku: { ...ku, ...previewMessages.ku },
  ar: { ...ar, ...previewMessages.ar },
  "en-GB": { ...en, ...previewMessages["en-GB"] },
};

function interpolate(message: string, values?: MessageValues) {
  if (!values) return message;
  return message.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

type I18nContextValue = {
  language: Language;
  direction: "rtl" | "ltr";
  setLanguage: (language: Language) => void;
  t: (key: string, values?: MessageValues) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);
const storageKey = "blocksystem:language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ku");
  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    const timer = window.setTimeout(() => {
      if (saved && languages.includes(saved as Language)) setLanguageState(saved as Language);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const { direction } = languageDetails[language];
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    document.documentElement.dataset.language = language;
    document.title = dictionaries[language]["app.name"];
  }, [language]);
  const setLanguage = useCallback((next: Language) => {
    window.localStorage.setItem(storageKey, next);
    setLanguageState(next);
  }, []);
  const value = useMemo<I18nContextValue>(() => ({
    language,
    direction: languageDetails[language].direction,
    setLanguage,
    t: (key, values) => interpolate(dictionaries[language][key] ?? en[key] ?? key, values),
    formatNumber: (number, options) => new Intl.NumberFormat(language, options).format(number),
    formatDate: (date, options) => new Intl.DateTimeFormat(language, options).format(new Date(date)),
  }), [language, setLanguage]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside LanguageProvider");
  return context;
}
