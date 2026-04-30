import { createWorker } from "tesseract.js";
import { parseMRZDetailed } from "./mrzReader";

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

const createImageCropBlob = (imageFile, crop = { x: 0, y: 66, width: 100, height: 34 }) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(imageFile);
  const img = new Image();
  img.onload = () => {
    try {
      const margin = crop.margin ?? 1.2;
      const cropX = Math.max(0, crop.x - margin);
      const cropY = Math.max(0, crop.y - margin);
      const cropWidth = Math.min(100 - cropX, crop.width + margin * 2);
      const cropHeight = Math.min(100 - cropY, crop.height + margin * 2);
      const sourceX = Math.max(0, Math.min(img.naturalWidth - 1, Math.floor((cropX / 100) * img.naturalWidth)));
      const sourceY = Math.max(0, Math.min(img.naturalHeight - 1, Math.floor((cropY / 100) * img.naturalHeight)));
      const sourceWidth = Math.max(1, Math.min(img.naturalWidth - sourceX, Math.floor((cropWidth / 100) * img.naturalWidth)));
      const sourceHeight = Math.max(1, Math.min(img.naturalHeight - sourceY, Math.floor((cropHeight / 100) * img.naturalHeight)));
      const maxWidth = 2200;
      const scale = Math.min(1, maxWidth / sourceWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      const ctx = canvas.getContext("2d", { willReadFrequently: false });
      ctx.filter = "grayscale(100%) contrast(180%) brightness(120%)";
      ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) resolve(blob);
        else reject(new Error("CROP_FAILED"));
      }, "image/png", 0.92);
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

const createMRZCropBlobs = (imageFile) => Promise.all(DEFAULT_MRZ_CROPS.map((crop) => createImageCropBlob(imageFile, crop)));

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
  nameField = nameField.replace(/[<LI1]{4,}/g, (match) => "<".repeat(match.length));
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

const extractMRZCandidate = (text = "") => {
  const cleanedLines = text
    .split(/\n/)
    .map(cleanOCRLine)
    .filter((line) => line.length >= 8);
  const compact = cleanOCRLine(cleanedLines.join(""));
  const line1Candidates = [];
  const line2Candidates = [];
  const rawCandidates = [];

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
    }
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

const createMRZWorker = (onProgress) => createWorker("eng", 1, {
  logger: (m) => {
    if (onProgress && m.status === "recognizing text") {
      onProgress(Math.round(m.progress * 100));
    }
  },
});

const configureMRZWorker = async (worker) => {
  await worker.setParameters({
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
    tessedit_pageseg_mode: "6",
  });
};

const recognizeMRZBlob = async (worker, croppedMRZ) => {
  const recognition = worker.recognize(croppedMRZ);
  const { data: { text } } = await Promise.race([
    recognition,
    new Promise((_, reject) => setTimeout(() => reject(new Error("OCR_TIMEOUT")), 18000)),
  ]);
  if (!String(text || "").trim()) return { success: false, error: "OCR_NO_TEXT", raw: { line1: "", line2: "" } };
  const candidate = extractMRZCandidate(text);
  if (!candidate.ok) return { success: false, error: candidate.error || "MRZ_NOT_FOUND", raw: candidate.raw };
  return { success: true, data: candidate.parsed.data, raw: candidate.lines };
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
    const croppedMRZ = await createImageCropBlob(imageFile, crop);
    return await runMRZOCR(croppedMRZ, onProgress);
  } catch (err) {
    return { success: false, error: err.message };
  }
}
