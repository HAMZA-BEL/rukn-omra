import { useState, useMemo, useCallback, useEffect } from "react";
import {
  mapNotificationRow,
  markManyNotificationsRead as markManyNotificationsReadRemote,
  markNotificationArchived as markNotificationArchivedRemote,
  markNotificationRead as markNotificationReadRemote,
  deleteNotification as deleteNotificationRemote,
  deleteNotifications as deleteNotificationsRemote,
  deleteArchivedNotifications as deleteArchivedNotificationsRemote,
  upsertNotification,
} from "../services/notificationsService";
import { buildNotificationStateHash } from "../utils/notifications";
import { hasNotificationKey } from "../utils/notificationRules";

export function useNotificationsSlice({
  agencyId,
  isSupabaseEnabled,
  generateUUID,
  getNotificationKey,
  storageKeyPrefix = "rukn_notifications_local",
}) {
  const notificationsStorageKey = `${storageKeyPrefix}:items`;
  const generatedKeysStorageKey = `${storageKeyPrefix}:generated`;
  const dismissedKeysStorageKey = `${storageKeyPrefix}:dismissed`;

  const readStorageArray = useCallback((key) => {
    if (typeof window === "undefined" || !key) return [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  const persistStorageArray = useCallback((key, values) => {
    if (typeof window === "undefined" || !key) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(Array.from(values || [])));
    } catch {
      /* localStorage can be unavailable in private contexts */
    }
  }, []);

  const [notifications, setNotifications] = useState(() => readStorageArray(notificationsStorageKey));
  const [generatedNotificationKeys, setGeneratedNotificationKeys] = useState(
    () => new Set(readStorageArray(generatedKeysStorageKey))
  );
  const [dismissedNotificationKeys, setDismissedNotificationKeys] = useState(
    () => new Set(readStorageArray(dismissedKeysStorageKey))
  );

  useEffect(() => {
    setGeneratedNotificationKeys(new Set(readStorageArray(generatedKeysStorageKey)));
    setDismissedNotificationKeys(new Set(readStorageArray(dismissedKeysStorageKey)));
    if (!isSupabaseEnabled || !agencyId) {
      setNotifications(readStorageArray(notificationsStorageKey));
    }
  }, [
    agencyId,
    isSupabaseEnabled,
    notificationsStorageKey,
    generatedKeysStorageKey,
    dismissedKeysStorageKey,
    readStorageArray,
  ]);

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.isArchived && !n.isRead),
    [notifications]
  );

  useEffect(() => {
    if (!notificationsStorageKey || (isSupabaseEnabled && agencyId)) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(notificationsStorageKey, JSON.stringify(notifications));
    } catch {
      /* ignore storage quota errors */
    }
  }, [notifications, notificationsStorageKey, isSupabaseEnabled, agencyId]);

  const rememberGeneratedKey = useCallback((key) => {
    if (!key) return;
    setGeneratedNotificationKeys((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      persistStorageArray(generatedKeysStorageKey, next);
      return next;
    });
  }, [generatedKeysStorageKey, persistStorageArray]);

  const setInitialNotifications = useCallback((items = []) => {
    const list = Array.isArray(items) ? items : [];
    setNotifications(list);
    list.forEach((item) => {
      if (item?.persistKey || item?.meta?.persistKey) {
        rememberGeneratedKey(getNotificationKey(item));
      }
    });
  }, [getNotificationKey, rememberGeneratedKey]);

  const rememberDismissedKey = useCallback((notification) => {
    if (!notification?.meta?.persistKey && !notification?.persistKey) return;
    const key = getNotificationKey(notification);
    if (!key) return;
    setDismissedNotificationKeys((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      persistStorageArray(dismissedKeysStorageKey, next);
      return next;
    });
  }, [dismissedKeysStorageKey, getNotificationKey, persistStorageArray]);

  const forgetDismissedKey = useCallback((notification) => {
    if (!notification?.meta?.persistKey && !notification?.persistKey) return;
    const key = getNotificationKey(notification);
    if (!key) return;
    setDismissedNotificationKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      persistStorageArray(dismissedKeysStorageKey, next);
      return next;
    });
  }, [dismissedKeysStorageKey, getNotificationKey, persistStorageArray]);

  const handleRealtimeUpsert = useCallback((row) => {
    if (!row) return;
    const mapped = mapNotificationRow(row);
    if (mapped?.persistKey || mapped?.meta?.persistKey) {
      rememberGeneratedKey(getNotificationKey(mapped));
    }
    setNotifications((prev) => {
      const exists = prev.find((n) => n.id === mapped.id);
      if (exists) return prev.map((n) => (n.id === mapped.id ? { ...n, ...mapped } : n));
      return [mapped, ...prev];
    });
  }, [getNotificationKey, rememberGeneratedKey]);

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
      const existing = notifications.find((n) => n.id === id);
      rememberDismissedKey(existing);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isArchived: true } : n)));
      if (isSupabaseEnabled && agencyId) markNotificationArchivedRemote(id, true);
    },
    [agencyId, isSupabaseEnabled, notifications, rememberDismissedKey]
  );

  const restoreNotification = useCallback(
    (id) => {
      const existing = notifications.find((n) => n.id === id);
      forgetDismissedKey(existing);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isArchived: false } : n))
      );
      if (isSupabaseEnabled && agencyId) markNotificationArchivedRemote(id, false);
    },
    [agencyId, isSupabaseEnabled, notifications, forgetDismissedKey]
  );

  const ensureNotificationExists = useCallback(
    (notif) => {
      if (!notif) return;
      const normalizedMeta = notif.meta && typeof notif.meta === "object" ? notif.meta : {};
      const normalized = {
        ...notif,
        meta: normalizedMeta,
        targetId: notif.targetId ?? notif.programId ?? null,
        targetType: notif.targetType ?? (notif.programId ? "program" : notif.targetType),
      };
      normalized.stateHash = buildNotificationStateHash(normalized);
      const key = getNotificationKey(normalized);
      const shouldPersistKey = Boolean(normalized.persistKey || normalized.meta?.persistKey);
      if (shouldPersistKey && hasNotificationKey(
        key,
        notifications,
        generatedNotificationKeys,
        dismissedNotificationKeys,
        getNotificationKey
      )) return;
      if (!shouldPersistKey && notifications.some((n) => getNotificationKey(n) === key)) return;
      const payload = {
        ...normalized,
        programId: normalized.programId ?? (normalized.targetType === "program" ? normalized.targetId : null),
        id: normalized.id || generateUUID(),
        isRead: false,
        isArchived: false,
        createdAt: normalized.createdAt || new Date().toISOString(),
      };
      setNotifications((prev) =>
        prev.some((n) => getNotificationKey(n) === key) ? prev : [payload, ...prev]
      );
      if (shouldPersistKey) rememberGeneratedKey(key);
      if (isSupabaseEnabled && agencyId) upsertNotification(payload, agencyId);
    },
    [
      agencyId,
      isSupabaseEnabled,
      notifications,
      generateUUID,
      getNotificationKey,
      dismissedNotificationKeys,
      generatedNotificationKeys,
      rememberGeneratedKey,
    ]
  );

  const deleteNotification = useCallback(
    (id) => {
      if (!id) return;
      const existing = notifications.find((n) => n.id === id);
      rememberDismissedKey(existing);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (isSupabaseEnabled && agencyId) deleteNotificationRemote(id, agencyId);
    },
    [agencyId, isSupabaseEnabled, notifications, rememberDismissedKey]
  );

  const deleteNotifications = useCallback(
    (ids = []) => {
      if (!ids.length) return;
      notifications.filter((n) => ids.includes(n.id)).forEach(rememberDismissedKey);
      setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
      if (isSupabaseEnabled && agencyId) deleteNotificationsRemote(ids, agencyId);
    },
    [agencyId, isSupabaseEnabled, notifications, rememberDismissedKey]
  );

  const deleteAllArchived = useCallback(() => {
    notifications.filter((n) => n.isArchived).forEach(rememberDismissedKey);
    setNotifications((prev) => prev.filter((n) => !n.isArchived));
    if (isSupabaseEnabled && agencyId) deleteArchivedNotificationsRemote(agencyId);
  }, [agencyId, isSupabaseEnabled, notifications, rememberDismissedKey]);

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
    deleteNotification,
    deleteNotifications,
    deleteAllArchived,
  };
}
