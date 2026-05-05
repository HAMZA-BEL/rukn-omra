import { db } from "../lib/db";

export function mapNotificationRow(row) {
  return db.notifications.mapRow(row);
}

export function fetchNotifications(agencyId) {
  return db.notifications.fetchAll(agencyId);
}

export function upsertNotification(notification, agencyId) {
  return db.notifications.upsert(notification, agencyId);
}

export function markNotificationRead(id, isRead = true, agencyId = null) {
  return db.notifications.markRead(id, isRead, agencyId);
}

export function markManyNotificationsRead(ids, agencyId = null) {
  return db.notifications.markManyRead(ids, agencyId);
}

export function markNotificationArchived(id, archived = true, agencyId = null) {
  return db.notifications.markArchived(id, archived, agencyId);
}

export function deleteNotification(id, agencyId) {
  return db.notifications.delete(id, agencyId);
}

export function deleteNotifications(ids, agencyId) {
  return db.notifications.deleteMany(ids, agencyId);
}

export function deleteArchivedNotifications(agencyId) {
  return db.notifications.deleteAllArchived(agencyId);
}
