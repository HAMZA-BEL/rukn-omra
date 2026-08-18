import { BADGE_EXPORT_STAGE, logBadgeExportFailure, withBadgeExportStage, withBadgeExportStageSync } from "./badgeExportDiagnostics";

test("preserves the real Smart Badge error and records its failing stage", async () => {
  const cause = new TypeError("canvas export failed");

  await expect(withBadgeExportStage(BADGE_EXPORT_STAGE.TO_JPEG, async () => {
    throw cause;
  })).rejects.toBe(cause);

  expect(cause.badgeExportStage).toBe("to_jpeg");
  expect(cause.message).toBe("canvas export failed");
  expect(cause.stack).toContain("canvas export failed");
});

test("records synchronous routing failures without replacing the original error", () => {
  const error = new TypeError("Cannot assign to read only property 'mode'");
  expect(() => withBadgeExportStageSync(BADGE_EXPORT_STAGE.RESOLVE_SOURCE, () => {
    throw error;
  })).toThrow(error);
  expect(error.badgeExportStage).toBe("resolve_source");
});

test("logs only diagnostic error fields without application data", () => {
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  const error = new Error("render failed");
  Object.defineProperty(error, "badgeExportStage", { value: "render_front" });

  logBadgeExportFailure(error);

  expect(spy).toHaveBeenCalledWith("[Smart Badge Export] failed", {
    stage: "render_front",
    name: "Error",
    message: "render failed",
    stack: error.stack,
  });
  spy.mockRestore();
});
