export const ACTIVE_AGENCY_STATUS = "active";

export const AGENCY_BLOCKED_COPY = Object.freeze({
  title: "تم إيقاف حساب الوكالة",
  message: "تعذر الدخول إلى ركن لأن حساب الوكالة غير نشط حاليا. يرجى التواصل مع إدارة ركن.",
});

export const AGENCY_LINK_MISSING_COPY = Object.freeze({
  title: "تعذر ربط الحساب بالوكالة",
  message: "تم تسجيل الدخول، لكن هذا الحساب غير مرتبط بوكالة صالحة. يرجى التواصل مع إدارة ركن.",
});

export function normalizeAgencyStatus(status) {
  return typeof status === "string" ? status.trim().toLowerCase() : "";
}

export function getAgencyAccessError(status) {
  const normalized = normalizeAgencyStatus(status);
  if (normalized === "suspended") return "agency_suspended";
  if (normalized === "archived") return "agency_archived";
  if (normalized === ACTIVE_AGENCY_STATUS) return null;
  return "agency_inactive";
}

export function canAgencyUseRukn(status) {
  return getAgencyAccessError(status) === null;
}

export function resolveAgencyAccessError(profileAgencyId, agency) {
  if (!profileAgencyId || !agency) return "no_agency";
  if (agency.id !== profileAgencyId) return "agency_mismatch";
  return getAgencyAccessError(agency.status);
}
