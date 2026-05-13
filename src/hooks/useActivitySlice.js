import { useState, useCallback } from "react";
import {
  clearActivityEntries,
  fetchActivityPage,
  fetchRecentActivity,
  insertActivityEntry,
} from "../services/activityService";

const DASHBOARD_ACTIVITY_LIMIT = 5;
const ACTIVITY_CACHE_LIMIT = 500;

const getActivityTimestamp = (entry = {}) => {
  const raw = entry.time || entry.created_at || entry.createdAt || entry.date || entry.timestamp;
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
};

export function useActivitySlice({ agencyId, isSupabaseEnabled, generateUUID }) {
  const [activityLog, setActivityLog] = useState([]);

  const setInitialActivity = useCallback((items = []) => {
    setActivityLog(Array.isArray(items) ? items.slice(0, ACTIVITY_CACHE_LIMIT) : []);
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

  const clearActivityLog = useCallback(
    async (days = 0) => {
      const numericDays = Math.max(0, Number(days) || 0);
      const cutoff = Date.now() - numericDays * 86400000;
      if (!isSupabaseEnabled || !agencyId) {
        let deleted = 0;
        setActivityLog((prev) => {
          const next = prev.filter((entry) => {
            const keep = getActivityTimestamp(entry) >= cutoff;
            if (!keep) deleted += 1;
            return keep;
          });
          return next;
        });
        return { data: deleted, error: null };
      }
      const result = await clearActivityEntries(agencyId, numericDays);
      if (!result?.error) {
        setActivityLog((prev) => prev.filter((entry) => getActivityTimestamp(entry) >= cutoff));
      }
      return result;
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
      setActivityLog((prev) => [entry, ...prev].slice(0, ACTIVITY_CACHE_LIMIT));
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
    clearActivityLog,
    logActivity,
  };
}
