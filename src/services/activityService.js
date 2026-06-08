import { db } from "../lib/db";

export function fetchRecentActivity(agencyId, limit) {
  return db.activityLog.fetchRecent(agencyId, limit);
}

export function fetchActivityPage(agencyId, options) {
  return db.activityLog.fetchPage(agencyId, options);
}

export function insertActivityEntry(agencyId, userId, entry) {
  return db.activityLog.insert(agencyId, userId, entry);
}

export function clearActivityEntries(agencyId, days) {
  return db.activityLog.clear(agencyId, days);
}

export function subscribeActivityEntries(agencyId, handlers) {
  return db.activityLog.subscribe({ agencyId, ...handlers });
}
