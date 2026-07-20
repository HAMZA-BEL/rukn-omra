import { createWorker } from "tesseract.js";
import { parseMRZDetailed } from "./mrzReader";
import { detectMrzCandidateLines, normalizeOcrText } from "./passportMrzEngine";

const MRZ_DEBUG = process.env.NODE_ENV !== "production";
const PASSPORT_PERF_PREFIX = "[passport-import:perf]";
const MRZ_WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<";
const SINGLE_LINE_PSM = "7";
const OCR_TIMEOUT_MS = 8000;
const MAX_DIRECTED_RECOGNITIONS = 5;
const terminatedWorkers = new WeakSet();

const performanceNow = () => (
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : 0
);

const roundedDuration = (startedAt) => Math.round((performanceNow() - startedAt) * 10) / 10;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const logPassportPerformance = (event, payload = {}) => {
  if (MRZ_DEBUG) console.info(PASSPORT_PERF_PREFIX, event, payload);
};

const logMRZDebug = (label, payload) => {
  if (MRZ_DEBUG) console.debug(`[MRZ] ${label}`, payload);
};

export function convertDisplayedCropToNaturalRect({
  selection = {},
  displayed = {},
  natural = {},
} = {}) {
  const displayedWidth = Number(displayed.width) || 1;
  const displayedHeight = Number(displayed.height) || 1;
  const naturalWidth = Number(natural.width) || 1;
  const naturalHeight = Number(natural.height) || 1;
  const scale = Math.min(displayedWidth / naturalWidth, displayedHeight / naturalHeight);
  const renderedWidth = naturalWidth * scale;
  const renderedHeight = naturalHeight * scale;
  const offsetX = Math.max(0, (displayedWidth - renderedWidth) / 2);
  const offsetY = Math.max(0, (displayedHeight - renderedHeight) / 2);
  const x = ((Number(selection.x) || 0) - offsetX) * naturalWidth / renderedWidth;
  const y = ((Number(selection.y) || 0) - offsetY) * naturalHeight / renderedHeight;
  const width = (Number(selection.width) || 0) * naturalWidth / renderedWidth;
  const height = (Number(selection.height) || 0) * naturalHeight / renderedHeight;
  const clampedX = clamp(x, 0, naturalWidth - 1);
  const clampedY = clamp(y, 0, naturalHeight - 1);
  return {
    x: Math.round(clampedX),
    y: Math.round(clampedY),
    width: Math.round(clamp(width, 1, naturalWidth - clampedX)),
    height: Math.round(clamp(height, 1, naturalHeight - clampedY)),
  };
}

export function convertPercentCropToNaturalRect(crop = {}, naturalWidth = 1, naturalHeight = 1) {
  const margin = Number(crop.margin) || 0;
  const cropX = clamp((Number(crop.x) || 0) - margin, 0, 100);
  const cropY = clamp((Number(crop.y) || 0) - margin, 0, 100);
  const cropWidth = clamp((Number(crop.width) || 0) + margin * 2, 1, 100 - cropX);
  const cropHeight = clamp((Number(crop.height) || 0) + margin * 2, 1, 100 - cropY);
  const sourceX = Math.floor((cropX / 100) * naturalWidth);
  const sourceY = Math.floor((cropY / 100) * naturalHeight);
  return {
    x: clamp(sourceX, 0, naturalWidth - 1),
    y: clamp(sourceY, 0, naturalHeight - 1),
    width: clamp(Math.floor((cropWidth / 100) * naturalWidth), 1, naturalWidth - sourceX),
    height: clamp(Math.floor((cropHeight / 100) * naturalHeight), 1, naturalHeight - sourceY),
  };
}

const canvasToBlob = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("CROP_FAILED"));
  }, "image/png", 0.94);
});

const cropCanvas = (source, rect) => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rect.width));
  canvas.height = Math.max(1, Math.round(rect.height));
  canvas.getContext("2d", { willReadFrequently: true }).drawImage(
    source,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas;
};

const transformPixels = (canvas, transform) => {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  for (let index = 0; index < data.length; index += 4) {
    const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const value = clamp(transform(gray), 0, 255);
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }
  ctx.putImageData(imageData, 0, 0);
};

const applyLightMrzEnhancement = (canvas) => {
  transformPixels(canvas, (gray) => (gray - 128) * 1.35 + 136);
};

