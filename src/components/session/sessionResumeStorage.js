import { AUTO_LOGOUT_REASON_STORAGE_KEY } from "./sessionTimeoutConfig";

export const AUTO_LOGOUT_RESUME_CONTEXT_STORAGE_KEY = "rukn:autoLogoutResumeContext";
export const AUTO_LOGOUT_RESUME_MAX_AGE_MS = 15 * 60 * 1000;

const AUTH_HASH_KEYS = ["access_token", "refresh_token", "type"];
const AUTH_PATH_PARTS = ["login", "auth", "set-password", "setpassword", "recovery", "invite"];

const hasSessionStorage = () => (
  typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
);

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

export function getSafeResumeRoute(route, { fallbackToCurrent = false } = {}) {
  if (typeof window === "undefined") return "";
  try {
    const fallbackRoute = fallbackToCurrent
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : "";
    const candidate = String(route || fallbackRoute || "").trim();
    if (!candidate) return "";

    const url = new URL(candidate, window.location.origin);
    if (url.origin !== window.location.origin) return "";

    const pathname = url.pathname.toLowerCase();
    if (AUTH_PATH_PARTS.some((part) => pathname.includes(part))) return "";

    const hash = url.hash || "";
    if (hash) {
      const hashText = hash.toLowerCase();
      if (AUTH_HASH_KEYS.some((key) => hashText.includes(`${key}=`))) return "";
      if (hashText.includes("recovery") || hashText.includes("invite")) return "";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "";
  }
}

export function saveAutoLogoutResumeContext({
  email,
  displayName = "",
  route = "",
  createdAt = Date.now(),
} = {}) {
  if (!hasSessionStorage()) return null;

  const safeEmail = normalizeEmail(email);
  if (!safeEmail) return null;

  const safeRoute = getSafeResumeRoute(route, { fallbackToCurrent: true });
  const context = {
    email: safeEmail,
    displayName: String(displayName || "").trim(),
    route: safeRoute,
    createdAt,
  };

  try {
    window.sessionStorage.setItem(AUTO_LOGOUT_RESUME_CONTEXT_STORAGE_KEY, JSON.stringify(context));
    return context;
  } catch {
    return null;
  }
}

export function readAutoLogoutResumeContext(now = Date.now()) {
  if (!hasSessionStorage()) return { context: null, expired: false };

  let parsed = null;
  try {
    const raw = window.sessionStorage.getItem(AUTO_LOGOUT_RESUME_CONTEXT_STORAGE_KEY);
    if (!raw) return { context: null, expired: false };
    parsed = JSON.parse(raw);
  } catch {
    clearAutoLogoutResumeContext({ clearReason: false });
    return { context: null, expired: false };
  }

  const email = normalizeEmail(parsed?.email);
  const createdAt = Number(parsed?.createdAt || 0);
  if (!email || !Number.isFinite(createdAt) || createdAt <= 0) {
    clearAutoLogoutResumeContext({ clearReason: false });
    return { context: null, expired: false };
  }

  if (now - createdAt > AUTO_LOGOUT_RESUME_MAX_AGE_MS) {
    clearAutoLogoutResumeContext({ clearReason: false });
    return { context: null, expired: true };
  }

  return {
    context: {
      email,
      displayName: String(parsed?.displayName || "").trim(),
      route: getSafeResumeRoute(parsed?.route || ""),
      createdAt,
    },
    expired: false,
  };
}

export function clearAutoLogoutResumeContext({ clearReason = true } = {}) {
  if (!hasSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(AUTO_LOGOUT_RESUME_CONTEXT_STORAGE_KEY);
    if (clearReason) window.sessionStorage.removeItem(AUTO_LOGOUT_REASON_STORAGE_KEY);
  } catch {
    /* Ignore sessionStorage cleanup failures. */
  }
}

export function restoreResumeRoute(route) {
  if (typeof window === "undefined") return false;
  const safeRoute = getSafeResumeRoute(route);
  if (!safeRoute) return false;
  try {
    const url = new URL(safeRoute, window.location.origin);
    const page = String(url.hash || "").replace(/^#/, "").trim() || "dashboard";
    window.history.replaceState({ page }, "", safeRoute);
    return true;
  } catch {
    return false;
  }
}
