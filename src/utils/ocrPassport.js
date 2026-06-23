import { createWorker } from "tesseract.js";
import { parseMRZDetailed } from "./mrzReader";
import { detectMrzCandidateLines, normalizeOcrText, scoreTd3Line1Candidate } from "./passportMrzEngine";

const MRZ_DEBUG = process.env.NODE_ENV !== "production";
const PASSPORT_PERF_PREFIX = "[passport-import:perf]";
const PASSPORT_DIAGNOSTICS_FLAG = "__PASSPORT_IMPORT_DIAGNOSTICS__";
const PASSPORT_EARLY_EXIT_ENABLED = true;
const PASSPORT_EARLY_EXIT_DISABLE_FLAG = "__PASSPORT_IMPORT_DISABLE_EARLY_EXIT__";
const PASSPORT_EARLY_EXIT_SCORE = 220;
const DEFAULT_MRZ_CROPS = [
  { x: 0, y: 72, width: 100, height: 28 },
  { x: 0, y: 65, width: 100, height: 35 },
  { x: 0, y: 55, width: 100, height: 45 },
];
const PRIMARY_FULL_PASS_INDEXES = [0, 1, 2];
const CONFIRMATION_FULL_PASS_INDEXES = [3, 4, 15, 16, 17];
const terminatedWorkers = new WeakSet();

const performanceNow = () => (
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : 0
);

const roundedDuration = (startedAt) => Math.round((performanceNow() - startedAt) * 10) / 10;

const logPassportPerformance = (event, payload = {}) => {
  if (!MRZ_DEBUG) return;
  console.info(PASSPORT_PERF_PREFIX, event, payload);
};

const passportDiagnosticsEnabled = () => {
  if (!MRZ_DEBUG || typeof window === "undefined") return false;
  // Enable explicitly in dev tools with:
  // window.__PASSPORT_IMPORT_DIAGNOSTICS__ = true
  // or localStorage.setItem("passport-import:diagnostics", "true")
  if (window[PASSPORT_DIAGNOSTICS_FLAG] === true) return true;
  try {
    return window.localStorage?.getItem("passport-import:diagnostics") === "true";
  } catch {
    return false;
  }
};

const passportEarlyExitEnabled = () => {
  if (!PASSPORT_EARLY_EXIT_ENABLED) return false;
  if (typeof window === "undefined") return true;
  // Emergency safety switch:
  // window.__PASSPORT_IMPORT_DISABLE_EARLY_EXIT__ = true
  // or localStorage.setItem("passport-import:disable-early-exit", "true")
  if (window[PASSPORT_EARLY_EXIT_DISABLE_FLAG] === true) return false;
  try {
    return window.localStorage?.getItem("passport-import:disable-early-exit") !== "true";
  } catch {
    return true;
  }
};

const logMRZDebug = (label, payload) => {
  if (MRZ_DEBUG) console.debug(`[MRZ] ${label}`, payload);
};

const logMRZRecoveryDecision = (payload) => {
  if (MRZ_DEBUG) console.debug("[MRZ recovery decision]", payload);
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

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
  const margin = crop.margin ?? 1.2;
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
  }, "image/png", 0.95);
});

const isCanvasLowInformation = (canvas) => {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let min = 255;
  let max = 0;
  let total = 0;
  const step = Math.max(4, Math.floor(data.length / 8000) * 4);
  for (let i = 0; i < data.length; i += step) {
    const value = data[i];
    min = Math.min(min, value);
    max = Math.max(max, value);
    total += 1;
  }
  return { blank: max - min < 12, contrastRange: max - min, samples: total };
};

const enhanceMRZCanvas = (canvas) => {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const contrasted = clamp((gray - 128) * 1.85 + 128 + 10, 0, 255);
    const value = contrasted > 150 ? 255 : contrasted < 92 ? 0 : contrasted;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
  ctx.putImageData(imageData, 0, 0);
};

const grayscaleMRZCanvas = (canvas) => {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);
};

const thresholdMRZCanvas = (canvas) => {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const value = gray > 142 ? 255 : 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
  ctx.putImageData(imageData, 0, 0);
};

const sharpenMRZCanvas = (canvas) => {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const source = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const output = ctx.createImageData(canvas.width, canvas.height);
  const { width, height } = canvas;
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      [0, 1, 2].forEach((channel) => {
        let value = 0;
        for (let ky = -1; ky <= 1; ky += 1) {
          for (let kx = -1; kx <= 1; kx += 1) {
            const px = clamp(x + kx, 0, width - 1);
            const py = clamp(y + ky, 0, height - 1);
            value += source.data[(py * width + px) * 4 + channel] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        output.data[offset + channel] = clamp(value, 0, 255);
      });
      output.data[offset + 3] = source.data[offset + 3];
    }
  }
  ctx.putImageData(output, 0, 0);
};

const cloneCanvasWithTransform = (sourceCanvas, transform) => {
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(sourceCanvas, 0, 0);
  transform?.(canvas);
  return canvas;
};

const cropCanvasRegion = (sourceCanvas, { x = 0, y = 0, width = sourceCanvas.width, height = sourceCanvas.height } = {}) => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(sourceCanvas, x, y, width, height, 0, 0, canvas.width, canvas.height);
  return canvas;
};

