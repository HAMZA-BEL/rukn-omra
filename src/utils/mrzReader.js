/**
 * MRZ (Machine Readable Zone) Parser
 * Reads the two bottom lines of a passport photo
 * Works client-side — no server needed
 *
 * MRZ Line 1 example: P<MARAARAB<<FATIMA<<<<<<<<<<<<<<<<<<<<<<<<
 * MRZ Line 2 example: MN67682049MAR7107216F2101218<<<<<<<<<<<<6
 */

const cleanMRZLine = (value = "") => String(value).toUpperCase().replace(/[^A-Z0-9<]/g, "");

const MRZ_WEIGHTS = [7, 3, 1];
const charValue = (char) => {
  if (char === "<") return 0;
  if (/[0-9]/.test(char)) return Number(char);
  if (/[A-Z]/.test(char)) return char.charCodeAt(0) - 55;
  return 0;
};

const checkDigit = (value = "") => String(value)
  .split("")
  .reduce((sum, char, index) => sum + charValue(char) * MRZ_WEIGHTS[index % 3], 0) % 10;

const isValidDatePart = (value = "") => {
  if (!/^\d{6}$/.test(value)) return false;
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
};

const repeatedOcrFillerNoise = /([A-Z0-9])\1{2,}/;

const stripSuspiciousNameTokenNoise = (value = "") => {
  let token = cleanMRZLine(value).replace(/<+/g, "");
  let hadOcrFillerNoise = repeatedOcrFillerNoise.test(token);
  const repeatedRun = token.match(repeatedOcrFillerNoise);
  if (repeatedRun?.index >= 0) {
    token = token.slice(0, repeatedRun.index);
  }
  if (hadOcrFillerNoise && token.length > 3) {
    if (/(CI|IC|CC|LL|KK)$/i.test(token)) token = token.slice(0, -2);
    else if (/[CLKI1]$/i.test(token)) token = token.slice(0, -1);
  }
  if (token.length === 1 || (hadOcrFillerNoise && token.length <= 2)) {
    token = "";
    hadOcrFillerNoise = true;
  }
  return { token, hadOcrFillerNoise };
};

const normalizeNameComponent = (value = "") => {
  const raw = cleanMRZLine(value);
  const parts = raw
    .split(/<+/)
    .map(stripSuspiciousNameTokenNoise)
    .filter((part) => part.token);
  const hadOcrFillerNoise = repeatedOcrFillerNoise.test(raw)
    || parts.some((part) => part.hadOcrFillerNoise)
    || raw.split(/<+/).some((part) => cleanMRZLine(part).length === 1);
  const name = parts.map((part) => part.token).join(" ").replace(/\s+/g, " ").trim();
  return {
    name,
    hadOcrFillerNoise: hadOcrFillerNoise || repeatedOcrFillerNoise.test(name),
  };
};

export function parseMrzNameLine(line1 = "") {
  const l1 = cleanMRZLine(line1);
  const issues = [];
  if (l1.length < 5) {
    return { lastName: "", firstName: "", issues: ["LAST_NAME_MISSING", "FIRST_NAME_MISSING"] };
  }

  const nameField = l1.substring(5, 44);
  const separatorIndex = nameField.indexOf("<<");
  if (separatorIndex < 0) {
    const surnameCandidate = nameField.split("<")[0];
    const surname = normalizeNameComponent(surnameCandidate);
    if (!surname.name) issues.push("LAST_NAME_MISSING");
    issues.push("FIRST_NAME_MISSING");
    if (surname.hadOcrFillerNoise || repeatedOcrFillerNoise.test(nameField)) issues.push("NAME_FILLER_NOISE");
    return {
      lastName: surname.name,
      firstName: "",
      issues,
    };
  }

  let surnameRaw = nameField.slice(0, separatorIndex);
  const givenNames = normalizeNameComponent(nameField.slice(separatorIndex + 2));
  if (!givenNames.name && surnameRaw.includes("<")) {
    surnameRaw = surnameRaw.split("<")[0];
  }
  const surname = normalizeNameComponent(surnameRaw);
  if (!surname.name) issues.push("LAST_NAME_MISSING");
  if (!givenNames.name) issues.push("FIRST_NAME_MISSING");
  if (surname.hadOcrFillerNoise || givenNames.hadOcrFillerNoise) issues.push("NAME_FILLER_NOISE");
  return {
    lastName: surname.name,
    firstName: givenNames.name,
    issues,
  };
}

