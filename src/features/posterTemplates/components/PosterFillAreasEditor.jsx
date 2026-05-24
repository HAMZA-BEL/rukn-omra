import React from "react";
import { AppIcon } from "../../../components/Icon";
import { Button, Modal } from "../../../components/UI";
import {
  normalizePosterArea,
  normalizePosterTemplateLevelsCount,
  POSTER_AREA_MAX_FONT_SIZE,
  POSTER_AREA_MIN_FONT_SIZE,
  POSTER_AREA_AVAILABLE_GROUPS,
  POSTER_AREA_DEFAULT_STYLE,
  POSTER_AREA_LABELS,
} from "../utils/posterTemplateData";
import {
  getPosterPreviewTextCss,
  getPosterTextDirection,
} from "../utils/posterTextRendering";

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 3;
const CANVAS_PADDING = 150;
const ALIGNMENT_SNAP_THRESHOLD_PX = 6;
const RELATED_ROW_SNAP_THRESHOLD_PX = 8;
const KEYBOARD_GUIDE_THRESHOLD_PX = 1.5;
const KEYBOARD_GUIDE_HIDE_MS = 450;

const editorText = (lang) => ({
  title: lang === "fr" ? "Définir les zones" : lang === "en" ? "Define fill areas" : "تحديد مناطق التعبئة",
  available: lang === "fr" ? "Zones disponibles" : lang === "en" ? "Available areas" : "مناطق التعبئة",
  selected: lang === "fr" ? "Zone sélectionnée" : lang === "en" ? "Selected area" : "المنطقة المحددة",
  selectAreaHint: lang === "fr"
    ? "Sélectionnez une zone du modèle pour modifier ses propriétés"
    : lang === "en"
    ? "Select an area on the template to edit its properties"
    : "اختر منطقة من القالب لتعديل خصائصها",
  mapped: lang === "fr" ? "Zones définies" : lang === "en" ? "Defined areas" : "المناطق المحددة",
  add: lang === "fr" ? "Ajouter" : lang === "en" ? "Add" : "إضافة",
  remove: lang === "fr" ? "Supprimer la zone" : lang === "en" ? "Delete area" : "حذف المنطقة",
  cancel: lang === "fr" ? "Annuler" : lang === "en" ? "Cancel" : "إلغاء",
  save: lang === "fr" ? "Enregistrer les zones" : lang === "en" ? "Save areas" : "حفظ المناطق",
  saving: lang === "fr" ? "Enregistrement..." : lang === "en" ? "Saving..." : "جاري الحفظ...",
  noImage: lang === "fr" ? "L’image du modèle n’est pas disponible." : lang === "en" ? "Template image is not available." : "صورة القالب غير متاحة.",
  noAreas: lang === "fr" ? "Aucune zone définie" : lang === "en" ? "No areas defined" : "لا توجد مناطق محددة",
  style: lang === "fr" ? "Aperçu" : lang === "en" ? "Preview" : "المعاينة",
  zoomOut: lang === "fr" ? "Réduire" : lang === "en" ? "Zoom out" : "تصغير",
  zoomIn: lang === "fr" ? "Agrandir" : lang === "en" ? "Zoom in" : "تكبير",
  resetZoom: lang === "fr" ? "100%" : lang === "en" ? "100%" : "100%",
  textColor: lang === "fr" ? "Couleur" : lang === "en" ? "Text color" : "لون النص",
  fontSize: lang === "fr" ? "Taille du texte" : lang === "en" ? "Font size" : "حجم الخط",
  fontSizeHint: lang === "fr"
    ? "Pour réduire le texte, utilisez la taille du texte. Les bordures servent à définir la zone d’affichage."
    : lang === "en"
    ? "To make text smaller, use Font size. The field borders only define the text area."
    : "لتصغير الكتابة استعمل حجم الخط، أما حدود الحقل فهي لتحديد مساحة ظهور النص.",
  bold: lang === "fr" ? "Gras" : lang === "en" ? "Bold" : "عريض",
  normal: lang === "fr" ? "Normal" : lang === "en" ? "Normal" : "عادي",
  align: lang === "fr" ? "Alignement" : lang === "en" ? "Alignment" : "المحاذاة",
  alignLeft: lang === "fr" ? "Gauche" : lang === "en" ? "Left" : "يسار",
  alignCenter: lang === "fr" ? "Centre" : lang === "en" ? "Center" : "وسط",
  alignRight: lang === "fr" ? "Droite" : lang === "en" ? "Right" : "يمين",
  copy: lang === "fr" ? "Copier" : lang === "en" ? "Copy" : "نسخ",
  duplicate: lang === "fr" ? "Dupliquer" : lang === "en" ? "Duplicate" : "تكرار",
});

const formatSelectedCount = (count, lang) => {
  if (lang === "fr") return `${count} ${count === 1 ? "élément" : "éléments"}`;
  if (lang === "en") return `${count} ${count === 1 ? "item" : "items"}`;
  return `${count} ${count === 1 ? "عنصر" : "عناصر"}`;
};

const ARABIC_DATE_SAMPLE_PARTS = {
  departure_date: { day: "11", month: "فبراير", year: "2026" },
  return_date: { day: "03", month: "مارس", year: "2026" },
};

const formatArabicDateSample = (type) => {
  const parts = ARABIC_DATE_SAMPLE_PARTS[type];
  return parts ? `${parts.day} ${parts.month} ${parts.year}` : "";
};

function ArabicDatePreview({ type }) {
  const parts = ARABIC_DATE_SAMPLE_PARTS[type];
  if (!parts) return null;

  return (
    <span
      dir="rtl"
      aria-label={formatArabicDateSample(type)}
      style={{
        direction: "rtl",
        display: "inline-flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "0.35em",
        unicodeBidi: "isolate",
        isolation: "isolate",
        whiteSpace: "nowrap",
        overflowWrap: "normal",
        textAlign: "start",
      }}
    >
      <span dir="ltr" style={{ unicodeBidi: "isolate" }}>{parts.day}</span>
      <span dir="rtl" style={{ unicodeBidi: "isolate" }}>{parts.month}</span>
      <span dir="ltr" style={{ unicodeBidi: "isolate" }}>{parts.year}</span>
    </span>
  );
}

const createSampleText = () => {
  const samples = {
    program_name: {
      ar: "اسم البرنامج",
      fr: "Nom du programme",
      en: "Program name",
    },
    starting_price: {
      ar: "18.800 درهم",
      fr: "18.800 DH",
      en: "18,800 MAD",
    },
    departure_date: {
      ar: formatArabicDateSample("departure_date"),
      fr: "11/02/26",
      en: "11/02/26",
    },
    return_date: {
      ar: formatArabicDateSample("return_date"),
      fr: "03/03/26",
      en: "03/03/26",
    },
    flight_info: {
      ar: "خطوط الطيران",
      fr: "Compagnies aériennes",
      en: "Airlines",
    },
    poster_travel_route: {
      ar: "أكادير ← الدار البيضاء ← المدينة / جدة ← الدار البيضاء ← أكادير",
      fr: "Agadir ← Casablanca ← Médine / Djeddah ← Casablanca ← Agadir",
      en: "Agadir ← Casablanca ← Madinah / Jeddah ← Casablanca ← Agadir",
    },
    levels_prices_table: {
      ar: ["18.800 درهم", "21.800 درهم"],
      fr: ["18.800 DH", "21.800 DH"],
      en: ["18,800 MAD", "21,800 MAD"],
    },
  };

  const roomPricesByLevel = {
    1: {
      double_price: "24.500",
      triple_price: "21.800",
      quad_price: "19.800",
      quint_price: "18.800",
    },
    2: {
      double_price: "25.500",
      triple_price: "22.800",
      quad_price: "20.800",
      quint_price: "19.800",
    },
    3: {
      double_price: "26.500",
      triple_price: "23.800",
      quad_price: "21.800",
      quint_price: "20.800",
    },
    4: {
      double_price: "27.500",
      triple_price: "24.800",
      quad_price: "22.800",
      quint_price: "21.800",
    },
    5: {
      double_price: "28.500",
      triple_price: "25.800",
      quad_price: "23.800",
      quint_price: "22.800",
    },
  };

  for (let level = 1; level <= 5; level += 1) {
    samples[`level_${level}_name`] = {
      ar: `المستوى ${level}`,
      fr: `Niveau ${level}`,
      en: `Level ${level}`,
    };
    samples[`hotel_${level}`] = {
      ar: `فندق ${level}`,
      fr: `Hôtel ${level}`,
      en: `Hotel ${level}`,
    };
    samples[`makkah_hotel_l${level}`] = {
      ar: `مكة ${level}`,
      fr: `La Mecque ${level}`,
      en: `Makkah ${level}`,
    };
    samples[`madinah_hotel_l${level}`] = {
      ar: `مدينة ${level}`,
      fr: `Médine ${level}`,
      en: `Madinah ${level}`,
    };
    samples[`level_${level}_makkah_hotel`] = {
      ar: `مكة ${level}`,
      fr: `La Mecque ${level}`,
      en: `Makkah ${level}`,
    };
    samples[`level_${level}_madinah_hotel`] = {
      ar: `مدينة ${level}`,
      fr: `Médine ${level}`,
      en: `Madinah ${level}`,
    };
    Object.entries(roomPricesByLevel[level]).forEach(([key, value]) => {
      samples[`level_${level}_${key}`] = {
        ar: value,
        fr: value,
        en: value,
      };
    });
  }

  return samples;
};

