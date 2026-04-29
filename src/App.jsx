import React from "react";
import { globalCSS } from "./components/styles";
import { useStore } from "./hooks/useStore";
import { useAuth } from "./hooks/useAuth";
import { isSupabaseEnabled } from "./lib/supabase";
import { LangProvider, useLang } from "./hooks/useLang";
import { Menu as MenuIcon, Home, Users, FolderKanban, BarChart3, Settings as SettingsIcon, Bell, ClipboardList, Trash2, MoreHorizontal, Moon, Sun } from "lucide-react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ClientsPage from "./components/ClientsPage";
import ProgramsPage from "./components/ProgramsPage";
import ClearancePage from "./components/ClearancePage";
import NotificationsPage from "./components/NotificationsPage";
import SettingsPage from "./components/SettingsPage";
import ActivityLogPage from "./components/ActivityLogPage";
import TrashPage from "./components/TrashPage";
import LoginPage from "./components/LoginPage";
import SetPasswordPage from "./components/SetPasswordPage";
import { Modal, Toast, Button } from "./components/UI";
import { IconBubble } from "./components/Icon";
import { formatNotificationMessage, resolveNotificationTarget } from "./utils/notifications";
import ClientDetail from "./components/ClientDetail";
import ClientForm from "./components/ClientForm";
import ErrorBoundary from "./components/ErrorBoundary";

const VALID_PAGES = ["dashboard","clients","programs","clearance","activity","trash","settings","notifications"];
function getInitialPage() {
  const hash = window.location.hash.replace("#", "").trim();
  return VALID_PAGES.includes(hash) ? hash : "dashboard";
}

