const TD3_LINE_LENGTH = 44;
const MRZ_WEIGHTS = [7, 3, 1];
const NUMERIC_FIXES = {
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
const ALPHA_FIXES = {
  0: "O",
  1: "I",
  5: "S",
  8: "B",
};

export const MRZ_REVIEW_REASONS = {
  SUSPICIOUS_NAME: "suspicious_name",
  CHECKSUM_FAILED: "checksum_failed",
  PARTIAL_MRZ_READ: "partial_mrz_read",
  MISSING_REQUIRED_FIELD: "missing_required_field",
  DUPLICATE_EXISTING: "duplicate_existing",
  INVALID_DATE: "invalid_date",
  PARTIAL_BIRTH_DATE: "partial_birth_date",
  INVALID_PASSPORT_NUMBER: "invalid_passport_number",
  NO_MRZ_TEXT: "no_mrz_text",
  PARSER_FAILED: "parser_failed",
  LOW_CONFIDENCE: "low_confidence",
};

export const MRZ_RESULT_STATUS = {
  READY: "ready",
  NEEDS_REVIEW: "needs_review",
  FAILED: "failed",
  MANUALLY_ACCEPTED: "manually_accepted",
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const unique = (items = []) => Array.from(new Set(items.filter(Boolean)));
const normalizeUnicode = (value = "") => String(value || "")
  .replace(/[İİ]/g, "I")
  .replace(/[ı]/g, "I")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "");

export const cleanMrzChars = (value = "") => normalizeUnicode(value)
  .toUpperCase()
  .replace(/[«‹›>]/g, "<")
  .replace(/\s+/g, "")
  .replace(/[^A-Z0-9<]/g, "");

export function normalizeOcrText(text = "") {
  return String(text || "")
    .replace(/[«‹›>]/g, "<")
    .split(/\r?\n/)
    .map(cleanMrzChars)
    .filter(Boolean);
}

const fixNumericChar = (char = "") => NUMERIC_FIXES[char] || char;
const fixAlphaChar = (char = "") => ALPHA_FIXES[char] || char;
const fixNumericField = (value = "") => String(value || "").split("").map(fixNumericChar).join("");
const fixAlphaField = (value = "") => String(value || "").split("").map(fixAlphaChar).join("").replace(/<+$/g, "");

const padOrTrimTd3 = (value = "") => {
  const clean = cleanMrzChars(value);
  return clean.length >= TD3_LINE_LENGTH
    ? clean.slice(0, TD3_LINE_LENGTH)
    : clean.padEnd(TD3_LINE_LENGTH, "<");
};

const repairLine1 = (value = "") => {
  let clean = cleanMrzChars(value);
  const passportStart = clean.indexOf("P<");
  if (passportStart > 0) clean = clean.slice(passportStart);
  if (clean[0] !== "P" && ["F", "R"].includes(clean[0])) clean = `P${clean.slice(1)}`;
  if (clean[0] === "P" && ["<", "L", "I", "1"].includes(clean[1])) clean = `P<${clean.slice(2)}`;

  let line = padOrTrimTd3(clean);
  if (line.length < 5) return line;

  const prefix = line.slice(0, 5);
  let nameField = line.slice(5);
  nameField = nameField.replace(/[I1]{2,}/g, (match) => "<".repeat(match.length));
  if (!nameField.includes("<<")) {
    nameField = nameField.replace(/([A-Z]{2,})([<I1L]{2,})([A-Z]{2,})/, (_, surname, sep, given) => (
      `${surname}${"<".repeat(Math.max(2, sep.length))}${given}`
    ));
  }
  return `${prefix}${nameField}`.padEnd(TD3_LINE_LENGTH, "<").slice(0, TD3_LINE_LENGTH);
};

const repairLine2 = (value = "") => {
  const chars = padOrTrimTd3(value).split("");
  [
    9, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26, 27, 42, 43,
  ].forEach((index) => {
    chars[index] = fixNumericChar(chars[index]);
  });
  [10, 11, 12].forEach((index) => {
    chars[index] = fixAlphaChar(chars[index]);
  });
  if (["1", "I", "L", "<"].includes(chars[20])) chars[20] = "<";
  return chars.join("");
};

const quickMrzCheckValid = (value = "", actual = "") => (
  /^[0-9]$/.test(String(actual || "")) && String(computeMrzCheckDigit(value)) === String(actual || "")
);

const PASSPORT_NUMBER_PATTERN = /^[A-Z]{1,2}\d{6,8}$/;
const SUSPICIOUS_PASSPORT_NUMBER_PATTERN = /^[0-9][A-Z]/;

export function collectVisualPassportNumberCandidates(rawOcrText = "") {
  const text = normalizeUnicode(rawOcrText)
    .toUpperCase()
    .replace(/[«‹›>]/g, " ")
    .replace(/[^A-Z0-9\s-]/g, " ");
  const tokens = text
    .split(/[\s-]+/)
    .map((token) => token.trim().replace(/[^A-Z0-9]/g, ""))
    .filter(Boolean);
  const seen = new Set();
  const candidates = [];
  tokens.forEach((token) => {
    if (seen.has(token)) return;
    seen.add(token);
    const reasons = [];
    if (!PASSPORT_NUMBER_PATTERN.test(token)) reasons.push("does_not_match_letter_digit_passport_pattern");
    if (SUSPICIOUS_PASSPORT_NUMBER_PATTERN.test(token)) reasons.push("starts_with_suspicious_digit_letter_mix");
    if (token.length < 8 || token.length > 9) reasons.push("unexpected_passport_number_length");
    candidates.push({
      value: token,
      accepted: reasons.length === 0,
      rejected: reasons,
      score: reasons.length === 0 ? 30 + token.length : -20 - reasons.length * 10,
    });
  });
  const accepted = candidates
    .filter((candidate) => candidate.accepted)
    .sort((a, b) => b.score - a.score);
  if (process.env.NODE_ENV !== "production") {
    console.debug("[MRZ visual passport candidates]", {
      candidates,
      selected: accepted[0] || null,
    });
  }
  return accepted;
}

const passportDigits = (value = "") => String(value || "").replace(/\D/g, "");

const commonSubsequenceLength = (left = "", right = "") => {
  const a = String(left || "");
  const b = String(right || "");
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
};

const passportNumberSimilarity = (candidate = "", reference = "") => {
  const candidateDigits = passportDigits(candidate);
  const referenceDigits = passportDigits(reference);
  if (!candidateDigits || !referenceDigits) return 0;
  const lcs = commonSubsequenceLength(candidateDigits, referenceDigits);
  return lcs / Math.max(candidateDigits.length, referenceDigits.length);
};

const selectPassportNumberCandidate = ({
  passportField = "",
  passportCheck = "",
  visualPassportCandidates = [],
} = {}) => {
  const mrzCandidate = String(passportField || "").replace(/<+$/g, "").toUpperCase();
  const acceptedVisuals = (visualPassportCandidates || []).filter((candidate) => (
    candidate?.accepted && PASSPORT_NUMBER_PATTERN.test(candidate.value || "")
  ));
  const rejected = [];
  let selected = {
    value: mrzCandidate,
    source: "mrz_line2",
    reason: "fixed_position_passport_field",
  };

  acceptedVisuals.forEach((candidate) => {
    const similarity = passportNumberSimilarity(mrzCandidate, candidate.value);
    const mrzHasLeadingLetter = /^[A-Z]/.test(mrzCandidate);
    const visualHasLeadingLetter = /^[A-Z]/.test(candidate.value || "");
    const visualStrong = visualHasLeadingLetter && PASSPORT_NUMBER_PATTERN.test(candidate.value || "");
    const mrzWeakShift = !mrzHasLeadingLetter || /^\d/.test(mrzCandidate) || SUSPICIOUS_PASSPORT_NUMBER_PATTERN.test(mrzCandidate);
    const exact = mrzCandidate === candidate.value;
    const shouldUseVisual = exact || (
      visualStrong
      && mrzWeakShift
      && similarity >= 0.78
    );

    if (shouldUseVisual) {
      selected = {
        value: candidate.value,
        source: exact ? "mrz_line2_confirmed_by_visual" : "visual_passport_number_confirmed_by_mrz_context",
        reason: exact
          ? "visual_candidate_matches_fixed_position_field"
          : "visual_candidate_preserves_leading_letter_and_matches_mrz_digits",
        similarity,
      };
      return;
    }
    rejected.push({
      value: candidate.value,
      reason: visualStrong
        ? "visual_candidate_not_close_enough_to_fixed_position_field"
        : "visual_candidate_not_strong",
      similarity,
    });
  });

  if (process.env.NODE_ENV !== "production") {
    console.debug("[MRZ passport number candidates]", {
      mrzPassportField: passportField,
      checkDigit: passportCheck,
      mrzCandidate,
      visualCandidates: visualPassportCandidates,
      selectedPassportNumber: selected.value,
      selectedSource: selected.source,
      selectedReason: selected.reason,
      rejectedCandidates: rejected,
    });
  }

  return { ...selected, rejectedCandidates: rejected };
};

const scorePassportSegment = (segment = "", visualPassportCandidates = []) => {
  const passportField = segment.slice(0, 9).replace(/<+$/g, "");
  const checkDigit = segment[9] || "";
  let score = 0;
  const reasons = [];
  if (/^[A-Z]/.test(passportField)) score += 18;
  else reasons.push("passport_field_missing_leading_letter");
  if (PASSPORT_NUMBER_PATTERN.test(passportField)) score += 30;
  else reasons.push("passport_field_not_letter_digit_pattern");
  if (/^[0-9<]$/.test(checkDigit)) score += 6;
  else reasons.push("check_digit_not_digit_or_filler");
  if (SUSPICIOUS_PASSPORT_NUMBER_PATTERN.test(passportField)) {
    score -= 24;
    reasons.push("starts_with_suspicious_digit_letter_mix");
  }
  visualPassportCandidates.forEach((candidate) => {
    const similarity = passportNumberSimilarity(passportField, candidate.value);
    if (candidate.accepted && candidate.value === passportField) score += 38;
    else if (candidate.accepted && similarity >= 0.78) score += 18;
  });
  if (quickMrzCheckValid(segment.slice(0, 9), checkDigit)) score += 10;
  return { score, reasons, passportField, checkDigit };
};

const repairPreNationalityPassportSegment = ({
  rawLine2 = "",
  nationalityIndex = -1,
  issuingCountry = "",
  visualPassportCandidates = [],
} = {}) => {
  const clean = cleanMrzChars(rawLine2);
  const normalizedIssuer = String(issuingCountry || "").toUpperCase();
  if (!clean || nationalityIndex < 10 || !/^[A-Z]{3}$/.test(normalizedIssuer)) {
    return { candidates: [], diagnostics: null };
  }

  const candidates = [];
  const deletionCandidates = [];
  const pushCandidate = (segmentStart, preSegment, deletions = []) => {
    if (preSegment.length !== 10) return;
    const rest = clean.slice(nationalityIndex + normalizedIssuer.length);
    const repairedLine = `${preSegment}${normalizedIssuer}${rest}`;
    const segmentScore = scorePassportSegment(preSegment, visualPassportCandidates);
    const preservesLeadingLetter = segmentStart === 0 ? /^[A-Z]/.test(preSegment[0]) : /^[A-Z]/.test(clean[segmentStart]);
    const score = segmentScore.score
      + (preservesLeadingLetter ? 16 : -35)
      + (deletions.length ? 8 : 0);
    candidates.push({
      raw: repairedLine,
      recoverySource: "pre_nationality_repair",
      preNationalityRepair: {
        rawLine2: clean,
        detectedNationalityAnchorIndex: nationalityIndex,
        preNationalitySegment: clean.slice(segmentStart, nationalityIndex),
        deletionCandidates,
        repairedSegmentSelected: preSegment,
        selectedPassportField: preSegment.slice(0, 9),
        selectedCheckDigit: preSegment[9] || "",
        leadingLetterPreserved: preservesLeadingLetter,
        rejectedShiftedCandidate: clean.slice(Math.max(0, nationalityIndex - 10), nationalityIndex),
        deletions,
        score,
        reasons: segmentScore.reasons,
      },
      scoreBoost: Math.max(45, score),
    });
  };

  for (let start = Math.max(0, nationalityIndex - 12); start <= Math.max(0, nationalityIndex - 10); start += 1) {
    const preSegment = clean.slice(start, nationalityIndex);
    if (preSegment.length === 10) {
      pushCandidate(start, preSegment, []);
      continue;
    }
    if (preSegment.length < 11 || preSegment.length > 12) continue;
    const deletionsNeeded = preSegment.length - 10;
    const deleteCombos = [];
    if (deletionsNeeded === 1) {
      for (let i = 1; i < preSegment.length; i += 1) deleteCombos.push([i]);
    } else if (deletionsNeeded === 2) {
      for (let i = 1; i < preSegment.length; i += 1) {
        for (let j = i + 1; j < preSegment.length; j += 1) deleteCombos.push([i, j]);
      }
    }
    deleteCombos.forEach((indexes) => {
      const repaired = preSegment
        .split("")
        .filter((_, index) => !indexes.includes(index))
        .join("");
      const segmentScore = scorePassportSegment(repaired, visualPassportCandidates);
      const deletion = {
        from: preSegment,
        removeIndexes: indexes,
        removedChars: indexes.map((index) => preSegment[index]).join(""),
        repairedSegment: repaired,
        passportField: repaired.slice(0, 9),
        checkDigit: repaired[9] || "",
        score: segmentScore.score,
        reasons: segmentScore.reasons,
      };
      deletionCandidates.push(deletion);
      if (segmentScore.score > 20) pushCandidate(start, repaired, [deletion]);
    });
  }

  const sorted = candidates.sort((a, b) => (b.scoreBoost || 0) - (a.scoreBoost || 0));
  const diagnostics = {
    rawLine2: clean,
    detectedNationalityAnchorIndex: nationalityIndex,
    issuingCountry: normalizedIssuer,
    preNationalitySegment: clean.slice(Math.max(0, nationalityIndex - 12), nationalityIndex),
    deletionCandidates,
    selected: sorted[0]?.preNationalityRepair || null,
    rejectedShiftedCandidate: clean.slice(Math.max(0, nationalityIndex - 10), nationalityIndex),
  };
  if (process.env.NODE_ENV !== "production") {
    console.debug("[MRZ pre-nationality repair]", diagnostics);
  }
  return { candidates: sorted, diagnostics };
};

const parseLine2DateForScore = (value = "", { birth = false } = {}) => {
  const parsed = parseMrzDate(value, { birth });
  return parsed.valid;
};

const scoreLine2FixedCandidate = (candidate = "", { issuerHint = "" } = {}) => {
  const line = repairLine2(candidate);
  if (!/^[A-Z0-9<]{44}$/.test(line)) return -100;

  const normalizedIssuerHint = String(issuerHint || "").toUpperCase();
  const cleanCandidate = cleanMrzChars(candidate);
  const passportField = line.slice(0, 9);
  const passportCheck = line[9];
  const nationality = line.slice(10, 13);
  const birthRaw = line.slice(13, 19);
  const birthCheck = line[19];
  const sex = line[20];
  const expiryRaw = line.slice(21, 27);
  const expiryCheck = line[27];
  const optionalData = line.slice(28, 42);
  const optionalCheck = line[42];
  const compositeBody = `${line.slice(0, 10)}${line.slice(13, 20)}${line.slice(21, 43)}`;
  const compositeCheck = line[43];

  let score = 0;
  if (passportField.replace(/</g, "").length >= 3) score += 8;
  if (/^[0-9]$/.test(passportCheck)) score += 4;
  if (quickMrzCheckValid(passportField, passportCheck)) score += 26;
  else score -= 3;

  if (/^[A-Z]{3}$/.test(nationality)) score += 14;
  else score -= 16;
  if (normalizedIssuerHint && /^[A-Z]{3}$/.test(normalizedIssuerHint)) {
    if (nationality === normalizedIssuerHint) score += 10;
    else if (cleanCandidate.includes(normalizedIssuerHint)) score -= 16;
  }

  const birthDateForScore = parseMrzDate(birthRaw, { birth: true });
  const expiryDateForScore = parseMrzDate(expiryRaw, { birth: false });
  if (/^\d{6}$/.test(birthRaw)) score += 8;
  else if (birthDateForScore.partial) score += 4;
  if (birthDateForScore.valid) score += 14;
  else score -= 8;
  if (quickMrzCheckValid(birthRaw, birthCheck)) score += 22;
  else score -= 3;

  if (/^[MF<]$/.test(sex)) score += 10;
  else score -= 12;

  if (/^\d{6}$/.test(expiryRaw)) score += 8;
  if (expiryDateForScore.valid) score += 14;
  else score -= 8;
  if (quickMrzCheckValid(expiryRaw, expiryCheck)) score += 22;
  else score -= 3;

  if (quickMrzCheckValid(optionalData, optionalCheck)) score += 8;
  if (quickMrzCheckValid(compositeBody, compositeCheck)) score += 18;
  else score -= 2;

  return score;
};

const line2CandidateWindows = (value = "", options = {}) => {
  const clean = cleanMrzChars(value);
  if (!clean) return [];
  const windows = [];
  const normalizedIssuerHint = String(options.issuerHint || "").toUpperCase();
  const visualPassportCandidates = options.visualPassportCandidates?.length
    ? options.visualPassportCandidates
    : collectVisualPassportNumberCandidates([options.ocrText, value].filter(Boolean).join("\n"));
  const preNationalityRepairDiagnostics = [];
  const pushWindow = (raw, recoverySource = "window") => {
    if (!raw) return;
    windows.push({ raw, recoverySource });
  };
  const pushWindowObject = (candidate) => {
    if (!candidate?.raw) return;
    windows.push(candidate);
  };
  if (clean.length <= TD3_LINE_LENGTH) {
    pushWindow(clean, "short_or_exact_window");
  } else {
    for (let i = 0; i <= clean.length - TD3_LINE_LENGTH; i += 1) {
      pushWindow(clean.slice(i, i + TD3_LINE_LENGTH), "sliding_44_window");
    }
  }
  if (/^[A-Z]{3}$/.test(normalizedIssuerHint)) {
    for (let index = clean.indexOf(normalizedIssuerHint); index >= 0; index = clean.indexOf(normalizedIssuerHint, index + 1)) {
      const repair = repairPreNationalityPassportSegment({
        rawLine2: clean,
        nationalityIndex: index,
        issuingCountry: normalizedIssuerHint,
        visualPassportCandidates,
      });
      if (repair.diagnostics) preNationalityRepairDiagnostics.push(repair.diagnostics);
      repair.candidates.forEach(pushWindowObject);
      const start = index - 10;
      if (start >= 0) pushWindow(clean.slice(start, start + TD3_LINE_LENGTH), "issuer_aligned_window");
      const paddedStart = Math.max(0, start);
      pushWindow(clean.slice(paddedStart, paddedStart + TD3_LINE_LENGTH), "issuer_aligned_padded_window");
    }
  }
  const structuralMatches = clean.matchAll(/[A-Z0-9<]{3,12}[0-9][A-Z]{3}\d{6}[0-9][MF<]\d{6}[0-9]/g);
  for (const match of structuralMatches) {
    const start = match.index || 0;
    pushWindow(clean.slice(start, start + TD3_LINE_LENGTH), "structural_match_window");
    if (start > 0) pushWindow(clean.slice(start - 1, start - 1 + TD3_LINE_LENGTH), "structural_match_shift_minus_1");
    if (start > 1) pushWindow(clean.slice(start - 2, start - 2 + TD3_LINE_LENGTH), "structural_match_shift_minus_2");
  }
  const detectedAnchors = [];
  const anchorMatches = clean.matchAll(/[MF<][A-Z0-9]{6}[A-Z0-9]?/g);
  for (const match of anchorMatches) {
    const anchorText = match[0] || "";
    const anchorIndex = match.index || 0;
    const gender = anchorText[0];
    const expiryRaw = fixNumericField(anchorText.slice(1, 7));
    if (!/^[MF<]$/.test(gender) || !parseLine2DateForScore(expiryRaw, { birth: false })) continue;
    detectedAnchors.push({
      text: anchorText,
      index: anchorIndex,
      gender,
      expiryRaw,
    });
    const start = anchorIndex - 20;
    if (start >= 0) {
      pushWindow(clean.slice(start, start + TD3_LINE_LENGTH), "gender_expiry_anchor_window");
    }
    const beforeAnchor = clean.slice(Math.max(0, anchorIndex - 7), anchorIndex);
    const birthWithCheck = beforeAnchor.length === 7 ? fixNumericField(beforeAnchor) : "";
    if (
      start < 0
      && /^[A-Z]{3}$/.test(normalizedIssuerHint)
      && /^\d{7}$/.test(birthWithCheck)
      && visualPassportCandidates.length
    ) {
      visualPassportCandidates.slice(0, 3).forEach((visualCandidate) => {
        const passportField = visualCandidate.value.padEnd(9, "<").slice(0, 9);
        const passportCheck = "<";
        const suffix = clean.slice(anchorIndex);
        pushWindow(
          `${passportField}${passportCheck}${normalizedIssuerHint}${birthWithCheck}${suffix}`,
          "anchor_reconstructed_visual_passport",
        );
      });
    }
  }
  const deduped = [];
  const seen = new Set();
  windows.forEach((item) => {
    const key = cleanMrzChars(item.raw);
    if (!key || seen.has(`${item.recoverySource}:${key}`)) return;
    seen.add(`${item.recoverySource}:${key}`);
    deduped.push(item);
  });
  const mapped = deduped.map((candidate) => {
    const line = repairLine2(candidate.raw);
    const repairedNationality = line.slice(10, 13);
    const rejectionReasons = [];
    if (/^[A-Z]{3}$/.test(normalizedIssuerHint) && clean.includes(normalizedIssuerHint) && repairedNationality !== normalizedIssuerHint) {
      rejectionReasons.push("issuer_hint_visible_but_not_at_fixed_nationality_position");
    }
    if (!/^[A-Z0-9]{3,9}$/.test(line.slice(0, 9).replace(/<+$/g, ""))) rejectionReasons.push("invalid_passport_number_field");
    if (!/^[A-Z]{3}$/.test(repairedNationality)) rejectionReasons.push("invalid_nationality_field");
    if (!parseLine2DateForScore(line.slice(13, 19), { birth: true })) rejectionReasons.push("invalid_birth_date_field");
    if (!parseLine2DateForScore(line.slice(21, 27), { birth: false })) rejectionReasons.push("invalid_expiry_date_field");
    if (!/^[MF<]$/.test(line[20])) rejectionReasons.push("invalid_gender_field");
    return {
      raw: candidate.raw,
      line,
      score: scoreLine2FixedCandidate(candidate.raw, options) + (
        candidate.recoverySource === "pre_nationality_repair" ? (candidate.scoreBoost || 55)
          : candidate.recoverySource === "anchor_reconstructed_visual_passport" ? 28
          : candidate.recoverySource === "gender_expiry_anchor_window" ? 16
            : candidate.recoverySource?.startsWith("issuer_aligned") ? 12
              : 0
      ),
      recoverySource: candidate.recoverySource,
      preNationalityRepair: candidate.preNationalityRepair || null,
      fixedSlices: {
        passportNumber: line.slice(0, 9),
        passportCheck: line[9] || "",
        nationality: repairedNationality,
        birthDate: line.slice(13, 19),
        birthCheck: line[19] || "",
        gender: line[20] || "",
        expiryDate: line.slice(21, 27),
        expiryCheck: line[27] || "",
      },
      rejectionReasons,
    };
  }).sort((a, b) => b.score - a.score);
  if (process.env.NODE_ENV !== "production") {
    console.debug("[MRZ line2 anchors]", {
      rawLine2Text: value,
      normalizedLine2Text: clean,
      detectedGenderExpiryAnchors: detectedAnchors,
      anchorPositions: detectedAnchors.map((anchor) => anchor.index),
      candidateWindowsBuiltFromAnchors: mapped
        .filter((candidate) => String(candidate.recoverySource || "").includes("anchor"))
        .map((candidate) => ({
          line: candidate.line,
          raw: candidate.raw,
          recoverySource: candidate.recoverySource,
          score: candidate.score,
          fixedSlices: candidate.fixedSlices,
          rejectionReasons: candidate.rejectionReasons,
        })),
      candidates: mapped.map((candidate) => ({
        line: candidate.line,
        recoverySource: candidate.recoverySource,
        score: candidate.score,
        fixedSlices: candidate.fixedSlices,
        preNationalityRepair: candidate.preNationalityRepair || null,
        rejectionReasons: candidate.rejectionReasons,
      })),
      preNationalityRepairDiagnostics,
      selectedCandidate: mapped[0] || null,
      selectedSource: mapped[0]?.recoverySource || "",
    });
  }
  return mapped;
};

const selectBestTd3Line2Candidate = (value = "", options = {}) => {
  const candidates = line2CandidateWindows(value, options);
  const best = candidates[0] || { raw: cleanMrzChars(value), line: repairLine2(value), score: -100 };
  return {
    ...best,
    candidates: candidates.slice(0, 8),
  };
};

const lineWindows = (value = "") => {
  const clean = cleanMrzChars(value);
  if (!clean || clean.length < 18) return [];
  if (clean.length <= TD3_LINE_LENGTH) return [clean];
  const windows = [clean.slice(0, TD3_LINE_LENGTH)];
  for (let i = 0; i <= clean.length - TD3_LINE_LENGTH; i += 1) {
    windows.push(clean.slice(i, i + TD3_LINE_LENGTH));
  }
  return unique(windows);
};

export function scoreTd3Line1Candidate(line = "", { raw = "", consensusSupport = 1 } = {}) {
  if (!/^[A-Z0-9<]{44}$/.test(line)) {
    return {
      score: -100,
      reasons: ["invalid_td3_line1_length_or_chars"],
      normalizedLine: line,
      nameKey: "",
      surname: "",
      givenNames: "",
    };
  }

  const normalizedLine = repairLine1(line);
  const rawClean = cleanMrzChars(raw || line);
  const reasons = [];
  let score = 0;

  if (rawClean.startsWith("P<")) score += 20;
  if (normalizedLine.startsWith("P<")) score += 45;
  else {
    score -= 70;
    reasons.push("missing_td3_passport_prefix");
  }

  const issuer = fixAlphaField(normalizedLine.slice(2, 5)).toUpperCase();
  if (/^[A-Z]{3}$/.test(issuer)) score += 14;
  else {
    score -= 35;
    reasons.push("invalid_issuer_code");
  }
  if (issuer === "MAR") score += 28;
  else if (rawClean.includes("MAR")) {
    score -= 55;
    reasons.push("visible_mar_not_at_issuer_position");
  }

  const nameField = normalizedLine.slice(5);
  const separatorIndex = nameField.indexOf("<<");
  if (separatorIndex >= 2) score += 38;
  else {
    score -= 45;
    reasons.push("missing_double_filler_name_separator");
  }
  if (separatorIndex > 22) {
    score -= 18;
    reasons.push("separator_too_deep_in_name_field");
  }

  const rawSurnameCandidate = separatorIndex >= 0 ? nameField.slice(0, separatorIndex) : nameField;
  const rawGivenNameCandidate = separatorIndex >= 0 ? nameField.slice(separatorIndex + 2) : "";
  const surname = cleanMrzNamePart(rawSurnameCandidate);
  const givenNames = cleanGivenNamePartAfterSeparator(rawGivenNameCandidate, {
    boundaryContext: "line1_candidate_score",
  });

  if (surname.value && !isSuspiciousMrzName(surname.value)) score += 24;
  else {
    score -= 24;
    reasons.push("implausible_surname");
  }
  if (givenNames.value && !isSuspiciousMrzName(givenNames.value)) score += 24;
  else {
    score -= 24;
    reasons.push("implausible_given_name");
  }

  if (/^[A-Z][A-Z<]+<{2,}[A-Z<]*$/.test(rawGivenNameCandidate)) score += 16;
  else {
    score -= 10;
    reasons.push("missing_filler_after_given_name");
  }
  if (givenNames.trailingNoiseRemoved) {
    score += 8;
    reasons.push("contextual_trailing_given_noise_removed");
  }

  const noisyTail = nameField.match(/[A-Z]{2,}<{2,}[CLKI<]{3,}$/);
  if (noisyTail) score += 8;
  if (/[0-9]/.test(nameField)) {
    score -= 28;
    reasons.push("digits_in_line1_name_field");
  }

  const support = Math.max(1, Number(consensusSupport) || 1);
  if (support > 1) score += Math.min(24, (support - 1) * 8);

  const nameKey = [surname.value, givenNames.value].filter(Boolean).join("|");
  return {
    score,
    reasons,
    normalizedLine,
    issuer,
    separatorIndex,
    surname: surname.value,
    givenNames: givenNames.value,
    nameKey,
    consensusSupport: support,
    trailingNoiseRemoved: givenNames.trailingNoiseRemoved || "",
  };
}

const candidateScore = (line = "", isLine1 = false) => {
  if (!/^[A-Z0-9<]{44}$/.test(line)) return -100;
  let score = 0;
  const fillerCount = (line.match(/</g) || []).length;
  if (isLine1) {
    score += scoreTd3Line1Candidate(line).score;
    score += Math.min(16, fillerCount);
  } else {
    score += scoreLine2FixedCandidate(line);
    if (score > 0) score += Math.min(10, fillerCount);
  }
  return score;
};

export function detectMrzCandidateLines(ocrText = "") {
  const normalizedLines = normalizeOcrText(ocrText);
  const compact = cleanMrzChars(normalizedLines.join(""));
  const line1Candidates = [];
  const line2Candidates = [];
  const rawCandidates = [];
  const pushLine1Candidate = (line, index, raw = "", scoreBoost = 0) => {
    const initial = scoreTd3Line1Candidate(line, { raw });
    line1Candidates.push({
      line,
      index,
      raw,
      score: initial.score + scoreBoost,
      scoreBoost,
      line1Selection: initial,
    });
  };

  normalizedLines.forEach((line, index) => {
    lineWindows(line).forEach((candidate) => {
      const line1 = repairLine1(candidate);
      const line2 = repairLine2(candidate);
      rawCandidates.push(candidate, line1, line2);
      if (line1.startsWith("P<")) {
        pushLine1Candidate(line1, index, candidate);
      }
      line2Candidates.push({ line: line2, index, score: candidateScore(line2, false) });
    });
  });

  for (let start = compact.indexOf("P<"); start >= 0; start = compact.indexOf("P<", start + 1)) {
    const line1 = repairLine1(compact.slice(start, start + TD3_LINE_LENGTH));
    const line2 = repairLine2(compact.slice(start + TD3_LINE_LENGTH, start + TD3_LINE_LENGTH * 2));
    pushLine1Candidate(line1, -1, compact.slice(start, start + TD3_LINE_LENGTH), 12);
    line2Candidates.push({ line: line2, index: -1, score: candidateScore(line2, false) + 12 });
  }

  for (let start = compact.indexOf("P"); start >= 0; start = compact.indexOf("P", start + 1)) {
    const line1 = repairLine1(compact.slice(start, start + TD3_LINE_LENGTH));
    const line2 = repairLine2(compact.slice(start + TD3_LINE_LENGTH, start + TD3_LINE_LENGTH * 2));
    if (line1.startsWith("P<")) pushLine1Candidate(line1, -1, compact.slice(start, start + TD3_LINE_LENGTH), 6);
    line2Candidates.push({ line: line2, index: -1, score: candidateScore(line2, false) + 6 });
  }

  const issuerHints = unique(
    line1Candidates
      .map((item) => fixAlphaField(String(item.line || "").slice(2, 5)).toUpperCase())
      .filter((value) => /^[A-Z]{3}$/.test(value)),
  );
  issuerHints.forEach((issuerHint) => {
    normalizedLines.forEach((line, index) => {
      line2CandidateWindows(line, { issuerHint, ocrText }).forEach((candidate) => {
        line2Candidates.push({
          line: candidate.line,
          index,
          score: candidate.score + 10,
          recoverySource: candidate.recoverySource,
        });
      });
    });
    line2CandidateWindows(compact, { issuerHint, ocrText }).forEach((candidate) => {
      line2Candidates.push({
        line: candidate.line,
        index: -1,
        score: candidate.score + 6,
        recoverySource: candidate.recoverySource,
      });
    });
  });

  const line1Consensus = new Map();
  line1Candidates.forEach((item) => {
    const key = item.line1Selection?.nameKey || "";
    if (!key) return;
    line1Consensus.set(key, (line1Consensus.get(key) || 0) + 1);
  });
  line1Candidates.forEach((item) => {
    const key = item.line1Selection?.nameKey || "";
    const support = line1Consensus.get(key) || 1;
    const rescored = scoreTd3Line1Candidate(item.line, { raw: item.raw, consensusSupport: support });
    item.score = rescored.score + (item.scoreBoost || 0);
    item.line1Selection = rescored;
    item.consensusSupport = support;
  });

  const orderedLine1 = unique(line1Candidates.map((item) => item.line))
    .map((line) => line1Candidates.find((item) => item.line === line))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  const orderedLine2 = unique(line2Candidates.map((item) => item.line))
    .map((line) => line2Candidates.find((item) => item.line === line))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  let best = null;
  orderedLine1.forEach((first) => {
    orderedLine2.forEach((second) => {
      const distancePenalty = first.index >= 0 && second.index >= 0
        ? Math.abs(second.index - first.index - 1) * 8
        : 0;
      const parsed = parseTd3Mrz([first.line, second.line], { ocrText, source: "auto_mrz" });
      const score = first.score + second.score + parsed.confidence - distancePenalty - parsed.reviewReasons.length * 5;
      if (!best || score > best.score) {
        best = { line1: first.line, line2: second.line, score, parsed };
      }
    });
  });

  if (process.env.NODE_ENV !== "production") {
    console.debug("[MRZ line1 candidate selection]", {
      rawLine1Variants: line1Candidates.map((item) => item.raw || item.line),
      normalizedLine1Variants: line1Candidates.map((item) => item.line),
      candidates: line1Candidates
        .slice()
        .sort((a, b) => b.score - a.score)
        .map((item) => ({
          line: item.line,
          raw: item.raw,
          score: item.score,
          consensusSupport: item.consensusSupport || 1,
          surname: item.line1Selection?.surname || "",
          givenNames: item.line1Selection?.givenNames || "",
          reasons: item.line1Selection?.reasons || [],
        })),
      selectedLine1Candidate: best?.line1 || orderedLine1[0]?.line || "",
      rejectedCandidates: line1Candidates
        .filter((item) => item.line !== (best?.line1 || orderedLine1[0]?.line || ""))
        .map((item) => ({
          line: item.line,
          score: item.score,
          reasons: item.line1Selection?.reasons || [],
        })),
    });
  }

  if (best?.parsed?.fields && best.parsed.status !== MRZ_RESULT_STATUS.FAILED) {
    return {
      ok: true,
      lines: [best.line1, best.line2],
      parsed: best.parsed,
      normalizedLines,
      candidates: { line1: orderedLine1.slice(0, 5), line2: orderedLine2.slice(0, 5) },
    };
  }

  const bestLine1 = orderedLine1[0]?.line || rawCandidates.find((line) => repairLine1(line).startsWith("P<")) || "";
  const bestLine2 = orderedLine2[0]?.line || rawCandidates.find((line) => line !== bestLine1 && cleanMrzChars(line).length >= 30) || "";
  const error = !normalizedLines.length
    ? MRZ_REVIEW_REASONS.NO_MRZ_TEXT
    : bestLine1 || bestLine2
      ? MRZ_REVIEW_REASONS.PARSER_FAILED
      : MRZ_REVIEW_REASONS.NO_MRZ_TEXT;

  return {
    ok: false,
    error,
    lines: [bestLine1 ? repairLine1(bestLine1) : "", bestLine2 ? repairLine2(bestLine2) : ""],
    normalizedLines,
    candidates: { line1: orderedLine1.slice(0, 5), line2: orderedLine2.slice(0, 5) },
  };
}

const mrzCharValue = (char = "<") => {
  if (char === "<") return 0;
  if (/[0-9]/.test(char)) return Number(char);
  if (/[A-Z]/.test(char)) return char.charCodeAt(0) - 55;
  return 0;
};

export function computeMrzCheckDigit(value = "") {
  return String(value || "")
    .split("")
    .reduce((sum, char, index) => sum + mrzCharValue(char) * MRZ_WEIGHTS[index % MRZ_WEIGHTS.length], 0) % 10;
}

const isValidCalendarDate = (year, month, day) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const resolveMrzYear = (yy, { birth = false, month = 1, day = 1 } = {}) => {
  const now = new Date();
  let year = 2000 + yy;
  if (birth) {
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (candidate > now) year -= 100;
  } else if (year > now.getFullYear() + 20) {
    year -= 100;
  }
  return year;
};

const parseMrzDate = (value = "", { birth = false } = {}) => {
  const raw = fixNumericField(value);
  if (birth) {
    const yearOnly = raw.match(/^(\d{2})<{4}$/);
    if (yearOnly) {
      const yy = Number(yearOnly[1]);
      const year = resolveMrzYear(yy, { birth: true });
      return {
        raw,
        value: `${year}-01-01`,
        valid: true,
        partial: true,
        precision: "year",
        year,
        month: 1,
        day: 1,
        approximated: true,
        approximationRule: "unknown_day_month_set_to_01_01",
      };
    }

    const yearMonthOnly = raw.match(/^(\d{2})(\d{2})<{2}$/);
    if (yearMonthOnly) {
      const yy = Number(yearMonthOnly[1]);
      const month = Number(yearMonthOnly[2]);
      if (month >= 1 && month <= 12) {
        const year = resolveMrzYear(yy, { birth: true, month });
        return {
          raw,
          value: `${year}-${String(month).padStart(2, "0")}-01`,
          valid: true,
          partial: true,
          precision: "month",
          year,
          month,
          day: 1,
          approximated: true,
          approximationRule: "unknown_day_set_to_01",
        };
      }
    }
  }
  if (!/^\d{6}$/.test(raw)) return { raw, value: "", valid: false, partial: false, precision: "", approximated: false, approximationRule: "" };
  const yy = Number(raw.slice(0, 2));
  const month = Number(raw.slice(2, 4));
  const day = Number(raw.slice(4, 6));
  const year = resolveMrzYear(yy, { birth, month, day });
  if (!isValidCalendarDate(year, month, day)) return { raw, value: "", valid: false, partial: false, precision: "", approximated: false, approximationRule: "" };
  return {
    raw,
    value: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    valid: true,
    partial: false,
    precision: "full",
    year,
    month,
    day,
    approximated: false,
    approximationRule: "",
  };
};

const normalizeNameToken = (value = "") => normalizeUnicode(value).toUpperCase().replace(/[^A-Z]/g, "");
const artifactToken = /^[CLKI]{1,}$/;
const repeatedNameNoise = /([CLKI])\1{3,}/;
const artifactTail = /(?:CIC{3,}|C?L{3,}|K?L{3,}|C{3,}|K{3,}|I{3,}|[CLKI]{5,})$/;
const isolatedNoiseTail = /(?:C|CI|IC)$/;
const leadingSeparatorNoise = /^[CLKI]/;
const leadingSeparatorNoiseChars = new Set(["C", "K", "L", "I"]);

export function normalizeMrzLineForNameParsing(line = "") {
  let normalized = normalizeUnicode(line)
    .toUpperCase()
    .replace(/[«‹›>]/g, "<")
    .replace(/\s+/g, "<")
    .replace(/[^A-Z0-9<]/g, "");
  const passportStart = normalized.indexOf("P<");
  if (passportStart > 0) normalized = normalized.slice(passportStart);
  if (normalized[0] !== "P" && ["F", "R"].includes(normalized[0])) normalized = `P${normalized.slice(1)}`;
  if (normalized[0] === "P" && ["L", "I", "1"].includes(normalized[1])) normalized = `P<${normalized.slice(2)}`;
  if (normalized[0] === "P" && normalized[1] !== "<" && /^[A-Z]{3}/.test(normalized.slice(1, 4))) {
    normalized = `P<${normalized.slice(1)}`;
  }
  return normalized;
}

const hasValidCore = (value = "") => /^[A-Z]{2,}(?:\s+[A-Z]{2,})*$/.test(value);

export function removeTrailingFillerNoise(value = "") {
  let token = normalizeNameToken(value);
  const removed = [];
  if (!token) return { value: "", removedNoiseTail: "", removed, hadNoise: false, suspicious: false };
  if (artifactToken.test(token)) {
    return { value: "", removedNoiseTail: token, removed: [token], hadNoise: true, suspicious: true };
  }

  let changed = true;
  while (changed && token.length > 1) {
    changed = false;
    const repeatedTail = token.match(artifactTail);
    if (repeatedTail && token.length - repeatedTail[0].length >= 2) {
      token = token.slice(0, -repeatedTail[0].length);
      removed.push(repeatedTail[0]);
      changed = true;
      continue;
    }
    const isolatedTail = token.match(isolatedNoiseTail);
    if (isolatedTail && token.length - isolatedTail[0].length >= 3) {
      token = token.slice(0, -isolatedTail[0].length);
      removed.push(isolatedTail[0]);
      changed = true;
    }
  }

  if (!token || token.length < 2 || artifactToken.test(token)) {
    return {
      value: "",
      removedNoiseTail: removed.join(""),
      removed,
      hadNoise: removed.length > 0,
      suspicious: true,
    };
  }
  return {
    value: token,
    removedNoiseTail: removed.join(""),
    removed,
    hadNoise: removed.length > 0,
    suspicious: false,
  };
}

export function cleanMrzNamePart(value = "") {
  const chunks = String(value || "")
    .replace(/\s+/g, "<")
    .split(/<+/)
    .filter(Boolean);
  const tokens = [];
  const removedNoise = [];
  let suspicious = false;

  chunks.forEach((chunk) => {
    const cleaned = removeTrailingFillerNoise(chunk);
    if (cleaned.value) tokens.push(cleaned.value);
    if (cleaned.hadNoise) removedNoise.push(...cleaned.removed);
    if (cleaned.suspicious && !cleaned.value && !tokens.length) suspicious = true;
  });

  const valueClean = tokens.join(" ").replace(/\s+/g, " ").trim();
  return {
    value: valueClean,
    removedNoise,
    hadNoise: removedNoise.length > 0,
    suspicious: suspicious || (Boolean(valueClean) && !hasValidCore(valueClean)),
  };
}

const splitNameField = (nameField = "") => {
  const field = String(nameField || "");
  const exactMatches = [];
  for (let index = field.indexOf("<<"); index >= 0; index = field.indexOf("<<", index + 1)) {
    const left = cleanMrzNamePart(field.slice(0, index));
    const right = cleanMrzNamePart(field.slice(index + 2));
    if (left.value && right.value) {
      exactMatches.push({
        index,
        separatorLength: 2,
        strategy: "exact_double_filler",
        exactSeparator: true,
        rawSurnameCandidate: field.slice(0, index),
        rawGivenNameCandidate: field.slice(index + 2),
      });
    }
  }
  if (exactMatches.length) return exactMatches[0];

  for (let index = field.indexOf("<"); index >= 0; index = field.indexOf("<", index + 1)) {
    const left = cleanMrzNamePart(field.slice(0, index));
    const right = cleanMrzNamePart(field.slice(index + 1));
    if (left.value && right.value) {
      return {
        index,
        separatorLength: 1,
        strategy: "recovered_single_filler_or_space",
        exactSeparator: false,
        rawSurnameCandidate: field.slice(0, index),
        rawGivenNameCandidate: field.slice(index + 1),
      };
    }
  }

  const spaceLikeMatch = field.match(/^([A-Z]{2,})\s+([A-Z][A-Z<]+)$/);
  if (spaceLikeMatch) {
    return {
      index: spaceLikeMatch[1].length,
      separatorLength: field.slice(spaceLikeMatch[1].length).match(/^\s+/)?.[0]?.length || 1,
      strategy: "recovered_space",
      exactSeparator: false,
      rawSurnameCandidate: spaceLikeMatch[1],
      rawGivenNameCandidate: spaceLikeMatch[2],
    };
  }

  const compact = normalizeNameToken(field);
  const recoveredNoiseSeparators = [];
  for (let index = 2; index < compact.length - 3; index += 1) {
    const separator = compact[index];
    if (!leadingSeparatorNoiseChars.has(separator)) continue;
    const leftRaw = compact.slice(0, index);
    const rightRaw = compact.slice(index);
    const left = cleanMrzNamePart(leftRaw);
    const right = cleanRecoveredGivenNamePart(rightRaw, { forceContextual: true });
    if (!left.value || !right.value || !right.leadingNoiseRemoved) continue;
    if (isSuspiciousMrzName(left.value) || isSuspiciousMrzName(right.value)) continue;
    const leftScore = left.value.length >= 4 ? 8 : 0;
    const rightScore = right.value.length >= 4 ? 8 : 0;
    recoveredNoiseSeparators.push({
      index,
      separatorLength: 1,
      strategy: "recovered_separator_noise",
      exactSeparator: false,
      rawSurnameCandidate: leftRaw,
      rawGivenNameCandidate: rightRaw,
      score: leftScore + rightScore + Math.min(10, index),
    });
  }
  if (recoveredNoiseSeparators.length) {
    return recoveredNoiseSeparators.sort((a, b) => b.score - a.score)[0];
  }

  return {
    index: -1,
    separatorLength: 0,
    strategy: "not_found",
    exactSeparator: false,
    rawSurnameCandidate: field,
    rawGivenNameCandidate: "",
  };
};

const cleanRecoveredGivenNamePart = (value = "", {
  forceContextual = false,
  boundaryContext = "",
  debug = false,
} = {}) => {
  const initial = cleanMrzNamePart(value);
  let leadingNoiseRemoved = "";
  let cleaned = initial;
  const compact = normalizeNameToken(value);
  const contextualBoundary = forceContextual || Boolean(boundaryContext);
  const attempts = [];
  if (leadingSeparatorNoise.test(compact) && compact.length >= 4) {
    const prefixLengths = compact.length >= 5 ? [2, 1] : [1];
    for (const prefixLength of prefixLengths) {
      const prefix = compact.slice(0, prefixLength);
      if (!/^[CLKI]+$/.test(prefix)) continue;
      const withoutLead = compact.slice(prefixLength);
      if (withoutLead.length < 3) continue;
      const candidate = cleanMrzNamePart(withoutLead);
      const originalValid = !isSuspiciousMrzName(initial.value);
      const candidateValid = Boolean(candidate.value) && !isSuspiciousMrzName(candidate.value);
      const repeatedPrefix = prefixLength > 1 && /^([CLKI])\1+$/.test(prefix);
      const repeatedRecoveredToken = /^([A-Z])\1{3,}$/.test(withoutLead);
      const clearRecoveredNameStart = /^(?:AN|YA)[A-Z]{2,}/.test(withoutLead);
      const followingLooksLikeName = /^[AEIOUY][A-Z]{2,}/.test(withoutLead);
      const likelySeparatorNoise = contextualBoundary && (
        repeatedPrefix
        || repeatedRecoveredToken
        || clearRecoveredNameStart
        || forceContextual
        || !originalValid
        || (followingLooksLikeName && compact.length >= 7 && prefixLength > 1)
      );
      attempts.push({
        prefix,
        withoutLead,
        candidate: candidate.value,
        candidateValid,
        originalValid,
        repeatedPrefix,
        repeatedRecoveredToken,
        clearRecoveredNameStart,
        likelySeparatorNoise,
      });
      if (candidateValid && likelySeparatorNoise && (!originalValid || candidate.value.length >= 3 || repeatedPrefix || clearRecoveredNameStart)) {
        cleaned = {
          ...candidate,
          removedNoise: [prefix, ...(candidate.removedNoise || [])],
          hadNoise: true,
        };
        leadingNoiseRemoved = prefix;
        break;
      }
    }
  }
  if (process.env.NODE_ENV !== "production" && (debug || leadingNoiseRemoved)) {
    console.debug("[MRZ line1 given-name cleanup]", {
      rawGivenCandidate: value,
      compactGivenCandidate: compact,
      boundaryContext,
      contextual: contextualBoundary,
      attempts,
      leadingNoiseRemoved,
      finalGivenName: cleaned.value,
    });
  }
  return { ...cleaned, leadingNoiseRemoved };
};

function cleanGivenNamePartAfterSeparator(value = "", {
  forceContextual = false,
  boundaryContext = "",
  debug = false,
} = {}) {
  const raw = String(value || "");
  const fillerBoundary = raw.search(/<{2,}/);
  const primaryRaw = fillerBoundary >= 0 ? raw.slice(0, fillerBoundary) : raw;
  const contextAfterGivenCandidate = fillerBoundary >= 0 ? raw.slice(fillerBoundary) : "";
  let cleaned = cleanRecoveredGivenNamePart(primaryRaw || raw, {
    forceContextual,
    boundaryContext,
    debug: false,
  });
  const trailingNoiseAttempts = [];
  let trailingNoiseRemoved = "";
  const compact = normalizeNameToken(cleaned.value);
  const fillerNoiseContext = /<{2,}[CLKI<]*$/i.test(contextAfterGivenCandidate);

  if (fillerNoiseContext && compact.length >= 6 && /[CKL]$/.test(compact)) {
    const shortened = compact.slice(0, -1);
    const shortenedValid = shortened.length >= 4 && !isSuspiciousMrzName(shortened);
    const likelyTerminalNoise = /N$/.test(shortened) || /^[A-Z]{4,}(?:AN|NA|MA)$/.test(shortened);
    trailingNoiseAttempts.push({
      from: compact,
      to: shortened,
      removed: compact.slice(-1),
      fillerNoiseContext,
      shortenedValid,
      likelyTerminalNoise,
    });
    if (shortenedValid && likelyTerminalNoise) {
      trailingNoiseRemoved = compact.slice(-1);
      cleaned = {
        ...cleaned,
        value: shortened,
        removedNoise: [...(cleaned.removedNoise || []), trailingNoiseRemoved],
        hadNoise: true,
        suspicious: false,
      };
    }
  }

  if (process.env.NODE_ENV !== "production" && (debug || trailingNoiseRemoved || contextAfterGivenCandidate)) {
    console.debug("[MRZ line1 given-name cleanup]", {
      rawGivenCandidate: value,
      primaryGivenCandidate: primaryRaw,
      contextAfterGivenCandidate,
      trailingNoiseAttempts,
      trailingNoiseRemoved,
      consensusSupport: null,
      finalGivenName: cleaned.value,
    });
  }

  return {
    ...cleaned,
    contextAfterGivenCandidate,
    trailingNoiseRemoved,
  };
}

export function isSuspiciousMrzName(value = "") {
  const clean = normalizeUnicode(value).toUpperCase().replace(/\s+/g, " ").trim();
  if (!clean) return true;
  if (/[^A-Z\s'-]/.test(clean)) return true;
  const compact = clean.replace(/[\s'-]/g, "");
  if (compact.length < 2) return true;
  if (artifactToken.test(compact)) return true;
  if (repeatedNameNoise.test(compact)) return true;
  if (/\b[A-Z]\b/.test(clean)) return true;
  if (isolatedNoiseTail.test(compact)) return true;
  return false;
}

export function validateLatinName(value = "") {
  const clean = normalizeUnicode(value).toUpperCase().replace(/\s+/g, " ").trim();
  if (!clean) return { ok: false, reason: MRZ_REVIEW_REASONS.MISSING_REQUIRED_FIELD, cleaned: "" };
  if (isSuspiciousMrzName(clean)) return { ok: false, reason: MRZ_REVIEW_REASONS.SUSPICIOUS_NAME, cleaned: clean };
  return { ok: true, reason: "", cleaned: clean };
}

export function parseTd3NameLine(line1 = "") {
  const normalizedLine1 = normalizeMrzLineForNameParsing(line1);
  const repaired = repairLine1(normalizedLine1);
  const parsedLine = normalizedLine1.startsWith("P<") ? normalizedLine1 : repaired;
  const issues = [];
  if (!parsedLine.startsWith("P<") || parsedLine.length < 5) {
    issues.push(MRZ_REVIEW_REASONS.PARSER_FAILED);
    return {
      surname: "",
      givenNames: "",
      lastName: "",
      firstName: "",
      issues,
      diagnostics: {
        originalLine1: line1,
        normalizedLine1,
        nameField: "",
        separatorDetected: false,
        rawSurnameCandidate: "",
        rawGivenNameCandidate: "",
        cleanedSurname: "",
        cleanedGivenName: "",
        removedNoise: [],
        separatorStrategy: "not_found",
        exactSeparator: false,
        leadingSeparatorNoiseRemoved: "",
        trailingFillerNoiseRemoved: false,
        finalSurname: "",
        finalGivenNames: "",
        warnings: issues,
      },
    };
  }

  const nameField = parsedLine.slice(5);
  const separator = splitNameField(nameField);
  if (separator.index < 0) {
    const surname = cleanMrzNamePart(nameField);
    if (!surname.value) issues.push(MRZ_REVIEW_REASONS.MISSING_REQUIRED_FIELD);
    issues.push(MRZ_REVIEW_REASONS.PARTIAL_MRZ_READ);
    if (surname.suspicious && !surname.value) issues.push(MRZ_REVIEW_REASONS.SUSPICIOUS_NAME);
    const result = {
      surname: surname.value,
      givenNames: "",
      lastName: surname.value,
      firstName: "",
      issues: unique(issues),
      diagnostics: {
        originalLine1: line1,
        normalizedLine1,
        nameField,
        separatorDetected: false,
        rawSurnameCandidate: nameField,
        rawGivenNameCandidate: "",
        cleanedSurname: surname.value,
        cleanedGivenName: "",
        removedNoise: surname.removedNoise,
        separatorStrategy: separator.strategy,
        exactSeparator: false,
        leadingSeparatorNoiseRemoved: "",
        trailingFillerNoiseRemoved: surname.hadNoise,
        finalSurname: surname.value,
        finalGivenNames: "",
        warnings: unique(issues),
      },
    };
    logNameParser(result.diagnostics);
    return result;
  }

  const {
    rawSurnameCandidate,
    rawGivenNameCandidate,
    strategy: separatorStrategy,
    exactSeparator,
  } = separator;
  const surname = cleanMrzNamePart(rawSurnameCandidate);
  const givenNames = cleanGivenNamePartAfterSeparator(rawGivenNameCandidate, {
    forceContextual: separatorStrategy === "recovered_separator_noise",
    boundaryContext: exactSeparator ? "exact_double_filler_boundary" : separatorStrategy,
    debug: true,
  });
  if (!surname.value || !givenNames.value) issues.push(MRZ_REVIEW_REASONS.MISSING_REQUIRED_FIELD);
  if ((surname.suspicious && !surname.value) || (givenNames.suspicious && !givenNames.value)) {
    issues.push(MRZ_REVIEW_REASONS.SUSPICIOUS_NAME);
  }

  [surname.value, givenNames.value].forEach((name) => {
    const validation = validateLatinName(name);
    if (!validation.ok && validation.reason === MRZ_REVIEW_REASONS.SUSPICIOUS_NAME) {
      issues.push(MRZ_REVIEW_REASONS.SUSPICIOUS_NAME);
    }
  });

  const result = {
    surname: surname.value,
    givenNames: givenNames.value,
    lastName: surname.value,
    firstName: givenNames.value,
    issues: unique(issues),
    diagnostics: {
      originalLine1: line1,
      normalizedLine1,
      nameField,
      separatorDetected: true,
      rawSurnameCandidate,
      rawGivenNameCandidate,
      cleanedSurname: surname.value,
      cleanedGivenName: givenNames.value,
      removedNoise: [...surname.removedNoise, ...givenNames.removedNoise],
      separatorStrategy,
      exactSeparator,
      leadingSeparatorNoiseRemoved: givenNames.leadingNoiseRemoved || "",
      trailingGivenNameNoiseRemoved: givenNames.trailingNoiseRemoved || "",
      contextAfterGivenCandidate: givenNames.contextAfterGivenCandidate || "",
      trailingFillerNoiseRemoved: Boolean(surname.hadNoise || givenNames.hadNoise),
      finalSurname: surname.value,
      finalGivenNames: givenNames.value,
      warnings: unique(issues),
    },
  };
  logNameParser(result.diagnostics);
  return result;
}

export const parseMrzNameLine = parseTd3NameLine;

const logNameParser = (diagnostics) => {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[MRZ line1 parser]", diagnostics);
  }
};

const logLine2Parser = (diagnostics) => {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[MRZ line2 parser]", diagnostics);
  }
};

const logFixedPositions = (diagnostics) => {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[MRZ fixed positions]", diagnostics);
  }
};

const logFinalMrzDecision = (diagnostics) => {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[MRZ final row decision]", diagnostics);
  }
};

const logFinalFields = (diagnostics) => {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[MRZ final fields]", diagnostics);
  }
};

