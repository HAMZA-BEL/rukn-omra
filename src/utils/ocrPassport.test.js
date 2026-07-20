import { createWorker } from "tesseract.js";
import {
  PASSPORT_OCR_LIMITS,
  buildMrzCropPlan,
  convertDisplayedCropToNaturalRect,
  createPassportOCRWorker,
  dedupePassportFiles,
  detectMrzLineBandsFromProjection,
  extractMRZFromImage,
  extractMRZFromImageRegion,
  normalizeTd3OcrLine,
  runDirectedMrzRecognition,
  terminatePassportOCRWorker,
} from "./ocrPassport";
import { SYNTHETIC_TD3 } from "./__fixtures__/syntheticTd3";

jest.mock("tesseract.js", () => ({ createWorker: jest.fn() }));

const replaceAt = (value, index, replacement) => `${value.slice(0, index)}${replacement}${value.slice(index + 1)}`;

const lineAttempt = (name) => ({
  kind: "lines",
  variant: name,
  line1: { blob: `${name}-line1`, cropType: "line1", variant: `${name}-line1` },
  line2: { blob: `${name}-line2`, cropType: "line2", variant: `${name}-line2` },
});

const attempts = [lineAttempt("light"), lineAttempt("threshold"), lineAttempt("wide")];
let createAttempt;
let worker;