const otsuThreshold = (canvas) => {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const histogram = Array(256).fill(0);
  for (let index = 0; index < data.length; index += 4) {
    const gray = Math.round(data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114);
    histogram[gray] += 1;
  }
  const total = canvas.width * canvas.height;
  let sum = 0;
  histogram.forEach((count, value) => { sum += value * count; });
  let backgroundWeight = 0;
  let backgroundSum = 0;
  let bestVariance = -1;
  let threshold = 145;
  histogram.forEach((count, value) => {
    backgroundWeight += count;
    if (!backgroundWeight || backgroundWeight === total) return;
    const foregroundWeight = total - backgroundWeight;
    backgroundSum += value * count;
    const backgroundMean = backgroundSum / backgroundWeight;
    const foregroundMean = (sum - backgroundSum) / foregroundWeight;
    const variance = backgroundWeight * foregroundWeight * (backgroundMean - foregroundMean) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      threshold = value;
    }
  });
  transformPixels(canvas, (gray) => (gray > threshold ? 255 : 0));
};

const rotateCanvas = (source, degrees) => {
  if (!degrees) return source;
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
};

const horizontalInkScore = (canvas) => {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const rows = Array(canvas.height).fill(0);
  const xStep = Math.max(1, Math.floor(canvas.width / 360));
  const yStep = Math.max(1, Math.floor(canvas.height / 120));
  for (let y = 0; y < canvas.height; y += yStep) {
    let dark = 0;
    for (let x = 0; x < canvas.width; x += xStep) {
      const offset = (y * canvas.width + x) * 4;
      const gray = data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114;
      if (gray < 155) dark += 1;
    }
    rows[y] = dark;
  }
  const mean = rows.reduce((sum, value) => sum + value, 0) / Math.max(rows.length, 1);
  return rows.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(rows.length, 1);
};

const estimateDeskewAngle = (source, maxAngle = 0) => {
  if (!maxAngle) return 0;
  const sample = document.createElement("canvas");
  const scale = Math.min(1, 420 / source.width);
  sample.width = Math.max(1, Math.round(source.width * scale));
  sample.height = Math.max(1, Math.round(source.height * scale));
  sample.getContext("2d", { willReadFrequently: true }).drawImage(source, 0, 0, sample.width, sample.height);
  let best = { angle: 0, score: horizontalInkScore(sample) };
  for (let angle = -maxAngle; angle <= maxAngle; angle += 1) {
    if (!angle) continue;
    const score = horizontalInkScore(rotateCanvas(sample, angle));
    if (score > best.score) best = { angle, score };
  }
  return best.angle;
};

const findPeak = (rows, start, end) => {
  let peakIndex = start;
  let peakValue = -1;
  for (let index = start; index < end; index += 1) {
    if (rows[index] > peakValue) {
      peakIndex = index;
      peakValue = rows[index];
    }
  }
  return { index: peakIndex, value: peakValue };
};

const getHorizontalInkRows = (canvas) => {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const rows = Array(canvas.height).fill(0);
  const startX = Math.floor(canvas.width * 0.03);
  const endX = Math.ceil(canvas.width * 0.97);
  const step = Math.max(1, Math.floor(canvas.width / 900));
  for (let y = 0; y < canvas.height; y += 1) {
    let dark = 0;
    for (let x = startX; x < endX; x += step) {
      const offset = (y * canvas.width + x) * 4;
      const gray = data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114;
      if (gray < 160) dark += 1;
    }
    rows[y] = dark;
  }
  return rows.map((value, index) => (
    (rows[index - 2] || 0) + (rows[index - 1] || 0) + value + (rows[index + 1] || 0) + (rows[index + 2] || 0)
  ) / 5);
};

const lineBandAroundPeak = (rows, peak, fallbackStart, fallbackEnd) => {
  if (!peak.value || peak.value < 1) return { start: fallbackStart, end: fallbackEnd };
  const threshold = peak.value * 0.22;
  let start = peak.index;
  let end = peak.index;
  while (start > 0 && rows[start] >= threshold) start -= 1;
  while (end < rows.length - 1 && rows[end] >= threshold) end += 1;
  const padding = Math.max(5, Math.round(rows.length * 0.035));
  return {
    start: clamp(start - padding, 0, rows.length - 1),
    end: clamp(end + padding, 1, rows.length),
  };
};

