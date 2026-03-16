import React from "react";
import { Input, Button, GlassCard, Divider } from "./UI";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { isSupabaseEnabled } from "../lib/supabase";

const t2 = theme.colors;

export default function SettingsPage({ store, onToast }) {
  const { agency, updateAgency, syncStatus, lastSynced, forceSync } = store;
  const { lang, setLang, t } = useLang();
  const [form,       setForm]      = React.useState({ ...agency });
  const [isSyncing,  setIsSyncing] = React.useState(false);
  const set = k => e => setForm(f => ({...f, [k]: e.target.value}));

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await forceSync();
      onToast("تمت المزامنة بنجاح ✅", "success");
    } catch {
      onToast("فشلت المزامنة — تحقق من الاتصال", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = () => {
    updateAgency(form);
    onToast(t.saveSettingsSuccess, "success");
  };

  return (
    <div className="page-body settings-page" style={{ padding:"24px 32px" }}>
      <h1 style={{ fontSize:21, fontWeight:800, color:"#f8fafc", marginBottom:6 }}>{t.settingsTitle}</h1>
      <p style={{ fontSize:12, color:t2.grey, marginBottom:24 }}>
        {t.settingsDesc}
      </p>

      {/* Language switcher */}
      <GlassCard gold style={{ padding:16, marginBottom:20 }}>
        <p style={{ fontSize:13, fontWeight:700, color:t2.gold, marginBottom:12 }}>{t.languageTitle}</p>
        <div className="button-row" style={{ display:"flex", gap:10 }}>
          {[
            { code:"ar", label:"العربية", flag:"🇲🇦" },
            { code:"fr", label:"Français", flag:"🇫🇷" },
            { code:"en", label:"English", flag:"🇺🇸" },
          ].map(l => (
            <button key={l.code} onClick={() => setLang(l.code)} style={{
              padding:"10px 24px", borderRadius:10,
              background: lang===l.code ? "rgba(212,175,55,.2)" : "rgba(255,255,255,.04)",
              border:`2px solid ${lang===l.code ? t2.gold : "rgba(255,255,255,.1)"}`,
              color: lang===l.code ? t2.gold : t2.grey,
              fontSize:14, fontWeight:700, cursor:"pointer",
              fontFamily:"'Cairo',sans-serif", transition:"all .2s",
            }}>
              {l.flag} {l.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize:11, color:t2.grey, marginTop:8 }}>
          * {t.appName} {t.appNameNote}
        </p>
      </GlassCard>

      {/* Agency info */}
      <GlassCard gold style={{ padding:20, marginBottom:20 }}>
        <p style={{ fontSize:13, fontWeight:700, color:t2.gold, marginBottom:16 }}>{t.agencyInfoTitle}</p>
        <div className="form-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <Input label={t.agencyNameArLabel} value={form.nameAr} onChange={set("nameAr")} />
          <Input label={t.agencyNameFrLabel} value={form.nameFr} onChange={set("nameFr")} />
          <Input label={t.addressTiznitLabel} value={form.addressTiznit} onChange={set("addressTiznit")}
            style={{ gridColumn:"1/-1" }} />
          <Input label={t.addressAgadirLabel} value={form.addressAgadir} onChange={set("addressAgadir")}
            style={{ gridColumn:"1/-1" }} />
          <Input label={t.phoneTiznit1} value={form.phoneTiznit1} onChange={set("phoneTiznit1")} />
          <Input label={t.phoneTiznit2} value={form.phoneTiznit2} onChange={set("phoneTiznit2")} />
          <Input label={t.phoneAgadir1} value={form.phoneAgadir1} onChange={set("phoneAgadir1")} />
          <Input label={t.phoneAgadir2} value={form.phoneAgadir2} onChange={set("phoneAgadir2")} />
          <Input label={t.iceLabel} value={form.ice} onChange={set("ice")} placeholder={t.icePlaceholder} />
          <Input label={t.rcLabel} value={form.rc} onChange={set("rc")} />
          <Input label={t.email} value={form.email} onChange={set("email")} />
          <Input label={t.website} value={form.website} onChange={set("website")} />
        </div>
        <div className="page-actions" style={{ marginTop:16 }}>
          <Button variant="primary" icon="💾" onClick={handleSave}>{t.saveSettingsLabel}</Button>
        </div>
      </GlassCard>

      {/* Cloud connection status */}
      {isSupabaseEnabled && (
        <GlassCard style={{ padding:20, marginBottom:20 }}>
          <p style={{ fontSize:13, fontWeight:700, color:t2.gold, marginBottom:16 }}>
            {lang === "fr" ? "☁️ État du système" : lang === "en" ? "☁️ System Status" : "☁️ حالة النظام"}
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
            icon="🔄"
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
          <Button variant="success" icon="⬇️" onClick={() => { store.exportData(); onToast(t.exportSuccess, "success"); }}>
            {t.exportAllData}
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