describe("directed passport OCR", () => {
  let debugSpy;
  let infoSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
    infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    createAttempt = jest.fn(async (index) => attempts[index] || null);
    worker = { setParameters: jest.fn() };
  });

  afterEach(() => {
    debugSpy.mockRestore();
    infoSpy.mockRestore();
  });

  test("stops after the first valid two-line TD3 result", async () => {
    const recognize = jest.fn(async (_, item) => (
      item.cropType === "line1" ? SYNTHETIC_TD3.line1 : SYNTHETIC_TD3.line2
    ));

    const result = await runDirectedMrzRecognition({ worker, createAttempt, recognize });

    expect(result.success).toBe(true);
    expect(result.debug.recognitionCount).toBe(PASSPORT_OCR_LIMITS.bestCaseRecognitions);
    expect(recognize).toHaveBeenCalledTimes(2);
    expect(createAttempt).toHaveBeenCalledTimes(1);
    expect(recognize.mock.calls.map(([, item]) => item.cropType)).toEqual(["line1", "line2"]);
  });

  test("does not run later processing after the first valid recovery", async () => {
    const recognize = jest.fn(async (_, item) => {
      if (item.variant.startsWith("light")) return "INVALID";
      return item.cropType === "line1" ? SYNTHETIC_TD3.line1 : SYNTHETIC_TD3.line2;
    });

    const result = await runDirectedMrzRecognition({ worker, createAttempt, recognize });

    expect(result.success).toBe(true);
    expect(result.debug.recognitionCount).toBe(4);
    expect(createAttempt).toHaveBeenCalledTimes(2);
    expect(recognize).toHaveBeenCalledTimes(4);
  });

  test("never exceeds five directed recognitions", async () => {
    const recognize = jest.fn(async () => "INVALID");

    const result = await runDirectedMrzRecognition({ worker, createAttempt, recognize });

    expect(result.success).toBe(false);
    expect(result.debug.recognitionCount).toBe(PASSPORT_OCR_LIMITS.worstCaseRecognitions);
    expect(recognize).toHaveBeenCalledTimes(5);
    expect(recognize.mock.calls.every(([, item]) => ["line1", "line2"].includes(item.cropType))).toBe(true);
    expect(recognize.mock.calls.some(([, item]) => item.cropType === "full_mrz")).toBe(false);
  });

  test("ignores a valid result if the batch was cancelled while OCR was running", async () => {
    let cancelled = false;
    const recognize = jest.fn(async (_, item) => {
      if (item.cropType === "line2") cancelled = true;
      return item.cropType === "line1" ? SYNTHETIC_TD3.line1 : SYNTHETIC_TD3.line2;
    });

    const result = await runDirectedMrzRecognition({
      worker,
      createAttempt,
      recognize,
      isCancelled: () => cancelled,
    });

    expect(result.success).toBe(false);
    expect(result.cancelled).toBe(true);
    expect(result.error).toBe("OCR_CANCELLED");
  });

  test("reuses one initialized worker for sequential passports", async () => {
    const sharedWorker = {
      setParameters: jest.fn().mockResolvedValue(undefined),
      recognize: jest.fn().mockResolvedValue({ data: { text: "" } }),
      terminate: jest.fn().mockResolvedValue(undefined),
    };
    createWorker.mockResolvedValue(sharedWorker);
    const initialized = await createPassportOCRWorker();
    const recognize = jest.fn(async (_, item) => (
      item.cropType === "line1" ? SYNTHETIC_TD3.line1 : SYNTHETIC_TD3.line2
    ));

    await runDirectedMrzRecognition({ worker: initialized, createAttempt, recognize });
    await runDirectedMrzRecognition({ worker: initialized, createAttempt, recognize });

    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(sharedWorker.setParameters).toHaveBeenCalledTimes(1);
    expect(sharedWorker.setParameters).toHaveBeenCalledWith(expect.objectContaining({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
      tessedit_pageseg_mode: "7",
      load_system_dawg: "0",
      load_freq_dawg: "0",
    }));
    expect(recognize).toHaveBeenCalledTimes(4);
    expect(sharedWorker.terminate).not.toHaveBeenCalled();
    await terminatePassportOCRWorker(sharedWorker);
    expect(sharedWorker.terminate).toHaveBeenCalledTimes(1);
  });

  test("deduplicates the same selected image without touching distinct files", () => {
    const first = new File(["one"], "passport.jpg", { type: "image/jpeg", lastModified: 10 });
    const duplicate = new File(["one"], "passport.jpg", { type: "image/jpeg", lastModified: 10 });
    const second = new File(["two"], "passport-2.jpg", { type: "image/jpeg", lastModified: 11 });

    expect(dedupePassportFiles([first, duplicate, second])).toEqual([first, second]);
  });

  test("maps a displayed crop through object-fit space to natural image pixels", () => {
    expect(convertDisplayedCropToNaturalRect({
      selection: { x: 100, y: 300, width: 800, height: 400 },
      displayed: { width: 1000, height: 1000 },
      natural: { width: 2000, height: 1000 },
    })).toEqual({ x: 200, y: 100, width: 1600, height: 800 });
  });

  test("keeps a manual crop as the OCR source and bypasses automatic bottom crops", () => {
    const manualCrop = { x: 7, y: 61, width: 88, height: 27 };
    const plan = buildMrzCropPlan(manualCrop, { manual: true });

    expect(plan).toHaveLength(3);
    expect(plan[0].crop).toMatchObject(manualCrop);
    expect(plan[1].crop).toEqual(plan[0].crop);
    expect(plan.every((attempt) => attempt.variant.startsWith("manual-"))).toBe(true);
    expect(plan.every((attempt) => ![54, 68].includes(attempt.crop.y))).toBe(true);
    expect(plan[2].crop.y).toBeLessThan(manualCrop.y);
  });

  test("keeps a direct lower-image fallback in the automatic crop plan", () => {
    const plan = buildMrzCropPlan();

    expect(plan).toHaveLength(3);
    expect(plan[0]).toMatchObject({ crop: { y: 68, height: 32 }, variant: "mrz-lines-light" });
    expect(plan[1]).toMatchObject({ crop: { y: 68, height: 32 }, threshold: true });
    expect(plan[2]).toMatchObject({
      crop: { y: 54, height: 46 },
      variant: "mrz-wide-lines-deskew",
      rectifyPerspective: true,
    });
  });

  test("uses overlapping line bands when projection cannot separate both lines", () => {
    const blank = detectMrzLineBandsFromProjection(Array(100).fill(0));
    expect(blank.confident).toBe(false);
    expect(blank.method).toBe("overlapping_fallback");
    expect(blank.bands[0].end).toBeGreaterThan(blank.bands[1].start);

    const rows = Array(120).fill(0);
    for (let index = 26; index <= 38; index += 1) rows[index] = 30 - Math.abs(32 - index);
    for (let index = 78; index <= 92; index += 1) rows[index] = 32 - Math.abs(85 - index);
    const detected = detectMrzLineBandsFromProjection(rows);
    expect(detected.confident).toBe(true);
    expect(detected.method).toBe("horizontal_projection");
    expect(detected.bands[0].end).toBeLessThan(detected.bands[1].start);
  });

  test("normalizes only conservative 43/45-character TD3 tails", () => {
    const shortLine1 = SYNTHETIC_TD3.line1.slice(0, 43);
    const longLine1 = `${SYNTHETIC_TD3.line1}<`;
    const shortLine2 = SYNTHETIC_TD3.line2.slice(0, 43);
    const longLine2 = `${SYNTHETIC_TD3.line2}<`;

    expect(normalizeTd3OcrLine(shortLine1, "line1")).toBe(SYNTHETIC_TD3.line1);
    expect(normalizeTd3OcrLine(longLine1, "line1")).toBe(SYNTHETIC_TD3.line1);
    expect(normalizeTd3OcrLine(shortLine2, "line2")).toHaveLength(44);
    expect(normalizeTd3OcrLine(shortLine2, "line2").slice(0, 9)).toBe(SYNTHETIC_TD3.line2.slice(0, 9));
    expect(normalizeTd3OcrLine(longLine2, "line2")).toBe(SYNTHETIC_TD3.line2);
  });

  test("lets a clear image below the former dimension gate reach OCR", async () => {
    const recognize = jest.fn(async (_, item) => (
      item.cropType === "line1" ? SYNTHETIC_TD3.line1 : SYNTHETIC_TD3.line2
    ));

    const result = await extractMRZFromImage(new Blob(["synthetic"]), null, {
      decodedImage: { width: 320, height: 240, image: {} },
      worker,
      createAttempt,
      recognize,
    });

    expect(result.success).toBe(true);
    expect(result.error).toBe("");
    expect(recognize).toHaveBeenCalledTimes(2);
  });

  test("uses an externally warmed worker without creating or terminating another worker", async () => {
    const sharedWorker = { terminate: jest.fn() };
    const recognize = jest.fn(async (_, item) => (
      item.cropType === "line1" ? SYNTHETIC_TD3.line1 : SYNTHETIC_TD3.line2
    ));

    const result = await extractMRZFromImage(new Blob(["synthetic"]), null, {
      decodedImage: { width: 1200, height: 800, image: {} },
      workerPromise: Promise.resolve(sharedWorker),
      createAttempt,
      recognize,
    });

    expect(result.success).toBe(true);
    expect(createWorker).not.toHaveBeenCalled();
    expect(sharedWorker.terminate).not.toHaveBeenCalled();
  });

  test("returns verified partial fields instead of ready when a check digit fails", async () => {
    const wrongCheck = SYNTHETIC_TD3.line2[9] === "9" ? "8" : "9";
    const invalidLine2 = replaceAt(SYNTHETIC_TD3.line2, 9, wrongCheck);
    const recognize = jest.fn(async (_, item) => (
      item.cropType === "line1" ? SYNTHETIC_TD3.line1 : invalidLine2
    ));

    const result = await extractMRZFromImage(new Blob(["synthetic"]), null, {
      decodedImage: { width: 1200, height: 800, image: {} },
      worker,
      createAttempt,
      recognize,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("MRZ_VALIDATION_FAILED");
    expect(result.parsed.data).toEqual(expect.objectContaining({
      latinLastName: "TESTER",
      latinFirstName: "ALPHA",
      nationality: "UTO",
    }));
    expect(result.parsed.ok).toBe(false);
    expect(result.parsed.fieldWarnings.passportNo).toEqual(expect.arrayContaining(["invalid_passport_number"]));
  });

  test("marks region OCR as manual and rejects only an actually unusable crop", async () => {
    const manualCrop = { x: 10, y: 60, width: 80, height: 25 };
    const recognize = jest.fn(async (_, item) => (
      item.cropType === "line1" ? SYNTHETIC_TD3.line1 : SYNTHETIC_TD3.line2
    ));
    const result = await extractMRZFromImageRegion(new Blob(["synthetic"]), manualCrop, null, {
      decodedImage: { width: 1200, height: 800, image: {} },
      worker,
      createAttempt,
      recognize,
    });

    expect(result.success).toBe(true);
    expect(result.debug.cropMode).toBe("manual");
    expect(result.debug.requestedCrop).toEqual(manualCrop);

    const invalid = await extractMRZFromImageRegion(new Blob(["synthetic"]), { x: 1, y: 1, width: 1, height: 1 }, null, {
      decodedImage: { width: 1200, height: 800, image: {} },
      worker,
      createAttempt,
      recognize,
    });
    expect(invalid.success).toBe(false);
    expect(invalid.error).toBe("MANUAL_CROP_INVALID");
  });
});
