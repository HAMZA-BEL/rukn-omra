import {
  getPosterDatePairs,
  getProgramPosterLevels,
  resolvePosterAreaValue,
} from "../../../utils/programPosterMapping";
import { drawPosterTextInBox } from "../../../utils/posterTextRendering";
import { getLocalizedAgencyName } from "../../../../../utils/agencyDisplay";
import { getProgramKind } from "../../../../../utils/participantTerminology";
import tiznitLogoUrl from "./assets/tiznit-logo.png";
import madinahHeroUrl from "./assets/madinah-hero.png";
import madinahCircleUrl from "./assets/madinah-circle.jpg";
import kaabaCircleUrl from "./assets/kaaba-circle.png";

export const templateMeta = {
  key: "tiznit_voyages_signature",
  type: "agency_private",
  name: {
    ar: "قالب تيزنيت أسفار",
    fr: "Modèle Tiznit Voyages",
    en: "Tiznit Voyages Template",
  },
  supportedProgramTypes: ["umrah", "hajj"],
  maxLevels: 5,
};

const POSTER_WIDTH = 1240;
const POSTER_HEIGHT = 1754;
const MAX_EXPORT_PIXELS = 12000000;
const PAGE_X = 38;
const PAGE_W = POSTER_WIDTH - PAGE_X * 2;
const FOOTER_Y = 1570;
const FOOTER_H = 148;
const DATE_CARD_H = 82;
const BULK_DATE_ROW_GAP = 14;
const BULK_DATE_MAX_COMPACT_SECTION_H = 135;

const COLORS = {
  blue: "#3F86C9",
  blueDark: "#244E89",
  blueSoft: "#5E7FBC",
  cream: "#F2E7D0",
  cream2: "#FBF2DE",
  sand: "#E9DDC4",
  gold: "#F6BF4F",
  dark: "#242635",
  text: "#111827",
  white: "#FFFFFF",
  muted: "#5B6472",
};

const ROOM_COLUMNS = [
  { key: "quint", label: "خماسية" },
  { key: "quad", label: "رباعية" },
  { key: "triple", label: "ثلاثية" },
  { key: "double", label: "ثنائية" },
];

const TIZNIT_UMRAH_NOTES_LINES = [
  "ملاحظات:",
  "يجب دفع 50% من إجمالي المبلغ عند التسجيل",
  "حجز الروضة الشريفة في تطبيق نسك",
  "صلاحية الجواز لا تقل عن 7 أشهر من تاريخ الذهاب",
  "تاريخ السفر قابل للتأخير أو التغيير من طرف الخطوط الجوية أو السلطات السعودية",
  "الوكالة غير مسؤولة عن أي رسوم ناتجة عن الأمتعة الزائدة",
  "كما أنها غير مسؤولة عن ضياع أو تلف الأمتعة",
];

const TIZNIT_LEGACY_NOTES_LINES = [
  "ملاحظات:",
  "الروضة الشريفة حسب الإمكانية",
  "صلاحية الجواز لا تقل عن 7 أشهر من تاريخ الذهاب",
  "تاريخ السفر قابل للتأخير أو التغيير من طرف الخطوط الجوية أو السلطات السعودية",
  "الوكالة غير مسؤولة عن أي رسوم ناتجة عن الأمتعة الزائدة",
  "كما أنها غير مسؤولة عن ضياع أو تلف الأمتعة",
];

const TIZNIT_AGENCY_CONTACT_LINES = [
  "وكالة تيزنيت: 0528862117 / 0661794781",
  "وكالة أكادير: 0528210022 / 0689800037",
];

const TIZNIT_UMRAH_PEOPLE_CONTACTS = [
  { name: "الحسين بلوقيد", phone: "0661786932" },
  { name: "الطاهر بن بريك", phone: "0615506049" },
  { name: "عبد الله واحمان", phone: "0661151420" },
  { name: "عبد المنعم أغويت", phone: "0699761113" },
];

const TIZNIT_LEGACY_PEOPLE_CONTACTS = [
  { name: "الحسين بلوقيد", phone: "0661786932" },
  { name: "الطاهر بن بريك", phone: "0615506049" },
  { name: "عبد الله واحمان", phone: "0661151420" },
  { name: "حمزة بلوقيد", phone: "0641298739" },
  { name: "عبد المنعم أغويت", phone: "0699761113" },
];

const TIZNIT_ADDRESS_LINES = [
  "تيزنيت : 07 شارع الحسن الثاني ، مركب الباهية تيزنيت",
  "أكادير : شقة رقم 3 الطابق الثاني عمارة رقم 6 شارع فرحات حشاد الداخلة فوق صيدلية رشيد",
];

const TIZNIT_WHATSAPP_URL = "https://wa.me/212661794781";
const QR_VERSION = 2;
const QR_SIZE = 17 + QR_VERSION * 4;
const QR_DATA_CODEWORDS = 28;
const QR_ECC_CODEWORDS = 16;
const IMAGE_ASSET_CACHE = new Map();
const QR_MATRIX_CACHE = new Map();
const IMAGE_ALPHA_BOUNDS_CACHE = new WeakMap();

const isBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";

const cleanText = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const normalizeNumericText = (value) => String(value || "")
  .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
  .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

const hasPositivePosterPrice = (value) => {
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  const text = cleanText(value);
  if (!text) return false;
  const digits = normalizeNumericText(text).replace(/[^\d]/g, "");
  return Number(digits) > 0;
};

const formatPosterPriceDisplay = (value) => (hasPositivePosterPrice(value) ? cleanText(value) : "");

const getRenderScale = (width = POSTER_WIDTH, height = POSTER_HEIGHT) => {
  if (!isBrowser()) return 1;
  const deviceScale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const pixelScale = Math.sqrt(MAX_EXPORT_PIXELS / Math.max(1, width * height));
  return Math.min(deviceScale, Math.max(1, pixelScale));
};