export const detectMrzLineBandsFromProjection = (rows = []) => {
  const height = rows.length;
  const fallback = [
    { start: Math.round(height * 0.06), end: Math.round(height * 0.58) },
    { start: Math.round(height * 0.42), end: Math.round(height * 0.96) },
  ];
  if (height < 12 || !rows.some((value) => value > 0)) {
    return { bands: fallback, confident: false, method: "overlapping_fallback" };
  }
  const first = findPeak(rows, 0, height);
  const minimumSeparation = Math.max(8, Math.round(height * 0.2));
  let second = { index: -1, value: -1 };
  rows.forEach((value, index) => {
    if (Math.abs(index - first.index) < minimumSeparation) return;
    if (value > second.value) second = { index, value };
  });
  const peaks = [first, second].sort((left, right) => left.index - right.index);
  const confident = Boolean(
    second.index >= 0
    && second.value >= Math.max(2, first.value * 0.14)
    && peaks[1].index - peaks[0].index >= minimumSeparation
  );
  if (!confident) return { bands: fallback, confident: false, method: "overlapping_fallback" };

  const minimumLineHeight = Math.max(9, Math.round(height * 0.13));
  const top = lineBandAroundPeak(rows, peaks[0], fallback[0].start, fallback[0].end);
  const bottom = lineBandAroundPeak(rows, peaks[1], fallback[1].start, fallback[1].end);
  if (top.end - top.start < minimumLineHeight) top.end = clamp(top.start + minimumLineHeight, 1, height);
  if (bottom.end - bottom.start < minimumLineHeight) bottom.start = clamp(bottom.end - minimumLineHeight, 0, height - 1);
  if (top.end >= bottom.start) return { bands: fallback, confident: false, method: "overlapping_fallback" };
  return { bands: [top, bottom], confident: true, method: "horizontal_projection" };
};

export const detectMrzLineBandsDetailed = (canvas) => detectMrzLineBandsFromProjection(getHorizontalInkRows(canvas));

export const detectMrzLineBands = (canvas) => detectMrzLineBandsDetailed(canvas).bands;

const median = (values = []) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const detectSegmentLinePeaks = (canvas, startX, endX) => {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const width = Math.max(1, endX - startX);
  const { data } = ctx.getImageData(startX, 0, width, canvas.height);
  const rows = Array(canvas.height).fill(0);
  const step = Math.max(1, Math.floor(width / 90));
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < width; x += step) {
      const offset = (y * width + x) * 4;
      const gray = data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114;
      if (gray < 155) rows[y] += 1;
    }
  }
  const midpoint = Math.floor(rows.length / 2);
  const top = findPeak(rows, 0, midpoint);
  const bottom = findPeak(rows, midpoint, rows.length);
  if (top.value < 2 || bottom.value < 2 || bottom.index - top.index < canvas.height * 0.12) return null;
  return { top: top.index, bottom: bottom.index };
};

/**
 * Applies a conservative piecewise vertical warp to the final wide MRZ crop.
 * It normalizes keystone distortion only when both text lines are detectable
 * across enough vertical strips; otherwise the original canvas is returned.
 */
export const rectifyMrzPerspective = (source) => {
  const stripCount = 10;
  const strips = [];
  for (let index = 0; index < stripCount; index += 1) {
    const startX = Math.floor(index * source.width / stripCount);
    const endX = Math.ceil((index + 1) * source.width / stripCount);
    const peaks = detectSegmentLinePeaks(source, startX, endX);
    if (peaks) strips.push({ index, startX, endX, ...peaks });
  }
  if (strips.length < stripCount) return { canvas: source, applied: false };
  const targetTop = median(strips.map((strip) => strip.top));
  const targetBottom = median(strips.map((strip) => strip.bottom));
  const separations = strips.map((strip) => strip.bottom - strip.top);
  if (Math.max(...separations) - Math.min(...separations) < 2) return { canvas: source, applied: false };

  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  strips.forEach(({ startX, endX, top, bottom }) => {
    const width = endX - startX;
    const sourceSections = [
      { sy: 0, sh: Math.max(1, top), dy: 0, dh: Math.max(1, targetTop) },
      { sy: top, sh: Math.max(1, bottom - top), dy: targetTop, dh: Math.max(1, targetBottom - targetTop) },
      { sy: bottom, sh: Math.max(1, source.height - bottom), dy: targetBottom, dh: Math.max(1, source.height - targetBottom) },
    ];
    sourceSections.forEach(({ sy, sh, dy, dh }) => {
      ctx.drawImage(source, startX, sy, width, sh, startX, dy, width, dh);
    });
  });
  return { canvas, applied: true };
};