function AppInner({ agencyId, onLogout, currentUserRole, currentUserId }) {
  const { t, tr, lang, dir, setLang } = useLang();
  const [toast,          setToast]          = React.useState(null);
  const showToast = React.useCallback((msg, type="success") => setToast({ message: msg, type, id: Date.now() }), []);
  const store = useStore(agencyId, showToast);
  const [page,           setPage]           = React.useState(getInitialPage);
  const [pageHistory,    setPageHistory]    = React.useState([]);
  const [selectedClient, setSelectedClient] = React.useState(null);
  const [editingClient,  setEditingClient]  = React.useState(null);
  const [previewNotification, setPreviewNotification] = React.useState(null);
  const [themeMode, setThemeMode] = React.useState(() => {
    try {
      const saved = localStorage.getItem("rukn-theme");
      return saved === "light" || saved === "dark" ? saved : "dark";
    } catch {
      return "dark";
    }
  });

  React.useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    try {
      localStorage.setItem("rukn-theme", themeMode);
    } catch {}
  }, [themeMode]);

  const toggleThemeMode = React.useCallback(() => {
    setThemeMode((current) => current === "dark" ? "light" : "dark");
  }, []);

  const navigate = React.useCallback((target) => {
    setPageHistory(h => [...h, page]);
    setPage(target);
    window.history.pushState({ page: target }, "", "#" + target);
  }, [page]);

  const goBack = () => {
    if (pageHistory.length > 0) {
      window.history.back(); // triggers popstate which handles state
    } else {
      navigate("dashboard");
    }
  };

  // Sync browser back/forward button with React state
  React.useEffect(() => {
    const handlePopState = (e) => {
      const target = e.state?.page || getInitialPage();
      setPage(target);
      setPageHistory(h => h.slice(0, -1));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // On mount: ensure hash is set so refresh preserves current page
  React.useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState({ page: "dashboard" }, "", "#dashboard");
    }
  }, []);
  const handleBrandNavigate = React.useCallback(() => {
    if (page === "dashboard") {
      if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
    navigate("dashboard");
  }, [page, navigate]);

  const isRTL = lang === "ar";
  const navItems = React.useMemo(() => ([
    { id: "dashboard", icon: Home,          label: t.dashboard },
    { id: "clients",   icon: Users,         label: t.clients },
    { id: "programs",  icon: FolderKanban,  label: t.programs },
    { id: "activity",  icon: ClipboardList, label: t.activityLog || t.recentActivity },
    { id: "clearance", icon: BarChart3,     label: t.clearance },
    { id: "trash",     icon: Trash2,        label: t.trash },
    { id: "settings",  icon: SettingsIcon,  label: t.settings },
  ]), [t]);

  const openNotificationPreview = React.useCallback((notification) => {
    if (!notification) return;
    const resolvedMessage = formatNotificationMessage(notification, {
      programs: store.programs,
      activeClients: store.activeClients,
      getClientStatus: store.getClientStatus,
      tr,
    });
    setPreviewNotification({ ...notification, resolvedMessage });
  }, [store.programs, store.activeClients, store.getClientStatus, tr]);

  const handleNotificationAction = React.useCallback((notification) => {
    if (!notification) return;
    const target = resolveNotificationTarget(notification);
    if (target?.type === "client" && target.targetId) {
      const client = store.clients.find((c) => c.id === target.targetId);
      if (client) {
        navigate("clients");
        setSelectedClient(client);
        return;
      }
    }
    if (target?.route) {
      navigate(target.route);
      return;
    }
    openNotificationPreview(notification);
  }, [navigate, openNotificationPreview, store.clients]);

  return (
    <>
      <style>{globalCSS}</style>
      <div style={{ position:"fixed", inset:0, zIndex:-1,
        background:"radial-gradient(ellipse 80% 50% at 50% -20%,rgba(26,107,58,.3),transparent)",
        opacity: themeMode === "light" ? 0.24 : 1,
        pointerEvents:"none" }} />
      <div style={{ position:"fixed", inset:0, zIndex:-1,
        background:"radial-gradient(ellipse 60% 40% at 80% 80%,rgba(212,175,55,.06),transparent)",
        opacity: themeMode === "light" ? 0.7 : 1,
        pointerEvents:"none" }} />
      <div style={{ position:"fixed", inset:0, zIndex:-1,
        backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M30 0 L60 30 L30 60 L0 30Z' fill='none' stroke='rgba(212,175,55,0.03)' stroke-width='1'/%3E%3C/svg%3E")`,
        backgroundRepeat:"repeat", pointerEvents:"none" }} />

      <div className="app-shell" style={{ display:"flex", direction:dir, minHeight:"100vh" }}>
        <Sidebar active={page} onNavigate={navigate} stats={store.stats}
          syncStatus={store.syncStatus}
          notificationsCount={store.unreadNotificationsCount}
          agency={store.agency}
          themeMode={themeMode}
          onToggleTheme={toggleThemeMode}
          onExport={() => { store.exportData(); showToast(t.exportSuccess, "success"); }}
          onImport={async(f)=>{ try{ await store.importData(f); showToast(t.importSuccess, "success"); }catch{ showToast(t.importError, "error"); } }}
          onLogout={onLogout} />

        <main className="app-main" style={{ flex:1, overflowY:"auto", minHeight:"100vh" }}>
          {/* DB loading skeleton */}
          {store.dbLoading && <AppSkeleton />}
          {/* Syncing indicator (top bar) */}
          {store.dbSyncing && !store.dbLoading && (
            <div style={{
              position:"fixed", top:12,
              [lang === "ar" ? "left" : "right"]: 12,
              zIndex:9997,
              background:"rgba(212,175,55,.12)",
              border:"1px solid rgba(212,175,55,.3)",
              borderRadius:20, padding:"4px 14px",
              display:"flex", alignItems:"center", gap:8,
              fontSize:11, color:"#d4af37",
              fontFamily:"'Cairo',sans-serif",
            }}>
              <div style={{
                width:10, height:10, border:"2px solid rgba(212,175,55,.3)",
                borderTop:"2px solid #d4af37", borderRadius:"50%",
                animation:"spin 1s linear infinite", flexShrink:0,
              }} />
              {lang === "fr" ? "Synchronisation..." : "جاري المزامنة..."}
            </div>
          )}
          {page !== "dashboard" && (
            <BackBar
              onBack={goBack}
              label={t.back}
              dir={dir}
              actions={
                <HeaderActions
                  lang={lang}
                  dir={dir}
                  setLang={setLang}
                  store={store}
                  t={t}
                  tr={tr}
                  onNavigate={navigate}
                  page={page}
                  variant="compact"
                  themeMode={themeMode}
                  onToggleTheme={toggleThemeMode}
                  onNotificationAction={handleNotificationAction}
                />
              }
              pageName={{
                clients: t.clients,
                programs: t.programs,
                notifications: t.notifications,
                trash: t.trash,
                activity: t.activityLog,
                clearance: t.clearance,
                settings: t.settings,
              }[page]}
            />
          )}

          {page==="dashboard"  && (
            <ErrorBoundary>
              <Dashboard
                store={store}
                onNavigate={navigate}
                onSelectClient={setSelectedClient}
                headerActions={
                  <HeaderActions
                    lang={lang}
                    dir={dir}
                    setLang={setLang}
                    store={store}
                    t={t}
                    tr={tr}
                    onNavigate={navigate}
                    page={page}
                    themeMode={themeMode}
                    onToggleTheme={toggleThemeMode}
                    onNotificationAction={handleNotificationAction}
                  />
                }
                onBrandNavigate={handleBrandNavigate}
              />
            </ErrorBoundary>
          )}
          {page==="clients"    && <ErrorBoundary><ClientsPage store={store} onToast={showToast} /></ErrorBoundary>}
          {page==="programs"   && <ErrorBoundary><ProgramsPage store={store} onToast={showToast} /></ErrorBoundary>}
          {page==="notifications" && (
            <ErrorBoundary>
              <NotificationsPage
                store={store}
                onNotificationAction={handleNotificationAction}
              />
            </ErrorBoundary>
          )}
          {page==="trash" && <ErrorBoundary><TrashPage store={store} onToast={showToast} /></ErrorBoundary>}
          {page==="activity" && <ErrorBoundary><ActivityLogPage store={store} /></ErrorBoundary>}
          {page==="clearance"  && <ErrorBoundary><ClearancePage store={store} /></ErrorBoundary>}
          {page==="settings"   && (
            <ErrorBoundary>
              <SettingsPage
                store={store}
                onToast={showToast}
                currentUserRole={currentUserRole}
                currentUserId={currentUserId}
              />
            </ErrorBoundary>
          )}
        </main>
      </div>
      <MobileNav navItems={navItems} dir={dir} active={page} onNavigate={navigate} />

      <Modal open={!!selectedClient} onClose={()=>setSelectedClient(null)} title={t.clientFile} width={680}>
        {selectedClient && <ClientDetail client={selectedClient} store={store}
          onClose={()=>setSelectedClient(null)}
          onEdit={c=>{ setSelectedClient(null); setEditingClient(c); }}
          onToast={showToast} />}
      </Modal>

      <Modal open={!!editingClient} onClose={()=>setEditingClient(null)} title={t.edit+" — "+t.fullName} width={680}>
        {editingClient && <ClientForm client={editingClient} store={store}
          onSave={()=>{ setEditingClient(null); showToast(t.updateSuccess, "success"); }}
          onCancel={()=>setEditingClient(null)} />}
      </Modal>

      <Modal
        open={!!previewNotification}
        onClose={() => setPreviewNotification(null)}
        title={previewNotification?.title || t.notificationsDefaultTitle || "تنبيه"}
        width={420}
      >
        {previewNotification && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 14, color: "rgba(248,250,252,.9)", lineHeight: 1.6 }}>
              {previewNotification.resolvedMessage || previewNotification.message}
            </p>
            {previewNotification.createdAt && (
              <p style={{ fontSize: 12, color: "rgba(148,163,184,.8)" }}>
                {new Date(previewNotification.createdAt).toLocaleString(lang === "ar" ? "ar-MA" : lang === "fr" ? "fr-FR" : "en-US")}
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button size="sm" variant="secondary" onClick={() => setPreviewNotification(null)}>
                {t.close || "إغلاق"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={()=>setToast(null)} />}
    </>
  );
}

function LangSwitcher({ lang, dir, setLang, className = "" }) {
  const options = [
    { code: "ar", label: "AR" },
    { code: "fr", label: "FR" },
    { code: "en", label: "EN" },
  ];
  const switcherClass = [
    "lang-switcher",
    `lang-switcher--${dir === "rtl" ? "rtl" : "ltr"}`,
    className,
  ].filter(Boolean).join(" ");
  return (
    <div className={switcherClass}>
      {options.map(opt => (
        <button
          key={opt.code}
          type="button"
          onClick={() => setLang(opt.code)}
          aria-pressed={lang === opt.code}
          className={`lang-switcher-btn${lang === opt.code ? " is-active" : ""}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ThemeToggle({ themeMode, onToggleTheme, compact = false }) {
  const isLight = themeMode === "light";
  return (
    <button
      type="button"
      onClick={onToggleTheme}
      title={isLight ? "الوضع الليلي" : "الوضع النهاري"}
      aria-label={isLight ? "الوضع الليلي" : "الوضع النهاري"}
      aria-pressed={isLight}
      style={{
        width: compact ? 36 : 44,
        height: compact ? 36 : 44,
        borderRadius: "50%",
        border: "1px solid var(--rukn-border-soft)",
        background: "var(--rukn-bg-card)",
        color: "var(--rukn-gold)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "var(--rukn-shadow-card)",
        transition: "transform .2s ease, border-color .2s ease, background .2s ease",
        flexShrink: 0,
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = "translateY(-2px)";
        event.currentTarget.style.borderColor = "var(--rukn-border)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = "none";
        event.currentTarget.style.borderColor = "var(--rukn-border-soft)";
      }}
    >
      {isLight ? <Moon size={compact ? 16 : 18} /> : <Sun size={compact ? 16 : 18} />}
    </button>
  );
}

function HeaderActions({ lang, dir, setLang, store, t, tr, onNavigate, page, variant = "full", themeMode, onToggleTheme, onNotificationAction }) {
  const directionClass = dir === "rtl" ? "header-actions--rtl" : "header-actions--ltr";
  const classes = ["header-actions", `header-actions--${variant}`, directionClass].join(" ");
  return (
    <div className={classes}>
      <ThemeToggle
        themeMode={themeMode}
        onToggleTheme={onToggleTheme}
        compact={variant === "compact"}
      />
      <LangSwitcher
        lang={lang}
        dir={dir}
        setLang={setLang}
        className="header-actions__lang"
      />
      <NotificationBell
        store={store}
        dir={dir}
        lang={lang}
        tr={tr}
        t={t}
        onNavigate={onNavigate}
        page={page}
        size={variant === "compact" ? "sm" : "md"}
        onNotificationAction={onNotificationAction}
      />
    </div>
  );
}

function NotificationBell({ store, dir, lang, tr, t, onNavigate, page, size = "md", onNotificationAction }) {
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef(null);
  const dropdownRef = React.useRef(null);
  const locale = lang === "fr" ? "fr-FR" : lang === "en" ? "en-US" : "ar-MA";
  const unreadCount = store.unreadNotificationsCount || 0;
  const buttonSize = size === "sm" ? 36 : 44;
  const iconSize = size === "sm" ? 16 : 18;
  const defaultAlign = React.useMemo(() => (dir === "rtl" ? "start" : "end"), [dir]);
  const [dropdownAlign, setDropdownAlign] = React.useState(defaultAlign);

  const latestNotifications = React.useMemo(() => {
    const list = (store.notifications || []).filter((n) => !n.isArchived);
    list.sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      return bDate - aDate;
    });
    return list.slice(0, 5);
  }, [store.notifications]);

  const formatRelativeTime = React.useCallback((value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    try {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
      const diffMs = date.getTime() - Date.now();
      const diffMinutes = Math.round(diffMs / 60000);
      if (Math.abs(diffMinutes) < 60) {
        return rtf.format(diffMinutes, "minute");
      }
      const diffHours = Math.round(diffMs / 3600000);
      if (Math.abs(diffHours) < 24) {
        return rtf.format(diffHours, "hour");
      }
      const diffDays = Math.round(diffMs / 86400000);
      return rtf.format(diffDays, "day");
    } catch (err) {
      const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
      if (diff < 60) return `${diff}m`;
      const h = Math.floor(diff / 60);
      if (h < 24) return `${h}h`;
      const d = Math.floor(h / 24);
      return `${d}d`;
    }
  }, [locale]);

  React.useEffect(() => {
    setDropdownAlign(defaultAlign);
  }, [defaultAlign]);

  React.useEffect(() => {
    if (!open) return;
    const handlePointer = (event) => {
      if (buttonRef.current?.contains(event.target) || dropdownRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  React.useEffect(() => {
    setOpen(false);
  }, [page]);

  React.useEffect(() => {
    if (!open || !buttonRef.current) return;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const rect = buttonRef.current.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const nextAlign = center < viewportWidth / 2 ? "start" : "end";
    setDropdownAlign(nextAlign);
  }, [open]);

  const messageFor = React.useCallback(
    (notification) =>
      formatNotificationMessage(notification, {
        programs: store.programs,
        activeClients: store.activeClients,
        getClientStatus: store.getClientStatus,
        tr,
      }),
    [store.programs, store.activeClients, store.getClientStatus, tr]
  );

  const handleToggle = () => setOpen((prev) => !prev);
  const handleViewAll = () => {
    onNavigate("notifications");
    setOpen(false);
  };
  const handleMarkAll = () => {
    if (store.markAllNotificationsRead) store.markAllNotificationsRead();
  };

  const badgeOffset = size === "sm" ? -4 : -5;
  const badgePosition = dir === "rtl"
    ? { left: badgeOffset, right: "auto" }
    : { right: badgeOffset, left: "auto" };
  const dropdownPositionStyle = dropdownAlign === "start"
    ? { left: 0, right: "auto" }
    : { right: 0, left: "auto" };

  return (
    <div className={`notification-bell notification-bell--${dir}`}>
      <button
        ref={buttonRef}
        type="button"
        className="notification-bell__button"
        aria-label={t.notifications || "Notifications"}
        aria-expanded={open}
        onClick={handleToggle}
        style={{ width: buttonSize, height: buttonSize }}
      >
        <Bell size={iconSize} color="#f8fafc" />
        {unreadCount > 0 && (
          <span className="notification-bell__badge" style={{ top: badgeOffset, ...badgePosition }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div
          ref={dropdownRef}
          className="notification-dropdown"
          style={dropdownPositionStyle}
        >
          <div className="notification-dropdown__list">
            {latestNotifications.length === 0 ? (
              <p style={{ fontSize: 13, color: "rgba(248,250,252,.65)", margin: 0 }}>
                {t.noNotifications || "لا توجد إشعارات"}
              </p>
            ) : (
              latestNotifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  className={`notification-dropdown__item${notification.isRead ? "" : " is-unread"}`}
                  onClick={() => {
                    store.markNotificationRead?.(notification.id);
                    onNotificationAction?.(notification);
                    setOpen(false);
                  }}
                >
                  <div className="notification-dropdown__title-row">
                    <p className="notification-dropdown__title">
                      {notification.title || t.notificationsDefaultTitle || "تنبيه"}
                    </p>
                    {!notification.isRead && <span className="notification-dot" />}
                  </div>
                  <p className="notification-dropdown__message">
                    {messageFor(notification)}
                  </p>
                  <span className="notification-dropdown__time">
                    {formatRelativeTime(notification.createdAt)}
                  </span>
                </button>
              ))
            )}
          </div>
          <div className="notification-dropdown__actions">
            <button type="button" className="notification-dropdown__cta" onClick={handleViewAll}>
              {t.viewNotifications || "عرض الإشعارات"}
            </button>
            <button
              type="button"
              className="notification-dropdown__cta notification-dropdown__cta--ghost"
              onClick={handleMarkAll}
              disabled={!unreadCount}
            >
              {t.markAllRead || "وضع الكل كمقروء"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileNav({ navItems, dir, active, onNavigate }) {
  const [open, setOpen] = React.useState(false);
  const [secondaryOpen, setSecondaryOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      setOpen(false);
      setSecondaryOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);
  React.useEffect(() => { setOpen(false); setSecondaryOpen(false); }, [active]);
  React.useEffect(() => {
    if (!open && secondaryOpen) setSecondaryOpen(false);
  }, [open, secondaryOpen]);

  const primaryIds = ["dashboard", "clients", "programs", "clearance"];
  const secondaryIds = ["trash", "activity", "settings"];
  const primaryItems = primaryIds
    .map((id) => navItems.find((item) => item.id === id))
    .filter(Boolean);
  const secondaryItems = secondaryIds
    .map((id) => navItems.find((item) => item.id === id))
    .filter(Boolean);
  const showMore = secondaryItems.length > 0;

  const computeOffsets = React.useCallback((count, startX = 74, stepY = 60, decay = 10) => {
    const list = [];
    for (let i = 0; i < count; i += 1) {
      const y = -((i + 1) * stepY + (i > 2 ? (i - 2) * 6 : 0));
      const x = startX - Math.min(i, 4) * decay;
      list.push({ x, y });
    }
    return list;
  }, []);

  const directionMapper = React.useCallback((list) => (
    dir === "rtl" ? list.map(({ x, y }) => ({ x: -x, y })) : list
  ), [dir]);

  const primaryLayout = React.useMemo(() => (
    showMore ? [...primaryItems, { id: "__more", isMore: true }] : primaryItems
  ), [primaryItems, showMore]);

  const primaryOffsets = React.useMemo(() => (
    directionMapper(computeOffsets(primaryLayout.length, 78, 64, 12))
  ), [computeOffsets, directionMapper, primaryLayout.length]);

  const secondaryOffsets = React.useMemo(() => (
    directionMapper(computeOffsets(secondaryItems.length, 54, 56, 6))
  ), [computeOffsets, directionMapper, secondaryItems.length]);

  const handleNavigate = React.useCallback((id) => {
    onNavigate(id);
    setOpen(false);
    setSecondaryOpen(false);
  }, [onNavigate]);

  const labelDirSide = dir === "rtl" ? "left" : "right";

  return (
    <div ref={ref} className={`mobile-nav mobile-nav--${dir === "rtl" ? "rtl" : "ltr"}`}>
      <div className="mobile-nav-items">
        {primaryLayout.map((item, index) => {
        const offset = primaryOffsets[index] || { x: 0, y: 0 };
          const isMore = !!item.isMore;
          const visible = open && (!secondaryOpen || isMore);
          const style = {
            transform: visible
              ? `translate(${offset.x}px, ${offset.y}px) scale(1)`
              : "translate(0, 0) scale(0.7)",
            opacity: visible ? 1 : 0,
            pointerEvents: visible ? "auto" : "none",
            transitionDelay: visible ? `${index * 45}ms` : "0ms",
          };
          if (isMore) {
            return (
              <button
                key="mobile-nav-more"
                type="button"
                className={`mobile-nav-item mobile-nav-item--more${secondaryOpen ? " is-active" : ""}`}
                style={style}
                onClick={() => setSecondaryOpen((v) => !v)}
                aria-expanded={secondaryOpen}
                aria-label="More actions"
              >
                <span className={`mobile-nav-bubble mobile-nav-bubble--more${secondaryOpen ? " is-open" : ""}`}>
                  <MoreHorizontal size={18} color="#fff" strokeWidth={2} />
                </span>
                <span className="mobile-nav-label">⋯</span>
              </button>
            );
          }
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`mobile-nav-item${active === item.id ? " is-active" : ""}`}
              style={style}
              onClick={() => handleNavigate(item.id)}
            >
              <span className="mobile-nav-bubble" style={{ position: "relative" }}>
                <Icon size={18} color="#fff" strokeWidth={2} />
                {item.badge > 0 && (
                  <span className="mobile-nav-badge" style={{ [labelDirSide]: -6 }}>
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </span>
              <span className="mobile-nav-label">{item.label}</span>
            </button>
          );
        })}

        {secondaryItems.map((item, index) => {
          const offset = secondaryOffsets[index] || { x: 0, y: 0 };
        const visible = open && secondaryOpen;
          const style = {
            transform: visible
              ? `translate(${offset.x}px, ${offset.y}px) scale(1)`
              : "translate(0, 0) scale(0.6)",
            opacity: visible ? 1 : 0,
            pointerEvents: visible ? "auto" : "none",
            transitionDelay: visible ? `${index * 40}ms` : "0ms",
          };
          const Icon = item.icon;
          return (
            <button
              key={`secondary-${item.id}`}
              type="button"
              className={`mobile-nav-item mobile-nav-item--secondary${active === item.id ? " is-active" : ""}`}
              style={style}
              onClick={() => handleNavigate(item.id)}
            >
              <span className="mobile-nav-bubble mobile-nav-bubble--secondary">
                <Icon size={16} color="#fff" strokeWidth={2} />
              </span>
              <span className="mobile-nav-label mobile-nav-label--secondary">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={`mobile-nav-toggle${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => {
          if (v) setSecondaryOpen(false);
          return !v;
        })}
        aria-label="Toggle navigation"
        aria-expanded={open}
      >
        <MenuIcon size={20} color="#fff" strokeWidth={2} />
      </button>
    </div>
  );
}

function BackBar({ onBack, label, pageName, dir, actions }) {
  const separator = dir === "rtl" ? "‹" : "›";
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, padding:"10px 28px",
      background:"rgba(6,13,26,.85)", borderBottom:"1px solid rgba(212,175,55,.1)",
      backdropFilter:"blur(10px)", position:"sticky", top:0, zIndex:40 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6,
          background:"rgba(212,175,55,.1)", border:"1px solid rgba(212,175,55,.25)",
          borderRadius:10, padding:"6px 14px", color:"#d4af37",
          fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Cairo',sans-serif",
          transition:"all .2s" }}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(212,175,55,.2)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(212,175,55,.1)"}>
          {label}
        </button>
        <span style={{ fontSize:12, color:"rgba(148,163,184,.4)" }}>{separator}</span>
        <span style={{ fontSize:13, color:"#f8fafc", fontWeight:600 }}>{pageName}</span>
      </div>
      {actions && (
        <div style={{ flexShrink:0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}

// ── App skeleton shown while Supabase performs initial data fetch ─────────────
function SkeletonBox({ w = "100%", h = 20, r = 8, style }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: "linear-gradient(90deg,rgba(212,175,55,.06) 25%,rgba(212,175,55,.12) 50%,rgba(212,175,55,.06) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.6s infinite",
      flexShrink: 0,
      ...style,
    }} />
  );
}

function AppSkeleton() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9998,
      background: "#060d1a", display: "flex",
    }}>
      {/* Sidebar skeleton */}
      <div style={{
        width: 220, flexShrink: 0,
        background: "rgba(10,22,45,.9)",
        borderInlineEnd: "1px solid rgba(212,175,55,.1)",
        padding: "24px 16px", display: "flex", flexDirection: "column", gap: 10,
      }}>
        <SkeletonBox h={38} r={10} style={{ marginBottom: 16 }} />
        {[1,2,3,4,5].map(i => <SkeletonBox key={i} h={44} r={10} />)}
      </div>

      {/* Main content skeleton */}
      <div style={{ flex: 1, padding: "32px 32px", display: "flex", flexDirection: "column", gap: 18, overflowY: "hidden" }}>
        {/* Hero */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SkeletonBox w={260} h={34} r={8} />
          <SkeletonBox w={420} h={44} r={12} />
        </div>
        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
          {[1,2,3,4,5,6].map(i => <SkeletonBox key={i} h={88} r={16} />)}
        </div>
        {/* List rows */}
        <SkeletonBox w={160} h={20} r={6} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1,2,3,4].map(i => <SkeletonBox key={i} h={62} r={12} />)}
        </div>
      </div>
    </div>
  );
}

