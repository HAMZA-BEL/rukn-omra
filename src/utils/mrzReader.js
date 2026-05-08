/**
 * Compatibility wrapper for the centralized passport MRZ engine.
 * UI code should keep importing from this file, while all TD3 parsing,
 * checksum validation, noisy-name rejection, and candidate detection live in
 * passportMrzEngine.js.
 */
import {
  MRZ_RESULT_STATUS,
  MRZ_REVIEW_REASONS,
  buildPassportMrzResult,
  computeMrzCheckDigit,
  detectMrzCandidateLines,
  parseMrzNameLine as parseEngineNameLine,
  parseTd3Mrz,
} from "./passportMrzEngine";

const REVIEW_TO_LEGACY_ISSUE = {
  [MRZ_REVIEW_REASONS.SUSPICIOUS_NAME]: "NAME_FILLER_NOISE",
  [MRZ_REVIEW_REASONS.PARTIAL_MRZ_READ]: "LINE_LENGTH",
  [MRZ_REVIEW_REASONS.MISSING_REQUIRED_FIELD]: "MISSING_REQUIRED_FIELD",
  [MRZ_REVIEW_REASONS.INVALID_DATE]: "INVALID_DATE",
  [MRZ_REVIEW_REASONS.PARTIAL_BIRTH_DATE]: "partial_birth_date",
  [MRZ_REVIEW_REASONS.INVALID_PASSPORT_NUMBER]: "PASSPORT_MISSING",
  [MRZ_REVIEW_REASONS.NO_MRZ_TEXT]: "MRZ_MISSING",
  [MRZ_REVIEW_REASONS.PARSER_FAILED]: "PARSE_ERROR",
  [MRZ_REVIEW_REASONS.LOW_CONFIDENCE]: "LOW_CONFIDENCE",
};

const normalizeFieldWarnings = (warnings = {}) => ({
  latinLastName: warnings.lastNameLatin || [],
  latinFirstName: warnings.firstNameLatin || [],
  passportNo: warnings.passportNumber || [],
  nationality: warnings.nationality || [],
  birthDate: warnings.birthDate || [],
  passportExpiry: warnings.expiryDate || [],
  gender: warnings.gender || [],
});

const legacyIssuesFromEngine = (result) => {
  const issues = new Set();
  const checks = result.checks || {};
  if (checks.passportNumberCheck && !checks.passportNumberCheck.valid) issues.add("PASSPORT_CHECK");
  if (checks.birthDateCheck && !checks.birthDateCheck.valid) issues.add("BIRTH_CHECK");
  if (checks.expiryDateCheck && !checks.expiryDateCheck.valid) issues.add("EXPIRY_CHECK");
  (result.reviewReasons || []).forEach((reason) => {
    if (reason === MRZ_REVIEW_REASONS.CHECKSUM_FAILED) return;
    if (reason === MRZ_REVIEW_REASONS.MISSING_REQUIRED_FIELD) {
      const fields = result.fields || {};
      if (!fields.passportNumber) issues.add("PASSPORT_MISSING");
      if (!fields.lastNameLatin) issues.add("LAST_NAME_MISSING");
      if (!fields.firstNameLatin) issues.add("FIRST_NAME_MISSING");
      if (!fields.nationality) issues.add("NATIONALITY_MISSING");
      if (!fields.gender) issues.add("GENDER_MISSING");
      if (!fields.birthDate) issues.add("BIRTH_CHECK");
      if (!fields.expiryDate) issues.add("EXPIRY_CHECK");
      return;
    }
    issues.add(REVIEW_TO_LEGACY_ISSUE[reason] || reason);
  });
  return Array.from(issues);
};

export { computeMrzCheckDigit };

