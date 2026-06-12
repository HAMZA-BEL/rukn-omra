import { fetchBadgeTemplates } from "../services/badgeTemplatesApi";
import { badgePhonesFromProgram, normalizeBadgeNumber } from "./badgeTemplateMapping";
import { normalizeBadgeLayout } from "./badgeLayout";
import { drawBadgeBackgroundImage, hasStoredBadgeBackgroundTransform } from "./badgeBackground";
import { getBadgeTemplateImageUrl, getPilgrimPhotoUrl } from "./badgeStorage";
import {
  BADGE_TEXT_FIT_DEFAULTS,
  fitTextBox,
  getBadgeTextPadding,
  resolveBadgeTextDirection,
} from "./badgeTextFit";
import { BADGE_TEMPLATE_PRINT_DPI, DEFAULT_BADGE_TEMPLATE_PATH } from "./badgeDefaults";
import { getParticipantTerminology } from "../../../utils/participantTerminology";
import { getLocalizedAgencyName } from "../../../utils/agencyDisplay";

const mmToPt = (mm) => Number(mm || 0) * 72 / 25.4;
const sanitizeFile = (value) => String(value || "badge").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").slice(0, 90);
const clientName = (client = {}, program = {}) => [client.firstName, client.lastName].filter(Boolean).join(" ").trim()
  || client.name
  || getParticipantTerminology(program, "ar").singular;
const passportNumber = (client = {}) => client.passport?.number || client.passportNumber || "";
const BADGE_FONT_FAMILY = "\"Tajawal\", \"Cairo\", \"Noto Sans Arabic\", Arial, sans-serif";
const BADGE_FONT_SCALE_DIVISOR = 3.2;
const BADGE_EXPORT_SETTINGS = {
  fast: { dpi: 200, jpegQuality: 0.88 },
  standard: { dpi: 240, jpegQuality: 0.93 },
  high: { dpi: BADGE_TEMPLATE_PRINT_DPI, jpegQuality: 0.98 },
};
const BADGE_DEFAULT_EXPORT_QUALITY = "standard";
const BADGE_EXPORT_PHOTO_CONCURRENCY = 4;
const BADGE_RENDER_YIELD_EVERY = 2;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const now = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());

const getExportSettings = (quality = BADGE_DEFAULT_EXPORT_QUALITY) => {
  if (typeof quality === "number") {
    const dpi = clamp(Math.round(quality), 150, BADGE_TEMPLATE_PRINT_DPI);
    return { dpi, jpegQuality: dpi >= BADGE_TEMPLATE_PRINT_DPI ? 0.98 : 0.93 };
  }
  return BADGE_EXPORT_SETTINGS[quality] || BADGE_EXPORT_SETTINGS[BADGE_DEFAULT_EXPORT_QUALITY];
};

const isBadgeExportLoggingEnabled = () => {
  try {
    return typeof console !== "undefined"
      && !(typeof process !== "undefined" && process.env?.NODE_ENV === "production");
  } catch {
    return typeof console !== "undefined";
  }
};

const createBadgeExportTelemetry = (enabled = isBadgeExportLoggingEnabled()) => {
  const starts = new Map();
  const time = (label) => {
    if (!enabled || !console.time) return;
    starts.set(label, now());
    console.time(label);
  };
  const timeEnd = (label) => {
    if (!enabled || !starts.has(label)) return 0;
    const elapsed = now() - starts.get(label);
    starts.delete(label);
    if (console.timeEnd) console.timeEnd(label);
    return elapsed;
  };
  return {
    enabled,
    time,
    timeEnd,
    finishOpenTimers() {
      Array.from(starts.keys()).forEach((label) => timeEnd(label));
    },
    info(payload) {
      if (enabled && console.info) console.info("[badge export]", payload);
    },
  };
};

