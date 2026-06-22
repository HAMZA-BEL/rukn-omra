export const LAST_ACTIVITY_STORAGE_KEY = "rukn:lastActivityAt";
export const AUTO_LOGOUT_REASON_STORAGE_KEY = "rukn:autoLogoutReason";
export const AUTO_LOGOUT_REASON_INACTIVITY = "inactivity";

export const PRODUCTION_INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
export const PRODUCTION_WARNING_DURATION_MS = 60 * 1000;
export const DEV_TEST_INACTIVITY_TIMEOUT_MS = 60 * 1000;
export const DEV_TEST_WARNING_DURATION_MS = 30 * 1000;

export function isSessionTimeoutTestMode() {
  if (process.env.NODE_ENV !== "development") return false;
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("sessionTest") === "1";
  } catch {
    return false;
  }
}

export function getSessionTimeoutConfig() {
  const testMode = isSessionTimeoutTestMode();
  return {
    testMode,
    inactivityTimeoutMs: testMode
      ? DEV_TEST_INACTIVITY_TIMEOUT_MS
      : PRODUCTION_INACTIVITY_TIMEOUT_MS,
    warningDurationMs: testMode
      ? DEV_TEST_WARNING_DURATION_MS
      : PRODUCTION_WARNING_DURATION_MS,
  };
}

export function getAutoLogoutMessage(lang = "ar") {
  if (lang === "fr") {
    return "Vous avez été déconnecté automatiquement afin de protéger les données de l’agence en raison de votre inactivité.";
  }
  if (lang === "en") {
    return "You were automatically signed out to protect the agency data due to inactivity.";
  }
  return "تم تسجيل خروجك تلقائيا حفاظا على أمان بيانات الوكالة بسبب عدم النشاط.";
}
