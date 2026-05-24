import { getProgramKind } from "../../../utils/participantTerminology";
import {
  getPosterDatePairs,
  getProgramPosterLevels,
  resolvePosterAreaValue,
} from "../utils/programPosterMapping";
import { drawPosterTextInBox } from "../utils/posterTextRendering";

const POSTER_WIDTH = 1240;
const POSTER_HEIGHT = 1754;
const PAGE_MARGIN = 80;
const CONTENT_X = PAGE_MARGIN;
const CONTENT_RIGHT = POSTER_WIDTH - PAGE_MARGIN;
const CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_X;
const MAX_EXPORT_PIXELS = 12000000;
const OFFICIAL_DATE_CARD_H = 102;
const OFFICIAL_DATE_ROW_GAP = 22;

const DEFAULT_PALETTE = {
  background: "#F8F3E8",
  backgroundSoft: "#FFFDF7",
  primary: "#08233F",
  primary2: "#123455",
  accent: "#C79A32",
  accent2: "#1F6A78",
  sand: "#EFE2C8",
  card: "#FFFFFF",
  cardTint: "#FBF6EA",
  text: "#111827",
  muted: "#6F675B",
  border: "#E6D7B8",
};

const ROOM_TYPES = [
  { key: "double", ar: "ثنائية", fr: "Double", en: "Double" },
  { key: "triple", ar: "ثلاثية", fr: "Triple", en: "Triple" },
  { key: "quad", ar: "رباعية", fr: "Quad", en: "Quad" },
  { key: "quint", ar: "خماسية", fr: "Quint", en: "Quint" },
];

const isBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";

const cleanText = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const pickText = (source = {}, keys = []) => {
  for (const key of keys) {
    const value = cleanText(source?.[key]);
    if (value) return value;
  }
  return "";
};

const getRenderScale = (width, height) => {
  if (!isBrowser()) return 1;
  const deviceScale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const pixelScale = Math.sqrt(MAX_EXPORT_PIXELS / Math.max(1, width * height));
  return Math.min(deviceScale, Math.max(1, pixelScale));
};

const getLabels = (lang = "ar") => {
  if (lang === "fr") {
    return {
      official: "Modèle officiel Rukn",
      premiumProgram: "Programme premium",
      umrah: "Omra",
      hajj: "Hajj",
      departure: "Départ",
      returnDate: "Retour",
      route: "Itinéraire",
      flight: "Compagnie",
      visitOrder: "Visite",
      startingFrom: "À partir de",
      level: "Niveau",
      makkah: "La Mecque",
      madinah: "Médine",
      prices: "Prix chambres",
      booking: "Réservation et renseignements",
      terms: "Prix selon disponibilité. Conditions de l’agence applicables.",
      powered: "Powered by Rukn",
      defaultAgency: "Agence de voyage",
      defaultProgram: "Programme Omra",
      visitMakkahFirst: "La Mecque puis Médine",
      visitMadinahFirst: "Médine puis La Mecque",
    };
  }

  if (lang === "en") {
    return {
      official: "Official Rukn template",
      premiumProgram: "Premium program",
      umrah: "Umrah",
      hajj: "Hajj",
      departure: "Departure",
      returnDate: "Return",
      route: "Travel route",
      flight: "Airline",
      visitOrder: "Visit",
      startingFrom: "Starting from",
      level: "Level",
      makkah: "Makkah",
      madinah: "Madinah",
      prices: "Room prices",
      booking: "Booking and inquiries",
      terms: "Prices are subject to availability. Agency terms apply.",
      powered: "Powered by Rukn",
      defaultAgency: "Travel agency",
      defaultProgram: "Umrah program",
      visitMakkahFirst: "Makkah then Madinah",
      visitMadinahFirst: "Madinah then Makkah",
    };
  }

  return {
    official: "قالب ركن الرسمي",
    premiumProgram: "برنامج عمرة مميز",
    umrah: "عمرة",
    hajj: "حج",
    departure: "الذهاب",
    returnDate: "العودة",
    route: "خط الرحلة",
    flight: "خطوط الطيران",
    visitOrder: "الزيارة",
    startingFrom: "ابتداء من",
    level: "المستوى",
    makkah: "مكة",
    madinah: "المدينة",
    prices: "أسعار الغرف",
    booking: "للحجز والاستفسار",
    terms: "الأسعار حسب التوفر. تطبق شروط الوكالة.",
    powered: "Powered by Rukn",
    defaultAgency: "وكالة الأسفار",
    defaultProgram: "برنامج عمرة",
    visitMakkahFirst: "مكة ثم المدينة",
    visitMadinahFirst: "المدينة ثم مكة",
  };
};

const getRoomLabel = (roomType, lang) => {
  const item = ROOM_TYPES.find((room) => room.key === roomType);
  return item?.[lang] || item?.ar || roomType;
};

const hexToRgb = (hex) => {
  const normalized = String(hex || "").replace("#", "");
  if (normalized.length !== 6) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((value) => Number.isNaN(value))) return null;
  return { r, g, b };
};

const rgbToHex = (r, g, b) => `#${[r, g, b].map((value) => (
  Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")
)).join("")}`;

const withAlpha = (hex, alpha) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(255,255,255,${alpha})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
};

const relativeLuminance = ({ r, g, b }) => {
  const values = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
};