const emitProgress = (onProgress, payload = {}) => {
  if (typeof onProgress !== "function") return;
  onProgress({
    ...payload,
    percent: clamp(Math.round(Number(payload.percent) || 0), 0, 100),
  });
};

const yieldToBrowser = () => new Promise((resolve) => {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => resolve());
    return;
  }
  setTimeout(resolve, 0);
});

const waitForBadgeFonts = async () => {
  if (typeof document === "undefined" || !document.fonts?.ready) return;
  try {
    await document.fonts.ready;
  } catch {
    /* Font readiness is best-effort; canvas fallback fonts keep rendering safe. */
  }
};

const setHighQualitySmoothing = (ctx) => {
  if (!ctx) return;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
};

const decodeImageBlob = async (blob) => {
  if (!blob) return null;
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob);
    } catch {
      /* Fall back to HTMLImageElement decoding below. */
    }
  }
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.decoding = "async";
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const loadImage = async (url, cache = null) => {
  if (!url) return null;
  if (cache?.has(url)) return cache.get(url);
  const promise = (async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      return await decodeImageBlob(await response.blob());
    } catch {
      return null;
    }
  })();
  cache?.set(url, promise);
  const image = await promise;
  if (!image) cache?.delete(url);
  return image;
};

const disposeDrawable = (drawable) => {
  if (drawable && typeof drawable.close === "function") drawable.close();
};

const drawableWidth = (drawable) => drawable?.naturalWidth || drawable?.width || 0;
const drawableHeight = (drawable) => drawable?.naturalHeight || drawable?.height || 0;

const createCanvas = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
};

const resizeImageForBox = (image, maxWidth, maxHeight) => {
  const imageWidth = drawableWidth(image);
  const imageHeight = drawableHeight(image);
  if (!image || !imageWidth || !imageHeight || !maxWidth || !maxHeight) return null;
  const scale = Math.min(1, maxWidth / imageWidth, maxHeight / imageHeight);
  const targetWidth = Math.max(1, Math.round(imageWidth * scale));
  const targetHeight = Math.max(1, Math.round(imageHeight * scale));
  const canvas = createCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) return image;
  setHighQualitySmoothing(ctx);
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
  return canvas;
};

const drawCover = (ctx, image, x, y, width, height, mode = "cover") => {
  if (!image) return;
  const imageWidth = image.naturalWidth || image.width || 1;
  const imageHeight = image.naturalHeight || image.height || 1;
  setHighQualitySmoothing(ctx);
  if (mode === "contain") {
    const scale = Math.min(width / imageWidth, height / imageHeight);
    const drawnWidth = imageWidth * scale;
    const drawnHeight = imageHeight * scale;
    ctx.drawImage(image, x + (width - drawnWidth) / 2, y + (height - drawnHeight) / 2, drawnWidth, drawnHeight);
    return;
  }
  const imageRatio = imageWidth / imageHeight;
  const boxRatio = width / height;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = imageWidth;
  let sourceHeight = imageHeight;
  if (imageRatio > boxRatio) {
    sourceWidth = imageHeight * boxRatio;
    sourceX = (imageWidth - sourceWidth) / 2;
  } else if (imageRatio < boxRatio) {
    sourceHeight = imageWidth / boxRatio;
    sourceY = (imageHeight - sourceHeight) / 2;
  }
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
};

const roundedRectPath = (ctx, x, y, width, height, radius = 0) => {
  const safeRadius = clamp(Number(radius) || 0, 0, Math.min(width, height) / 2);
  if (!safeRadius) {
    ctx.rect(x, y, width, height);
    return;
  }
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
};

