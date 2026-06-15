const A4_LANDSCAPE = { widthPt: 841.89, heightPt: 595.28 };
const PDF_SCALE = 2;
const ROOM_TYPE_ORDER = ["double", "triple", "quad", "quint"];
const ROOM_TYPE_CAPACITY = {
  single: 1,
  double: 2,
  triple: 3,
  quad: 4,
  quint: 5,
  quintuple: 5,
};
const CITY_ORDER = ["makkah", "madinah"];
const FLOW_LAYOUT = {
  contentTop: 90,
  contentBottom: 576,
  columns: 6,
  gapX: 7,
  gapY: 5,
  groupGap: 2,
  sectionTitleHeight: 15,
  sectionTitleGap: 4,
};
const MANUAL_ROOM_NUMBER_LABEL = "غرفة رقم :";
const ROOMING_PRINT_FONT_FAMILY = "\"IBM Plex Sans Arabic\", \"Cairo\", \"Tajawal\", Arial, sans-serif";
const SINGLE_LINE_SOURCE_MIN_PT = 4.2;
const SINGLE_LINE_SOURCE_MIN_PX = 4.8;
const SOURCE_MAX_WIDTH_RATIO = 0.28;
const OCCUPANT_NAME_MAX_PT = 7.5;
const OCCUPANT_NAME_MAX_PX = 10;
const ROOMING_NAME_FONT_SIZE_DEFAULT = 13;
const ROOMING_NAME_FONT_SIZE_MIN = 9;
const ROOMING_NAME_FONT_SIZE_MAX = 18;
const DENSITY_CONFIGS = {
  comfortable: {
    columns: 5,
    gapX: 9,
    gapY: 7,
    groupGap: 3,
    sectionTitleHeight: 16,
    sectionTitleGap: 4.5,
    writeAreaHeight: 17,
    writeAreaGap: 0,
    cardPadX: 6,
    cardPadBottom: 0,
    chipGap: 0,
    chipMinHeight: 24,
    chipHorizontalPad: 6,
    fontLarge: 10.8,
    fontNormal: 10.1,
    fontSmall: 8.5,
    fontTiny: 7.8,
    nameFontMin: 8.4,
    nameFontMax: 11.4,
    nameLineRatio: 1.08,
    nameVerticalPad: 3,
    sourceFontOffset: 2.2,
    sourceFontMin: 5.6,
    sourceFontMax: 6.4,
    minCardHeight: 104,
    rowMaxHeight: 190,
    maxCardWidth: 154,
    maxNameLines: 8,
    html: {
      cardPadding: "0",
      cardGap: "2.2mm",
      writeHeight: "6mm",
      writeMargin: "0",
      itemPadding: ".7mm 1.6mm",
      itemGap: "0",
      itemMinHeight: "8.2mm",
      nameFont: "13.2px",
      nameLine: "1.08",
      nameFontMin: "11px",
      nameFontMax: "15px",
      sourceFont: "6.8px",
    },
  },
  normal: {
    columns: FLOW_LAYOUT.columns,
    gapX: FLOW_LAYOUT.gapX,
    gapY: FLOW_LAYOUT.gapY,
    groupGap: FLOW_LAYOUT.groupGap,
    sectionTitleHeight: FLOW_LAYOUT.sectionTitleHeight,
    sectionTitleGap: FLOW_LAYOUT.sectionTitleGap,
    writeAreaHeight: 14,
    writeAreaGap: 0,
    cardPadX: 5,
    cardPadBottom: 0,
    chipGap: 0,
    chipMinHeight: 19,
    chipHorizontalPad: 5,
    fontLarge: 9.8,
    fontNormal: 9.4,
    fontSmall: 8.1,
    fontTiny: 7.5,
    nameFontScale: 0.78,
    nameFontMin: 7.8,
    nameFontMax: 10.2,
    nameLineRatio: 1.07,
    nameVerticalPad: 3,
    sourceFontOffset: 2.2,
    sourceFontMin: 5.8,
    sourceFontMax: 6.8,
    minCardHeight: 86,
    rowMaxHeight: 170,
    maxCardWidth: 132,
    maxNameLines: 8,
    html: {
      cardPadding: "0",
      cardGap: "1.7mm",
      writeHeight: "5mm",
      writeMargin: "0",
      itemPadding: ".5mm 1.3mm",
      itemGap: "0",
      itemMinHeight: "6.7mm",
      nameFont: "12.1px",
      nameLine: "1.08",
      nameFontMin: "10.3px",
      nameFontMax: "13.6px",
      nameHardMax: "10.8px",
      sourceFont: "7.2px",
      headerFont: "8.8px",
      bedFont: "8.8px",
    },
  },
  compact: {
    columns: 7,
    gapX: 5,
    gapY: 3.5,
    groupGap: 1.5,
    sectionTitleHeight: 13,
    sectionTitleGap: 3,
    writeAreaHeight: 11,
    writeAreaGap: 0,
    cardPadX: 4,
    cardPadBottom: 0,
    chipGap: 0,
    chipMinHeight: 15,
    chipHorizontalPad: 4,
    fontLarge: 8.1,
    fontNormal: 7.8,
    fontSmall: 6.8,
    fontTiny: 6.8,
    nameFontMin: 6.9,
    nameFontMax: 8.5,
    nameLineRatio: 1.05,
    nameVerticalPad: 2.6,
    sourceFontOffset: 2.1,
    sourceFontMin: 5.1,
    sourceFontMax: 5.8,
    minCardHeight: 70,
    rowMaxHeight: 135,
    maxCardWidth: 112,
    maxNameLines: 8,
    html: {
      cardPadding: "0",
      cardGap: "1.2mm",
      writeHeight: "4.1mm",
      writeMargin: "0",
      itemPadding: ".25mm 1mm",
      itemGap: "0",
      itemMinHeight: "5mm",
      nameFont: "10.2px",
      nameLine: "1.06",
      nameFontMin: "9px",
      nameFontMax: "11.3px",
      sourceFont: "6px",
    },
  },
};
const sanitizeFile = (value) => String(value || "rooming")
  .replace(/[\\/:*?"<>|]+/g, "-")
  .replace(/\s+/g, "-")
  .replace(/-+/g, "-")
  .slice(0, 90);

const formatDate = (value) => {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return text || "—";
};

const text = (value, fallback = "—") => {
  const clean = String(value || "").trim();
  return clean || fallback;
};

const fillTemplate = (template = "", values = {}) => String(template || "").replace(/\{(\w+)\}/g, (_, key) => (
  values[key] ?? ""
));

const formatDateRangeLine = (range = {}, labels = {}) => {
  const label = text(range.label, "");
  const hotel = text(range.hotel, "");
  const checkIn = formatDate(range.checkIn);
  const checkOut = formatDate(range.checkOut);
  if (range.infoTemplate) {
    return fillTemplate(range.infoTemplate, {
      label,
      hotel: hotel || labels.unknownHotel || "—",
      checkIn,
      checkOut,
    });
  }
  const details = [];
  if (hotel) details.push(`${labels.hotel || "Hotel"} ${hotel}`);
  details.push(`${labels.checkIn || "Check-in"} ${checkIn} / ${labels.checkOut || "Check-out"} ${checkOut}`);
  return `${label}: ${details.join(" — ")}`;
};

const parseIsoDate = (value) => {
  const match = String(value || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
};

const minDateValue = (...values) => {
  const dates = values.map(parseIsoDate).filter(Boolean).sort((a, b) => a - b);
  return dates[0] ? dates[0].toISOString().slice(0, 10) : values.find(Boolean) || "";
};

const maxDateValue = (...values) => {
  const dates = values.map(parseIsoDate).filter(Boolean).sort((a, b) => b - a);
  return dates[0] ? dates[0].toISOString().slice(0, 10) : values.filter(Boolean).pop() || "";
};

const getDirection = (lang) => (lang === "ar" ? "rtl" : "ltr");

const clampRoomingNameFontSize = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return ROOMING_NAME_FONT_SIZE_DEFAULT;
  return Math.min(ROOMING_NAME_FONT_SIZE_MAX, Math.max(ROOMING_NAME_FONT_SIZE_MIN, Math.round(numeric)));
};

const normalizePrintSettings = (settings = {}) => {
  const defaultSettings = {
    density: "normal",
    layoutMode: "default",
    showRegistrationSource: true,
    showBedNumbers: false,
    unifyMakkahMadinahRooming: true,
    roomingNameFontSize: ROOMING_NAME_FONT_SIZE_DEFAULT,
    roomingAutoShrinkLongNames: true,
  };
  const mergedSettings = {
    ...defaultSettings,
    ...(settings && typeof settings === "object" ? settings : {}),
  };
  const density = ["comfortable", "normal", "compact"].includes(mergedSettings.density)
    ? mergedSettings.density
    : "normal";
  const layoutMode = mergedSettings.layoutMode === "arranged" ? "arranged" : "default";
  return {
    density,
    layoutMode,
    showRegistrationSource: mergedSettings.showRegistrationSource !== false,
    showBedNumbers: mergedSettings.showBedNumbers === true,
    unifyMakkahMadinahRooming: mergedSettings.unifyMakkahMadinahRooming !== false,
    roomingNameFontSize: clampRoomingNameFontSize(mergedSettings.roomingNameFontSize),
    roomingAutoShrinkLongNames: mergedSettings.roomingAutoShrinkLongNames !== false,
  };
};

const getDensityConfig = (settings = {}) => DENSITY_CONFIGS[normalizePrintSettings(settings).density] || DENSITY_CONFIGS.normal;
const isArrangedLayout = (settings = {}) => normalizePrintSettings(settings).layoutMode === "arranged";

const getAdaptiveColumnCount = (settings = {}, roomCount = 0) => {
  const density = normalizePrintSettings(settings).density;
  const count = Number(roomCount) || 0;
  if (!count) return getDensityConfig(settings).columns;
  if (density === "comfortable") {
    if (count <= 3) return 3;
    if (count <= 6) return 4;
    if (count <= 12) return 4;
    return DENSITY_CONFIGS.comfortable.columns;
  }
  if (density === "compact") {
    if (count <= 4) return 4;
    if (count <= 8) return 4;
    if (count <= 14) return 5;
    return DENSITY_CONFIGS.compact.columns;
  }
  if (count <= 3) return 3;
  if (count <= 6) return 4;
  if (count <= 12) return 4;
  return DENSITY_CONFIGS.normal.columns;
};

const getFlowLayout = (settings = {}, roomCount = 0) => {
  const density = getDensityConfig(settings);
  return {
    ...FLOW_LAYOUT,
    columns: getAdaptiveColumnCount(settings, roomCount),
    gapX: density.gapX,
    gapY: density.gapY,
    groupGap: density.groupGap,
    sectionTitleHeight: density.sectionTitleHeight,
    sectionTitleGap: density.sectionTitleGap,
  };
};

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const getRoomPilgrims = (room = {}, settings = {}) => {
  const printSettings = normalizePrintSettings(settings);
  if (Array.isArray(room.pilgrims)) {
    return room.pilgrims.map((pilgrim) => ({
      name: text(pilgrim?.name, "—"),
      source: printSettings.showRegistrationSource ? text(pilgrim?.source, "") : "",
    }));
  }
  const names = Array.isArray(room.names) ? room.names : [];
  return names.map((name) => ({ name: text(name, "—"), source: "" }));
};

const getRoomTypeCapacity = (room = {}) => {
  const key = String(room.roomTypeKey || room.roomType || "").trim().toLowerCase();
  return ROOM_TYPE_CAPACITY[key] || 0;
};

const getRoomPrintCapacity = (room = {}, pilgrims = [], settings = {}) => {
  const configuredCapacity = Number(room.capacity);
  if (Number.isFinite(configuredCapacity) && configuredCapacity > 0) return configuredCapacity;
  const printSettings = normalizePrintSettings(settings);
  if (printSettings.showBedNumbers) {
    const typedCapacity = getRoomTypeCapacity(room);
    if (typedCapacity > 0) return typedCapacity;
  }
  return Math.max(1, pilgrims.length || 1);
};

const getRoomPrintRows = (room = {}, settings = {}) => {
  const pilgrims = getRoomPilgrims(room, settings);
  const capacity = getRoomPrintCapacity(room, pilgrims, settings);
  const rowCount = Math.max(capacity, pilgrims.length);
  return {
    pilgrims,
    capacity,
    rowCount,
    rows: Array.from({ length: rowCount }, (_, index) => pilgrims[index] || { name: "", source: "" }),
  };
};

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

const getOccupiedNameCount = (pilgrims = []) => pilgrims.filter((pilgrim) => {
  const name = String(pilgrim?.name || "").trim();
  return name && name !== "—";
}).length;

const parseCssLengthToPx = (value) => {
  const match = String(value || "").trim().match(/^(-?\d*\.?\d+)(px|pt|mm)?$/i);
  if (!match) return 0;
  const number = Number(match[1]);
  const unit = (match[2] || "px").toLowerCase();
  if (!Number.isFinite(number)) return 0;
  if (unit === "mm") return number * (96 / 25.4);
  if (unit === "pt") return number * (96 / 72);
  return number;
};

const getHorizontalPaddingPx = (padding) => {
  const parts = String(padding || "0").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 0;
  const values = parts.map(parseCssLengthToPx);
  if (values.length === 1) return values[0] * 2;
  if (values.length === 2) return values[1] * 2;
  if (values.length === 3) return values[1] * 2;
  return values[1] + values[3];
};

const estimateNameWidth = (value, fontSize) => {
  const raw = String(value || "");
  const arabic = /[\u0600-\u06FF]/.test(raw);
  return Array.from(raw).reduce((width, char) => {
    if (/\s/.test(char)) return width + fontSize * 0.32;
    if (/[.,;:،؛]/.test(char)) return width + fontSize * 0.28;
    if (/\d/.test(char)) return width + fontSize * 0.52;
    return width + fontSize * (arabic ? 0.58 : 0.55);
  }, 0);
};

const getNameLineHeight = (fontSize, density) => fontSize * (Number(density?.nameLineRatio) || 1.08);
const getSourceFontSize = (fontSize, density) => clampNumber(
  fontSize - (Number(density?.sourceFontOffset) || 2),
  Number(density?.sourceFontMin) || 5.1,
  Number(density?.sourceFontMax) || 6.2
);

const measureSmartTextWidth = (ctx, value, fontSize, weight = 800, unit = "pt") => {
  if (ctx) {
    ctx.save();
    ctx.font = `${weight} ${fontSize}pt ${ROOMING_PRINT_FONT_FAMILY}`;
    const width = ctx.measureText(String(value || "")).width;
    ctx.restore();
    return width;
  }
  return estimateNameWidth(value, fontSize) * (unit === "px" ? 1.08 : 1);
};

const fitFontSizeToWidth = ({
  ctx,
  value = "",
  fontSize,
  minSize,
  maxWidth,
  weight = 800,
  unit = "pt",
}) => {
  const width = measureSmartTextWidth(ctx, value, fontSize, weight, unit);
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(maxWidth) || maxWidth <= 0 || width <= maxWidth) {
    return fontSize;
  }
  const fitted = fontSize * (maxWidth / width) * 0.98;
  return Math.max(minSize, fitted);
};

const getAdaptiveNameFontMetrics = ({
  ctx,
  name = "",
  chipHeight = 12,
  contentWidth = 80,
  density,
  unit = "pt",
  printSettings = {},
}) => {
  const html = unit === "px";
  const htmlConfig = density?.html || {};
  const normalizedSettings = normalizePrintSettings(printSettings);
  const selectedNameFontSize = clampRoomingNameFontSize(normalizedSettings.roomingNameFontSize);
  const base = html
    ? selectedNameFontSize
    : selectedNameFontSize * 0.75;
  const autoShrink = normalizedSettings.roomingAutoShrinkLongNames !== false;
  const configuredMin = html
    ? Number.parseFloat(String(htmlConfig.nameFontMin || "")) || Math.max(8.8, base - 1.8)
    : Number(density?.nameFontMin) || Math.max(6.8, base - 1.4);
  const min = autoShrink
    ? Math.max(html ? ROOMING_NAME_FONT_SIZE_MIN : ROOMING_NAME_FONT_SIZE_MIN * 0.75, Math.min(configuredMin, base))
    : base;
  const densityMax = html
    ? Number.parseFloat(String(htmlConfig.nameFontMax || "")) || base + 1.6
    : Number(density?.nameFontMax) || base + 1.1;
  const configuredHardMax = html
    ? Number.parseFloat(String(htmlConfig.nameHardMax || ""))
    : Number(density?.nameHardMax);
  const hardMax = Number.isFinite(configuredHardMax) && configuredHardMax > 0
    ? configuredHardMax
    : (html ? OCCUPANT_NAME_MAX_PX : OCCUPANT_NAME_MAX_PT);
  const max = autoShrink
    ? Math.max(min, Math.min(Math.max(densityMax, base), chipHeight * 0.74, Math.max(hardMax, base)))
    : base;
  let fontSize = base;

  fontSize = clampNumber(fontSize, min, max);
  if (autoShrink) {
    fontSize = fitFontSizeToWidth({
      ctx,
      value: name,
      fontSize,
      minSize: min,
      maxWidth: Math.max(1, contentWidth * (html ? 0.9 : 0.98)),
      weight: 600,
      unit,
    });
  }

  const sourceFontSize = getSourceFontSize(fontSize, density);
  const lineHeight = getNameLineHeight(fontSize, density);
  return {
    fontSize,
    lineHeight: Math.max(lineHeight, fontSize * 1.2),
    sourceFontSize,
    maxLines: 1,
  };
};

const getHtmlContentWidth = (density) => {
  const cardWidth = (Number(density?.maxCardWidth) || 120) * (96 / 72);
  const padding = getHorizontalPaddingPx(density?.html?.itemPadding || "0");
  return Math.max(32, cardWidth - padding - 4);
};

const drawRoundRect = (ctx, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

const drawText = (ctx, value, x, y, {
  size = 10,
  weight = 400,
  color = "#111827",
  align = "right",
  baseline = "top",
  maxWidth,
  direction = "rtl",
} = {}) => {
  ctx.save();
  ctx.direction = direction;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.font = `${weight} ${size}pt ${ROOMING_PRINT_FONT_FAMILY}`;
  if (maxWidth) ctx.fillText(String(value || ""), x, y, maxWidth);
  else ctx.fillText(String(value || ""), x, y);
  ctx.restore();
};

const drawRoundedRectPath = (ctx, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const drawFitText = (ctx, value, x, y, {
  size = 10,
  minSize = 7,
  weight = 400,
  color = "#111827",
  align = "right",
  baseline = "top",
  maxWidth,
  direction = "rtl",
} = {}) => {
  let nextSize = size;
  if (maxWidth) {
    ctx.save();
    ctx.font = `${weight} ${nextSize}pt ${ROOMING_PRINT_FONT_FAMILY}`;
    while (nextSize > minSize && ctx.measureText(String(value || "")).width > maxWidth) {
      nextSize -= 0.35;
      ctx.font = `${weight} ${nextSize}pt ${ROOMING_PRINT_FONT_FAMILY}`;
    }
    ctx.restore();
  }
  drawText(ctx, value, x, y, { size: nextSize, weight, color, align, baseline, maxWidth, direction });
};

const isInlineImageUrl = (url) => /^(data|blob):/i.test(String(url || ""));

const loadImageElement = async (url) => {
  const image = new Image();
  if (!isInlineImageUrl(url)) image.crossOrigin = "anonymous";
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = url;
  });
  return image;
};

const fetchImageObjectUrl = async (url) => {
  if (!url || isInlineImageUrl(url) || typeof fetch !== "function" || typeof URL === "undefined") return "";
  try {
    const response = await fetch(url, { mode: "cors", cache: "force-cache" });
    if (!response.ok) return "";
    const blob = await response.blob();
    if (!blob) return "";
    return URL.createObjectURL(blob);
  } catch {
    return "";
  }
};

const revokeLoadedImageObjectUrl = (image) => {
  const objectUrl = image?.__roomingObjectUrl;
  if (objectUrl && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(objectUrl);
  }
};

const loadImage = async (url) => {
  const sourceUrl = String(url || "").trim();
  if (!sourceUrl) return null;
  let objectUrl = "";
  try {
    objectUrl = await fetchImageObjectUrl(sourceUrl);
    const image = await loadImageElement(objectUrl || sourceUrl);
    if (objectUrl) image.__roomingObjectUrl = objectUrl;
    return image;
  } catch {
    if (objectUrl) revokeLoadedImageObjectUrl({ __roomingObjectUrl: objectUrl });
    return null;
  }
};

const drawContainImage = (ctx, image, x, y, width, height) => {
  if (!image) return false;
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  return true;
};

const truncateToWidth = (ctx, value, maxWidth, { forceEllipsis = false } = {}) => {
  const raw = String(value || "");
  const ellipsis = "…";
  const displayed = forceEllipsis && raw ? `${raw}${ellipsis}` : raw;
  if (ctx.measureText(displayed).width <= maxWidth) return displayed;
  let lo = 0;
  let hi = raw.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(`${raw.slice(0, mid)}${ellipsis}`).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return `${raw.slice(0, Math.max(1, lo))}${ellipsis}`;
};

const splitLongToken = (ctx, token, maxWidth) => {
  const parts = [];
  let current = "";
  Array.from(String(token || "")).forEach((char) => {
    const next = `${current}${char}`;
    if (!current || ctx.measureText(next).width <= maxWidth) {
      current = next;
      return;
    }
    parts.push(current);
    current = char;
  });
  if (current) parts.push(current);
  return parts.length ? parts : [token];
};

const wrapText = (ctx, value, maxWidth, maxLines = 2, { ellipsis = false } = {}) => {
  const raw = text(value, "—");
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return [raw];
  const parts = raw.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  parts.forEach((part) => {
    if (ctx.measureText(part).width > maxWidth) {
      if (current) {
        lines.push(current);
        current = "";
      }
      splitLongToken(ctx, part, maxWidth).forEach((piece) => lines.push(piece));
      return;
    }
    const next = current ? `${current} ${part}` : part;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      return;
    }
    if (current) lines.push(current);
    current = part;
  });
  if (current) lines.push(current);
  const safeLines = lines.length ? lines : [raw];
  if (safeLines.length <= maxLines) {
    return safeLines;
  }
  const clipped = safeLines.slice(0, maxLines);
  if (ellipsis) clipped[maxLines - 1] = truncateToWidth(ctx, clipped[maxLines - 1], maxWidth, { forceEllipsis: true });
  return clipped;
};

