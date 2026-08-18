import { fetchBadgeTemplates } from "../services/badgeTemplatesApi";
import { loadSmartBadgeSettings } from "../services/smartBadgeSettingsApi";
import { downloadSmartClientBadgePdf } from "./smartBadgePdf";
import { downloadClientBadgePdf } from "./badgePdf";
import { createBadgeExportProfiler } from "./badgeExportProfiler";

jest.mock("../services/badgeTemplatesApi", () => ({ fetchBadgeTemplates: jest.fn() }));
jest.mock("../services/smartBadgeSettingsApi", () => ({ loadSmartBadgeSettings: jest.fn() }));
jest.mock("./smartBadgePdf", () => ({
  downloadSmartClientBadgePdf: jest.fn(),
  downloadSmartProgramBadgesPdf: jest.fn(),
}));
jest.mock("./badgeExportProfiler", () => ({
  createBadgeExportProfiler: jest.fn(() => ({
    enabled: false,
    mode: "badge",
    measure: async (_name, work) => work(),
    measureSync: (_name, work) => work(),
  })),
}));

test("a Smart rendering failure is surfaced without falling back to legacy", async () => {
  const renderError = new Error("render failed");
  Object.defineProperty(renderError, "badgeExportStage", { value: "render_front" });
  loadSmartBadgeSettings.mockResolvedValue({ data: { printSource: "smart" }, error: null });
  downloadSmartClientBadgePdf.mockRejectedValue(renderError);
  createBadgeExportProfiler.mockReturnValue({
    enabled: false,
    mode: "badge",
    measure: async (_name, work) => work(),
    measureSync: (_name, work) => work(),
  });

  await expect(downloadClientBadgePdf({
    agencyId: "agency-1",
    client: { id: "client-1", name: "Test" },
    program: { id: "program-1", name: "Program" },
    agency: {},
  })).rejects.toBe(renderError);

  expect(downloadSmartClientBadgePdf).toHaveBeenCalledTimes(1);
  expect(fetchBadgeTemplates).not.toHaveBeenCalled();
});
