import { createWorker } from "tesseract.js";
import { parseMRZDetailed } from "./mrzReader";

const cleanOCRLine = (value = "") => String(value).toUpperCase().replace(/[^A-Z0-9<]/g, "");

const createImageCropBlob = (imageFile, crop = { x: 0, y: 66, width: 100, height: 34 }) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(imageFile);
  const img = new Image();
  img.onload = () => {
    try {
      const sourceX = Math.max(0, Math.min(img.naturalWidth - 1, Math.floor((crop.x / 100) * img.naturalWidth)));
      const sourceY = Math.max(0, Math.min(img.naturalHeight - 1, Math.floor((crop.y / 100) * img.naturalHeight)));
      const sourceWidth = Math.max(1, Math.min(img.naturalWidth - sourceX, Math.floor((crop.width / 100) * img.naturalWidth)));
      const sourceHeight = Math.max(1, Math.min(img.naturalHeight - sourceY, Math.floor((crop.height / 100) * img.naturalHeight)));
      const maxWidth = 1700;
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

const createMRZCropBlob = (imageFile) => createImageCropBlob(imageFile);

const extractStrictMRZLines = (text = "") => {
  const lines = text
    .split(/\n/)
    .map(cleanOCRLine)
    .filter((line) => line.length === 44 && /^[A-Z0-9<]{44}$/.test(line));
  const line1Idx = lines.findIndex((line) => line.startsWith("P<"));
  if (line1Idx < 0 || !lines[line1Idx + 1]) return null;
  return { line1: lines[line1Idx], line2: lines[line1Idx + 1] };
};

const extractCandidateMRZLines = (text = "") => {
  const lines = text
    .split(/\n/)
    .map(cleanOCRLine)
    .filter((line) => line.length >= 15);
  const passportIdx = lines.findIndex((line) => line.startsWith("P"));
  if (passportIdx >= 0) {
    return {
      line1: lines[passportIdx] || "",
      line2: lines[passportIdx + 1] || "",
    };
  }
  const ranked = lines.slice().sort((a, b) => b.length - a.length);
  return {
    line1: ranked[0] || "",
    line2: ranked[1] || "",
  };
};

const runMRZOCR = async (croppedMRZ, onProgress) => {
  let worker = null;

  try {
    worker = await createWorker("eng", 1, {
      logger: (m) => {
        if (onProgress && m.status === "recognizing text") {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });

    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
      tessedit_pageseg_mode: "6",
    });

    const recognition = worker.recognize(croppedMRZ);
    const { data: { text } } = await Promise.race([
      recognition,
      new Promise((_, reject) => setTimeout(() => reject(new Error("OCR_TIMEOUT")), 18000)),
    ]);

    const lines = extractStrictMRZLines(text);
    if (!lines) {
      return { success: false, error: "MRZ_NOT_FOUND", raw: extractCandidateMRZLines(text) };
    }

    const parsed = parseMRZDetailed(lines.line1, lines.line2);
    if (!parsed.ok || !parsed.data) {
      return { success: false, error: "PARSE_FAILED", raw: lines };
    }

    return { success: true, data: parsed.data, raw: lines };
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
  try {
    const croppedMRZ = await createMRZCropBlob(imageFile);
    return await runMRZOCR(croppedMRZ, onProgress);
  } catch (err) {
    return { success: false, error: err.message };
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
