import { createWorker } from "tesseract.js";
import { parseMRZDetailed } from "./mrzReader";

const MRZ_DEBUG = process.env.NODE_ENV !== "production";
const cleanOCRLine = (value = "") => String(value).toUpperCase().replace(/[^A-Z0-9<]/g, "");
const MRZ_ALLOWED = /^[A-Z0-9<]{44}$/;
const NUMERIC_OCR_FIXES = {
  O: "0",
  Q: "0",
  D: "0",
  I: "1",
  L: "1",
  Z: "2",
  S: "5",
  G: "6",
  B: "8",
};
const DEFAULT_MRZ_CROPS = [
  { x: 0, y: 72, width: 100, height: 28 },
  { x: 0, y: 65, width: 100, height: 35 },
  { x: 0, y: 55, width: 100, height: 45 },
];

const logMRZDebug = (label, payload) => {
  if (MRZ_DEBUG) console.debug(`[MRZ] ${label}`, payload);
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
  const x = (Number(selection.x) || 0) * naturalWidth / displayedWidth;
  const y = (Number(selection.y) || 0) * naturalHeight / displayedHeight;
  const width = (Number(selection.width) || 0) * naturalWidth / displayedWidth;
  const height = (Number(selection.height) || 0) * naturalHeight / displayedHeight;
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

      Promise.all([
        canvasToBlob(processedCanvas),
        canvasToBlob(rawCanvas),
      ]).then(([processedBlob, rawBlob]) => {
        URL.revokeObjectURL(url);
        resolve([
          { blob: processedBlob, variant: "processed", debug: { source, canvas: { width: canvasWidth, height: canvasHeight }, information } },
          { blob: rawBlob, variant: "raw", debug: { source, canvas: { width: canvasWidth, height: canvasHeight }, information } },
        ]);
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

const candidateScore = (line = "", isLine1 = false) => {
  if (!MRZ_ALLOWED.test(line)) return -100;
  let score = 0;
  if (isLine1 && line.startsWith("P<")) score += 60;
  if (!isLine1 && /^[A-Z0-9<]{9}[0-9<][A-Z<]{3}\d{6}[0-9<][MF<]\d{6}/.test(line)) score += 60;
  score += Math.min(20, (line.match(/</g) || []).length);
  if (/\d{6}/.test(line)) score += 8;
  return score;
};

const fixNumericChar = (char) => NUMERIC_OCR_FIXES[char] || char;

const repairLine1 = (value = "") => {
  let line = cleanOCRLine(value);
  if (line.length < 2) return line;
  if (line[0] !== "P" && ["F", "R"].includes(line[0])) line = `P${line.slice(1)}`;
  if (line[0] === "P" && ["<", "L", "I", "1"].includes(line[1])) {
    line = `P<${line.slice(2)}`;
  }
  if (line.length < 5) return line;

  let nameField = line.slice(5);
  nameField = nameField.replace(/[I1]{2,}/g, (match) => "<".repeat(match.length));
  if (!nameField.includes("<<")) {
    nameField = nameField.replace(/([A-Z]{2,})([<I1]{2,}|L{2,})([A-Z]{2,})/, (_, surname, sep, given) => `${surname}${"<".repeat(Math.max(2, sep.length))}${given}`);
  }
  const separatorIndex = nameField.indexOf("<<");
  if (separatorIndex >= 0) {
    const before = nameField.slice(0, separatorIndex);
    let after = nameField.slice(separatorIndex);
    after = after.replace(/[<LI1]{3,}$/g, (match) => "<".repeat(match.length));
    after = after.replace(/([A-Z])([LI1]{3,})$/g, (_, char, filler) => `${char}${"<".repeat(filler.length)}`);
    nameField = `${before}${after}`;
  }

  return `${line.slice(0, 5)}${nameField}`.padEnd(44, "<").slice(0, 44);
};

const repairLine2 = (value = "") => {
  const chars = cleanOCRLine(value).padEnd(44, "<").slice(0, 44).split("");
  [9, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26, 27].forEach((index) => {
    chars[index] = fixNumericChar(chars[index]);
  });
  if (chars[20] === "1" || chars[20] === "I" || chars[20] === "L") chars[20] = "<";
  return chars.join("");
};

const lineWindows = (value = "") => {
  const clean = cleanOCRLine(value);
  if (clean.length < 44) return clean ? [clean] : [];
  if (clean.length === 44) return [clean];
  const windows = [];
  for (let i = 0; i <= clean.length - 44; i += 1) {
    windows.push(clean.slice(i, i + 44));
  }
  return windows;
};

const unique = (items) => Array.from(new Set(items.filter(Boolean)));

export const normalizeMRZOCRText = (text = "") => String(text || "")
  .toUpperCase()
  .split(/\n/)
  .map((line) => line.replace(/[^A-Z0-9<]/g, ""))
  .filter(Boolean);

export const extractMRZCandidate = (text = "") => {
  const cleanedLines = text
    .split(/\n/)
    .map(cleanOCRLine)
    .filter((line) => line.length >= 8);
  const compact = cleanOCRLine(cleanedLines.join(""));
  const line1Candidates = [];
  const line2Candidates = [];
  const rawCandidates = [];
  let bestParsedWithIssues = null;

  logMRZDebug("ocr:normalized-lines", {
    lines: cleanedLines,
    compactLength: compact.length,
  });

  cleanedLines.forEach((line, index) => {
    lineWindows(line).forEach((candidate) => {
      const repairedLine1 = repairLine1(candidate);
      const repairedLine2 = repairLine2(candidate);
      rawCandidates.push(candidate, repairedLine1, repairedLine2);
      if (repairedLine1.startsWith("P<") && MRZ_ALLOWED.test(repairedLine1)) {
        line1Candidates.push({ line: repairedLine1, index, score: candidateScore(repairedLine1, true) });
      }
      if (MRZ_ALLOWED.test(repairedLine2)) {
        line2Candidates.push({ line: repairedLine2, index, score: candidateScore(repairedLine2, false) });
      }
    });
  });

  for (let start = compact.indexOf("P<"); start >= 0; start = compact.indexOf("P<", start + 1)) {
    const line1 = repairLine1(compact.slice(start, start + 44));
    const line2 = repairLine2(compact.slice(start + 44, start + 88));
    if (line1.length === 44) line1Candidates.push({ line: line1, index: -1, score: candidateScore(line1, true) + 8 });
    if (line2.length === 44) line2Candidates.push({ line: line2, index: -1, score: candidateScore(line2, false) + 8 });
  }

  for (let start = compact.indexOf("P"); start >= 0; start = compact.indexOf("P", start + 1)) {
    const line1 = repairLine1(compact.slice(start, start + 44));
    const line2 = repairLine2(compact.slice(start + 44, start + 88));
    if (line1.startsWith("P<") && line1.length === 44) line1Candidates.push({ line: line1, index: -1, score: candidateScore(line1, true) + 4 });
    if (line2.length === 44) line2Candidates.push({ line: line2, index: -1, score: candidateScore(line2, false) + 4 });
  }

  const orderedLine1 = unique(line1Candidates.map((item) => item.line))
    .map((line) => line1Candidates.find((item) => item.line === line))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  const orderedLine2 = unique(line2Candidates.map((item) => item.line))
    .map((line) => line2Candidates.find((item) => item.line === line))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  for (const first of orderedLine1) {
    const nearby = orderedLine2
      .slice()
      .sort((a, b) => {
        const aDistance = first.index >= 0 && a.index >= 0 ? Math.abs(a.index - first.index - 1) : 0;
        const bDistance = first.index >= 0 && b.index >= 0 ? Math.abs(b.index - first.index - 1) : 0;
        return aDistance - bDistance || b.score - a.score;
    });
    for (const second of nearby) {
      const parsed = parseMRZDetailed(first.line, second.line);
      if (parsed.ok && parsed.data) {
        return { ok: true, lines: { line1: first.line, line2: second.line }, parsed };
      }
      if (parsed.data) {
        const score = first.score + second.score - (parsed.issues?.length || 0) * 8;
        if (!bestParsedWithIssues || score > bestParsedWithIssues.score) {
          bestParsedWithIssues = {
            score,
            lines: { line1: first.line, line2: second.line },
            parsed,
          };
        }
      }
    }
  }

  if (bestParsedWithIssues?.parsed?.data) {
    logMRZDebug("parser:accepted-with-warnings", {
      issues: bestParsedWithIssues.parsed.issues,
      raw: bestParsedWithIssues.lines,
    });
    return {
      ok: true,
      lines: bestParsedWithIssues.lines,
      parsed: bestParsedWithIssues.parsed,
    };
  }

  const bestLine1 = orderedLine1[0]?.line || rawCandidates.find((line) => line.startsWith("P")) || "";
  const bestLine2 = orderedLine2[0]?.line || rawCandidates.find((line) => line !== bestLine1 && line.length >= 30) || "";
  let reason = "MRZ_LINE1_NOT_FOUND";
  if (bestLine1 && !bestLine2) reason = "MRZ_LINE2_NOT_FOUND";
  if (bestLine1 && bestLine2 && (bestLine1.length !== 44 || bestLine2.length !== 44)) reason = "MRZ_LENGTH";
  if (bestLine1 && bestLine2 && bestLine1.length === 44 && bestLine2.length === 44) reason = "PARSE_FAILED";

  return {
    ok: false,
    error: reason,
    raw: {
      line1: bestLine1,
      line2: bestLine2,
    },
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
  const recognition = worker.recognize(blob);
  const { data: { text } } = await Promise.race([
    recognition,
    new Promise((_, reject) => setTimeout(() => reject(new Error("OCR_TIMEOUT")), 18000)),
  ]);
  logMRZDebug("ocr:raw-text", {
    variant: croppedMRZ?.variant,
    text,
  });
  if (!String(text || "").trim()) return { success: false, error: "OCR_NO_TEXT", raw: { line1: "", line2: "" }, ocrText: text || "" };
  const candidate = extractMRZCandidate(text);
  if (!candidate.ok) return { success: false, error: candidate.error || "MRZ_NOT_FOUND", raw: candidate.raw, ocrText: text || "" };
  return { success: true, data: candidate.parsed.data, raw: candidate.lines, issues: candidate.parsed.issues || [], ocrText: text || "" };
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
    for (const croppedMRZ of croppedMRZs) {
      const result = await recognizeMRZBlob(worker, croppedMRZ);
      if (result.success) return result;
      if ((result.raw?.line1 || result.raw?.line2) && !(bestFailure.raw?.line1 || bestFailure.raw?.line2)) {
        bestFailure = result;
      } else if (result.error && bestFailure.error === "MRZ_NOT_FOUND") {
        bestFailure = result;
      }
    }
    return bestFailure;
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
    for (const croppedMRZ of croppedMRZs) {
      const result = await runMRZOCR(croppedMRZ, onProgress);
      if (result.success) return result;
      if ((result.raw?.line1 || result.raw?.line2) && !(bestFailure.raw?.line1 || bestFailure.raw?.line2)) {
        bestFailure = result;
      } else if (result.error && bestFailure.error === "MRZ_NOT_FOUND") {
        bestFailure = result;
      }
    }
    return bestFailure;
  } catch (err) {
    return { success: false, error: err.message };
  }
}
