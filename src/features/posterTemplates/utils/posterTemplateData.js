export const POSTER_TEMPLATE_BUCKET = "program-poster-templates";
export const LOCAL_POSTER_TEMPLATES_KEY = "rukn_program_poster_templates_local_v1";
export const POSTER_TEMPLATE_MAX_BYTES = 12 * 1024 * 1024;
export const POSTER_TEMPLATE_DEFAULT_LEVELS_COUNT = 3;
export const POSTER_TEMPLATE_LEVEL_COUNT_OPTIONS = [1, 2, 3, 4, 5];

export const POSTER_TEMPLATE_TYPES = ["umrah", "hajj"];

// Program poster levels are ordered from lowest-priced level (1) to highest level (5).
const POSTER_LEVELS = [
  { number: 1 },
  { number: 2 },
  { number: 3 },
  { number: 4 },
  { number: 5 },
];

const POSTER_ROOM_PRICE_FIELDS = [
  { key: "double_price", ar: "ثنائية", fr: "Double", en: "Double" },
  { key: "triple_price", ar: "ثلاثية", fr: "Triple", en: "Triple" },
  { key: "quad_price", ar: "رباعية", fr: "Quad", en: "Quad" },
  { key: "quint_price", ar: "خماسية", fr: "Quint", en: "Quint" },
];

export const POSTER_AREA_GENERAL_TYPES = [
  "program_name",
  "starting_price",
  "departure_date",
  "return_date",
  "flight_info",
  "poster_travel_route",
];

const POSTER_AREA_LEVEL_TYPES = POSTER_LEVELS.map(({ number }) => `level_${number}_name`);
const POSTER_AREA_MAKKAH_HOTEL_TYPES = POSTER_LEVELS.map(({ number }) => `makkah_hotel_l${number}`);
const POSTER_AREA_MADINAH_HOTEL_TYPES = POSTER_LEVELS.map(({ number }) => `madinah_hotel_l${number}`);
const POSTER_AREA_ROOM_PRICE_TYPES = POSTER_LEVELS.flatMap(({ number }) => (
  POSTER_ROOM_PRICE_FIELDS.map(({ key }) => `level_${number}_${key}`)
));

export const POSTER_AREA_AVAILABLE_GROUPS = [
  {
    key: "program_info",
    label: { ar: "معلومات البرنامج", fr: "Infos programme", en: "Program info" },
    types: POSTER_AREA_GENERAL_TYPES,
  },
  {
    key: "program_levels",
    label: { ar: "مستويات البرنامج", fr: "Niveaux du programme", en: "Program levels" },
    types: POSTER_AREA_LEVEL_TYPES,
  },
  {
    key: "makkah_hotels",
    label: { ar: "فنادق مكة", fr: "Hôtels La Mecque", en: "Makkah hotels" },
    types: POSTER_AREA_MAKKAH_HOTEL_TYPES,
  },
  {
    key: "madinah_hotels",
    label: { ar: "فنادق المدينة", fr: "Hôtels Médine", en: "Madinah hotels" },
    types: POSTER_AREA_MADINAH_HOTEL_TYPES,
  },
  {
    key: "room_prices",
    label: { ar: "أسعار الغرف", fr: "Prix chambres", en: "Room prices" },
    types: POSTER_AREA_ROOM_PRICE_TYPES,
  },
];

export const POSTER_AREA_AVAILABLE_TYPES = POSTER_AREA_AVAILABLE_GROUPS.flatMap((group) => group.types);

export const POSTER_AREA_LEGACY_TYPES = [
  "levels_prices_table",
  ...POSTER_LEVELS.map(({ number }) => `level_${number}`),
  ...POSTER_LEVELS.map(({ number }) => `hotel_${number}`),
  ...POSTER_LEVELS.flatMap(({ number }) => [
    `level_${number}_makkah_hotel`,
    `level_${number}_madinah_hotel`,
    `double_l${number}`,
    `triple_l${number}`,
    `quad_l${number}`,
    `quint_l${number}`,
  ]),
];

export const POSTER_AREA_TYPES = Array.from(new Set([
  ...POSTER_AREA_AVAILABLE_TYPES,
  ...POSTER_AREA_LEGACY_TYPES,
]));

export const POSTER_TEMPLATE_TYPE_LABELS = {
  umrah: {
    ar: "عمرة",
    fr: "Omra",
    en: "Umrah",
  },
  hajj: {
    ar: "حج",
    fr: "Hajj",
    en: "Hajj",
  },
};

