import React from "react";
import { GlassCard, Button } from "./UI";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { formatNotificationMessage } from "../utils/notifications";

const tc = theme.colors;

const STATUS_FILTERS = ["all", "unread", "archived"];
const SEVERITY_FILTERS = ["all", "info", "warn", "critical"];

export default function NotificationsPage({ store, onNotificationAction }) {
  const { t, tr, lang, dir } = useLang();
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [severityFilter, setSeverityFilter] = React.useState("all");

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

  const severityLabels = {
    info: t.notificationSeverityInfo || (lang === "fr" ? "Info" : lang === "en" ? "Info" : "معلومة"),
    warn: t.notificationSeverityWarn || (lang === "fr" ? "Avert." : lang === "en" ? "Warning" : "تنبيه"),
    critical: t.notificationSeverityCritical || (lang === "fr" ? "Critique" : lang === "en" ? "Critical" : "عاجل"),
  };

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
  }, [onNotificationAction, store]);

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
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,.1)",
                background: statusFilter === filter ? "rgba(212,175,55,.18)" : "rgba(255,255,255,.02)",
                color: statusFilter === filter ? tc.gold : tc.grey,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {filter === "all" ? t.notificationsFilterAll || "الكل"
                : filter === "unread" ? t.notificationsFilterUnread || "غير مقروء"
                  : t.notificationsFilterArchived || "مؤرشف"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SEVERITY_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setSeverityFilter(filter)}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,.08)",
                background: severityFilter === filter ? "rgba(255,255,255,.08)" : "transparent",
                color: filter === "all" ? tc.grey : (severityColors[filter]?.text || tc.grey),
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {filter === "all" ? (t.notificationsFilterSeverity || "كل الحالات") : severityLabels[filter]}
            </button>
          ))}
        </div>
      </header>

      <div className="list-stack" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((notification) => {
          const colors = severityColors[notification.severity] || severityColors.info;
          const createdAt = notification.createdAt
            ? new Date(notification.createdAt).toLocaleString(lang === "ar" ? "ar-MA" : lang === "fr" ? "fr-FR" : "en-US")
            : "";
          return (
            <GlassCard key={notification.id} style={{ padding: 16, borderColor: colors.text + "33" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
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
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{notification.title || t.notificationsDefaultTitle}</h3>
                  <p style={{ fontSize: 13, color: tc.grey, marginBottom: 8 }}>
                    {renderMessage(notification)}
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(148,163,184,.6)" }}>{createdAt}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>
                  <Button variant="primary" size="sm" onClick={() => handleOpenNotification(notification)}>
                    {t.viewDetails || "عرض التفاصيل"}
                  </Button>
                  {!notification.isRead && !notification.isArchived && (
                    <Button variant="secondary" size="sm" onClick={() => store.markNotificationRead(notification.id)}>
                      {t.markAsRead || "وضع كمقروء"}
                    </Button>
                  )}
                  {!notification.isArchived && (
                    <Button variant="ghost" size="sm" onClick={() => store.archiveNotification(notification.id)}>
                      {t.archive || "أرشفة"}
                    </Button>
                  )}
                  {notification.isArchived && (
                    <Button variant="ghost" size="sm" onClick={() => store.restoreNotification(notification.id)}>
                      {t.restore || "استعادة"}
                    </Button>
                  )}
                </div>
              </div>
            </GlassCard>
          );
        })}

        {filtered.length === 0 && (
          <GlassCard style={{ padding: 32, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: tc.grey }}>{t.noNotifications || "لا توجد إشعارات"}</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
