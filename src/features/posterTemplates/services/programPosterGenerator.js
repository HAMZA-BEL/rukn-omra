import {
  normalizePosterArea,
  POSTER_AREA_DEFAULT_STYLE,
} from "../utils/posterTemplateData";
import { resolvePosterAreaValue } from "../utils/programPosterMapping";
import { drawPosterTextInBox } from "../utils/posterTextRendering";

const EDITOR_REFERENCE_MAX_WIDTH = 760;
const EDITOR_REFERENCE_MAX_HEIGHT = 680;
const MAX_EXPORT_PIXELS = 12000000;

const isBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";

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

const getExportRenderScale = (width, height) => {
  if (!isBrowser()) return 1;
  const deviceScale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const pixelScale = Math.sqrt(MAX_EXPORT_PIXELS / Math.max(1, width * height));
  return Math.min(deviceScale, Math.max(1, pixelScale));
};

const getAreaBox = (area, size) => ({
  x: (area.x / 100) * size.width,
  y: (area.y / 100) * size.height,
  width: (area.width / 100) * size.width,
  height: (area.height / 100) * size.height,
});

const getScaledAreaStyle = (area, fontScale) => {
  return {
    ...(area.style || {}),
    fontSize: (Number(area.style?.fontSize) || POSTER_AREA_DEFAULT_STYLE.fontSize) * fontScale,
  };
};

export const generateProgramPosterPng = async ({
  template,
  imageUrl,
  program,
  lang = "ar",
  posterOptions = {},
} = {}) => {
  if (!isBrowser()) throw new Error("poster-generation-browser-only");
  const { image, objectUrl } = await loadImageFromUrl(imageUrl);

  try {
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) throw new Error("invalid-template-image-size");
    if (document.fonts?.ready) {
      await document.fonts.ready.catch(() => {});
    }

    const renderScale = getExportRenderScale(width, height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * renderScale);
    canvas.height = Math.round(height * renderScale);

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("poster-canvas-unavailable");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.scale(renderScale, renderScale);

    ctx.drawImage(image, 0, 0, width, height);

    const fontScale = getExportFontScale(width, height);
    const areas = Array.isArray(template?.areas)
      ? template.areas.map(normalizePosterArea).filter(Boolean)
      : [];

    areas.forEach((area, index) => {
      const value = resolvePosterAreaValue(area.type, program, { lang, area, index, posterOptions });
      if (!value || (Array.isArray(value) && !value.length)) return;
      drawPosterTextInBox(
        ctx,
        value,
        getAreaBox(area, { width, height }),
        getScaledAreaStyle(area, fontScale),
        { lang, type: area.type }
      );
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