const createPosterAreaLabels = () => {
  const labels = {
    program_name: {
      ar: "اسم البرنامج",
      fr: "Nom du programme",
      en: "Program name",
    },
    starting_price: {
      ar: "السعر ابتداء من",
      fr: "Prix à partir de",
      en: "Starting price",
    },
    departure_date: {
      ar: "تاريخ الذهاب",
      fr: "Date de départ",
      en: "Departure date",
    },
    return_date: {
      ar: "تاريخ العودة",
      fr: "Date de retour",
      en: "Return date",
    },
    flight_info: {
      ar: "معلومات الطيران",
      fr: "Informations de vol",
      en: "Flight info",
    },
    poster_travel_route: {
      ar: "خط الرحلة",
      fr: "Itinéraire",
      en: "Travel route",
    },
    levels_prices_table: {
      ar: "جدول المستويات والأسعار",
      fr: "Tableau des niveaux et prix",
      en: "Levels and prices table",
    },
  };

  POSTER_LEVELS.forEach((level) => {
    labels[`level_${level.number}_name`] = {
      ar: `المستوى ${level.number}`,
      fr: `Niveau ${level.number}`,
      en: `Level ${level.number}`,
    };
    labels[`level_${level.number}`] = labels[`level_${level.number}_name`];
    labels[`hotel_${level.number}`] = {
      ar: `فندق ${level.number}`,
      fr: `Hôtel ${level.number}`,
      en: `Hotel ${level.number}`,
    };
    labels[`makkah_hotel_l${level.number}`] = {
      ar: `مكة ${level.number}`,
      fr: `La Mecque ${level.number}`,
      en: `Makkah ${level.number}`,
    };
    labels[`madinah_hotel_l${level.number}`] = {
      ar: `مدينة ${level.number}`,
      fr: `Médine ${level.number}`,
      en: `Madinah ${level.number}`,
    };
    labels[`level_${level.number}_makkah_hotel`] = {
      ar: `مكة ${level.number}`,
      fr: `La Mecque ${level.number}`,
      en: `Makkah ${level.number}`,
    };
    labels[`level_${level.number}_madinah_hotel`] = {
      ar: `مدينة ${level.number}`,
      fr: `Médine ${level.number}`,
      en: `Madinah ${level.number}`,
    };
    POSTER_ROOM_PRICE_FIELDS.forEach((field) => {
      labels[`level_${level.number}_${field.key}`] = {
        ar: `${field.ar} م${level.number}`,
        fr: `${field.fr} N${level.number}`,
        en: `${field.en} L${level.number}`,
      };
      labels[`${field.key.replace("_price", "")}_l${level.number}`] = labels[`level_${level.number}_${field.key}`];
    });
  });

  return labels;
};

export const POSTER_AREA_LABELS = createPosterAreaLabels();

export const POSTER_AREA_DEFAULT_STYLE = {
  fontSize: 18,
  color: "#111827",
  align: "center",
  fontWeight: "700",
};

export const POSTER_AREA_MIN_FONT_SIZE = 3;
export const POSTER_AREA_MAX_FONT_SIZE = 96;

export const normalizePosterTemplateType = (programType) => (
  programType === "hajj" ? "hajj" : "umrah"
);

export const normalizePosterTemplateLevelsCount = (value) => {
  const count = Number(value);
  if (!Number.isFinite(count)) return POSTER_TEMPLATE_DEFAULT_LEVELS_COUNT;
  return Math.min(5, Math.max(1, Math.round(count)));
};

export const normalizePosterAreaType = (type) => (
  POSTER_AREA_TYPES.includes(type) ? type : ""
);

const clampNumber = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

