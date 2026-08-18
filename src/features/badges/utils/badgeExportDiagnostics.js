export const BADGE_EXPORT_STAGE = Object.freeze({
  LOAD_SETTINGS: "load_settings",
  RESOLVE_SOURCE: "resolve_source",
  PREPARE_ASSETS: "prepare_assets",
  RENDER_FRONT: "render_front",
  RENDER_BACK: "render_back",
  TO_JPEG: "to_jpeg",
  BUILD_PDF: "build_pdf",
  DOWNLOAD: "download",
});

export function markBadgeExportError(error, stage) {
  const candidate = error instanceof Error ? error : new Error(String(error?.message || error || "badge-export-failed"));
  if (!candidate.badgeExportStage) {
    try {
      Object.defineProperty(candidate, "badgeExportStage", {
        configurable: true,
        enumerable: false,
        value: stage || "unknown",
      });
    } catch {
      const wrapped = new Error(candidate.message || "badge-export-failed", { cause: candidate });
      wrapped.name = candidate.name || wrapped.name;
      wrapped.stack = candidate.stack || wrapped.stack;
      Object.defineProperty(wrapped, "badgeExportStage", {
        configurable: true,
        enumerable: false,
        value: stage || "unknown",
      });
      return wrapped;
    }
  }
  return candidate;
}

export async function withBadgeExportStage(stage, work) {
  try {
    return await work();
  } catch (error) {
    throw markBadgeExportError(error, stage);
  }
}

export function withBadgeExportStageSync(stage, work) {
  try {
    return work();
  } catch (error) {
    throw markBadgeExportError(error, stage);
  }
}

export function logBadgeExportFailure(error) {
  const safeError = error || {};
  console.error("[Smart Badge Export] failed", {
    stage: safeError.badgeExportStage || "unknown",
    name: safeError.name || "Error",
    message: safeError.message || String(safeError),
    stack: safeError.stack,
  });
}