const measureRoomCard = (ctx, room, cardWidth, settings = {}) => {
  const density = getDensityConfig(settings);
  const { rowCount } = getRoomPrintRows(room, settings);
  return density.writeAreaHeight + rowCount * density.chipMinHeight + 1;
};

const drawHeader = (ctx, page, { section, logoImage, agencyName, labels, lang, programName = "" }) => {
  const direction = getDirection(lang);
  const right = page.width - page.margin;
  const left = page.margin;
  const logoSize = 30;
  const metricWidth = 88;
  const metricsCount = 3;
  const metricsLeft = right - metricWidth * metricsCount;
  const brandRight = left + logoSize + 7 + 150;
  const titleLeft = brandRight + 12;
  const titleRight = metricsLeft - 12;
  const titleCenter = (titleLeft + titleRight) / 2;
  const titleMaxWidth = Math.max(1, titleRight - titleLeft);
  const headerRuleY = 80;
  if (logoImage) {
    drawContainImage(ctx, logoImage, left, 12, logoSize, logoSize);
  } else {
    ctx.strokeStyle = "#d7dbe2";
    ctx.lineWidth = 1;
    drawRoundRect(ctx, left, 12, logoSize, logoSize, 7);
    ctx.stroke();
    drawText(ctx, "R", left + logoSize / 2, 19, {
      size: 13,
      weight: 800,
      color: "#9a7418",
      align: "center",
      direction: "ltr",
    });
  }
  drawText(ctx, agencyName || "", left + logoSize + 7, 18, {
    size: 8.8,
    weight: 800,
    color: "#0f172a",
    align: "left",
    direction,
    maxWidth: 150,
  });
  const hotelTitle = section.combined ? (section.cityLabel || "") : (section.hotel || "");
  ctx.save();
  ctx.beginPath();
  ctx.rect(titleLeft, 8, titleMaxWidth, headerRuleY - 14);
  ctx.clip();
  if (!section.combined) {
    drawText(ctx, section.cityLabel || "", titleCenter, 9, {
      size: 10.4,
      weight: 900,
      color: "#64748b",
      align: "center",
      direction,
      maxWidth: titleMaxWidth,
    });
  }
  const hotelFontSize = 11.4;
  ctx.save();
  ctx.font = `900 ${hotelFontSize}pt ${ROOMING_PRINT_FONT_FAMILY}`;
  const hotelLines = wrapText(ctx, hotelTitle, titleMaxWidth, 2, { ellipsis: true });
  ctx.restore();
  const hotelStartY = section.combined ? 16 : 24;
  const hotelLineHeight = hotelFontSize * 1.25;
  hotelLines.forEach((line, index) => {
    drawFitText(ctx, line, titleCenter, hotelStartY + index * hotelLineHeight, {
      size: hotelFontSize,
      minSize: 8.2,
      weight: 900,
      color: "#0f172a",
      align: "center",
      direction,
      maxWidth: titleMaxWidth,
    });
  });
  if (section.combined && Array.isArray(section.dateRanges)) {
    const dateStartY = Math.max(47, hotelStartY + hotelLines.length * hotelLineHeight + 6);
    section.dateRanges.slice(0, 2).forEach((range, index) => {
      const line = formatDateRangeLine(range, labels);
      drawText(ctx, line, titleCenter, dateStartY + index * 9.8, {
        size: 7.2,
        weight: 800,
        color: index === 0 ? "#7c641f" : "#475569",
        align: "center",
        direction,
        maxWidth: titleMaxWidth,
      });
    });
  }
  ctx.restore();

  const metrics = [
    { label: labels.roomsCount, value: String(section.rooms.length) },
    { label: labels.checkIn, value: formatDate(section.checkIn) },
    { label: labels.checkOut, value: formatDate(section.checkOut) },
  ];
  metrics.forEach((item, index) => {
    const x = right - metricWidth * (index + 1);
    if (index > 0) {
      ctx.strokeStyle = "#d9c491";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x + metricWidth, 13);
      ctx.lineTo(x + metricWidth, 62);
      ctx.stroke();
    }
    drawText(ctx, item.label, x + metricWidth / 2, 13, {
      size: 7.4,
      weight: 700,
      color: "#475569",
      align: "center",
      direction,
    });
    drawText(ctx, item.value, x + metricWidth / 2, 29, {
      size: 8.8,
      weight: 800,
      color: "#0f172a",
      align: "center",
      direction: item.value.match(/\d/) ? "ltr" : direction,
    });
  });
  if (programName) {
    drawFitText(ctx, programName, right - metricWidth * metrics.length / 2, 66, {
      size: 6.9,
      minSize: 5.8,
      weight: 800,
      color: "#64748b",
      align: "center",
      direction,
      maxWidth: metricWidth * metrics.length - 10,
    });
  }
  ctx.strokeStyle = "#b99235";
  ctx.lineWidth = 1.05;
  ctx.beginPath();
  ctx.moveTo(left, headerRuleY);
  ctx.lineTo(right, headerRuleY);
  ctx.stroke();
};

