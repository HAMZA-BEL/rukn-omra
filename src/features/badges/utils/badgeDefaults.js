export const BADGE_PHOTO_BUCKET = "pilgrim-photos";
export const BADGE_TEMPLATE_BUCKET = "badge-templates";

export const BADGE_PHOTO_MAX_DIMENSION = 720;
export const BADGE_PHOTO_QUALITY = 0.82;
export const BADGE_PHOTO_MAX_BYTES = 3 * 1024 * 1024;

export const buildBadgePhotoPath = ({ agencyId, clientId, extension = "webp" } = {}) => {
  const safeAgencyId = String(agencyId || "").trim();
  const safeClientId = String(clientId || "").trim();
  if (!safeAgencyId || !safeClientId) return "";
  return `agencies/${safeAgencyId}/pilgrims/${safeClientId}/photo.${extension}`;
};

export const buildBadgeTemplatePath = ({ agencyId, templateId, extension = "webp" } = {}) => {
  const safeAgencyId = String(agencyId || "").trim();
  const safeTemplateId = String(templateId || "").trim();
  if (!safeAgencyId || !safeTemplateId) return "";
  return `agencies/${safeAgencyId}/badge-templates/${safeTemplateId}/front.${extension}`;
};

export const getBadgeContactDefaults = (program = {}) => {
  const safeProgram = program || {};

  return {
    guidePhone: safeProgram.guidePhone || safeProgram.badgeGuidePhone || "",
    saudiPhone1: safeProgram.saudiPhone1 || safeProgram.badgeSaudiPhone1 || "",
    saudiPhone2: safeProgram.saudiPhone2 || safeProgram.badgeSaudiPhone2 || "",
    badgeNote: safeProgram.badgeNote || "",
  };
};

export const DEFAULT_BADGE_SIZE = {
  widthMm: 90,
  heightMm: 140,
};

export const BADGE_FIELD_DEFINITIONS = [
  { key: "photo", labelAr: "الصورة", type: "image", wPct: 28, hPct: 28, fit: "cover" },
  { key: "fullName", labelAr: "الاسم الكامل", type: "text", wPct: 62, hPct: 9, fontSize: 16, fontWeight: 800, align: "center", color: "#111111", maxLines: 2 },
  { key: "passportNumber", labelAr: "رقم جواز السفر", type: "text", wPct: 52, hPct: 7, fontSize: 12, fontWeight: 700, align: "center", color: "#111111", maxLines: 1 },
  { key: "primaryPhone", labelAr: "رقم المؤطر / الرقم السعودي", type: "text", wPct: 66, hPct: 7, fontSize: 11, fontWeight: 700, align: "center", color: "#111111", maxLines: 1 },
  { key: "extraPhone", labelAr: "رقم سعودي إضافي", type: "text", wPct: 62, hPct: 6, fontSize: 10, fontWeight: 700, align: "center", color: "#111111", maxLines: 1, repeatable: true },
  { key: "programName", labelAr: "اسم البرنامج", type: "text", wPct: 62, hPct: 6, fontSize: 10, fontWeight: 700, align: "center", color: "#111111", maxLines: 1 },
  { key: "badgeNote", labelAr: "ملاحظة الشارة", type: "text", wPct: 70, hPct: 6, fontSize: 9, fontWeight: 600, align: "center", color: "#111111", maxLines: 2 },
  { key: "agencyName", labelAr: "اسم الوكالة", type: "text", wPct: 62, hPct: 6, fontSize: 10, fontWeight: 700, align: "center", color: "#111111", maxLines: 1 },
  { key: "fileNumber", labelAr: "رقم الملف", type: "text", wPct: 36, hPct: 6, fontSize: 10, fontWeight: 700, align: "center", color: "#111111", maxLines: 1 },
];