const contrastRatio = (hexA, hexB) => {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return 1;
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

const rgbToHsl = (r, g, b) => {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rr) h = (gg - bb) / d + (gg < bb ? 6 : 0);
  if (max === gg) h = (bb - rr) / d + 2;
  if (max === bb) h = (rr - gg) / d + 4;
  return { h: h * 60, s, l };
};

const colorDistance = (a, b) => {
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  if (!rgbA || !rgbB) return 999;
  return Math.sqrt(
    (rgbA.r - rgbB.r) ** 2
    + (rgbA.g - rgbB.g) ** 2
    + (rgbA.b - rgbB.b) ** 2
  );
};

const getReadableTextColor = (background) => (
  contrastRatio(background, "#FFFFFF") >= 4.2 ? "#FFFFFF" : DEFAULT_PALETTE.primary
);

const extractLogoColors = (logoImage) => {
  if (!logoImage?.image || !isBrowser()) return [];
  try {
    const sampleSize = 42;
    const canvas = document.createElement("canvas");
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [];
    ctx.drawImage(logoImage.image, 0, 0, sampleSize, sampleSize);
    const pixels = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
    const buckets = new Map();

    for (let index = 0; index < pixels.length; index += 16) {
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const a = pixels[index + 3];
      if (a < 150) continue;
      const hsl = rgbToHsl(r, g, b);
      if (hsl.l > 0.88 || hsl.l < 0.12 || hsl.s < 0.18) continue;
      if (hsl.s < 0.28 && hsl.l > 0.34 && hsl.l < 0.68) continue;
      const qr = Math.round(r / 24) * 24;
      const qg = Math.round(g / 24) * 24;
      const qb = Math.round(b / 24) * 24;
      const key = rgbToHex(qr, qg, qb);
      const score = (hsl.s * 1.45 + 0.4) * (1 - Math.min(0.72, Math.abs(hsl.l - 0.46)));
      const current = buckets.get(key) || { hex: key, count: 0, score: 0 };
      current.count += 1;
      current.score += score;
      buckets.set(key, current);
    }

    return [...buckets.values()]
      .sort((a, b) => (b.score * b.count) - (a.score * a.count))
      .map((item) => item.hex)
      .filter((hex, index, colors) => colors.slice(0, index).every((existing) => colorDistance(hex, existing) > 58))
      .slice(0, 3);
  } catch {
    return [];
  }
};

const getOfficialPosterPalette = ({ agencyLogoImage } = {}) => {
  const logoColors = extractLogoColors(agencyLogoImage);
  const brandAccent = logoColors.find((hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return false;
    const luminance = relativeLuminance(rgb);
    return luminance > 0.08 && luminance < 0.72;
  });
  const brandAccent2 = logoColors.find((hex) => hex !== brandAccent) || "";

  return {
    ...DEFAULT_PALETTE,
    brand: brandAccent || DEFAULT_PALETTE.accent2,
    brand2: brandAccent2 || DEFAULT_PALETTE.accent,
    brandText: getReadableTextColor(brandAccent || DEFAULT_PALETTE.accent2),
    logoColors,
  };
};

const roundRectPath = (ctx, x, y, width, height, radius = 16) => {
  const r = Math.min(radius, width / 2, height / 2);
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
};

const fillRoundRect = (ctx, x, y, width, height, radius, fillStyle) => {
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();
};

const strokeRoundRect = (ctx, x, y, width, height, radius, strokeStyle, lineWidth = 1) => {
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();
};

const shadowRoundRect = (
  ctx,
  x,
  y,
  width,
  height,
  radius,
  fillStyle,
  shadowColor = "rgba(8,35,63,.08)",
  options = {}
) => {
  ctx.save();
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = options.blur ?? 28;
  ctx.shadowOffsetX = options.offsetX ?? 0;
  ctx.shadowOffsetY = options.offsetY ?? 12;
  fillRoundRect(ctx, x, y, width, height, radius, fillStyle);
  ctx.restore();
};

const PLANE_ICON_PATH = "M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z";

const drawPlaneIcon = (ctx, x, y, size = 30, color = DEFAULT_PALETTE.primary, angle = Math.PI / 2) => {
  ctx.save();
  ctx.shadowColor = "rgba(17,24,39,.14)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.translate(x, y);
  ctx.rotate(angle);
  const scale = size / 24;
  ctx.scale(scale, scale);
  ctx.translate(-12, -12);
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(255,255,255,.78)";
  ctx.lineWidth = Math.max(0.8, size * 0.025);
  const path = new Path2D(PLANE_ICON_PATH);
  ctx.fill(path);
  ctx.stroke(path);
  ctx.restore();
};

const drawTextBox = (ctx, text, box, style = {}, options = {}) => {
  if (!cleanText(text)) return;
  drawPosterTextInBox(ctx, text, box, {
    color: DEFAULT_PALETTE.text,
    align: options.lang === "ar" ? "right" : "left",
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 1.15,
    paddingX: 0,
    paddingY: 0,
    minFontSize: 12,
    maxLines: 2,
    autoFit: true,
    wrap: true,
    verticalAlign: "middle",
    ...style,
  }, options);
};