// Extracts invite/recovery auth data from the URL hash.
// Returns { type, accessToken, refreshToken } or null.
// All three fields must be present to avoid false positives.
function detectAuthFromURL() {
  try {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return null;
    const params        = new URLSearchParams(hash.substring(1));
    const type          = params.get("type");
    const accessToken   = params.get("access_token");
    const refreshToken  = params.get("refresh_token");
    if (!type || !accessToken || !refreshToken) return null;
    if (type !== "recovery" && type !== "invite") return null;
    return { type, accessToken, refreshToken };
  } catch { return null; }
}

// ── Auth gate ─────────────────────────────────────────────────────────────────
function AuthGate() {
  // Captured synchronously on first render — all three tokens must be present.
  const [authFromURL] = React.useState(() => detectAuthFromURL());

  const { user, agencyId, loading, login, logout, needsPasswordSet, profileError } = useAuth();

  // Local-only mode: bypass auth entirely
  if (!isSupabaseEnabled) {
    return <AppInner agencyId={null} onLogout={null} currentUserRole={null} currentUserId={null} />;
  }

  // Real Supabase invite/recovery link → SetPasswordPage handles its own session
  if (authFromURL || needsPasswordSet) {
    return <SetPasswordPage authData={authFromURL} />;
  }

  if (loading) return <AppLoadingScreen />;

  if (profileError === "disabled") {
    return <DisabledAccountScreen onLogout={logout} />;
  }

  // Logged in but no row in public.users → show actionable error
  if (user && profileError === "no_profile") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#060d1a", color: "#f8fafc", fontFamily: "'Cairo', sans-serif",
        padding: 24, textAlign: "center",
      }}>
        <div style={{
          maxWidth: 480, background: "rgba(10,22,45,.9)",
          border: "1px solid rgba(212,175,55,.3)", borderRadius: 20, padding: 40,
        }}>
          <IconBubble name="alert" boxSize={56} size={26} color="#f59e0b" bg="rgba(245,158,11,.12)" border="rgba(245,158,11,.28)" style={{ margin:"0 auto 16px" }} />
          <h2 style={{ color: "#d4af37", marginBottom: 12 }}>الحساب غير مرتبط بوكالة</h2>
          <p style={{ color: "rgba(148,163,184,.8)", fontSize: 13, lineHeight: 1.8, marginBottom: 24 }}>
            تم تسجيل الدخول بنجاح لكن لا يوجد ملف تعريف لهذا المستخدم في قاعدة البيانات.
            <br />شغّل هذا في Supabase SQL Editor:
          </p>
          <pre style={{
            background: "rgba(0,0,0,.4)", border: "1px solid rgba(212,175,55,.2)",
            borderRadius: 10, padding: 16, fontSize: 11, textAlign: "left",
            color: "#4ade80", overflowX: "auto", marginBottom: 24,
            whiteSpace: "pre-wrap", direction: "ltr",
          }}>{`INSERT INTO public.users (id, agency_id, role, full_name)\nSELECT au.id,\n  (SELECT id FROM public.agencies LIMIT 1),\n  'owner', split_part(au.email,'@',1)\nFROM auth.users au\nWHERE au.email = '${user.email}';`}</pre>
          <button
            onClick={async () => { await logout(); window.location.reload(); }}
            style={{
              padding: "10px 28px", borderRadius: 10, border: "1px solid rgba(212,175,55,.3)",
              background: "rgba(212,175,55,.1)", color: "#d4af37", fontSize: 14,
              fontFamily: "'Cairo', sans-serif", cursor: "pointer",
            }}
          >تسجيل الخروج والمحاولة مجدداً</button>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user || !agencyId) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <AppInner
      agencyId={agencyId}
      onLogout={logout}
      currentUserRole={user?.profile?.role || null}
      currentUserId={user?.id || null}
    />
  );
}