const decodePassportImage = (imageFile) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(imageFile);
  const image = new Image();
  image.onload = () => resolve({ image, url, width: image.naturalWidth, height: image.naturalHeight });
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error("IMAGE_LOAD_FAILED"));
  };
  image.src = url;
});

const renderMrzCrop = (decoded, crop, { targetWidth = 1900, deskewRange = 0 } = {}) => {
  const source = convertPercentCropToNaturalRect(crop, decoded.width, decoded.height);
  const outputWidth = Math.round(clamp(targetWidth, Math.min(1100, source.width), 2400));
  const scale = outputWidth / source.width;
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(decoded.image, source.x, source.y, source.width, source.height, 0, 0, canvas.width, canvas.height);
  const angle = estimateDeskewAngle(canvas, deskewRange);
  return { canvas: rotateCanvas(canvas, angle), source, angle };
};

const expandManualCrop = (crop, amount = 2) => ({
  x: clamp((Number(crop.x) || 0) - amount / 2, 0, 100),
  y: clamp((Number(crop.y) || 0) - amount, 0, 100),
  width: clamp((Number(crop.width) || 0) + amount, 1, 100),
  height: clamp((Number(crop.height) || 0) + amount * 2, 1, 100),
});

const buildLineAttempt = async (decoded, crop, {
  variant,
  threshold = false,
  deskewRange = 0,
  targetWidth = 1900,
  rectifyPerspective = false,
} = {}) => {
  const rendered = renderMrzCrop(decoded, crop, { targetWidth, deskewRange });
  const perspective = rectifyPerspective ? rectifyMrzPerspective(rendered.canvas) : { canvas: rendered.canvas, applied: false };
  const lineDetection = detectMrzLineBandsDetailed(perspective.canvas);
  const [top, bottom] = lineDetection.bands;
  const line1Canvas = cropCanvas(perspective.canvas, { x: 0, y: top.start, width: perspective.canvas.width, height: top.end - top.start });
  const line2Canvas = cropCanvas(perspective.canvas, { x: 0, y: bottom.start, width: perspective.canvas.width, height: bottom.end - bottom.start });
  [line1Canvas, line2Canvas].forEach((canvas) => {
    if (threshold) otsuThreshold(canvas);
    else applyLightMrzEnhancement(canvas);
  });
  const [line1, line2] = await Promise.all([canvasToBlob(line1Canvas), canvasToBlob(line2Canvas)]);
  return {
    kind: "lines",
    variant,
    line1: { blob: line1, cropType: "line1", variant: `${variant}-line1` },
    line2: { blob: line2, cropType: "line2", variant: `${variant}-line2` },
    cropDebug: {
      crop,
      naturalCrop: rendered.source,
      deskewAngle: rendered.angle,
      perspectiveRectified: perspective.applied,
      lineDetectionMethod: lineDetection.method,
      lineDetectionConfident: lineDetection.confident,
      lineBands: { line1: top, line2: bottom },
      canvas: { width: perspective.canvas.width, height: perspective.canvas.height },
    },
  };
};

export const buildMrzCropPlan = (cropOverride = null, { manual = false } = {}) => {
  const primaryCrop = cropOverride
    ? { ...cropOverride, margin: cropOverride.margin ?? (manual ? 0.8 : 0) }
    : { x: 0, y: 68, width: 100, height: 32 };
  return [
    {
      crop: primaryCrop,
      variant: manual ? "manual-mrz-lines-light" : "mrz-lines-light",
      targetWidth: 1850,
    },
    {
      crop: primaryCrop,
      variant: manual ? "manual-mrz-lines-threshold" : "mrz-lines-threshold",
      threshold: true,
      targetWidth: 2050,
    },
    {
      crop: manual ? expandManualCrop(primaryCrop) : { x: 0, y: 54, width: 100, height: 46 },
      variant: manual ? "manual-mrz-lines-deskew" : "mrz-wide-lines-deskew",
      deskewRange: 5,
      targetWidth: 2200,
      rectifyPerspective: true,
    },
  ];
};

