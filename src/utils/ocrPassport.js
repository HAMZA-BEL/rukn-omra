import { createWorker } from "tesseract.js";
import { parseMRZ } from "./mrzReader";

/**
 * Runs Tesseract OCR on a passport image and extracts the MRZ.
 * @param {File|Blob|string} imageFile - the image to process
 * @param {(pct: number) => void} [onProgress] - called with 0-100 during recognition
 * @returns {Promise<{success:boolean, data?:object, raw?:{line1:string,line2:string}, error?:string}>}
 */
export async function extractMRZFromImage(imageFile, onProgress) {
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (onProgress && m.status === "recognizing text") {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  try {
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
      tessedit_pageseg_mode: "6",
    });

    const { data: { text } } = await worker.recognize(imageFile);
    await worker.terminate();

    const lines = text
      .split("\n")
      .map((l) => l.trim().replace(/[^A-Z0-9<]/g, ""))
      .filter((l) => l.length >= 30);

    const line1Idx = lines.findIndex((l) => l.startsWith("P"));
    if (line1Idx === -1 || !lines[line1Idx + 1]) {
      return { success: false, error: "MRZ_NOT_FOUND" };
    }

    const line1 = lines[line1Idx].padEnd(44, "<").slice(0, 44);
    const line2 = lines[line1Idx + 1].padEnd(44, "<").slice(0, 44);

    const parsed = parseMRZ(line1, line2);
    if (!parsed) {
      return { success: false, error: "PARSE_FAILED", raw: { line1, line2 } };
    }

    return { success: true, data: parsed, raw: { line1, line2 } };
  } catch (err) {
    await worker.terminate().catch(() => {});
    return { success: false, error: err.message };
  }
}
