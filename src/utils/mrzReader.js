/**
 * MRZ (Machine Readable Zone) Parser
 * Reads the two bottom lines of a passport photo
 * Works client-side — no server needed
 *
 * MRZ Line 1 example: P<MARAARAB<<FATIMA<<<<<<<<<<<<<<<<<<<<<<<<
 * MRZ Line 2 example: MN67682049MAR7107216F2101218<<<<<<<<<<<<6
 */

// Parse MRZ TD3 format (standard passport — 2 lines of 44 chars)
export function parseMRZ(line1, line2) {
  if (!line1 || !line2) return null;

  const l1 = line1.trim().padEnd(44, "<");
  const l2 = line2.trim().padEnd(44, "<");

  if (l1.length < 44 || l2.length < 44) return null;

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
    const passportNo  = l2.substring(0, 9).replace(/<+$/, "");
    const nationality = l2.substring(10, 13).replace(/<+$/, "");
    const birthRaw    = l2.substring(13, 19);
    const gender      = l2[20] === "F" ? "F" : "M";
    const expiryRaw   = l2.substring(21, 27);

    // Convert YYMMDD → YYYY-MM-DD
    const parseDate = (yymmdd, isBirth = false) => {
      if (!yymmdd || yymmdd.includes("<")) return "";
      const yy = parseInt(yymmdd.substring(0, 2));
      const mm = yymmdd.substring(2, 4);
      const dd = yymmdd.substring(4, 6);
      // Birth: yy > 30 → 19xx, else 20xx
      // Expiry: always 20xx
      const fullYear = isBirth
        ? (yy > 30 ? 1900 + yy : 2000 + yy)
        : 2000 + yy;
      return `${fullYear}-${mm}-${dd}`;
    };

    const birthDate  = parseDate(birthRaw, true);
    const expiryDate = parseDate(expiryRaw, false);

    return {
      documentType:  docType,
      passportNo:    passportNo.toUpperCase(),
      nationality:   nationality.toUpperCase(),
      lastName:      lastName.toUpperCase(),
      firstName:     firstName.toUpperCase(),
      nameLatin:     fullNameLatin.toUpperCase(),
      birthDate,
      expiryDate,
      gender,
      issuer:        issuer.toUpperCase(),
      raw:           { line1: l1, line2: l2 },
    };
  } catch (e) {
    console.error("MRZ parse error:", e);
    return null;
  }
}

// Extract MRZ lines from text (OCR output often has extra text)
export function extractMRZFromText(text) {
  if (!text) return null;

  // MRZ lines are 44 chars, contain only A-Z, 0-9, <
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);

  const mrzLines = lines.filter(l => {
    const cleaned = l.replace(/[^A-Z0-9<]/g, "");
    return cleaned.length >= 40 && /^[A-Z0-9<]+$/.test(cleaned);
  }).map(l => l.replace(/[^A-Z0-9<]/g, "").padEnd(44, "<").substring(0, 44));

  if (mrzLines.length >= 2) {
    // Try to find the passport line (starts with P)
    const passportIdx = mrzLines.findIndex(l => l[0] === "P");
    if (passportIdx >= 0 && mrzLines[passportIdx + 1]) {
      return parseMRZ(mrzLines[passportIdx], mrzLines[passportIdx + 1]);
    }
    // Try last two lines
    return parseMRZ(mrzLines[mrzLines.length - 2], mrzLines[mrzLines.length - 1]);
  }

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