const drawDiamondPattern = (ctx, palette, posterHeight = POSTER_HEIGHT) => {
  ctx.save();
  ctx.strokeStyle = withAlpha(palette.primary, 0.035);
  ctx.lineWidth = 1;
  for (let x = -30; x < POSTER_WIDTH + 80; x += 92) {
    for (let y = 20; y < posterHeight + 80; y += 92) {
      ctx.beginPath();
      ctx.moveTo(x + 34, y);
      ctx.lineTo(x + 68, y + 34);
      ctx.lineTo(x + 34, y + 68);
      ctx.lineTo(x, y + 34);
      ctx.closePath();
      ctx.stroke();
      if ((x + y) % 184 === 0) {
        ctx.beginPath();
        ctx.arc(x + 34, y + 34, 5, 0, Math.PI * 2);
        ctx.strokeStyle = withAlpha(palette.accent, 0.06);
        ctx.stroke();
        ctx.strokeStyle = withAlpha(palette.primary, 0.035);
      }
    }
  }
  ctx.restore();
};

const drawBackground = (ctx, palette, posterHeight = POSTER_HEIGHT) => {
  const gradient = ctx.createLinearGradient(0, 0, POSTER_WIDTH, posterHeight);
  gradient.addColorStop(0, palette.backgroundSoft);
  gradient.addColorStop(0.48, palette.background);
  gradient.addColorStop(1, "#F2E7D0");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, POSTER_WIDTH, posterHeight);

  const goldGlow = ctx.createRadialGradient(1080, 88, 20, 1080, 88, 620);
  goldGlow.addColorStop(0, withAlpha(palette.accent, 0.18));
  goldGlow.addColorStop(0.45, withAlpha(palette.accent, 0.055));
  goldGlow.addColorStop(1, withAlpha(palette.accent, 0));
  ctx.fillStyle = goldGlow;
  ctx.fillRect(0, 0, POSTER_WIDTH, 560);

  const brandGlow = ctx.createRadialGradient(120, 1420, 20, 120, 1420, 640);
  brandGlow.addColorStop(0, withAlpha(palette.brand, 0.11));
  brandGlow.addColorStop(1, withAlpha(palette.brand, 0));
  ctx.fillStyle = brandGlow;
  ctx.fillRect(0, 900, POSTER_WIDTH, posterHeight - 900);

  drawDiamondPattern(ctx, palette, posterHeight);

  ctx.save();
  ctx.strokeStyle = withAlpha(palette.accent, 0.18);
  ctx.lineWidth = 2;
  [0, 1, 2].forEach((index) => {
    ctx.beginPath();
    ctx.arc(1190, 190, 210 + index * 54, Math.PI * 0.58, Math.PI * 1.62);
    ctx.stroke();
  });
  ctx.restore();

  ctx.save();
  ctx.fillStyle = palette.primary;
  ctx.fillRect(0, 0, POSTER_WIDTH, 8);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(0, 8, POSTER_WIDTH, 4);
  ctx.restore();
};

const loadImage = async (url) => {
  const sourceUrl = cleanText(url);
  if (!sourceUrl || !isBrowser()) return null;

  let objectUrl = "";
  try {
    if (sourceUrl.startsWith("data:")) {
      objectUrl = sourceUrl;
    } else {
      const response = await fetch(sourceUrl);
      if (!response.ok) return null;
      const blob = await response.blob();
      objectUrl = URL.createObjectURL(blob);
    }

    return await new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve({
        image,
        objectUrl: objectUrl === sourceUrl && sourceUrl.startsWith("data:") ? "" : objectUrl,
      });
      image.onerror = () => {
        if (objectUrl && !sourceUrl.startsWith("data:")) URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
      image.src = objectUrl;
    });
  } catch {
    if (objectUrl && !sourceUrl.startsWith("data:")) URL.revokeObjectURL(objectUrl);
    return null;
  }
};

const drawImageCover = (ctx, image, x, y, width, height) => {
  const ratio = Math.min(width / image.width, height / image.height);
  const drawW = image.width * ratio;
  const drawH = image.height * ratio;
  ctx.drawImage(image, x + (width - drawW) / 2, y + (height - drawH) / 2, drawW, drawH);
};

const getAgencyName = (agency, labels) => pickText(agency, [
  "name",
  "agencyName",
  "agency_name",
  "nameAr",
  "name_ar",
  "commercialName",
  "commercial_name",
]) || labels.defaultAgency;