const drawRoomCard = (ctx, room, x, y, width, height, labels, lang, settings = {}) => {
  const density = getDensityConfig(settings);
  const printSettings = normalizePrintSettings(settings);
  const direction = getDirection(lang);
  const { rows } = getRoomPrintRows(room, settings);
  const showBedNumbers = printSettings.showBedNumbers;
  const cardHeight = Math.min(measureRoomCard(ctx, room, width, settings), height || Number.POSITIVE_INFINITY);
  const right = x + width - density.cardPadX;
  const left = x + density.cardPadX;
  const numberColumnWidth = showBedNumbers ? clampNumber(width * 0.14, 12, 17) : 0;
  const numberColumnX = x + width - numberColumnWidth;
  const nameLeft = left;
  const nameRight = showBedNumbers ? numberColumnX - density.cardPadX : right;
  const contentWidth = Math.max(18, nameRight - nameLeft);
  const topRowHeight = density.writeAreaHeight;
  const rowAreaTop = y + topRowHeight;
  const rowHeight = density.chipMinHeight;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, width, cardHeight);
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 0.9;
  ctx.strokeRect(x, y, width, cardHeight);

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(x, y, width, topRowHeight);
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 0.65;
  ctx.beginPath();
  ctx.moveTo(x, rowAreaTop);
  ctx.lineTo(x + width, rowAreaTop);
  ctx.stroke();

  const badgeText = text(room.badgeText, "");
  let badgeWidth = 0;
  if (badgeText) {
    const badgeHeight = Math.min(10, Math.max(8.2, topRowHeight - 4));
    const badgeY = y + Math.max(2, (topRowHeight - badgeHeight) / 2);
    const badgeX = left;
    const badgeFontSize = 5.8;
    ctx.save();
    ctx.font = `800 ${badgeFontSize}pt ${ROOMING_PRINT_FONT_FAMILY}`;
    const measured = ctx.measureText(badgeText).width + 10;
    badgeWidth = Math.min(Math.max(22, measured), Math.max(24, width * 0.42));
    ctx.fillStyle = room.badgeReason === "changed-pilgrim-rooming" ? "#eff6ff" : "#fffbeb";
    ctx.strokeStyle = room.badgeReason === "changed-pilgrim-rooming" ? "#93c5fd" : "#d9b861";
    ctx.lineWidth = 0.65;
    drawRoundedRectPath(ctx, badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2);
    ctx.fill();
    ctx.stroke();
    drawFitText(ctx, badgeText, badgeX + badgeWidth / 2, badgeY + 1.75, {
      size: badgeFontSize,
      minSize: 4.8,
      weight: 800,
      color: room.badgeReason === "changed-pilgrim-rooming" ? "#1d4ed8" : "#7c641f",
      align: "center",
      direction,
      maxWidth: badgeWidth - 7,
    });
    ctx.restore();
  }

  drawText(ctx, MANUAL_ROOM_NUMBER_LABEL, right, y + Math.max(2.2, (topRowHeight - density.fontSmall) / 2), {
    size: Math.max(7.2, density.fontSmall),
    weight: 900,
    color: "#0f172a",
    align: "right",
    direction: "rtl",
    maxWidth: width - density.cardPadX * 2 - badgeWidth - (badgeWidth ? 5 : 0),
  });

  rows.forEach((pilgrim, index) => {
    const rowY = rowAreaTop + index * rowHeight;
    const isLast = index === rows.length - 1;
    if (showBedNumbers) {
      ctx.fillStyle = "#fef3c7";
      ctx.fillRect(numberColumnX, rowY + 0.6, numberColumnWidth - 0.6, rowHeight - 1.2);
      ctx.strokeStyle = "#b99235";
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(numberColumnX, rowY);
      ctx.lineTo(numberColumnX, rowY + rowHeight);
      ctx.stroke();
      drawText(ctx, String(index + 1), numberColumnX + numberColumnWidth / 2, rowY + Math.max(1.5, (rowHeight - density.fontSmall) / 2), {
        size: Math.max(7.2, density.fontSmall),
        weight: 900,
        color: "#111827",
        align: "center",
        direction: "ltr",
        maxWidth: numberColumnWidth - 2,
      });
    }
    if (!isLast) {
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(x, rowY + rowHeight);
      ctx.lineTo(x + width, rowY + rowHeight);
      ctx.stroke();
    }
    const empty = !pilgrim.name || pilgrim.name === "—";
    if (empty) return;
    const sourceText = !empty ? text(pilgrim.source, "") : "";
    const sourceLabel = sourceText ? text(sourceText, "") : "";
    const sourceGap = sourceLabel ? Math.max(2.6, density.cardPadX * 0.6) : 0;
    const sourceFontSize = sourceLabel ? getSourceFontSize(density.fontNormal, density) : 0;
    let sourceWidth = 0;
    let sourceDrawFontSize = sourceFontSize;
    if (sourceLabel) {
      const sourceMin = Math.min(Number(density?.sourceFontMin) || 5.1, SINGLE_LINE_SOURCE_MIN_PT);
      const maxSourceWidth = Math.min(
        Math.max(14, contentWidth * SOURCE_MAX_WIDTH_RATIO),
        Math.max(14, contentWidth - 28)
      );
      ctx.save();
      ctx.font = `500 ${sourceDrawFontSize}pt ${ROOMING_PRINT_FONT_FAMILY}`;
      sourceWidth = Math.min(ctx.measureText(sourceLabel).width, maxSourceWidth);
      while (sourceDrawFontSize > sourceMin && ctx.measureText(sourceLabel).width > sourceWidth) {
        sourceDrawFontSize -= 0.25;
        ctx.font = `500 ${sourceDrawFontSize}pt ${ROOMING_PRINT_FONT_FAMILY}`;
        if (ctx.measureText(sourceLabel).width <= sourceWidth) break;
      }
      sourceWidth = Math.min(ctx.measureText(sourceLabel).width, maxSourceWidth);
      ctx.restore();
    }
    const nameTextLeft = nameLeft + sourceWidth + sourceGap;
    const nameContentWidth = Math.max(18, nameRight - nameTextLeft);
    ctx.save();
    ctx.beginPath();
    ctx.rect(nameLeft - 0.6, rowY + 0.6, contentWidth + 1.2, rowHeight - 1.2);
    ctx.clip();
    const nameMetrics = getAdaptiveNameFontMetrics({
      ctx,
      name: pilgrim.name,
      chipHeight: rowHeight,
      contentWidth: nameContentWidth,
      density,
      printSettings,
    });
    ctx.font = `600 ${nameMetrics.fontSize}pt ${ROOMING_PRINT_FONT_FAMILY}`;
    const textBlockHeight = nameMetrics.lineHeight;
    let lineY = rowY + Math.max(1.4, (rowHeight - textBlockHeight) / 2);
    const nameX = direction === "rtl" ? nameRight : nameTextLeft;
    drawText(ctx, pilgrim.name, nameX, lineY, {
      size: nameMetrics.fontSize,
      weight: 600,
      color: "#111827",
      align: direction === "rtl" ? "right" : "left",
      direction,
      maxWidth: nameContentWidth,
    });
    if (sourceLabel) {
      drawFitText(ctx, sourceLabel, nameLeft, rowY + Math.max(1.5, (rowHeight - sourceDrawFontSize) / 2), {
        size: sourceDrawFontSize,
        minSize: Math.min(Number(density?.sourceFontMin) || 5.1, SINGLE_LINE_SOURCE_MIN_PT),
        weight: 500,
        color: "#64748b",
        align: "left",
        direction,
        maxWidth: sourceWidth,
      });
    }
    ctx.restore();
  });
};

