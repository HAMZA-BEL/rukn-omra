export const BADGE_LOGICAL_SIZE = Object.freeze({ width: 58, height: 88 });
export const BADGE_SAFE_AREA_MM = 3;
export const BADGE_GRID_MM = 0.5;
export const FREE_VISUAL_ELEMENT_IDS = Object.freeze(["logo", "photo", "watermark"]);
export const isFreeVisualElement = (id) => FREE_VISUAL_ELEMENT_IDS.includes(id);
export const SMART_BADGE_LABELED_FIELD_IDS = Object.freeze(["passport","program","group","room","hotel","makkahHotel","madinahHotel","city","phone","guidePhone","travelDate"]);
export const SMART_BADGE_FIELD_PARTS = Object.freeze(["label", "value"]);

export const SMART_BADGE_ELEMENTS = Object.freeze({
  heroContainer: { label: "حاوية الاسم والصورة", kind: "container", movable: false, resizable: false },
  logo: { label: "شعار الوكالة", kind: "image", movable: true, resizable: true, minW: 7, maxW: 58, minH: 5, maxH: 44, minScale: .25, maxScale: 3 },
  watermark: { label: "العلامة المائية", kind: "watermark", movable: true, resizable: true, minW: 10, maxW: 58, minH: 8, maxH: 88, minScale: .25, maxScale: 3 },
  agencyName: { label: "اسم الوكالة", kind: "text", movable: true, resizable: true, minW: 8, maxW: 58, minH: 4, maxH: 24, minFont: 7, maxFont: 72 },
  photo: { label: "صورة المعتمر", kind: "photo", movable: true, resizable: true, minW: 8, maxW: 58, minH: 10, maxH: 88, minScale: .25, maxScale: 3 },
  pilgrimName: { label: "اسم المعتمر", kind: "text", movable: true, resizable: true, minW: 8, maxW: 58, minH: 5, maxH: 30, minFont: 12, maxFont: 96 },
  passport: { label: "رقم الجواز", kind: "text", movable: true, resizable: true, minW: 8, maxW: 58, minH: 4, maxH: 20, minFont: 7, maxFont: 72 },
  program: { label: "البرنامج", kind: "text", movable: true, resizable: true, minW: 8, maxW: 58, minH: 4, maxH: 24, minFont: 7, maxFont: 72 },
  group: { label: "المجموعة", kind: "block", movable: true, resizable: true, minW: 8, maxW: 58, minH: 5, maxH: 24, minFont: 7, maxFont: 72 },
  room: { label: "رقم الغرفة", kind: "block", movable: true, resizable: true, minW: 8, maxW: 58, minH: 5, maxH: 24, minFont: 7, maxFont: 72 },
  hotel: { label: "الفندق", kind: "text", movable: true, resizable: true, minW: 8, maxW: 58, minH: 4, maxH: 24, minFont: 7, maxFont: 72 },
  makkahHotel: { label: "فندق مكة", kind: "text", movable: true, resizable: true, minW: 8, maxW: 58, minH: 4, maxH: 24, minFont: 7, maxFont: 72 },
  madinahHotel: { label: "فندق المدينة", kind: "text", movable: true, resizable: true, minW: 8, maxW: 58, minH: 4, maxH: 24, minFont: 7, maxFont: 72 },
  city: { label: "المدينة", kind: "text", movable: true, resizable: true, minW: 8, maxW: 58, minH: 4, maxH: 20, minFont: 7, maxFont: 72 },
  phone: { label: "الهاتف", kind: "text", movable: true, resizable: true, minW: 8, maxW: 58, minH: 4, maxH: 20, minFont: 7, maxFont: 72 },
  guidePhone: { label: "هاتف المؤطر", kind: "text", movable: true, resizable: true, minW: 8, maxW: 58, minH: 4, maxH: 20, minFont: 7, maxFont: 72 },
  travelDate: { label: "تاريخ السفر", kind: "text", movable: true, resizable: true, minW: 8, maxW: 58, minH: 4, maxH: 20, minFont: 7, maxFont: 72 },
});

export const DEFAULT_WATERMARK_OVERRIDE = Object.freeze({
  mode: "custom", xMm: 11.5, yMm: 34, widthMm: 35, heightMm: 24, scale: 1, opacity: 8,
});

export const roundToGrid = (value, grid = BADGE_GRID_MM) => Math.round(Number(value || 0) / grid) * grid;
export const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value || 0)));

const normalizeFieldPartPosition = (value = {}) => ({
  offsetXmm: roundToGrid(clamp(value.offsetXmm, -58, 58)),
  offsetYmm: roundToGrid(clamp(value.offsetYmm, -88, 88)),
});