const logRecoveryDecision = (diagnostics) => {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[MRZ recovery decision]", diagnostics);
  }
};

const buildCheck = (value, actual) => {
  const expected = String(computeMrzCheckDigit(value));
  return {
    value,
    expected,
    actual: String(actual || ""),
    valid: expected === String(actual || ""),
  };
};

const parseTd3Line2Fixed = (rawLine2 = "", { issuerHint = "", ocrText = "", visualPassportCandidates = [] } = {}) => {
  const selected = selectBestTd3Line2Candidate(rawLine2, { issuerHint, ocrText, visualPassportCandidates });
  const selectedLine = selected.line;
  const line = selectedLine;
  const passportField = line.slice(0, 9);
  const fixedPassportNumber = passportField.replace(/<+$/g, "").toUpperCase();
  const fixedNationality = line.slice(10, 13).toUpperCase();
  const birthRaw = fixNumericField(line.slice(13, 19));
  const sexRaw = line[20];
  const expiryRaw = fixNumericField(line.slice(21, 27));
  const birthDate = parseMrzDate(birthRaw, { birth: true });
  const expiryDate = parseMrzDate(expiryRaw, { birth: false });
  const fixedGender = sexRaw === "M" || sexRaw === "F" ? sexRaw : "";
  const checks = {
    passportNumberCheck: buildCheck(passportField, line[9]),
    birthDateCheck: buildCheck(birthRaw, line[19]),
    expiryDateCheck: buildCheck(expiryRaw, line[27]),
    optionalDataCheck: buildCheck(line.slice(28, 42), line[42]),
    compositeCheck: buildCheck(`${line.slice(0, 10)}${line.slice(13, 20)}${line.slice(21, 43)}`, line[43]),
  };
  const passportSelection = selectPassportNumberCandidate({
    passportField,
    passportCheck: line[9],
    visualPassportCandidates,
  });
  const normalizedIssuerHint = String(issuerHint || "").toUpperCase();
  const normalizedRawLine2 = cleanMrzChars(rawLine2);
  const issuerMismatchWithIssuerVisible = Boolean(
    normalizedIssuerHint
    && /^[A-Z]{3}$/.test(normalizedIssuerHint)
    && normalizedRawLine2.includes(normalizedIssuerHint)
    && fixedNationality !== normalizedIssuerHint
  );
  const moroccanIssuerMismatch = normalizedIssuerHint === "MAR" && fixedNationality !== "MAR";
  const anchorReconstructedFromVisual = selected.recoverySource === "anchor_reconstructed_visual_passport";
  const structureReliable = Boolean(
    /^[A-Z0-9<]{44}$/.test(line)
    && /^[A-Z0-9]{3,9}$/.test(passportSelection.value)
    && /^[A-Z]{3}$/.test(fixedNationality)
    && birthDate.valid
    && expiryDate.valid
    && fixedGender
    && selected.score >= 35
    && (!anchorReconstructedFromVisual || (checks.birthDateCheck.valid && checks.expiryDateCheck.valid))
    && !issuerMismatchWithIssuerVisible
    && !moroccanIssuerMismatch
  );
  const passportNumber = structureReliable ? passportSelection.value : "";
  const nationality = structureReliable ? fixedNationality : "";
  const gender = structureReliable ? fixedGender : "";
  const exposedBirthDate = structureReliable ? birthDate : { ...birthDate, value: "", valid: false };
  const exposedExpiryDate = structureReliable ? expiryDate : { ...expiryDate, value: "", valid: false };
  const fixedPositionLog = {
    selectedLine2: line,
    passportNumber: line.slice(0, 9),
    passportCheck: line[9] || "",
    selectedPassportNumber: passportSelection.value,
    passportNumberSource: passportSelection.source,
    nationality: line.slice(10, 13),
    birthDate: line.slice(13, 19),
    birthDatePrecision: birthDate.precision || "",
    birthYear: birthDate.year || "",
    birthDateApproximated: Boolean(birthDate.approximated),
    birthDateApproximationRule: birthDate.approximationRule || "",
    birthCheck: line[19] || "",
    gender: line[20] || "",
    expiryDate: line.slice(21, 27),
    expiryCheck: line[27] || "",
    reliable: structureReliable,
    reliabilityReason: structureReliable
      ? "fixed_position_structure_ok"
      : issuerMismatchWithIssuerVisible
        ? "issuer_hint_visible_but_fixed_nationality_mismatch"
        : moroccanIssuerMismatch
          ? "moroccan_issuer_requires_mar_nationality"
        : "line2_failed_fixed_position_reliability",
  };
  logFixedPositions(fixedPositionLog);
  const diagnostics = {
    rawLine2,
    normalizedLine2: normalizedRawLine2,
    candidateWindowsTested: selected.candidates || [],
    selected44CharLine: selectedLine,
    selectedScore: selected.score,
    correctedLine2: line,
    reliable: structureReliable,
    reliabilityReason: fixedPositionLog.reliabilityReason,
    issuerHint: normalizedIssuerHint,
    issuerMismatchWithIssuerVisible,
    moroccanIssuerMismatch,
    selectedSource: selected.recoverySource || "unknown",
    visualPassportCandidates,
    passportNumberSelection: passportSelection,
    fixedPositionSlices: fixedPositionLog,
    birthDate: {
      raw: birthDate.raw,
      value: birthDate.value,
      valid: birthDate.valid,
      partial: Boolean(birthDate.partial),
      precision: birthDate.precision || "",
      year: birthDate.year || null,
      month: birthDate.month || null,
      day: birthDate.day || null,
      approximated: Boolean(birthDate.approximated),
      approximationRule: birthDate.approximationRule || "",
      warning: birthDate.partial ? MRZ_REVIEW_REASONS.PARTIAL_BIRTH_DATE : "",
    },
    fixedPositions: {
      passportNumberField: { start: 0, end: 8, value: passportField },
      passportNumberCheckDigit: { index: 9, value: line[9] },
      nationality: { start: 10, end: 12, value: fixedNationality },
      birthDate: { start: 13, end: 18, value: birthRaw },
      birthDateCheckDigit: { index: 19, value: line[19] },
      sex: { index: 20, value: sexRaw },
      expiryDate: { start: 21, end: 26, value: expiryRaw },
      expiryDateCheckDigit: { index: 27, value: line[27] },
      optionalData: { start: 28, end: 41, value: line.slice(28, 42) },
      optionalDataCheckDigit: { index: 42, value: line[42] },
      compositeCheckDigit: { index: 43, value: line[43] },
    },
    passportFieldCorrection: {
      corrected: passportSelection.value !== fixedPassportNumber,
      corrections: passportSelection.value !== fixedPassportNumber ? [{
        from: fixedPassportNumber,
        to: passportSelection.value,
        source: passportSelection.source,
        reason: passportSelection.reason,
      }] : [],
    },
    fieldSources: {
      passportNumber: passportSelection.source,
      nationality: selected.recoverySource || "mrz_line2",
      birthDate: selected.recoverySource || "mrz_line2",
      gender: selected.recoverySource || "mrz_line2",
      expiryDate: selected.recoverySource || "mrz_line2",
    },
    parsedFields: {
      passportNumber,
      nationality,
      birthDate: exposedBirthDate.value,
      birthDateRaw: exposedBirthDate.raw,
      birthDatePrecision: exposedBirthDate.precision || "",
      birthYear: exposedBirthDate.year || null,
      birthMonth: exposedBirthDate.month || null,
      birthDay: exposedBirthDate.day || null,
      birthDateApproximated: Boolean(exposedBirthDate.approximated),
      birthDateApproximationRule: exposedBirthDate.approximationRule || "",
      sex: gender,
      expiryDate: exposedExpiryDate.value,
    },
    checkDigitResults: checks,
  };
  logLine2Parser(diagnostics);
  logRecoveryDecision({
    rawOcrTexts: [rawLine2],
    line2Candidates: selected.candidates || [],
    all44CharacterWindowsTested: selected.candidates || [],
    candidateScores: (selected.candidates || []).map((candidate) => ({
      line: candidate.line,
      score: candidate.score,
      fixedSlices: candidate.fixedSlices,
      rejectionReasons: candidate.rejectionReasons || [],
    })),
    selectedCandidate: selectedLine,
    parsedFixedPositionFields: diagnostics.parsedFields,
    checksumResults: checks,
    finalFields: {
      passportNumber,
      nationality,
      birthDate: exposedBirthDate.value,
      birthDateRaw: exposedBirthDate.raw,
      birthDatePrecision: exposedBirthDate.precision || "",
      birthYear: exposedBirthDate.year || null,
      birthMonth: exposedBirthDate.month || null,
      birthDay: exposedBirthDate.day || null,
      birthDateApproximated: Boolean(exposedBirthDate.approximated),
      birthDateApproximationRule: exposedBirthDate.approximationRule || "",
      gender,
      expiryDate: exposedExpiryDate.value,
    },
    safeModeClearedFields: !structureReliable,
    safeModeReason: structureReliable ? "" : fixedPositionLog.reliabilityReason,
  });
  return {
    line,
    selectedLine,
    passportField,
    passportNumber,
    nationality,
    birthRaw,
    birthDate: exposedBirthDate,
    gender,
    sexRaw,
    expiryRaw,
    expiryDate: exposedExpiryDate,
    checks,
    reliable: structureReliable,
    diagnostics,
  };
};