const drawDefaultBadgeBackground = (ctx, width, height) => {
  const splitY = height * 0.52;
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, splitY);
  ctx.fillStyle = "#e8f0fa";
  ctx.fillRect(0, splitY, width, height - splitY);
  ctx.fillStyle = "rgba(212,175,55,.2)";
  ctx.strokeStyle = "rgba(212,175,55,.32)";
  ctx.lineWidth = Math.max(1, width * 0.0016);
  ctx.beginPath();
  roundedRectPath(ctx, width * 0.07, height * 0.05, width * 0.34, height * 0.07, height * 0.035);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(15,23,42,.08)";
  ctx.strokeStyle = "rgba(15,23,42,.12)";
  ctx.beginPath();
  roundedRectPath(ctx, width * 0.75, height * 0.05, width * 0.18, height * 0.11, height * 0.015);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.72)";
  ctx.strokeStyle = "rgba(15,23,42,.1)";
  ctx.beginPath();
  roundedRectPath(ctx, width * 0.08, height * 0.79, width * 0.84, height * 0.14, height * 0.02);
  ctx.fill();
  ctx.stroke();
};

const scaleStoredBackgroundForExport = ({ background, widthMm, heightMm, pixelWidth, pixelHeight }) => {
  if (!hasStoredBadgeBackgroundTransform(background)) return background;
  const designScale = BADGE_TEMPLATE_PRINT_DPI / 25.4;
  const designWidth = Math.max(1, Math.round(widthMm * designScale));
  const designHeight = Math.max(1, Math.round(heightMm * designScale));
  const xRatio = pixelWidth / designWidth;
  const yRatio = pixelHeight / designHeight;
  return {
    ...background,
    x: (Number(background.x) || 0) * xRatio,
    y: (Number(background.y) || 0) * yRatio,
    scaleX: (Number(background.scaleX) || 1) * xRatio,
    scaleY: (Number(background.scaleY) || 1) * yRatio,
  };
};

const prepareFieldLayout = (field, pixelWidth, pixelHeight, scale) => {
  const box = {
    x: pixelWidth * field.xPct / 100,
    y: pixelHeight * field.yPct / 100,
    width: pixelWidth * field.wPct / 100,
    height: pixelHeight * field.hPct / 100,
  };
  const opacity = fieldOpacity(field);
  const radius = fieldRadius(field, scale);
  if (field.type === "image") {
    return {
      field,
      type: "image",
      key: field.key,
      box,
      opacity,
      radius,
      fit: field.fit || "contain",
    };
  }

  const renderScale = scale / BADGE_FONT_SCALE_DIVISOR;
  const textPadding = getBadgeTextPadding(box, { scale: renderScale });
  const requestedFontSize = scaledFieldValue(field.fontSize || 12, scale, 12);
  const minFontSize = scaledFieldValue(
    field.autoFitText === true
      ? (field.minFontSize || BADGE_TEXT_FIT_DEFAULTS.minFontSize)
      : field.minFontSize || Math.max(6, Number(field.fontSize || 12) * 0.62),
    scale,
    Math.max(7, requestedFontSize * 0.62)
  );
  const maxFontSize = scaledFieldValue(
    field.maxFontSize || BADGE_TEXT_FIT_DEFAULTS.maxFontSize,
    scale,
    Math.max(requestedFontSize, minFontSize)
  );
  return {
    field,
    type: "text",
    key: field.key,
    box,
    opacity,
    textBox: box,
    paddingX: textPadding.x,
    paddingY: textPadding.y,
    autoFitText: field.autoFitText === true,
    requestedFontSize,
    minFontSize,
    maxFontSize,
    fontWeight: field.fontWeight || 700,
    maxLines: Math.max(1, Number(field.maxLines || field.lineCount || 1)),
  };
};

const getPhotoTargetSize = (fieldLayouts = []) => {
  const imageFields = fieldLayouts.filter((item) => item.type === "image");
  if (!imageFields.length) return null;
  return imageFields.reduce((size, item) => ({
    width: Math.max(size.width, Math.ceil(item.box.width)),
    height: Math.max(size.height, Math.ceil(item.box.height)),
  }), { width: 0, height: 0 });
};