const makeCanvasPage = ({ labels, lang, agencyName, logoImage, section, programName = "" }) => {
  const width = A4_LANDSCAPE.widthPt;
  const height = A4_LANDSCAPE.heightPt;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * PDF_SCALE);
  canvas.height = Math.round(height * PDF_SCALE);
  const ctx = canvas.getContext("2d");
  ctx.scale(PDF_SCALE, PDF_SCALE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  const page = { width, height, margin: 22 };
  if (section) drawHeader(ctx, page, { section, logoImage, agencyName, labels, lang, programName });
  return { canvas, ctx, page };
};

const getRoomTypeSectionLabel = (key, fallback, lang) => {
  if (lang === "fr") {
    return key === "double" ? "Chambres doubles"
      : key === "triple" ? "Chambres triples"
        : key === "quad" ? "Chambres quadruples"
          : key === "quint" ? "Chambres quintuples"
            : fallback || "Autres chambres";
  }
  if (lang === "en") {
    return key === "double" ? "Double rooms"
      : key === "triple" ? "Triple rooms"
        : key === "quad" ? "Quad rooms"
          : key === "quint" ? "Quint rooms"
            : fallback || "Other rooms";
  }
  return key === "double" ? "ثنائيات"
    : key === "triple" ? "ثلاثيات"
      : key === "quad" ? "رباعيات"
        : key === "quint" ? "خماسيات"
          : fallback || "غرف أخرى";
};

const drawTypeSectionTitle = (ctx, page, label, y, lang, settings = {}) => {
  const layout = getFlowLayout(settings);
  const direction = getDirection(lang);
  const right = page.width - page.margin;
  const left = page.margin;
  ctx.font = `900 8.6pt ${ROOMING_PRINT_FONT_FAMILY}`;
  const textWidth = Math.min(130, Math.max(72, ctx.measureText(label).width + 28));
  const x = right - textWidth;
  drawRoundRect(ctx, x, y, textWidth, layout.sectionTitleHeight, 8.5);
  ctx.fillStyle = "#fbfaf7";
  ctx.fill();
  ctx.strokeStyle = "#e6dcc2";
  ctx.lineWidth = 0.7;
  ctx.stroke();
  drawText(ctx, label, x + textWidth / 2, y + 3.1, {
    size: 8.6,
    weight: 900,
    color: "#7c641f",
    align: "center",
    direction,
  });
  ctx.strokeStyle = "#eee7d6";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(left, y + 9);
  ctx.lineTo(x - 8, y + 9);
  ctx.stroke();
};

const getCardWidth = (page, settings = {}, roomCount = 0) => {
  const density = getDensityConfig(settings);
  const layout = getFlowLayout(settings, roomCount);
  const availableWidth = page.width - page.margin * 2 - layout.gapX * (layout.columns - 1);
  return Math.min(density.maxCardWidth || Number.POSITIVE_INFINITY, availableWidth / layout.columns);
};

const getRoomMinimumHeight = (room, settings = {}) => {
  return measureRoomCard(null, room, 0, settings);
};

const getFlowRowHeight = (ctx, rooms, cardWidth, settings = {}) => {
  const measured = rooms.map((room) => Math.max(getRoomMinimumHeight(room, settings), measureRoomCard(ctx, room, cardWidth, settings)));
  return Math.max(...measured, 1);
};

const getOrderNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const getRoomPrintX = (room) => getOrderNumber(room.x, getOrderNumber(room.position?.x, 0));
const getRoomPrintY = (room) => getOrderNumber(room.y, getOrderNumber(room.position?.y, 0));

