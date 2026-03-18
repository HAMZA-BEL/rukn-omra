import { useState, useMemo, useCallback } from "react";
import {
  mapNotificationRow,
  markManyNotificationsRead as markManyNotificationsReadRemote,
  markNotificationArchived as markNotificationArchivedRemote,
  markNotificationRead as markNotificationReadRemote,
  upsertNotification,
} from "../services/notificationsService";
import { buildNotificationStateHash } from "../utils/notifications";

export function useNotificationsSlice({
  agencyId,
  isSupabaseEnabled,
  generateUUID,
  getNotificationKey,
}) {
  const [notifications, setNotifications] = useState([]);

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.isArchived && !n.isRead),
    [notifications]
  );

  const setInitialNotifications = useCallback((items = []) => {
    setNotifications(Array.isArray(items) ? items : []);
  }, []);

  const handleRealtimeUpsert = useCallback((row) => {
    if (!row) return;
    const mapped = mapNotificationRow(row);
    setNotifications((prev) => {
      const exists = prev.find((n) => n.id === mapped.id);
      if (exists) return prev.map((n) => (n.id === mapped.id ? { ...n, ...mapped } : n));
      return [mapped, ...prev];
    });
  }, []);

  const handleRealtimeDelete = useCallback((id) => {
    if (!id) return;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markNotificationRead = useCallback(
    (id) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      if (isSupabaseEnabled && agencyId) markNotificationReadRemote(id);
    },
    [agencyId, isSupabaseEnabled]
  );

  const markAllNotificationsRead = useCallback(() => {
    const ids = notifications.filter((n) => !n.isRead && !n.isArchived).map((n) => n.id);
    if (!ids.length) return;
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n))
    );
    if (isSupabaseEnabled && agencyId) markManyNotificationsReadRemote(ids);
  }, [notifications, agencyId, isSupabaseEnabled]);

  const archiveNotification = useCallback(
    (id) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isArchived: true } : n)));
      if (isSupabaseEnabled && agencyId) markNotificationArchivedRemote(id, true);
    },
    [agencyId, isSupabaseEnabled]
  );

  const restoreNotification = useCallback(
    (id) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isArchived: false } : n))
      );
      if (isSupabaseEnabled && agencyId) markNotificationArchivedRemote(id, false);
    },
    [agencyId, isSupabaseEnabled]
  );

  const ensureNotificationExists = useCallback(
    (notif) => {
      if (!isSupabaseEnabled || !agencyId || !notif) return;
      const normalizedMeta = notif.meta && typeof notif.meta === "object" ? notif.meta : {};
      const normalized = {
        ...notif,
        meta: normalizedMeta,
        targetId: notif.targetId ?? notif.programId ?? null,
        targetType: notif.targetType ?? (notif.programId ? "program" : notif.targetType),
      };
      normalized.stateHash = buildNotificationStateHash(normalized);
      const key = getNotificationKey(normalized);
      const hasAny = notifications.some((n) => getNotificationKey(n) === key);
      if (hasAny) return;
      const payload = {
        ...normalized,
        programId: normalized.programId ?? normalized.targetId,
        id: normalized.id || generateUUID(),
        isRead: false,
        isArchived: false,
        createdAt: normalized.createdAt || new Date().toISOString(),
      };
      upsertNotification(payload, agencyId);
    },
    [agencyId, isSupabaseEnabled, notifications, generateUUID, getNotificationKey]
  );

  return {
    notifications,
    unreadNotifications,
    unreadNotificationsCount: unreadNotifications.length,
    setInitialNotifications,
    handleRealtimeUpsert,
    handleRealtimeDelete,
    markNotificationRead,
    markAllNotificationsRead,
    archiveNotification,
    restoreNotification,
    ensureNotificationExists,
  };
}
