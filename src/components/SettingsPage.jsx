import React from "react";
import { Input, Button, GlassCard, Divider } from "./UI";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { isSupabaseEnabled } from "../lib/supabase";
import UsersPage from "./UsersPage";
import { AppIcon } from "./Icon";
import { BadgeTemplatesPage } from "../features/badges";

const t2 = theme.colors;

function SettingsSectionCard({ title, description, open, onToggle, children }) {
  return (
    <GlassCard gold={open} style={{ padding: open ? 18 : 14, marginBottom: 14 }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          border: "none",
          background: "transparent",
          color: "var(--rukn-text)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          padding: 0,
          textAlign: "start",
          fontFamily: "'Cairo',sans-serif",
        }}
      >
        <span>
          <span style={{ display: "block", fontSize: 14, fontWeight: 900, color: t2.gold }}>{title}</span>
          <span style={{ display: "block", fontSize: 12, color: t2.grey, marginTop: 4, lineHeight: 1.6 }}>
            {description}
          </span>
        </span>
        <span style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          border: "1px solid var(--rukn-border-soft)",
          background: "var(--rukn-bg-soft)",
          color: t2.gold,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}>
          {open ? "⌃" : "⌄"}
        </span>
      </button>
      {open && (
        <div style={{ marginTop: 16 }}>
          {children}
        </div>
      )}
    </GlassCard>
  );
}