const createDirectedAttemptFactory = (decoded, cropOverride = null, options = {}) => {
  const plan = buildMrzCropPlan(cropOverride, options);
  return async (attemptIndex) => {
    const attempt = plan[attemptIndex];
    return attempt ? buildLineAttempt(decoded, attempt.crop, attempt) : null;
  };
};

export const normalizeMRZOCRText = (text = "") => normalizeOcrText(text);

export const extractMRZCandidate = (text = "") => {
  const candidate = detectMrzCandidateLines(text);
  if (!candidate.ok) {
    return {
      ok: false,
      error: candidate.error || "MRZ_NOT_FOUND",
      raw: {
        line1: candidate.lines?.[0] || "",
        line2: candidate.lines?.[1] || "",
      },
      normalizedLines: candidate.normalizedLines || [],
    };
  }
  const [line1, line2] = candidate.lines || [];
  const parsed = parseMRZDetailed(line1, line2, { ocrText: text });
  return {
    ok: Boolean(parsed.ok),
    lines: { line1, line2 },
    parsed,
    error: parsed.ok ? "" : "MRZ_VALIDATION_FAILED",
    normalizedLines: candidate.normalizedLines || [],
  };
};

export const normalizeTd3OcrLine = (value = "", type = "line") => {
  let line = String(value || "").toUpperCase().replace(/[^A-Z0-9<]/g, "");
  if (type === "line1") {
    const passportStart = line.indexOf("P<");
    if (passportStart >= 0) line = line.slice(passportStart);
  }
  const hasTd3Structure = type === "line1"
    ? line.startsWith("P<") && line.includes("<<")
    : line.length >= 10 && /^[A-Z0-9<]+$/.test(line);
  if (line.length === 43 && hasTd3Structure) return line.padEnd(44, "<");
  if (line.length === 45 && line.endsWith("<") && hasTd3Structure) return line.slice(0, 44);
  return line;
};

const lineWindows = (value = "", type = "line") => {
  const normalized = normalizeOcrText(value);
  const sources = normalized.length ? normalized : [String(value || "").toUpperCase().replace(/[^A-Z0-9<]/g, "")];
  const candidates = [];
  const seen = new Set();
  const push = (candidate) => {
    if (!candidate || seen.has(candidate)) return;
    seen.add(candidate);
    candidates.push(candidate);
  };
  sources.forEach((source) => {
    push(normalizeTd3OcrLine(source, type));
  });
  return candidates.slice(0, 8);
};

const parsedResultScore = (parsed = {}) => {
  const checks = parsed.checks || {};
  const data = parsed.data || {};
  return Number(Boolean(parsed.ok)) * 1000
    + ["passportNo", "nationality", "birthDate", "expiryDate", "gender", "latinLastName", "latinFirstName"]
      .reduce((score, field) => score + Number(Boolean(data[field])) * 10, 0)
    + Object.values(checks).reduce((score, check) => score + Number(Boolean(check?.valid)) * 20, 0)
    - (parsed.reviewReasons?.length || 0) * 4;
};

export const parseDirectedMrzLines = (line1Text = "", line2Text = "") => {
  const line1Candidates = lineWindows(line1Text, "line1");
  const line2Candidates = lineWindows(line2Text, "line2");
  let best = null;
  line1Candidates.forEach((line1) => {
    line2Candidates.forEach((line2) => {
      const parsed = parseMRZDetailed(line1, line2, { ocrText: `${line1Text}\n${line2Text}` });
      const scored = { parsed, raw: { line1, line2 }, score: parsedResultScore(parsed) };
      if (!best || scored.score > best.score) best = scored;
    });
  });
  return best || {
    parsed: null,
    raw: { line1: line1Candidates[0] || "", line2: line2Candidates[0] || "" },
    score: -1,
  };
};

const createMRZWorker = (onProgress) => {
  let lastReportedAt = -Infinity;
  let lastReportedProgress = -1;
  return createWorker("eng", 1, {
    logger: (message) => {
      if (!onProgress || message.status !== "recognizing text") return;
      const progress = Math.round(message.progress * 100);
      const now = performanceNow();
      if (progress < 100 && now - lastReportedAt < 120 && progress - lastReportedProgress < 5) return;
      lastReportedAt = now;
      lastReportedProgress = progress;
      onProgress(progress);
    },
  });
};