const createBadgeRenderAssets = async (template = {}, { exportQuality, telemetry } = {}) => {
  const widthMm = normalizeBadgeNumber(template.widthMm, 90) || 90;
  const heightMm = normalizeBadgeNumber(template.heightMm, 140) || 140;
  const exportSettings = getExportSettings(exportQuality);
  const scale = exportSettings.dpi / 25.4;
  const pixelWidth = Math.round(widthMm * scale);
  const pixelHeight = Math.round(heightMm * scale);
  const layout = normalizeBadgeLayout(template.layout);
  const visibleFields = layout.fields.filter((item) => item.visible !== false);
  const useDefaultDesign = template.templatePath === DEFAULT_BADGE_TEMPLATE_PATH;
  const imageCache = new Map();
  telemetry?.time("load template image");
  const templateUrl = useDefaultDesign ? "" : await getBadgeTemplateImageUrl(template.templatePath);
  const background = await loadImage(templateUrl, imageCache);
  telemetry?.timeEnd("load template image");
  const baseCanvas = createCanvas(pixelWidth, pixelHeight);
  const baseCtx = baseCanvas.getContext("2d");
  if (!baseCtx) throw new Error("badge-canvas-unavailable");
  setHighQualitySmoothing(baseCtx);
  baseCtx.fillStyle = "#ffffff";
  baseCtx.fillRect(0, 0, pixelWidth, pixelHeight);
  const exportBackground = scaleStoredBackgroundForExport({
    background: layout.background,
    widthMm,
    heightMm,
    pixelWidth,
    pixelHeight,
  });
  if (background) {
    drawBadgeBackgroundImage({
      ctx: baseCtx,
      image: background,
      canvasWidth: pixelWidth,
      canvasHeight: pixelHeight,
      background: exportBackground,
    });
  } else if (useDefaultDesign) {
    drawDefaultBadgeBackground(baseCtx, pixelWidth, pixelHeight);
  }
  const fieldLayouts = visibleFields.map((field) => prepareFieldLayout(field, pixelWidth, pixelHeight, scale));

  return {
    widthMm,
    heightMm,
    scale,
    dpi: exportSettings.dpi,
    jpegQuality: exportSettings.jpegQuality,
    pixelWidth,
    pixelHeight,
    widthPt: mmToPt(widthMm),
    heightPt: mmToPt(heightMm),
    visibleFields,
    fieldLayouts,
    photoTargetSize: getPhotoTargetSize(fieldLayouts),
    background,
    backgroundInfo: {
      width: drawableWidth(background),
      height: drawableHeight(background),
      url: templateUrl,
    },
    baseCanvas,
  };
};

const createProgramBadgeData = ({ program, agency, lang }) => {
  const phones = badgePhonesFromProgram(program);
  return {
    primaryPhone: phones[0] || "",
    extraPhone: phones[1] || phones[2] || "",
    programName: program?.name || "",
    badgeNote: program?.badgeNote || "",
    agencyName: getLocalizedAgencyName(agency, lang),
  };
};

const dataForField = ({ field, client, program, agency, fileNumber, lang, programBadgeData }) => {
  const shared = programBadgeData || createProgramBadgeData({ program, agency, lang });
  if (field.key === "fullName") return clientName(client, program);
  if (field.key === "passportNumber") return passportNumber(client);
  if (field.key === "hotelMecca") return client?.hotelMecca || client?.hotel_mecca || program?.hotelMecca || "";
  if (field.key === "hotelMadina") return client?.hotelMadina || client?.hotel_madina || program?.hotelMadina || "";
  if (field.key === "fileNumber") return fileNumber || "";
  return shared[field.key] || "";
};

const getTemplateForProgram = async ({ agencyId, program }) => {
  const { data, error } = await fetchBadgeTemplates({ agencyId });
  if (error) throw error;
  const templates = data || [];
  return templates.find((template) => template.id === program?.badgeTemplateId)
    || templates.find((template) => template.isDefault)
    || templates[0]
    || null;
};

