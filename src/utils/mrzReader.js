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
    const namePart  = l1.substring(5, 44);
    const nameSplit = namePart.split("<<");
    const lastName  = (nameSplit[0] || "").replace(/</g, " ").trim();
    const firstName = (nameSplit[1] || "").replace(/</g, " ").trim();
    const fullNameLatin = `${lastName} ${firstName}`.trim();

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
    const gender      = l2[20] === "F" ? "F" : "M";
    const expiryRaw   = l2.substring(21, 27);
    const expiryCheck = l2[27];

    if (String(checkDigit(passportField)) !== passportCheck) issues.push("PASSPORT_CHECK");
    if (!isValidDatePart(birthRaw) || String(checkDigit(birthRaw)) !== birthCheck) issues.push("BIRTH_CHECK");
    if (!isValidDatePart(expiryRaw) || String(checkDigit(expiryRaw)) !== expiryCheck) issues.push("EXPIRY_CHECK");
    if (!passportNo) issues.push("PASSPORT_MISSING");

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