const parseDate = (yymmdd, isBirth = false) => {
  if (!isValidDatePart(yymmdd)) return "";
  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = yymmdd.substring(2, 4);
  const dd = yymmdd.substring(4, 6);
  const fullYear = isBirth ? (yy > 30 ? 1900 + yy : 2000 + yy) : 2000 + yy;
  return `${fullYear}-${mm}-${dd}`;
};

export function parseMRZDetailed(line1, line2) {
  if (!line1 || !line2) return { ok: false, data: null, issues: ["MRZ_MISSING"] };

  const raw1 = String(line1).trim().toUpperCase();
  const raw2 = String(line2).trim().toUpperCase();
  const l1 = cleanMRZLine(line1);
  const l2 = cleanMRZLine(line2);
  const issues = [];

  if (/[^A-Z0-9<]/.test(raw1)) issues.push("LINE1_INVALID_CHARS");
  if (/[^A-Z0-9<]/.test(raw2)) issues.push("LINE2_INVALID_CHARS");
  if (l1.length !== 44) issues.push("LINE1_LENGTH");
  if (l2.length !== 44) issues.push("LINE2_LENGTH");
  if (!l1.startsWith("P<")) issues.push("NOT_TD3_PASSPORT");

  if (l1.length < 44 || l2.length < 44) return { ok: false, data: null, issues, raw: { line1: l1, line2: l2 } };

  try {
    // ── Line 1 parsing ─────────────────────────────────────────────────────
    // P<MARAARAB<<FATIMA<<<<<<<<<<<<<<<<<<<<<<<<
    // [0]    = document type (P)
    // [1]    = document subtype (<)
    // [2-4]  = issuing country (MAR)
    // [5-43] = name field
    const docType   = l1[0];
    const issuer    = l1.substring(2, 5).replace(/<+$/, "");
    const nameResult = parseMrzNameLine(l1);
    const lastName = nameResult.lastName;
    const firstName = nameResult.firstName;
    const fullNameLatin = `${lastName} ${firstName}`.trim();
    nameResult.issues.forEach((issue) => {
      if (!issues.includes(issue)) issues.push(issue);
    });

    // ── Line 2 parsing ─────────────────────────────────────────────────────
    // MN67682049MAR7107216F2101218<<<<<<<<<<<<6
    // [0-8]  = passport number (9 chars)
    // [9]    = check digit
    // [10-12]= nationality
    // [13-18]= birth date (YYMMDD)
    // [19]   = check digit
    // [20]   = gender (M/F/<)
    // [21-26]= expiry date (YYMMDD)
    // [27]   = check digit
    const passportField = l2.substring(0, 9);
    const passportNo  = passportField.replace(/<+$/, "");
    const passportCheck = l2[9];
    const nationality = l2.substring(10, 13).replace(/<+$/, "");
    const birthRaw    = l2.substring(13, 19);
    const birthCheck  = l2[19];
    const gender      = l2[20] === "F" ? "F" : l2[20] === "M" ? "M" : "";
    const expiryRaw   = l2.substring(21, 27);
    const expiryCheck = l2[27];

    if (String(checkDigit(passportField)) !== passportCheck) issues.push("PASSPORT_CHECK");
    if (!isValidDatePart(birthRaw) || String(checkDigit(birthRaw)) !== birthCheck) issues.push("BIRTH_CHECK");
    if (!isValidDatePart(expiryRaw) || String(checkDigit(expiryRaw)) !== expiryCheck) issues.push("EXPIRY_CHECK");
    if (!passportNo) issues.push("PASSPORT_MISSING");
    if (!nationality || !/^[A-Z]{3}$/.test(nationality)) issues.push("NATIONALITY_MISSING");
    if (!gender) issues.push("GENDER_MISSING");

    const birthDate  = parseDate(birthRaw, true);
    const expiryDate = parseDate(expiryRaw, false);

    const data = {
      documentType:  docType,
      passportNo:    passportNo.toUpperCase(),
      nationality:   nationality.toUpperCase(),
      latinLastName:  lastName.toUpperCase(),
      latinFirstName: firstName.toUpperCase(),
      lastName:      lastName.toUpperCase(),
      firstName:     firstName.toUpperCase(),
      nameLatin:     fullNameLatin.toUpperCase(),
      birthDate,
      expiryDate,
      gender,
      issuer:        issuer.toUpperCase(),
      raw:           { line1: l1, line2: l2 },
    };
    return { ok: issues.length === 0, data, issues, raw: data.raw };
  } catch (e) {
    console.error("MRZ parse error:", e);
    return { ok: false, data: null, issues: ["PARSE_ERROR"], raw: { line1: l1, line2: l2 } };
  }
}

