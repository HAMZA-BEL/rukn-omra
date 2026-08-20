import React, { act } from "react";
import { createRoot } from "react-dom/client";
import ProgramForm from "./ProgramForm";

jest.mock("../../hooks/useLang", () => ({
  useLang: () => ({ t: {}, lang: "ar", dir: "rtl" }),
}));

jest.mock("../../features/badges", () => ({
  badgePhonesFromProgram: () => [""],
  getBadgeContactDefaults: () => ({ guidePhone: "", saudiPhone1: "", saudiPhone2: "", badgeNote: "" }),
  programFieldsFromBadgePhones: () => ({}),
  useBadgeTemplates: () => ({ templates: [] }),
}));

const store = {
  agencyId: "agency-1",
  programs: [],
  addProgram: jest.fn(),
  addProgramAndWait: jest.fn(),
  createProgramTravelGroup: jest.fn(),
  updateProgram: jest.fn(),
};

const renderForm = async (program) => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<ProgramForm program={program} store={store} onSave={() => {}} onCancel={() => {}}/>));
  return { host, root };
};

test("Program Form shows the real mixed RTL/LTR route rather than محدد", async () => {
  const { host, root } = await renderForm({
    id: "program-1",
    name: "عمرة الاختبار",
    type: "عمرة",
    outboundRouteStops: ["أكادير", "CMN", "المدينة"],
    returnRouteStops: ["JED", "أكادير"],
  });
  const summary = host.querySelector('[data-testid="program-travel-route-summary"]');
  expect(summary.textContent).toBe("أكادير ← CMN ← المدينة | JED ← أكادير");
  expect(summary.textContent).not.toBe("محدد");
  expect(summary.style.direction).toBe("auto");
  await act(async () => root.unmount());
  host.remove();
});

test("Program Form uses the explicit empty UI message", async () => {
  const { host, root } = await renderForm({ id: "program-2", name: "بدون مسار", type: "عمرة" });
  expect(host.querySelector('[data-testid="program-travel-route-summary"]').textContent).toBe("لم يتم تحديد خط الرحلة");
  await act(async () => root.unmount());
  host.remove();
});
