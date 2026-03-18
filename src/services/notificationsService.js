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

export function markNotificationRead(id, isRead = true) {
  return db.notifications.markRead(id, isRead);
}

export function markManyNotificationsRead(ids) {
  return db.notifications.markManyRead(ids);
}

export function markNotificationArchived(id, archived = true) {
  return db.notifications.markArchived(id, archived);
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