// Minimal full-screen loader shown only during session restore (< 1 sec normally)
function AppLoadingScreen() {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#060d1a",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 16,
    }}>
      <IconBubble name="brand" boxSize={56} size={26} style={{ animation: "float 4s ease-in-out infinite" }} />
      <div style={{
        width: 32, height: 32, border: "3px solid rgba(212,175,55,.2)",
        borderTop: "3px solid #d4af37", borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }} />
    </div>
  );
}

function DisabledAccountScreen({ onLogout }) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#060d1a", color: "#f8fafc", fontFamily: "'Cairo', sans-serif",
      padding: 24, textAlign: "center",
    }}>
      <div style={{
        maxWidth: 420, background: "rgba(10,22,45,.9)",
        border: "1px solid rgba(239,68,68,.35)", borderRadius: 20, padding: 36,
      }}>
        <IconBubble name="shieldAlert" boxSize={54} size={25} color="#ef4444" bg="rgba(239,68,68,.12)" border="rgba(239,68,68,.3)" style={{ margin:"0 auto 14px" }} />
        <h2 style={{ color: "#ef4444", marginBottom: 10 }}>الحساب موقوف</h2>
        <p style={{ color: "rgba(148,163,184,.85)", fontSize: 13, lineHeight: 1.8, marginBottom: 22 }}>
          تم تعطيل هذا الحساب. يرجى التواصل مع مسؤول الوكالة لإعادة تفعيله.
        </p>
        <button
          type="button"
          onClick={onLogout}
          style={{
            padding: "10px 24px", borderRadius: 10, border: "1px solid rgba(212,175,55,.3)",
            background: "rgba(212,175,55,.1)", color: "#d4af37", fontSize: 14,
            fontFamily: "'Cairo', sans-serif", cursor: "pointer",
          }}
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AuthGate />
    </LangProvider>
  );
}
