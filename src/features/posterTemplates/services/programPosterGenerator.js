import {
  normalizePosterArea,
  POSTER_AREA_DEFAULT_STYLE,
} from "../utils/posterTemplateData";
import { resolvePosterAreaValue } from "../utils/programPosterMapping";

const EDITOR_REFERENCE_MAX_WIDTH = 760;
const EDITOR_REFERENCE_MAX_HEIGHT = 680;
const MIN_EXPORT_FONT_SIZE = 6;
const MAX_EXPORT_FONT_SIZE = 260;

const isBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const cleanFilenamePart = (value) => String(value || "")
  .trim()
  .replace(/[\\/:*?"<>|]+/g, "-")
  .replace(/\s+/g, "-")
  .replace(/-+/g, "-")
  .slice(0, 90);

export const buildProgramPosterFilename = (program = {}, lang = "ar") => {
  const namePart = cleanFilenamePart(program.name || program.programName || program.title || "");
  if (namePart) {
    const prefix = lang === "ar" ? "ملصق-برنامج" : "program-poster";
    return `${prefix}-${namePart}.png`;
  }
  return `program-poster-${cleanFilenamePart(program.id || Date.now())}.png`;
};

export const downloadPosterBlob = (blob, filename) => {
  if (!isBrowser()) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "program-poster.png";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 3000);
};

const loadImageFromUrl = async (imageUrl) => {
  if (!imageUrl) throw new Error("missing-template-image");

  let objectUrl = "";
  try {
    if (!String(imageUrl).startsWith("data:")) {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("template-image-fetch-failed");
      const blob = await response.blob();
      objectUrl = URL.createObjectURL(blob);
    }
  } catch {
    objectUrl = "";
  }

  const source = objectUrl || imageUrl;
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve({ image, objectUrl });
      image.onerror = () => reject(new Error("template-image-load-failed"));
      image.src = source;
    });
  } catch (error) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    throw error;
  }
};

const getExportFontScale = (width, height) => {
  const previewScale = Math.min(
    1,
    EDITOR_REFERENCE_MAX_WIDTH / Math.max(1, width),
    EDITOR_REFERENCE_MAX_HEIGHT / Math.max(1, height)
  );
  return previewScale > 0 ? 1 / previewScale : 1;
};

const hasArabicText = (value) => /[\u0600-\u06FF]/.test(String(value || ""));

const normalizeLines = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
};

const splitLongToken = (ctx, token, maxWidth) => {
  if (ctx.measureText(token).width <= maxWidth) return [token];
  const chunks = [];
  let current = "";
  for (const char of token) {
    const next = `${current}${char}`;
    if (current && ctx.measureText(next).width > maxWidth) {
      chunks.push(current);
      current = char;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
};

const wrapLine = (ctx, line, maxWidth) => {
  if (!line) return [];
  const words = String(line).split(/\s+/).filter(Boolean);
  const wrapped = [];
  let current = "";

  words.forEach((word) => {
    const wordChunks = splitLongToken(ctx, word, maxWidth);
    wordChunks.forEach((chunk) => {
      const next = current ? `${current} ${chunk}` : chunk;
      if (current && ctx.measureText(next).width > maxWidth) {
        wrapped.push(current);
        current = chunk;
      } else {
        current = next;
      }
    });
  });

  if (current) wrapped.push(current);
  return wrapped;
};

const getTextX = (box, align) => {
  if (align === "left") return box.x;
  if (align === "right") return box.x + box.width;
  return box.x + (box.width / 2);
};

const drawTextInBox = (ctx, value, box, style = {}, options = {}) => {
  const rawLines = normalizeLines(value);
  if (!rawLines.length) return;

  const fontSize = clamp(Number(style.fontSize) || POSTER_AREA_DEFAULT_STYLE.fontSize, MIN_EXPORT_FONT_SIZE, MAX_EXPORT_FONT_SIZE);
  const fontWeight = style.fontWeight === "400" || style.fontWeight === "normal" ? "400" : "700";
  const align = ["left", "center", "right"].includes(style.align) ? style.align : POSTER_AREA_DEFAULT_STYLE.align;
  const lineHeight = fontSize * 1.16;
  const direction = options.direction || (hasArabicText(rawLines.join(" ")) ? "rtl" : "ltr");

  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.clip();
  ctx.fillStyle = style.color || POSTER_AREA_DEFAULT_STYLE.color;
  ctx.font = `${fontWeight} ${fontSize}px Cairo, Arial, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.direction = direction;

  const wrappedLines = rawLines.flatMap((line) => wrapLine(ctx, line, box.width));
  const maxLines = Math.max(1, Math.floor(box.height / lineHeight));
  const visibleLines = wrappedLines.slice(0, maxLines);
  const totalHeight = visibleLines.length * lineHeight;
  const startY = box.y + Math.max(0, (box.height - totalHeight) / 2);
  const x = getTextX(box, align);

  visibleLines.forEach((line, index) => {
    ctx.fillText(line, x, startY + (index * lineHeight));
  });

  ctx.restore();
};

const getAreaBox = (area, canvas) => ({
  x: (area.x / 100) * canvas.width,
  y: (area.y / 100) * canvas.height,
  width: (area.width / 100) * canvas.width,
  height: (area.height / 100) * canvas.height,
});

const getScaledAreaStyle = (area, fontScale) => {
  const style = {
    ...POSTER_AREA_DEFAULT_STYLE,
    ...(area.style || {}),
  };
  return {
    ...style,
    fontSize: clamp((Number(style.fontSize) || POSTER_AREA_DEFAULT_STYLE.fontSize) * fontScale, MIN_EXPORT_FONT_SIZE, MAX_EXPORT_FONT_SIZE),
  };
};

export const generateProgramPosterPng = async ({
  template,
  imageUrl,
  program,
  lang = "ar",
} = {}) => {
  if (!isBrowser()) throw new Error("poster-generation-browser-only");
  const { image, objectUrl } = await loadImageFromUrl(imageUrl);

  try {
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) throw new Error("invalid-template-image-size");

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("poster-canvas-unavailable");

    ctx.drawImage(image, 0, 0, width, height);

    const fontScale = getExportFontScale(width, height);
    const areas = Array.isArray(template?.areas)
      ? template.areas.map(normalizePosterArea).filter(Boolean)
      : [];

    areas.forEach((area, index) => {
      const value = resolvePosterAreaValue(area.type, program, { lang, area, index });
      if (!value || (Array.isArray(value) && !value.length)) return;
      drawTextInBox(ctx, value, getAreaBox(area, canvas), getScaledAreaStyle(area, fontScale), { lang });
    });

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("poster-image-export-failed"));
      }, "image/png");
    });
  } catch (error) {
    if (String(error?.message || "").includes("tainted")) {
      throw new Error("poster-image-cors-failed");
    }
    throw error;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
};