const addFieldWarning = (warnings, field, reason) => {
  if (!field || !reason) return;
  warnings[field] = unique([...(warnings[field] || []), reason]);
};

const missingFieldWarnings = (fields, warnings, reasons, { allowPartialBirthDate = false } = {}) => {
  [
    ["lastNameLatin", "lastNameLatin"],
    ["firstNameLatin", "firstNameLatin"],
    ["passportNumber", "passportNumber"],
    ["nationality", "nationality"],
    ["birthDate", "birthDate"],
    ["expiryDate", "expiryDate"],
    ["gender", "gender"],
  ].forEach(([field, warningField]) => {
    if (field === "birthDate" && allowPartialBirthDate) return;
    if (!String(fields[field] || "").trim()) {
      reasons.add(MRZ_REVIEW_REASONS.MISSING_REQUIRED_FIELD);
      addFieldWarning(warnings, warningField, MRZ_REVIEW_REASONS.MISSING_REQUIRED_FIELD);
    }
  });
};

const calculateConfidence = ({ exactLength, nameOk, checks, reasons }) => {
  let confidence = 45;
  if (exactLength) confidence += 10;
  if (nameOk) confidence += 15;
  if (checks.passportNumberCheck?.valid) confidence += 10;
  if (checks.birthDateCheck?.valid) confidence += 10;
  if (checks.expiryDateCheck?.valid) confidence += 10;
  if (checks.compositeCheck?.valid) confidence += 8;
  if (reasons.has(MRZ_REVIEW_REASONS.CHECKSUM_FAILED)) confidence -= 18;
  if (reasons.has(MRZ_REVIEW_REASONS.SUSPICIOUS_NAME)) confidence -= 25;
  if (reasons.has(MRZ_REVIEW_REASONS.PARTIAL_MRZ_READ)) confidence -= 15;
  if (reasons.has(MRZ_REVIEW_REASONS.MISSING_REQUIRED_FIELD)) confidence -= 30;
  if (reasons.has(MRZ_REVIEW_REASONS.INVALID_DATE)) confidence -= 12;
  return clamp(Math.round(confidence), 0, 100);
};

