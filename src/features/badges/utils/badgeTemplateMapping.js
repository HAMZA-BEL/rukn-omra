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
  name: template.name || "قالب الشارة",
  description: template.description || "",
  templatePath: template.templatePath || template.template_path || "",
  widthMm: Number(template.widthMm ?? template.width_mm ?? 90) || 90,
  heightMm: Number(template.heightMm ?? template.height_mm ?? 140) || 140,
  layout: template.layout && typeof template.layout === "object" ? template.layout : {},
  isDefault: Boolean(template.isDefault ?? template.is_default),
  createdAt: template.createdAt || template.created_at || "",
  updatedAt: template.updatedAt || template.updated_at || "",
});

export const toBadgeTemplatePayload = (template = {}) => {
  const normalized = normalizeBadgeTemplate(template);
  return {
    ...normalized,
    name: normalized.name.trim() || "قالب الشارة",
    description: normalized.description.trim(),
    templatePath: normalized.templatePath,
    layout: normalized.layout,
  };
};
