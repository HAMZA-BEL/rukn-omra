import {
  extractTrustedMoroccanCin,
  filterClientsForCurrentAgency,
} from "./passportImportIdentity";
import { makeSyntheticTd3 } from "./__fixtures__/syntheticTd3";
import { parseMRZDetailed } from "./mrzReader";

describe("passport import identity metadata", () => {
  let debugSpy;

  beforeAll(() => {
    debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterAll(() => {
    debugSpy.mockRestore();
  });

  test("extracts Moroccan CIN from trusted optional data without its check digit", () => {
    const td3 = makeSyntheticTd3({ nationality: "MAR", optionalData: "AB123456<<<<<<" });
    const parsed = parseMRZDetailed(td3.line1.replace("UTO", "MAR"), td3.line2);

    expect(extractTrustedMoroccanCin(parsed)).toEqual({
      value: "AB123456",
      trusted: true,
      source: "moroccan_td3_optional_data",
    });
  });

  test("does not expose optional data with an invalid check or a non-Moroccan issuer", () => {
    const td3 = makeSyntheticTd3({ nationality: "MAR", optionalData: "AB123456<<<<<<" });
    const moroccanLine1 = td3.line1.replace("UTO", "MAR");
    const invalidCheck = `${td3.line2.slice(0, 42)}${td3.line2[42] === "9" ? "8" : "9"}${td3.line2.slice(43)}`;

    expect(extractTrustedMoroccanCin(parseMRZDetailed(moroccanLine1, invalidCheck)).value).toBe("");
    expect(extractTrustedMoroccanCin(parseMRZDetailed(td3.line1, td3.line2)).value).toBe("");
  });

  test("keeps CIN optional and does not affect TD3 readiness when absent", () => {
    const td3 = makeSyntheticTd3({ nationality: "MAR" });
    const parsed = parseMRZDetailed(td3.line1.replace("UTO", "MAR"), td3.line2);

    expect(parsed.ok).toBe(true);
    expect(extractTrustedMoroccanCin(parsed).value).toBe("");
  });

  test("never returns a client from another agency", () => {
    const clients = [
      { id: "same", agency_id: "agency-a", passport: { number: "A1" } },
      { id: "other", agency_id: "agency-b", passport: { number: "A1" } },
    ];

    expect(filterClientsForCurrentAgency(clients, "agency-a").map(({ id }) => id)).toEqual(["same"]);
  });
});