export function parseMrzNameLine(line1 = "") {
  const parsed = parseEngineNameLine(line1);
  const issues = new Set();
  (parsed.issues || []).forEach((issue) => {
    if (issue === MRZ_REVIEW_REASONS.SUSPICIOUS_NAME) issues.add("NAME_FILLER_NOISE");
    else if (issue === MRZ_REVIEW_REASONS.MISSING_REQUIRED_FIELD) {
      if (!parsed.lastName) issues.add("LAST_NAME_MISSING");
      if (!parsed.firstName) issues.add("FIRST_NAME_MISSING");
    } else if (issue === MRZ_REVIEW_REASONS.PARTIAL_MRZ_READ) issues.add("LINE1_LENGTH");
    else if (issue === MRZ_REVIEW_REASONS.PARSER_FAILED) issues.add("PARSE_ERROR");
    else issues.add(issue);
  });
  return {
    lastName: parsed.lastName || parsed.surname || "",
    firstName: parsed.firstName || parsed.givenNames || "",
    issues: Array.from(issues),
    engineIssues: parsed.issues || [],
    diagnostics: parsed.diagnostics || {},
  };
}

export function parseMRZDetailed(line1, line2, options = {}) {
  const result = parseTd3Mrz([line1 || "", line2 || ""], { source: "auto_mrz", ...options });
  const fields = result.fields || {};
  const data = fields.passportNumber || fields.lastNameLatin || fields.firstNameLatin ? {
    documentType: "P",
    passportNo: fields.passportNumber || "",
    nationality: fields.nationality || "",
    latinLastName: fields.lastNameLatin || "",
    latinFirstName: fields.firstNameLatin || "",
    lastName: fields.lastNameLatin || "",
    firstName: fields.firstNameLatin || "",
    nameLatin: [fields.lastNameLatin, fields.firstNameLatin].filter(Boolean).join(" "),
    birthDate: fields.birthDate || "",
    birthDateRaw: fields.birthDateRaw || "",
    birthDatePrecision: fields.birthDatePrecision || "",
    birthYear: fields.birthYear || null,
    birthMonth: fields.birthMonth || null,
    birthDay: fields.birthDay || null,
    birthDateApproximated: Boolean(fields.birthDateApproximated),
    birthDateApproximationRule: fields.birthDateApproximationRule || "",
    expiryDate: fields.expiryDate || "",
    gender: fields.gender || "",
    issuer: String(result.raw?.line1 || "").slice(2, 5).replace(/<+$/g, ""),
    raw: { line1: result.raw?.line1 || "", line2: result.raw?.line2 || "" },
  } : null;

  return {
    ok: result.status === MRZ_RESULT_STATUS.READY,
    data,
    issues: legacyIssuesFromEngine(result),
    reviewReasons: result.reviewReasons || [],
    fieldWarnings: normalizeFieldWarnings(result.fieldWarnings || {}),
    raw: { line1: result.raw?.line1 || "", line2: result.raw?.line2 || "" },
    checks: result.checks || {},
    confidence: result.confidence / 100,
    engineResult: result,
  };
}

export function parseMRZ(line1, line2) {
  const result = parseMRZDetailed(line1, line2);
  return result.data || null;
}

export function extractMRZLinesFromText(text) {
  const candidate = detectMrzCandidateLines(text || "");
  return candidate.ok ? candidate.lines : null;
}

export function extractMRZFromText(text) {
  const result = buildPassportMrzResult({ ocrText: text || "", source: "auto_mrz" });
  return result.status !== MRZ_RESULT_STATUS.FAILED ? parseMRZ(result.raw?.line1, result.raw?.line2) : null;
}

// Use browser-side image preview only; actual OCR is handled by ocrPassport.js.
export async function readMRZFromImage(imageFile) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target.result;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const mrzHeight = Math.floor(img.height * 0.25);
        const mrzY = img.height - mrzHeight;
        canvas.width = img.width;
        canvas.height = mrzHeight;
        ctx.filter = "contrast(200%) brightness(150%) grayscale(100%)";
        ctx.drawImage(img, 0, mrzY, img.width, mrzHeight, 0, 0, img.width, mrzHeight);
        resolve({
          success: false,
          message: "يرجى إدخال سطري MRZ يدوياً من أسفل جواز السفر",
          imageData,
          croppedCanvas: canvas.toDataURL(),
        });
      };
      img.src = imageData;
    };
    reader.readAsDataURL(imageFile);
  });
}