const buildDebugPreviews = (canvas) => {
  if (!passportDiagnosticsEnabled()) return {};
  const halfHeight = Math.max(1, Math.floor(canvas.height / 2));
  return {
    fullMrz: canvas.toDataURL("image/png"),
    line1: cropCanvasRegion(canvas, { x: 0, y: 0, width: canvas.width, height: halfHeight }).toDataURL("image/png"),
    line2: cropCanvasRegion(canvas, { x: 0, y: halfHeight, width: canvas.width, height: canvas.height - halfHeight }).toDataURL("image/png"),
  };
};

const buildCropDebug = ({ source, canvas, crop, variant, information, cropType = "full_mrz", sentToOcr = true }) => {
  const margin = crop.margin ?? 1.2;
  return {
    source,
    canvas: { width: canvas.width, height: canvas.height },
    cropType,
    variant,
    sentToOcr,
    scaleFactor: source.width ? canvas.width / source.width : 1,
    marginExpanded: margin > 0,
    marginPercent: margin,
    information,
    previews: buildDebugPreviews(canvas),
  };
};

const createImageCropVariants = (imageFile, crop = { x: 0, y: 66, width: 100, height: 34 }) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(imageFile);
  const img = new Image();
  img.onload = () => {
    try {
      const source = convertPercentCropToNaturalRect(crop, img.naturalWidth, img.naturalHeight);
      if (source.width < 240 || source.height < 32) {
        logMRZDebug("crop:too-small", { file: imageFile?.name, natural: { width: img.naturalWidth, height: img.naturalHeight }, crop, source });
      }
      const minWidth = 1500;
      const maxWidth = 2600;
      const scale = clamp(minWidth / source.width, 1, maxWidth / source.width);
      const canvasWidth = Math.max(1, Math.round(source.width * scale));
      const canvasHeight = Math.max(1, Math.round(source.height * scale));
      const rawCanvas = document.createElement("canvas");
      rawCanvas.width = canvasWidth;
      rawCanvas.height = canvasHeight;
      const rawCtx = rawCanvas.getContext("2d", { willReadFrequently: true });
      rawCtx.imageSmoothingEnabled = true;
      rawCtx.imageSmoothingQuality = "high";
      rawCtx.drawImage(img, source.x, source.y, source.width, source.height, 0, 0, canvasWidth, canvasHeight);

      const processedCanvas = document.createElement("canvas");
      processedCanvas.width = canvasWidth;
      processedCanvas.height = canvasHeight;
      const processedCtx = processedCanvas.getContext("2d", { willReadFrequently: true });
      processedCtx.drawImage(rawCanvas, 0, 0);
      enhanceMRZCanvas(processedCanvas);
      const information = isCanvasLowInformation(rawCanvas);
      logMRZDebug("crop:created", {
        file: imageFile?.name,
        natural: { width: img.naturalWidth, height: img.naturalHeight },
        percentCrop: crop,
        naturalCrop: source,
        canvas: { width: canvasWidth, height: canvasHeight },
        information,
      });

      const grayCanvas = cloneCanvasWithTransform(rawCanvas, grayscaleMRZCanvas);
      const thresholdCanvas = cloneCanvasWithTransform(rawCanvas, thresholdMRZCanvas);
      const sharpenedCanvas = cloneCanvasWithTransform(processedCanvas, sharpenMRZCanvas);

      const fullVariants = [
        { canvas: processedCanvas, variant: "processed-contrast", cropType: "full_mrz" },
        { canvas: rawCanvas, variant: "original-upscaled", cropType: "full_mrz" },
        { canvas: grayCanvas, variant: "grayscale-upscaled", cropType: "full_mrz" },
        { canvas: thresholdCanvas, variant: "threshold-upscaled", cropType: "full_mrz" },
        { canvas: sharpenedCanvas, variant: "sharpened-contrast", cropType: "full_mrz" },
      ];
      const lineCropVariants = fullVariants.flatMap((item) => {
        const halfHeight = Math.max(1, Math.floor(item.canvas.height / 2));
        return [
          {
            canvas: cropCanvasRegion(item.canvas, { x: 0, y: 0, width: item.canvas.width, height: halfHeight }),
            variant: `${item.variant}-line1`,
            cropType: "line1",
          },
          {
            canvas: cropCanvasRegion(item.canvas, { x: 0, y: halfHeight, width: item.canvas.width, height: item.canvas.height - halfHeight }),
            variant: `${item.variant}-line2`,
            cropType: "line2",
          },
        ];
      });
      const variants = [...fullVariants, ...lineCropVariants];

      Promise.all(variants.map((item) => canvasToBlob(item.canvas))).then((blobs) => {
        URL.revokeObjectURL(url);
        resolve(variants.map((item, index) => ({
          blob: blobs[index],
          variant: item.variant,
          debug: buildCropDebug({
            source,
            canvas: item.canvas,
            crop,
            variant: item.variant,
            cropType: item.cropType,
            sentToOcr: true,
            information,
          }),
        })));
      }).catch((error) => {
        URL.revokeObjectURL(url);
        reject(error);
      });
    } catch (error) {
      URL.revokeObjectURL(url);
      reject(error);
    }
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error("IMAGE_LOAD_FAILED"));
  };
  img.src = url;
});

const createMRZCropBlobs = async (imageFile) => {
  const groups = await Promise.all(DEFAULT_MRZ_CROPS.map((crop) => createImageCropVariants(imageFile, crop)));
  return groups.flatMap((group, cropIndex) => group.map((item, variantIndex) => ({
    ...item,
    cropIndex,
    originalPassIndex: cropIndex * group.length + variantIndex,
  })));
};