const scaledFieldValue = (value, scale, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number * scale / BADGE_FONT_SCALE_DIVISOR : fallback;
};

const textDirectionForLang = (lang = "ar") => (lang === "ar" ? "rtl" : "ltr");

const textAlignForField = (align = "center") => {
  if (align === "start") return "start";
  if (align === "end") return "end";
  return "center";
};

const textAnchorForField = (box, align = "center", direction = "rtl", padding = 0) => {
  if (align === "start") return direction === "rtl" ? box.x + box.width - padding : box.x + padding;
  if (align === "end") return direction === "rtl" ? box.x + padding : box.x + box.width - padding;
  return box.x + box.width / 2;
};

const fieldOpacity = (field = {}) => {
  const opacity = Number(field.opacity);
  return Number.isFinite(opacity) ? clamp(opacity, 0, 1) : 1;
};

const fieldRadius = (field = {}, scale = 1) => (
  scaledFieldValue(field.borderRadius ?? field.radius, scale, 0)
);

const getClientPhotoPath = (client = {}) => client?.badgePhotoPath || client?.docs?.badgePhotoPath || "";

const runWithConcurrency = async (items, limit, worker) => {
  let cursor = 0;
  const workerCount = Math.min(Math.max(1, limit), items.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  }));
};

const preparePilgrimPhotoAssets = async ({ clients = [], renderAssets, onProgress }) => {
  const targetSize = renderAssets?.photoTargetSize;
  const paths = Array.from(new Set(
    clients.map((client) => getClientPhotoPath(client)).filter(Boolean)
  ));
  const photoAssets = new Map();
  if (!targetSize?.width || !targetSize?.height || !paths.length) {
    emitProgress(onProgress, { step: "photos", current: 0, total: paths.length, percent: 35 });
    return photoAssets;
  }

  const imageCache = new Map();
  let completed = 0;
  await runWithConcurrency(paths, BADGE_EXPORT_PHOTO_CONCURRENCY, async (path) => {
    let resized = null;
    try {
      const url = await getPilgrimPhotoUrl(path);
      const image = await loadImage(url, imageCache);
      resized = resizeImageForBox(image, targetSize.width, targetSize.height);
      if (resized !== image) disposeDrawable(image);
    } catch {
      resized = null;
    }
    photoAssets.set(path, resized);
    completed += 1;
    emitProgress(onProgress, {
      step: "photos",
      current: completed,
      total: paths.length,
      percent: 10 + (completed / paths.length) * 25,
    });
    await yieldToBrowser();
  });
  return photoAssets;
};