const drawAgencyBrand = (ctx, agency = {}, logoImage, lang, labels, palette) => {
  const agencyName = getAgencyName(agency, labels);
  const logoSize = 128;
  const logoY = 64;
  const logoX = lang === "ar" ? CONTENT_RIGHT - logoSize : CONTENT_X;
  const textX = lang === "ar" ? CONTENT_X : logoX + logoSize + 34;
  const textWidth = CONTENT_WIDTH - logoSize - 38;
  const officialPill = {
    x: lang === "ar" ? CONTENT_RIGHT - logoSize - 304 : textX,
    y: 150,
    width: 286,
    height: 38,
  };

  // Keep logo rendering intentionally simple. This padded white frame works for
  // transparent and solid-background logos, and leaves room for future cleanup.
  shadowRoundRect(ctx, logoX, logoY, logoSize, logoSize, 30, palette.card, "rgba(8,35,63,.07)");
  strokeRoundRect(ctx, logoX, logoY, logoSize, logoSize, 30, withAlpha(palette.border, 0.95));
  if (logoImage?.image) {
    const logoPadding = 18;
    const innerSize = logoSize - logoPadding * 2;
    ctx.save();
    ctx.beginPath();
    roundRectPath(ctx, logoX + logoPadding, logoY + logoPadding, innerSize, innerSize, 20);
    ctx.clip();
    drawImageCover(ctx, logoImage.image, logoX + logoPadding, logoY + logoPadding, innerSize, innerSize);
    ctx.restore();
  } else {
    const initial = cleanText(agencyName).slice(0, 1).toUpperCase() || "R";
    fillRoundRect(ctx, logoX + 12, logoY + 12, logoSize - 24, logoSize - 24, 24, withAlpha(palette.accent, 0.16));
    drawTextBox(ctx, initial, { x: logoX, y: logoY, width: logoSize, height: logoSize }, {
      color: palette.primary,
      fontSize: 58,
      maxLines: 1,
      align: "center",
    }, { lang, type: "brand_mark" });
  }

  drawTextBox(ctx, agencyName, {
    x: textX,
    y: 76,
    width: textWidth,
    height: 54,
  }, {
    color: palette.primary,
    fontSize: 34,
    minFontSize: 18,
    maxLines: 1,
    align: lang === "ar" ? "right" : "left",
  }, { lang, type: "agency_name" });

  fillRoundRect(ctx, officialPill.x, officialPill.y, officialPill.width, officialPill.height, 19, withAlpha(palette.brand, 0.1));
  strokeRoundRect(ctx, officialPill.x, officialPill.y, officialPill.width, officialPill.height, 19, withAlpha(palette.brand, 0.24));
  drawTextBox(ctx, labels.official, {
    x: officialPill.x + 20,
    y: officialPill.y,
    width: officialPill.width - 40,
    height: officialPill.height,
  }, {
    color: palette.primary,
    fontSize: 16,
    fontWeight: "400",
    maxLines: 1,
    align: "center",
  }, { lang, type: "official_label" });
};

const getProgramTypeLabel = (program, labels) => {
  const kind = getProgramKind(program, null, {
    allowNameFallback: true,
    defaultKind: "umrah",
  });
  return kind === "hajj" ? labels.hajj : labels.umrah;
};

const sanitizeAirlineText = (value) => cleanText(value)
  .replace(/\s*[\[(]\s*[A-Z0-9]{1,5}\s*[\])]/gi, "")
  .replace(/\s*[-–]\s*[A-Z0-9]{2,5}\b/g, "")
  .replace(/\s{2,}/g, " ")
  .trim();

const getOfficialRouteText = (value) => cleanText(value).replace(/\s*\/\s*/g, " | ");

const getAgencyContact = (agency = {}, labels = {}) => {
  const phones = [
    agency.phoneTiznit1,
    agency.phoneTiznit2,
    agency.phoneAgadir1,
    agency.phoneAgadir2,
    agency.phone,
    agency.mobile,
  ].map((item) => cleanText(item)).filter(Boolean);
  const uniquePhones = [...new Set(phones)].slice(0, 4);
  const address = [
    pickText(agency, ["agency_city", "city", "ville"]),
    pickText(agency, ["addressTiznit", "addressAgadir", "address", "address_line"]),
  ].filter(Boolean).join(" - ");
  const agencyName = getAgencyName(agency, labels);
  return { phones: uniquePhones, address, agencyName };
};

const drawHero = (ctx, program, labels, lang, palette, posterOptions = {}) => {
  const programName = cleanText(posterOptions?.titleOverride)
    || resolvePosterAreaValue("program_name", program, { lang })
    || labels.defaultProgram;
  const programType = getProgramTypeLabel(program, labels);
  const startingPrice = resolvePosterAreaValue("starting_price", program, { lang });
  const titleBox = lang === "ar"
    ? { x: 500, y: 292, width: 660, height: 156 }
    : { x: CONTENT_X, y: 292, width: 660, height: 156 };
  const priceBox = lang === "ar"
    ? { x: CONTENT_X, y: 282, width: 372, height: 186 }
    : { x: CONTENT_RIGHT - 372, y: 282, width: 372, height: 186 };
  const typePill = {
    x: lang === "ar" ? titleBox.x + titleBox.width - 142 : titleBox.x,
    y: 236,
    width: 142,
    height: 42,
  };
  const descriptor = {
    x: lang === "ar" ? titleBox.x : titleBox.x + typePill.width + 20,
    y: 240,
    width: titleBox.width - typePill.width - 16,
    height: 32,
  };

  drawTextBox(ctx, labels.premiumProgram, {
    x: descriptor.x,
    y: descriptor.y,
    width: descriptor.width,
    height: descriptor.height,
  }, {
    color: palette.brand,
    fontSize: 18,
    fontWeight: "400",
    maxLines: 1,
    align: lang === "ar" ? "right" : "left",
  }, { lang, type: "premium_label" });

  fillRoundRect(ctx, typePill.x, typePill.y, typePill.width, typePill.height, 20, withAlpha(palette.primary, 0.96));
  strokeRoundRect(ctx, typePill.x, typePill.y, typePill.width, typePill.height, 20, withAlpha(palette.accent, 0.34));
  drawTextBox(ctx, programType, {
    x: typePill.x + 16,
    y: typePill.y,
    width: typePill.width - 32,
    height: typePill.height,
  }, {
    color: "#FFFFFF",
    fontSize: 19,
    maxLines: 1,
    align: "center",
  }, { lang, type: "program_type" });

  drawTextBox(ctx, programName, titleBox, {
    color: palette.primary,
    fontSize: 64,
    minFontSize: 30,
    maxLines: 2,
    lineHeight: 1.02,
    align: lang === "ar" ? "right" : "left",
  }, { lang, type: "program_name" });

  if (startingPrice) {
    const priceGradient = ctx.createLinearGradient(priceBox.x, priceBox.y, priceBox.x + priceBox.width, priceBox.y + priceBox.height);
    priceGradient.addColorStop(0, "#F9DF87");
    priceGradient.addColorStop(0.58, "#D5A83D");
    priceGradient.addColorStop(1, "#B9811E");
    shadowRoundRect(ctx, priceBox.x, priceBox.y, priceBox.width, priceBox.height, 34, priceGradient, withAlpha(palette.accent, 0.18), {
      blur: 18,
      offsetY: 8,
    });
    strokeRoundRect(ctx, priceBox.x, priceBox.y, priceBox.width, priceBox.height, 34, "rgba(255,255,255,.75)", 2);
    drawTextBox(ctx, labels.startingFrom, {
      x: priceBox.x + 28,
      y: priceBox.y + 30,
      width: priceBox.width - 56,
      height: 30,
    }, {
      color: withAlpha(palette.primary, 0.78),
      fontSize: 18,
      fontWeight: "400",
      maxLines: 1,
      align: "center",
    }, { lang, type: "starting_price_label" });
    drawTextBox(ctx, startingPrice, {
      x: priceBox.x + 22,
      y: priceBox.y + 68,
      width: priceBox.width - 44,
      height: 82,
    }, {
      color: palette.primary,
      fontSize: 54,
      minFontSize: 26,
      maxLines: 1,
      align: "center",
      wrap: false,
    }, { lang, type: "starting_price" });
  }
};

