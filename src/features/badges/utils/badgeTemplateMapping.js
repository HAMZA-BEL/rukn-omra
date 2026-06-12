import { normalizeBadgeLayout } from "./badgeLayout";

export const normalizeBadgeNumber = (value, fallback = 0) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const normalized = value
      .trim()
      .replace(/\s+/g, "")
      .replace(/٫/g, ".")
      .replace(/,/g, ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const badgePhonesFromProgram = (program = {}) => {
  const safeProgram = program || {};

  return [
    safeProgram.guidePhone || safeProgram.badgeGuidePhone,
    safeProgram.saudiPhone1 || safeProgram.badgeSaudiPhone1,
    safeProgram.saudiPhone2 || safeProgram.badgeSaudiPhone2,
  ]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
};
export const programFieldsFromBadgePhones = (phones = []) => {
  const clean = (Array.isArray(phones) ? phones : [])
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .slice(0, 3);
  return {
    guidePhone: clean[0] || "",
    saudiPhone1: clean[1] || "",
    saudiPhone2: clean[2] || "",
  };
};

export const normalizeBadgeTemplate = (template = {}) => ({
  id: template.id || "",
  name: template.name || "Badge template",
  description: template.description || "",
  templatePath: template.templatePath || template.template_path || "",
  thumbnailPath: template.thumbnailPath || template.thumbnail_path || "",
  widthMm: normalizeBadgeNumber(template.widthMm ?? template.width_mm, 90) || 90,
  heightMm: normalizeBadgeNumber(template.heightMm ?? template.height_mm, 140) || 140,
  layout: normalizeBadgeLayout(template.layout && typeof template.layout === "object" ? template.layout : {}),
  isDefault: Boolean(template.isDefault ?? template.is_default),
  createdAt: template.createdAt || template.created_at || "",
  updatedAt: template.updatedAt || template.updated_at || "",
});

export const toBadgeTemplatePayload = (template = {}) => {
  const normalized = normalizeBadgeTemplate(template);
  return {
    ...normalized,
    name: normalized.name.trim() || "Badge template",
    description: normalized.description.trim(),
    templatePath: normalized.templatePath,
    thumbnailPath: normalized.thumbnailPath,
    layout: normalizeBadgeLayout(normalized.layout),
  };
};