export function parseTd3Mrz(lines = [], options = {}) {
  const source = options.source || "auto_mrz";
  const inputLines = Array.isArray(lines) ? lines : [lines, options.line2];
  const rawLine1 = inputLines[0] || "";
  const rawLine2 = inputLines[1] || "";
  const rawClean1 = cleanMrzChars(rawLine1);
  const rawClean2 = cleanMrzChars(rawLine2);
  const reasons = new Set();
  const fieldWarnings = {};

  if (!rawClean1 && !rawClean2) {
    return {
      source,
      status: MRZ_RESULT_STATUS.FAILED,
      confidence: 0,
      fields: {
        lastNameLatin: "",
        firstNameLatin: "",
        passportNumber: "",
        nationality: "",
        birthDate: "",
        gender: "",
        expiryDate: "",
      },
      checks: {},
      reviewReasons: [MRZ_REVIEW_REASONS.NO_MRZ_TEXT],
      fieldWarnings,
      raw: { ocrText: options.ocrText || "", mrzLines: [], line1: "", line2: "", inputLines },
    };
  }

  if (rawClean1.length !== TD3_LINE_LENGTH || rawClean2.length !== TD3_LINE_LENGTH) {
    reasons.add(MRZ_REVIEW_REASONS.PARTIAL_MRZ_READ);
  }

  const line1 = repairLine1(rawLine1);
  const issuerHint = line1.startsWith("P<") ? fixAlphaField(line1.slice(2, 5)).toUpperCase() : "";
  const visualPassportCandidates = collectVisualPassportNumberCandidates(options.ocrText || "");
  const line2Parsed = parseTd3Line2Fixed(rawLine2, { issuerHint, ocrText: options.ocrText || "", visualPassportCandidates });
  const line2 = line2Parsed.line;
  if (!line1.startsWith("P<")) reasons.add(MRZ_REVIEW_REASONS.PARSER_FAILED);
  if (!line2Parsed.reliable) reasons.add(MRZ_REVIEW_REASONS.PARTIAL_MRZ_READ);

  const name = parseMrzNameLine(line1);
  name.issues.forEach((issue) => reasons.add(issue));

  const {
    passportNumber,
    nationality,
    birthDate,
    expiryDate,
    gender,
    checks,
  } = line2Parsed;

  if (line2Parsed.reliable) {
    Object.entries(checks).forEach(([checkName, check]) => {
      if (checkName === "optionalDataCheck" && check?.actual === "<") return;
      if (check && !check.valid) reasons.add(MRZ_REVIEW_REASONS.CHECKSUM_FAILED);
    });
  }

  if (line2Parsed.reliable && birthDate.partial) {
    reasons.add(MRZ_REVIEW_REASONS.PARTIAL_BIRTH_DATE);
    addFieldWarning(fieldWarnings, "birthDate", MRZ_REVIEW_REASONS.PARTIAL_BIRTH_DATE);
  } else if (line2Parsed.reliable && !birthDate.valid) {
    reasons.add(MRZ_REVIEW_REASONS.INVALID_DATE);
    addFieldWarning(fieldWarnings, "birthDate", MRZ_REVIEW_REASONS.INVALID_DATE);
  }
  if (line2Parsed.reliable && !expiryDate.valid) {
    reasons.add(MRZ_REVIEW_REASONS.INVALID_DATE);
    addFieldWarning(fieldWarnings, "expiryDate", MRZ_REVIEW_REASONS.INVALID_DATE);
  }
  if (!passportNumber || !/^[A-Z0-9]{3,9}$/.test(passportNumber)) {
    reasons.add(MRZ_REVIEW_REASONS.INVALID_PASSPORT_NUMBER);
    addFieldWarning(fieldWarnings, "passportNumber", MRZ_REVIEW_REASONS.INVALID_PASSPORT_NUMBER);
  }
  if (!/^[A-Z]{3}$/.test(nationality)) {
    reasons.add(MRZ_REVIEW_REASONS.MISSING_REQUIRED_FIELD);
    addFieldWarning(fieldWarnings, "nationality", MRZ_REVIEW_REASONS.MISSING_REQUIRED_FIELD);
  }

  const fields = {
    lastNameLatin: name.surname || "",
    firstNameLatin: name.givenNames || "",
    passportNumber,
    nationality,
    birthDate: birthDate.value,
    birthDateRaw: birthDate.raw,
    birthDatePrecision: birthDate.precision || "",
    birthYear: birthDate.year || null,
    birthMonth: birthDate.month || null,
    birthDay: birthDate.day || null,
    birthDateApproximated: Boolean(birthDate.approximated),
    birthDateApproximationRule: birthDate.approximationRule || "",
    gender,
    expiryDate: expiryDate.value,
  };

  const lastValidation = validateLatinName(fields.lastNameLatin);
  const firstValidation = validateLatinName(fields.firstNameLatin);
  if (!lastValidation.ok) {
    reasons.add(lastValidation.reason);
    addFieldWarning(fieldWarnings, "lastNameLatin", lastValidation.reason);
  }
  if (!firstValidation.ok) {
    reasons.add(firstValidation.reason);
    addFieldWarning(fieldWarnings, "firstNameLatin", firstValidation.reason);
  }
  if (reasons.has(MRZ_REVIEW_REASONS.SUSPICIOUS_NAME)) {
    if (!fieldWarnings.lastNameLatin?.length) addFieldWarning(fieldWarnings, "lastNameLatin", MRZ_REVIEW_REASONS.SUSPICIOUS_NAME);
    if (!fieldWarnings.firstNameLatin?.length) addFieldWarning(fieldWarnings, "firstNameLatin", MRZ_REVIEW_REASONS.SUSPICIOUS_NAME);
  }
  if (line2Parsed.reliable && !checks.passportNumberCheck.valid) addFieldWarning(fieldWarnings, "passportNumber", MRZ_REVIEW_REASONS.CHECKSUM_FAILED);
  if (line2Parsed.reliable && !checks.birthDateCheck.valid) addFieldWarning(fieldWarnings, "birthDate", MRZ_REVIEW_REASONS.CHECKSUM_FAILED);
  if (line2Parsed.reliable && !checks.expiryDateCheck.valid) addFieldWarning(fieldWarnings, "expiryDate", MRZ_REVIEW_REASONS.CHECKSUM_FAILED);

  missingFieldWarnings(fields, fieldWarnings, reasons, {
    allowPartialBirthDate: Boolean(line2Parsed.reliable && birthDate.valid && birthDate.partial),
  });
  const confidence = calculateConfidence({
    exactLength: rawClean1.length === TD3_LINE_LENGTH && rawClean2.length === TD3_LINE_LENGTH,
    nameOk: lastValidation.ok && firstValidation.ok,
    checks,
    reasons,
  });
  if (confidence > 0 && confidence < 70) reasons.add(MRZ_REVIEW_REASONS.LOW_CONFIDENCE);

  const reviewReasons = unique(Array.from(reasons));
  const requiredMissing = reviewReasons.includes(MRZ_REVIEW_REASONS.MISSING_REQUIRED_FIELD);
  const parserFailedOnly = reviewReasons.includes(MRZ_REVIEW_REASONS.PARSER_FAILED) && !fields.passportNumber && !fields.lastNameLatin && !fields.firstNameLatin;
  const status = parserFailedOnly
    ? MRZ_RESULT_STATUS.FAILED
    : reviewReasons.length || requiredMissing
      ? MRZ_RESULT_STATUS.NEEDS_REVIEW
      : MRZ_RESULT_STATUS.READY;

  const result = {
    source,
    status,
    confidence,
    fields,
    checks,
    reviewReasons,
    fieldWarnings,
    diagnostics: {
      line1: name.diagnostics || {},
      line2: line2Parsed.diagnostics || {},
    },
    raw: {
      ocrText: options.ocrText || "",
      mrzLines: [line1, line2],
      line1,
      line2,
      inputLines,
    },
  };
  logFinalMrzDecision({
    source,
    status,
    confidence,
    reviewReasons,
    fieldWarnings,
    fields,
    checks,
    line1Diagnostics: name.diagnostics || {},
    line2Diagnostics: line2Parsed.diagnostics || {},
  });
  logFinalFields({
    passportNumber: fields.passportNumber,
    nationality: fields.nationality,
    birthDate: fields.birthDate,
    birthDateRaw: fields.birthDateRaw,
    birthDatePrecision: fields.birthDatePrecision,
    birthYear: fields.birthYear,
    birthDateApproximated: fields.birthDateApproximated,
    birthDateApproximationRule: fields.birthDateApproximationRule,
    gender: fields.gender,
    expiryDate: fields.expiryDate,
    fieldSources: {
      passportNumber: line2Parsed.reliable ? line2Parsed.diagnostics?.fieldSources?.passportNumber || "mrz_line2" : "empty_unreliable_line2",
      nationality: line2Parsed.reliable ? line2Parsed.diagnostics?.selectedSource || "mrz_line2" : "empty_unreliable_line2",
      birthDate: line2Parsed.reliable ? line2Parsed.diagnostics?.selectedSource || "mrz_line2" : "empty_unreliable_line2",
      gender: line2Parsed.reliable ? line2Parsed.diagnostics?.selectedSource || "mrz_line2" : "empty_unreliable_line2",
      expiryDate: line2Parsed.reliable ? line2Parsed.diagnostics?.selectedSource || "mrz_line2" : "empty_unreliable_line2",
    },
    warnings: fieldWarnings,
    reviewReasons,
  });
  return result;
}