const compareRoomCanvasPosition = (a, b, lang = "ar") => {
  const yDelta = getRoomPrintY(a) - getRoomPrintY(b);
  if (Math.abs(yDelta) > 42) return yDelta;
  const xDelta = lang === "ar"
    ? getRoomPrintX(b) - getRoomPrintX(a)
    : getRoomPrintX(a) - getRoomPrintX(b);
  if (xDelta) return xDelta;
  return (Number(a.order) || 0) - (Number(b.order) || 0);
};

const isRoomPrintEmpty = (room = {}) => getOccupiedNameCount(getRoomPilgrims(room, { showRegistrationSource: false })) === 0;

const sortRoomsForDefaultPrint = (rooms = []) => rooms.slice().sort((a, b) => {
  const city = CITY_ORDER.indexOf(a.city) - CITY_ORDER.indexOf(b.city);
  if (city) return city;
  const hotel = String(a.hotel || "").localeCompare(String(b.hotel || ""), "ar");
  if (hotel) return hotel;
  const aTypeOrder = ROOM_TYPE_ORDER.includes(a.roomTypeKey) ? ROOM_TYPE_ORDER.indexOf(a.roomTypeKey) : 99;
  const bTypeOrder = ROOM_TYPE_ORDER.includes(b.roomTypeKey) ? ROOM_TYPE_ORDER.indexOf(b.roomTypeKey) : 99;
  const type = aTypeOrder - bTypeOrder;
  if (type) return type;
  const empty = Number(isRoomPrintEmpty(a)) - Number(isRoomPrintEmpty(b));
  if (empty) return empty;
  return (Number(a.order) || 0) - (Number(b.order) || 0);
});

const sortRoomsForDefaultSectionOverride = (rooms = []) => rooms.slice().sort((a, b) => {
  const aTypeOrder = ROOM_TYPE_ORDER.includes(a.roomTypeKey) ? ROOM_TYPE_ORDER.indexOf(a.roomTypeKey) : 99;
  const bTypeOrder = ROOM_TYPE_ORDER.includes(b.roomTypeKey) ? ROOM_TYPE_ORDER.indexOf(b.roomTypeKey) : 99;
  const type = aTypeOrder - bTypeOrder;
  if (type) return type;
  const empty = Number(isRoomPrintEmpty(a)) - Number(isRoomPrintEmpty(b));
  if (empty) return empty;
  return (Number(a.order) || 0) - (Number(b.order) || 0);
});

const getRoomLinkEndpoints = (link = {}) => {
  const source = String(link.sourceRoomId || link.source || "");
  const target = String(link.targetRoomId || link.target || "");
  return source && target && source !== target ? [source, target] : null;
};

const getLinkedRoomGroups = (rooms = [], roomLinks = []) => {
  const roomMap = new Map(rooms.map((room) => [String(room.id || ""), room]).filter(([id]) => id));
  const adjacency = new Map(Array.from(roomMap.keys()).map((id) => [id, new Set()]));
  (Array.isArray(roomLinks) ? roomLinks : []).forEach((link) => {
    const endpoints = getRoomLinkEndpoints(link);
    if (!endpoints) return;
    const [source, target] = endpoints;
    if (!roomMap.has(source) || !roomMap.has(target)) return;
    adjacency.get(source).add(target);
    adjacency.get(target).add(source);
  });
  const visited = new Set();
  const groups = [];
  roomMap.forEach((room, roomId) => {
    if (visited.has(roomId)) return;
    const stack = [roomId];
    const ids = [];
    visited.add(roomId);
    while (stack.length) {
      const current = stack.pop();
      ids.push(current);
      (adjacency.get(current) || []).forEach((next) => {
        if (visited.has(next)) return;
        visited.add(next);
        stack.push(next);
      });
    }
    groups.push(ids.map((id) => roomMap.get(id)).filter(Boolean));
  });
  return groups;
};

const getRoomGroupAnchor = (group = [], lang = "ar") => {
  const sorted = group.slice().sort((a, b) => compareRoomCanvasPosition(a, b, lang));
  const first = sorted[0] || {};
  return {
    city: first.city,
    x: getRoomPrintX(first),
    y: getRoomPrintY(first),
    order: Number(first.order) || 0,
  };
};

const compareRoomGroupAnchor = (a, b, lang = "ar") => {
  const city = CITY_ORDER.indexOf(a.city) - CITY_ORDER.indexOf(b.city);
  if (city) return city;
  const yDelta = a.y - b.y;
  if (Math.abs(yDelta) > 42) return yDelta;
  const xDelta = lang === "ar" ? b.x - a.x : a.x - b.x;
  if (xDelta) return xDelta;
  return a.order - b.order;
};

const sortRoomsForArrangedPrint = (rooms = [], lang = "ar", roomLinks = []) => {
  const groups = getLinkedRoomGroups(rooms, roomLinks)
    .map((group) => ({
      anchor: getRoomGroupAnchor(group, lang),
      rooms: group.slice().sort((a, b) => compareRoomCanvasPosition(a, b, lang)),
    }))
    .sort((a, b) => compareRoomGroupAnchor(a.anchor, b.anchor, lang));
  return groups.flatMap((group) => group.rooms);
};

const groupRooms = (rooms = [], labels = {}, sectionOverride = null, settings = {}, lang = "ar", roomLinks = []) => {
  const arranged = isArrangedLayout(settings);
  const sorted = sortRoomsForDefaultPrint(rooms);
  if (sectionOverride) {
    const overrideRooms = arranged ? sortRoomsForArrangedPrint(rooms, lang, roomLinks) : sortRoomsForDefaultSectionOverride(rooms);
    return [{
      ...sectionOverride,
      rooms: overrideRooms.map((room) => ({ ...room, hotel: text(room.hotel, labels.unknownHotel || "—") })),
    }];
  }
  if (arranged) {
    const sections = [];
    sortRoomsForArrangedPrint(rooms, lang, roomLinks).forEach((room) => {
      const hotel = text(room.hotel, labels.unknownHotel || "—");
      const last = sections[sections.length - 1];
      if (!last || last.city !== room.city) {
        sections.push({
          city: room.city,
          cityLabel: room.cityLabel,
          hotel,
          checkIn: room.checkIn,
          checkOut: room.checkOut,
          rooms: [],
        });
      }
      sections[sections.length - 1].rooms.push({ ...room, hotel });
    });
    return sections;
  }
  const sections = [];
  sorted.forEach((room) => {
    const hotel = text(room.hotel, labels.unknownHotel || "—");
    const last = sections[sections.length - 1];
    if (!last || last.city !== room.city || last.hotel !== hotel) {
      sections.push({
        city: room.city,
        cityLabel: room.cityLabel,
        hotel,
        checkIn: room.checkIn,
        checkOut: room.checkOut,
        rooms: [],
      });
    }
    sections[sections.length - 1].rooms.push({ ...room, hotel });
  });
  return sections;
};

const getOrderedTypeGroups = (section, labels, lang, settings = {}) => {
  const layout = getFlowLayout(settings, section.rooms.length);
  const byType = new Map();
  section.rooms.forEach((room) => {
    const key = room.roomTypeKey || "other";
    if (!byType.has(key)) byType.set(key, []);
    byType.get(key).push(room);
  });
  return Array.from(byType.entries())
    .sort(([a], [b]) => {
      const aTypeOrder = ROOM_TYPE_ORDER.includes(a) ? ROOM_TYPE_ORDER.indexOf(a) : 99;
      const bTypeOrder = ROOM_TYPE_ORDER.includes(b) ? ROOM_TYPE_ORDER.indexOf(b) : 99;
      return aTypeOrder - bTypeOrder || String(a).localeCompare(String(b), "ar");
    })
    .map(([typeKey, typeRooms]) => ({
      typeKey,
      title: getRoomTypeSectionLabel(typeKey, typeRooms[0]?.roomTypeLabel || labels.otherRoomType, lang),
      rows: Array.from({ length: Math.ceil(typeRooms.length / layout.columns) }, (_, index) => (
        typeRooms.slice(index * layout.columns, (index + 1) * layout.columns)
      )),
    }));
};

const getFlowItems = (typeGroups) => {
  const items = [];
  typeGroups.forEach((group) => {
    if (!group.rows.length) return;
    items.push({ kind: "title", title: group.title });
    group.rows.forEach((rooms, rowIndex) => {
      items.push({
        kind: "row",
        title: group.title,
        rooms,
        isGroupLastRow: rowIndex === group.rows.length - 1,
      });
    });
  });
  return items;
};

const getArrangedFlowItems = (section, settings = {}) => {
  const layout = getFlowLayout(settings, section.rooms.length);
  return Array.from({ length: Math.ceil(section.rooms.length / layout.columns) }, (_, index) => ({
    kind: "row",
    rooms: section.rooms.slice(index * layout.columns, (index + 1) * layout.columns),
    isGroupLastRow: false,
  }));
};

const getPrintFlowItems = (section, labels, lang, settings = {}) => {
  if (isArrangedLayout(settings)) return getArrangedFlowItems(section, settings);
  return getFlowItems(getOrderedTypeGroups(section, labels, lang, settings));
};

const getSinglePageRowHeights = (ctx, items, page, settings = {}, roomCount = 0) => {
  const layout = getFlowLayout(settings, roomCount);
  const rows = items.filter((item) => item.kind === "row");
  if (!rows.length) return null;
  const cardWidth = getCardWidth(page, settings, roomCount);
  const titleCount = items.filter((item) => item.kind === "title").length;
  const rowGapCount = Math.max(0, rows.length - 1);
  const groupGapCount = Math.max(0, rows.filter((item) => item.isGroupLastRow).length - 1);
  const titleBlock = layout.sectionTitleHeight + layout.sectionTitleGap;
  const fixedHeight = titleCount * titleBlock
    + rowGapCount * layout.gapY
    + groupGapCount * layout.groupGap;
  const availableForRows = layout.contentBottom - layout.contentTop - fixedHeight;
  const desired = rows.map((item) => getFlowRowHeight(ctx, item.rooms, cardWidth, settings));
  const desiredTotal = desired.reduce((sum, value) => sum + value, 0);
  if (desiredTotal <= availableForRows) return desired;
  return null;
};