export const normalizePosterAreaStyle = (style = {}) => {
  const fontWeight = style.fontWeight === "400" || style.fontWeight === "normal" ? "400" : "700";
  const align = ["left", "center", "right"].includes(style.align) ? style.align : POSTER_AREA_DEFAULT_STYLE.align;
  const optionalStyle = {};
  if (style.paddingX !== undefined) optionalStyle.paddingX = clampNumber(style.paddingX, 0, 40, 0);
  if (style.paddingY !== undefined) optionalStyle.paddingY = clampNumber(style.paddingY, 0, 40, 0);
  if (style.lineHeight !== undefined) optionalStyle.lineHeight = clampNumber(style.lineHeight, 1.05, 1.6, 1.18);
  if (style.minFontSize !== undefined) optionalStyle.minFontSize = clampNumber(style.minFontSize, POSTER_AREA_MIN_FONT_SIZE, POSTER_AREA_MAX_FONT_SIZE, POSTER_AREA_MIN_FONT_SIZE);
  if (style.maxLines !== undefined) optionalStyle.maxLines = Math.max(1, Math.round(clampNumber(style.maxLines, 1, 20, 1)));
  if (style.autoFit !== undefined) optionalStyle.autoFit = style.autoFit !== false;
  if (style.wrap !== undefined) optionalStyle.wrap = style.wrap !== false;
  if (["top", "middle", "bottom"].includes(style.verticalAlign)) optionalStyle.verticalAlign = style.verticalAlign;
  return {
    fontSize: clampNumber(style.fontSize, POSTER_AREA_MIN_FONT_SIZE, POSTER_AREA_MAX_FONT_SIZE, POSTER_AREA_DEFAULT_STYLE.fontSize),
    color: String(style.color || POSTER_AREA_DEFAULT_STYLE.color).trim().slice(0, 40) || POSTER_AREA_DEFAULT_STYLE.color,
    align,
    fontWeight,
    ...optionalStyle,
  };
};

export const normalizePosterArea = (area = {}, index = 0) => {
  const type = normalizePosterAreaType(area.type);
  if (!type) return null;
  const isHotelField = /^hotel_\d+$/.test(type)
    || /^(makkah|madinah)_hotel_l\d+$/.test(type)
    || /^level_\d+_.*_hotel$/.test(type);
  const isPriceField = /^level_\d+_.*_price$/.test(type) || /^(double|triple|quad|quint)_l\d+$/.test(type);
  const defaultWidth = type === "levels_prices_table" ? 58 : isPriceField ? 24 : isHotelField ? 34 : 38;
  const defaultHeight = type === "levels_prices_table" ? 20 : isPriceField ? 6 : 9;
  const width = clampNumber(area.width, 6, 100, defaultWidth);
  const height = clampNumber(area.height, 4, 100, defaultHeight);
  const x = clampNumber(area.x, 0, Math.max(0, 100 - width), 18);
  const y = clampNumber(area.y, 0, Math.max(0, 100 - height), 16);
  return {
    id: String(area.id || `${type}-${index + 1}`),
    type,
    x,
    y,
    width,
    height,
    style: normalizePosterAreaStyle(area.style),
  };
};

const extensionFromFile = (file) => {
  const type = String(file?.type || "").toLowerCase();
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
};

export const buildPosterTemplatePath = ({ agencyId, templateId, file } = {}) => {
  const safeAgencyId = String(agencyId || "").trim();
  const safeTemplateId = String(templateId || "").trim();
  if (!safeAgencyId || !safeTemplateId || !file) return "";
  return `agencies/${safeAgencyId}/program-poster-templates/${safeTemplateId}/blank.${extensionFromFile(file)}`;
};

export const validatePosterTemplateFile = (file) => {
  if (!file) return { valid: false, reason: "missing" };
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) return { valid: false, reason: "type" };
  if (file.size > POSTER_TEMPLATE_MAX_BYTES) return { valid: false, reason: "size" };
  return { valid: true };
};

export const normalizePosterTemplate = (template = {}) => ({
  id: template.id || "",
  name: template.name || "",
  programType: normalizePosterTemplateType(template.programType || template.program_type),
  levelsCount: normalizePosterTemplateLevelsCount(template.levelsCount ?? template.levels_count),
  imagePath: template.imagePath || template.image_path || "",
  fileName: template.fileName || template.file_name || "",
  fileSize: Number(template.fileSize ?? template.file_size ?? 0) || 0,
  dataUrl: template.dataUrl || template.data_url || "",
  areas: Array.isArray(template.areas)
    ? template.areas.map(normalizePosterArea).filter(Boolean)
    : [],
  createdAt: template.createdAt || template.created_at || "",
  updatedAt: template.updatedAt || template.updated_at || "",
});

export const toPosterTemplatePayload = (template = {}) => {
  const normalized = normalizePosterTemplate(template);
  return {
    ...normalized,
    name: normalized.name.trim(),
    programType: normalizePosterTemplateType(normalized.programType),
  };
};