export function normalizeFieldPartOverrides(value = {}) {
  return Object.fromEntries(SMART_BADGE_LABELED_FIELD_IDS.flatMap((fieldId) => {
    const field = value?.[fieldId];
    if (!field || typeof field !== "object") return [];
    const parts = Object.fromEntries(SMART_BADGE_FIELD_PARTS.flatMap((part) => {
      if (!field?.[part] || typeof field[part] !== "object") return [];
      return [[part, normalizeFieldPartPosition(field[part])]];
    }));
    return Object.keys(parts).length ? [[fieldId, parts]] : [];
  }));
}

export function fieldPartPositionStyle(fieldParts = {}, fieldId, part) {
  const position = fieldParts?.[fieldId]?.[part];
  if (!position) return undefined;
  return { transform: `translate(${position.offsetXmm || 0}mm, ${position.offsetYmm || 0}mm)` };
}

export function patchFieldPartPosition(fieldParts = {}, fieldId, part, patch = {}) {
  if (!SMART_BADGE_LABELED_FIELD_IDS.includes(fieldId) || !SMART_BADGE_FIELD_PARTS.includes(part)) return normalizeFieldPartOverrides(fieldParts);
  const current = fieldParts?.[fieldId]?.[part] || { offsetXmm: 0, offsetYmm: 0 };
  return normalizeFieldPartOverrides({
    ...fieldParts,
    [fieldId]: {
      ...fieldParts?.[fieldId],
      [part]: normalizeFieldPartPosition({ ...current, ...patch }),
    },
  });
}

export function resetFieldPartPosition(fieldParts = {}, fieldId, part) {
  const next = { ...fieldParts, [fieldId]: { ...fieldParts?.[fieldId] } };
  delete next[fieldId][part];
  if (!Object.keys(next[fieldId]).length) delete next[fieldId];
  return normalizeFieldPartOverrides(next);
}

export function normalizeElementOverride(id, value = {}) {
  const spec = SMART_BADGE_ELEMENTS[id];
  if (!spec || !spec.movable || value?.mode !== "custom") return { mode: "auto" };
  const freeVisual = isFreeVisualElement(id);
  const width = roundToGrid(clamp(value.widthMm, spec.minW, freeVisual ? 580 : spec.maxW));
  const height = roundToGrid(clamp(value.heightMm, spec.minH, freeVisual ? 880 : spec.maxH));
  const scale = Math.round(clamp(value.scale ?? 1, spec.minScale ?? .5, spec.maxScale ?? 2) * 20) / 20;
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const scaleInsetX = Math.max(0, (scaledWidth - width) / 2);
  const scaleInsetY = Math.max(0, (scaledHeight - height) / 2);
  const minX = scaleInsetX;
  const minY = scaleInsetY;
  const maxX = BADGE_LOGICAL_SIZE.width - width - scaleInsetX;
  const maxY = BADGE_LOGICAL_SIZE.height - height - scaleInsetY;
  const legacyCapturedStyle=!Array.isArray(value.explicitProperties)&&typeof value.internalDisplay==="string";
  const explicitProperties=Array.isArray(value.explicitProperties)?[...new Set(value.explicitProperties.filter((key)=>typeof key==="string"&&key.length<40))]:[];
  const normalized = {
    mode: "custom",
    xMm: roundToGrid(freeVisual ? value.xMm : clamp(value.xMm, Math.min(minX, maxX), Math.max(minX, maxX))),
    yMm: roundToGrid(freeVisual ? value.yMm : clamp(value.yMm, Math.min(minY, maxY), Math.max(minY, maxY))),
    widthMm: width,
    heightMm: height,
    scale,
    explicitProperties,
    align: ["right", "center", "left"].includes(value.align) ? value.align : undefined,
    verticalAlign: ["top", "center", "bottom"].includes(value.verticalAlign) ? value.verticalAlign : undefined,
    padding: !legacyCapturedStyle&&Number.isFinite(Number(value.padding)) ? roundToGrid(clamp(value.padding, 0, 40)) : undefined,
    fontSize: !legacyCapturedStyle&&spec.minFont && Number(value.fontSize) > 0 ? roundToGrid(clamp(value.fontSize, spec.minFont, spec.maxFont)) : undefined,
    labelFontSize: !legacyCapturedStyle&&SMART_BADGE_LABELED_FIELD_IDS.includes(id) && Number(value.labelFontSize) > 0 ? roundToGrid(clamp(value.labelFontSize, 5, 48)) : undefined,
    labelFontWeight: !legacyCapturedStyle&&SMART_BADGE_LABELED_FIELD_IDS.includes(id) && [600,700,800,900].includes(Number(value.labelFontWeight)) ? Number(value.labelFontWeight) : undefined,
    labelColor: !legacyCapturedStyle&&SMART_BADGE_LABELED_FIELD_IDS.includes(id) && /^#[0-9a-f]{6}$/i.test(String(value.labelColor || "")) ? String(value.labelColor).toLowerCase() : undefined,
    fontWeight: !legacyCapturedStyle&&[600, 700, 800, 900, 950].includes(Number(value.fontWeight)) ? Number(value.fontWeight) : undefined,
    lineHeight: !legacyCapturedStyle&&spec.minFont && Number(value.lineHeight) > 0 ? clamp(value.lineHeight, 1, 1.8) : undefined,
    color: !legacyCapturedStyle&&/^#[0-9a-f]{6}$/i.test(String(value.color || "")) ? String(value.color).toLowerCase() : undefined,
    backgroundColor: !legacyCapturedStyle&&/^#[0-9a-f]{6}$/i.test(String(value.backgroundColor || "")) ? String(value.backgroundColor).toLowerCase() : undefined,
    borderColor: !legacyCapturedStyle&&/^#[0-9a-f]{6}$/i.test(String(value.borderColor || "")) ? String(value.borderColor).toLowerCase() : undefined,
    borderWidth: !legacyCapturedStyle&&Number.isFinite(Number(value.borderWidth)) ? roundToGrid(clamp(value.borderWidth, 0, 6)) : undefined,
    frameShape: !legacyCapturedStyle&&["soft", "square", "circle"].includes(value.frameShape) ? value.frameShape : undefined,
    radius: !legacyCapturedStyle&&Number.isFinite(Number(value.radius)) ? roundToGrid(clamp(value.radius, 0, 20)) : undefined,
    opacity: !legacyCapturedStyle&&spec.kind === "watermark" && Number.isFinite(Number(value.opacity)) ? Math.round(clamp(value.opacity, 1, 80)) : undefined,
  };
  return Object.fromEntries(Object.entries(normalized).filter(([,entry])=>entry!==undefined));
}

