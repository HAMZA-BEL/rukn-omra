import React, { act } from "react";
import { createRoot } from "react-dom/client";
import ProgramForm from "./ProgramForm";

jest.mock("../../hooks/useLang", () => ({ useLang: () => ({ t: { hotelMecca: "فندق مكة", hotelMadina: "فندق المدينة" }, lang: "ar", dir: "rtl" }) }));
jest.mock("../../features/badges", () => ({
  badgePhonesFromProgram: () => [""], getBadgeContactDefaults: () => ({}),
  programFieldsFromBadgePhones: () => ({}), useBadgeTemplates: () => ({ templates: [] }),
}));

test("Program Form restores optional numeric distances with the metre unit only in labels", async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement("div"); document.body.appendChild(host); const root = createRoot(host);
  const program = { id: "p1", name: "برنامج", type: "عمرة", priceTable: [{ id: "pkg", level: "اقتصادي", hotelMecca: "مكة", hotelMadina: "المدينة", makkahHaramDistance: 120, madinahHaramDistance: 300, prices: {} }] };
  const store = { agencyId: "a1", programs: [], updateProgram: jest.fn(), addProgram: jest.fn(), addProgramAndWait: jest.fn(), createProgramTravelGroup: jest.fn() };
  await act(async () => root.render(<ProgramForm program={program} store={store} onSave={() => {}} onCancel={() => {}}/>));
  const labels = [...host.querySelectorAll("label")];
  const makkahInput = labels.find((label) => label.textContent.includes("المسافة عن الحرم بمكة"))?.parentElement.querySelector("input");
  const madinahInput = labels.find((label) => label.textContent.includes("المسافة عن الحرم بالمدينة"))?.parentElement.querySelector("input");
  expect(makkahInput).toMatchObject({ type: "number", value: "120" });
  expect(madinahInput).toMatchObject({ type: "number", value: "300" });
  expect(makkahInput.value).not.toContain("متر");
  await act(async () => root.unmount()); host.remove();
});
