import { parseMRZDetailed } from "./mrzReader";
import {
  MRZ_RESULT_STATUS,
  correctTd3Line2Ambiguities,
  parseTd3Mrz,
} from "./passportMrzEngine";
import { SYNTHETIC_TD3 } from "./__fixtures__/syntheticTd3";

const replaceAt = (value, index, replacement) => `${value.slice(0, index)}${replacement}${value.slice(index + 1)}`;

describe("strict synthetic TD3 parsing", () => {
  let debugSpy;

  beforeEach(() => {
    debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    debugSpy.mockRestore();
  });

  test("extracts the passport number and dates from fixed TD3 positions", () => {
    const result = parseTd3Mrz([SYNTHETIC_TD3.line1, SYNTHETIC_TD3.line2]);

    expect(result.status).toBe(MRZ_RESULT_STATUS.READY);
    expect(result.fields).toMatchObject(SYNTHETIC_TD3.expected);
    expect(result.raw.line2.slice(0, 9)).toBe("X1234567<");
    expect(result.checks.passportNumberCheck.valid).toBe(true);
    expect(result.checks.birthDateCheck.valid).toBe(true);
    expect(result.checks.expiryDateCheck.valid).toBe(true);
    expect(result.checks.compositeCheck.valid).toBe(true);
  });

  test("rejects a passport number whose check digit cannot be verified", () => {
    const wrongCheck = SYNTHETIC_TD3.line2[9] === "9" ? "8" : "9";
    const line2 = replaceAt(SYNTHETIC_TD3.line2, 9, wrongCheck);
    const result = parseTd3Mrz([SYNTHETIC_TD3.line1, line2]);

    expect(result.status).toBe(MRZ_RESULT_STATUS.NEEDS_REVIEW);
    expect(result.checks.passportNumberCheck.valid).toBe(false);
    expect(result.reviewReasons).toContain("invalid_passport_number");
    expect(result.fieldWarnings.passportNumber).toContain("invalid_passport_number");
  });

  test("repairs only a same-position ambiguous passport character when checks confirm it", () => {
    const confused = replaceAt(SYNTHETIC_TD3.line2, 1, "I");
    const correction = correctTd3Line2Ambiguities(confused);
    const result = parseTd3Mrz([SYNTHETIC_TD3.line1, confused]);

    expect(correction.valid).toBe(true);
    expect(correction.line).toBe(SYNTHETIC_TD3.line2);
    expect(correction.corrections).toEqual(expect.arrayContaining([
      expect.objectContaining({ index: 1, from: "I", to: "1" }),
    ]));
    expect(result.status).toBe(MRZ_RESULT_STATUS.READY);
    expect(result.fields.passportNumber).toBe(SYNTHETIC_TD3.expected.passportNumber);
  });

  test("does not insert or shift characters to manufacture a passport number", () => {
    const shifted = `<${SYNTHETIC_TD3.line2}`;
    const correction = correctTd3Line2Ambiguities(shifted);
    const result = parseTd3Mrz([SYNTHETIC_TD3.line1, shifted]);

    expect(correction.exactLength).toBe(false);
    expect(correction.valid).toBe(false);
    expect(result.status).not.toBe(MRZ_RESULT_STATUS.READY);
    expect(result.fields.passportNumber).not.toBe(SYNTHETIC_TD3.expected.passportNumber);
  });

  test("requires the composite check digit for ready status", () => {
    const wrongComposite = SYNTHETIC_TD3.line2[43] === "9" ? "8" : "9";
    const line2 = replaceAt(SYNTHETIC_TD3.line2, 43, wrongComposite);
    const result = parseTd3Mrz([SYNTHETIC_TD3.line1, line2]);

    expect(result.checks.compositeCheck.valid).toBe(false);
    expect(result.status).toBe(MRZ_RESULT_STATUS.NEEDS_REVIEW);
  });

  test("never exposes a failed passport check as parser-ready", () => {
    const wrongCheck = SYNTHETIC_TD3.line2[9] === "7" ? "4" : "7";
    const parsed = parseMRZDetailed(
      SYNTHETIC_TD3.line1,
      replaceAt(SYNTHETIC_TD3.line2, 9, wrongCheck),
    );

    expect(parsed.ok).toBe(false);
    expect(parsed.reviewReasons).toContain("invalid_passport_number");
  });
});