export function buildReviewResult(parsed = {}, overrides = {}) {
  const result = parsed.fields ? parsed : parseTd3Mrz(overrides.lines || [], overrides);
  return {
    ...result,
    source: overrides.source || result.source || "auto_mrz",
  };
}

export function buildPassportMrzResult({ ocrText = "", source = "auto_mrz" } = {}) {
  const candidate = detectMrzCandidateLines(ocrText);
  if (!candidate.ok) {
    const parsed = parseTd3Mrz(candidate.lines || [], { ocrText, source });
    const reasons = unique([candidate.error, ...(parsed.reviewReasons || [])]);
    return {
      ...parsed,
      source,
      status: parsed.status === MRZ_RESULT_STATUS.READY ? MRZ_RESULT_STATUS.NEEDS_REVIEW : parsed.status,
      reviewReasons: reasons.length ? reasons : [MRZ_REVIEW_REASONS.NO_MRZ_TEXT],
      raw: {
        ...parsed.raw,
        ocrText,
        normalizedLines: candidate.normalizedLines || [],
      },
    };
  }
  return {
    ...candidate.parsed,
    source,
    raw: {
      ...candidate.parsed.raw,
      ocrText,
      normalizedLines: candidate.normalizedLines || [],
      mrzLines: candidate.lines,
      line1: candidate.lines[0],
      line2: candidate.lines[1],
    },
  };
}

