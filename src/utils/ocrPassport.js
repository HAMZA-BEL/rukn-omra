import { createWorker } from "tesseract.js";
import { parseMRZDetailed } from "./mrzReader";
import { detectMrzCandidateLines, normalizeOcrText, scoreTd3Line1Candidate } from "./passportMrzEngine";

const MRZ_DEBUG = process.env.NODE_ENV !== "production";
const DEFAULT_MRZ_CROPS = [
  { x: 0, y: 72, width: 100, height: 28 },
  { x: 0, y: 65, width: 100, height: 35 },
  { x: 0, y: 55, width: 100, height: 45 },
];

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
  if (!MRZ_DEBUG) return {};
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
  return groups.flat();
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

const recognizeMRZBlob = async (worker, croppedMRZ) => {
  const blob = croppedMRZ?.blob || croppedMRZ;
  logMRZDebug("ocr:start", { variant: croppedMRZ?.variant, debug: croppedMRZ?.debug });
  if (croppedMRZ?.debug?.cropType === "line1" || croppedMRZ?.debug?.cropType === "line2") {
    await worker.setParameters({ tessedit_pageseg_mode: "7" });
  } else {
    await worker.setParameters({ tessedit_pageseg_mode: "6" });
  }
  const recognition = worker.recognize(blob);
  const { data: { text } } = await Promise.race([
    recognition,
    new Promise((_, reject) => setTimeout(() => reject(new Error("OCR_TIMEOUT")), 18000)),
  ]);
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

const runMRZOCR = async (croppedMRZ, onProgress) => {
  let worker = null;

  try {
    worker = await createMRZWorker(onProgress);
    await configureMRZWorker(worker);
    return await recognizeMRZBlob(worker, croppedMRZ);
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    if (worker) await worker.terminate().catch(() => {});
  }
};

/**
 * Runs Tesseract OCR on the expected bottom MRZ area of a passport image.
 * @param {File|Blob|string} imageFile - the image to process
 * @param {(pct: number) => void} [onProgress] - called with 0-100 during recognition
 * @returns {Promise<{success:boolean, data?:object, raw?:{line1:string,line2:string}, error?:string}>}
 */
export async function extractMRZFromImage(imageFile, onProgress) {
  let worker = null;
  try {
    const croppedMRZs = await createMRZCropBlobs(imageFile);
    worker = await createMRZWorker(onProgress);
    await configureMRZWorker(worker);
    let bestFailure = { success: false, error: "MRZ_NOT_FOUND", raw: { line1: "", line2: "" } };
    let bestSuccess = null;
    let bestLine2Crop = null;
    const recoveryAttempts = [];
    for (const croppedMRZ of croppedMRZs) {
      const result = await recognizeMRZBlob(worker, croppedMRZ);
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
        mode: "automatic",
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
      mode: "automatic",
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
    if (worker) await worker.terminate().catch(() => {});
  }
}

export async function extractMRZFromImageRegion(imageFile, crop, onProgress) {
  try {
    const croppedMRZs = await createImageCropVariants(imageFile, crop);
    let bestFailure = { success: false, error: "MRZ_NOT_FOUND", raw: { line1: "", line2: "" } };
    let bestSuccess = null;
    let bestLine2Crop = null;
    const recoveryAttempts = [];
    for (const croppedMRZ of croppedMRZs) {
      const result = await runMRZOCR(croppedMRZ, onProgress);
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
  }
}