const SAMPLE_TEXT = createSampleText();

const DEFAULT_LAYOUTS = {
  program_name: { x: 24, y: 18, width: 52, height: 9, style: { fontSize: 24, fontWeight: "700" } },
  starting_price: { x: 28, y: 72, width: 44, height: 9, style: { fontSize: 21, fontWeight: "700" } },
  departure_date: { x: 18, y: 58, width: 32, height: 8, style: { fontSize: 16, fontWeight: "700" } },
  return_date: { x: 50, y: 58, width: 32, height: 8, style: { fontSize: 16, fontWeight: "700" } },
  flight_info: { x: 30, y: 46, width: 40, height: 8, style: { fontSize: 16, fontWeight: "700" } },
  poster_travel_route: { x: 18, y: 52, width: 64, height: 8, style: { fontSize: 15, fontWeight: "700" } },
  levels_prices_table: { x: 17, y: 80, width: 66, height: 16, style: { fontSize: 14, fontWeight: "700" } },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const clampZoom = (value) => (
  Math.round(clamp(Number(value) || 1, MIN_ZOOM, MAX_ZOOM) * 100) / 100
);

const clampFontSize = (value) => (
  Math.round(clamp(Number(value) || POSTER_AREA_DEFAULT_STYLE.fontSize, POSTER_AREA_MIN_FONT_SIZE, POSTER_AREA_MAX_FONT_SIZE))
);

const getDefaultLayout = (type) => {
  if (DEFAULT_LAYOUTS[type]) return DEFAULT_LAYOUTS[type];
  const explicitHotelMatch = String(type).match(/^(makkah|madinah)_hotel_l(\d+)$/);
  if (explicitHotelMatch) {
    const city = explicitHotelMatch[1];
    const level = clamp(Number(explicitHotelMatch[2]) || 1, 1, 5);
    return {
      x: city === "makkah" ? 38 : 62,
      y: 24 + (level - 1) * 8,
      width: 30,
      height: 7,
      style: { fontSize: 14, fontWeight: "700" },
    };
  }
  const hotelMatch = String(type).match(/^hotel_(\d+)$/);
  if (hotelMatch) {
    const hotel = clamp(Number(hotelMatch[1]) || 1, 1, 5);
    return { x: 40, y: 24 + (hotel - 1) * 8, width: 30, height: 7, style: { fontSize: 14, fontWeight: "700" } };
  }
  const match = String(type).match(/^level_(\d+)_(name|makkah_hotel|madinah_hotel|double_price|triple_price|quad_price|quint_price)$/);
  if (!match) return {};
  const level = clamp(Number(match[1]) || 1, 1, 5);
  const field = match[2];
  if (field === "name") {
    return { x: 9, y: 24 + (level - 1) * 8, width: 28, height: 7, style: { fontSize: 15, fontWeight: "700" } };
  }
  if (field === "makkah_hotel") {
    return { x: 38, y: 24 + (level - 1) * 8, width: 30, height: 7, style: { fontSize: 14, fontWeight: "700" } };
  }
  if (field === "madinah_hotel") {
    return { x: 62, y: 24 + (level - 1) * 8, width: 30, height: 7, style: { fontSize: 14, fontWeight: "700" } };
  }
  const roomIndex = ["double_price", "triple_price", "quad_price", "quint_price"].indexOf(field);
  return {
    x: 10 + Math.max(0, roomIndex) * 21,
    y: 66 + (level - 1) * 6,
    width: 18,
    height: 5.5,
    style: { fontSize: 13, fontWeight: "700" },
  };
};

const getAreaMinSize = (type) => ({
  minWidth: type === "levels_prices_table" ? 18 : /^level_\d+_.*_price$/.test(type) ? 8 : 10,
  minHeight: type === "levels_prices_table" ? 9 : /^level_\d+_.*_price$/.test(type) ? 4 : 5,
});

const PASTE_OFFSET_PERCENT = 2;

const copyAreasForClipboard = (sourceAreas) => (
  sourceAreas.map((area) => ({
    ...area,
    style: { ...(area.style || {}) },
  }))
);

const areaBounds = (sourceAreas) => sourceAreas.reduce((bounds, area) => {
  const x = Number(area.x) || 0;
  const y = Number(area.y) || 0;
  const width = Number(area.width) || 0;
  const height = Number(area.height) || 0;
  return {
    minX: Math.min(bounds.minX, x),
    minY: Math.min(bounds.minY, y),
    maxX: Math.max(bounds.maxX, x + width),
    maxY: Math.max(bounds.maxY, y + height),
  };
}, {
  minX: 100,
  minY: 100,
  maxX: 0,
  maxY: 0,
});

const offsetBounds = (bounds, dx, dy) => ({
  minX: bounds.minX + dx,
  minY: bounds.minY + dy,
  maxX: bounds.maxX + dx,
  maxY: bounds.maxY + dy,
});

const boundsMetric = (bounds, key) => {
  if (key === "left") return bounds.minX;
  if (key === "right") return bounds.maxX;
  if (key === "centerX") return (bounds.minX + bounds.maxX) / 2;
  if (key === "top") return bounds.minY;
  if (key === "bottom") return bounds.maxY;
  if (key === "centerY") return (bounds.minY + bounds.maxY) / 2;
  return 0;
};

const getAreaLevelNumber = (type) => {
  const value = String(type || "");
  const explicitHotelMatch = value.match(/^(?:makkah|madinah)_hotel_l(\d+)$/);
  if (explicitHotelMatch) return Number(explicitHotelMatch[1]);
  const roomAliasMatch = value.match(/^(?:double|triple|quad|quint)_l(\d+)$/);
  if (roomAliasMatch) return Number(roomAliasMatch[1]);
  const levelMatch = value.match(/^level_(\d+)(?:_|$)/);
  if (levelMatch) return Number(levelMatch[1]);
  const legacyHotelMatch = value.match(/^hotel_(\d+)$/);
  if (legacyHotelMatch) return Number(legacyHotelMatch[1]);
  return null;
};

const createSourceLevelSet = (sourceAreas = []) => {
  const levels = new Set();
  sourceAreas.forEach((area) => {
    const level = getAreaLevelNumber(area.type);
    if (level) levels.add(level);
  });
  return levels;
};

const createPosterGuideTargets = () => ({
  x: [
    { value: 0, point: "left", strength: "normal", source: "poster" },
    { value: 50, point: "centerX", strength: "center", source: "poster" },
    { value: 100, point: "right", strength: "normal", source: "poster" },
  ],
  y: [
    { value: 0, point: "top", strength: "normal", source: "poster" },
    { value: 50, point: "centerY", strength: "center", source: "poster" },
    { value: 100, point: "bottom", strength: "normal", source: "poster" },
  ],
});

const buildAlignmentTargets = (allAreas = [], sourceAreaIds = new Set(), sourceLevels = new Set()) => {
  const targets = createPosterGuideTargets();

  allAreas.forEach((area) => {
    if (sourceAreaIds.has(area.id)) return;
    const bounds = areaBounds([area]);
    const level = getAreaLevelNumber(area.type);
    const relatedLevel = level && sourceLevels.has(level);
    const yStrength = relatedLevel ? "strong" : "normal";

    targets.x.push(
      { value: bounds.minX, point: "left", strength: "normal", source: "field" },
      { value: (bounds.minX + bounds.maxX) / 2, point: "centerX", strength: "normal", source: "field" },
      { value: bounds.maxX, point: "right", strength: "normal", source: "field" }
    );
    targets.y.push(
      { value: bounds.minY, point: "top", strength: yStrength, source: "field" },
      { value: (bounds.minY + bounds.maxY) / 2, point: "centerY", strength: yStrength, source: "field" },
      { value: bounds.maxY, point: "bottom", strength: yStrength, source: "field" }
    );
  });

  return targets;
};

const getAxisSnap = (bounds, targets, thresholdPercent) => {
  let best = null;

  targets.forEach((target) => {
    const sourceValue = boundsMetric(bounds, target.point);
    const delta = target.value - sourceValue;
    const absDelta = Math.abs(delta);
    const snapThreshold = target.strength === "strong"
      ? thresholdPercent.strong
      : thresholdPercent.normal;
    if (absDelta > snapThreshold) return;

    if (
      !best
      || absDelta < best.absDelta
      || (absDelta === best.absDelta && target.strength === "strong" && best.strength !== "strong")
    ) {
      best = {
        delta,
        absDelta,
        position: target.value,
        strength: target.strength,
        source: target.source,
      };
    }
  });

  return best;
};

const guideForSnap = (axis, snap) => (
  snap
    ? {
      axis,
      position: clamp(snap.position, 0, 100),
      strength: snap.strength,
      source: snap.source,
    }
    : null
);

const findAlignmentGuides = ({
  allAreas,
  sourceAreas,
  movingBounds,
  rect,
  thresholdPx = ALIGNMENT_SNAP_THRESHOLD_PX,
}) => {
  if (!sourceAreas.length || !rect?.width || !rect?.height) return [];
  const sourceAreaIds = new Set(sourceAreas.map((area) => area.id));
  const targets = buildAlignmentTargets(allAreas, sourceAreaIds, createSourceLevelSet(sourceAreas));
  const xThreshold = {
    normal: (thresholdPx / rect.width) * 100,
    strong: (RELATED_ROW_SNAP_THRESHOLD_PX / rect.width) * 100,
  };
  const yThreshold = {
    normal: (thresholdPx / rect.height) * 100,
    strong: (RELATED_ROW_SNAP_THRESHOLD_PX / rect.height) * 100,
  };
  return [
    guideForSnap("x", getAxisSnap(movingBounds, targets.x, xThreshold)),
    guideForSnap("y", getAxisSnap(movingBounds, targets.y, yThreshold)),
  ].filter(Boolean);
};

const moveAreaGroupWithAlignment = (currentAreas, sourceAreas, dx, dy, rect) => {
  if (!sourceAreas.length) return { areas: currentAreas, guides: [] };
  const bounds = areaBounds(sourceAreas);
  const rawDx = clamp(dx, -bounds.minX, 100 - bounds.maxX);
  const rawDy = clamp(dy, -bounds.minY, 100 - bounds.maxY);
  const movedBounds = offsetBounds(bounds, rawDx, rawDy);
  const sourceAreaIds = new Set(sourceAreas.map((area) => area.id));
  const sourceLevels = createSourceLevelSet(sourceAreas);
  const targets = buildAlignmentTargets(currentAreas, sourceAreaIds, sourceLevels);
  const xThreshold = {
    normal: (ALIGNMENT_SNAP_THRESHOLD_PX / (rect?.width || 1)) * 100,
    strong: (RELATED_ROW_SNAP_THRESHOLD_PX / (rect?.width || 1)) * 100,
  };
  const yThreshold = {
    normal: (ALIGNMENT_SNAP_THRESHOLD_PX / (rect?.height || 1)) * 100,
    strong: (RELATED_ROW_SNAP_THRESHOLD_PX / (rect?.height || 1)) * 100,
  };
  const xSnap = getAxisSnap(movedBounds, targets.x, xThreshold);
  const ySnap = getAxisSnap(movedBounds, targets.y, yThreshold);
  const nextDx = clamp(rawDx + (xSnap?.delta || 0), -bounds.minX, 100 - bounds.maxX);
  const nextDy = clamp(rawDy + (ySnap?.delta || 0), -bounds.minY, 100 - bounds.maxY);
  const guides = [
    guideForSnap("x", xSnap),
    guideForSnap("y", ySnap),
  ].filter(Boolean);

  return {
    areas: moveAreaGroupFromSnapshot(currentAreas, sourceAreas, nextDx, nextDy),
    guides,
  };
};

const moveAreaGroupFromSnapshot = (currentAreas, sourceAreas, dx, dy) => {
  if (!sourceAreas.length) return currentAreas;
  const bounds = areaBounds(sourceAreas);
  const nextDx = clamp(dx, -bounds.minX, 100 - bounds.maxX);
  const nextDy = clamp(dy, -bounds.minY, 100 - bounds.maxY);
  const movedById = new Map(sourceAreas.map((area) => [
    area.id,
    {
      ...area,
      x: (Number(area.x) || 0) + nextDx,
      y: (Number(area.y) || 0) + nextDy,
    },
  ]));
  return currentAreas.map((area) => movedById.get(area.id) || area);
};

const moveAreaGroupByDelta = (currentAreas, areaIds, dx, dy) => {
  const ids = new Set(areaIds);
  const sourceAreas = currentAreas.filter((area) => ids.has(area.id));
  return moveAreaGroupFromSnapshot(currentAreas, sourceAreas, dx, dy);
};

const createPastedAreas = (sourceAreas) => {
  if (!sourceAreas.length) return [];
  const bounds = areaBounds(sourceAreas);
  const dx = clamp(PASTE_OFFSET_PERCENT, -bounds.minX, 100 - bounds.maxX);
  const dy = clamp(PASTE_OFFSET_PERCENT, -bounds.minY, 100 - bounds.maxY);
  return sourceAreas.map((area) => ({
    ...area,
    id: createAreaId(area.type),
    x: (Number(area.x) || 0) + dx,
    y: (Number(area.y) || 0) + dy,
    style: { ...(area.style || {}) },
  }));
};

const resizeArea = (area, dx, dy, handle) => {
  const { minWidth, minHeight } = getAreaMinSize(area.type);
  let { x, y, width, height } = area;
  if (handle.includes("e")) {
    width = clamp(width + dx, minWidth, 100 - x);
  }
  if (handle.includes("s")) {
    height = clamp(height + dy, minHeight, 100 - y);
  }
  if (handle.includes("w")) {
    const nextX = clamp(x + dx, 0, x + width - minWidth);
    width += x - nextX;
    x = nextX;
  }
  if (handle.includes("n")) {
    const nextY = clamp(y + dy, 0, y + height - minHeight);
    height += y - nextY;
    y = nextY;
  }
  return { ...area, x, y, width, height };
};

const isCornerResizeHandle = (handle) => ["nw", "ne", "se", "sw"].includes(handle);

const resizeAreaWithOptionalFontScale = (area, dx, dy, handle) => {
  const nextArea = resizeArea(area, dx, dy, handle);
  if (!isCornerResizeHandle(handle)) return nextArea;
  const widthScale = area.width ? nextArea.width / area.width : 1;
  const heightScale = area.height ? nextArea.height / area.height : 1;
  const scale = Math.min(widthScale, heightScale);
  if (!Number.isFinite(scale) || scale <= 0) return nextArea;
  const baseStyle = {
    ...POSTER_AREA_DEFAULT_STYLE,
    ...(area.style || {}),
  };
  return {
    ...nextArea,
    style: {
      ...baseStyle,
      fontSize: clampFontSize(baseStyle.fontSize * scale),
    },
  };
};

const RESIZE_HANDLES = [
  { key: "nw", cursor: "nwse-resize", style: { top: -5, left: -5 } },
  { key: "n", cursor: "ns-resize", style: { top: -5, left: "50%", transform: "translateX(-50%)" } },
  { key: "ne", cursor: "nesw-resize", style: { top: -5, right: -5 } },
  { key: "e", cursor: "ew-resize", style: { top: "50%", right: -5, transform: "translateY(-50%)" } },
  { key: "se", cursor: "nwse-resize", style: { bottom: -5, right: -5 } },
  { key: "s", cursor: "ns-resize", style: { bottom: -5, left: "50%", transform: "translateX(-50%)" } },
  { key: "sw", cursor: "nesw-resize", style: { bottom: -5, left: -5 } },
  { key: "w", cursor: "ew-resize", style: { top: "50%", left: -5, transform: "translateY(-50%)" } },
];

const COLOR_PRESETS = ["#111827", "#ffffff", "#1d4ed8", "#d4af37", "#dc2626", "#374151"];

const createAreaId = (type) => {
  const suffix = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 100000)}`;
  return `${type}-${suffix}`;
};

const areaLabel = (type, lang) => (
  POSTER_AREA_LABELS[type]?.[lang] || POSTER_AREA_LABELS[type]?.ar || type
);

const areaGroupLabel = (group, lang) => (
  group.label?.[lang] || group.label?.ar || group.key
);

const levelNumberForAvailableAreaType = (type) => {
  const value = String(type || "");
  const explicitHotelMatch = value.match(/^(?:makkah|madinah)_hotel_l(\d+)$/);
  if (explicitHotelMatch) return Number(explicitHotelMatch[1]);
  const levelMatch = value.match(/^level_(\d+)_(?:name|makkah_hotel|madinah_hotel|double_price|triple_price|quad_price|quint_price)$/);
  if (levelMatch) return Number(levelMatch[1]);
  return null;
};

const isEditableTarget = (target) => {
  if (!target || target === document || target === window) return false;
  const element = target instanceof Element ? target : null;
  if (!element) return false;
  return Boolean(
    element.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']")
    || element.isContentEditable
  );
};

const isControlTarget = (target) => {
  const element = target instanceof Element ? target : null;
  if (!element) return false;
  return Boolean(
    element.closest("[data-poster-editor-control='true'], button, input, textarea, select, [contenteditable='true'], [contenteditable='']")
    || element.isContentEditable
  );
};

const isPosterAreaTarget = (target) => {
  const element = target instanceof Element ? target : null;
  if (!element) return false;
  return Boolean(element.closest("[data-poster-area='true'], [data-resize-handle='true']"));
};

const isNumericPreviewArea = (type) => (
  type === "starting_price"
  || type === "departure_date"
  || type === "return_date"
  || /^level_\d+_.*_price$/.test(type)
);

function AreaPreviewContent({ area, lang }) {
  const sample = SAMPLE_TEXT[area.type]?.[lang] || SAMPLE_TEXT[area.type]?.ar || "";
  const direction = getPosterTextDirection(area.type, sample, lang);

  if (area.type === "starting_price" && lang === "ar") {
    return (
      <span
        dir="ltr"
        style={{
          direction: "ltr",
          display: "inline-flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "0.35em",
          unicodeBidi: "isolate",
          isolation: "isolate",
          whiteSpace: "nowrap",
          overflowWrap: "normal",
          textAlign: "left",
        }}
      >
        <span dir="rtl" style={{ order: 1, unicodeBidi: "isolate" }}>درهم</span>
        <span dir="ltr" style={{ order: 2, unicodeBidi: "isolate" }}>18.800</span>
      </span>
    );
  }

  const arabicDateParts = lang === "ar" ? ARABIC_DATE_SAMPLE_PARTS[area.type] || null : null;

  if (arabicDateParts) {
    return <ArabicDatePreview type={area.type} />;
  }

  if (area.type === "levels_prices_table" && Array.isArray(sample)) {
    return (
      <div style={{ display: "grid", gap: 3, width: "100%" }}>
        {sample.map((row) => (
          <span
            key={row}
            dir="ltr"
            style={{
              direction: "ltr",
              unicodeBidi: "isolate",
              borderTop: "1px solid rgba(255,255,255,.38)",
              paddingTop: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {row}
          </span>
        ))}
      </div>
    );
  }

  return (
    <span
      dir={direction}
      style={{
        direction,
        unicodeBidi: "isolate",
        whiteSpace: isNumericPreviewArea(area.type) ? "nowrap" : "normal",
        overflowWrap: "anywhere",
      }}
    >
      {sample}
    </span>
  );
}

export default function PosterFillAreasEditor({
  open,
  template,
  imageUrl,
  lang,
  saving = false,
  onClose,
  onSave,
}) {
  const l = React.useMemo(() => editorText(lang), [lang]);
  const templateLevelsCount = normalizePosterTemplateLevelsCount(template?.levelsCount ?? template?.levels_count);
  const availableAreaGroups = React.useMemo(() => (
    POSTER_AREA_AVAILABLE_GROUPS.map((group) => ({
      ...group,
      types: group.types.filter((type) => {
        const areaLevel = levelNumberForAvailableAreaType(type);
        return !areaLevel || areaLevel <= templateLevelsCount;
      }),
    })).filter((group) => group.types.length > 0)
  ), [templateLevelsCount]);
  const [areas, setAreas] = React.useState([]);
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [zoom, setZoom] = React.useState(1);
  const [isPanning, setIsPanning] = React.useState(false);
  const [alignMenuOpen, setAlignMenuOpen] = React.useState(false);
  const [isKeyboardNudging, setIsKeyboardNudging] = React.useState(false);
  const [alignmentGuides, setAlignmentGuides] = React.useState([]);
  const [posterSize, setPosterSize] = React.useState({ width: 0, height: 0 });
  const workspaceRef = React.useRef(null);
  const viewportRef = React.useRef(null);
  const imageRef = React.useRef(null);
  const stageRef = React.useRef(null);
  const areasRef = React.useRef([]);
  const dragRef = React.useRef(null);
  const panRef = React.useRef(null);
  const clipboardRef = React.useRef([]);
  const recentPointerActionRef = React.useRef(null);
  const keyboardNudgeTimeoutRef = React.useRef(null);
  const guideHideTimeoutRef = React.useRef(null);
  const zoomRef = React.useRef(1);
  const selectedIdSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedAreas = React.useMemo(
    () => areas.filter((area) => selectedIdSet.has(area.id)),
    [areas, selectedIdSet]
  );
  const selectedArea = selectedAreas.length === 1 ? selectedAreas[0] : null;
  const selectedId = selectedArea?.id || "";
  const hasMultiSelection = selectedAreas.length > 1;
  const selectedCount = selectedAreas.length;

  React.useEffect(() => {
    if (!open) return;
    const nextAreas = (template?.areas || []).map(normalizePosterArea).filter(Boolean);
    areasRef.current = nextAreas;
    setAreas(nextAreas);
    setSelectedIds([]);
    setZoom(1);
    zoomRef.current = 1;
    setPosterSize({ width: 0, height: 0 });
    setIsPanning(false);
    setAlignMenuOpen(false);
    setIsKeyboardNudging(false);
    setAlignmentGuides([]);
    panRef.current = null;
    if (keyboardNudgeTimeoutRef.current) {
      window.clearTimeout(keyboardNudgeTimeoutRef.current);
      keyboardNudgeTimeoutRef.current = null;
    }
    if (guideHideTimeoutRef.current) {
      window.clearTimeout(guideHideTimeoutRef.current);
      guideHideTimeoutRef.current = null;
    }
  }, [open, template?.id, template?.areas]);

  React.useEffect(() => {
    areasRef.current = areas;
  }, [areas]);

  React.useEffect(() => {
    setAlignMenuOpen(false);
  }, [selectedId, selectedCount]);

  React.useEffect(() => {
    setSelectedIds((current) => {
      if (!current.length) return current;
      const areaIds = new Set(areas.map((area) => area.id));
      const next = current.filter((id) => areaIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [areas]);

  React.useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const updatePosterSize = React.useCallback(() => {
    const image = imageRef.current;
    if (!image) return;
    const nextWidth = image.offsetWidth || image.clientWidth || 0;
    const nextHeight = image.offsetHeight || image.clientHeight || 0;
    if (!nextWidth || !nextHeight) return;
    setPosterSize((current) => (
      Math.abs(current.width - nextWidth) < 1 && Math.abs(current.height - nextHeight) < 1
        ? current
        : { width: nextWidth, height: nextHeight }
    ));
  }, []);

  const clearGuideHideTimer = React.useCallback(() => {
    if (!guideHideTimeoutRef.current) return;
    window.clearTimeout(guideHideTimeoutRef.current);
    guideHideTimeoutRef.current = null;
  }, []);

  const clearAlignmentGuides = React.useCallback(() => {
    clearGuideHideTimer();
    setAlignmentGuides([]);
  }, [clearGuideHideTimer]);

  const showTemporaryGuides = React.useCallback((guides) => {
    clearGuideHideTimer();
    setAlignmentGuides(guides);
    if (!guides.length) return;
    guideHideTimeoutRef.current = window.setTimeout(() => {
      setAlignmentGuides([]);
      guideHideTimeoutRef.current = null;
    }, KEYBOARD_GUIDE_HIDE_MS);
  }, [clearGuideHideTimer]);

  React.useEffect(() => {
    if (!open || !imageUrl) return undefined;
    updatePosterSize();
    const image = imageRef.current;
    if (!image) return undefined;
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updatePosterSize);
      return () => window.removeEventListener("resize", updatePosterSize);
    }
    const observer = new ResizeObserver(updatePosterSize);
    observer.observe(image);
    window.addEventListener("resize", updatePosterSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePosterSize);
    };
  }, [imageUrl, open, updatePosterSize]);

  React.useEffect(() => {
    const handlePointerMove = (event) => {
      const pan = panRef.current;
      if (pan) {
        const viewport = viewportRef.current;
        if (viewport) {
          viewport.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX);
          viewport.scrollTop = pan.scrollTop - (event.clientY - pan.startY);
        }
        return;
      }

      const drag = dragRef.current;
      if (!drag) return;
      const width = drag.rect.width || 1;
      const height = drag.rect.height || 1;
      const dx = ((event.clientX - drag.startX) / width) * 100;
      const dy = ((event.clientY - drag.startY) / height) * 100;
      if (Math.abs(event.clientX - drag.startX) > 2 || Math.abs(event.clientY - drag.startY) > 2) {
        drag.didMove = true;
      }

      const currentAreas = areasRef.current;
      if (drag.mode === "resize") {
        const nextAreas = currentAreas.map((area) => (
          area.id === drag.id
            ? resizeAreaWithOptionalFontScale(drag.area, dx, dy, drag.handle || "se")
            : area
        ));
        areasRef.current = nextAreas;
        setAreas(nextAreas);
        clearAlignmentGuides();
        return;
      }

      clearGuideHideTimer();
      const sourceAreas = drag.groupAreas?.length > 1 ? drag.groupAreas : [drag.area];
      const result = moveAreaGroupWithAlignment(currentAreas, sourceAreas, dx, dy, drag.rect);
      areasRef.current = result.areas;
      setAreas(result.areas);
      setAlignmentGuides(result.guides);
    };

    const handlePointerUp = () => {
      if (dragRef.current) {
        const recentAction = {
          id: dragRef.current.id,
          didMove: Boolean(dragRef.current.didMove),
        };
        recentPointerActionRef.current = recentAction;
        window.setTimeout(() => {
          if (recentPointerActionRef.current === recentAction) {
            recentPointerActionRef.current = null;
          }
        }, 120);
      }
      dragRef.current = null;
      panRef.current = null;
      setIsPanning(false);
      clearAlignmentGuides();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [clearAlignmentGuides, clearGuideHideTimer]);

  const copySelectedAreas = React.useCallback(() => {
    if (!selectedAreas.length) return;
    clipboardRef.current = copyAreasForClipboard(selectedAreas);
  }, [selectedAreas]);

  const insertDuplicatedAreas = React.useCallback((sourceAreas, options = {}) => {
    if (saving || !sourceAreas.length) return;
    const pastedAreas = createPastedAreas(copyAreasForClipboard(sourceAreas));
    if (!pastedAreas.length) return;
    setAreas((current) => [...current, ...pastedAreas]);
    setSelectedIds(pastedAreas.map((area) => area.id));
    if (options.updateClipboard) {
      clipboardRef.current = copyAreasForClipboard(pastedAreas);
    }
  }, [saving]);

  const pasteClipboardAreas = React.useCallback(() => {
    insertDuplicatedAreas(clipboardRef.current, { updateClipboard: true });
  }, [insertDuplicatedAreas]);

  const duplicateSelectedAreas = React.useCallback(() => {
    insertDuplicatedAreas(selectedAreas);
  }, [insertDuplicatedAreas, selectedAreas]);

  const removeSelectedAreas = React.useCallback(() => {
    if (!selectedIds.length) return;
    const ids = new Set(selectedIds);
    setAreas((current) => current.filter((area) => !ids.has(area.id)));
    setSelectedIds([]);
  }, [selectedIds]);

  const updateSelectedAreaStyle = React.useCallback((stylePatch) => {
    if (!selectedId) return;
    setAreas((current) => current.map((area) => {
      if (area.id !== selectedId) return area;
      return {
        ...area,
        style: {
          ...POSTER_AREA_DEFAULT_STYLE,
          ...(area.style || {}),
          ...stylePatch,
        },
      };
    }));
  }, [selectedId]);

  const addArea = (type) => {
    const defaults = getDefaultLayout(type);
    const nextArea = normalizePosterArea({
      id: createAreaId(type),
      type,
      ...defaults,
      style: {
        ...POSTER_AREA_DEFAULT_STYLE,
        ...(defaults.style || {}),
      },
    }, areas.length);
    if (!nextArea) return;
    setAreas((current) => [...current, nextArea]);
    setSelectedIds([nextArea.id]);
  };

  const removeArea = (areaId) => {
    setAreas((current) => current.filter((area) => area.id !== areaId));
    setSelectedIds((current) => current.filter((id) => id !== areaId));
  };

  React.useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (isEditableTarget(event.target)) return;
      const shortcutKey = event.ctrlKey || event.metaKey;
      const key = String(event.key || "").toLowerCase();

      if (shortcutKey && key === "c") {
        if (!selectedAreas.length) return;
        event.preventDefault();
        copySelectedAreas();
        return;
      }

      if (shortcutKey && key === "v") {
        if (!clipboardRef.current.length) return;
        event.preventDefault();
        pasteClipboardAreas();
        return;
      }

      if (shortcutKey && key === "d") {
        if (!selectedAreas.length) return;
        event.preventDefault();
        duplicateSelectedAreas();
        return;
      }

      if (shortcutKey && key === "a") {
        if (!areas.length) return;
        const activeElement = document.activeElement instanceof Element ? document.activeElement : null;
        const isCanvasContext = !activeElement
          || activeElement === document.body
          || Boolean(workspaceRef.current?.contains(activeElement));
        if (!isCanvasContext) return;
        event.preventDefault();
        setSelectedIds(areas.map((area) => area.id));
        return;
      }

      const isDeleteKey = event.key === "Delete" || event.key === "Backspace";
      const isArrowKey = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key);
      if (!selectedIds.length || (!isDeleteKey && !isArrowKey)) return;

      if (isArrowKey) {
        const stageRect = stageRef.current?.getBoundingClientRect();
        const visualWidth = stageRect?.width || (posterSize.width ? posterSize.width * zoom : 0);
        const visualHeight = stageRect?.height || (posterSize.height ? posterSize.height * zoom : 0);
        if (!visualWidth || !visualHeight) return;
        const stepPx = event.altKey ? 0.5 : event.shiftKey ? 10 : 1;
        const xStep = (stepPx / visualWidth) * 100;
        const yStep = (stepPx / visualHeight) * 100;
        const dx = event.key === "ArrowLeft" ? -xStep : event.key === "ArrowRight" ? xStep : 0;
        const dy = event.key === "ArrowUp" ? -yStep : event.key === "ArrowDown" ? yStep : 0;
        event.preventDefault();
        setIsKeyboardNudging(true);
        if (keyboardNudgeTimeoutRef.current) {
          window.clearTimeout(keyboardNudgeTimeoutRef.current);
        }
        keyboardNudgeTimeoutRef.current = window.setTimeout(() => {
          setIsKeyboardNudging(false);
          keyboardNudgeTimeoutRef.current = null;
        }, 400);
        const nextAreas = moveAreaGroupByDelta(areasRef.current, selectedIds, dx, dy);
        areasRef.current = nextAreas;
        setAreas(nextAreas);
        const movedAreas = nextAreas.filter((area) => selectedIds.includes(area.id));
        const guides = movedAreas.length
          ? findAlignmentGuides({
            allAreas: nextAreas,
            sourceAreas: movedAreas,
            movingBounds: areaBounds(movedAreas),
            rect: { width: visualWidth, height: visualHeight },
            thresholdPx: KEYBOARD_GUIDE_THRESHOLD_PX,
          })
          : [];
        showTemporaryGuides(guides);
        return;
      }

      event.preventDefault();
      removeSelectedAreas();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    areas,
    copySelectedAreas,
    duplicateSelectedAreas,
    open,
    pasteClipboardAreas,
    posterSize.height,
    posterSize.width,
    removeSelectedAreas,
    selectedAreas.length,
    selectedIds,
    showTemporaryGuides,
    zoom,
  ]);

  const updateZoom = React.useCallback((nextZoom) => {
    const viewport = viewportRef.current;
    const currentZoom = zoomRef.current;
    const proposed = typeof nextZoom === "function" ? nextZoom(currentZoom) : nextZoom;
    const clampedZoom = clampZoom(proposed);

    if (clampedZoom === currentZoom) return;

    const anchorX = viewport ? viewport.clientWidth / 2 : 0;
    const anchorY = viewport ? viewport.clientHeight / 2 : 0;
    const scrollLeft = viewport?.scrollLeft || 0;
    const scrollTop = viewport?.scrollTop || 0;
    const zoomRatio = clampedZoom / currentZoom;

    zoomRef.current = clampedZoom;
    setZoom(clampedZoom);

    if (!viewport || !Number.isFinite(zoomRatio) || zoomRatio <= 0) return;
    window.requestAnimationFrame(() => {
      if (!viewportRef.current) return;
      viewportRef.current.scrollLeft = (scrollLeft + anchorX) * zoomRatio - anchorX;
      viewportRef.current.scrollTop = (scrollTop + anchorY) * zoomRatio - anchorY;
    });
  }, []);

  const handleCanvasWheel = React.useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const viewport = viewportRef.current;
    if (!viewport) return;
    const deltaMultiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
    const deltaX = event.deltaX * deltaMultiplier;
    const deltaY = event.deltaY * deltaMultiplier;
    if (event.shiftKey) {
      viewport.scrollLeft += deltaY || deltaX;
    } else {
      viewport.scrollTop += deltaY;
      viewport.scrollLeft += deltaX;
    }
  }, []);

  React.useEffect(() => {
    if (!open) return undefined;
    const workspace = workspaceRef.current;
    if (!workspace) return undefined;
    workspace.addEventListener("wheel", handleCanvasWheel, { passive: false });
    return () => workspace.removeEventListener("wheel", handleCanvasWheel);
  }, [handleCanvasWheel, open]);

  const beginPan = (event) => {
    if (saving || event.button !== 0) return;
    if (isPosterAreaTarget(event.target)) return;
    if (isControlTarget(event.target)) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    event.preventDefault();
    setSelectedIds([]);
    clearAlignmentGuides();
    setIsPanning(true);
    panRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };
  };

  const beginPointerAction = (event, area, mode, handle = "") => {
    if (saving) return;
    if (event.button !== undefined && event.button !== 0) return;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    event.stopPropagation();
    const selectionModifier = mode === "move" && (event.shiftKey || event.ctrlKey || event.metaKey);
    if (selectionModifier) {
      setSelectedIds((current) => (
        current.includes(area.id)
          ? current.filter((id) => id !== area.id)
          : [...current, area.id]
      ));
      return;
    }
    const dragSelectedIds = selectedIds.includes(area.id) ? selectedIds : [area.id];
    setSelectedIds(dragSelectedIds);
    const groupAreas = mode === "move" && dragSelectedIds.length > 1
      ? areas.filter((item) => dragSelectedIds.includes(item.id)).map((item) => ({
        ...item,
        style: { ...(item.style || {}) },
      }))
      : [];
    dragRef.current = {
      id: area.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      rect,
      area: { ...area },
      groupAreas,
      handle,
    };
  };

  const handleSave = () => {
    const normalizedAreas = areas.map(normalizePosterArea).filter(Boolean);
    onSave?.(normalizedAreas);
  };

  const selectedStyle = {
    ...POSTER_AREA_DEFAULT_STYLE,
    ...(selectedArea?.style || {}),
  };
  const selectedFontSize = clampFontSize(selectedStyle.fontSize);
  const alignOptions = [
    { value: "right", label: l.alignRight },
    { value: "center", label: l.alignCenter },
    { value: "left", label: l.alignLeft },
  ];
  const selectedAlignOption = alignOptions.find((option) => option.value === selectedStyle.align) || alignOptions[1];
  const hasPosterSize = posterSize.width > 0 && posterSize.height > 0;
  const scaledPosterWidth = hasPosterSize ? posterSize.width * zoom : 0;
  const scaledPosterHeight = hasPosterSize ? posterSize.height * zoom : 0;
  const canvasWidth = hasPosterSize ? scaledPosterWidth + CANVAS_PADDING * 2 : "100%";
  const canvasHeight = hasPosterSize ? scaledPosterHeight + CANVAS_PADDING * 2 : 420;
  const zoomPercent = Math.round(zoom * 100);
  const zoomProgress = clamp(
    ((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100,
    0,
    100
  );

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={l.title}
      width={1120}
      closeOnBackdrop={!saving}
      closeOnEscape={!saving}
    >
      <style>
        {`
          .poster-fill-editor-grid {
            display: grid;
            grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
            gap: 16px;
            align-items: start;
          }
          @media (max-width: 760px) {
            .poster-fill-editor-grid {
              grid-template-columns: 1fr;
            }
          }
          .poster-fill-align-menu {
            position: absolute;
            inset-block-start: calc(100% + 6px);
            inset-inline-end: 0;
            z-index: 20;
            min-width: 140px;
            padding: 6px;
            border: 1px solid rgba(148,163,184,.28);
            border-radius: 12px;
            background: #fff;
            box-shadow: 0 18px 38px rgba(15,23,42,.18);
          }
          .poster-fill-align-menu-item {
            width: 100%;
            border: 0;
            border-radius: 9px;
            background: transparent;
            color: var(--rukn-text);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding: 8px 10px;
            font-family: 'Cairo', sans-serif;
            font-size: 12px;
            font-weight: 900;
            text-align: start;
          }
          .poster-fill-align-menu-item:hover {
            background: rgba(212,175,55,.10);
            color: var(--rukn-gold);
          }
          .poster-fill-zoom-slider {
            width: 138px;
            height: 18px;
            margin: 0;
            appearance: none;
            -webkit-appearance: none;
            background: transparent;
            cursor: pointer;
            direction: ltr;
          }
          .poster-fill-zoom-slider:disabled {
            cursor: not-allowed;
            opacity: .55;
          }
          .poster-fill-zoom-slider::-webkit-slider-runnable-track {
            height: 3px;
            border-radius: 999px;
            background: linear-gradient(
              to right,
              var(--rukn-gold) 0%,
              var(--rukn-gold) var(--poster-fill-zoom-progress),
              rgba(148,163,184,.32) var(--poster-fill-zoom-progress),
              rgba(148,163,184,.32) 100%
            );
          }
          .poster-fill-zoom-slider::-webkit-slider-thumb {
            width: 14px;
            height: 14px;
            margin-top: -5.5px;
            border: 2px solid var(--rukn-gold);
            border-radius: 999px;
            background: #fff;
            box-shadow: 0 3px 10px rgba(15,23,42,.18);
            appearance: none;
            -webkit-appearance: none;
          }
          .poster-fill-zoom-slider::-moz-range-track {
            height: 3px;
            border-radius: 999px;
            background: rgba(148,163,184,.32);
          }
          .poster-fill-zoom-slider::-moz-range-progress {
            height: 3px;
            border-radius: 999px;
            background: var(--rukn-gold);
          }
          .poster-fill-zoom-slider::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border: 2px solid var(--rukn-gold);
            border-radius: 999px;
            background: #fff;
            box-shadow: 0 3px 10px rgba(15,23,42,.18);
          }
        `}
      </style>
      <div className="poster-fill-editor-grid">
        <aside style={{
          border: "1px solid var(--rukn-border-soft)",
          borderRadius: 16,
          background: "var(--rukn-bg-soft)",
          padding: 14,
          display: "grid",
          gap: 14,
          maxHeight: "min(72vh, 720px)",
          overflowY: "auto",
          overscrollBehavior: "contain",
        }}>
          <div style={{
            display: "grid",
            gap: 10,
          }}>
            <p style={{ fontSize: 13, fontWeight: 900, color: "var(--rukn-text)" }}>
              {l.selected}
            </p>
            {selectedArea || hasMultiSelection ? (
              <div style={{
                border: "1px solid rgba(212,175,55,.22)",
                borderRadius: 12,
                background: "rgba(212,175,55,.07)",
                padding: 10,
                display: "grid",
                gap: 4,
              }}>
                <p style={{ fontSize: 12, fontWeight: 900, color: "var(--rukn-gold)" }}>
                  {hasMultiSelection ? formatSelectedCount(selectedCount, lang) : areaLabel(selectedArea.type, lang)}
                </p>
                <p style={{ fontSize: 11, color: "var(--rukn-text-muted)", margin: 0 }}>
                  {hasMultiSelection ? l.selected : l.style}
                </p>
              </div>
            ) : (
              <div style={{
                border: "1px dashed var(--rukn-border-soft)",
                borderRadius: 12,
                background: "var(--rukn-bg-card)",
                padding: 12,
              }}>
                <p style={{ fontSize: 12, color: "var(--rukn-text-muted)", lineHeight: 1.7, margin: 0 }}>
                  {l.selectAreaHint}
                </p>
              </div>
            )}
          </div>

          <div style={{
            borderTop: "1px solid var(--rukn-border-soft)",
            paddingTop: 13,
          }}>
            <p style={{ fontSize: 13, fontWeight: 900, color: "var(--rukn-text)", marginBottom: 8 }}>
              {l.available}
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              {availableAreaGroups.map((group, groupIndex) => (
                <section
                  key={group.key}
                  style={{
                    display: "grid",
                    gap: 6,
                    paddingTop: groupIndex === 0 ? 0 : 4,
                  }}
                >
                  <p style={{
                    fontSize: 11,
                    fontWeight: 900,
                    color: "var(--rukn-text-muted)",
                    margin: "0 2px",
                    lineHeight: 1.4,
                  }}>
                    {areaGroupLabel(group, lang)}
                  </p>
                  {group.types.map((type) => (
                    <button
                      key={type}
                      type="button"
                      disabled={saving || !imageUrl}
                      aria-label={`${l.add} ${areaLabel(type, lang)}`}
                      onClick={() => addArea(type)}
                      style={{
                        border: "1px solid var(--rukn-border-soft)",
                        background: "var(--rukn-bg-card)",
                        color: "var(--rukn-text)",
                        borderRadius: 12,
                        padding: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        cursor: saving || !imageUrl ? "not-allowed" : "pointer",
                        fontFamily: "'Cairo',sans-serif",
                        textAlign: "start",
                      }}
                    >
                      <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 900 }}>
                          {areaLabel(type, lang)}
                        </span>
                        <span style={{
                          fontSize: 10.5,
                          color: "var(--rukn-text-muted)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}>
                          {type === "departure_date" || type === "return_date" ? (
                            <AreaPreviewContent area={{ type }} lang={lang} />
                          ) : Array.isArray(SAMPLE_TEXT[type]?.[lang])
                            ? SAMPLE_TEXT[type][lang][0]
                            : SAMPLE_TEXT[type]?.[lang] || SAMPLE_TEXT[type]?.ar}
                        </span>
                      </span>
                      <span style={{
                        width: 28,
                        height: 28,
                        borderRadius: 9,
                        border: "1px solid rgba(212,175,55,.25)",
                        color: "var(--rukn-gold)",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}>
                        <AppIcon name="plus" size={15} />
                      </span>
                    </button>
                  ))}
                </section>
              ))}
            </div>
          </div>
        </aside>

        <section
          ref={workspaceRef}
          onPointerDown={beginPan}
          style={{
          border: "1px solid rgba(148,163,184,.26)",
          borderRadius: 18,
          background: "#f8fafc",
          minHeight: 420,
          padding: 16,
          display: "grid",
          gridTemplateRows: "auto minmax(0,1fr)",
          gap: 12,
          overflow: "hidden",
          overscrollBehavior: "contain",
          cursor: isPanning ? "grabbing" : imageUrl ? "grab" : "default",
        }}>
          <div data-poster-editor-control="true" style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            justifySelf: "stretch",
            border: "1px solid rgba(148,163,184,.32)",
            background: "#ffffff",
            borderRadius: 14,
            padding: 6,
            boxShadow: "0 10px 28px rgba(15,23,42,.10)",
          }}>
            {selectedArea ? (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
                minWidth: 0,
              }}>
                <span style={{
                  maxWidth: 150,
                  borderRadius: 999,
                  background: "rgba(212,175,55,.10)",
                  border: "1px solid rgba(212,175,55,.22)",
                  color: "var(--rukn-gold)",
                  fontSize: 11,
                  fontWeight: 900,
                  padding: "7px 10px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {areaLabel(selectedArea.type, lang)}
                </span>
                <input
                  type="color"
                  value={selectedStyle.color}
                  aria-label={l.textColor}
                  onChange={(event) => updateSelectedAreaStyle({ color: event.target.value })}
                  disabled={saving}
                  style={{
                    width: 32,
                    height: 32,
                    border: "1px solid rgba(148,163,184,.42)",
                    borderRadius: 10,
                    background: "#f8fafc",
                    padding: 3,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                />
                {COLOR_PRESETS.slice(0, 4).map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    disabled={saving}
                    onClick={() => updateSelectedAreaStyle({ color })}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      border: selectedStyle.color.toLowerCase() === color.toLowerCase()
                        ? "2px solid var(--rukn-gold)"
                        : "1px solid rgba(148,163,184,.42)",
                      background: color,
                      cursor: saving ? "not-allowed" : "pointer",
                    }}
                  />
                ))}
                <span style={{
                  display: "grid",
                  gridTemplateColumns: "28px 56px 28px",
                  alignItems: "center",
                  gap: 4,
                }}>
                  <button
                    type="button"
                    aria-label={`${l.fontSize} -`}
                    disabled={saving || selectedFontSize <= POSTER_AREA_MIN_FONT_SIZE}
                    onClick={() => updateSelectedAreaStyle({ fontSize: clampFontSize(selectedFontSize - 1) })}
                    style={{
                      width: 28,
                      height: 32,
                      borderRadius: 9,
                      border: "1px solid rgba(148,163,184,.42)",
                      background: "#f8fafc",
                      color: "var(--rukn-text)",
                      cursor: saving || selectedFontSize <= POSTER_AREA_MIN_FONT_SIZE ? "not-allowed" : "pointer",
                      fontWeight: 900,
                    }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={POSTER_AREA_MIN_FONT_SIZE}
                    max={POSTER_AREA_MAX_FONT_SIZE}
                    value={selectedFontSize}
                    aria-label={l.fontSize}
                    onChange={(event) => updateSelectedAreaStyle({ fontSize: clampFontSize(event.target.value) })}
                    disabled={saving}
                    style={{
                      width: 56,
                      height: 32,
                      borderRadius: 9,
                      border: "1px solid rgba(148,163,184,.42)",
                      background: "#f8fafc",
                      color: "var(--rukn-text)",
                      fontFamily: "'Cairo',sans-serif",
                      fontSize: 12,
                      fontWeight: 900,
                      textAlign: "center",
                    }}
                  />
                  <button
                    type="button"
                    aria-label={`${l.fontSize} +`}
                    disabled={saving || selectedFontSize >= POSTER_AREA_MAX_FONT_SIZE}
                    onClick={() => updateSelectedAreaStyle({ fontSize: clampFontSize(selectedFontSize + 1) })}
                    style={{
                      width: 28,
                      height: 32,
                      borderRadius: 9,
                      border: "1px solid rgba(148,163,184,.42)",
                      background: "#f8fafc",
                      color: "var(--rukn-text)",
                      cursor: saving || selectedFontSize >= POSTER_AREA_MAX_FONT_SIZE ? "not-allowed" : "pointer",
                      fontWeight: 900,
                    }}
                  >
                    +
                  </button>
                </span>
                <button
                  type="button"
                  aria-label={l.bold}
                  disabled={saving}
                  onClick={() => updateSelectedAreaStyle({ fontWeight: selectedStyle.fontWeight === "700" ? "400" : "700" })}
                  style={{
                    width: 34,
                    height: 32,
                    borderRadius: 9,
                    border: "1px solid rgba(148,163,184,.42)",
                    background: selectedStyle.fontWeight === "700" ? "rgba(212,175,55,.14)" : "#f8fafc",
                    color: selectedStyle.fontWeight === "700" ? "var(--rukn-gold)" : "var(--rukn-text)",
                    cursor: saving ? "not-allowed" : "pointer",
                    fontFamily: "Arial, sans-serif",
                    fontSize: 14,
                    fontWeight: 900,
                  }}
                >
                  B
                </button>
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    aria-label={l.align}
                    disabled={saving}
                    onClick={() => setAlignMenuOpen((current) => !current)}
                    style={{
                      height: 32,
                      minWidth: 70,
                      borderRadius: 9,
                      border: "1px solid rgba(148,163,184,.42)",
                      background: alignMenuOpen ? "rgba(212,175,55,.12)" : "#f8fafc",
                      color: alignMenuOpen ? "var(--rukn-gold)" : "var(--rukn-text)",
                      cursor: saving ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      fontFamily: "'Cairo',sans-serif",
                      fontSize: 12,
                      fontWeight: 900,
                      padding: "0 10px",
                    }}
                  >
                    <span>{selectedAlignOption.label}</span>
                    <span aria-hidden="true" style={{ fontSize: 10 }}>▾</span>
                  </button>
                  {alignMenuOpen ? (
                    <div className="poster-fill-align-menu" role="menu">
                      {alignOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className="poster-fill-align-menu-item"
                          role="menuitem"
                          onClick={() => {
                            updateSelectedAreaStyle({ align: option.value });
                            setAlignMenuOpen(false);
                          }}
                        >
                          <span>{option.label}</span>
                          <span style={{
                            width: 18,
                            color: option.value === selectedStyle.align ? "var(--rukn-gold)" : "transparent",
                          }}>
                            ✓
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label={l.remove}
                  disabled={saving}
                  onClick={() => removeArea(selectedArea.id)}
                  style={{
                    width: 34,
                    height: 32,
                    borderRadius: 9,
                    border: "1px solid rgba(220,38,38,.24)",
                    background: "rgba(220,38,38,.08)",
                    color: "#dc2626",
                    cursor: saving ? "not-allowed" : "pointer",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <AppIcon name="trash" size={15} />
                </button>
              </div>
            ) : hasMultiSelection ? (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
                minWidth: 0,
              }}>
                <span style={{
                  borderRadius: 999,
                  background: "rgba(212,175,55,.10)",
                  border: "1px solid rgba(212,175,55,.22)",
                  color: "var(--rukn-gold)",
                  fontSize: 11,
                  fontWeight: 900,
                  padding: "7px 10px",
                  whiteSpace: "nowrap",
                }}>
                  {formatSelectedCount(selectedCount, lang)}
                </span>
                <button
                  type="button"
                  aria-label={l.copy}
                  disabled={saving}
                  onClick={copySelectedAreas}
                  style={{
                    height: 32,
                    borderRadius: 9,
                    border: "1px solid rgba(148,163,184,.42)",
                    background: "#f8fafc",
                    color: "var(--rukn-text)",
                    cursor: saving ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    fontFamily: "'Cairo',sans-serif",
                    fontSize: 12,
                    fontWeight: 900,
                    padding: "0 10px",
                  }}
                >
                  <AppIcon name="copy" size={14} />
                  <span>{l.copy}</span>
                </button>
                <button
                  type="button"
                  aria-label={l.duplicate}
                  disabled={saving}
                  onClick={duplicateSelectedAreas}
                  style={{
                    height: 32,
                    borderRadius: 9,
                    border: "1px solid rgba(212,175,55,.24)",
                    background: "rgba(212,175,55,.10)",
                    color: "var(--rukn-gold)",
                    cursor: saving ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    fontFamily: "'Cairo',sans-serif",
                    fontSize: 12,
                    fontWeight: 900,
                    padding: "0 10px",
                  }}
                >
                  <AppIcon name="copy" size={14} />
                  <span>{l.duplicate}</span>
                </button>
                <button
                  type="button"
                  aria-label={l.remove}
                  disabled={saving}
                  onClick={removeSelectedAreas}
                  style={{
                    width: 34,
                    height: 32,
                    borderRadius: 9,
                    border: "1px solid rgba(220,38,38,.24)",
                    background: "rgba(220,38,38,.08)",
                    color: "#dc2626",
                    cursor: saving ? "not-allowed" : "pointer",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <AppIcon name="trash" size={15} />
                </button>
              </div>
            ) : (
              <span />
            )}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "nowrap",
              marginInlineStart: "auto",
              minHeight: 34,
              paddingInline: 2,
            }}>
            <span style={{
              minWidth: 46,
              color: "var(--rukn-gold)",
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              fontWeight: 900,
              lineHeight: 1,
            }}>
              {zoomPercent}%
            </span>
            <input
              className="poster-fill-zoom-slider"
              type="range"
              min={Math.round(MIN_ZOOM * 100)}
              max={Math.round(MAX_ZOOM * 100)}
              step={1}
              value={zoomPercent}
              aria-label="Zoom"
              disabled={!imageUrl || saving}
              onChange={(event) => updateZoom(Number(event.target.value) / 100)}
              style={{
                "--poster-fill-zoom-progress": `${zoomProgress}%`,
              }}
            />
            </div>
          </div>
          <div
            ref={viewportRef}
            style={{
              height: "min(68vh, 680px)",
              minHeight: 380,
              overflow: "auto",
              overscrollBehavior: "contain",
              cursor: isPanning ? "grabbing" : imageUrl ? "grab" : "default",
              userSelect: isPanning ? "none" : "auto",
              borderRadius: 14,
              background: "#ffffff",
              border: "1px solid rgba(148,163,184,.24)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.8)",
            }}
          >
          {imageUrl ? (
            <div
              style={{
                position: "relative",
                width: canvasWidth,
                height: canvasHeight,
                minWidth: "100%",
                minHeight: 380,
              }}
            >
              <div
                ref={stageRef}
                style={{
                  position: hasPosterSize ? "absolute" : "relative",
                  left: hasPosterSize ? CANVAS_PADDING : "50%",
                  top: hasPosterSize ? CANVAS_PADDING : 0,
                  display: "inline-block",
                  width: hasPosterSize ? posterSize.width : "auto",
                  height: hasPosterSize ? posterSize.height : "auto",
                  boxShadow: "0 22px 60px rgba(0,0,0,.28)",
                  borderRadius: 12,
                  overflow: "visible",
                  touchAction: "none",
                  transformOrigin: "top left",
                  transform: hasPosterSize ? `scale(${zoom})` : `translateX(-50%) scale(${zoom})`,
                }}
              >
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt={template?.name || ""}
                  onLoad={updatePosterSize}
                  style={{
                    display: "block",
                    width: hasPosterSize ? posterSize.width : "auto",
                    height: hasPosterSize ? posterSize.height : "auto",
                    maxWidth: hasPosterSize ? "none" : "min(100%, 760px)",
                    maxHeight: hasPosterSize ? "none" : "min(64vh, 680px)",
                    borderRadius: 12,
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                  draggable={false}
                />
                {alignmentGuides.map((guide, index) => {
                  const strong = guide.strength === "strong";
                  const lineSize = (strong ? 1.8 : 1.2) / zoom;
                  const lineColor = strong ? "rgba(212,175,55,.82)" : "rgba(37,99,235,.56)";
                  const commonGuideStyle = {
                    position: "absolute",
                    pointerEvents: "none",
                    zIndex: 1,
                    background: lineColor,
                    boxShadow: strong
                      ? "0 0 0 1px rgba(212,175,55,.16), 0 0 12px rgba(212,175,55,.24)"
                      : "0 0 10px rgba(37,99,235,.14)",
                  };
                  return (
                    <span
                      key={`${guide.axis}-${guide.position}-${index}`}
                      aria-hidden="true"
                      style={{
                        ...commonGuideStyle,
                        ...(guide.axis === "x"
                          ? {
                            top: 0,
                            bottom: 0,
                            left: `${guide.position}%`,
                            width: lineSize,
                            transform: "translateX(-50%)",
                          }
                          : {
                            left: 0,
                            right: 0,
                            top: `${guide.position}%`,
                            height: lineSize,
                            transform: "translateY(-50%)",
                          }),
                      }}
                    />
                  );
                })}
                {areas.map((area) => {
                  const selected = selectedIdSet.has(area.id);
                  const showSelectionChrome = selected && !isKeyboardNudging;
                  const showResizeHandles = showSelectionChrome && !hasMultiSelection;
                  const style = area.style || POSTER_AREA_DEFAULT_STYLE;
                  const previewTextCss = getPosterPreviewTextCss(style, { type: area.type });
                  return (
                    <div
                      key={area.id}
                      data-poster-area="true"
                      onPointerDown={(event) => beginPointerAction(event, area, "move")}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (event.shiftKey || event.ctrlKey || event.metaKey) return;
                        const recentAction = recentPointerActionRef.current;
                        if (recentAction?.id === area.id && recentAction.didMove) return;
                        setSelectedIds([area.id]);
                      }}
                    style={{
                      position: "absolute",
                      left: `${area.x}%`,
                      top: `${area.y}%`,
                      width: `${area.width}%`,
                      height: `${area.height}%`,
                      minWidth: 30,
                      minHeight: 24,
                      border: selected
                        ? `${2 / zoom}px solid ${showSelectionChrome ? "var(--rukn-gold)" : "transparent"}`
                        : `${1 / zoom}px solid transparent`,
                      background: showSelectionChrome ? "rgba(212,175,55,.08)" : "transparent",
                      boxShadow: showSelectionChrome ? "0 0 0 3px rgba(212,175,55,.12)" : "none",
                      borderRadius: 8,
                      cursor: saving ? "default" : "move",
                      overflow: "visible",
                      userSelect: "none",
                      touchAction: "none",
                      zIndex: selected ? 3 : 2,
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: 7,
                        overflow: "hidden",
                        padding: previewTextCss.paddingCss,
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: previewTextCss.alignItems,
                        justifyContent: style.align === "left" ? "flex-start" : style.align === "right" ? "flex-end" : "center",
                        color: style.color || POSTER_AREA_DEFAULT_STYLE.color,
                        fontSize: `${clampFontSize(style.fontSize)}px`,
                        fontWeight: style.fontWeight,
                        textAlign: style.align,
                        lineHeight: previewTextCss.lineHeightCss,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        pointerEvents: "none",
                      }}
                    >
                      <AreaPreviewContent area={area} lang={lang} />
                    </div>
                    {showResizeHandles && RESIZE_HANDLES.map((handle) => {
                      const isHorizontalEdge = ["n", "s"].includes(handle.key);
                      const isVerticalEdge = ["e", "w"].includes(handle.key);
                      const stablePosition = Object.fromEntries(
                        Object.entries(handle.style).map(([key, value]) => [
                          key,
                          typeof value === "number" ? value / zoom : value,
                        ])
                      );
                      return (
                        <span
                          key={handle.key}
                          data-resize-handle="true"
                          onPointerDown={(event) => beginPointerAction(event, area, "resize", handle.key)}
                          style={{
                            position: "absolute",
                            width: (isHorizontalEdge ? 22 : 10) / zoom,
                            height: (isVerticalEdge ? 22 : 10) / zoom,
                            borderRadius: 999,
                            border: `${1 / zoom}px solid rgba(20,20,20,.45)`,
                            background: "var(--rukn-gold)",
                            boxShadow: "0 2px 8px rgba(0,0,0,.25)",
                            cursor: saving ? "default" : handle.cursor,
                            zIndex: 2,
                            ...stablePosition,
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10, placeItems: "center", color: "var(--rukn-text-muted)" }}>
              <AppIcon name="file" size={28} />
              <p style={{ fontSize: 13, fontWeight: 800 }}>{l.noImage}</p>
            </div>
          )}
          </div>
        </section>
      </div>

      <div style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 10,
        flexWrap: "wrap",
        marginTop: 18,
      }}>
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          {l.cancel}
        </Button>
        <Button variant="primary" icon="save" onClick={handleSave} disabled={saving || !imageUrl}>
          {saving ? l.saving : l.save}
        </Button>
      </div>
    </Modal>
  );
}