export default function SettingsPage({ store, onToast, currentUserRole, currentUserId }) {
  const { agency, updateAgency, syncStatus, lastSynced, forceSync } = store;
  const { lang, setLang, t } = useLang();
  const [form,       setForm]      = React.useState({ ...agency });
  const [agencyOpen, setAgencyOpen] = React.useState(false);
  const [bankOpen, setBankOpen] = React.useState(false);
  React.useEffect(() => {
    setForm(agency);
  }, [agency]);
  const [isSyncing,  setIsSyncing] = React.useState(false);
  const set = k => e => setForm(f => ({...f, [k]: e.target.value}));

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await forceSync();
      onToast(t.syncSuccess || "تمت المزامنة بنجاح", "success");
    } catch {
      onToast(t.syncFailed || "فشلت المزامنة — تحقق من الاتصال", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = () => {
    updateAgency(form);
    onToast(t.saveSettingsSuccess, "success");
  };

  const normalizedRole = String(currentUserRole || "").toLowerCase();
  const canManageUsers = normalizedRole === "manager" || normalizedRole === "owner";

  return (
    <div className="page-body settings-page" style={{ padding:"24px 32px" }}>
      <h1 style={{ fontSize:21, fontWeight:800, color:"#f8fafc", marginBottom:6 }}>{t.settingsTitle}</h1>
      <p style={{ fontSize:12, color:t2.grey, marginBottom:24 }}>
        {t.settingsDesc}
      </p>

      {/* Language switcher */}
      <GlassCard style={{ padding:14, marginBottom:18 }}>
        <div style={{
          display:"flex",
          justifyContent:"space-between",
          alignItems:"center",
          gap:14,
          flexWrap:"wrap",
        }}>
          <div style={{ minWidth:190 }}>
            <p style={{ fontSize:14, fontWeight:900, color:"var(--rukn-text)", lineHeight:1.25 }}>{t.languageTitle}</p>
            <p style={{ fontSize:11.5, color:"var(--rukn-text-muted)", marginTop:3, lineHeight:1.55 }}>
              {t.appName} {t.appNameNote}
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label={t.languageTitle}
            style={{
              display:"inline-grid",
              gridTemplateColumns:"repeat(3,minmax(0,1fr))",
              gap:4,
              padding:4,
              borderRadius:999,
              background:"var(--rukn-bg-card)",
              border:"1px solid var(--rukn-border-soft)",
              boxShadow:"0 10px 28px rgba(15,23,42,.06)",
              width:"min(100%, 360px)",
              minWidth:0,
            }}
          >
            {[
              { code:"ar", label:"العربية", short:"AR" },
              { code:"fr", label:"Français", short:"FR" },
              { code:"en", label:"English", short:"EN" },
            ].map(l => {
              const active = lang === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setLang(l.code)}
                  style={{
                    minHeight:34,
                    padding:"6px 11px",
                    borderRadius:999,
                    border:`1px solid ${active ? "rgba(212,175,55,.45)" : "transparent"}`,
                    background:active ? "linear-gradient(135deg, rgba(212,175,55,.2), rgba(212,175,55,.1))" : "transparent",
                    color:active ? "var(--rukn-gold)" : "var(--rukn-text-muted)",
                    fontSize:12.5,
                    fontWeight:active ? 900 : 700,
                    cursor:"pointer",
                    fontFamily:"'Cairo',sans-serif",
                    transition:"background .18s ease, color .18s ease, border-color .18s ease, box-shadow .18s ease",
                    boxShadow:active ? "0 6px 18px rgba(212,175,55,.12)" : "none",
                    display:"inline-flex",
                    alignItems:"center",
                    justifyContent:"center",
                    gap:7,
                    whiteSpace:"nowrap",
                  }}
                >
                  <span style={{
                    fontSize:10,
                    fontWeight:900,
                    color:active ? "var(--rukn-gold)" : "var(--rukn-text-muted)",
                    opacity:active ? 1 : .72,
                  }}>{l.short}</span>
                  <span>{l.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {/* Agency info */}
      <SettingsSectionCard
        title={t.agencyInfoTitle}
        description={t.agencyInfoDesc}
        open={agencyOpen}
        onToggle={() => setAgencyOpen((current) => !current)}
      >
        <div className="form-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:12 }}>
          <Input label={t.agencyNameArLabel} value={form.nameAr || ""} onChange={set("nameAr")} />
          <Input label={t.agencyNameFrLabel} value={form.nameFr || ""} onChange={set("nameFr")} />
          <Input label={t.agencyCityLabel} value={form.city || ""} onChange={set("city")} />
          <Input label={t.iceLabel} value={form.ice || ""} onChange={set("ice")} placeholder={t.icePlaceholder} />
          <Input label={t.rcLabel} value={form.rc || ""} onChange={set("rc")} />
          <Input label={t.email} value={form.email || ""} onChange={set("email")} />
          <Input label={t.website} value={form.website || ""} onChange={set("website")} />
          <Input label={t.phoneTiznit1} value={form.phoneTiznit1 || ""} onChange={set("phoneTiznit1")} />
          <Input label={t.phoneAgadir1} value={form.phoneAgadir1 || ""} onChange={set("phoneAgadir1")} />
          <Input label={t.addressTiznitLabel} value={form.addressTiznit || ""} onChange={set("addressTiznit")}
            style={{ gridColumn:"1/-1" }} />
          <Input label={t.addressAgadirLabel} value={form.addressAgadir || ""} onChange={set("addressAgadir")}
            style={{ gridColumn:"1/-1" }} />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard
        title={t.bankInfoTitle}
        description={t.bankInfoDesc}
        open={bankOpen}
        onToggle={() => setBankOpen((current) => !current)}
      >
        <div className="form-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:12 }}>
          <Input label={t.bankNameLabel} value={form.bankName || ""} onChange={set("bankName")} />
          <Input label={t.bankAccountHolderLabel} value={form.bankAccountHolder || ""} onChange={set("bankAccountHolder")} />
          <Input label={t.bankRibLabel} value={form.bankRib || ""} onChange={set("bankRib")} />
          <Input label={t.bankIbanLabel} value={form.bankIban || ""} onChange={set("bankIban")} />
          <Input label={t.bankNoteLabel} value={form.bankNote || ""} onChange={set("bankNote")} style={{ gridColumn:"1/-1" }} />
        </div>
      </SettingsSectionCard>

      <div className="page-actions" style={{ marginBottom:20 }}>
        <Button variant="primary" icon="save" onClick={handleSave}>{t.saveSettingsLabel}</Button>
      </div>

      <BadgeTemplatesPage store={store} onToast={onToast} />

      {/* Cloud connection status */}
      {isSupabaseEnabled && (
        <GlassCard style={{ padding:20, marginBottom:20 }}>
          <p style={{ fontSize:13, fontWeight:700, color:t2.gold, marginBottom:16 }}>
            <AppIcon name="shieldCheck" size={15} style={{ marginInlineEnd:6, verticalAlign:"middle" }} />
            {t.systemStatusTitle || (lang === "fr" ? "État du système" : lang === "en" ? "System Status" : "حالة النظام")}
          </p>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <span style={{
              width:12, height:12, borderRadius:"50%", flexShrink:0,
              background:
                syncStatus === "synced"  ? "#22c55e" :
                syncStatus === "syncing" ? "#d4af37" : "#f59e0b",
              boxShadow:
                syncStatus === "synced"  ? "0 0 8px rgba(34,197,94,.6)" :
                syncStatus === "syncing" ? "0 0 8px rgba(212,175,55,.6)" : "0 0 8px rgba(245,158,11,.5)",
              animation: syncStatus === "syncing" ? "pulse 1.2s ease-in-out infinite" : "none",
            }} />
            <div>
              <p style={{ fontSize:14, fontWeight:700, color: syncStatus === "offline" ? "#f59e0b" : "#f8fafc" }}>
                {syncStatus === "synced"
                  ? (lang === "fr" ? "● Synchronisation active" : lang === "en" ? "● Sync active"      : "● مزامنة فعّالة")
                  : syncStatus === "syncing"
                  ? (lang === "fr" ? "● Synchronisation..."    : lang === "en" ? "● Syncing..."        : "● جاري التحديث...")
                  :  (lang === "fr" ? "● Mode hors ligne"       : lang === "en" ? "● Offline mode"      : "● وضع غير متصل")}
              </p>
              {lastSynced && (
                <p style={{ fontSize:11, color:t2.grey, marginTop:2 }}>
                  {lang === "fr" ? "Dernière mise à jour" : lang === "en" ? "Last updated" : "آخر تحديث"}
                  {" "}{lastSynced.toLocaleString(lang === "fr" ? "fr-FR" : lang === "en" ? "en-GB" : "ar-MA")}
                </p>
              )}
            </div>
          </div>
          <Button
            variant={isSyncing ? "ghost" : "secondary"}
            icon="refresh"
            disabled={isSyncing}
            onClick={handleForceSync}>
            {isSyncing
              ? (lang === "fr" ? "Mise à jour..." : lang === "en" ? "Syncing..."   : "جاري التحديث...")
              :  (lang === "fr" ? "Mettre à jour"  : lang === "en" ? "Sync now"    : "تحديث الآن")}
          </Button>
        </GlassCard>
      )}

      {/* Backup */}
      <GlassCard style={{ padding:20 }}>
        <p style={{ fontSize:13, fontWeight:700, color:t2.gold, marginBottom:14 }}>{t.backupTitle}</p>
        <p style={{ fontSize:12, color:t2.grey, marginBottom:16, lineHeight:1.7 }}>
          {t.backupHint}
        </p>
        <div className="page-actions" style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <Button variant="success" icon="download" onClick={() => { store.exportData(); onToast(t.exportSuccess, "success"); }}>
            {t.exportAllData}
          </Button>
        </div>
      </GlassCard>

      {canManageUsers && (
        <div style={{ marginTop: 24 }}>
          <UsersPage
            store={store}
            onToast={onToast}
            embedded
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
          />
        </div>
      )}
    </div>
  );
}