const configureMRZWorker = async (worker) => {
  await worker.setParameters({
    tessedit_char_whitelist: MRZ_WHITELIST,
    tessedit_pageseg_mode: SINGLE_LINE_PSM,
    load_system_dawg: "0",
    load_freq_dawg: "0",
    load_unambig_dawg: "0",
    load_punc_dawg: "0",
    load_number_dawg: "0",
    preserve_interword_spaces: "0",
  });
};

export const createPassportOCRWorker = async (onProgress, context = {}) => {
  const startedAt = performanceNow();
  let worker = null;
  try {
    worker = await createMRZWorker(onProgress);
    await configureMRZWorker(worker);
    logPassportPerformance("worker-init", {
      ...context,
      durationMs: roundedDuration(startedAt),
      pageSegMode: SINGLE_LINE_PSM,
      status: "success",
    });
    return worker;
  } catch (error) {
    if (worker) await terminatePassportOCRWorker(worker, { ...context, reason: "worker-init-error" });
    throw error;
  }
};

export const terminatePassportOCRWorker = async (worker, context = {}) => {
  if (!worker || terminatedWorkers.has(worker)) return;
  terminatedWorkers.add(worker);
  const startedAt = performanceNow();
  try {
    await worker.terminate();
    logPassportPerformance("worker-terminate", { ...context, durationMs: roundedDuration(startedAt), status: "success" });
  } catch (error) {
    logPassportPerformance("worker-terminate", { ...context, durationMs: roundedDuration(startedAt), status: "error" });
  }
};

const recognizeWithTimeout = async (worker, item, perfContext = {}) => {
  const startedAt = performanceNow();
  const result = await Promise.race([
    worker.recognize(item.blob || item),
    new Promise((_, reject) => setTimeout(() => reject(new Error("OCR_TIMEOUT")), OCR_TIMEOUT_MS)),
  ]);
  const text = typeof result === "string" ? result : result?.data?.text || "";
  logPassportPerformance("ocr-pass", {
    ...perfContext,
    variant: item.variant || "",
    cropType: item.cropType || "",
    durationMs: roundedDuration(startedAt),
    status: text.trim() ? "text" : "no-text",
  });
  return text;
};

const buildAttemptDebug = ({ attempt, raw, parsed, recognitionCount, recognizedLines = [], ocrText = "" }) => ({
  variant: attempt.variant,
  cropType: "mrz_lines",
  cropDebug: attempt.cropDebug || null,
  detectedLine1: raw.line1 || "",
  detectedLine2: raw.line2 || "",
  recognizedLines,
  hasOcrText: Boolean(String(ocrText || "").replace(/\s+/g, "")),
  recognitionCount,
  accepted: Boolean(parsed?.ok),
  reasons: parsed?.reviewReasons || (parsed ? parsed.issues : ["MRZ_NOT_FOUND"]),
  parser: parsed ? {
    fields: parsed.data || null,
    checks: parsed.checks || null,
    reviewReasons: parsed.reviewReasons || [],
  } : null,
});

const weakMrzLines = (result = {}) => {
  const raw = result.raw || {};
  const parsed = result.parsed || {};
  const data = parsed.data || {};
  const checks = parsed.checks || {};
  const weak = [];
  if (
    !String(raw.line1 || "").startsWith("P<")
    || !data.latinLastName
    || !data.latinFirstName
  ) weak.push("line1");
  if (
    String(raw.line2 || "").length < 43
    || !data.passportNo
    || !data.nationality
    || !data.birthDate
    || !data.expiryDate
    || !data.gender
    || !checks.passportNumberCheck?.valid
    || !checks.birthDateCheck?.valid
    || !checks.expiryDateCheck?.valid
    || !checks.compositeCheck?.valid
  ) weak.push("line2");
  return weak;
};

const linesForAttempt = (attemptIndex, bestFailure) => {
  if (attemptIndex === 0) return ["line1", "line2"];
  const weak = weakMrzLines(bestFailure);
  if (attemptIndex === 1) return weak.length === 1 ? weak : ["line1", "line2"];
  return [weak[0] || "line2"];
};

