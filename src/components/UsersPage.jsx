import React from "react";
import { GlassCard, Button, EmptyState, Modal, Input, Select } from "./UI";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";

const tc = theme.colors;

export default function UsersPage({
  store,
  onToast,
  embedded = false,
  currentUserRole = null,
  currentUserId = null,
}) {
  const { t, dir, lang } = useLang();
  const [loading, setLoading] = React.useState(false);
  const [isDesktop, setIsDesktop] = React.useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth > 900;
  });
  const users = store.agencyUsers || [];
  const refreshUsersFn = store.refreshAgencyUsers;
  const createUserFn = store.createAgencyUser;
  const updateUserFn = store.updateAgencyUser;
  const viewerRole = (currentUserRole || store?.currentUserRole || "").toLowerCase();
  const viewerId = currentUserId || store?.currentUserId || null;
  const canManageUsers = ["owner", "manager"].includes(viewerRole);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState(null);
  const [formState, setFormState] = React.useState({
    email: "",
    fullName: "",
    role: "staff",
    status: "active",
  });
  const [manageModalUser, setManageModalUser] = React.useState(null);
  const [manageState, setManageState] = React.useState({ role: "staff", status: "active" });
  const [manageSaving, setManageSaving] = React.useState(false);
  const [manageError, setManageError] = React.useState(null);

  const refresh = React.useCallback(async () => {
    if (typeof refreshUsersFn !== "function") return;
    setLoading(true);
    try {
      const { error } = await refreshUsersFn();
      if (error) throw error;
    } catch (err) {
      console.error("refreshAgencyUsers", err);
      if (onToast) onToast(t.usersLoadError || "تعذّر تحميل المستخدمين", "error");
    } finally {
      setLoading(false);
    }
  }, [refreshUsersFn, onToast, t.usersLoadError]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (typeof window === "undefined") return () => {};
    const handler = () => setIsDesktop(window.innerWidth > 900);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const formatDate = React.useCallback((value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    try {
      return d.toLocaleString(lang === "fr" ? "fr-FR" : lang === "en" ? "en-US" : "ar-MA", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return d.toISOString();
    }
  }, [lang]);

  const formatEmailDisplay = React.useCallback((email) => {
    if (!email) {
      return { text: t.usersEmailPlaceholder || "غير محدد", placeholder: true };
    }
    const normalized = email.trim().toLowerCase();
    if (normalized.endsWith("@placeholder.local")) {
      return { text: t.usersEmailPlaceholder || "غير محدد", placeholder: true };
    }
    return { text: email, placeholder: false };
  }, [t.usersEmailPlaceholder]);

  const canEditUser = React.useCallback((user) => {
    if (!canManageUsers || !user) return false;
    if (viewerId && user.id === viewerId) return false;
    const targetRole = (user.role || "").toLowerCase();
    if (viewerRole === "owner") return true;
    if (viewerRole === "manager") {
      return targetRole === "staff";
    }
    return false;
  }, [canManageUsers, viewerRole, viewerId]);

  const roleOptions = React.useMemo(() => {
    const base = [
      { value: "owner", label: t.usersRoleOwner || "Owner" },
      { value: "manager", label: t.usersRoleManager || "Manager" },
      { value: "staff", label: t.usersRoleStaff || "Staff" },
    ];
    if (viewerRole === "owner") return base;
    if (viewerRole === "manager") {
      return base.filter((opt) => opt.value !== "owner");
    }
    return [];
  }, [viewerRole, t.usersRoleOwner, t.usersRoleManager, t.usersRoleStaff]);

  const statusOptions = React.useMemo(() => {
    const base = [
      { value: "active", label: t.usersStatusActive || "Active" },
      { value: "disabled", label: t.usersStatusDisabled || "Disabled" },
      { value: "invited", label: t.usersStatusInvited || "Invited" },
    ];
    if (viewerRole === "manager") {
      return base.filter((opt) => opt.value !== "invited");
    }
    return base;
  }, [viewerRole, t.usersStatusActive, t.usersStatusDisabled, t.usersStatusInvited]);

  const openManageModal = React.useCallback((user) => {
    if (!user) return;
    setManageModalUser(user);
    setManageState({
      role: (user.role || "staff").toLowerCase(),
      status: (user.status || "active").toLowerCase(),
    });
    setManageError(null);
  }, []);

  const closeManageModal = React.useCallback(() => {
    if (manageSaving) return;
    setManageModalUser(null);
    setManageError(null);
  }, [manageSaving]);

  const handleManageSubmit = React.useCallback(async (e) => {
    e.preventDefault();
    if (!manageModalUser || !updateUserFn) return;
    setManageSaving(true);
    setManageError(null);
    try {
      await updateUserFn({ userId: manageModalUser.id, role: manageState.role, status: manageState.status });
      if (onToast) onToast(t.usersUpdateSuccess || "تم تحديث المستخدم", "success");
      setManageModalUser(null);
    } catch (err) {
      setManageError(err.message || t.error || "خطأ غير متوقع");
    } finally {
      setManageSaving(false);
    }
  }, [manageModalUser, manageState.role, manageState.status, onToast, t.usersUpdateSuccess, t.error, updateUserFn]);

  const containerStyle = {
    padding: embedded ? "0" : "28px 32px",
    direction: dir,
  };
  const headerStyle = {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: embedded ? 12 : 18,
  };

  return (
    <>
    <div className={embedded ? "" : "page-body users-page"} style={containerStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: tc.white }}>{t.usersPageTitle || t.usersTab || "المستخدمون"}</h1>
          <p style={{ fontSize: 13, color: tc.grey, marginTop: 4 }}>
            {t.usersPageSubtitle || "جميع الحسابات المرتبطة بوكالتك"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={refresh}
            disabled={loading}
            icon={loading ? "loading" : "refresh"}
          >
            {loading ? (t.loading || "...") : (t.usersRefresh || "تحديث")}
          </Button>
          {typeof createUserFn === "function" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setFormState({ email: "", fullName: "", role: "staff", status: "active" });
                setFormError(null);
                setShowAddModal(true);
              }}
            >
              {t.usersAdd || "Add User"}
            </Button>
          )}
        </div>
      </header>

      {users.length === 0 ? (
        <EmptyState title={t.usersEmpty || "لا يوجد مستخدمون"} icon="users" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{
            display: isDesktop ? "grid" : "none",
            gridTemplateColumns: "minmax(140px,1.2fr) minmax(180px,1.3fr) minmax(110px,0.9fr) minmax(100px,0.8fr) minmax(150px,1.1fr) minmax(100px,0.7fr)",
            gap: 12,
            padding: "10px 16px",
            borderRadius: 12,
            background: "rgba(212,175,55,.07)",
            border: "1px solid rgba(212,175,55,.15)",
            fontSize: 11,
            fontWeight: 700,
            color: tc.grey,
          }}>
            <span>{t.usersName || "Name"}</span>
            <span>{t.usersEmail || "Email"}</span>
            <span>{t.usersRole || "Role"}</span>
            <span>{t.usersStatus || "Status"}</span>
            <span>{t.usersLastLogin || "Last login"}</span>
            <span>{t.usersActions || "Actions"}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {users.map((user) => {
              const editable = canEditUser(user) && typeof updateUserFn === "function";
              return (
                <GlassCard
                  key={user.id}
                  style={{
                    padding: "14px 18px",
                    display: "grid",
                    gap: 12,
                    gridTemplateColumns: isDesktop
                      ? "minmax(140px,1.2fr) minmax(180px,1.3fr) minmax(110px,0.9fr) minmax(100px,0.8fr) minmax(150px,1.1fr) minmax(100px,0.7fr)"
                      : "1fr",
                  }}
                >
                  {isDesktop ? (
                    <>
                      <span style={{ color: tc.white, fontWeight: 600 }}>{user.fullName || "—"}</span>
                      <EmailValue value={user.email} formatEmailDisplay={formatEmailDisplay} />
                      <StatusPill value={user.role} kind="role" />
                      <StatusPill value={user.status} kind="status" />
                      <span style={{ color: tc.grey, fontSize: 13 }}>{formatDate(user.lastLogin)}</span>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        {editable ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openManageModal(user)}
                          >
                            {t.usersManage || "إدارة"}
                          </Button>
                        ) : (
                          <span style={{ color: theme.colors.grey, fontSize: 12 }}>—</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <MobileUserCard
                      user={user}
                      formatDate={formatDate}
                      t={t}
                      formatEmailDisplay={formatEmailDisplay}
                      canEdit={editable}
                      onManage={() => editable && openManageModal(user)}
                    />
                  )}
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}
    </div>
      <Modal
        open={showAddModal}
        onClose={() => { if (!saving) setShowAddModal(false); }}
        title={t.usersCreateTitle || t.usersAdd || "Add user"}
        width={480}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!createUserFn) return;
            setSaving(true);
            setFormError(null);
            try {
              await createUserFn(formState);
              if (onToast) onToast(t.usersCreateSuccess || "User created", "success");
              setShowAddModal(false);
            } catch (err) {
              setFormError(err.message || t.error || "خطأ غير متوقع");
            } finally {
              setSaving(false);
            }
          }}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <Input
            type="email"
            label={t.usersEmailLabel || t.usersEmail || "Email"}
            value={formState.email}
            required
            onChange={(e) => setFormState((prev) => ({ ...prev, email: e.target.value }))}
          />
          <Input
            label={t.usersNameLabel || "Full name"}
            value={formState.fullName}
            onChange={(e) => setFormState((prev) => ({ ...prev, fullName: e.target.value }))}
          />
          <Select
            label={t.usersRoleLabel || t.usersRole || "Role"}
            value={formState.role}
            onChange={(e) => setFormState((prev) => ({ ...prev, role: e.target.value }))}
            options={[
              { value: "owner", label: t.usersRoleOwner || "Owner" },
              { value: "manager", label: t.usersRoleManager || "Manager" },
              { value: "staff", label: t.usersRoleStaff || "Staff" },
            ]}
          />
          <Select
            label={t.usersStatusLabel || t.usersStatus || "Status"}
            value={formState.status}
            onChange={(e) => setFormState((prev) => ({ ...prev, status: e.target.value }))}
            options={[
              { value: "active", label: t.usersStatusActive || "Active" },
              { value: "invited", label: t.usersStatusInvited || "Invited" },
              { value: "disabled", label: t.usersStatusDisabled || "Disabled" },
            ]}
          />
          {formError && (
            <p style={{ color: theme.colors.danger, fontSize: 13 }}>{formError}</p>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { if (!saving) setShowAddModal(false); }}
              disabled={saving}
            >
              {t.cancel || "إلغاء"}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (t.loading || "...") : (t.save || "حفظ")}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={!!manageModalUser}
        onClose={closeManageModal}
        title={
          manageModalUser
            ? `${t.usersManage || "إدارة"} — ${manageModalUser.fullName || manageModalUser.email || ""}`
            : t.usersManage || "إدارة"
        }
        width={460}
      >
        <form onSubmit={handleManageSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Select
            label={t.usersRoleLabel || t.usersRole || "Role"}
            value={manageState.role}
            onChange={(e) => setManageState((prev) => ({ ...prev, role: e.target.value }))}
            options={roleOptions}
            disabled={!roleOptions.length}
            required
          />
          <Select
            label={t.usersStatusLabel || t.usersStatus || "Status"}
            value={manageState.status}
            onChange={(e) => setManageState((prev) => ({ ...prev, status: e.target.value }))}
            options={statusOptions}
            disabled={!statusOptions.length}
            required
          />
          {manageError && (
            <p style={{ color: theme.colors.danger, fontSize: 13 }}>{manageError}</p>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button type="button" variant="ghost" onClick={closeManageModal} disabled={manageSaving}>
              {t.cancel || "إلغاء"}
            </Button>
            <Button type="submit" disabled={manageSaving || (!roleOptions.length && !statusOptions.length)}>
              {manageSaving ? (t.loading || "...") : (t.save || "حفظ")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function StatusPill({ value, kind }) {
  if (!value) return <span style={{ color: theme.colors.grey }}>—</span>;
  const formatted = value === value.toLowerCase() ? value : value.toLowerCase();
  const color = kind === "status"
    ? formatted === "active" ? theme.colors.greenLight
      : formatted === "disabled" ? theme.colors.danger
        : theme.colors.gold
    : theme.colors.gold;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "4px 10px",
      borderRadius: 999,
      background: "rgba(255,255,255,.05)",
      border: `1px solid ${color}33`,
      color,
      fontSize: 12,
      fontWeight: 600,
      textTransform: "capitalize",
    }}>
      {formatted}
    </span>
  );
}

function EmailValue({ value, formatEmailDisplay }) {
  const { text, placeholder } = formatEmailDisplay(value);
  if (!placeholder) {
    return <span style={{ color: theme.colors.grey }}>{text}</span>;
  }
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "4px 10px",
      borderRadius: 999,
      background: "rgba(255,255,255,.04)",
      border: "1px dashed rgba(212,175,55,.4)",
      color: theme.colors.gold,
      fontSize: 12,
      fontWeight: 600,
    }}>
      {text}
    </span>
  );
}

function MobileUserCard({ user, formatDate, t, formatEmailDisplay, canEdit, onManage }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: theme.colors.white }}>{user.fullName || user.email}</div>
      <EmailValue value={user.email} formatEmailDisplay={formatEmailDisplay} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <StatusPill value={user.role} kind="role" />
        <StatusPill value={user.status} kind="status" />
      </div>
      <div style={{ fontSize: 12, color: theme.colors.grey }}>
        {(t.usersLastLogin || "Last login") + ": " + formatDate(user.lastLogin)}
      </div>
      {canEdit && (
        <div style={{ marginTop: 6 }}>
          <Button variant="ghost" size="sm" onClick={onManage}>
            {t.usersManage || "إدارة"}
          </Button>
        </div>
      )}
    </div>
  );
}
