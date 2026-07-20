import React, { act } from "react";
import { createRoot } from "react-dom/client";
import fs from "fs";
import path from "path";
import MRZReader, { ocrFailureText } from "./MRZReader";
import {
  createPassportOCRWorker,
  extractMRZFromImage,
  extractMRZFromImageRegion,
} from "../utils/ocrPassport";

jest.mock("./UI", () => ({
  Button: ({ children, onClick, disabled = false }) => (
    <button type="button" onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

jest.mock("./Icon", () => ({
  AppIcon: ({ name }) => <span data-icon={name} />,
  IconBubble: ({ name }) => <span data-icon-bubble={name} />,
}));

jest.mock("../hooks/useLang", () => ({
  useLang: () => ({
    lang: "ar",
    t: { cancel: "إلغاء" },
  }),
}));

jest.mock("../utils/ocrPassport", () => ({
  convertDisplayedCropToNaturalRect: jest.fn(),
  createPassportOCRWorker: jest.fn(),
  dedupePassportFiles: (files) => Array.from(files || []),
  extractMRZFromImage: jest.fn(),
  extractMRZFromImageRegion: jest.fn(),
  normalizeMRZOCRText: (value) => value,
  terminatePassportOCRWorker: jest.fn(),
}));

const source = fs.readFileSync(path.resolve(__dirname, "MRZReader.jsx"), "utf8");
const styles = fs.readFileSync(path.resolve(__dirname, "MRZReader.css"), "utf8");
const getCssRule = (selector) => {
  const start = styles.indexOf(`${selector} {`);
  const end = styles.indexOf("}", start);
  return start >= 0 && end > start ? styles.slice(start, end + 1) : "";
};

const validParsedPassport = (overrides = {}) => ({
  ok: true,
  confidence: 1,
  issues: [],
  reviewReasons: [],
  checks: {
    passportNumberCheck: { valid: true },
    birthDateCheck: { valid: true },
    expiryDateCheck: { valid: true },
    optionalDataCheck: { valid: true },
    compositeCheck: { valid: true },
  },
  raw: {},
  ...overrides,
  data: {
    latinLastName: "ALAOUI",
    latinFirstName: "AMINA",
    passportNo: "P1234567",
    nationality: "MAR",
    birthDate: "1990-01-01",
    expiryDate: "2030-01-01",
    gender: "F",
    raw: {},
    ...(overrides.data || {}),
  },
});

const selectPassportFile = (container, name = "passport.jpg") => {
  const fileInput = container.querySelector('input[type="file"]');
  const passportImage = new File(["image"], name, { type: "image/jpeg" });
  Object.defineProperty(fileInput, "files", { configurable: true, value: [passportImage] });
  act(() => fileInput.dispatchEvent(new Event("change", { bubbles: true })));
  return passportImage;
};

const clickContinueAndWait = async (container) => {
  const continueButton = Array.from(container.querySelectorAll("button"))
    .find((button) => button.textContent.includes("متابعة إلى المراجعة"));
  await act(async () => {
    continueButton.click();
    await new Promise((resolve) => setTimeout(resolve, 180));
  });
};

const changeTextInput = (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("passport import modal UI", () => {
  let container;
  let root;
  let debugSpy;
  let infoSpy;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
    createPassportOCRWorker.mockResolvedValue({ id: "shared-test-worker" });
    URL.createObjectURL = jest.fn(() => "blob:passport-preview");
    URL.revokeObjectURL = jest.fn();
    Element.prototype.scrollIntoView = jest.fn();
    debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
    infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete URL.createObjectURL;
    delete URL.revokeObjectURL;
    delete Element.prototype.scrollIntoView;
    debugSpy.mockRestore();
    infoSpy.mockRestore();
    delete global.IS_REACT_ACT_ENVIRONMENT;
  });

  test("shows one upload surface and the three visual stages", () => {
    act(() => {
      root.render(<MRZReader store={{ programs: [], clients: [] }} onClose={() => {}} />);
    });

    expect(container.textContent).toContain("أضف الجوازات إلى البرنامج بخطوات بسيطة وسريعة");
    expect(container.textContent).toContain("ارفع صور الجوازات");
    expect(container.textContent).toContain("الجوازات");
    expect(container.textContent).toContain("المراجعة");
    expect(container.textContent).toContain("الحفظ");
    expect(container.textContent).not.toContain("استيراد من الجوازات");

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    expect(fileInput.multiple).toBe(true);
    expect(container.querySelectorAll('input[type="file"]')).toHaveLength(1);

    const continueButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent.includes("متابعة إلى المراجعة"));
    expect(continueButton.disabled).toBe(true);

    const passportImage = new File(["image"], "passport.jpg", { type: "image/jpeg" });
    Object.defineProperty(fileInput, "files", { configurable: true, value: [passportImage] });
    act(() => fileInput.dispatchEvent(new Event("change", { bubbles: true })));

    expect(continueButton.disabled).toBe(false);
    expect(container.textContent).toContain("passport.jpg");
    expect(extractMRZFromImage).not.toHaveBeenCalled();
  });

  test("warms one shared OCR worker once without reading a passport", async () => {
    const props = { store: { programs: [], clients: [] }, onClose: () => {} };
    await act(async () => {
      root.render(<MRZReader {...props} />);
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    await act(async () => {
      root.render(<MRZReader {...props} />);
      await Promise.resolve();
    });

    expect(createPassportOCRWorker).toHaveBeenCalledTimes(1);
    expect(extractMRZFromImage).not.toHaveBeenCalled();
  });

  test("keeps advanced linking collapsed and hides redundant program selection for a locked program", () => {
    act(() => {
      root.render(
        <MRZReader
          store={{ programs: [], clients: [] }}
          onClose={() => {}}
          programContext={{ id: "program-1", name: "برنامج العمرة", type: "umrah", packages: [] }}
        />
      );
    });

    const advanced = container.querySelector("details.passport-import__advanced");
    expect(advanced).not.toBeNull();
    expect(advanced.open).toBe(false);
    expect(container.textContent).toContain("برنامج العمرة");
    expect(container.textContent).not.toContain("اختر البرنامج لهذا الاستيراد");
  });

  test("does not retain the removed saved-passports choice or duplicate the modal close control", () => {
    expect(source).not.toContain("استيراد من الجوازات");
    expect(source).not.toContain("اختيار جوازات محفوظة في ركن");
    expect(source).not.toMatch(/modeButtons|setMode\(|singlePreviewUrl|readSinglePassport/);
    expect(source).not.toContain('<AppIcon name="x" size={17} />');
    expect(source).toContain("processFilesSequentially(bulkFiles)");
    expect(source).toContain("onClick={saveAccepted}");
  });

  test("keeps the modal within the viewport with internal scrolling and mobile stacking", () => {
    const shellRule = getCssRule(".passport-import");
    const bodyRule = getCssRule(".passport-import__body");
    const footerRule = getCssRule(".passport-import__footer");
    const reviewRule = getCssRule(".passport-import__review");
    const passportCardRule = getCssRule(".passport-import__passport-card");
    const detailsRule = getCssRule(".passport-import__passport-details");

    expect(shellRule).toMatch(/display:\s*flex/);
    expect(shellRule).toMatch(/flex-direction:\s*column/);
    expect(shellRule).toMatch(/max-height:\s*calc\(min\(90vh, 820px\) - 132px\)/);
    expect(shellRule).toMatch(/overflow:\s*hidden/);
    expect(bodyRule).toMatch(/flex:\s*1 1 auto/);
    expect(bodyRule).toMatch(/min-height:\s*0/);
    expect(bodyRule).toMatch(/overflow-y:\s*auto/);
    expect(footerRule).toMatch(/flex-shrink:\s*0/);
    expect(footerRule).not.toMatch(/position:\s*(absolute|fixed|sticky)/);
    expect(reviewRule).not.toMatch(/overflow:\s*hidden|max-height|height:/);
    expect(passportCardRule).not.toMatch(/overflow:\s*hidden|max-height|height:/);
    expect(detailsRule).not.toMatch(/overflow:\s*hidden|max-height|height:/);
    expect(styles).toMatch(/@media \(max-width: 759px\)/);
    expect(styles).toMatch(/\.passport-import__details-grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
    expect(styles).toMatch(/\.passport-import__passport-details\.has-image\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s);
    expect(styles).not.toContain("linear-gradient");
  });

  test("expanding a passport keeps every field in the modal scroll flow and reveals the details", async () => {
    extractMRZFromImage.mockResolvedValue({
      success: true,
      parsed: {
        ok: true,
        confidence: 1,
        issues: [],
        reviewReasons: [],
        checks: {
          passportNumberCheck: { valid: true },
          birthDateCheck: { valid: true },
          expiryDateCheck: { valid: true },
          optionalDataCheck: { valid: true },
          compositeCheck: { valid: true },
        },
        data: {
          latinLastName: "ALAOUI",
          latinFirstName: "AMINA",
          passportNo: "P1234567",
          nationality: "MAR",
          birthDate: "1990-01-01",
          expiryDate: "2030-01-01",
          gender: "F",
          raw: {},
        },
        raw: {},
      },
    });

    act(() => {
      root.render(<MRZReader store={{ programs: [], clients: [] }} onClose={() => {}} />);
    });

    const fileInput = container.querySelector('input[type="file"]');
    const passportImage = new File(["image"], "passport.jpg", { type: "image/jpeg" });
    Object.defineProperty(fileInput, "files", { configurable: true, value: [passportImage] });
    act(() => fileInput.dispatchEvent(new Event("change", { bubbles: true })));

    const continueButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent.includes("متابعة إلى المراجعة"));
    await act(async () => {
      continueButton.click();
      await new Promise((resolve) => setTimeout(resolve, 180));
    });

    const detailsButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent.includes("مراجعة التفاصيل"));
    expect(detailsButton).toBeDefined();
    await act(async () => detailsButton.click());

    const details = container.querySelector(".passport-import__passport-details");
    const scrollingBody = container.querySelector(".passport-import__body");
    const footer = container.querySelector(".passport-import__footer");
    expect(details).not.toBeNull();
    expect(details.querySelectorAll('input:not([type="checkbox"])')).toHaveLength(10);
    expect(details.querySelectorAll("select").length).toBeGreaterThanOrEqual(1);
    expect(scrollingBody.contains(details)).toBe(true);
    expect(scrollingBody.contains(footer)).toBe(false);
    expect(footer.parentElement).toBe(scrollingBody.parentElement);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "nearest" });
    expect(container.textContent).not.toContain("MRZ Diagnostic Lab");

    const sections = details.querySelectorAll(".passport-import__field-section");
    expect(sections).toHaveLength(2);
    expect(sections[0].querySelector("h4").textContent).toBe("بيانات الجواز الأساسية");
    expect(sections[1].querySelector("h4").textContent).toBe("بيانات إضافية");
    const coreLabels = Array.from(sections[0].querySelectorAll("label > span")).map((node) => node.textContent);
    expect(coreLabels).toEqual([
      "الاسم العائلي اللاتيني",
      "الاسم الشخصي اللاتيني",
      "رقم الجواز",
      "رقم البطاقة الوطنية",
      "الجنسية",
      "تاريخ الميلاد",
      "الجنس",
      "تاريخ انتهاء الجواز",
    ]);
    const additionalLabels = Array.from(sections[1].querySelectorAll("label > span")).map((node) => node.textContent);
    expect(additionalLabels).toEqual([
      "الاسم العائلي بالعربية",
      "الاسم الشخصي بالعربية",
      "الهاتف",
    ]);

    const latinLastInput = Array.from(details.querySelectorAll("label"))
      .find((label) => label.textContent.includes("الاسم العائلي اللاتيني"))
      .querySelector("input");
    await act(async () => {
      latinLastInput.value = "ALAOUI EDITED";
      latinLastInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const accept = details.querySelector('input[type="checkbox"]');
    await act(async () => accept.click());
    await act(async () => accept.click());
    expect(extractMRZFromImage).toHaveBeenCalledTimes(1);
  });

  test("restores Arabic names and CIN only from the current agency", async () => {
    extractMRZFromImage.mockResolvedValue({ success: true, parsed: validParsedPassport() });
    const clients = [
      {
        id: "same-agency",
        agency_id: "agency-a",
        firstName: "أمينة",
        lastName: "العلوي",
        cin: "AA111111",
        passport: { number: "P1234567", cin: "AA111111" },
      },
      {
        id: "other-agency",
        agency_id: "agency-b",
        firstName: "اسم مسرب",
        lastName: "وكالة أخرى",
        cin: "BB999999",
        passport: { number: "P1234567", cin: "BB999999" },
      },
    ];
    act(() => {
      root.render(<MRZReader store={{ agencyId: "agency-a", programs: [], clients }} onClose={() => {}} />);
    });
    selectPassportFile(container);
    await clickContinueAndWait(container);
    const detailsButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent.includes("مراجعة التفاصيل"));
    await act(async () => detailsButton.click());

    const fieldValue = (labelText) => Array.from(container.querySelectorAll(".passport-import__passport-details label"))
      .find((label) => label.textContent.includes(labelText))
      .querySelector("input").value;
    expect(fieldValue("الاسم العائلي بالعربية")).toBe("العلوي");
    expect(fieldValue("الاسم الشخصي بالعربية")).toBe("أمينة");
    expect(fieldValue("رقم البطاقة الوطنية")).toBe("AA111111");
    expect(container.textContent).not.toContain("اسم مسرب");
    expect(container.textContent).not.toContain("BB999999");
  });

  test("shows a trusted CIN as optional and highlights it when the passport result is partial", async () => {
    const checks = {
      passportNumberCheck: { valid: true },
      birthDateCheck: { valid: true },
      expiryDateCheck: { valid: true },
      optionalDataCheck: { valid: true },
      compositeCheck: { valid: true },
    };
    extractMRZFromImage.mockResolvedValue({
      success: true,
      parsed: validParsedPassport({
        ok: false,
        reviewReasons: ["low_confidence"],
        checks,
        data: { issuer: "MAR" },
        engineResult: {
          fields: { nationality: "MAR" },
          checks,
          raw: { line1: "P<MARTESTER<<ALPHA", line2: "" },
          diagnostics: {
            line2: {
              reliable: true,
              fixedPositions: { optionalData: { value: "AA123456<<<<<<" } },
            },
          },
        },
      }),
    });
    act(() => {
      root.render(<MRZReader store={{ programs: [], clients: [] }} onClose={() => {}} />);
    });
    selectPassportFile(container);
    await clickContinueAndWait(container);
    const detailsButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent.includes("مراجعة التفاصيل"));
    await act(async () => detailsButton.click());

    const cinField = Array.from(container.querySelectorAll(".passport-import__passport-details label"))
      .find((label) => label.textContent.includes("رقم البطاقة الوطنية"));
    expect(cinField.querySelector("input").value).toBe("AA123456");
    expect(cinField.className).toContain("is-warning");
  });

  test("keeps rereading available after acceptance and restores on cancel before requiring fresh review", async () => {
    extractMRZFromImage.mockResolvedValue({ success: true, parsed: validParsedPassport() });
    extractMRZFromImageRegion.mockResolvedValue({
      success: true,
      parsed: validParsedPassport({
        data: { latinLastName: "BENALI", latinFirstName: "SALMA", passportNo: "R7654321" },
      }),
      raw: {},
    });
    act(() => {
      root.render(<MRZReader store={{ programs: [], clients: [] }} onClose={() => {}} />);
    });
    selectPassportFile(container);
    await clickContinueAndWait(container);
    const detailsButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent.includes("مراجعة التفاصيل"));
    await act(async () => detailsButton.click());

    const findReread = () => Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent.includes("إعادة القراءة من الصورة"));
    const acceptance = () => container.querySelector('.passport-import__passport-details input[type="checkbox"]');
    const latinLast = () => Array.from(container.querySelectorAll(".passport-import__passport-details label"))
      .find((label) => label.textContent.includes("الاسم العائلي اللاتيني"))
      .querySelector("input");

    expect(findReread()).toBeDefined();
    expect(acceptance().checked).toBe(true);
    expect(latinLast().value).toBe("ALAOUI");
    await act(async () => changeTextInput(latinLast(), "MANUAL NAME"));
    expect(latinLast().value).toBe("MANUAL NAME");

    await act(async () => findReread().click());
    expect(acceptance().checked).toBe(false);
    const cropCancel = Array.from(container.querySelectorAll("button"))
      .filter((button) => button.textContent.trim() === "إلغاء")
      .at(-1);
    await act(async () => cropCancel.click());
    expect(acceptance().checked).toBe(true);
    expect(latinLast().value).toBe("MANUAL NAME");

    await act(async () => findReread().click());
    const readCrop = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent.includes("إعادة القراءة من المنطقة المحددة"));
    await act(async () => {
      readCrop.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(extractMRZFromImage).toHaveBeenCalledTimes(1);
    expect(extractMRZFromImageRegion).toHaveBeenCalledTimes(1);
    expect(latinLast().value).toBe("BENALI");
    expect(acceptance().checked).toBe(false);
    expect(container.textContent).toContain("يحتاج مراجعة");
    expect(findReread()).toBeDefined();
  });

  test("keeps the diagnostic lab behind an explicit opt-in debug flag", () => {
    expect(source).toContain('process.env.REACT_APP_MRZ_DIAGNOSTIC_LAB === "true"');
    expect(source).toContain("if (!MRZ_DIAGNOSTIC_LAB_ENABLED) return null;");
  });

  test("does not describe parser or validation failures as poor image quality", () => {
    const labels = {
      partialOcr: "partial",
      imageTooSmall: "quality",
      manualCropInvalid: "manual-crop",
      lineSplitFailed: "line-split",
      mrzFormatNotRecognized: "parser",
      mrzParseFailed: "parser",
      ocrNoText: "no-text",
      ocrNotFound: "not-found",
      ocrFailed: "ocr-failed",
    };

    expect(ocrFailureText("MRZ_VALIDATION_FAILED", labels)).toBe("partial");
    expect(ocrFailureText("MRZ_PARTIAL", labels)).toBe("partial");
    expect(ocrFailureText("PARSE_FAILED", labels)).toBe("parser");
    expect(ocrFailureText("MANUAL_CROP_INVALID", labels)).toBe("manual-crop");
    expect(ocrFailureText("MRZ_LINES_NOT_SEPARATED", labels)).toBe("line-split");
    expect(ocrFailureText("MRZ_VALIDATION_FAILED", labels)).not.toBe("quality");
  });
});