/** Runs at most two initial lines, two targeted retries, and one final line retry. */
export async function runDirectedMrzRecognition({
  worker,
  createAttempt,
  recognize = recognizeWithTimeout,
  onStage = () => {},
  isCancelled = () => false,
  perfContext = {},
} = {}) {
  let recognitionCount = 0;
  let bestFailure = { success: false, error: "MRZ_NOT_FOUND", raw: { line1: "", line2: "" }, parsed: null, score: -1 };
  const attempts = [];
  const latestOcrLines = { line1: "", line2: "" };

  for (let attemptIndex = 0; attemptIndex < 3; attemptIndex += 1) {
    if (isCancelled()) return { ...bestFailure, error: "OCR_CANCELLED", cancelled: true, debug: { attempts, recognitionCount } };
    const attempt = await createAttempt(attemptIndex);
    if (!attempt) break;
    onStage({
      phase: attemptIndex ? "reading" : "preparing",
      progress: 0.08 + recognitionCount / MAX_DIRECTED_RECOGNITIONS * 0.82,
      completedPasses: recognitionCount,
      totalPasses: MAX_DIRECTED_RECOGNITIONS,
    });

    const recognizedLines = linesForAttempt(attemptIndex, bestFailure)
      .slice(0, Math.max(0, MAX_DIRECTED_RECOGNITIONS - recognitionCount));
    for (const lineName of recognizedLines) {
      latestOcrLines[lineName] = await recognize(worker, attempt[lineName], {
        ...perfContext,
        recognition: recognitionCount + 1,
      });
      recognitionCount += 1;
      if (isCancelled()) return { ...bestFailure, error: "OCR_CANCELLED", cancelled: true, debug: { attempts, recognitionCount } };
    }
    const directed = parseDirectedMrzLines(latestOcrLines.line1, latestOcrLines.line2);
    const parsed = directed.parsed;
    const raw = directed.raw;
    const ocrText = `${latestOcrLines.line1}\n${latestOcrLines.line2}`;

    const score = parsedResultScore(parsed || {});
    attempts.push(buildAttemptDebug({ attempt, raw, parsed, recognitionCount, recognizedLines, ocrText }));
    onStage({
      phase: "validating",
      progress: 0.08 + recognitionCount / MAX_DIRECTED_RECOGNITIONS * 0.82,
      completedPasses: recognitionCount,
      totalPasses: MAX_DIRECTED_RECOGNITIONS,
    });
    const result = {
      success: Boolean(parsed?.ok),
      data: parsed?.data || null,
      parsed,
      raw,
      ocrText,
      variant: attempt.variant,
      score,
    };
    if (result.success && !isCancelled()) {
      onStage({ phase: "confirming", progress: 0.98, completedPasses: recognitionCount, totalPasses: MAX_DIRECTED_RECOGNITIONS });
      return {
        ...result,
        debug: {
          mode: "directed_td3",
          attempts,
          recognitionCount,
          maxRecognitions: MAX_DIRECTED_RECOGNITIONS,
          earlyExit: recognitionCount < MAX_DIRECTED_RECOGNITIONS,
        },
      };
    }
    if (score > bestFailure.score) {
      bestFailure = { ...result, success: false, error: parsed ? "MRZ_VALIDATION_FAILED" : "MRZ_NOT_FOUND" };
    }
  }

  return {
    ...bestFailure,
    debug: {
      mode: "directed_td3",
      attempts,
      recognitionCount,
      maxRecognitions: MAX_DIRECTED_RECOGNITIONS,
      earlyExit: false,
    },
  };
}

