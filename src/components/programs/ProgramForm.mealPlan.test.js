import React, { act } from "react";
import { createRoot } from "react-dom/client";
import ProgramForm from "./ProgramForm";

jest.mock("../../hooks/useLang", () => ({ useLang: () => ({ t: { mealPlan: "نظام الوجبات" }, lang: "ar", dir: "rtl" }) }));
jest.mock("../../features/badges", () => ({
  badgePhonesFromProgram: () => [""], getBadgeContactDefaults: () => ({}),
  programFieldsFromBadgePhones: () => ({}), useBadgeTemplates: () => ({ templates: [] }),
}));

const store = { agencyId: "a1", programs: [], updateProgram: jest.fn(), addProgram: jest.fn(), addProgramAndWait: jest.fn(), createProgramTravelGroup: jest.fn() };

test("Program Form meal plan is a four-option dropdown and restores the selected value", async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement("div"); document.body.appendChild(host); const root = createRoot(host);
  const program = { id: "p1", name: "برنامج", type: "عمرة", priceTable: [{ id: "pkg", level: "اقتصادي", mealPlan: "half_board", prices: {} }] };
  await act(async () => root.render(<ProgramForm program={program} store={store} onSave={() => {}} onCancel={() => {}}/>));
  const label = [...host.querySelectorAll("label")].find((node) => node.textContent.includes("نظام الوجبات"));
  const trigger = label.parentElement.querySelector('button[aria-haspopup="listbox"]');
  expect(trigger.textContent).toContain("نصف إعاشة — إفطار وعشاء");
  await act(async () => trigger.click());
  const options = [...document.body.querySelectorAll('[role="option"]')];
  expect(options.map((option) => option.textContent.trim())).toEqual([
    "بدون", "إفطار", "نصف إعاشة — إفطار وعشاء", "إعاشة كاملة — إفطار وغداء وعشاء",
  ]);
  await act(async () => options[3].click());
  expect(trigger.textContent).toContain("إعاشة كاملة — إفطار وغداء وعشاء");
  await act(async () => root.unmount()); host.remove();
});