const getTableMetrics = (count) => {
  if (count <= 1) return { y: 656, rowH: 278, gap: 16 };
  if (count === 2) return { y: 642, rowH: 170, gap: 16 };
  if (count === 3) return { y: 626, rowH: 140, gap: 14 };
  if (count === 4) return { y: 606, rowH: 118, gap: 12 };
  return { y: 590, rowH: 104, gap: 9 };
};

const getTableLayout = () => ({
  level: { x: 982, width: 168 },
  makkah: { x: 768, width: 196 },
  madinah: { x: 554, width: 196 },
  prices: { x: 104, width: 438 },
});

const drawTableHeader = (ctx, y, labels, lang, palette, layout) => {
  const headerY = y - 42;
  const headers = [
    { label: labels.level, box: layout.level, type: "level_header" },
    { label: labels.makkah, box: layout.makkah, type: "makkah_header" },
    { label: labels.madinah, box: layout.madinah, type: "madinah_header" },
    { label: labels.prices, box: layout.prices, type: "prices_header" },
  ];
  headers.forEach((item) => {
    drawTextBox(ctx, item.label, {
      x: item.box.x,
      y: headerY,
      width: item.box.width,
      height: 32,
    }, {
      color: palette.primary,
      fontSize: 18,
      maxLines: 1,
      align: "center",
    }, { lang, type: item.type });
  });
  ctx.save();
  ctx.strokeStyle = withAlpha(palette.accent, 0.36);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(92, headerY + 39);
  ctx.lineTo(1150, headerY + 39);
  ctx.stroke();
  ctx.restore();
};

const drawPriceCells = (ctx, program, levelNumber, rowY, rowH, pricesBox, lang, palette) => {
  const cellGap = 8;
  const cellW = (pricesBox.width - cellGap * 3) / 4;
  const cellH = Math.max(66, rowH - 28);
  const cellY = rowY + (rowH - cellH) / 2;
  ROOM_TYPES.forEach((room, index) => {
    const visualIndex = lang === "ar" ? index : 3 - index;
    const x = pricesBox.x + pricesBox.width - (visualIndex + 1) * cellW - visualIndex * cellGap;
    const value = resolvePosterAreaValue(`level_${levelNumber}_${room.key}_price`, program, { lang }) || "—";
    fillRoundRect(ctx, x, cellY, cellW, cellH, 16, "#FFFFFF");
    strokeRoundRect(ctx, x, cellY, cellW, cellH, 16, withAlpha(palette.accent, 0.34));
    drawTextBox(ctx, getRoomLabel(room.key, lang), {
      x: x + 8,
      y: cellY + 9,
      width: cellW - 16,
      height: 24,
    }, {
      color: palette.brand,
      fontSize: rowH <= 110 ? 14 : 16,
      fontWeight: "700",
      maxLines: 1,
      align: "center",
    }, { lang, type: `room_${room.key}_label` });
    drawTextBox(ctx, value, {
      x: x + 7,
      y: cellY + 34,
      width: cellW - 14,
      height: cellH - 38,
    }, {
      color: palette.primary,
      fontSize: rowH <= 110 ? 24 : 29,
      minFontSize: 13,
      maxLines: 1,
      align: "center",
      wrap: false,
    }, { lang, type: `level_${levelNumber}_${room.key}_price` });
  });
};

