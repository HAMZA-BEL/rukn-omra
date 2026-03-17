import { useState, useCallback } from "react";
import {
  archiveOldActivity,
  fetchActivityPage,
  fetchRecentActivity,
  insertActivityEntry,
} from "../services/activityService";

const DASHBOARD_ACTIVITY_LIMIT = 5;

export function useActivitySlice({ agencyId, isSupabaseEnabled, generateUUID }) {
  const [activityLog, setActivityLog] = useState([]);

  const setInitialActivity = useCallback((items = []) => {
    setActivityLog(Array.isArray(items) ? items.slice(0, DASHBOARD_ACTIVITY_LIMIT) : []);
  }, []);

  const fetchActivityLogPage = useCallback(
    (options = {}) => {
      const limit = options.limit ?? DASHBOARD_ACTIVITY_LIMIT;
      const page = options.page ?? 0;
      const offset = options.offset ?? page * limit;
      if (!isSupabaseEnabled || !agencyId) {
        const data = activityLog.slice(offset, offset + limit);
        return Promise.resolve({ data, count: activityLog.length, error: null });
      }
      return fetchActivityPage(agencyId, { ...options, limit, offset });
    },
    [agencyId, isSupabaseEnabled, activityLog]
  );

  const archiveActivityLog = useCallback(
    (days = 180) => {
      if (!isSupabaseEnabled || !agencyId) {
        return Promise.resolve({ data: null, error: null });
      }
      return archiveOldActivity(agencyId, days);
    },
    [agencyId, isSupabaseEnabled]
  );

  const logActivity = useCallback(
    (type, description, clientName = "", options = {}) => {
      const entry = {
        id: generateUUID(),
        type,
        description,
        clientName,
        time: new Date().toISOString(),
      };
      setActivityLog((prev) => [entry, ...prev].slice(0, DASHBOARD_ACTIVITY_LIMIT));
      if (!options.skipRemote && isSupabaseEnabled && agencyId) {
        insertActivityEntry(agencyId, null, entry).catch(() => {});
      }
    },
    [agencyId, isSupabaseEnabled, generateUUID]
  );

  return {
    activityLog,
    setInitialActivity,
    fetchActivityLogPage,
    archiveActivityLog,
    logActivity,
  };
}
