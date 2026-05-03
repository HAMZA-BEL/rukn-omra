import { BADGE_FIELD_DEFINITIONS } from "./badgeDefaults";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const roundPct = (value) => Math.round(value * 100) / 100;
const pct = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const getBadgeFieldDefinition = (key) => (
  BADGE_FIELD_DEFINITIONS.find((field) => field.key === key) || null
);

export const createBadgeField = (key, index = 0) => {
  const definition = getBadgeFieldDefinition(key);
  if (!definition) return null;
  const row = index % 8;
  const col = Math.floor(index / 8);
  return {
    ...definition,
    id: `${key}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    xPct: Math.min(70, 10 + col * 8),
    yPct: Math.min(88, 12 + row * 9),
    visible: true,
  };
};

export const createDefaultBadgeLayout = () => ({ fields: [] });

export const normalizeBadgeLayout = (layout = {}) => {
  const customFields = Array.isArray(layout.fields) ? layout.fields : [];
  return {
    fields: customFields.map((field, index) => {
      const fallback = getBadgeFieldDefinition(field.key) || BADGE_FIELD_DEFINITIONS[0];
      return {
        ...fallback,
        ...field,
        id: field.id || `${field.key}-${index}`,
        xPct: clamp(pct(field.xPct, 10 + index * 2), 0, 98),
        yPct: clamp(pct(field.yPct, 12 + index * 8), 0, 98),
        wPct: clamp(pct(field.wPct, fallback.wPct || 40), 3, 100),
        hPct: clamp(pct(field.hPct, fallback.hPct || 8), 3, 100),
        fontSize: Number(field.fontSize ?? fallback.fontSize ?? 12),
        fontWeight: Number(field.fontWeight ?? fallback.fontWeight ?? 700),
        color: field.color || fallback.color || "#111111",
        align: field.align || fallback.align || "center",
        maxLines: Number(field.maxLines ?? fallback.maxLines ?? 1),
        visible: field.visible !== false,
      };
    }),
  };
};

export const addBadgeFieldToLayout = (layout, key) => {
  const current = normalizeBadgeLayout(layout);
  const definition = getBadgeFieldDefinition(key);
  if (!definition) return current;
  if (!definition.repeatable && current.fields.some((field) => field.key === key)) return current;
  const field = createBadgeField(key, current.fields.length);
  return { ...current, fields: field ? [...current.fields, field] : current.fields };
};

export const removeBadgeFieldFromLayout = (layout, fieldId) => ({
  ...normalizeBadgeLayout(layout),
  fields: normalizeBadgeLayout(layout).fields.filter((field) => field.id !== fieldId),
});

export const updateBadgeFieldBox = (layout, fieldId, patch = {}) => ({
  ...layout,
  fields: normalizeBadgeLayout(layout).fields.map((field) => (
    field.id === fieldId
      ? {
          ...field,
          ...patch,
          xPct: roundPct(clamp(patch.xPct ?? field.xPct, 0, 98)),
          yPct: roundPct(clamp(patch.yPct ?? field.yPct, 0, 98)),
          wPct: roundPct(clamp(patch.wPct ?? field.wPct, 3, 100)),
          hPct: roundPct(clamp(patch.hPct ?? field.hPct, 3, 100)),
        }
      : field
  )),
});

export const sampleBadgeData = {
  photo: "",
  fullName: "الاسم الكامل",
  passportNumber: "AB123456",
  primaryPhone: "+966 56 625 7665",
  extraPhone: "+966 56 655 1580",
  programName: "اسم البرنامج",
  badgeNote: "ملاحظة الشارة",
  agencyName: "اسم الوكالة",
  fileNumber: "رقم الملف",
};