export const MOROCCAN_MRZ_SAMPLE = {
  line1: "P<MARABOUKAL<<ALI<<<<<<<<<<<<<<<<<<<<<<<<<<<",
  line2: "ET18698304MAR6902139M2801315J242018<<<<<<<<<",
  expected: {
    issuer: "MAR",
    latinLastName: "ABOUKAL",
    latinFirstName: "ALI",
    nationality: "MAR",
    birthDate: "1969-02-13",
    gender: "M",
    expiryDate: "2028-01-31",
  },
};

export const MRZ_NAME_PARSE_SAMPLES = [
  {
    line1: "P<MARABOUKAL<<ALI<<<<<<<<<<<<<<<<<<<<<<<<<<<",
    expected: { lastName: "ABOUKAL", firstName: "ALI", fillerNoise: false },
  },
  {
    line1: "P<MARABASSI<<BRAHIM<<<<<<<<<<<<<<<<<<<<<<<<",
    expected: { lastName: "ABASSI", firstName: "BRAHIM", fillerNoise: false },
  },
  {
    line1: "P<MARABOUKAL<<ALI<<<<<<<<<LLLLLLLLLL",
    expected: { lastName: "ABOUKAL", firstName: "ALI", fillerNoise: false, cleanedNoise: true },
  },
  {
    line1: "P<MARABOUKAL<<CCLLLLLLLLLLLLLLLLLLLL",
    expected: { lastName: "ABOUKAL", firstName: "", fillerNoise: true, cleanedNoise: true },
  },
  {
    line1: "P<MARKHADIJAKLLLLLLLL<<BRAHIM<C<<<<<<<<",
    expected: { lastName: "KHADIJA", firstName: "BRAHIM", fillerNoise: false, cleanedNoise: true },
  },
];

export function runMRZParserSelfTest(sample = MOROCCAN_MRZ_SAMPLE) {
  const result = parseMRZDetailed(sample.line1, sample.line2);
  const data = result.data || {};
  const mismatches = Object.entries(sample.expected || {})
    .filter(([key, value]) => data[key] !== value)
    .map(([key, value]) => ({ key, expected: value, actual: data[key] }));
  const nameMismatches = MRZ_NAME_PARSE_SAMPLES.flatMap((item) => {
    const parsed = parseMrzNameLine(item.line1);
    const fillerNoise = parsed.issues.includes("NAME_FILLER_NOISE");
    const cleanedNoise = Boolean(parsed.diagnostics?.removedNoise?.length);
    return [
      parsed.lastName !== item.expected.lastName
        ? { line1: item.line1, key: "lastName", expected: item.expected.lastName, actual: parsed.lastName }
        : null,
      parsed.firstName !== item.expected.firstName
        ? { line1: item.line1, key: "firstName", expected: item.expected.firstName, actual: parsed.firstName }
        : null,
      fillerNoise !== item.expected.fillerNoise
        ? { line1: item.line1, key: "fillerNoise", expected: item.expected.fillerNoise, actual: fillerNoise }
        : null,
      typeof item.expected.cleanedNoise === "boolean" && cleanedNoise !== item.expected.cleanedNoise
        ? { line1: item.line1, key: "cleanedNoise", expected: item.expected.cleanedNoise, actual: cleanedNoise }
        : null,
    ].filter(Boolean);
  });
  return {
    ok: result.ok && mismatches.length === 0 && nameMismatches.length === 0,
    result,
    mismatches,
    nameMismatches,
  };
}