export const normalizeMRZOCRText = (text = "") => normalizeOcrText(text);

export const extractMRZCandidate = (text = "") => {
  const candidate = detectMrzCandidateLines(text);
  logMRZDebug("ocr:normalized-lines", {
    lines: candidate.normalizedLines || normalizeOcrText(text),
    candidates: candidate.candidates,
  });
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
  if (parsed.data && !parsed.ok) {
    logMRZDebug("parser:accepted-with-warnings", {
      issues: parsed.issues,
      reviewReasons: parsed.reviewReasons,
      raw: { line1, line2 },
    });
  }
  return {
    ok: Boolean(parsed.data),
    lines: { line1, line2 },
    parsed,
    normalizedLines: candidate.normalizedLines || [],
  };
};

const createMRZWorker = (onProgress) => {
  logMRZDebug("ocr:worker-create", { language: "eng" });
  return createWorker("eng", 1, {
    logger: (m) => {
      if (MRZ_DEBUG) console.debug("[MRZ] ocr:worker", { status: m.status, progress: m.progress });
      if (onProgress && m.status === "recognizing text") {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
};

export const terminatePassportOCRWorker = async (worker, context = {}) => {
  if (!worker || terminatedWorkers.has(worker)) return;
  terminatedWorkers.add(worker);
  const startedAt = performanceNow();
  try {
    await worker.terminate();
    logPassportPerformance("worker-terminate", {
      ...context,
      durationMs: roundedDuration(startedAt),
      status: "success",
    });
  } catch (error) {
    logPassportPerformance("worker-terminate", {
      ...context,
      durationMs: roundedDuration(startedAt),
      status: "error",
      error: error?.message || String(error),
    });
  }
};

const configureMRZWorker = async (worker) => {
  await worker.setParameters({
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
    tessedit_pageseg_mode: "6",
  });
  logMRZDebug("ocr:worker-configured", {
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
    pageSegMode: "6",
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
      language: "eng",
      pageSegMode: "6",
      status: "success",
    });
    return worker;
  } catch (error) {
    logPassportPerformance("worker-init", {
      ...context,
      durationMs: roundedDuration(startedAt),
      language: "eng",
      pageSegMode: "6",
      status: "error",
      error: error?.message || String(error),
    });
    if (worker) await terminatePassportOCRWorker(worker, { ...context, reason: "worker-init-error" });
    throw error;
  }
};

const recognizeMRZBlob = async (worker, croppedMRZ, perfContext = {}) => {
  const blob = croppedMRZ?.blob || croppedMRZ;
  logMRZDebug("ocr:start", { variant: croppedMRZ?.variant, debug: croppedMRZ?.debug });
  if (croppedMRZ?.debug?.cropType === "line1" || croppedMRZ?.debug?.cropType === "line2") {
    await worker.setParameters({ tessedit_pageseg_mode: "7" });
  } else {
    await worker.setParameters({ tessedit_pageseg_mode: "6" });
  }
  const recognitionStartedAt = performanceNow();
  const recognition = worker.recognize(blob);
  let text = "";
  try {
    const result = await Promise.race([
      recognition,
      new Promise((_, reject) => setTimeout(() => reject(new Error("OCR_TIMEOUT")), 18000)),
    ]);
    text = result?.data?.text || "";
    logPassportPerformance("ocr-pass", {
      ...perfContext,
      variant: croppedMRZ?.variant || "",
      cropType: croppedMRZ?.debug?.cropType || "full_mrz",
      durationMs: roundedDuration(recognitionStartedAt),
      status: String(text || "").trim() ? "text" : "no-text",
    });
  } catch (error) {
    logPassportPerformance("ocr-pass", {
      ...perfContext,
      variant: croppedMRZ?.variant || "",
      cropType: croppedMRZ?.debug?.cropType || "full_mrz",
      durationMs: roundedDuration(recognitionStartedAt),
      status: "error",
      error: error?.message || String(error),
    });
    throw error;
  }
  logMRZDebug("ocr:raw-text", {
    variant: croppedMRZ?.variant,
    text,
  });
  if (!String(text || "").trim()) return { success: false, error: "OCR_NO_TEXT", raw: { line1: "", line2: "" }, ocrText: text || "", cropDebug: croppedMRZ?.debug, variant: croppedMRZ?.variant };
  const candidate = extractMRZCandidate(text);
  if (!candidate.ok) {
    if (croppedMRZ?.debug?.cropType === "line2") {
      const normalizedLines = normalizeOcrText(text);
      const line2 = candidate.raw?.line2 || normalizedLines.find((line) => line.length >= 20) || normalizedLines[0] || "";
      const inferredIssuer = line2.includes("MAR") ? "MAR" : /^[A-Z]{3}$/.test(line2.slice(10, 13)) ? line2.slice(10, 13) : "UTO";
      const syntheticLine1 = `P<${inferredIssuer}LINEONLY<<DEBUG<<<<<<<<<<<<<<<<<<`;
      const parsed = line2 ? parseMRZDetailed(syntheticLine1, line2, { ocrText: text, source: "line2_crop_debug" }) : null;
      return {
        success: false,
        lineOnly: true,
        error: candidate.error || "MRZ_NOT_FOUND",
        raw: { line1: "", line2 },
        parsed,
        ocrText: text || "",
        cropDebug: croppedMRZ?.debug,
        variant: croppedMRZ?.variant,
      };
    }
    return { success: false, error: candidate.error || "MRZ_NOT_FOUND", raw: candidate.raw, ocrText: text || "", cropDebug: croppedMRZ?.debug, variant: croppedMRZ?.variant };
  }
  logMRZDebug("parser:result", {
    variant: croppedMRZ?.variant,
    raw: candidate.lines,
    issues: candidate.parsed?.issues || [],
    reviewReasons: candidate.parsed?.reviewReasons || [],
    confidence: candidate.parsed?.confidence,
    checks: candidate.parsed?.checks,
  });
  return { success: true, data: candidate.parsed.data, raw: candidate.lines, issues: candidate.parsed.issues || [], parsed: candidate.parsed, ocrText: text || "", cropDebug: croppedMRZ?.debug, variant: croppedMRZ?.variant };
};

const scoreRecognizedMRZResult = (result = {}) => {
  if (!result.success || !result.parsed?.data) return -1000;
  const parsed = result.parsed || {};
  const data = parsed.data || {};
  const checks = parsed.checks || {};
  let score = Math.round((Number(parsed.confidence) || 0) * 100);
  ["passportNo", "nationality", "birthDate", "expiryDate", "gender"].forEach((field) => {
    if (data[field]) score += 8;
  });
  if (data.birthDateApproximated && data.birthDateRaw && data.birthDatePrecision) score += 6;
  if (checks.passportNumberCheck?.valid) score += 18;
  if (checks.birthDateCheck?.valid) score += 18;
  if (checks.expiryDateCheck?.valid) score += 18;
  if (checks.compositeCheck?.valid) score += 12;
  if (/^[A-Z]{3}$/.test(data.nationality || "")) score += 10;
  if (/^[A-Z0-9]{3,9}$/.test(data.passportNo || "")) score += 10;
  const line1Score = scoreTd3Line1Candidate(parsed.raw?.line1 || result.raw?.line1 || "").score;
  if (line1Score > 0) score += Math.min(28, Math.round(line1Score / 6));
  score -= (parsed.reviewReasons?.length || 0) * 6;
  return score;
};

const completeReadyResult = (result = {}) => {
  const parsed = result.parsed || {};
  const data = parsed.data || {};
  const checks = parsed.checks || {};
  return Boolean(
    result.success
    && parsed.ok
    && data.passportNo
    && data.nationality
    && data.birthDate
    && data.expiryDate
    && data.gender
    && data.latinLastName
    && data.latinFirstName
    && checks.passportNumberCheck?.valid
    && checks.birthDateCheck?.valid
    && checks.expiryDateCheck?.valid
    && checks.compositeCheck?.valid
    && !(parsed.reviewReasons || []).length
  );
};

const strictEarlySuccessResult = (result = {}, selectionScore = -1000) => {
  if (!completeReadyResult(result) || selectionScore < PASSPORT_EARLY_EXIT_SCORE) return false;
  const parsed = result.parsed || {};
  const data = parsed.data || {};
  const line1Diagnostics = parsed.engineResult?.diagnostics?.line1 || {};
  const line2Diagnostics = parsed.engineResult?.diagnostics?.line2 || {};
  const passportCorrection = line2Diagnostics.passportFieldCorrection || {};
  const passportSource = line2Diagnostics.passportNumberSelection?.source || "mrz_line2";
  const selectedLine2Source = line2Diagnostics.selectedSource || "";
  const rawLine1 = result.raw?.line1 || parsed.raw?.line1 || "";
  const rawLine2 = result.raw?.line2 || parsed.raw?.line2 || "";
  return Boolean(
    rawLine1.length === 44
    && rawLine2.length === 44
    && !data.birthDateApproximated
    && line1Diagnostics.exactSeparator
    && !(line1Diagnostics.removedNoise || []).length
    && !line1Diagnostics.leadingSeparatorNoiseRemoved
    && !line1Diagnostics.trailingGivenNameNoiseRemoved
    && !passportCorrection.corrected
    && ["mrz_line2", "mrz_line2_confirmed_by_visual"].includes(passportSource)
    && selectedLine2Source === "short_or_exact_window"
  );
};

const resultAgreementKey = (result = {}) => {
  const data = result.parsed?.data || result.data || {};
  return [
    data.passportNo,
    data.nationality,
    data.birthDate,
    data.expiryDate,
    data.gender,
    data.latinLastName,
    data.latinFirstName,
  ].map((value) => String(value || "").trim().toUpperCase()).join("|");
};

const findStrictEarlyConsensus = (records = []) => {
  const groups = new Map();
  records.forEach((record) => {
    if (!record?.strictEarlySuccess) return;
    const key = resultAgreementKey(record.result);
    if (!key || key.split("|").some((value) => !value)) return;
    const group = groups.get(key) || [];
    group.push(record);
    groups.set(key, group);
  });
  const confirmed = Array.from(groups.values())
    .filter((group) => group.length >= 2)
    .sort((a, b) => (
      Math.max(...b.map((item) => item.selectionScore))
      - Math.max(...a.map((item) => item.selectionScore))
    ))[0];
  if (!confirmed) return null;
  return confirmed.slice().sort((a, b) => b.selectionScore - a.selectionScore)[0];
};

const buildAutomaticOcrStages = (croppedMRZs = [], earlyExitEnabled = true) => {
  const byIndex = new Map(croppedMRZs.map((item, index) => [
    Number.isInteger(item.originalPassIndex) ? item.originalPassIndex : index,
    item,
  ]));
  if (!earlyExitEnabled) {
    return [{
      name: "full_fallback",
      items: croppedMRZs,
    }];
  }
  const used = new Set();
  const takeIndexes = (indexes) => indexes
    .map((index) => {
      const item = byIndex.get(index);
      if (item) used.add(index);
      return item;
    })
    .filter(Boolean);
  return [
    {
      name: "primary_full_mrz",
      items: takeIndexes(PRIMARY_FULL_PASS_INDEXES),
    },
    {
      name: "confirm_full_mrz",
      items: takeIndexes(CONFIRMATION_FULL_PASS_INDEXES),
    },
    {
      name: "full_fallback",
      items: croppedMRZs.filter((item, index) => (
        !used.has(Number.isInteger(item.originalPassIndex) ? item.originalPassIndex : index)
      )),
    },
  ].filter((stage) => stage.items.length);
};

const buildRecoveryAttemptDebug = ({ croppedMRZ = {}, result = {}, selectionScore = null } = {}) => ({
  variant: croppedMRZ?.variant || result.variant || "",
  cropType: croppedMRZ?.debug?.cropType || "full_mrz",
  cropDebug: result.cropDebug || croppedMRZ?.debug || null,
  rawOcrText: result.ocrText || "",
  normalizedOcrText: normalizeOcrText(result.ocrText || ""),
  detectedLine1: result.raw?.line1 || "",
  detectedLine2: result.raw?.line2 || "",
  selected44CharCandidate: result.parsed?.engineResult?.diagnostics?.line2?.selected44CharLine || "",
  score: selectionScore,
  reasons: result.parsed?.reviewReasons || (result.error ? [result.error] : []),
  accepted: Boolean(result.success),
  error: result.error || "",
  parser: {
    line1: result.parsed?.engineResult?.diagnostics?.line1 || null,
    line2: result.parsed?.engineResult?.diagnostics?.line2 || null,
    fields: result.parsed?.engineResult?.fields || result.parsed?.data || result.data || null,
    checks: result.parsed?.engineResult?.checks || result.parsed?.checks || null,
    reviewReasons: result.parsed?.engineResult?.reviewReasons || result.parsed?.reviewReasons || [],
  },
});

const selectAutomaticOcrResult = (croppedMRZs = [], recordsByPass = new Map()) => {
  let bestFailure = { success: false, error: "MRZ_NOT_FOUND", raw: { line1: "", line2: "" } };
  let bestSuccess = null;
  let bestLine2Crop = null;
  const recoveryAttempts = [];
  croppedMRZs.forEach((croppedMRZ, fallbackIndex) => {
    const originalPassIndex = Number.isInteger(croppedMRZ.originalPassIndex)
      ? croppedMRZ.originalPassIndex
      : fallbackIndex;
    const record = recordsByPass.get(originalPassIndex);
    if (!record) return;
    const { result, selectionScore } = record;
    recoveryAttempts.push(buildRecoveryAttemptDebug({ croppedMRZ, result, selectionScore }));
    if (
      croppedMRZ?.debug?.cropType === "line2"
      && result.parsed?.data
      && hasCompleteLine2Fields(result.parsed)
      && (!bestLine2Crop || Number(selectionScore || -1000) > Number(bestLine2Crop.selectionScore || -1000))
    ) {
      bestLine2Crop = { ...result, selectionScore };
    }
    if (result.success) {
      const scored = { ...result, selectionScore };
      if (!bestSuccess || selectionScore > bestSuccess.selectionScore) bestSuccess = scored;
      return;
    }
    if ((result.raw?.line1 || result.raw?.line2) && !(bestFailure.raw?.line1 || bestFailure.raw?.line2)) {
      bestFailure = result;
    } else if (result.error && bestFailure.error === "MRZ_NOT_FOUND") {
      bestFailure = result;
    }
  });
  return {
    bestFailure,
    bestSuccess,
    bestLine2Crop,
    recoveryAttempts,
  };
};

const getLine2Fields = (parsed = {}) => {
  const data = parsed?.data || {};
  return {
    passportNo: data.passportNo || "",
    nationality: data.nationality || "",
    birthDate: data.birthDate || "",
    birthDateRaw: data.birthDateRaw || "",
    birthDatePrecision: data.birthDatePrecision || "",
    birthYear: data.birthYear || null,
    birthDateApproximated: Boolean(data.birthDateApproximated),
    birthDateApproximationRule: data.birthDateApproximationRule || "",
    gender: data.gender || "",
    passportExpiry: data.expiryDate || data.passportExpiry || "",
  };
};

const hasUsableBirthDate = (fields = {}) => Boolean(
  fields.birthDate
  || (fields.birthDateRaw && ["year", "month"].includes(fields.birthDatePrecision))
);

const hasCompleteLine2Fields = (parsed = {}) => {
  const fields = getLine2Fields(parsed);
  return Boolean(fields.passportNo && fields.nationality && hasUsableBirthDate(fields) && fields.gender && fields.passportExpiry);
};

const mergeLine2CropResult = (baseResult, line2Result) => {
  if (!baseResult?.parsed?.data || !line2Result?.parsed?.data || !line2Result.raw?.line2) return baseResult;
  const line1 = baseResult.raw?.line1 || baseResult.parsed?.raw?.line1 || "";
  if (!line1) return baseResult;
  const parserLine2Used = line2Result.raw.line2;
  const combinedOcrText = [baseResult.ocrText, line2Result.ocrText].filter(Boolean).join("\n");
  const parsed = parseMRZDetailed(line1, parserLine2Used, {
    ocrText: combinedOcrText,
    source: "line2_crop_mrz",
  });
  if (!parsed.data || !hasCompleteLine2Fields(parsed)) return baseResult;

  const line2Diag = parsed.engineResult?.diagnostics?.line2 || {};
  const passportField = line2Diag.fixedPositions?.passportNumberField?.value || parserLine2Used.slice(0, 9);
  const passportCheck = line2Diag.fixedPositions?.passportNumberCheckDigit?.value || parserLine2Used[9] || "";
  const finalPassportNo = parsed.data.passportNo || "";
  if (process.env.NODE_ENV !== "production") {
    console.debug("[MRZ passport final trace]", {
      line2CropSelectedCandidate: parserLine2Used,
      fullMrzSelectedCandidate: baseResult.raw?.line2 || baseResult.parsed?.raw?.line2 || "",
      parserLine2Used,
      passportFieldSlice0_9: passportField,
      passportCheckDigit: passportCheck,
      passportNoBeforeRepair: passportField,
      passportNoAfterRepair: finalPassportNo,
      visualPassportCandidate: line2Diag.passportNumberSelection?.source?.includes("visual")
        ? line2Diag.passportNumberSelection?.value
        : "",
      finalPassportNo,
      finalPassportNoSource: "line2_crop_mrz",
      overwrittenBy: finalPassportNo !== (baseResult.data?.passportNo || baseResult.parsed?.data?.passportNo)
        ? "line2_crop_selected_candidate"
        : "",
      line2CropVariant: line2Result.variant || "",
      fullMrzVariant: baseResult.variant || "",
    });
  }

  return {
    ...baseResult,
    data: parsed.data,
    parsed,
    raw: { line1, line2: parserLine2Used },
    ocrText: combinedOcrText,
    variant: `${baseResult.variant || "full_mrz"}+${line2Result.variant || "line2_crop"}`,
    line2CropOverride: {
      variant: line2Result.variant || "",
      raw: line2Result.raw,
      previousLine2: baseResult.raw?.line2 || "",
      selectedLine2: parserLine2Used,
      finalPassportNo,
      source: "line2_crop_mrz",
    },
  };
};

/**
 * Runs Tesseract OCR on the expected bottom MRZ area of a passport image.
 * @param {File|Blob|string} imageFile - the image to process
 * @param {(pct: number) => void} [onProgress] - called with 0-100 during recognition
 * @returns {Promise<{success:boolean, data?:object, raw?:{line1:string,line2:string}, error?:string}>}
 */
export async function extractMRZFromImage(imageFile, onProgress, options = {}) {
  let worker = null;
  const externalWorker = options.worker || null;
  const perfContext = options.perfContext || {};
  const onStage = typeof options.onStage === "function" ? options.onStage : () => {};
  let recognitionStarted = false;
  const passportStartedAt = performanceNow();
  try {
    onStage({ phase: "preparing", progress: 0.02, completedPasses: 0, totalPasses: 45 });
    const preprocessingStartedAt = performanceNow();
    let croppedMRZs;
    try {
      croppedMRZs = await createMRZCropBlobs(imageFile);
      logPassportPerformance("image-preprocess", {
        ...perfContext,
        fileName: imageFile?.name || perfContext.fileName || "",
        durationMs: roundedDuration(preprocessingStartedAt),
        cropCount: DEFAULT_MRZ_CROPS.length,
        variantCount: croppedMRZs.length,
        status: "success",
      });
    } catch (error) {
      logPassportPerformance("image-preprocess", {
        ...perfContext,
        fileName: imageFile?.name || perfContext.fileName || "",
        durationMs: roundedDuration(preprocessingStartedAt),
        cropCount: DEFAULT_MRZ_CROPS.length,
        variantCount: 0,
        status: "error",
        error: error?.message || String(error),
      });
      throw error;
    }
    worker = externalWorker || await createPassportOCRWorker(onProgress, {
      ...perfContext,
      scope: perfContext.scope || "single-passport",
    });
    const earlyExitEnabled = passportEarlyExitEnabled();
    const stages = buildAutomaticOcrStages(croppedMRZs, earlyExitEnabled);
    const recordsByPass = new Map();
    const executionRecords = [];
    let executedPasses = 0;
    let firstCompleteValid = null;
    let earlyConsensus = null;
    let fullFallbackRequired = !earlyExitEnabled;

    for (const stage of stages) {
      const stageStartedAt = performanceNow();
      if (stage.name === "full_fallback") fullFallbackRequired = true;
      logPassportPerformance("stage-start", {
        ...perfContext,
        stage: stage.name,
        executedPasses,
        totalPasses: croppedMRZs.length,
        durationMs: roundedDuration(passportStartedAt),
      });
      for (const croppedMRZ of stage.items) {
        const originalPassIndex = Number.isInteger(croppedMRZ.originalPassIndex)
          ? croppedMRZ.originalPassIndex
          : croppedMRZs.indexOf(croppedMRZ);
        const confirming = executionRecords.some((record) => record.strictEarlySuccess);
        onStage({
          phase: confirming ? "confirming" : "reading",
          progress: 0.08 + (executedPasses / Math.max(croppedMRZs.length, 1)) * 0.84,
          completedPasses: executedPasses,
          totalPasses: croppedMRZs.length,
          stage: stage.name,
        });
        recognitionStarted = true;
        const result = await recognizeMRZBlob(worker, croppedMRZ, {
          ...perfContext,
          pass: originalPassIndex + 1,
          executionPass: executedPasses + 1,
          totalPasses: croppedMRZs.length,
          stage: stage.name,
        });
        onStage({
          phase: "validating",
          progress: 0.08 + ((executedPasses + 0.75) / Math.max(croppedMRZs.length, 1)) * 0.84,
          completedPasses: executedPasses,
          totalPasses: croppedMRZs.length,
          stage: stage.name,
        });
        const selectionScore = result.success
          ? scoreRecognizedMRZResult(result)
          : result.lineOnly && result.parsed?.data
            ? scoreRecognizedMRZResult({ ...result, success: true }) - 60
            : null;
        const record = {
          croppedMRZ,
          result,
          selectionScore,
          originalPassIndex,
          executionPass: executedPasses + 1,
          stage: stage.name,
          strictEarlySuccess: strictEarlySuccessResult(result, selectionScore),
        };
        recordsByPass.set(originalPassIndex, record);
        executionRecords.push(record);
        executedPasses += 1;

        if (!firstCompleteValid && completeReadyResult(result)) {
          firstCompleteValid = record;
          logPassportPerformance("first-complete-valid-result", {
            ...perfContext,
            stage: stage.name,
            pass: originalPassIndex + 1,
            executionPass: executedPasses,
            variant: croppedMRZ.variant || "",
            selectionScore,
            durationMs: roundedDuration(passportStartedAt),
          });
        }

        const consensus = earlyExitEnabled ? findStrictEarlyConsensus(executionRecords) : null;
        if (consensus) {
          const currentSelection = selectAutomaticOcrResult(croppedMRZs, recordsByPass);
          const selectedBest = currentSelection.bestSuccess;
          if (
            selectedBest
            && strictEarlySuccessResult(selectedBest, selectedBest.selectionScore)
            && resultAgreementKey(selectedBest) === resultAgreementKey(consensus.result)
          ) {
            earlyConsensus = consensus;
            onStage({
              phase: "confirming",
              progress: 0.96,
              completedPasses: executedPasses,
              totalPasses: croppedMRZs.length,
              stage: stage.name,
            });
            break;
          }
        }
      }
      logPassportPerformance("stage-complete", {
        ...perfContext,
        stage: stage.name,
        executedPasses,
        totalPasses: croppedMRZs.length,
        stageDurationMs: roundedDuration(stageStartedAt),
        totalDurationMs: roundedDuration(passportStartedAt),
        earlyExitReady: Boolean(earlyConsensus),
      });
      onStage({
        phase: "validating",
        progress: 0.08 + (executedPasses / Math.max(croppedMRZs.length, 1)) * 0.84,
        completedPasses: executedPasses,
        totalPasses: croppedMRZs.length,
        stage: stage.name,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (earlyConsensus) {
        onStage({
          phase: "confirming",
          progress: 0.96,
          completedPasses: executedPasses,
          totalPasses: croppedMRZs.length,
          stage: stage.name,
        });
      }
      if (earlyConsensus) break;
    }

    const {
      bestFailure,
      bestSuccess,
      bestLine2Crop,
      recoveryAttempts,
    } = selectAutomaticOcrResult(croppedMRZs, recordsByPass);
    const skippedPasses = Math.max(0, croppedMRZs.length - executedPasses);
    const earlyExit = Boolean(earlyConsensus && skippedPasses > 0);
    logPassportPerformance("ocr-summary", {
      ...perfContext,
      earlyExitEnabled,
      earlyExit,
      fullFallbackRequired,
      executedPasses,
      skippedPasses,
      totalPasses: croppedMRZs.length,
      firstCompleteValidPass: firstCompleteValid ? firstCompleteValid.originalPassIndex + 1 : null,
      firstCompleteValidExecutionPass: firstCompleteValid?.executionPass || null,
      confirmingPasses: earlyConsensus
        ? executionRecords
            .filter((record) => resultAgreementKey(record.result) === resultAgreementKey(earlyConsensus.result))
            .map((record) => record.originalPassIndex + 1)
        : [],
      durationMs: roundedDuration(passportStartedAt),
    });
    onStage({
      phase: "confirming",
      progress: 0.98,
      completedPasses: executedPasses,
      totalPasses: croppedMRZs.length,
      earlyExit,
    });

    if (bestSuccess) {
      const selectedSuccess = bestLine2Crop ? mergeLine2CropResult(bestSuccess, bestLine2Crop) : bestSuccess;
      const debug = {
        mode: "automatic",
        attempts: recoveryAttempts,
        variant: selectedSuccess.variant,
        selectionScore: selectedSuccess.selectionScore,
        raw: selectedSuccess.raw,
        fields: selectedSuccess.parsed?.data,
        checks: selectedSuccess.parsed?.checks,
        reviewReasons: selectedSuccess.parsed?.reviewReasons,
        line2CropOverride: selectedSuccess.line2CropOverride || null,
        earlyExit,
        fullFallbackRequired,
        executedPasses,
        skippedPasses,
      };
      logMRZRecoveryDecision(debug);
      return { ...selectedSuccess, debug };
    }
    const debug = {
      mode: "automatic",
      attempts: recoveryAttempts,
      selected: null,
      safeModeClearedFields: true,
      reason: bestFailure.error || "MRZ_NOT_FOUND",
      earlyExit,
      fullFallbackRequired,
      executedPasses,
      skippedPasses,
    };
    logMRZRecoveryDecision(debug);
    return { ...bestFailure, debug };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      workerShouldReset: Boolean(externalWorker && recognitionStarted),
    };
  } finally {
    if (worker && !externalWorker) {
      await terminatePassportOCRWorker(worker, {
        ...perfContext,
        scope: perfContext.scope || "single-passport",
        reason: "passport-complete",
      });
    }
  }
}

export async function extractMRZFromImageRegion(imageFile, crop, onProgress, options = {}) {
  let worker = null;
  const perfContext = options.perfContext || {};
  try {
    const preprocessingStartedAt = performanceNow();
    let croppedMRZs;
    try {
      croppedMRZs = await createImageCropVariants(imageFile, crop);
      logPassportPerformance("image-preprocess", {
        ...perfContext,
        scope: perfContext.scope || "manual-crop",
        fileName: imageFile?.name || perfContext.fileName || "",
        durationMs: roundedDuration(preprocessingStartedAt),
        cropCount: 1,
        variantCount: croppedMRZs.length,
        status: "success",
      });
    } catch (error) {
      logPassportPerformance("image-preprocess", {
        ...perfContext,
        scope: perfContext.scope || "manual-crop",
        fileName: imageFile?.name || perfContext.fileName || "",
        durationMs: roundedDuration(preprocessingStartedAt),
        cropCount: 1,
        variantCount: 0,
        status: "error",
        error: error?.message || String(error),
      });
      throw error;
    }
    worker = await createPassportOCRWorker(onProgress, {
      ...perfContext,
      scope: perfContext.scope || "manual-crop",
    });
    let bestFailure = { success: false, error: "MRZ_NOT_FOUND", raw: { line1: "", line2: "" } };
    let bestSuccess = null;
    let bestLine2Crop = null;
    const recoveryAttempts = [];
    for (let passIndex = 0; passIndex < croppedMRZs.length; passIndex += 1) {
      const croppedMRZ = croppedMRZs[passIndex];
      let result;
      try {
        result = await recognizeMRZBlob(worker, croppedMRZ, {
          ...perfContext,
          scope: perfContext.scope || "manual-crop",
          pass: passIndex + 1,
          totalPasses: croppedMRZs.length,
        });
      } catch (error) {
        result = { success: false, error: error.message };
        await terminatePassportOCRWorker(worker, {
          ...perfContext,
          scope: perfContext.scope || "manual-crop",
          reason: "manual-crop-pass-error",
          pass: passIndex + 1,
        });
        worker = passIndex + 1 < croppedMRZs.length
          ? await createPassportOCRWorker(onProgress, {
              ...perfContext,
              scope: perfContext.scope || "manual-crop",
              reason: "manual-crop-pass-error-recovery",
            })
          : null;
      }
      const selectionScore = result.success
        ? scoreRecognizedMRZResult(result)
        : result.lineOnly && result.parsed?.data
          ? scoreRecognizedMRZResult({ ...result, success: true }) - 60
          : null;
      recoveryAttempts.push(buildRecoveryAttemptDebug({ croppedMRZ, result, selectionScore }));
      if (
        croppedMRZ?.debug?.cropType === "line2"
        && result.parsed?.data
        && hasCompleteLine2Fields(result.parsed)
        && (!bestLine2Crop || Number(selectionScore || -1000) > Number(bestLine2Crop.selectionScore || -1000))
      ) {
        bestLine2Crop = { ...result, selectionScore };
      }
      if (result.success) {
        const score = selectionScore;
        const scored = { ...result, selectionScore: score };
        if (!bestSuccess || score > bestSuccess.selectionScore) bestSuccess = scored;
        continue;
      }
      if ((result.raw?.line1 || result.raw?.line2) && !(bestFailure.raw?.line1 || bestFailure.raw?.line2)) {
        bestFailure = result;
      } else if (result.error && bestFailure.error === "MRZ_NOT_FOUND") {
        bestFailure = result;
      }
    }
    if (bestSuccess) {
      const selectedSuccess = bestLine2Crop ? mergeLine2CropResult(bestSuccess, bestLine2Crop) : bestSuccess;
      const debug = {
        mode: "manual_crop",
        attempts: recoveryAttempts,
        variant: selectedSuccess.variant,
        selectionScore: selectedSuccess.selectionScore,
        raw: selectedSuccess.raw,
        fields: selectedSuccess.parsed?.data,
        checks: selectedSuccess.parsed?.checks,
        reviewReasons: selectedSuccess.parsed?.reviewReasons,
        line2CropOverride: selectedSuccess.line2CropOverride || null,
      };
      logMRZRecoveryDecision(debug);
      return { ...selectedSuccess, debug };
    }
    const debug = {
      mode: "manual_crop",
      attempts: recoveryAttempts,
      selected: null,
      safeModeClearedFields: true,
      reason: bestFailure.error || "MRZ_NOT_FOUND",
    };
    logMRZRecoveryDecision(debug);
    return { ...bestFailure, debug };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    if (worker) {
      await terminatePassportOCRWorker(worker, {
        ...perfContext,
        scope: perfContext.scope || "manual-crop",
        reason: "manual-crop-complete",
      });
    }
  }
}
