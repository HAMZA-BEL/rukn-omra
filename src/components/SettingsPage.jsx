import React from "react";
import { Input, Button, GlassCard, Divider, Modal } from "./UI";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { isSupabaseEnabled } from "../lib/supabase";
import UsersPage from "./UsersPage";
import { AppIcon } from "./Icon";
import { BadgeTemplatesPage } from "../features/badges";
import { ContractTemplatesSettings } from "../features/contracts";
import { validateAgencyLogoFile } from "../utils/agencyLogo";

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
  const [logoOpen, setLogoOpen] = React.useState(false);
  const [bankOpen, setBankOpen] = React.useState(false);
  const [badgeTemplatesOpen, setBadgeTemplatesOpen] = React.useState(false);
  const [contractTemplatesOpen, setContractTemplatesOpen] = React.useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = React.useState(agency?.logoUrl || "");
  const [logoBusy, setLogoBusy] = React.useState(false);
  const [backupConfirmMode, setBackupConfirmMode] = React.useState(null);
  const [pendingImportFile, setPendingImportFile] = React.useState(null);
  const logoInputRef = React.useRef(null);
  const backupInputRef = React.useRef(null);
  React.useEffect(() => {
    setForm(agency);
  }, [agency]);
  React.useEffect(() => {
    let cancelled = false;
    const path = form?.logoPath || "";
    if (form?.logoUrl) {
      setLogoPreviewUrl(form.logoUrl);
      return undefined;
    }
    if (!path || !store.agencyLogoApi?.isAvailable || !store.agencyLogoApi.getLogoUrl) {
      setLogoPreviewUrl("");
      return undefined;
    }
    store.agencyLogoApi.getLogoUrl(path).then((url) => {
      if (!cancelled) setLogoPreviewUrl(url || "");
    });
    return () => { cancelled = true; };
  }, [form?.logoPath, form?.logoUrl, store.agencyLogoApi]);
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

  const logoUnavailableMessage = t.agencyLogoStorageUnavailable || (
    lang === "fr"
      ? "Le stockage Supabase du logo n’est pas configuré."
      : lang === "en"
      ? "Supabase logo storage is not configured."
      : "تخزين شعار الوكالة في Supabase غير مفعّل."
  );

  const logoUploadErrorMessage = (reason) => {
    if (reason === "type") return t.agencyLogoInvalidType || (
      lang === "fr" ? "Format non pris en charge. Utilisez PNG, JPG ou WEBP."
      : lang === "en" ? "Unsupported file type. Use PNG, JPG, or WEBP."
      : "صيغة الملف غير مدعومة. استعمل PNG أو JPG أو WEBP."
    );
    if (reason === "size") return t.agencyLogoTooLarge || (
      lang === "fr" ? "Le logo est trop volumineux. Taille maximale : 5 Mo."
      : lang === "en" ? "Logo is too large. Maximum size is 5 MB."
      : "حجم الشعار كبير جدًا. الحد الأقصى 5MB."
    );
    return t.agencyLogoUploadFailed || (
      lang === "fr" ? "Impossible d’importer le logo."
      : lang === "en" ? "Unable to upload logo."
      : "تعذر رفع الشعار."
    );
  };

  const handleLogoFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const validation = validateAgencyLogoFile(file);
    if (!validation.valid) {
      onToast(logoUploadErrorMessage(validation.reason), "error");
      return;
    }
    if (!store.agencyLogoApi?.isAvailable || !store.agencyLogoApi.uploadLogo) {
      onToast(logoUnavailableMessage, "error");
      return;
    }
    setLogoBusy(true);
    try {
      const previousPath = form.logoPath || "";
      const { data, error } = await store.agencyLogoApi.uploadLogo(file, previousPath);
      if (error) throw error;
      const path = data?.path || "";
      const previewUrl = store.agencyLogoApi.getLogoUrl ? await store.agencyLogoApi.getLogoUrl(path) : "";
      const next = { logoPath: path, logoUrl: previewUrl };
      setForm((current) => ({ ...current, ...next }));
      updateAgency(next);
      setLogoPreviewUrl(previewUrl);
      onToast(t.agencyLogoUploadSuccess || (lang === "fr" ? "Logo enregistré" : lang === "en" ? "Logo saved" : "تم حفظ الشعار"), "success");
    } catch (error) {
      onToast(logoUploadErrorMessage(error?.message?.replace("invalid-logo-", "")), "error");
    } finally {
      setLogoBusy(false);
    }
  };

  const handleRemoveLogo = async () => {
    const path = form.logoPath || "";
    setLogoBusy(true);
    try {
      if (path && store.agencyLogoApi?.isAvailable && store.agencyLogoApi.removeLogo) {
        const { error } = await store.agencyLogoApi.removeLogo(path);
        if (error) throw error;
      }
      const next = { logoPath: "", logoUrl: "" };
      setForm((current) => ({ ...current, ...next }));
      updateAgency(next);
      setLogoPreviewUrl("");
      onToast(t.agencyLogoRemoveSuccess || (lang === "fr" ? "Logo supprimé" : lang === "en" ? "Logo removed" : "تم حذف الشعار"), "success");
    } catch {
      onToast(t.agencyLogoRemoveFailed || (lang === "fr" ? "Impossible de supprimer le logo" : lang === "en" ? "Unable to remove logo" : "تعذر حذف الشعار"), "error");
    } finally {
      setLogoBusy(false);
    }
  };

  const normalizedRole = String(currentUserRole || "").toLowerCase();
  const canManageUsers = normalizedRole === "manager" || normalizedRole === "owner";
  const canManageBackups = !isSupabaseEnabled || ["manager", "owner", "admin"].includes(normalizedRole);
  const canManageContractTemplates = !isSupabaseEnabled || ["manager", "owner", "admin"].includes(normalizedRole);

  const backupWarningText = (
    lang === "fr"
      ? "Attention : la sauvegarde contient des données sensibles telles que les pèlerins, passeports, paiements, factures et informations de l’agence. Conservez ce fichier en lieu sûr et ne le partagez qu’avec une personne de confiance."
      : lang === "en"
      ? "Warning: this backup contains sensitive data such as pilgrims, passports, payments, invoices, and agency information. Store it securely and share it only with trusted people."
      : "تنبيه: النسخة الاحتياطية تحتوي على بيانات حساسة مثل معلومات المعتمرين، الجوازات، الدفعات، الفواتير، وبيانات الوكالة. احفظ هذا الملف في مكان آمن ولا تشاركه إلا مع شخص موثوق."
  );
  const importWarningText = (
    lang === "fr"
      ? "Attention : l’importation d’une sauvegarde peut modifier les données actuelles. Assurez-vous de faire confiance à ce fichier avant de continuer."
      : lang === "en"
      ? "Warning: importing a backup may change current data. Make sure you trust this file before continuing."
      : "تنبيه: استيراد نسخة احتياطية قد يغيّر البيانات الحالية. تأكد أنك تثق بهذا الملف قبل المتابعة."
  );
  const backupDownloadLabel = (
    lang === "fr" ? "Télécharger la sauvegarde"
      : lang === "en" ? "Download backup"
      : "تحميل النسخة الاحتياطية"
  );
  const cancelLabel = lang === "fr" ? "Annuler" : lang === "en" ? "Cancel" : "إلغاء";
  const badgeTemplatesTitle = t.badgeTemplatesTitle || (
    lang === "fr" ? "Modèles de badges" : lang === "en" ? "Badge Templates" : "قوالب الشارات"
  );
  const badgeTemplatesDesc = t.badgeTemplatesSubtitle || (
    lang === "fr"
      ? "Importez le design du badge, placez les données, puis utilisez-le pour imprimer les badges."
      : lang === "en"
      ? "Import the badge design, place the data, then use it to print pilgrim badges."
      : "ارفع تصميم الشارة، ضع الحقول، ثم استعمله لطباعة شارات المعتمرين."
  );
  const contractTemplatesTitle = (
    lang === "fr" ? "Modèles de contrats" : lang === "en" ? "Contract Templates" : "قوالب العقود"
  );
  const contractTemplatesDesc = (
    lang === "fr"
      ? "Importez un modèle Word pour Omra et un modèle Word pour Hajj."
      : lang === "en"
      ? "Upload one Word template for Umrah and one Word template for Hajj."
      : "ارفع قالب Word واحد للعمرة وقالب Word واحد للحج."
  );

  const handleBackupExport = () => {
    if (!canManageBackups) return;
    setBackupConfirmMode("export");
  };

  const handleBackupImportClick = () => {
    if (!canManageBackups) return;
    backupInputRef.current?.click();
  };

  const handleBackupImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !canManageBackups) return;
    setPendingImportFile(file);
    setBackupConfirmMode("import");
  };

  const closeBackupConfirm = () => {
    setBackupConfirmMode(null);
    setPendingImportFile(null);
  };

  const confirmBackupAction = async () => {
    if (!canManageBackups) return;
    if (backupConfirmMode === "export") {
      store.exportData();
      onToast(t.exportSuccess, "success");
      closeBackupConfirm();
      return;
    }
    const file = pendingImportFile;
    if (!file) {
      closeBackupConfirm();
      return;
    }
    try {
      await store.importData(file);
      onToast(t.importSuccess, "success");
    } catch {
      onToast(t.importError, "error");
    } finally {
      closeBackupConfirm();
    }
  };

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
        title={t.agencyLogoTitle}
        description={t.agencyLogoHint}
        open={logoOpen}
        onToggle={() => setLogoOpen((current) => !current)}
      >
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(120px, 160px) 1fr",
          gap: 16,
          alignItems: "center",
        }}>
          <div style={{
            minHeight: 104,
            borderRadius: 14,
            border: "1px solid var(--rukn-border-soft)",
            background: "var(--rukn-bg-card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
            overflow: "hidden",
          }}>
            {logoPreviewUrl ? (
              <img
                src={logoPreviewUrl}
                alt={t.agencyLogoTitle}
                onError={() => setLogoPreviewUrl("")}
                style={{ maxWidth: "100%", maxHeight: 80, objectFit: "contain" }}
              />
            ) : (
              <div style={{
                width: 62,
                height: 62,
                borderRadius: 16,
                border: "1px dashed var(--rukn-border)",
                color: "var(--rukn-text-muted)",
                display: "grid",
                placeItems: "center",
                background: "var(--rukn-bg-soft)",
              }}>
                <AppIcon name="upload" size={22} />
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, color: "var(--rukn-text-muted)", lineHeight: 1.7 }}>
              {t.agencyLogoHelper}
            </p>
            {!store.agencyLogoApi?.isAvailable && (
              <p style={{ margin: 0, fontSize: 12, color: "var(--rukn-warning)", lineHeight: 1.6 }}>
                {logoUnavailableMessage}
              </p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Button
                variant="secondary"
                icon="upload"
                disabled={logoBusy}
                onClick={() => logoInputRef.current?.click()}
              >
                {logoPreviewUrl ? t.agencyLogoChange : t.agencyLogoUpload}
              </Button>
              {logoPreviewUrl && (
                <Button
                  variant="ghost"
                  icon="trash"
                  disabled={logoBusy}
                  onClick={handleRemoveLogo}
                >
                  {t.agencyLogoRemove}
                </Button>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleLogoFile}
              style={{ display: "none" }}
            />
          </div>
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

      <SettingsSectionCard
        title={badgeTemplatesTitle}
        description={badgeTemplatesDesc}
        open={badgeTemplatesOpen}
        onToggle={() => setBadgeTemplatesOpen((current) => !current)}
      >
        <BadgeTemplatesPage store={store} onToast={onToast} embedded />
      </SettingsSectionCard>

      {canManageContractTemplates && (
        <SettingsSectionCard
          title={contractTemplatesTitle}
          description={contractTemplatesDesc}
          open={contractTemplatesOpen}
          onToggle={() => setContractTemplatesOpen((current) => !current)}
        >
          <ContractTemplatesSettings
            store={store}
            onToast={onToast}
            canManage={canManageContractTemplates}
            embedded
          />
        </SettingsSectionCard>
      )}

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
      {canManageBackups && (
        <GlassCard style={{ padding:20 }}>
          <p style={{ fontSize:13, fontWeight:700, color:t2.gold, marginBottom:14 }}>{t.backupTitle}</p>
          <p style={{ fontSize:12, color:t2.grey, marginBottom:16, lineHeight:1.7 }}>
            {t.backupHint}
          </p>
          <div className="page-actions" style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <Button variant="success" icon="download" onClick={handleBackupExport}>
              {backupDownloadLabel}
            </Button>
            <Button variant="secondary" icon="upload" onClick={handleBackupImportClick}>
              {t.importData}
            </Button>
            <input
              ref={backupInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleBackupImportFile}
              style={{ display: "none" }}
            />
          </div>
        </GlassCard>
      )}

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

      <Modal
        open={Boolean(backupConfirmMode)}
        onClose={closeBackupConfirm}
        title={t.backupTitle}
        width={560}
      >
        <p style={{ fontSize:14, color:"var(--rukn-text)", lineHeight:1.75, marginBottom:22 }}>
          {backupConfirmMode === "import" ? importWarningText : backupWarningText}
        </p>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, flexWrap:"wrap" }}>
          <Button variant="ghost" onClick={closeBackupConfirm}>
            {cancelLabel}
          </Button>
          <Button
            variant={backupConfirmMode === "import" ? "warning" : "success"}
            icon={backupConfirmMode === "import" ? "upload" : "download"}
            onClick={confirmBackupAction}
          >
            {backupConfirmMode === "import" ? t.importData : backupDownloadLabel}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
