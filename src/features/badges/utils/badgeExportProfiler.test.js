import { BadgeExportProfiler } from "./badgeExportProfiler";

test("collects comparable job, badge, resource and PDF metrics", async () => {
  jest.spyOn(console, "groupCollapsed").mockImplementation(() => {});
  jest.spyOn(console, "table").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "groupEnd").mockImplementation(() => {});
  const profiler = new BadgeExportProfiler({ mode: "smart", badges: 1, label: "QA" });
  const badge = profiler.startBadge(1, 1);

  await profiler.measure("loadSmartBadgeSettings", async () => "settings");
  await profiler.measureBadge(badge, "toJpeg", async () => "jpeg");
  profiler.increment("toJpegCalls");
  profiler.increment("reactRoots");
  profiler.increment("exportHosts");
  profiler.recordImage("https://example.test/photo.jpg");
  profiler.recordImage("https://example.test/photo.jpg");
  profiler.addBytes("jpegBytes", 1024);
  profiler.finishBadge(badge);

  const summary = profiler.finish({ pdfBlob: new Blob(["pdf"]) });

  expect(summary).toEqual(expect.objectContaining({ mode: "smart", badges: 1 }));
  expect(summary.phases.loadSmartBadgeSettings.count).toBe(1);
  expect(summary.toJpeg.count).toBeUndefined();
  expect(summary.toJpeg.total).toBeGreaterThanOrEqual(0);
  expect(summary.counters).toEqual(expect.objectContaining({
    uniqueImages: 1,
    toJpegCalls: 1,
    reactRoots: 1,
    exportHosts: 1,
    jpegBytes: 1024,
    finalPdfBytes: 3,
  }));
  jest.restoreAllMocks();
});

test("finish is idempotent", () => {
  jest.spyOn(console, "groupCollapsed").mockImplementation(() => {});
  jest.spyOn(console, "table").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "groupEnd").mockImplementation(() => {});
  const profiler = new BadgeExportProfiler({ mode: "legacy", badges: 0 });
  expect(profiler.finish()).toBe(profiler.finish());
  jest.restoreAllMocks();
});