const renderBadgeCanvas = async ({
  template,
  client,
  program,
  agency,
  fileNumber,
  lang,
  renderAssets,
  photoAssets = null,
  programBadgeData = null,
}) => {
  const assets = renderAssets || await createBadgeRenderAssets(template);
  const { pixelWidth, pixelHeight, fieldLayouts, baseCanvas, jpegQuality } = assets;
  const canvas = createCanvas(pixelWidth, pixelHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("badge-canvas-unavailable");
  setHighQualitySmoothing(ctx);
  ctx.drawImage(baseCanvas, 0, 0);

  const photoPath = getClientPhotoPath(client);
  let photo = photoPath && photoAssets ? photoAssets.get(photoPath) : null;
  if (photoPath && !photoAssets) {
    const url = await getPilgrimPhotoUrl(photoPath);
    const rawPhoto = await loadImage(url);
    photo = resizeImageForBox(
      rawPhoto,
      assets.photoTargetSize?.width || pixelWidth,
      assets.photoTargetSize?.height || pixelHeight
    );
    if (photo !== rawPhoto) disposeDrawable(rawPhoto);
  }
  const fallbackDirection = textDirectionForLang(lang);

  for (const item of fieldLayouts) {
    const { field, box, opacity } = item;
    if (item.type === "image") {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      roundedRectPath(ctx, box.x, box.y, box.width, box.height, item.radius);
      ctx.clip();
      if (photo) {
        drawCover(ctx, photo, box.x, box.y, box.width, box.height, item.fit);
      } else {
        ctx.fillStyle = "#eef2f7";
        ctx.fillRect(box.x, box.y, box.width, box.height);
        ctx.fillStyle = "#64748b";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `700 ${Math.max(12, box.width / 9)}px ${BADGE_FONT_FAMILY}`;
        ctx.fillText("PHOTO", box.x + box.width / 2, box.y + box.height / 2);
      }
      ctx.restore();
      continue;
    }

    const text = dataForField({ field, client, program, agency, fileNumber, lang, programBadgeData });
    if (!text) continue;
    const textBox = item.textBox;
    const fitted = fitTextBox(ctx, text, textBox, {
      autoFit: item.autoFitText,
      fontSize: item.requestedFontSize,
      minFontSize: item.minFontSize,
      maxFontSize: item.maxFontSize,
      fontWeight: item.fontWeight,
      fontFamily: BADGE_FONT_FAMILY,
      maxLines: item.maxLines,
      paddingX: item.paddingX,
      paddingY: item.paddingY,
    });
    const fittedBox = fitted.box || textBox;
    const direction = resolveBadgeTextDirection(text, field.textDirection || "auto", fallbackDirection);
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = field.color || "#111111";
    ctx.direction = direction;
    ctx.textAlign = textAlignForField(field.align);
    ctx.textBaseline = "middle";
    ctx.font = `${item.fontWeight} ${fitted.fontSize}px ${BADGE_FONT_FAMILY}`;
    if ("fontKerning" in ctx) ctx.fontKerning = "normal";
    const x = textAnchorForField(fittedBox, field.align, direction, 0);
    const totalHeight = fitted.lines.length * fitted.lineHeight;
    fitted.lines.forEach((line, index) => {
      ctx.fillText(line, x, fittedBox.y + fittedBox.height / 2 - totalHeight / 2 + fitted.lineHeight * (index + .5));
    });
    ctx.restore();
  }

  const jpeg = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", jpegQuality));
  const renderedWidth = canvas.width;
  const renderedHeight = canvas.height;
  canvas.width = 1;
  canvas.height = 1;
  return {
    widthPt: assets.widthPt,
    heightPt: assets.heightPt,
    pixelWidth: renderedWidth,
    pixelHeight: renderedHeight,
    jpeg,
  };
};

const blobToBytes = async (blob) => new Uint8Array(await blob.arrayBuffer());
const ascii = (text) => new TextEncoder().encode(text);
const concatBytes = (chunks) => {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  chunks.forEach((chunk) => { out.set(chunk, offset); offset += chunk.length; });
  return out;
};

const makePdf = async (pages) => {
  const chunks = [];
  const offsets = [0];
  let byteLength = 0;
  const write = (chunk) => {
    const bytes = typeof chunk === "string" ? ascii(chunk) : chunk;
    chunks.push(bytes);
    byteLength += bytes.length;
  };
  const currentOffset = () => byteLength;
  let objectId = 1;
  const pageIds = [];
  const objects = [];

  write("%PDF-1.4\n");
  const addObject = async (bodyParts) => {
    const id = objectId++;
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

  const pagesId = objectId++;
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

export async function downloadClientBadgePdf({ agencyId, client, program, agency, fileNumber, lang = "ar", exportQuality }) {
  const telemetry = createBadgeExportTelemetry();
  telemetry.time("badge export total");
  try {
    const template = await getTemplateForProgram({ agencyId, program });
    if (!template) throw new Error("missing-template");
    const renderAssets = await createBadgeRenderAssets(template, { exportQuality, telemetry });
    await waitForBadgeFonts();
    telemetry.time("load pilgrim photos");
    const photoAssets = await preparePilgrimPhotoAssets({ clients: [client], renderAssets });
    telemetry.timeEnd("load pilgrim photos");
    const programBadgeData = createProgramBadgeData({ program, agency, lang });
    telemetry.time("render badges");
    const renderStart = now();
    const page = await renderBadgeCanvas({
      template,
      client,
      program,
      agency,
      fileNumber,
      lang,
      renderAssets,
      photoAssets,
      programBadgeData,
    });
    const averageRenderMs = now() - renderStart;
    telemetry.timeEnd("render badges");
    telemetry.time("generate pdf");
    const pdf = await makePdf([page]);
    const pdfMs = telemetry.timeEnd("generate pdf");
    telemetry.info({
      pilgrims: 1,
      exportDpi: renderAssets.dpi,
      templateImageSize: `${renderAssets.backgroundInfo.width || 0}x${renderAssets.backgroundInfo.height || 0}`,
      averageRenderMs: Math.round(averageRenderMs),
      pdfMs: Math.round(pdfMs),
    });
    telemetry.timeEnd("badge export total");
    downloadBlob(pdf, `badge-${sanitizeFile(clientName(client, program))}.pdf`);
  } catch (error) {
    telemetry.finishOpenTimers();
    throw error;
  }
}

export async function downloadProgramBadgesPdf({
  agencyId,
  clients = [],
  program,
  agency,
  lang = "ar",
  exportQuality,
  onProgress,
}) {
  const total = clients.length;
  const telemetry = createBadgeExportTelemetry();
  telemetry.time("badge export total");
  try {
    emitProgress(onProgress, { step: "template", current: 0, total, percent: 2 });
    const template = await getTemplateForProgram({ agencyId, program });
    if (!template) throw new Error("missing-template");
    const renderAssets = await createBadgeRenderAssets(template, { exportQuality, telemetry });
    emitProgress(onProgress, { step: "template", current: 1, total, percent: 10 });
    await waitForBadgeFonts();
    telemetry.time("load pilgrim photos");
    const photoAssets = await preparePilgrimPhotoAssets({ clients, renderAssets, onProgress });
    telemetry.timeEnd("load pilgrim photos");
    const programBadgeData = createProgramBadgeData({ program, agency, lang });
    const pages = [];
    const renderStart = now();
    telemetry.time("render badges");
    for (let index = 0; index < clients.length; index += 1) {
      const page = await renderBadgeCanvas({
        template,
        client: clients[index],
        program,
        agency,
        lang,
        fileNumber: String(index + 1).padStart(3, "0"),
        renderAssets,
        photoAssets,
        programBadgeData,
      });
      pages.push(page);
      emitProgress(onProgress, {
        step: "render",
        current: index + 1,
        total,
        percent: 35 + ((index + 1) / Math.max(1, total)) * 53,
      });
      if ((index + 1) % BADGE_RENDER_YIELD_EVERY === 0) await yieldToBrowser();
    }
    const renderMs = now() - renderStart;
    telemetry.timeEnd("render badges");
    await yieldToBrowser();
    emitProgress(onProgress, { step: "pdf", current: total, total, percent: 92 });
    telemetry.time("generate pdf");
    const pdf = await makePdf(pages);
    const pdfMs = telemetry.timeEnd("generate pdf");
    telemetry.info({
      pilgrims: total,
      exportDpi: renderAssets.dpi,
      templateImageSize: `${renderAssets.backgroundInfo.width || 0}x${renderAssets.backgroundInfo.height || 0}`,
      averageRenderMs: total ? Math.round(renderMs / total) : 0,
      pdfMs: Math.round(pdfMs),
    });
    telemetry.timeEnd("badge export total");
    emitProgress(onProgress, {
      step: "done",
      current: total,
      total,
      percent: 100,
    });
    downloadBlob(pdf, `badges-${sanitizeFile(program?.name || "program")}.pdf`);
  } catch (error) {
    telemetry.finishOpenTimers();
    throw error;
  }
}