export function elementStyle(override = {}) {
  if (override.mode !== "custom") return undefined;
  return {
    left: `${override.xMm / BADGE_LOGICAL_SIZE.width * 100}%`,
    top: `${override.yMm / BADGE_LOGICAL_SIZE.height * 100}%`,
    width: `${override.widthMm / BADGE_LOGICAL_SIZE.width * 100}%`,
    height: `${override.heightMm / BADGE_LOGICAL_SIZE.height * 100}%`,
    transform: `scale(${override.scale || 1})`,
    transformOrigin: "center center",
  };
}

export function applyElementOverridePatch(id, baseline, patch) {
  const explicitProperties=[...new Set([...(baseline.explicitProperties||[]),...Object.keys(patch)])];
  const normalized = normalizeElementOverride(id, { ...baseline, ...patch,explicitProperties,mode: "custom" });
  if (!Object.prototype.hasOwnProperty.call(patch, "xMm")) normalized.xMm = baseline.xMm;
  if (!Object.prototype.hasOwnProperty.call(patch, "yMm")) normalized.yMm = baseline.yMm;
  if ((Object.prototype.hasOwnProperty.call(patch,"widthMm") || Object.prototype.hasOwnProperty.call(patch,"heightMm")) && !Object.prototype.hasOwnProperty.call(baseline,"fontSize")) delete normalized.fontSize;
  return normalized;
}

export function captureElementGeometry(id, measured = {}) {
  return normalizeElementOverride(id, {
    mode:"custom",xMm:measured.xMm,yMm:measured.yMm,widthMm:measured.widthMm,heightMm:measured.heightMm,scale:measured.scale ?? 1,
  });
}

export function snapElementPosition(xMm, yMm, widthMm, heightMm) {
  const threshold = 1;
  const centerX = (BADGE_LOGICAL_SIZE.width - widthMm) / 2;
  const centerY = (BADGE_LOGICAL_SIZE.height - heightMm) / 2;
  const maxX = BADGE_LOGICAL_SIZE.width - BADGE_SAFE_AREA_MM - widthMm;
  const maxY = BADGE_LOGICAL_SIZE.height - BADGE_SAFE_AREA_MM - heightMm;
  let x = clamp(xMm, BADGE_SAFE_AREA_MM, maxX);
  let y = clamp(yMm, BADGE_SAFE_AREA_MM, maxY);
  const guides = { x: false, y: false, safe: false };
  if (Math.abs(x - centerX) <= threshold) { x = centerX; guides.x = true; }
  if (Math.abs(y - centerY) <= threshold) { y = centerY; guides.y = true; }
  if (Math.abs(x - BADGE_SAFE_AREA_MM) <= threshold || Math.abs(x - maxX) <= threshold) guides.safe = true;
  if (Math.abs(y - BADGE_SAFE_AREA_MM) <= threshold || Math.abs(y - maxY) <= threshold) guides.safe = true;
  return { xMm: roundToGrid(x), yMm: roundToGrid(y), guides };
}
