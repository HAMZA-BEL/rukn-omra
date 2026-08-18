export const getBadgeExportProgressPercent = (progress = {}) => {
  const step = progress?.step || "template";
  const current = Math.max(0, Number(progress?.current) || 0);
  const total = Math.max(0, Number(progress?.total) || 0);
  const raw = (step === "render" || step === "photos") && total > 0
    ? (current / total) * 100
    : Number(progress?.percent) || 0;
  return Math.max(0, Math.min(100, Math.round(raw * 10) / 10));
};
