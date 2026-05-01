import React from "react";
import { GlassCard, Button, Modal } from "./UI";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { formatNotificationMessage } from "../utils/notifications";
import { MoreHorizontal } from "lucide-react";

const tc = theme.colors;
const menuActionStyle = {
  width: "100%",
  border: "none",
  borderRadius: 10,
  padding: "9px 11px",
  background: "transparent",
  color: "var(--rukn-text)",
  textAlign: "start",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'Cairo',sans-serif",
};

const STATUS_FILTERS = ["all", "unread", "archived"];
const SEVERITY_FILTERS = ["all", "info", "warn", "critical"];

export default function NotificationsPage({ store, onNotificationAction }) {
  const { t, tr, lang } = useLang();
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [severityFilter, setSeverityFilter] = React.useState("all");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [actionMenuId, setActionMenuId] = React.useState(null);
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [confirmState, setConfirmState] = React.useState({ open: false, mode: null, ids: [], count: 0 });
  const filtersRef = React.useRef(null);
  const actionMenuRef = React.useRef(null);

  const notifications = store.notifications || [];
  const sorted = React.useMemo(() => {
    const list = [...notifications];
    return list.sort((a, b) => {
      const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bd - ad;
    });
  }, [notifications]);

  const filtered = React.useMemo(() => {
    return sorted.filter((n) => {
      const matchesStatus = statusFilter === "all"
        ? !n.isArchived
        : statusFilter === "unread"
          ? !n.isArchived && !n.isRead
          : n.isArchived;
      const matchesSeverity = severityFilter === "all" ? true : n.severity === severityFilter;
      return matchesStatus && matchesSeverity;
    });
  }, [sorted, statusFilter, severityFilter]);

  const archivedCount = React.useMemo(
    () => notifications.filter((n) => n.isArchived).length,
    [notifications]
  );
  const visibleIds = React.useMemo(() => filtered.map((n) => n.id), [filtered]);

  React.useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => visibleIds.includes(id)));
  }, [visibleIds]);

  React.useEffect(() => {
    if (!filtersOpen) return;
    const handler = (event) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [filtersOpen]);

  React.useEffect(() => {
    if (!actionMenuId) return;
    const handler = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActionMenuId(null);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [actionMenuId]);

  const selectionCount = selectedIds.length;
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const toggleSelection = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const clearSelection = () => setSelectedIds([]);

  const severityLabels = {
    info: t.notificationSeverityInfo || (lang === "fr" ? "Info" : lang === "en" ? "Info" : "معلومة"),
    warn: t.notificationSeverityWarn || (lang === "fr" ? "Avert." : lang === "en" ? "Warning" : "تنبيه"),
    critical: t.notificationSeverityCritical || (lang === "fr" ? "Critique" : lang === "en" ? "Critical" : "عاجل"),
  };

  const statusLabels = {
    all: t.notificationsFilterAll || "الكل",
    unread: t.notificationsFilterUnread || "غير مقروء",
    archived: t.notificationsFilterArchived || "مؤرشف",
  };

  const selectedFilterLabel = [
    statusLabels[statusFilter],
    severityFilter === "all" ? (t.notificationsFilterSeverity || "كل الحالات") : severityLabels[severityFilter],
  ].filter(Boolean).join(" • ");
  const filterStatusTitle = lang === "fr" ? "Statut" : lang === "en" ? "Status" : "الحالة";
  const filterTypeTitle = lang === "fr" ? "Type" : lang === "en" ? "Type" : "النوع";

  const severityColors = {
    info: { text: tc.gold, bg: "rgba(212,175,55,.12)" },
    warn: { text: tc.warning, bg: "rgba(245,158,11,.12)" },
    critical: { text: tc.danger, bg: "rgba(239,68,68,.12)" },
  };

  const renderMessage = React.useCallback(
    (notification) =>
      formatNotificationMessage(notification, {
        programs: store.programs,
        activeClients: store.activeClients,
        getClientStatus: store.getClientStatus,
        tr,
      }),
    [store.programs, store.activeClients, store.getClientStatus, tr]
  );

  const unreadCount = store.unreadNotificationsCount ?? (store.unreadNotifications ? store.unreadNotifications.length : 0);
  const handleOpenNotification = React.useCallback((notification) => {
    if (!notification) return;
    store.markNotificationRead?.(notification.id);
    onNotificationAction?.(notification);
    setActionMenuId(null);
  }, [onNotificationAction, store]);

  const openConfirm = (mode, ids = [], countOverride = null) => {
    setConfirmState({
      open: true,
      mode,
      ids,
      count: countOverride ?? ids.length,
    });
  };
  const closeConfirm = () => setConfirmState({ open: false, mode: null, ids: [], count: 0 });

  const handleConfirmDelete = () => {
    if (!confirmState.mode) return;
    if (confirmState.mode === "single" && confirmState.ids.length) {
      store.deleteNotification?.(confirmState.ids[0]);
    } else if (confirmState.mode === "bulk" && confirmState.ids.length) {
      store.deleteNotifications?.(confirmState.ids);
      setSelectedIds((prev) => prev.filter((id) => !confirmState.ids.includes(id)));
    } else if (confirmState.mode === "archived") {
      store.deleteAllArchivedNotifications?.();
      setSelectedIds([]);
    }
    setActionMenuId(null);
    closeConfirm();
  };

  const showDeleteArchived = statusFilter === "archived" && archivedCount > 0;

  const confirmTitle = t.notificationsConfirmDeleteTitle || t.trashConfirmDeleteTitle || "تأكيد الحذف النهائي";
  let confirmMessage = t.notificationsConfirmDeleteMessage || "سيتم حذف هذا الإشعار نهائيًا.";
  if (confirmState.mode === "bulk") {
    confirmMessage = (t.notificationsConfirmDeleteSelectedMessage || "سيتم حذف {count} إشعار نهائيًا.")
      .replace("{count}", confirmState.count);
  } else if (confirmState.mode === "archived") {
    confirmMessage = t.notificationsConfirmDeleteAllArchivedMessage || "سيتم حذف كل الإشعارات المؤرشفة نهائيًا.";
  }

  return (
    <div className="page-shell" style={{ padding: "28px 32px 40px" }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>{t.notifications || "الإشعارات"}</h1>
            <p style={{ fontSize: 13, color: tc.grey }}>
              {tr("notificationsHeader", { count: unreadCount })}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={unreadCount === 0}
            onClick={() => store.markAllNotificationsRead?.()}
          >
            {t.markAllRead || "تحديد كمقروء"}
          </Button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <div ref={filtersRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid var(--rukn-border-soft)",
                background: "var(--rukn-bg-soft)",
                color: "var(--rukn-text)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Cairo',sans-serif",
              }}
            >
              <span>{t.notificationsFilterSeverity || "التصفية"}</span>
              <span style={{ color: tc.grey, fontWeight: 600 }}>{selectedFilterLabel}</span>
              <span style={{ color: tc.gold, fontSize: 16, lineHeight: 1 }}>⋯</span>
            </button>
            {filtersOpen && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                insetInlineStart: 0,
                minWidth: 240,
                zIndex: 20,
                padding: 10,
                borderRadius: 14,
                border: "1px solid var(--rukn-menu-border, rgba(212,175,55,.28))",
                background: "var(--rukn-menu-bg, rgba(20,30,50,.96))",
                boxShadow: "var(--rukn-menu-shadow, 0 18px 40px rgba(0,0,0,.32))",
              }}>
                <p style={{ fontSize: 11, color: tc.grey, fontWeight: 800, marginBottom: 7 }}>
                  {filterStatusTitle}
                </p>
                <div style={{ display: "grid", gap: 5, marginBottom: 10 }}>
                  {STATUS_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setStatusFilter(filter)}
                      style={{
                        border: "none",
                        borderRadius: 10,
                        padding: "8px 10px",
                        background: statusFilter === filter ? "rgba(212,175,55,.16)" : "transparent",
                        color: statusFilter === filter ? tc.gold : "var(--rukn-text)",
                        textAlign: "start",
                        fontSize: 12,
                        fontWeight: statusFilter === filter ? 800 : 600,
                        cursor: "pointer",
                        fontFamily: "'Cairo',sans-serif",
                      }}
                    >
                      {statusLabels[filter]}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: tc.grey, fontWeight: 800, marginBottom: 7 }}>
                  {filterTypeTitle}
                </p>
                <div style={{ display: "grid", gap: 5 }}>
                  {SEVERITY_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setSeverityFilter(filter)}
                      style={{
                        border: "none",
                        borderRadius: 10,
                        padding: "8px 10px",
                        background: severityFilter === filter ? "rgba(212,175,55,.14)" : "transparent",
                        color: filter === "all" ? "var(--rukn-text)" : (severityColors[filter]?.text || tc.grey),
                        textAlign: "start",
                        fontSize: 12,
                        fontWeight: severityFilter === filter ? 800 : 600,
                        cursor: "pointer",
                        fontFamily: "'Cairo',sans-serif",
                      }}
                    >
                      {filter === "all" ? (t.notificationsFilterSeverity || "كل الحالات") : severityLabels[filter]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {showDeleteArchived && (
            <Button
              variant="danger"
              size="sm"
              style={{ marginInlineStart: "auto" }}
              onClick={() => openConfirm("archived", [], archivedCount)}
            >
              {t.notificationsDeleteAllArchived || "حذف كل المؤرشف"}
            </Button>
          )}
        </div>
      </header>

      {selectionCount > 0 && (
        <GlassCard style={{ padding: 14, marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: tc.grey, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAll}
              style={{ width: 16, height: 16 }}
            />
            {t.notificationsSelectAll || "تحديد الكل"}
          </label>
          <span style={{ fontSize: 13, color: tc.gold }}>
            {(t.notificationsSelectedCount || "{count} محدد").replace("{count}", selectionCount)}
          </span>
          <div style={{ display: "flex", gap: 8, marginInlineStart: "auto" }}>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              {t.notificationsClearSelection || t.cancel || "إلغاء"}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => openConfirm("bulk", selectedIds)}
            >
              {t.notificationsDeleteSelected || "حذف المحدد"}
            </Button>
          </div>
        </GlassCard>
      )}

      <div className="list-stack" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((notification) => {
          const colors = severityColors[notification.severity] || severityColors.info;
          const createdAt = notification.createdAt
            ? new Date(notification.createdAt).toLocaleString(lang === "ar" ? "ar-MA" : lang === "fr" ? "fr-FR" : "en-US")
            : "";
          const isSelected = selectedIds.includes(notification.id);
          return (
            <GlassCard key={notification.id} style={{ padding: 16, borderColor: colors.text + "33" }}>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <div style={{ paddingTop: 6 }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(notification.id)}
                    style={{ width: 18, height: 18 }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{
                      padding: "2px 10px",
                      borderRadius: 999,
                      background: colors.bg,
                      color: colors.text,
                      fontSize: 12,
                      fontWeight: 700,
                    }}>
                      {severityLabels[notification.severity] || severityLabels.info}
                    </span>
                    {!notification.isRead && !notification.isArchived && (
                      <span style={{ fontSize: 11, color: tc.gold }}>{t.unreadBadge || "غير مقروء"}</span>
                    )}
                    {notification.isArchived && (
                      <span style={{ fontSize: 11, color: tc.grey }}>{t.archivedBadge || "مؤرشف"}</span>
                    )}
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                    {notification.title || t.notificationsDefaultTitle}
                  </h3>
                  <p style={{ fontSize: 13, color: tc.grey, marginBottom: 8 }}>
                    {renderMessage(notification)}
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(148,163,184,.6)" }}>{createdAt}</p>
                </div>
                <div style={{ position: "relative", alignSelf: "flex-start", marginInlineStart: "auto" }}>
                  <button
                    type="button"
                    onClick={() => setActionMenuId((prev) => prev === notification.id ? null : notification.id)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      border: "1px solid var(--rukn-border-soft)",
                      background: "var(--rukn-bg-soft)",
                      color: "var(--rukn-text)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                    aria-label={t.more || "المزيد"}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {actionMenuId === notification.id && (
                    <div
                      ref={actionMenuRef}
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        insetInlineEnd: 0,
                        minWidth: 180,
                        zIndex: 20,
                        padding: 6,
                        borderRadius: 12,
                        border: "1px solid var(--rukn-menu-border, rgba(212,175,55,.28))",
                        background: "var(--rukn-menu-bg, rgba(20,30,50,.96))",
                        boxShadow: "var(--rukn-menu-shadow, 0 18px 40px rgba(0,0,0,.32))",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenNotification(notification)}
                        style={menuActionStyle}
                      >
                        {t.viewDetails || "عرض التفاصيل"}
                      </button>
                      {!notification.isRead && !notification.isArchived && (
                        <button
                          type="button"
                          onClick={() => {
                            store.markNotificationRead(notification.id);
                            setActionMenuId(null);
                          }}
                          style={menuActionStyle}
                        >
                          {t.markAsRead || "وضع كمقروء"}
                        </button>
                      )}
                      {!notification.isArchived && (
                        <button
                          type="button"
                          onClick={() => {
                            store.archiveNotification(notification.id);
                            setActionMenuId(null);
                          }}
                          style={menuActionStyle}
                        >
                          {t.archive || "أرشفة"}
                        </button>
                      )}
                      {notification.isArchived && (
                        <button
                          type="button"
                          onClick={() => {
                            store.restoreNotification(notification.id);
                            setActionMenuId(null);
                          }}
                          style={menuActionStyle}
                        >
                          {t.restore || "استعادة"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openConfirm("single", [notification.id])}
                        style={{ ...menuActionStyle, color: tc.danger }}
                      >
                        {t.notificationsDelete || t.delete || "حذف نهائي"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          );
        })}

        {filtered.length === 0 && (
          <GlassCard style={{ padding: 32, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: tc.grey }}>
              {t.notificationsNoResults || t.noNotifications || "لا توجد إشعارات"}
            </p>
          </GlassCard>
        )}
      </div>

      <Modal
        open={confirmState.open}
        onClose={closeConfirm}
        title={confirmTitle}
        width={420}
      >
        <p style={{ fontSize: 14, color: tc.grey, marginBottom: 18 }}>{confirmMessage}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Button variant="ghost" onClick={closeConfirm}>
            {t.cancel || "إلغاء"}
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete}>
            {t.notificationsDelete || t.delete || "حذف نهائي"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