const withAlpha = (hex, alpha) => {
  const normalized = String(hex || "").replace("#", "");
  if (normalized.length !== 6) return `rgba(63,134,201,${alpha})`;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((value) => Number.isNaN(value))) return `rgba(63,134,201,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
};

const bitLength = (value) => {
  let length = 0;
  let current = value;
  while (current > 0) {
    length += 1;
    current >>>= 1;
  }
  return length;
};

const createGaloisTables = () => {
  const exp = Array(512).fill(0);
  const log = Array(256).fill(0);
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    exp[i] = x;
    log[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11D;
  }
  for (let i = 255; i < 512; i += 1) exp[i] = exp[i - 255];
  return { exp, log };
};

const QR_GF = createGaloisTables();

const gfMul = (a, b) => {
  if (!a || !b) return 0;
  return QR_GF.exp[QR_GF.log[a] + QR_GF.log[b]];
};

const multiplyPolynomials = (a, b) => {
  const result = Array(a.length + b.length - 1).fill(0);
  a.forEach((aCoeff, i) => {
    b.forEach((bCoeff, j) => {
      result[i + j] ^= gfMul(aCoeff, bCoeff);
    });
  });
  return result;
};

const getQrGeneratorPolynomial = (degree) => {
  let result = [1];
  for (let i = 0; i < degree; i += 1) {
    result = multiplyPolynomials(result, [1, QR_GF.exp[i]]);
  }
  return result;
};

const getQrErrorCorrection = (dataCodewords, degree) => {
  const generator = getQrGeneratorPolynomial(degree);
  const result = [...dataCodewords, ...Array(degree).fill(0)];
  dataCodewords.forEach((_, i) => {
    const factor = result[i];
    if (!factor) return;
    generator.forEach((coefficient, j) => {
      result[i + j] ^= gfMul(coefficient, factor);
    });
  });
  return result.slice(result.length - degree);
};

const appendBits = (bits, value, length) => {
  for (let i = length - 1; i >= 0; i -= 1) {
    bits.push(((value >>> i) & 1) === 1);
  }
};

const buildQrDataCodewords = (text) => {
  const bytes = Array.from(new TextEncoder().encode(text));
  const bits = [];
  appendBits(bits, 0x4, 4);
  appendBits(bits, bytes.length, 8);
  bytes.forEach((byte) => appendBits(bits, byte, 8));
  const capacityBits = QR_DATA_CODEWORDS * 8;
  const terminator = Math.min(4, capacityBits - bits.length);
  appendBits(bits, 0, terminator);
  while (bits.length % 8 !== 0) bits.push(false);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j += 1) value = (value << 1) | (bits[i + j] ? 1 : 0);
    codewords.push(value);
  }
  for (let pad = 0; codewords.length < QR_DATA_CODEWORDS; pad += 1) {
    codewords.push(pad % 2 === 0 ? 0xEC : 0x11);
  }
  return codewords;
};

const createQrMatrix = () => ({
  modules: Array.from({ length: QR_SIZE }, () => Array(QR_SIZE).fill(false)),
  reserved: Array.from({ length: QR_SIZE }, () => Array(QR_SIZE).fill(false)),
});

const setQrModule = (qr, x, y, dark, reserve = true) => {
  if (x < 0 || y < 0 || x >= QR_SIZE || y >= QR_SIZE) return;
  qr.modules[y][x] = Boolean(dark);
  if (reserve) qr.reserved[y][x] = true;
};

const drawQrFinder = (qr, x, y) => {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= QR_SIZE || yy >= QR_SIZE) continue;
      const inside = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
      const dark = inside && (
        dx === 0 || dx === 6 || dy === 0 || dy === 6
        || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4)
      );
      setQrModule(qr, xx, yy, dark);
    }
  }
};

const drawQrAlignment = (qr, centerX, centerY) => {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      setQrModule(qr, centerX + dx, centerY + dy, distance !== 1);
    }
  }
};

const reserveQrFormatAreas = (qr) => {
  for (let i = 0; i <= 8; i += 1) {
    if (i !== 6) {
      setQrModule(qr, 8, i, false);
      setQrModule(qr, i, 8, false);
    }
  }
  for (let i = 0; i < 8; i += 1) {
    setQrModule(qr, QR_SIZE - 1 - i, 8, false);
    setQrModule(qr, 8, QR_SIZE - 1 - i, false);
  }
};

const drawQrFunctionPatterns = (qr) => {
  drawQrFinder(qr, 0, 0);
  drawQrFinder(qr, QR_SIZE - 7, 0);
  drawQrFinder(qr, 0, QR_SIZE - 7);
  drawQrAlignment(qr, 18, 18);
  for (let i = 8; i < QR_SIZE - 8; i += 1) {
    setQrModule(qr, 6, i, i % 2 === 0);
    setQrModule(qr, i, 6, i % 2 === 0);
  }
  setQrModule(qr, 8, QR_SIZE - 8, true);
  reserveQrFormatAreas(qr);
};

const getQrMask = (mask, x, y) => {
  if (mask === 0) return (x + y) % 2 === 0;
  if (mask === 1) return y % 2 === 0;
  if (mask === 2) return x % 3 === 0;
  if (mask === 3) return (x + y) % 3 === 0;
  if (mask === 4) return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
  if (mask === 5) return ((x * y) % 2) + ((x * y) % 3) === 0;
  if (mask === 6) return ((((x * y) % 2) + ((x * y) % 3)) % 2) === 0;
  return ((((x + y) % 2) + ((x * y) % 3)) % 2) === 0;
};

const applyQrData = (qr, codewords, mask) => {
  const bits = codewords.flatMap((codeword) => (
    Array.from({ length: 8 }, (_, index) => ((codeword >>> (7 - index)) & 1) === 1)
  ));
  let bitIndex = 0;
  let upward = true;
  for (let right = QR_SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let vertical = 0; vertical < QR_SIZE; vertical += 1) {
      const y = upward ? QR_SIZE - 1 - vertical : vertical;
      for (let column = 0; column < 2; column += 1) {
        const x = right - column;
        if (qr.reserved[y][x]) continue;
        const bit = bitIndex < bits.length ? bits[bitIndex] : false;
        setQrModule(qr, x, y, bit !== getQrMask(mask, x, y), false);
        bitIndex += 1;
      }
    }
    upward = !upward;
  }
};

const drawQrFormatBits = (qr, mask) => {
  const data = mask; // Medium error correction uses format bits 00.
  let remainder = data << 10;
  const generator = 0x537;
  while (bitLength(remainder) >= 11) {
    remainder ^= generator << (bitLength(remainder) - 11);
  }
  const bits = ((data << 10) | remainder) ^ 0x5412;
  const getBit = (index) => ((bits >>> index) & 1) !== 0;

  for (let i = 0; i <= 5; i += 1) setQrModule(qr, 8, i, getBit(i));
  setQrModule(qr, 8, 7, getBit(6));
  setQrModule(qr, 8, 8, getBit(7));
  setQrModule(qr, 7, 8, getBit(8));
  for (let i = 9; i < 15; i += 1) setQrModule(qr, 14 - i, 8, getBit(i));
  for (let i = 0; i < 8; i += 1) setQrModule(qr, QR_SIZE - 1 - i, 8, getBit(i));
  for (let i = 8; i < 15; i += 1) setQrModule(qr, 8, QR_SIZE - 15 + i, getBit(i));
  setQrModule(qr, 8, QR_SIZE - 8, true);
};

const buildQrMatrix = (text) => {
  if (QR_MATRIX_CACHE.has(text)) return QR_MATRIX_CACHE.get(text);
  const data = buildQrDataCodewords(text);
  const codewords = [...data, ...getQrErrorCorrection(data, QR_ECC_CODEWORDS)];
  const qr = createQrMatrix();
  const mask = 0;
  drawQrFunctionPatterns(qr);
  applyQrData(qr, codewords, mask);
  drawQrFormatBits(qr, mask);
  QR_MATRIX_CACHE.set(text, qr.modules);
  return qr.modules;
};

const drawQrCode = (ctx, x, y, size, text) => {
  const modules = buildQrMatrix(text);
  const quiet = 4;
  const moduleSize = size / (QR_SIZE + quiet * 2);
  ctx.save();
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = "#111827";
  modules.forEach((row, rowIndex) => {
    row.forEach((dark, columnIndex) => {
      if (!dark) return;
      ctx.fillRect(
        x + (columnIndex + quiet) * moduleSize,
        y + (rowIndex + quiet) * moduleSize,
        Math.ceil(moduleSize),
        Math.ceil(moduleSize)
      );
    });
  });
  ctx.restore();
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
  ctx.arcTo(x, y, x + r, y, r);
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

const drawText = (ctx, value, box, style = {}, options = {}) => {
  if (!cleanText(value)) return;
  drawPosterTextInBox(ctx, value, box, {
    color: COLORS.text,
    align: "center",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 1.12,
    paddingX: 0,
    paddingY: 0,
    minFontSize: 10,
    maxLines: 2,
    autoFit: true,
    wrap: true,
    verticalAlign: "middle",
    ...style,
  }, {
    lang: "ar",
    ...options,
  });
};

const loadImage = async (url) => {
  if (!isBrowser() || !url) return null;
  if (IMAGE_ASSET_CACHE.has(url)) return IMAGE_ASSET_CACHE.get(url);

  const loadPromise = (async () => {
    let objectUrl = "";
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      objectUrl = URL.createObjectURL(blob);

      return await new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = async () => {
          try {
            if (typeof image.decode === "function") await image.decode();
          } catch {
            // The loaded image is still usable if decode() is not supported or rejects.
          }
          resolve({ image, objectUrl, cached: true });
        };
        image.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
        };
        image.src = objectUrl;
      });
    } catch {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      return null;
    }
  })();

  IMAGE_ASSET_CACHE.set(url, loadPromise);
  return loadPromise;
};

const loadTemplateAssets = async () => {
  const [logo, hero, madinahCircle, kaabaCircle] = await Promise.all([
    loadImage(tiznitLogoUrl),
    loadImage(madinahHeroUrl),
    loadImage(madinahCircleUrl),
    loadImage(kaabaCircleUrl),
  ]);
  return { logo, hero, madinahCircle, kaabaCircle };
};

const revokeTemplateAssets = (assets = {}) => {
  Object.values(assets).forEach((asset) => {
    if (asset?.objectUrl && !asset.cached) URL.revokeObjectURL(asset.objectUrl);
  });
};

const drawImageCover = (ctx, image, x, y, width, height, positionX = 0.5, positionY = 0.5) => {
  if (!image || !width || !height) return;
  const ratio = Math.max(width / image.width, height / image.height);
  const drawW = image.width * ratio;
  const drawH = image.height * ratio;
  const dx = x + (width - drawW) * positionX;
  const dy = y + (height - drawH) * positionY;
  ctx.drawImage(image, dx, dy, drawW, drawH);
};

const drawImageContain = (ctx, image, x, y, width, height) => {
  if (!image || !width || !height) return;
  const ratio = Math.min(width / image.width, height / image.height);
  const drawW = image.width * ratio;
  const drawH = image.height * ratio;
  ctx.drawImage(image, x + (width - drawW) / 2, y + (height - drawH) / 2, drawW, drawH);
};

const getImageAlphaBounds = (image) => {
  if (!image || !isBrowser()) return null;
  if (IMAGE_ALPHA_BOUNDS_CACHE.has(image)) return IMAGE_ALPHA_BOUNDS_CACHE.get(image);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
    let minX = image.width;
    let minY = image.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < image.height; y += 2) {
      for (let x = 0; x < image.width; x += 2) {
        if (pixels[(y * image.width + x) * 4 + 3] < 12) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX < minX || maxY < minY) {
      IMAGE_ALPHA_BOUNDS_CACHE.set(image, null);
      return null;
    }
    const bounds = {
      x: Math.max(0, minX - 4),
      y: Math.max(0, minY - 4),
      width: Math.min(image.width - minX, maxX - minX + 10),
      height: Math.min(image.height - minY, maxY - minY + 10),
    };
    IMAGE_ALPHA_BOUNDS_CACHE.set(image, bounds);
    return bounds;
  } catch {
    IMAGE_ALPHA_BOUNDS_CACHE.set(image, null);
    return null;
  }
};

const drawTransparentImageContain = (ctx, image, x, y, width, height) => {
  const bounds = getImageAlphaBounds(image);
  if (!bounds) {
    drawImageContain(ctx, image, x, y, width, height);
    return;
  }
  const ratio = Math.min(width / bounds.width, height / bounds.height);
  const drawW = bounds.width * ratio;
  const drawH = bounds.height * ratio;
  ctx.drawImage(
    image,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    x + (width - drawW) / 2,
    y + (height - drawH) / 2,
    drawW,
    drawH
  );
};

const drawCircleImage = (ctx, image, cx, cy, radius, options = {}) => {
  const border = options.border ?? 26;
  const borderColor = options.borderColor || COLORS.white;
  const shadowColor = options.shadowColor || "rgba(20,42,80,.16)";

  ctx.save();
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + border / 2, 0, Math.PI * 2);
  ctx.fillStyle = borderColor;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  if (image) {
    drawImageCover(
      ctx,
      image,
      cx - radius,
      cy - radius,
      radius * 2,
      radius * 2,
      options.positionX ?? 0.5,
      options.positionY ?? 0.5
    );
  } else {
    ctx.fillStyle = withAlpha(COLORS.blue, 0.16);
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius + border / 2, 0, Math.PI * 2);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = border;
  ctx.stroke();
  ctx.restore();
};

const ICON_PATHS = {
  plane: "M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z",
  phone: "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z",
  car: "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16C5.67 16 5 15.33 5 14.5S5.67 13 6.5 13 8 13.67 8 14.5 7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z",
  hotel: "M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z",
  document: "M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8 13h8v2H8v-2zm0 4h8v2H8v-2z",
  support: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
};

const drawSvgIcon = (ctx, icon, x, y, size = 22, color = COLORS.blueDark, options = {}) => {
  const pathData = ICON_PATHS[icon] || ICON_PATHS.document;
  ctx.save();
  ctx.translate(x, y);
  if (options.angle) ctx.rotate(options.angle);
  const scale = size / 24;
  ctx.scale(scale, scale);
  ctx.translate(-12, -12);
  ctx.fillStyle = color;
  ctx.strokeStyle = options.strokeColor || "rgba(255,255,255,.78)";
  ctx.lineWidth = options.strokeWidth || 0;
  const path = new Path2D(pathData);
  ctx.fill(path);
  if (options.strokeWidth) ctx.stroke(path);
  ctx.restore();
};

const drawPlaneIcon = (ctx, x, y, size = 22, color = COLORS.blueDark, angle = Math.PI / 2) => {
  ctx.save();
  ctx.shadowColor = "rgba(17,24,39,.14)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  drawSvgIcon(ctx, "plane", x, y, size, color, {
    angle,
    strokeWidth: Math.max(0.8, size * 0.025),
  });
  ctx.restore();
};

const drawLineIcon = (ctx, icon, x, y, size = 22, color = COLORS.blueDark) => {
  const iconKey = icon === "visa"
    ? "document"
    : icon === "guide"
    ? "support"
    : icon === "transport"
    ? "car"
    : icon;
  drawSvgIcon(ctx, iconKey, x, y, size, color);
};

const sanitizeAirlineText = (value) => cleanText(value)
  .replace(/\s*[\[(]\s*[A-Z0-9]{1,5}\s*[\])]/gi, "")
  .replace(/\s*[-–]\s*[A-Z0-9]{2,5}\b/g, "")
  .replace(/\s{2,}/g, " ")
  .trim();

const formatRouteValue = (value) => cleanText(value)
  .replace(/\s*(?:←|\||\/)\s*/g, " / ")
  .replace(/\s{2,}/g, " ")
  .trim();

const buildFlightServiceLine = (airline, route) => {
  if (airline && route) return `تذكرة طيران مع ${airline} ${route}`;
  if (airline) return `تذكرة طيران مع ${airline}`;
  if (route) return `تذكرة طيران ${route}`;
  return "تذكرة الطائرة";
};

const getProgramDepartureDateValue = (program = {}) => (
  program.departure || program.departureDate || program.departure_date
);

const getDateSortTime = (value) => {
  if (!value) return Number.POSITIVE_INFINITY;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getTime();

  const text = String(value || "").trim();
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return Number.isNaN(date.getTime()) ? Number.POSITIVE_INFINITY : date.getTime();
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? Number.POSITIVE_INFINITY : parsed.getTime();
};

const getDatePairDepartureSortTime = (pair = {}) => (
  getDateSortTime(getProgramDepartureDateValue(pair.program) || pair.rawDepartureDate || pair.departure || pair.departureDate)
);

const sortPosterDatePairsByDeparture = (datePairs = []) => (
  [...datePairs].sort((a, b) => {
    const aTime = getDatePairDepartureSortTime(a);
    const bTime = getDatePairDepartureSortTime(b);
    const aValid = Number.isFinite(aTime);
    const bValid = Number.isFinite(bTime);
    if (aValid && bValid && aTime !== bTime) return aTime - bTime;
    if (aValid !== bValid) return aValid ? -1 : 1;
    return Number(a.index || 0) - Number(b.index || 0);
  })
);

const parseVersionDate = (program = {}) => {
  const candidate = program.updated_at || program.updatedAt || program.modified_at || program.modifiedAt;
  const parsed = candidate ? new Date(candidate) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) return parsed;
  return new Date();
};

const buildVersionLabel = (program = {}) => {
  const date = parseVersionDate(program);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `V${day}.${month}.${year}`;
};

const getLevelFallbackLabel = (index) => `المستوى ${index + 1}`;

const getVisibleRoomColumns = (rows = []) => ROOM_COLUMNS.filter((room) => (
  rows.some((row) => hasPositivePosterPrice(row?.prices?.[room.key]))
));

const getPosterData = (program = {}, posterOptions = {}) => {
  const levels = getProgramPosterLevels(program).slice(0, 5);
  const programName = cleanText(posterOptions?.titleOverride)
    || resolvePosterAreaValue("program_name", program, { lang: "ar" })
    || "برنامج عمرة";
  const startingPrice = resolvePosterAreaValue("starting_price", program, { lang: "ar" });
  const departureDate = resolvePosterAreaValue("departure_date", program, { lang: "ar" });
  const returnDate = resolvePosterAreaValue("return_date", program, { lang: "ar" });
  const datePairs = sortPosterDatePairsByDeparture(getPosterDatePairs(program, posterOptions, { lang: "ar" }));
  const airline = sanitizeAirlineText(resolvePosterAreaValue("flight_info", program, { lang: "ar" }));
  const route = formatRouteValue(resolvePosterAreaValue("poster_travel_route", program, { lang: "ar" }));
  const rows = levels.map((level, index) => ({
    level: cleanText(resolvePosterAreaValue(`level_${index + 1}_name`, program, { lang: "ar" }), getLevelFallbackLabel(index)),
    madinah: cleanText(resolvePosterAreaValue(`madinah_hotel_l${index + 1}`, program, { lang: "ar" })),
    makkah: cleanText(resolvePosterAreaValue(`makkah_hotel_l${index + 1}`, program, { lang: "ar" })),
    prices: {
      double: formatPosterPriceDisplay(resolvePosterAreaValue(`level_${index + 1}_double_price`, program, { lang: "ar" })),
      triple: formatPosterPriceDisplay(resolvePosterAreaValue(`level_${index + 1}_triple_price`, program, { lang: "ar" })),
      quad: formatPosterPriceDisplay(resolvePosterAreaValue(`level_${index + 1}_quad_price`, program, { lang: "ar" })),
      quint: formatPosterPriceDisplay(resolvePosterAreaValue(`level_${index + 1}_quint_price`, program, { lang: "ar" })),
    },
  }));
  const normalizedRows = rows.length ? rows : [{
    level: getLevelFallbackLabel(0),
    madinah: "",
    makkah: "",
    prices: { double: "", triple: "", quad: "", quint: "" },
  }];

  return {
    programKind: getProgramKind(program),
    programName,
    startingPrice,
    departureDate,
    returnDate,
    datePairs,
    airline,
    route,
    flightServiceLine: buildFlightServiceLine(airline, route),
    rows: normalizedRows,
    visibleRoomColumns: getVisibleRoomColumns(normalizedRows),
  };
};

const drawBackground = (ctx, posterHeight = POSTER_HEIGHT) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, posterHeight);
  gradient.addColorStop(0, "#F9F3E8");
  gradient.addColorStop(0.62, "#FFFFFF");
  gradient.addColorStop(1, "#F4E8D0");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, POSTER_WIDTH, posterHeight);

  ctx.save();
  ctx.strokeStyle = "rgba(63,134,201,.06)";
  ctx.lineWidth = 2;
  for (let x = -120; x < POSTER_WIDTH + 120; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 120, 300, x - 80, 620, x + 60, 940);
    ctx.bezierCurveTo(x + 180, 1200, x + 20, 1460, x + 140, posterHeight);
    ctx.stroke();
  }
  ctx.restore();
};

const drawHero = (ctx, data, assets, agency = {}, lang = "ar") => {
  const heroH = 650;
  const upperShiftY = 18;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, POSTER_WIDTH, heroH + 60);
  ctx.clip();
  if (assets.hero?.image) {
    drawImageCover(ctx, assets.hero.image, 0, 0, POSTER_WIDTH, 560, 0.44, 0.08);
  }

  const heroGradient = ctx.createLinearGradient(0, 0, POSTER_WIDTH, heroH);
  heroGradient.addColorStop(0, "rgba(255,255,255,.72)");
  heroGradient.addColorStop(0.45, "rgba(65,135,202,.34)");
  heroGradient.addColorStop(1, "rgba(42,119,188,.88)");
  ctx.fillStyle = heroGradient;
  ctx.fillRect(0, 0, POSTER_WIDTH, heroH);

  ctx.restore();

  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, -70, 26 + upperShiftY, 555, 114, 58);
  ctx.fillStyle = "#F9C85B";
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = COLORS.blue;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = "rgba(36,78,137,.24)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  drawText(ctx, data.programName, { x: 30, y: 62 + upperShiftY, width: 410, height: 58 }, {
    color: COLORS.white,
    fontSize: 38,
    minFontSize: 18,
    lineHeight: 1.02,
    maxLines: 2,
    align: "center",
  }, { type: "program_name" });
  ctx.restore();

  drawCircleImage(ctx, assets.madinahCircle?.image, 638, 318 + upperShiftY, 182, {
    border: 34,
    positionX: 0.48,
    positionY: 0.45,
  });
  drawCircleImage(ctx, assets.kaabaCircle?.image, 1010, 426 + upperShiftY, 137, {
    border: 28,
    positionX: 0.5,
    positionY: 0.54,
  });

  const logoBox = { x: 858, y: 6 + upperShiftY, width: 336, height: 218 };
  if (assets.logo?.image) {
    drawTransparentImageContain(ctx, assets.logo.image, logoBox.x + 38, logoBox.y - 4, 268, 126);
  }
  const agencyName = getLocalizedAgencyName(agency, lang);
  const latinAgencyName = lang === "ar" ? getLocalizedAgencyName(agency, "fr") : "";
  drawText(ctx, agencyName, { x: logoBox.x, y: logoBox.y + 124, width: logoBox.width, height: 48 }, {
    color: COLORS.white,
    fontSize: 43,
    minFontSize: 16,
    maxLines: 1,
    align: "center",
    paddingX: 6,
  }, { type: "agency_name" });
  drawText(ctx, latinAgencyName, { x: logoBox.x, y: logoBox.y + 174, width: logoBox.width, height: 28 }, {
    color: COLORS.white,
    fontSize: 24,
    minFontSize: 12,
    maxLines: 1,
    align: "center",
    wrap: false,
  }, { lang: "en", type: "agency_name_latin" });
  drawText(ctx, "تجربة أعوام منذ 1975", { x: logoBox.x, y: logoBox.y + 204, width: logoBox.width, height: 30 }, {
    color: "#07111D",
    fontSize: 22,
    minFontSize: 13,
    maxLines: 1,
    align: "center",
    wrap: false,
  }, { type: "agency_experience" });

  const priceRibbon = { x: 0, y: 448 + upperShiftY, width: 500, height: 116 };
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(priceRibbon.x, priceRibbon.y);
  ctx.lineTo(priceRibbon.x + priceRibbon.width - 72, priceRibbon.y);
  ctx.lineTo(priceRibbon.x + priceRibbon.width, priceRibbon.y + priceRibbon.height / 2);
  ctx.lineTo(priceRibbon.x + priceRibbon.width - 72, priceRibbon.y + priceRibbon.height);
  ctx.lineTo(priceRibbon.x, priceRibbon.y + priceRibbon.height);
  ctx.closePath();
  ctx.fillStyle = "rgba(244,232,204,.96)";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = COLORS.blue;
  ctx.stroke();
  ctx.restore();

  const priceTextBox = { x: 56, width: 300 };
  drawText(ctx, "إبتداء من :", { x: priceTextBox.x, y: 466 + upperShiftY, width: priceTextBox.width, height: 38 }, {
    color: COLORS.blueSoft,
    fontSize: 34,
    minFontSize: 20,
    maxLines: 1,
    align: "center",
  }, { type: "starting_from" });
  if (data.startingPrice) {
    drawText(ctx, data.startingPrice, { x: priceTextBox.x, y: 506 + upperShiftY, width: priceTextBox.width, height: 48 }, {
      color: COLORS.dark,
      fontSize: 34,
      minFontSize: 18,
      maxLines: 1,
      align: "center",
      wrap: false,
    }, { type: "starting_price" });
  }

};

const getTableMetrics = (rowCount) => {
  const count = Math.max(1, Math.min(5, rowCount || 1));
  const rowHeight = count >= 5 ? 76 : count === 4 ? 88 : count === 3 ? 104 : count === 2 ? 128 : 170;
  const headerHeight = 72;
  return {
    x: 30,
    y: 650,
    width: POSTER_WIDTH - 60,
    headerHeight,
    rowHeight,
    height: headerHeight + rowHeight * count,
  };
};

const buildTableColumns = (table, visibleRooms = ROOM_COLUMNS) => {
  const fullPriceW = (table.width - 182 - 190 - 190) / ROOM_COLUMNS.length;
  const hotelWeight = 190 / fullPriceW;
  const levelWeight = 182 / fullPriceW;
  const priceWeight = 1;
  const priceColumns = Array.isArray(visibleRooms) ? visibleRooms : ROOM_COLUMNS;
  const totalWeight = priceColumns.length * priceWeight + hotelWeight * 2 + levelWeight;
  const unitW = table.width / Math.max(1, totalWeight);
  const priceW = unitW * priceWeight;
  const madinahW = unitW * hotelWeight;
  const makkahW = unitW * hotelWeight;
  const levelW = unitW * levelWeight;
  const columns = [];
  let x = table.x;
  priceColumns.forEach((room) => {
    columns.push({ key: room.key, label: room.label, x, width: priceW, type: "price" });
    x += priceW;
  });
  columns.push({ key: "makkah", label: "الإقامة بمكة المكرمة", x, width: makkahW, type: "hotel" });
  x += makkahW;
  columns.push({ key: "madinah", label: "الإقامة بالمدينة المنورة", x, width: madinahW, type: "hotel" });
  x += madinahW;
  columns.push({ key: "level", label: "مستوى البرنامج", x, width: levelW, type: "level" });
  return columns;
};

const drawTable = (ctx, data) => {
  const table = getTableMetrics(data.rows.length);
  const columns = buildTableColumns(table, data.visibleRoomColumns);

  fillRoundRect(ctx, table.x - 4, table.y - 4, table.width + 8, table.height + 8, 8, COLORS.white);
  strokeRoundRect(ctx, table.x - 4, table.y - 4, table.width + 8, table.height + 8, 8, "rgba(63,134,201,.35)", 2);

  columns.forEach((column) => {
    ctx.fillStyle = column.type === "level" ? "#F7F8FB" : COLORS.blueSoft;
    ctx.fillRect(column.x, table.y, column.width, table.headerHeight);
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 3;
    ctx.strokeRect(column.x, table.y, column.width, table.headerHeight);
    drawText(ctx, column.label, {
      x: column.x + 8,
      y: table.y + 8,
      width: column.width - 16,
      height: table.headerHeight - 16,
    }, {
      color: column.type === "level" ? COLORS.text : COLORS.white,
      fontSize: column.type === "price" ? 27 : 23,
      minFontSize: 15,
      maxLines: column.type === "price" ? 1 : 2,
      lineHeight: 1.05,
      align: "center",
      wrap: column.type !== "price",
    }, { type: `${column.key}_header` });
  });

  data.rows.forEach((row, rowIndex) => {
    const y = table.y + table.headerHeight + rowIndex * table.rowHeight;
    columns.forEach((column) => {
      const isLevel = column.key === "level";
      const isPrice = column.type === "price";
      ctx.fillStyle = isLevel ? COLORS.dark : (rowIndex % 2 === 0 ? COLORS.cream : COLORS.cream2);
      ctx.fillRect(column.x, y, column.width, table.rowHeight);
      ctx.strokeStyle = COLORS.white;
      ctx.lineWidth = 3;
      ctx.strokeRect(column.x, y, column.width, table.rowHeight);

      if (isLevel) {
        drawText(ctx, row.level, {
          x: column.x + 12,
          y: y + 12,
          width: column.width - 24,
          height: table.rowHeight - 24,
        }, {
          color: COLORS.white,
          fontSize: data.rows.length >= 4 ? 25 : 30,
          minFontSize: 14,
          maxLines: 1,
          align: "center",
          wrap: false,
          lineHeight: 1,
        }, { type: `level_${rowIndex + 1}_name` });
        return;
      }

      if (isPrice) {
        const value = formatPosterPriceDisplay(row.prices?.[column.key]) || "—";
        drawText(ctx, value, {
          x: column.x + 8,
          y: y + 10,
          width: column.width - 16,
          height: table.rowHeight - 20,
        }, {
          color: COLORS.dark,
          fontSize: data.rows.length >= 4 ? 28 : 32,
          minFontSize: 17,
          maxLines: 1,
          align: "center",
          wrap: false,
          lineHeight: 1,
        }, { type: `level_${rowIndex + 1}_${column.key}_price` });
        return;
      }

      const hotelValue = column.key === "makkah" ? row.makkah : row.madinah;
      drawText(ctx, hotelValue || "—", {
        x: column.x + 12,
        y: y + 10,
        width: column.width - 24,
        height: table.rowHeight - 20,
      }, {
        color: COLORS.dark,
        fontSize: data.rows.length >= 4 ? 21 : 24,
        minFontSize: 13,
        maxLines: data.rows.length >= 4 ? 2 : 3,
        align: "center",
        lineHeight: 1.08,
      }, { type: `${column.key}_${rowIndex + 1}` });
    });
  });

  return table.y + table.height;
};

const drawDateCard = (ctx, box, label, value) => {
  fillRoundRect(ctx, box.x, box.y, box.width, box.height, 34, COLORS.cream2);
  strokeRoundRect(ctx, box.x, box.y, box.width, box.height, 34, COLORS.blue, 5);
  drawText(ctx, label, { x: box.x + 24, y: box.y + 14, width: box.width - 48, height: 28 }, {
    color: COLORS.blueDark,
    fontSize: 19,
    minFontSize: 13,
    maxLines: 1,
    align: "center",
  }, { type: `${label}_label` });
  drawText(ctx, value || "—", { x: box.x + 24, y: box.y + 42, width: box.width - 48, height: box.height - 52 }, {
    color: COLORS.dark,
    fontSize: 29,
    minFontSize: 16,
    maxLines: 1,
    align: "center",
    wrap: false,
  }, { type: `${label}_value` });
};

const drawDateRouteRow = (ctx, departureDate, returnDate, y) => {
  const cardW = 420;
  const cardH = DATE_CARD_H;
  const departure = { x: 755, y, width: cardW, height: cardH };
  const arrival = { x: 65, y, width: cardW, height: cardH };

  drawDateCard(ctx, departure, "تاريخ الذهاب", departureDate || "—");
  drawDateCard(ctx, arrival, "تاريخ العودة", returnDate || "—");

  const lineY = y + cardH / 2;
  const lineStart = departure.x - 34;
  const lineEnd = arrival.x + arrival.width + 34;
  ctx.save();
  ctx.strokeStyle = COLORS.dark;
  ctx.lineWidth = 5;
  ctx.setLineDash([8, 9]);
  ctx.beginPath();
  ctx.moveTo(lineStart, lineY);
  ctx.lineTo(lineEnd, lineY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = COLORS.dark;
  ctx.beginPath();
  ctx.moveTo(lineEnd - 8, lineY);
  ctx.lineTo(lineEnd + 18, lineY - 14);
  ctx.lineTo(lineEnd + 18, lineY + 14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const lineCenter = (lineStart + lineEnd) / 2;
  drawPlaneIcon(ctx, lineCenter + 38, lineY - 11, 34, COLORS.blueDark, Math.PI / 2);
  drawPlaneIcon(ctx, lineCenter - 38, lineY + 13, 30, COLORS.blueDark, -Math.PI / 2);

  return y + cardH;
};

const getCompactDateLayout = (dateCount = 2) => {
  const count = Math.max(2, dateCount);
  if (count > 5) {
    const topGap = 6;
    const headerH = 16;
    const headerGap = 2;
    const rowGap = count <= 6 ? 1 : 0;
    const availableRowH = (
      BULK_DATE_MAX_COMPACT_SECTION_H
      - topGap
      - headerH
      - headerGap
      - Math.max(0, count - 1) * rowGap
    ) / count;
    const rowH = Math.max(1, Math.floor(availableRowH * 10) / 10);
    const pillH = Math.max(1, Math.min(rowH, rowH <= 14 ? rowH : rowH - 1));
    const pillPaddingY = pillH <= 14 ? 1 : 2;
    const fontSize = Math.max(6, Math.min(14, (pillH - pillPaddingY * 2) / 1.02));
    return {
      topGap,
      headerH,
      headerGap,
      rowH,
      rowGap,
      pillW: 380,
      pillH,
      fontSize,
      minFontSize: Math.max(6, fontSize - 2),
      lineHeight: 1.02,
      pillPaddingY,
      headerFontSize: 14.5,
    };
  }
  if (count === 5) {
    return {
      topGap: 6,
      headerH: 17,
      headerGap: 2,
      rowH: 21,
      rowGap: 1,
      pillW: 384,
      pillH: 20,
      fontSize: 15.6,
      minFontSize: 12,
      lineHeight: 1.02,
      pillPaddingY: 2,
      headerFontSize: 15,
    };
  }
  if (count === 4) {
    return {
      topGap: 7,
      headerH: 18,
      headerGap: 3,
      rowH: 25,
      rowGap: 2,
      pillW: 392,
      pillH: 23,
      fontSize: 16.6,
      minFontSize: 12.5,
      lineHeight: 1.02,
      pillPaddingY: 3,
      headerFontSize: 15.8,
    };
  }
  if (count === 3) {
    return {
      topGap: 12,
      headerH: 20,
      headerGap: 4,
      rowH: 30,
      rowGap: 4,
      pillW: 400,
      pillH: 28,
      fontSize: 20.2,
      minFontSize: 14,
      lineHeight: 1.03,
      pillPaddingY: 3,
      headerFontSize: 16.5,
    };
  }
  return {
    topGap: 14,
    headerH: 22,
    headerGap: 5,
    rowH: 36,
    rowGap: 8,
    pillW: 400,
    pillH: 34,
    fontSize: 22,
    minFontSize: 15,
    lineHeight: 1.03,
    pillPaddingY: 4,
    headerFontSize: 17,
  };
};

const getCompactDateSectionHeight = (dateCount = 0) => {
  if (dateCount <= 1) return DATE_CARD_H;
  const layout = getCompactDateLayout(dateCount);
  return layout.topGap + layout.headerH + layout.headerGap
    + dateCount * layout.rowH
    + Math.max(0, dateCount - 1) * layout.rowGap;
};

const drawCompactDateHeader = (ctx, label, column, y, layout, type) => {
  const labelW = Math.min(148, column.width);
  const labelH = Math.min(layout.headerH, 20);
  const labelX = column.x + (column.width - labelW) / 2;
  const labelY = y + (layout.headerH - labelH) / 2;

  fillRoundRect(ctx, labelX, labelY, labelW, labelH, labelH / 2, "rgba(251,242,222,.82)");
  strokeRoundRect(ctx, labelX, labelY, labelW, labelH, labelH / 2, "rgba(63,134,201,.28)", 1);
  drawText(ctx, label, {
    x: labelX + 10,
    y: labelY + 1,
    width: labelW - 20,
    height: labelH - 2,
  }, {
    color: COLORS.blueDark,
    fontSize: layout.headerFontSize || 16,
    minFontSize: 11,
    maxLines: 1,
    align: "center",
    wrap: false,
    lineHeight: 1,
  }, { type });
};

const drawCompactDatePill = (ctx, box, value, layout, type) => {
  const radius = Math.min(15, box.height / 2);
  const verticalPadding = layout.pillPaddingY ?? Math.max(2, Math.min(4, Math.round(box.height * 0.14)));

  ctx.save();
  ctx.shadowColor = "rgba(36,78,137,.08)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  fillRoundRect(ctx, box.x, box.y, box.width, box.height, radius, "rgba(251,242,222,.96)");
  ctx.restore();

  strokeRoundRect(ctx, box.x, box.y, box.width, box.height, radius, "rgba(63,134,201,.45)", 1.5);
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = withAlpha(COLORS.gold, 0.72);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(box.x + 18, box.y + box.height - 3);
  ctx.lineTo(box.x + Math.min(box.width - 18, 70), box.y + box.height - 3);
  ctx.stroke();
  ctx.restore();

  drawText(ctx, value || "—", {
    x: box.x + 14,
    y: box.y + verticalPadding,
    width: box.width - 28,
    height: box.height - verticalPadding * 2,
  }, {
    color: COLORS.dark,
    fontSize: layout.fontSize,
    minFontSize: layout.minFontSize,
    maxLines: 1,
    align: "center",
    wrap: false,
    lineHeight: layout.lineHeight || 1.03,
    paddingY: 0,
    verticalAlign: "middle",
  }, { type });
};

const drawCompactDateRowConnector = (ctx, departureColumn, returnColumn, centerY, rowHeight) => {
  const lineStartX = departureColumn.x - 12;
  const lineEndX = returnColumn.x + returnColumn.width + 12;
  const lineCenterX = (lineStartX + lineEndX) / 2;
  const planeSize = Math.max(13, Math.min(18, rowHeight * 0.58));
  const planeGap = planeSize * 0.82;

  ctx.save();
  ctx.globalAlpha = 0.58;
  ctx.strokeStyle = COLORS.blueDark;
  ctx.lineWidth = 1.35;
  ctx.lineCap = "round";
  ctx.setLineDash([4, 7]);
  ctx.beginPath();
  ctx.moveTo(lineStartX, centerY);
  ctx.lineTo(lineCenterX + planeGap, centerY);
  ctx.moveTo(lineCenterX - planeGap, centerY);
  ctx.lineTo(lineEndX, centerY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = COLORS.blueDark;
  ctx.beginPath();
  ctx.moveTo(lineEndX - 4, centerY);
  ctx.lineTo(lineEndX + 8, centerY - 6);
  ctx.lineTo(lineEndX + 8, centerY + 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  drawPlaneIcon(ctx, lineCenterX, centerY, planeSize, COLORS.blueDark, -Math.PI / 2);
};

const drawCompactDateRouteSection = (ctx, datePairs, startY) => {
  const sortedPairs = sortPosterDatePairsByDeparture(datePairs);
  const layout = getCompactDateLayout(sortedPairs.length);
  const y = startY + layout.topGap;
  const headerY = y;
  const rowStartY = headerY + layout.headerH + layout.headerGap;
  const sectionHeight = getCompactDateSectionHeight(sortedPairs.length);

  const pillW = layout.pillW || 400;
  const pillOffsetX = Math.max(0, (400 - pillW) / 2);
  const departureColumn = { x: 714 + pillOffsetX, width: pillW };
  const returnColumn = { x: 126 + pillOffsetX, width: pillW };
  drawCompactDateHeader(ctx, "تاريخ الذهاب", departureColumn, headerY, layout, "bulk_departure_date_header");
  drawCompactDateHeader(ctx, "تاريخ العودة", returnColumn, headerY, layout, "bulk_return_date_header");

  sortedPairs.forEach((pair, index) => {
    const rowY = rowStartY + index * (layout.rowH + layout.rowGap);
    const pillY = rowY + Math.max(0, (layout.rowH - layout.pillH) / 2);
    const departurePill = {
      x: departureColumn.x,
      y: pillY,
      width: departureColumn.width,
      height: layout.pillH,
    };
    const returnPill = {
      x: returnColumn.x,
      y: pillY,
      width: returnColumn.width,
      height: layout.pillH,
    };
    drawCompactDateRowConnector(ctx, departurePill, returnPill, rowY + layout.rowH / 2, layout.rowH);
    drawCompactDatePill(ctx, departurePill, pair.departureDate, layout, `bulk_departure_date_${index}`);
    drawCompactDatePill(ctx, returnPill, pair.returnDate, layout, `bulk_return_date_${index}`);
  });

  return startY + sectionHeight;
};

const drawDateRouteSection = (ctx, data, startY, options = {}) => {
  const y = startY + 44;
  const isBulkPoster = options.isBulkPoster === true;
  const datePairs = isBulkPoster
    ? (Array.isArray(data.datePairs) ? data.datePairs : [])
    : [{ departureDate: data.departureDate, returnDate: data.returnDate }];

  if (isBulkPoster && !datePairs.length) return startY;

  if (isBulkPoster && datePairs.length > 1) {
    return drawCompactDateRouteSection(ctx, datePairs, startY);
  }

  datePairs.forEach((pair, index) => {
    drawDateRouteRow(
      ctx,
      pair.departureDate,
      pair.returnDate,
      y + index * (DATE_CARD_H + BULK_DATE_ROW_GAP)
    );
  });

  return y + datePairs.length * DATE_CARD_H
    + Math.max(0, datePairs.length - 1) * BULK_DATE_ROW_GAP;
};

const drawIncludedItem = (ctx, x, y, text, maxWidth, icon, fontSize = 20, options = {}) => {
  const iconSize = options.iconSize || 22;
  const iconX = x + maxWidth - iconSize / 2;
  drawLineIcon(ctx, icon, iconX, y + 14, iconSize, options.iconColor || COLORS.blueDark);
  drawText(ctx, text, { x, y, width: maxWidth - iconSize - 16, height: options.height || 26 }, {
    color: COLORS.text,
    fontSize,
    minFontSize: options.minFontSize || 12,
    maxLines: options.maxLines || 1,
    align: "right",
    wrap: options.wrap !== false,
    lineHeight: 1.08,
  }, { type: "service_note" });
};

const measureIncludedTextWidth = (ctx, text, fontSize) => {
  ctx.save();
  ctx.font = `700 ${fontSize}px Cairo, "Noto Sans Arabic", Arial, sans-serif`;
  const width = ctx.measureText(String(text || "")).width;
  ctx.restore();
  return width;
};

const getIncludedItemsFlow = (ctx, items, box, data) => {
  const top = box.y + 58;
  const bottomPadding = box.height <= 210 ? 4 : 6;
  const availableHeight = Math.max(0, box.y + box.height - bottomPadding - top);
  const compact = availableHeight < 158;
  const relaxed = availableHeight >= 172;
  const itemGap = compact ? 2 : relaxed ? 4 : 3;
  const normalHeight = compact ? 24 : relaxed ? 28 : 26;
  const normalFontSize = compact ? 17 : 18;
  const flightFontSize = compact ? 15 : 16;
  const flightTwoLineHeight = compact ? 40 : relaxed ? 44 : 42;
  const maxWidth = box.width - 56;
  const textWidth = maxWidth - 22 - 16;

  return items.map((item) => {
    const isFlightLine = item.text === data.flightServiceLine;
    if (!isFlightLine) {
      return {
        ...item,
        height: normalHeight,
        fontSize: normalFontSize,
        maxLines: 1,
        wrap: false,
        gap: itemGap,
      };
    }

    const singleLineWidth = measureIncludedTextWidth(ctx, item.text, flightFontSize);
    const useTwoLines = singleLineWidth > textWidth;
    return {
      ...item,
      height: useTwoLines ? flightTwoLineHeight : normalHeight,
      fontSize: flightFontSize,
      minFontSize: 12,
      maxLines: useTwoLines ? 2 : 1,
      wrap: useTwoLines,
      gap: itemGap,
    };
  });
};

const getLowerLayout = (rowCount, contentBottom, options = {}) => {
  const count = Math.max(1, Math.min(5, rowCount || 1));
  const showDates = options.showDates !== false;
  const footerY = options.footerY || FOOTER_Y;
  const notesGap = showDates
    ? count >= 5 ? 22 : count >= 4 ? 24 : 28
    : count <= 1 ? 64 : count === 2 ? 46 : count === 3 ? 36 : count === 4 ? 30 : 24;
  const serviceGap = count >= 5 ? 10 : count >= 4 ? 12 : count >= 3 ? 14 : 20;
  const serviceBandH = count >= 5 ? 54 : count >= 4 ? 64 : 84;
  const notesY = contentBottom + notesGap;
  const preferredServiceY = footerY - 176;
  const maxServiceBottom = footerY - 48;
  const maxServiceY = maxServiceBottom - serviceBandH;
  const notesMaxHeight = showDates
    ? 236
    : count <= 2 ? 236 : count === 3 ? 226 : count === 4 ? 218 : 210;
  const notesMinHeight = showDates
    ? 206
    : 206;
  const notesHeight = Math.min(
    notesMaxHeight,
    Math.max(notesMinHeight, maxServiceY - serviceGap - notesY)
  );
  const notesBottom = notesY + notesHeight;
  const serviceY = Math.min(maxServiceY, Math.max(preferredServiceY, notesBottom + serviceGap));

  return {
    notes: { y: notesY, height: notesHeight },
    serviceBand: { x: 0, y: serviceY, width: POSTER_WIDTH, height: serviceBandH },
  };
};

const drawNotesSection = (ctx, data, layout, serviceBand, notesLines) => {
  const y = layout.y;
  const height = layout.height;
  const gap = 28;
  const boxW = (PAGE_W - gap) / 2;
  const left = { x: PAGE_X, y, width: boxW, height };
  const right = { x: PAGE_X + boxW + gap, y, width: boxW, height };

  ctx.save();
  ctx.fillStyle = COLORS.white;
  const cleanBackingBottom = serviceBand?.y
    ? Math.max(y + height + 40, serviceBand.y)
    : y + height + 40;
  ctx.fillRect(0, y - 14, POSTER_WIDTH, cleanBackingBottom - (y - 14));
  ctx.restore();

  [left, right].forEach((box) => {
    fillRoundRect(ctx, box.x, box.y, box.width, box.height, 22, "rgba(255,255,255,.96)");
    strokeRoundRect(ctx, box.x, box.y, box.width, box.height, 22, "rgba(63,134,201,.34)", 2);
  });

  drawText(ctx, "الأسعار أعلاه للفرد الواحد وتشمل:", {
    x: right.x + 26,
    y: right.y + 18,
    width: right.width - 52,
    height: 34,
  }, {
    color: COLORS.dark,
    fontSize: 23,
    minFontSize: 15,
    maxLines: 1,
    align: "right",
  }, { type: "services_title" });

  const includedItems = [
    { icon: "visa", text: "إجراءات التأشيرة" },
    { icon: "guide", text: "التأطير طيلة مدة البرنامج" },
    { icon: "plane", text: data.flightServiceLine },
    { icon: "transport", text: "التنقلات" },
    { icon: "hotel", text: "الإقامة بالفنادق حسب البرنامج" },
  ].filter((item) => cleanText(item.text));

  let includedY = right.y + 58;
  getIncludedItemsFlow(ctx, includedItems, right, data).forEach((item) => {
    drawIncludedItem(
      ctx,
      right.x + 28,
      includedY,
      item.text,
      right.width - 56,
      item.icon,
      item.fontSize,
      {
        height: item.height,
        minFontSize: item.minFontSize,
        maxLines: item.maxLines,
        wrap: item.wrap,
      }
    );
    includedY += item.height + item.gap;
  });

  drawText(ctx, notesLines[0], {
    x: left.x + 26,
    y: left.y + 18,
    width: left.width - 52,
    height: 34,
  }, {
    color: COLORS.dark,
    fontSize: 23,
    minFontSize: 15,
    maxLines: 1,
    align: "right",
  }, { type: "notes_title" });

  if (notesLines === TIZNIT_UMRAH_NOTES_LINES) {
    const noteItems = notesLines.slice(1);
    const longestNoteIndex = 3;
    const noteWeights = noteItems.map((_, index) => (index === longestNoteIndex ? 1.45 : 1));
    const noteUnitHeight = Math.max(0, left.height - 58)
      / noteWeights.reduce((total, weight) => total + weight, 0);
    let noteY = left.y + 54;
    noteItems.forEach((item, index) => {
      const isLong = index >= 2 && index <= 4;
      const noteHeight = noteUnitHeight * noteWeights[index];
      drawText(ctx, item, {
        x: left.x + 26,
        y: noteY,
        width: left.width - 52,
        height: noteHeight,
      }, {
        color: COLORS.text,
        fontSize: isLong ? 16 : 17,
        minFontSize: 12,
        maxLines: index === longestNoteIndex ? 2 : 1,
        align: "right",
        lineHeight: 1.05,
        paddingY: 0,
      }, { type: `tiznit_note_${index}` });
      noteY += noteHeight;
    });
  } else {
    notesLines.slice(1).forEach((item, index) => {
      const isLong = index === 2 || index === 3 || index === 4;
      drawText(ctx, item, {
        x: left.x + 26,
        y: left.y + 58 + index * 28,
        width: left.width - 52,
        height: isLong ? 32 : 26,
      }, {
        color: COLORS.text,
        fontSize: isLong ? 16 : 18,
        minFontSize: 12,
        maxLines: isLong ? 2 : 1,
        align: "right",
        lineHeight: 1.08,
      }, { type: `tiznit_note_${index}` });
    });
  }

  return y + height;
};

const drawFooter = (ctx, serviceBand, options = {}) => {
  const footerY = options.footerY || FOOTER_Y;
  const posterHeight = options.posterHeight || POSTER_HEIGHT;
  const footerH = FOOTER_H;
  const peopleContacts = options.peopleContacts || TIZNIT_LEGACY_PEOPLE_CONTACTS;
  const box = { x: PAGE_X, y: footerY, width: PAGE_W, height: footerH };

  ctx.save();
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(0, footerY - 92, POSTER_WIDTH, posterHeight - footerY + 92);
  ctx.restore();

  const resolvedServiceBand = serviceBand || { x: 0, y: footerY - 176, width: POSTER_WIDTH, height: 84 };
  ctx.save();
  ctx.fillStyle = COLORS.cream2;
  ctx.fillRect(
    resolvedServiceBand.x,
    resolvedServiceBand.y,
    resolvedServiceBand.width,
    resolvedServiceBand.height
  );
  ctx.restore();

  const serviceCenterY = resolvedServiceBand.y + resolvedServiceBand.height / 2;
  const serviceVisualOffsetY = Math.min(10, Math.max(8, resolvedServiceBand.height * 0.14));
  const serviceVisualCenterY = serviceCenterY + serviceVisualOffsetY;
  const serviceContentW = Math.min(860, Math.max(0, resolvedServiceBand.width - PAGE_X * 2));
  const serviceContentX = resolvedServiceBand.x + (resolvedServiceBand.width - serviceContentW) / 2;
  const serviceSlotGap = 82;
  const serviceSlotW = (serviceContentW - serviceSlotGap) / 2;
  const serviceLabelH = Math.min(32, Math.max(28, resolvedServiceBand.height * 0.56));
  const serviceLabelY = resolvedServiceBand.y + (resolvedServiceBand.height - serviceLabelH) / 2 + serviceVisualOffsetY;
  const serviceIconSize = 21;
  const serviceIconGap = 14;
  const getServiceItemLayout = (slotX, labelW) => {
    const groupW = labelW + serviceIconGap + serviceIconSize;
    const labelX = slotX + (serviceSlotW - groupW) / 2;
    return {
      label: { x: labelX, y: serviceLabelY, width: labelW, height: serviceLabelH },
      iconX: labelX + labelW + serviceIconGap + serviceIconSize / 2,
    };
  };

  const transportItem = getServiceItemLayout(serviceContentX, 280);
  const hotelItem = getServiceItemLayout(serviceContentX + serviceSlotW + serviceSlotGap, 342);
  const hotelLabel = hotelItem.label;
  const transportLabel = transportItem.label;
  drawLineIcon(ctx, "hotel", hotelItem.iconX, serviceVisualCenterY, serviceIconSize, COLORS.gold);
  drawText(ctx, "حجز فنادق خمس نجوم حسب الطلب", hotelLabel, {
    color: COLORS.dark,
    fontSize: 21,
    minFontSize: 14,
    maxLines: 1,
    align: "right",
    wrap: false,
  }, { type: "hotel_booking_label" });
  drawLineIcon(ctx, "car", transportItem.iconX, serviceVisualCenterY, serviceIconSize, COLORS.gold);
  drawText(ctx, "نقل خاص حسب الطلب", transportLabel, {
    color: COLORS.dark,
    fontSize: 21,
    minFontSize: 14,
    maxLines: 1,
    align: "right",
    wrap: false,
  }, { type: "private_transport_label" });

  drawLineIcon(ctx, "phone", POSTER_WIDTH - 92, footerY - 28, 28, COLORS.blue);
  drawText(ctx, "للحجز والاستفسار:", {
    x: PAGE_X + 58,
    y: footerY - 42,
    width: PAGE_W - 184,
    height: 28,
  }, {
    color: COLORS.dark,
    fontSize: 21,
    minFontSize: 14,
    maxLines: 1,
    align: "right",
  }, { type: "booking_title" });

  fillRoundRect(ctx, box.x, box.y, box.width, box.height, 8, COLORS.cream2);
  strokeRoundRect(ctx, box.x, box.y, box.width, box.height, 8, COLORS.blue, 5);

  const qrBox = { x: box.x + 28, y: box.y + 24, size: 102 };
  fillRoundRect(ctx, qrBox.x - 8, qrBox.y - 8, qrBox.size + 16, qrBox.size + 16, 8, COLORS.white);
  strokeRoundRect(ctx, qrBox.x - 8, qrBox.y - 8, qrBox.size + 16, qrBox.size + 16, 8, "rgba(36,78,137,.22)", 1.4);
  drawQrCode(ctx, qrBox.x, qrBox.y, qrBox.size, TIZNIT_WHATSAPP_URL);

  const rightX = box.x + 620;
  TIZNIT_AGENCY_CONTACT_LINES.forEach((line, index) => {
    drawText(ctx, line, {
      x: rightX,
      y: box.y + 24 + index * 38,
      width: 506,
      height: 30,
    }, {
      color: COLORS.dark,
      fontSize: 21,
      minFontSize: 14,
      maxLines: 1,
      align: "right",
      wrap: false,
    }, { type: `tiznit_agency_contact_${index}` });
  });

  const compactPeopleContacts = peopleContacts.length > 4;
  const peopleContactTop = compactPeopleContacts ? 9 : 8;
  const peopleContactGap = compactPeopleContacts ? 17.8 : 22.5;
  const peopleContactHeight = compactPeopleContacts ? 16.5 : 21;
  const peopleContactFontSize = compactPeopleContacts ? 16.8 : 19;
  const peopleContactMinFontSize = compactPeopleContacts ? 11.5 : 13;
  const peopleContactLineHeight = compactPeopleContacts ? 1.04 : 1.05;
  const peopleContactPaddingY = compactPeopleContacts ? undefined : 0;
  const peopleNameColumn = { x: box.x + 388, width: 160 };
  const peopleSeparatorColumn = { x: box.x + 366, width: 18 };
  const peoplePhoneColumn = { x: box.x + 250, width: 112 };
  peopleContacts.forEach((contact, index) => {
    const y = box.y + peopleContactTop + index * peopleContactGap;
    drawText(ctx, contact.name, {
      x: peopleNameColumn.x,
      y,
      width: peopleNameColumn.width,
      height: peopleContactHeight,
    }, {
      color: COLORS.dark,
      fontSize: peopleContactFontSize,
      minFontSize: peopleContactMinFontSize,
      maxLines: 1,
      align: "right",
      lineHeight: peopleContactLineHeight,
      paddingY: peopleContactPaddingY,
      wrap: false,
    }, { type: `tiznit_people_contact_name_${index}` });
    drawText(ctx, ":", {
      x: peopleSeparatorColumn.x,
      y,
      width: peopleSeparatorColumn.width,
      height: peopleContactHeight,
    }, {
      color: COLORS.dark,
      fontSize: peopleContactFontSize,
      minFontSize: peopleContactMinFontSize,
      maxLines: 1,
      align: "center",
      lineHeight: peopleContactLineHeight,
      paddingY: peopleContactPaddingY,
      wrap: false,
    }, { type: `tiznit_people_contact_separator_${index}`, lang: "en" });
    drawText(ctx, contact.phone, {
      x: peoplePhoneColumn.x,
      y,
      width: peoplePhoneColumn.width,
      height: peopleContactHeight,
    }, {
      color: COLORS.dark,
      fontSize: peopleContactFontSize,
      minFontSize: peopleContactMinFontSize,
      maxLines: 1,
      align: "left",
      lineHeight: peopleContactLineHeight,
      paddingY: peopleContactPaddingY,
      wrap: false,
    }, { type: `tiznit_people_contact_phone_${index}`, lang: "en" });
  });

  TIZNIT_ADDRESS_LINES.forEach((line, index) => {
    drawText(ctx, line, {
      x: box.x + 212,
      y: box.y + 98 + index * 21,
      width: box.width - 280,
      height: 19,
    }, {
      color: COLORS.dark,
      fontSize: 15,
      minFontSize: 10,
      maxLines: 1,
      align: "right",
      wrap: false,
    }, { type: `tiznit_address_${index}` });
  });

};

const drawVersionLabel = (ctx, program = {}, posterHeight = POSTER_HEIGHT) => {
  drawText(ctx, buildVersionLabel(program), {
    x: 10,
    y: posterHeight - 20,
    width: 90,
    height: 14,
  }, {
    color: "rgba(17,24,39,.55)",
    fontSize: 10,
    minFontSize: 8,
    maxLines: 1,
    align: "left",
    wrap: false,
  }, { lang: "en", type: "template_version" });
};

const canvasToPngBlob = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("poster-export-failed"));
  }, "image/png", 0.96);
});

export const renderPoster = async ({
  program,
  agency = {},
  locale = "ar",
  lang,
  posterOptions = {},
} = {}) => {
  if (!isBrowser()) throw new Error("poster-renderer-browser-only");
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Font readiness is best-effort; canvas fallback fonts keep rendering safe.
    }
  }

  const resolvedLang = lang || locale || "ar";
  const data = getPosterData(program, posterOptions);
  const showDates = posterOptions?.showDates !== false;
  const posterHeight = POSTER_HEIGHT;
  const footerY = FOOTER_Y;
  const scale = getRenderScale(POSTER_WIDTH, posterHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(POSTER_WIDTH * scale);
  canvas.height = Math.round(posterHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("poster-canvas-unavailable");
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const assets = await loadTemplateAssets();
  try {
    drawBackground(ctx, posterHeight);
    drawHero(ctx, data, assets, agency, resolvedLang);
    const tableBottom = drawTable(ctx, data);
    const contentBottom = showDates
      ? drawDateRouteSection(ctx, data, tableBottom, { isBulkPoster: posterOptions?.isBulkPoster === true })
      : tableBottom;
    const lowerLayout = getLowerLayout(data.rows.length, contentBottom, { showDates, footerY });
    const isUmrahPoster = data.programKind === "umrah";
    drawNotesSection(
      ctx,
      data,
      lowerLayout.notes,
      lowerLayout.serviceBand,
      isUmrahPoster ? TIZNIT_UMRAH_NOTES_LINES : TIZNIT_LEGACY_NOTES_LINES
    );
    drawFooter(ctx, lowerLayout.serviceBand, {
      footerY,
      posterHeight,
      peopleContacts: isUmrahPoster ? TIZNIT_UMRAH_PEOPLE_CONTACTS : TIZNIT_LEGACY_PEOPLE_CONTACTS,
    });
    drawVersionLabel(ctx, program, posterHeight);
    return await canvasToPngBlob(canvas);
  } finally {
    revokeTemplateAssets(assets);
  }
};