const drawRoomRow = (ctx, page, rooms, y, rowHeight, labels, lang, settings = {}, roomCount = 0) => {
  const layout = getFlowLayout(settings, roomCount);
  const cardWidth = getCardWidth(page, settings, roomCount);
  const rowWidth = rooms.length * cardWidth + Math.max(0, rooms.length - 1) * layout.gapX;
  const rowRight = page.width - page.margin - Math.max(0, ((page.width - page.margin * 2) - rowWidth) / 2);
  rooms.forEach((room, index) => {
    const x = rowRight - cardWidth - index * (cardWidth + layout.gapX);
    drawRoomCard(ctx, room, x, y, cardWidth, rowHeight, labels, lang, settings);
  });
};

const buildPages = async ({ rooms, labels, lang, agencyName, agencyLogoUrl, sectionOverride, printSettings, roomLinks = [], programName = "" }) => {
  const baseLayout = getFlowLayout(printSettings);
  const pages = [];
  const logoImage = await loadImage(agencyLogoUrl);
  let current = null;
  let cursorY = baseLayout.contentTop;

  const pushPage = async () => {
    if (!current) return;
    pages.push(await canvasToPage(current.canvas));
  };

  const startPage = (section, layout = baseLayout) => {
    current = makeCanvasPage({ labels, lang, agencyName, logoImage, section, programName });
    cursorY = layout.contentTop;
  };

  const sections = groupRooms(rooms, labels, sectionOverride, printSettings, lang, roomLinks);
  if (!sections.length) {
    current = makeCanvasPage({ labels, lang, agencyName, logoImage, programName, section: {
      cityLabel: labels.rooming || "Rooming",
      hotel: "",
      checkIn: "",
      checkOut: "",
      rooms: [],
    } });
    drawText(current.ctx, labels.noRooms || "No rooms", current.page.width - current.page.margin, 140, {
      size: 12,
      weight: 800,
      color: "#64748b",
      align: "right",
      direction: getDirection(lang),
    });
    await pushPage();
    revokeLoadedImageObjectUrl(logoImage);
    return pages;
  }

  for (const section of sections) {
    const layout = getFlowLayout(printSettings, section.rooms.length);
    startPage(section, layout);
    const flowItems = getPrintFlowItems(section, labels, lang, printSettings);
    const singlePageHeights = section.rooms.length <= 30
      ? getSinglePageRowHeights(current.ctx, flowItems, current.page, printSettings, section.rooms.length)
      : null;

    if (singlePageHeights) {
      let rowIndex = 0;
      flowItems.forEach((item) => {
        if (item.kind === "title") {
          drawTypeSectionTitle(current.ctx, current.page, item.title, cursorY, lang, printSettings);
          cursorY += layout.sectionTitleHeight + layout.sectionTitleGap;
          return;
        }
        const rowHeight = singlePageHeights[rowIndex] || getFlowRowHeight(current.ctx, item.rooms, getCardWidth(current.page, printSettings, section.rooms.length), printSettings);
        rowIndex += 1;
        drawRoomRow(current.ctx, current.page, item.rooms, cursorY, rowHeight, labels, lang, printSettings, section.rooms.length);
        cursorY += rowHeight + layout.gapY + (item.isGroupLastRow ? layout.groupGap : 0);
      });
    } else {
      let activeTitle = "";
      for (const item of flowItems) {
        if (item.kind === "title") {
          activeTitle = item.title;
          const titleBlock = layout.sectionTitleHeight + layout.sectionTitleGap;
          if (cursorY + titleBlock + 54 > layout.contentBottom) {
            await pushPage();
            startPage(section, layout);
          }
          drawTypeSectionTitle(current.ctx, current.page, item.title, cursorY, lang, printSettings);
          cursorY += titleBlock;
          continue;
        }
        const rowHeight = getFlowRowHeight(current.ctx, item.rooms, getCardWidth(current.page, printSettings, section.rooms.length), printSettings);
        if (cursorY + rowHeight > layout.contentBottom) {
          await pushPage();
          startPage(section, layout);
          if (activeTitle) {
            drawTypeSectionTitle(current.ctx, current.page, activeTitle, cursorY, lang, printSettings);
            cursorY += layout.sectionTitleHeight + layout.sectionTitleGap;
          }
        }
        drawRoomRow(current.ctx, current.page, item.rooms, cursorY, rowHeight, labels, lang, printSettings, section.rooms.length);
        cursorY += rowHeight + layout.gapY + (item.isGroupLastRow ? layout.groupGap : 0);
      }
    }
    await pushPage();
    current = null;
  }
  revokeLoadedImageObjectUrl(logoImage);
  return pages;
};

const canvasToPage = async (canvas) => ({
  widthPt: A4_LANDSCAPE.widthPt,
  heightPt: A4_LANDSCAPE.heightPt,
  pixelWidth: canvas.width,
  pixelHeight: canvas.height,
  jpeg: await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92)),
});

const blobToBytes = async (blob) => new Uint8Array(await blob.arrayBuffer());
const ascii = (value) => new TextEncoder().encode(value);
const concatBytes = (chunks) => {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  chunks.forEach((chunk) => {
    out.set(chunk, offset);
    offset += chunk.length;
  });
  return out;
};