const drawLevelsTable = (ctx, program, labels, lang, palette) => {
  const levels = getProgramPosterLevels(program).slice(0, 5);
  const displayLevels = levels.length ? levels : [{}];
  const count = displayLevels.length;
  const metrics = getTableMetrics(count);
  const layout = getTableLayout();
  const tableHeight = count * metrics.rowH + (count - 1) * metrics.gap;

  shadowRoundRect(ctx, 68, metrics.y - 58, 1104, tableHeight + 86, 36, "rgba(255,255,255,.82)", "rgba(8,35,63,.07)");
  strokeRoundRect(ctx, 68, metrics.y - 58, 1104, tableHeight + 86, 36, withAlpha(palette.border, 0.72));
  drawTableHeader(ctx, metrics.y, labels, lang, palette, layout);

  displayLevels.forEach((_, index) => {
    const levelNumber = index + 1;
    const rowY = metrics.y + index * (metrics.rowH + metrics.gap);
    fillRoundRect(ctx, 92, rowY, 1058, metrics.rowH, 26, index % 2 === 0 ? palette.card : palette.cardTint);
    strokeRoundRect(ctx, 92, rowY, 1058, metrics.rowH, 26, withAlpha(palette.border, 0.76));

    fillRoundRect(ctx, layout.level.x, rowY + 18, layout.level.width, metrics.rowH - 36, 18, withAlpha(palette.primary, 0.96));
    drawTextBox(ctx, resolvePosterAreaValue(`level_${levelNumber}_name`, program, { lang }), {
      x: layout.level.x + 13,
      y: rowY + 20,
      width: layout.level.width - 26,
      height: metrics.rowH - 40,
    }, {
      color: "#FFFFFF",
      fontSize: count >= 4 ? 23 : 29,
      minFontSize: 12,
      maxLines: 1,
      align: "center",
      lineHeight: 1.08,
      wrap: false,
    }, { lang, type: `level_${levelNumber}_name` });

    drawTextBox(ctx, resolvePosterAreaValue(`makkah_hotel_l${levelNumber}`, program, { lang }), {
      x: layout.makkah.x,
      y: rowY + 14,
      width: layout.makkah.width,
      height: metrics.rowH - 28,
    }, {
      color: palette.text,
      fontSize: count >= 4 ? 20 : 25,
      minFontSize: 13,
      maxLines: count >= 4 ? 2 : 3,
      align: "center",
      paddingX: 8,
      paddingY: 4,
      lineHeight: 1.14,
    }, { lang, type: `makkah_hotel_l${levelNumber}` });

    drawTextBox(ctx, resolvePosterAreaValue(`madinah_hotel_l${levelNumber}`, program, { lang }), {
      x: layout.madinah.x,
      y: rowY + 14,
      width: layout.madinah.width,
      height: metrics.rowH - 28,
    }, {
      color: palette.text,
      fontSize: count >= 4 ? 20 : 25,
      minFontSize: 13,
      maxLines: count >= 4 ? 2 : 3,
      align: "center",
      paddingX: 8,
      paddingY: 4,
      lineHeight: 1.14,
    }, { lang, type: `madinah_hotel_l${levelNumber}` });

    drawPriceCells(ctx, program, levelNumber, rowY, metrics.rowH, layout.prices, lang, palette);
  });

  return {
    endY: metrics.y + tableHeight,
    levelCount: count,
  };
};

const drawDetailCard = (ctx, label, value, box, lang, palette, type, options = {}) => {
  if (!cleanText(value)) return false;
  const textAlign = options.align || (lang === "ar" ? "right" : "left");
  fillRoundRect(ctx, box.x, box.y, box.width, box.height, 20, options.fill || "rgba(255,255,255,.8)");
  strokeRoundRect(ctx, box.x, box.y, box.width, box.height, 20, withAlpha(options.border || palette.border, 0.78));
  drawTextBox(ctx, label, {
    x: box.x + 18,
    y: box.y + 10,
    width: box.width - 36,
    height: 22,
  }, {
    color: palette.muted,
    fontSize: 15,
    fontWeight: "400",
    maxLines: 1,
    align: textAlign,
  }, { lang, type: `${type}_label` });
  drawTextBox(ctx, value, {
    x: box.x + 18,
    y: box.y + 34,
    width: box.width - 36,
    height: box.height - 42,
  }, {
    color: options.color || palette.primary,
    fontSize: options.fontSize || 23,
    minFontSize: 13,
    maxLines: options.maxLines || 2,
    align: textAlign,
    lineHeight: 1.14,
  }, { lang, type });
  return true;
};

const getRouteLabel = (labels, airline, lang) => {
  if (!airline) return labels.route;
  if (lang === "fr") return `${labels.route} avec ${airline}`;
  if (lang === "en") return `${labels.route} with ${airline}`;
  return `${labels.route} مع ${airline}`;
};