export function runPassportMrzEngineSelfTests() {
  const nameCases = [
    ["P<MARAAAAAA<<BBBBBB<<<<<<<<<<<<", "AAAAAA", "BBBBBB"],
    ["P<MARAAAAAA<BBBBBB<<<<<<<<<<<<", "AAAAAA", "BBBBBB"],
    ["P<MARAAAAAA KBBBBBB<<<<<<<<<<<<", "AAAAAA", "BBBBBB"],
    ["P<MARAAAAAA<<BBBBBBCLLLLLLL", "AAAAAA", "BBBBBB"],
    ["P<MARAAAAAA BBBBBB<<<<<<<<<<<<", "AAAAAA", "BBBBBB"],
    ["P<MARAAAAAACBBBBBB<<<<<<<<<<<<", "AAAAAA", "BBBBBB"],
    ["P<MARLAMINE<<YAMINA<<<<<<<<<<<<<<<<<<<<", "LAMINE", "YAMINA"],
    ["P<MARMOSSADEK<<ANASS<<<<<<<<<<<<<<<<<<<<<<<<", "MOSSADEK", "ANASS"],
    ["P<MARMOSSADEK<<CCANASS<<<<<<<<<<<<<<<<<<<<<<<<", "MOSSADEK", "ANASS"],
    ["P<MARMOSSADEK<<CANASS<<<<<<<<<<<<<<<<<<<<<<<<", "MOSSADEK", "ANASS"],
    ["P<MARLAMINE<<KYAMINA<<<<<<<<<<<<<<<<<<<<<<<<<", "LAMINE", "YAMINA"],
    ["P<MARABOUKAL<<ALI<<<<<<<<<<<<<<<<<<<<", "ABOUKAL", "ALI"],
    ["P<MARABASSI<<BRAHIM<<<<<<<<<<<<<<<<<<", "ABASSI", "BRAHIM"],
    ["P<MARLAMINE<<YAMINACLLLLLLLLLLLL", "LAMINE", "YAMINA"],
    ["P<MARABASSI<<BRAHIM CLLLLLLLLLL", "ABASSI", "BRAHIM"],
    ["P<MARAFIR<<CHAKIMACICCCCC", "AFIR", "CHAKIMA"],
    ["P<MARAGLAGAL<<HASSAN<<<<<<<<<<<<", "AGLAGAL", "HASSAN"],
    ["P<MARAGLAGAL<<HASSAN<<<LCKLLLLLL", "AGLAGAL", "HASSAN"],
    ["P<MARAGLAGAL<<HASSANK<<<LLLLLL", "AGLAGAL", "HASSAN"],
  ];
  const rejectCases = ["CCLLLLLLLLLLLL", "KCCCCLCLLCL", "C", "L", "CI"];
  const parsedNames = nameCases.map(([line1, surname, givenNames]) => {
    const parsed = parseTd3NameLine(line1);
    return {
      line1,
      expected: { surname, givenNames },
      actual: { surname: parsed.surname, givenNames: parsed.givenNames },
      ok: parsed.surname === surname && parsed.givenNames === givenNames,
      removedNoise: parsed.diagnostics?.removedNoise || [],
      issues: parsed.issues || [],
    };
  });
  const rejectedNames = rejectCases.map((value) => {
    const validation = validateLatinName(value);
    return { value, ok: !validation.ok, validation };
  });
  const line2Cases = [
    ["D043796745MAR7903247M3010105JE157982<<<<<34", {
      passportNumber: "D04379674",
      nationality: "MAR",
      birthDate: "1979-03-24",
      birthDatePrecision: "full",
      birthDateApproximated: false,
      gender: "M",
      expiryDate: "2030-10-10",
    }, {}],
    ["D043796745MAR7903247M3010105JE157982<<<<<<34", {
      passportNumber: "D04379674",
      nationality: "MAR",
      birthDate: "1979-03-24",
      gender: "M",
      expiryDate: "2030-10-10",
    }, {}],
    ["QG40976240MAR88<<<<0M2803102JB398402<<<<<64", {
      passportNumber: "QG4097624",
      nationality: "MAR",
      birthDate: "1988-01-01",
      birthDateRaw: "88<<<<",
      birthDatePrecision: "year",
      birthYear: 1988,
      birthDateApproximated: true,
      birthDateApproximationRule: "unknown_day_month_set_to_01_01",
      gender: "M",
      expiryDate: "2028-03-10",
    }, {}],
    ["7903247M3010105JE157982", {
      passportNumber: "D04379674",
      nationality: "MAR",
      birthDate: "1979-03-24",
      gender: "M",
      expiryDate: "2030-10-10",
    }, { ocrText: "D04379674 7903247M3010105JE157982" }],
    ["0437967645MAR7903247M3010105JE157982<<<<<34", {
      passportNumber: "D04379674",
      nationality: "MAR",
      birthDate: "1979-03-24",
      gender: "M",
      expiryDate: "2030-10-10",
    }, { ocrText: "D04379674 0437967645MAR7903247M3010105JE157982<<<<<34" }],
    ["D04A3796745MAR7903247M3010105JE157982<<<<<34", {
      passportNumber: "D04379674",
      nationality: "MAR",
      birthDate: "1979-03-24",
      gender: "M",
      expiryDate: "2030-10-10",
    }, { ocrText: "D04A3796745MAR7903247M3010105JE157982<<<<<34" }],
    ["04A3796745MAR7903247M3010105JE157982<<<<<34", {
      passportNumber: "D04379674",
      nationality: "MAR",
      birthDate: "1979-03-24",
      gender: "M",
      expiryDate: "2030-10-10",
    }, { ocrText: "D04379674 04A3796745MAR7903247M3010105JE157982<<<<<34" }],
  ].map(([line2, expected, options = {}]) => {
    const parsed = parseTd3Mrz(["P<MARTEST<<TEST<<<<<<<<<<<<<<<<<<<<<<<<<<<<", line2], options);
    return {
      line2,
      expected,
      actual: parsed.fields,
      ok: Object.entries(expected).every(([key, value]) => parsed.fields?.[key] === value),
      checks: parsed.checks,
      diagnostics: parsed.diagnostics?.line2,
    };
  });
  const rejectedLine2Cases = [
    "4L3796765ART7103247M3010105MAR57982<<<<<34",
  ].map((line2) => {
    const parsed = parseTd3Mrz(["P<MARTEST<<TEST<<<<<<<<<<<<<<<<<<<<<<<<<<<<", line2], {
      ocrText: "D04379674 4L3796765ART7103247M3010105MAR57982<<<<<34",
    });
    return {
      line2,
      ok: !parsed.fields.passportNumber && !parsed.fields.nationality && !parsed.fields.birthDate,
      actual: parsed.fields,
      diagnostics: parsed.diagnostics?.line2,
    };
  });
  const line1SelectionCases = [
    {
      ocrText: [
        "PIUMARAGCAGALCIHASANCCCACLCOC<0<<C<",
        "P<MARAGLAGAL<<HASSAN<<<LCKLLLLLL",
        "D043796745MAR7903247M3010105JE157982<<<<<<34",
      ].join("\n"),
      expected: { lastNameLatin: "AGLAGAL", firstNameLatin: "HASSAN" },
    },
  ].map((item) => {
    const detected = detectMrzCandidateLines(item.ocrText);
    const fields = detected.parsed?.fields || {};
    return {
      expected: item.expected,
      actual: {
        lastNameLatin: fields.lastNameLatin || "",
        firstNameLatin: fields.firstNameLatin || "",
      },
      selectedLine1: detected.lines?.[0] || "",
      ok: fields.lastNameLatin === item.expected.lastNameLatin && fields.firstNameLatin === item.expected.firstNameLatin,
    };
  });
  return {
    ok: parsedNames.every((item) => item.ok) && rejectedNames.every((item) => item.ok) && line2Cases.every((item) => item.ok) && rejectedLine2Cases.every((item) => item.ok) && line1SelectionCases.every((item) => item.ok),
    parsedNames,
    rejectedNames,
    line2Cases,
    rejectedLine2Cases,
    line1SelectionCases,
  };
}