const extractFromImage = async (imageFile, crop, onProgress, options = {}) => {
  const externalWorker = options.worker || null;
  const externalWorkerPromise = options.workerPromise || null;
  const externallyManagedWorker = Boolean(externalWorker || externalWorkerPromise);
  const perfContext = options.perfContext || {};
  const manualCrop = Boolean(options.manualCrop);
  const onStage = typeof options.onStage === "function" ? options.onStage : () => {};
  const isCancelled = typeof options.isCancelled === "function" ? options.isCancelled : () => false;
  const startedAt = performanceNow();
  let decoded = null;
  let worker = externalWorker;
  let recognitionStarted = false;
  try {
    onStage({ phase: "preparing", progress: 0.02, completedPasses: 0, totalPasses: MAX_DIRECTED_RECOGNITIONS });
    const decodedPromise = options.decodedImage
      ? Promise.resolve(options.decodedImage)
      : decodePassportImage(imageFile);
    if (externalWorker) {
      decoded = await decodedPromise;
    } else if (externalWorkerPromise) {
      [decoded, worker] = await Promise.all([decodedPromise, externalWorkerPromise]);
    } else {
      decoded = await decodedPromise;
    }
    if (!decoded.width || !decoded.height) throw new Error(manualCrop ? "MANUAL_CROP_INVALID" : "IMAGE_LOAD_FAILED");
    if (manualCrop) {
      const naturalCrop = convertPercentCropToNaturalRect(crop, decoded.width, decoded.height);
      if (naturalCrop.width < 80 || naturalCrop.height < 16) throw new Error("MANUAL_CROP_INVALID");
    }
    if (isCancelled()) return { success: false, cancelled: true, error: "OCR_CANCELLED" };
    if (!worker && externalWorkerPromise) throw new Error("OCR_WORKER_INIT_FAILED");
    if (!worker) worker = await createPassportOCRWorker(onProgress, perfContext);
    recognitionStarted = true;
    const result = await runDirectedMrzRecognition({
      worker,
      createAttempt: options.createAttempt || createDirectedAttemptFactory(decoded, crop, { manual: manualCrop }),
      recognize: options.recognize || recognizeWithTimeout,
      onStage,
      isCancelled,
      perfContext,
    });
    const attempts = result.debug?.attempts || [];
    const hasPartialText = Boolean(
      result.raw?.line1
      || result.raw?.line2
      || attempts.some((attempt) => attempt.hasOcrText)
    );
    const lineSeparationFailed = Boolean(
      manualCrop
      && attempts.length
      && attempts.every((attempt) => attempt.cropDebug?.lineDetectionConfident === false)
      && !hasPartialText
    );
    const classifiedError = result.success
      ? ""
      : result.parsed?.data
        ? "MRZ_VALIDATION_FAILED"
        : lineSeparationFailed
          ? "MRZ_LINES_NOT_SEPARATED"
          : hasPartialText
            ? "MRZ_PARTIAL"
            : result.error || "MRZ_NOT_FOUND";
    const classifiedResult = {
      ...result,
      error: classifiedError,
      debug: {
        ...(result.debug || {}),
        cropMode: manualCrop ? "manual" : "automatic",
        requestedCrop: crop || null,
      },
    };
    logPassportPerformance("passport-ocr-summary", {
      ...perfContext,
      durationMs: roundedDuration(startedAt),
      recognitionCount: classifiedResult.debug?.recognitionCount || 0,
      maxRecognitions: MAX_DIRECTED_RECOGNITIONS,
      status: classifiedResult.success ? "ready" : classifiedResult.error,
    });
    return classifiedResult;
  } catch (error) {
    logMRZDebug("ocr:error", { error: error?.message || String(error), ...perfContext });
    const errorCode = manualCrop && ["CROP_FAILED", "IMAGE_LOAD_FAILED"].includes(error?.message)
      ? "MANUAL_CROP_INVALID"
      : error?.message || "OCR_FAILED";
    return {
      success: false,
      error: errorCode,
      workerShouldReset: Boolean(externallyManagedWorker && recognitionStarted),
    };
  } finally {
    if (!options.decodedImage && decoded?.url) URL.revokeObjectURL(decoded.url);
    if (worker && !externallyManagedWorker) await terminatePassportOCRWorker(worker, { ...perfContext, reason: "passport-complete" });
  }
};

export async function extractMRZFromImage(imageFile, onProgress, options = {}) {
  return extractFromImage(imageFile, null, onProgress, options);
}

export async function extractMRZFromImageRegion(imageFile, crop, onProgress, options = {}) {
  return extractFromImage(imageFile, crop, onProgress, {
    ...options,
    manualCrop: true,
    perfContext: { scope: "manual-crop", ...(options.perfContext || {}) },
  });
}

export const passportFileKey = (file = {}) => [
  file.name || "",
  Number(file.size) || 0,
  Number(file.lastModified) || 0,
  file.type || "",
].join("::");

export const dedupePassportFiles = (files = []) => {
  const seen = new Set();
  return Array.from(files || []).filter((file) => {
    const key = passportFileKey(file);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const PASSPORT_OCR_LIMITS = {
  bestCaseRecognitions: 2,
  worstCaseRecognitions: MAX_DIRECTED_RECOGNITIONS,
};
