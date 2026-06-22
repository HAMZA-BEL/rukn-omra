import React from "react";
import {
  AUTO_LOGOUT_REASON_INACTIVITY,
  AUTO_LOGOUT_REASON_STORAGE_KEY,
  LAST_ACTIVITY_STORAGE_KEY,
  getSessionTimeoutConfig,
} from "../components/session/sessionTimeoutConfig";
import { saveAutoLogoutResumeContext } from "../components/session/sessionResumeStorage";

const CHECK_INTERVAL_MS = 1000;
const ACTIVITY_WRITE_THROTTLE_MS = 1000;
const MOUSEMOVE_THROTTLE_MS = 5000;
const WARNING_RENEW_ACTIVITY_EVENTS = new Set(["click", "keydown", "touchstart", "scroll", "pointerdown"]);

const readLastActivityAt = () => {
  if (typeof window === "undefined") return 0;
  try {
    const value = Number(window.localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
};

const writeLastActivityAt = (timestamp) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(timestamp));
  } catch {
    /* Ignore storage failures; in-memory state still protects this tab. */
  }
};

const writeAutoLogoutReason = () => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(AUTO_LOGOUT_REASON_STORAGE_KEY, AUTO_LOGOUT_REASON_INACTIVITY);
  } catch {
    /* Ignore storage failures; logout still proceeds. */
  }
};

export function useInactivityLogout({
  enabled = true,
  onLogout,
  currentUserEmail = "",
  currentUserDisplayName = "",
} = {}) {
  const config = React.useMemo(() => getSessionTimeoutConfig(), []);
  const [warningVisible, setWarningVisible] = React.useState(false);
  const [remainingMs, setRemainingMs] = React.useState(config.inactivityTimeoutMs);
  const lastActivityRef = React.useRef(0);
  const lastWriteRef = React.useRef(0);
  const lastMouseMoveRef = React.useRef(0);
  const logoutInProgressRef = React.useRef(false);
  const warningVisibleRef = React.useRef(false);
  const onLogoutRef = React.useRef(onLogout);
  const currentUserEmailRef = React.useRef(currentUserEmail);
  const currentUserDisplayNameRef = React.useRef(currentUserDisplayName);

  React.useEffect(() => {
    onLogoutRef.current = onLogout;
  }, [onLogout]);

  React.useEffect(() => {
    currentUserEmailRef.current = currentUserEmail;
  }, [currentUserEmail]);

  React.useEffect(() => {
    currentUserDisplayNameRef.current = currentUserDisplayName;
  }, [currentUserDisplayName]);

  React.useEffect(() => {
    warningVisibleRef.current = warningVisible;
  }, [warningVisible]);

  const performLogout = React.useCallback(async () => {
    if (logoutInProgressRef.current) return;
    logoutInProgressRef.current = true;
    setWarningVisible(false);
    setRemainingMs(0);
    saveAutoLogoutResumeContext({
      email: currentUserEmailRef.current,
      displayName: currentUserDisplayNameRef.current,
    });
    writeAutoLogoutReason();
    try {
      window.localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
    } catch {
      /* Ignore storage failures during logout cleanup. */
    }
    await onLogoutRef.current?.();
  }, []);

  const refreshActivity = React.useCallback((now = Date.now(), { force = false } = {}) => {
    if (!enabled || logoutInProgressRef.current) return;
    if (!force && now - lastWriteRef.current < ACTIVITY_WRITE_THROTTLE_MS) return;
    lastActivityRef.current = now;
    lastWriteRef.current = now;
    writeLastActivityAt(now);
    setWarningVisible(false);
    setRemainingMs(config.inactivityTimeoutMs);
  }, [config.inactivityTimeoutMs, enabled]);

  const checkSession = React.useCallback((now = Date.now()) => {
    if (!enabled || logoutInProgressRef.current) return;

    const storedLastActivityAt = readLastActivityAt();
    if (!storedLastActivityAt) {
      refreshActivity(now, { force: true });
      return;
    }

    lastActivityRef.current = storedLastActivityAt;
    const elapsedMs = Math.max(0, now - storedLastActivityAt);
    const nextRemainingMs = Math.max(0, config.inactivityTimeoutMs - elapsedMs);
    setRemainingMs(nextRemainingMs);

    if (elapsedMs >= config.inactivityTimeoutMs) {
      performLogout();
      return;
    }

    if (nextRemainingMs <= config.warningDurationMs) {
      setWarningVisible(true);
    } else if (warningVisibleRef.current) {
      setWarningVisible(false);
    }
  }, [
    config.inactivityTimeoutMs,
    config.warningDurationMs,
    enabled,
    performLogout,
    refreshActivity,
  ]);

  React.useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;

    const existingLastActivityAt = readLastActivityAt();
    if (existingLastActivityAt) {
      lastActivityRef.current = existingLastActivityAt;
      checkSession(Date.now());
    } else {
      refreshActivity(Date.now(), { force: true });
    }

    const handleActivity = (event) => {
      if (logoutInProgressRef.current) return;
      const now = Date.now();
      const eventType = event?.type || "";

      if (eventType === "mousemove") {
        if (warningVisibleRef.current) {
          checkSession(now);
          return;
        }
        if (now - lastMouseMoveRef.current < MOUSEMOVE_THROTTLE_MS) return;
        lastMouseMoveRef.current = now;
      }

      if (warningVisibleRef.current && !WARNING_RENEW_ACTIVITY_EVENTS.has(eventType)) {
        checkSession(now);
        return;
      }

      const storedLastActivityAt = readLastActivityAt() || lastActivityRef.current || now;
      if (now - storedLastActivityAt >= config.inactivityTimeoutMs) {
        performLogout();
        return;
      }

      refreshActivity(now, { force: warningVisibleRef.current });
    };

    const handleFocus = () => {
      if (logoutInProgressRef.current) return;
      const now = Date.now();
      const storedLastActivityAt = readLastActivityAt();
      if (storedLastActivityAt && now - storedLastActivityAt >= config.inactivityTimeoutMs) {
        performLogout();
        return;
      }
      if (warningVisibleRef.current) {
        checkSession(now);
        return;
      }
      refreshActivity(now, { force: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") handleFocus();
      else checkSession(Date.now());
    };

    const handleStorage = (event) => {
      if (event.key !== LAST_ACTIVITY_STORAGE_KEY) return;
      checkSession(Date.now());
    };

    const intervalId = window.setInterval(() => checkSession(Date.now()), CHECK_INTERVAL_MS);
    const activityOptions = { capture: true, passive: true };
    const activityEvents = ["click", "keydown", "touchstart", "scroll", "pointerdown", "mousemove"];

    activityEvents.forEach((eventName) => {
      document.addEventListener(eventName, handleActivity, activityOptions);
    });
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearInterval(intervalId);
      activityEvents.forEach((eventName) => {
        document.removeEventListener(eventName, handleActivity, activityOptions);
      });
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [
    checkSession,
    config.inactivityTimeoutMs,
    enabled,
    performLogout,
    refreshActivity,
  ]);

  return {
    warningVisible,
    remainingMs,
    warningDurationMs: config.warningDurationMs,
    inactivityTimeoutMs: config.inactivityTimeoutMs,
    testMode: config.testMode,
  };
}