const makePdf = async (pages) => {
  const chunks = [];
  const offsets = [0];
  const write = (chunk) => chunks.push(typeof chunk === "string" ? ascii(chunk) : chunk);
  const currentOffset = () => chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  let objectId = 1;
  const pageIds = [];
  const objects = [];

  write("%PDF-1.4\n");
  const addObject = async (bodyParts) => {
    const id = objectId;
    objectId += 1;
    offsets[id] = currentOffset();
    write(`${id} 0 obj\n`);
    for (const part of bodyParts) write(part);
    write("\nendobj\n");
    return id;
  };

  for (const page of pages) {
    const jpeg = await blobToBytes(page.jpeg);
    const imageId = await addObject([
      `<< /Type /XObject /Subtype /Image /Width ${page.pixelWidth || 1} /Height ${page.pixelHeight || 1} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
      jpeg,
      "\nendstream",
    ]);
    const content = `q\n${page.widthPt} 0 0 ${page.heightPt} 0 0 cm\n/Im${imageId} Do\nQ\n`;
    const contentId = await addObject([`<< /Length ${content.length} >>\nstream\n${content}endstream`]);
    objects.push({ page, imageId, contentId });
  }

  const pagesId = objectId;
  objectId += 1;
  for (const item of objects) {
    const pageId = await addObject([`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${item.page.widthPt} ${item.page.heightPt}] /Resources << /XObject << /Im${item.imageId} ${item.imageId} 0 R >> >> /Contents ${item.contentId} 0 R >>`]);
    pageIds.push(pageId);
  }
  offsets[pagesId] = currentOffset();
  write(`${pagesId} 0 obj\n<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>\nendobj\n`);
  const catalogId = await addObject([`<< /Type /Catalog /Pages ${pagesId} 0 R >>`]);
  const xrefOffset = currentOffset();
  write(`xref\n0 ${objectId}\n0000000000 65535 f \n`);
  for (let i = 1; i < objectId; i += 1) write(`${String(offsets[i] || 0).padStart(10, "0")} 00000 n \n`);
  write(`trailer\n<< /Size ${objectId} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return new Blob([concatBytes(chunks)], { type: "application/pdf" });
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export async function downloadRoomingPdf({
  rooms = [],
  labels = {},
  lang = "ar",
  programName = "",
  agencyName = "",
  agencyLogoUrl = "",
  filename = "",
  sectionOverride = null,
  printSettings = {},
  roomLinks = [],
} = {}) {
  const pages = await buildPages({ rooms, labels, lang, agencyName, agencyLogoUrl, sectionOverride, printSettings, roomLinks, programName });
  const pdf = await makePdf(pages);
  downloadBlob(pdf, filename || `rooming-${sanitizeFile(programName)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export const createRoomingPrintHtml = ({
  rooms = [],
  labels = {},
  lang = "ar",
  programName = "",
  agencyName = "",
  agencyLogoUrl = "",
  sectionOverride = null,
  printSettings = {},
  roomLinks = [],
} = {}) => {
  const normalizedPrintSettings = normalizePrintSettings(printSettings);
  const density = getDensityConfig(normalizedPrintSettings);
  const direction = getDirection(lang);
  const arranged = isArrangedLayout(normalizedPrintSettings);
  const sections = groupRooms(rooms, labels, sectionOverride, normalizedPrintSettings, lang, roomLinks);
  const layoutRoomCount = sections.length
    ? Math.max(...sections.map((section) => section.rooms.length))
    : rooms.length;
  const layout = getFlowLayout(normalizedPrintSettings, layoutRoomCount);
  const printNameFontSize = clampRoomingNameFontSize(normalizedPrintSettings.roomingNameFontSize);
  const autoShrinkNames = normalizedPrintSettings.roomingAutoShrinkLongNames !== false;
  const fallbackLogoInitial = escapeHtml((agencyName || "R").trim().slice(0, 1));
  const logoHtml = agencyLogoUrl
    ? `<span class="agency-logo-wrap"><img class="agency-logo" src="${escapeHtml(agencyLogoUrl)}" alt="${escapeHtml(agencyName || "Rukn")}" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'"/><span class="agency-logo-fallback is-hidden">${fallbackLogoInitial}</span></span>`
    : `<span class="agency-logo-fallback">${fallbackLogoInitial}</span>`;
  const roomCardHtml = (room) => {
    const { rows } = getRoomPrintRows(room, normalizedPrintSettings);
    const showBedNumbers = normalizedPrintSettings.showBedNumbers;
    const badgeText = text(room.badgeText, "");
    const badgeClass = room.badgeReason === "changed-pilgrim-rooming" ? " city" : "";
    const badgeHtml = badgeText ? `<span class="room-badge${badgeClass}">${escapeHtml(badgeText)}</span>` : "";
    const contentWidth = Math.max(32, getHtmlContentWidth(density) - (showBedNumbers ? 22 : 0));
    const chipHeight = parseCssLengthToPx(density.html.itemMinHeight || "0") || density.chipMinHeight * (96 / 72);
    return `
      <article class="room-card">
        <div class="manual-room-row"><span>${MANUAL_ROOM_NUMBER_LABEL}</span>${badgeHtml}</div>
        <ol>
          ${rows.map((pilgrim, index) => {
            const empty = !pilgrim.name || pilgrim.name === "—";
            const sourceLabel = !empty && normalizedPrintSettings.showRegistrationSource && pilgrim.source ? pilgrim.source : "";
            const sourceBaseFont = Number.parseFloat(String(density.html.sourceFont || "6px")) || 6;
            const sourceMinFont = Math.min(sourceBaseFont, SINGLE_LINE_SOURCE_MIN_PX);
            const sourceGap = sourceLabel ? 4 : 0;
            const sourceMaxWidth = sourceLabel
              ? Math.min(Math.max(16, contentWidth * SOURCE_MAX_WIDTH_RATIO), Math.max(16, contentWidth - 32))
              : 0;
            const sourceMeasuredWidth = sourceLabel ? estimateNameWidth(sourceLabel, sourceBaseFont) * 1.08 : 0;
            const sourceFont = sourceLabel
              ? fitFontSizeToWidth({
                value: sourceLabel,
                fontSize: sourceBaseFont,
                minSize: sourceMinFont,
                maxWidth: sourceMaxWidth,
                weight: 500,
                unit: "px",
              })
              : sourceBaseFont;
            const sourceWidth = sourceLabel
              ? Math.min(estimateNameWidth(sourceLabel, sourceFont) * 1.08, sourceMeasuredWidth, sourceMaxWidth)
              : 0;
            const nameContentWidth = Math.max(24, contentWidth - sourceWidth - sourceGap);
            const nameMetrics = empty ? null : getAdaptiveNameFontMetrics({
              name: pilgrim.name,
              chipHeight,
              contentWidth: nameContentWidth,
              density,
              unit: "px",
              printSettings: normalizedPrintSettings,
            });
            const nameStyle = nameMetrics
              ? ` style="--smart-name-font:${nameMetrics.fontSize.toFixed(1)}px;--smart-name-line:${(nameMetrics.lineHeight / nameMetrics.fontSize).toFixed(2)}"`
              : "";
            const occupantStyle = sourceLabel
              ? ` style="--source-max:${sourceWidth.toFixed(1)}px;--smart-source-font:${sourceFont.toFixed(1)}px"`
              : "";
            const occupantHtml = empty
              ? ""
              : `<span class="occupant-line"${occupantStyle}>${sourceLabel ? `<span class="source-label">${escapeHtml(sourceLabel)}</span>` : ""}<span class="pilgrim-name"${nameStyle}>${escapeHtml(pilgrim.name)}</span></span>`;
            if (showBedNumbers) {
              return `
                <li class="numbered ${empty ? "empty" : ""}">
                  <span class="bed-number">${index + 1}</span>
                  <span class="bed-name-cell">
                    ${occupantHtml}
                  </span>
                </li>
              `;
            }
            return `
              <li class="${empty ? "empty" : ""}">
                ${occupantHtml}
              </li>
            `;
          }).join("")}
        </ol>
      </article>
    `;
  };
  const sectionsHtml = sections.length ? sections.map((section) => {
    const typeGroups = getOrderedTypeGroups(section, labels, lang, normalizedPrintSettings);
    const hotelTitle = section.combined ? (section.cityLabel || "") : (section.hotel || "");
    const hotelTitleLength = String(hotelTitle || "").trim().length;
    const hotelTitleSize = section.combined
      ? (hotelTitleLength > 42 ? "12px" : hotelTitleLength > 28 ? "13px" : "14px")
      : (hotelTitleLength > 42 ? "13px" : hotelTitleLength > 28 ? "14.5px" : "16px");
    return `
      <section class="rooming-section">
        <header class="print-header">
          <div class="agency-brand">
            ${logoHtml}
            <strong>${escapeHtml(agencyName || "—")}</strong>
          </div>
          <div class="title-block">
            ${section.combined ? "" : `<h1>${escapeHtml(section.cityLabel || labels.rooming || "Rooming")}</h1>`}
            <p class="hotel-title" style="--hotel-title-font:${hotelTitleSize}">${escapeHtml(hotelTitle)}</p>
            ${section.combined && Array.isArray(section.dateRanges)
              ? `<div class="date-lines">${section.dateRanges.slice(0, 2).map((range) => (
                `<p class="date-line">${escapeHtml(formatDateRangeLine(range, labels))}</p>`
              )).join("")}</div>`
              : ""}
          </div>
          <div class="metric-strip">
            <div class="metric-row">
              <div><span>${escapeHtml(labels.roomsCount || "Rooms")}</span><b>${escapeHtml(String(section.rooms.length))}</b></div>
              <div><span>${escapeHtml(labels.checkIn || "Check-in")}</span><b>${escapeHtml(formatDate(section.checkIn))}</b></div>
              <div><span>${escapeHtml(labels.checkOut || "Check-out")}</span><b>${escapeHtml(formatDate(section.checkOut))}</b></div>
            </div>
            ${programName ? `<small class="metric-program">${escapeHtml(programName)}</small>` : ""}
          </div>
        </header>
        <div class="divider"></div>
        ${arranged ? `
          <div class="rooms-grid">
            ${section.rooms.map(roomCardHtml).join("")}
          </div>
        ` : typeGroups.map((group) => `
          <div class="type-group">
            <div class="type-title"><span>${escapeHtml(group.title)}</span></div>
            <div class="rooms-grid">
              ${group.rows.flat().map(roomCardHtml).join("")}
            </div>
          </div>
        `).join("")}
      </section>
    `;
  }).join("") : `
    <section class="rooming-section">
      <header class="print-header">
        <div class="agency-brand">${logoHtml}<strong>${escapeHtml(agencyName || "—")}</strong></div>
        <div class="title-block"><h1>${escapeHtml(labels.rooming || "Rooming")}</h1>${programName ? `<small>${escapeHtml(programName)}</small>` : ""}</div>
      </header>
      <div class="divider"></div>
      <p class="empty-state">${escapeHtml(labels.noRooms || "No rooms")}</p>
    </section>
  `;

  return `<!doctype html>
<html dir="${direction}" lang="${escapeHtml(lang)}">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(programName || labels.rooming || "Rooming")}</title>
  <style>
    @page{size:A4 landscape;margin:7mm}
    :root{
      --rooms-columns:${layout.columns};
      --room-card-padding:${density.html.cardPadding};
      --room-card-gap:${density.html.cardGap};
      --room-card-max-width:${density.maxCardWidth}pt;
      --write-height:${density.html.writeHeight};
      --write-margin:${density.html.writeMargin};
      --item-padding:${density.html.itemPadding};
      --item-gap:${density.html.itemGap};
      --item-min-height:${density.html.itemMinHeight};
      --name-font:${printNameFontSize}px;
      --name-line:${density.html.nameLine};
      --source-font:${density.html.sourceFont};
      --name-hard-max:${printNameFontSize}px;
      --room-header-font:${density.html.headerFont || "8px"};
      --bed-font:${density.html.bedFont || "8px"};
      --bed-number-width:5.2mm;
    }
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    html,body{margin:0;background:#fff;color:#0f172a}
    body{font-family:${ROOMING_PRINT_FONT_FAMILY};font-size:9px;line-height:1.25}
    .rooming-section{break-after:page;page-break-after:always}
    .rooming-section:last-child{break-after:auto;page-break-after:auto}
    .print-header{position:relative;display:grid;grid-template-columns:46mm minmax(0,1fr) 86mm;align-items:start;gap:6mm;height:24mm;min-height:24mm;overflow:hidden;padding:2mm 0 2mm}
    .agency-brand{display:flex;align-items:center;gap:2.5mm;min-width:0}
    .agency-logo-wrap{position:relative;width:10mm;height:10mm;flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center}
    .agency-logo,.agency-logo-fallback{width:10mm;height:10mm;flex:0 0 auto;object-fit:contain;border-radius:2mm}
    .agency-logo-fallback{border:1px solid #d7dbe2;display:inline-flex;align-items:center;justify-content:center;color:#9a7418;font-size:12px;font-weight:900}
    .agency-logo-fallback.is-hidden{display:none}
    .agency-brand strong{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8.5px;color:#0f172a}
    .title-block{text-align:center;min-width:0;overflow:hidden;padding:0 1mm;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start}
    .title-block h1{margin:0;color:#64748b;font-size:10.5px;line-height:1;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .title-block .hotel-title{margin:1px 0 0;color:#0f172a;font-size:min(var(--hotel-title-font,15px),16px) !important;line-height:1.25;font-weight:900;white-space:normal;overflow:hidden;text-overflow:clip;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:break-word}
    .title-block .date-lines{margin-top:5px;display:flex;flex-direction:column;gap:1px;min-width:0}
    .title-block .date-line{margin:0;color:#9a7418;font-size:9.5px;font-weight:800;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .metric-strip{display:flex;flex-direction:column;height:17mm;border-inline-start:1px solid #d9c491;min-width:86mm;width:86mm}
    .metric-row{display:grid;grid-template-columns:repeat(3,1fr);min-height:0;flex:1 1 auto}
    .metric-row div{display:flex;flex-direction:column;align-items:center;justify-content:center;border-inline-end:1px solid #d9c491;padding:0 2mm;text-align:center;min-width:0}
    .metric-program{display:block;height:3.2mm;line-height:3.2mm;padding:0 2mm;border-inline-end:1px solid #d9c491;border-top:1px solid #eadfca;color:#64748b;font-size:7px;font-weight:800;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .metric-strip span{font-size:7px;color:#475569;font-weight:800;white-space:nowrap}
    .metric-strip b{font-size:8.2px;color:#0f172a;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
    .divider{height:1px;background:#b99235;margin:0 0 3mm}
    .type-group{margin:0 0 2.5mm;break-inside:auto;page-break-inside:auto}
    .type-title{display:flex;align-items:center;gap:2mm;margin:0 0 1.5mm;color:#7c641f;font-weight:900}
    .type-title::before,.type-title::after{content:"";height:1px;background:#eee7d6;flex:1}
    .type-title span{display:inline-flex;align-items:center;justify-content:center;border:1px solid #e6dcc2;background:#fbfaf7;border-radius:999px;padding:1.2mm 5mm;font-size:8.5px;line-height:1}
    .rooms-grid{display:grid;grid-template-columns:repeat(var(--rooms-columns),minmax(0,var(--room-card-max-width)));gap:var(--room-card-gap);align-items:start;justify-content:center}
    .room-card{border:1px solid #334155;border-radius:0;background:#fff;padding:0;break-inside:avoid;page-break-inside:avoid;display:block}
    .manual-room-row{height:var(--write-height);border-bottom:1px solid #334155;background:#f8fafc;display:flex;align-items:center;justify-content:space-between;gap:1.2mm;direction:rtl;text-align:right;padding:0 1.5mm;color:#0f172a;font-size:var(--room-header-font);font-weight:900}
    .manual-room-row span{white-space:nowrap}
    .room-badge{display:inline-flex;align-items:center;justify-content:center;max-width:44%;min-width:14mm;height:4.2mm;padding:0 2.2mm;border-radius:999px;border:1px solid #d9b861;background:#fffbeb;color:#7c641f;font-size:6.7px;font-weight:900;line-height:1;overflow:hidden;text-overflow:ellipsis;direction:${direction};text-align:center}
    .room-badge.city{border-color:#93c5fd;background:#eff6ff;color:#1d4ed8}
    ol{list-style:none;margin:0;padding:0;display:block;width:100%}
    li{display:flex;flex-direction:column;justify-content:center;height:var(--item-min-height);border-top:1px solid #94a3b8;padding:var(--item-padding);min-width:0;overflow:hidden;background:#fff;direction:rtl;text-align:right}
    ol li:first-child{border-top:0}
    li.numbered{display:table;width:100%;table-layout:fixed;border-collapse:collapse;border-spacing:0;padding:0;direction:rtl;text-align:initial}
    .bed-number{display:table-cell;width:var(--bed-number-width);min-width:var(--bed-number-width);max-width:var(--bed-number-width);height:var(--item-min-height);vertical-align:middle;background:#fef3c7;border-left:1px solid #b99235;color:#111827;font-size:var(--bed-font);font-weight:900;line-height:1;direction:ltr;text-align:center}
    .bed-name-cell{display:table-cell;width:auto;height:var(--item-min-height);vertical-align:middle;min-width:0;overflow:hidden;padding:var(--item-padding);direction:${direction};text-align:${direction === "rtl" ? "right" : "left"}}
    .occupant-line{display:flex;align-items:center;gap:1.1mm;width:100%;min-width:0;overflow:hidden;white-space:nowrap;direction:ltr;text-align:left}
    .rooming-section .room-card .pilgrim-name{display:block;flex:1 1 auto;min-width:0;max-width:100%;overflow:hidden;text-overflow:clip;white-space:nowrap;color:#111827;font-size:min(var(--smart-name-font,var(--name-font)),var(--name-hard-max)) !important;line-height:1.2 !important;font-weight:600;direction:${direction};text-align:${direction === "rtl" ? "right" : "left"}}
    .source-label{display:block;flex:0 1 var(--source-max,28%);max-width:var(--source-max,28%);min-width:0;overflow:hidden;text-overflow:clip;white-space:nowrap;color:#64748b;font-size:var(--smart-source-font,var(--source-font));font-weight:500;line-height:1;margin:0;text-align:left;direction:${direction}}
    li.empty{background:#fff}
    .empty-state{margin:18mm 0 0;text-align:center;color:#64748b;font-size:12px;font-weight:800}
    @media print{
      html,body{background:#fff !important}
      .room-card,.type-title,.print-header{break-inside:avoid;page-break-inside:avoid}
      .rooms-grid{grid-template-columns:repeat(var(--rooms-columns),minmax(0,var(--room-card-max-width)))}
      li.numbered{display:table !important;width:100% !important;table-layout:fixed !important;border-collapse:collapse !important;border-spacing:0 !important}
      .bed-number{display:table-cell !important;width:var(--bed-number-width) !important;min-width:var(--bed-number-width) !important;max-width:var(--bed-number-width) !important;border-left:1px solid #b99235 !important}
      .bed-name-cell{display:table-cell !important;width:auto !important}
    }
  </style>
</head>
<body>
  ${sectionsHtml}
  <script>
    const fitRoomingNames = () => {
      document.querySelectorAll(".occupant-line").forEach((line) => {
        const name = line.querySelector(".pilgrim-name");
        if (!name) return;
        const source = line.querySelector(".source-label");
        const lineWidth = line.clientWidth;
        if (!lineWidth) return;

        if (source) {
          let sourceSize = parseFloat(getComputedStyle(source).fontSize) || 6;
          while (sourceSize > ${SINGLE_LINE_SOURCE_MIN_PX} && source.scrollWidth > source.clientWidth + 0.5) {
            sourceSize -= 0.2;
            source.style.fontSize = sourceSize.toFixed(2) + "px";
          }
        }

        const lineStyle = getComputedStyle(line);
        const columnGap = parseFloat(lineStyle.columnGap);
        const fallbackGap = parseFloat(lineStyle.gap);
        const gap = source ? (Number.isFinite(columnGap) ? columnGap : (Number.isFinite(fallbackGap) ? fallbackGap : 0)) : 0;
        const sourceWidth = source ? source.getBoundingClientRect().width : 0;
        const available = Math.max(1, lineWidth - sourceWidth - gap);
        let nameSize = parseFloat(getComputedStyle(name).fontSize) || 9;
        if (${autoShrinkNames ? "true" : "false"}) {
          while (nameSize > ${ROOMING_NAME_FONT_SIZE_MIN} && name.scrollWidth > available + 0.5) {
            nameSize -= 0.25;
            name.style.fontSize = nameSize.toFixed(2) + "px";
          }
          if (name.scrollWidth > available + 0.5) {
            const scaled = nameSize * (available / Math.max(1, name.scrollWidth)) * 0.98;
            name.style.fontSize = Math.max(${ROOMING_NAME_FONT_SIZE_MIN}, scaled).toFixed(2) + "px";
          }
        }
      });
    };
    window.onbeforeprint = fitRoomingNames;
    window.onload = () => {
      const printNow = () => {
        fitRoomingNames();
        requestAnimationFrame(() => window.print());
      };
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(printNow).catch(() => setTimeout(printNow, 50));
      } else {
        setTimeout(printNow, 50);
      }
    };
  </script>
</body>
</html>`;
};

export const createCombinedRoomingSection = ({
  rooms = [],
  makkahHotel = "",
  madinahHotel = "",
  makkahDates = {},
  madinahDates = {},
  labels = {},
} = {}) => {
  const makkahLabel = labels.makkah || "مكة";
  const madinahLabel = labels.madinah || "المدينة";
  const title = [madinahHotel, makkahHotel].filter(Boolean).join(" — ")
    || `${madinahLabel} — ${makkahLabel}`;
  return {
    combined: true,
    city: "combined",
    cityLabel: title,
    hotel: "",
    checkIn: minDateValue(makkahDates.checkIn, madinahDates.checkIn),
    checkOut: maxDateValue(makkahDates.checkOut, madinahDates.checkOut),
    rooms,
    dateRanges: [
      { key: "makkah", label: makkahLabel, hotel: makkahHotel, checkIn: makkahDates.checkIn, checkOut: makkahDates.checkOut },
      { key: "madinah", label: madinahLabel, hotel: madinahHotel, checkIn: madinahDates.checkIn, checkOut: madinahDates.checkOut },
    ],
  };
};

export const createUnifiedRoomingSection = ({
  rooms = [],
  makkahHotel = "",
  madinahHotel = "",
  makkahDates = {},
  madinahDates = {},
  labels = {},
} = {}) => {
  const makkahLabel = labels.makkah || "مكة";
  const madinahLabel = labels.madinah || "المدينة";
  return {
    combined: true,
    unified: true,
    city: "combined",
    cityLabel: labels.roomingUnifiedTitle || `${makkahLabel} + ${madinahLabel}`,
    hotel: "",
    checkIn: minDateValue(makkahDates.checkIn, madinahDates.checkIn),
    checkOut: maxDateValue(makkahDates.checkOut, madinahDates.checkOut),
    rooms,
    dateRanges: [
      {
        key: "makkah",
        label: makkahLabel,
        hotel: makkahHotel,
        checkIn: makkahDates.checkIn,
        checkOut: makkahDates.checkOut,
        infoTemplate: labels.roomingUnifiedMakkahInfo,
      },
      {
        key: "madinah",
        label: madinahLabel,
        hotel: madinahHotel,
        checkIn: madinahDates.checkIn,
        checkOut: madinahDates.checkOut,
        infoTemplate: labels.roomingUnifiedMadinahInfo,
      },
    ],
  };
};