const drawDateCard = (ctx, label, value, box, lang, palette, type) => {
  if (!cleanText(value)) return false;
  shadowRoundRect(ctx, box.x, box.y, box.width, box.height, 24, "rgba(255,255,255,.9)", "rgba(8,35,63,.05)");
  strokeRoundRect(ctx, box.x, box.y, box.width, box.height, 24, withAlpha(palette.border, 0.88));
  drawTextBox(ctx, label, {
    x: box.x + 24,
    y: box.y + 16,
    width: box.width - 48,
    height: 26,
  }, {
    color: palette.muted,
    fontSize: 17,
    fontWeight: "400",
    maxLines: 1,
    align: "center",
  }, { lang, type: `${type}_label` });
  drawTextBox(ctx, value, {
    x: box.x + 24,
    y: box.y + 46,
    width: box.width - 48,
    height: box.height - 58,
  }, {
    color: palette.primary,
    fontSize: 30,
    minFontSize: 17,
    maxLines: 1,
    align: "center",
    wrap: false,
  }, { lang, type });
  return true;
};

const drawFlightConnector = (ctx, box, direction, palette) => {
  const y = box.y + box.height / 2;
  const startX = direction > 0 ? box.x : box.x + box.width;
  const endX = direction > 0 ? box.x + box.width : box.x;
  const lineCenter = box.x + box.width / 2;

  ctx.save();
  ctx.strokeStyle = withAlpha(palette.primary, 0.78);
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.setLineDash([8, 9]);
  ctx.beginPath();
  ctx.moveTo(startX, y);
  ctx.lineTo(endX, y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = palette.primary;
  ctx.beginPath();
  ctx.moveTo(endX + direction * 18, y);
  ctx.lineTo(endX - direction * 8, y - 14);
  ctx.lineTo(endX - direction * 8, y + 14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  drawPlaneIcon(ctx, lineCenter - direction * 38, y - 11, 34, palette.primary, Math.PI / 2);
  drawPlaneIcon(ctx, lineCenter + direction * 38, y + 13, 30, palette.primary, -Math.PI / 2);
};

const drawDatePairRow = (ctx, pair, labels, lang, palette, y) => {
  const cardW = 390;
  const cardH = OFFICIAL_DATE_CARD_H;
  const leftCard = { x: CONTENT_X, y, width: cardW, height: cardH };
  const rightCard = { x: CONTENT_RIGHT - cardW, y, width: cardW, height: cardH };
  const departureBox = lang === "ar" ? rightCard : leftCard;
  const returnBox = lang === "ar" ? leftCard : rightCard;

  drawDateCard(ctx, labels.departure, pair.departureDate || "—", departureBox, lang, palette, "departure_date");
  drawDateCard(ctx, labels.returnDate, pair.returnDate || "—", returnBox, lang, palette, "return_date");
  drawFlightConnector(ctx, {
    x: leftCard.x + leftCard.width + 44,
    y,
    width: rightCard.x - (leftCard.x + leftCard.width) - 88,
    height: cardH,
  }, lang === "ar" ? -1 : 1, palette);
};

const drawTripDetails = (ctx, program, labels, lang, palette, startY, options = {}) => {
  const departure = resolvePosterAreaValue("departure_date", program, { lang });
  const returnDate = resolvePosterAreaValue("return_date", program, { lang });
  const route = getOfficialRouteText(resolvePosterAreaValue("poster_travel_route", program, { lang }));
  const airline = sanitizeAirlineText(resolvePosterAreaValue("flight_info", program, { lang }));
  const routeLabel = getRouteLabel(labels, airline, lang);
  const showDates = options.showDates !== false;
  const isBulkPoster = options.posterOptions?.isBulkPoster === true;
  const bulkDatePairs = isBulkPoster ? getPosterDatePairs(program, options.posterOptions, { lang }) : [];
  let y = startY;

  if (showDates && isBulkPoster && bulkDatePairs.length) {
    bulkDatePairs.forEach((pair, index) => {
      drawDatePairRow(ctx, pair, labels, lang, palette, y + index * (OFFICIAL_DATE_CARD_H + OFFICIAL_DATE_ROW_GAP));
    });
    y += bulkDatePairs.length * OFFICIAL_DATE_CARD_H
      + Math.max(0, bulkDatePairs.length - 1) * OFFICIAL_DATE_ROW_GAP
      + OFFICIAL_DATE_ROW_GAP;
  } else if (showDates && departure && returnDate) {
    drawDatePairRow(ctx, { departureDate: departure, returnDate }, labels, lang, palette, y);
    y += OFFICIAL_DATE_CARD_H + OFFICIAL_DATE_ROW_GAP;
  } else if (showDates && (departure || returnDate)) {
    drawDateCard(ctx, departure ? labels.departure : labels.returnDate, departure || returnDate, {
      x: CONTENT_X + 250,
      y,
      width: CONTENT_WIDTH - 500,
      height: 94,
    }, lang, palette, departure ? "departure_date" : "return_date");
    y += 116;
  }

  if (route) {
    drawDetailCard(ctx, routeLabel, route, {
      x: CONTENT_X,
      y,
      width: CONTENT_WIDTH,
      height: 106,
    }, lang, palette, "poster_travel_route", {
      fill: withAlpha(palette.brand, 0.065),
      border: palette.brand,
      fontSize: 27,
      maxLines: 2,
      align: "center",
    });
    y += 128;
  }

  return y;
};

const drawFooter = (ctx, agency, labels, lang, palette, y = 1510) => {
  const contact = getAgencyContact(agency, labels);
  const phoneText = contact.phones.join("  |  ");
  const align = lang === "ar" ? "right" : "left";
  const addressBox = lang === "ar"
    ? { x: 352, y: y + 128, width: 760, height: 24 }
    : { x: 128, y: y + 128, width: 760, height: 24 };
  const poweredBox = lang === "ar"
    ? { x: 128, y: y + 128, width: 186, height: 24, align: "left" }
    : { x: 930, y: y + 128, width: 186, height: 24, align: "right" };

  shadowRoundRect(ctx, 68, y, 1104, 168, 34, "rgba(255,255,255,.9)", "rgba(8,35,63,.08)");
  strokeRoundRect(ctx, 68, y, 1104, 168, 34, withAlpha(palette.border, 0.9));
  ctx.save();
  ctx.fillStyle = palette.primary;
  ctx.beginPath();
  roundRectPath(ctx, lang === "ar" ? 1140 : 96, y + 24, 7, 120, 999);
  ctx.fill();
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  roundRectPath(ctx, lang === "ar" ? 1124 : 112, y + 24, 4, 120, 999);
  ctx.fill();
  ctx.restore();

  drawTextBox(ctx, labels.booking, {
    x: 128,
    y: y + 24,
    width: 984,
    height: 30,
  }, {
    color: palette.accent,
    fontSize: 21,
    fontWeight: "400",
    maxLines: 1,
    align,
  }, { lang, type: "booking_label" });

  drawTextBox(ctx, contact.agencyName, {
    x: 128,
    y: y + 58,
    width: 984,
    height: 34,
  }, {
    color: palette.primary,
    fontSize: 25,
    minFontSize: 15,
    maxLines: 1,
    align,
    wrap: false,
  }, { lang, type: "footer_agency_name" });

  drawTextBox(ctx, phoneText, {
    x: 128,
    y: y + 92,
    width: 984,
    height: 32,
  }, {
    color: palette.primary,
    fontSize: 23,
    minFontSize: 14,
    maxLines: 1,
    align,
    wrap: false,
  }, { lang, type: "agency_contact" });

  drawTextBox(ctx, contact.address || labels.terms, addressBox, {
    color: palette.muted,
    fontSize: 15,
    fontWeight: "400",
    minFontSize: 10,
    maxLines: 1,
    align,
    wrap: false,
  }, { lang, type: "agency_address" });

  drawTextBox(ctx, labels.powered, poweredBox, {
    color: withAlpha(palette.primary, 0.5),
    fontSize: 14,
    fontWeight: "400",
    maxLines: 1,
    align: poweredBox.align,
    wrap: false,
  }, { lang: "en", type: "powered_by" });
};

const getTripStartY = (tableEndY, levelCount, options = {}) => {
  const footerY = options.footerY || getFooterY();
  if (options.showDates === false) {
    const routeCardH = 106;
    const topGap = levelCount <= 1 ? 86 : levelCount === 2 ? 70 : levelCount === 3 ? 58 : 48;
    const minY = tableEndY + topGap;
    const centeredY = tableEndY + (footerY - tableEndY - routeCardH) / 2;
    return Math.max(minY, Math.min(centeredY, footerY - routeCardH - 92));
  }
  if (levelCount <= 1) return tableEndY + 84;
  if (levelCount === 2) return tableEndY + 64;
  if (levelCount === 3) return tableEndY + 50;
  if (levelCount === 4) return tableEndY + 42;
  return tableEndY + 36;
};

const getFooterY = () => 1510;

export const generateOfficialRuknPosterPng = async ({
  program,
  agency = {},
  agencyLogoUrl = "",
  lang = "ar",
  posterOptions = {},
} = {}) => {
  if (!isBrowser()) throw new Error("poster-generation-browser-only");
  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => {});
  }

  const labels = getLabels(lang);
  const logoUrl = agencyLogoUrl || agency.logoUrl || agency.logo_url || "";
  const logoImage = await loadImage(logoUrl);
  const palette = getOfficialPosterPalette({ agencyLogoImage: logoImage });
  const showDates = posterOptions?.showDates !== false;
  const bulkDateRows = posterOptions?.isBulkPoster === true && showDates
    ? getPosterDatePairs(program, posterOptions, { lang }).length
    : 1;
  const dateSectionExtraHeight = Math.max(0, bulkDateRows - 1) * (OFFICIAL_DATE_CARD_H + OFFICIAL_DATE_ROW_GAP);
  const posterHeight = POSTER_HEIGHT + dateSectionExtraHeight;
  const footerY = getFooterY() + dateSectionExtraHeight;

  const renderScale = getRenderScale(POSTER_WIDTH, posterHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(POSTER_WIDTH * renderScale);
  canvas.height = Math.round(posterHeight * renderScale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("poster-canvas-unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.scale(renderScale, renderScale);

  try {
    drawBackground(ctx, palette, posterHeight);
    drawAgencyBrand(ctx, agency, logoImage, lang, labels, palette);
    drawHero(ctx, program, labels, lang, palette, posterOptions);
    const tableLayout = drawLevelsTable(ctx, program, labels, lang, palette);
    drawTripDetails(
      ctx,
      program,
      labels,
      lang,
      palette,
      getTripStartY(tableLayout.endY, tableLayout.levelCount, { showDates, footerY }),
      { showDates, posterOptions }
    );
    drawFooter(ctx, agency, labels, lang, palette, footerY);

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("poster-image-export-failed"));
      }, "image/png");
    });
  } finally {
    if (logoImage?.objectUrl) URL.revokeObjectURL(logoImage.objectUrl);
  }
};
