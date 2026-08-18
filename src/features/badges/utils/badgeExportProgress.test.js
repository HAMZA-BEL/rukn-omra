import { getBadgeExportProgressPercent } from "./badgeExportProgress";

test("render percentage is derived from the displayed badge count", () => {
  expect(getBadgeExportProgressPercent({ step: "render", current: 209, total: 212, percent: 80 })).toBe(98.6);
  expect(getBadgeExportProgressPercent({ step: "render", current: 212, total: 212, percent: 90 })).toBe(100);
});

test("counted photo progress and non-counted PDF progress use the matching source", () => {
  expect(getBadgeExportProgressPercent({ step: "photos", current: 3, total: 8, percent: 42 })).toBe(37.5);
  expect(getBadgeExportProgressPercent({ step: "pdf", current: 212, total: 212, percent: 100 })).toBe(100);
});