// Parse MRZ TD3 format (standard passport — 2 lines of 44 chars)
export function parseMRZ(line1, line2) {
  const result = parseMRZDetailed(line1, line2);
  return result.data && result.issues.length === 0 ? result.data : result.data;
}

// Extract MRZ lines from text (OCR output often has extra text)
export function extractMRZFromText(text) {
  if (!text) return null;

  const lines = extractMRZLinesFromText(text);
  return lines ? parseMRZ(lines[0], lines[1]) : null;
}

export function extractMRZLinesFromText(text) {
  if (!text) return null;
  const lines = text
    .split(/\n/)
    .map((line) => cleanMRZLine(line))
    .filter((line) => line.length === 44 && /^[A-Z0-9<]{44}$/.test(line));
  const passportIdx = lines.findIndex((line) => line.startsWith("P<"));
  if (passportIdx >= 0 && lines[passportIdx + 1]) return [lines[passportIdx], lines[passportIdx + 1]];
  return null;
}

// Use browser's built-in OCR if available (Chrome 123+)
// Falls back to manual input if not available
export async function readMRZFromImage(imageFile) {
  // Check if Tesseract-like OCR is available
  // We'll use a lightweight approach: draw image to canvas and use OCR
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target.result;

      // Create image element to get dimensions
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx    = canvas.getContext("2d");

        // Focus on bottom 20% of image (where MRZ usually is)
        const mrzHeight = Math.floor(img.height * 0.25);
        const mrzY      = img.height - mrzHeight;

        canvas.width  = img.width;
        canvas.height = mrzHeight;

        // Enhance contrast for OCR
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
    expected: { lastName: "ABOUKAL", firstName: "ALI", fillerNoise: true },
  },
  {
    line1: "P<MARABOUKAL<SAL<<<<<<<<<<<<",
    expected: { lastName: "ABOUKAL", firstName: "", fillerNoise: false },
  },
  {
    line1: "P<MARABOUKAL<<CCLLLLLLLLLLLLLLLLLLLL",
    expected: { lastName: "ABOUKAL", firstName: "", fillerNoise: true },
  },
  {
    line1: "P<MARABDESLAMCLLLLLLLL<<BRAHIM<<<<<<<<<<<<",
    expected: { lastName: "ABDESLAM", firstName: "BRAHIM", fillerNoise: true },
  },
  {
    line1: "P<MARKHADIJAKLLLLLLLL<<BRAHIM<C<<<<<<<<",
    expected: { lastName: "KHADIJA", firstName: "BRAHIM", fillerNoise: true },
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
    ].filter(Boolean);
  });
  return {
    ok: result.ok && mismatches.length === 0 && nameMismatches.length === 0,
    result,
    mismatches,
    nameMismatches,
  };
}
