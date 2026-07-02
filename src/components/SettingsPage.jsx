import React from "react";
import { Input, Button, GlassCard, Divider, Modal } from "./UI";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { isSupabaseEnabled, supabase } from "../lib/supabase";
import UsersPage from "./UsersPage";
import { AppIcon } from "./Icon";
import { BadgeTemplatesPage } from "../features/badges";
import { setDefaultBadgeTemplate } from "../features/badges/services/badgeTemplatesApi";
import { ContractTemplatesSettings } from "../features/contracts";
import { ProgramPosterTemplatesSettings } from "../features/posterTemplates";
import { useAgencyCodePosterTemplates } from "../hooks/useAgencyCodePosterTemplates";
import { validateAgencyLogoFile } from "../utils/agencyLogo";
import { getLocalizedAgencyName } from "../utils/agencyDisplay";
import {
  NUSUK_SETTINGS_MODAL_DESCRIPTION,
  NusukSettingsFields,
  hasAnyNusukContactValue,
  normalizeNusukContactSettings,
  validateNusukContactSettings,
} from "./NusukSettingsFields";

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

const OFFICIAL_POSTER_TEMPLATE_VALUE = "official:rukn";

const getDefaultPosterTemplateValue = (agency = {}) => {
  const type = String(agency.defaultPosterTemplateType || agency.default_poster_template_type || "official");
  if (type === "code") {
    const key = String(agency.defaultPosterTemplateKey || agency.default_poster_template_key || "").trim();
    return key ? `code:${key}` : OFFICIAL_POSTER_TEMPLATE_VALUE;
  }
  if (type === "uploaded") {
    const id = String(agency.defaultPosterTemplateId || agency.default_poster_template_id || "").trim();
    return id ? `uploaded:${id}` : OFFICIAL_POSTER_TEMPLATE_VALUE;
  }
  return OFFICIAL_POSTER_TEMPLATE_VALUE;
};

const parseDefaultPosterTemplateValue = (value = OFFICIAL_POSTER_TEMPLATE_VALUE) => {
  const [type, ...rest] = String(value || OFFICIAL_POSTER_TEMPLATE_VALUE).split(":");
  const idOrKey = rest.join(":").trim();
  if (type === "code" && idOrKey) {
    return {
      defaultPosterTemplateType: "code",
      defaultPosterTemplateKey: idOrKey,
      defaultPosterTemplateId: "",
    };
  }
  if (type === "uploaded" && idOrKey) {
    return {
      defaultPosterTemplateType: "uploaded",
      defaultPosterTemplateKey: "",
      defaultPosterTemplateId: idOrKey,
    };
  }
  return {
    defaultPosterTemplateType: "official",
    defaultPosterTemplateKey: "rukn",
    defaultPosterTemplateId: "",
  };
};

export default function SettingsPage({
  store,
  onToast,
  currentUserRole,
  currentUserId,
  currentUserAgencyId = "",
  badgesEnabled = true,
  contractsEnabled = true,
  programPostersEnabled = true,
}) {
  const {
    agency,
    updateAgency,
    syncStatus,
    lastSynced,
    forceSync,
    agencyNusukSettings,
    ensureAgencyNusukSettings,
    saveAgencyNusukSettings,
  } = store;
  const agencyId = isSupabaseEnabled ? (store?.agencyId || "") : (store?.agencyId || agency?.id || "");
  const profileAgencyId = currentUserAgencyId || store?.agencyId || "";
  const loadedAgencyId = agency?.id || agency?.agencyId || agency?.agency_id || "";
  const agencyAccessError = isSupabaseEnabled
    ? (
      !profileAgencyId
        ? "لم يتم العثور على ملف المستخدم المرتبط بهذا الحساب"
        : !loadedAgencyId
          ? "لم يتم العثور على الوكالة المرتبطة بهذا الحساب"
          : loadedAgencyId !== profileAgencyId
            ? "تعذر فتح الإعدادات لأن الوكالة المحملة لا تطابق وكالة المستخدم الحالي"
            : ""
    )
    : "";
  const { lang, setLang, t } = useLang();
  const normalizedRole = String(currentUserRole || "").toLowerCase();
  const canManageNusukSettings = !isSupabaseEnabled || ["owner", "manager"].includes(normalizedRole);
  const [form,       setForm]      = React.useState({ ...agency });
  const [nusukSettingsForm, setNusukSettingsForm] = React.useState(() => (
    normalizeNusukContactSettings(agencyNusukSettings)
  ));
  const [nusukSettingsErrors, setNusukSettingsErrors] = React.useState({});
  const [selectedDefaultPosterTemplateValue, setSelectedDefaultPosterTemplateValue] = React.useState(() => (
    getDefaultPosterTemplateValue(agency)
  ));
  const [agencyOpen, setAgencyOpen] = React.useState(false);
  const [nusukSettingsOpen, setNusukSettingsOpen] = React.useState(false);
  const [logoOpen, setLogoOpen] = React.useState(false);
  const [bankOpen, setBankOpen] = React.useState(false);
  const [securityOpen, setSecurityOpen] = React.useState(false);
  const [badgeTemplatesOpen, setBadgeTemplatesOpen] = React.useState(false);
  const [contractTemplatesOpen, setContractTemplatesOpen] = React.useState(false);
  const [posterTemplatesOpen, setPosterTemplatesOpen] = React.useState(false);
  const [selectedBadgeTemplateId, setSelectedBadgeTemplateId] = React.useState("");
  const [logoPreviewUrl, setLogoPreviewUrl] = React.useState(agency?.logoUrl || "");
  const [logoBusy, setLogoBusy] = React.useState(false);
  const [backupConfirmMode, setBackupConfirmMode] = React.useState(null);
  const [pendingImportFile, setPendingImportFile] = React.useState(null);
  const [settingsSaving, setSettingsSaving] = React.useState(false);
  const [passwordForm, setPasswordForm] = React.useState({ newPassword: "", confirmPassword: "" });
  const [passwordBusy, setPasswordBusy] = React.useState(false);
  const [passwordMessage, setPasswordMessage] = React.useState({ type: "", text: "" });
  const logoInputRef = React.useRef(null);
  const backupInputRef = React.useRef(null);
  const badgeTemplateSettingsSaveRef = React.useRef(null);
  const registerBadgeTemplateSettingsSave = React.useCallback((handler) => {
    badgeTemplateSettingsSaveRef.current = typeof handler === "function" ? handler : null;
  }, []);
  const handleSelectedBadgeTemplateChange = React.useCallback((templateId) => {
    setSelectedBadgeTemplateId(String(templateId || ""));
  }, []);
  React.useEffect(() => {
    setForm({ ...agency });
    setSelectedDefaultPosterTemplateValue(getDefaultPosterTemplateValue(agency));
  }, [agency]);
  React.useEffect(() => {
    ensureAgencyNusukSettings?.();
  }, [ensureAgencyNusukSettings]);
  React.useEffect(() => {
    setNusukSettingsForm(normalizeNusukContactSettings(agencyNusukSettings));
    setNusukSettingsErrors({});
  }, [agencyNusukSettings]);
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
  const {
    templates: agencyCodePosterTemplates,
    loading: agencyCodePosterTemplatesLoading,
  } = useAgencyCodePosterTemplates(store.agencyId, { enabled: programPostersEnabled });
  const set = k => e => setForm(f => ({...f, [k]: e.target.value}));
  const handleNusukSettingsChange = React.useCallback((next) => {
    setNusukSettingsForm(next);
    setNusukSettingsErrors({});
  }, []);

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

  const handleSave = async () => {
    if (settingsSaving) return;
    if (agencyAccessError) {
      onToast(agencyAccessError, "error");
      return;
    }
    if (isSupabaseEnabled && agencyId !== profileAgencyId) {
      onToast("تعذر حفظ الإعدادات لأن وكالة المستخدم غير مؤكدة", "error");
      return;
    }
    const shouldSaveNusukSettings = canManageNusukSettings && (
      hasAnyNusukContactValue(nusukSettingsForm)
      || hasAnyNusukContactValue(agencyNusukSettings)
    );
    const nusukValidation = shouldSaveNusukSettings
      ? validateNusukContactSettings(nusukSettingsForm)
      : null;
    if (nusukValidation && !nusukValidation.valid) {
      setNusukSettingsErrors(nusukValidation.errors);
      setNusukSettingsOpen(true);
      onToast("يرجى إكمال إعدادات نسك", "error");
      return;
    }
    if (programPostersEnabled && posterTemplateOptionsLoading) {
      onToast(posterDefaultLabels.loading, "info");
      return;
    }
    const validPosterTemplate = defaultPosterTemplateOptions.some((option) => option.value === selectedPosterTemplateValue);
    if (programPostersEnabled && !validPosterTemplate) {
      onToast(posterDefaultLabels.unavailable, "error");
      return;
    }
    const nextForm = programPostersEnabled
      ? {
        ...form,
        ...parseDefaultPosterTemplateValue(selectedPosterTemplateValue),
      }
      : { ...form };
    setSettingsSaving(true);
    try {
      if (badgesEnabled && badgeTemplateSettingsSaveRef.current) {
        await badgeTemplateSettingsSaveRef.current();
      } else if (badgesEnabled && selectedBadgeTemplateId) {
        const { error: badgeTemplateError } = await setDefaultBadgeTemplate({
          agencyId,
          id: selectedBadgeTemplateId,
        });
        if (badgeTemplateError) throw badgeTemplateError;
      }
      if (nusukValidation) {
        if (typeof saveAgencyNusukSettings !== "function") {
          throw new Error("nusuk-settings-save-unavailable");
        }
        const nusukResult = await saveAgencyNusukSettings(nusukValidation.values);
        if (nusukResult?.error) throw nusukResult.error;
        setNusukSettingsForm(normalizeNusukContactSettings(nusukResult?.data || nusukValidation.values));
        setNusukSettingsErrors({});
      }
      const result = await updateAgency(nextForm);
      if (result?.error) throw result.error;
      setForm(nextForm);
      setSelectedDefaultPosterTemplateValue(getDefaultPosterTemplateValue(nextForm));
      onToast(t.saveSettingsSuccess, "success");
    } catch (error) {
      console.error("[Settings] Agency settings save failed:", error);
      onToast(t.saveSettingsFailed || t.error || "تعذر حفظ الإعدادات", "error");
    } finally {
      setSettingsSaving(false);
    }
  };

  const passwordLabels = React.useMemo(() => {
    if (lang === "fr") {
      return {
        title: "Sécurité et mot de passe",
        desc: "Changez le mot de passe temporaire après la première connexion.",
        helper: "Utilisez un mot de passe fort d’au moins 8 caractères.",
        newPassword: "Nouveau mot de passe",
        confirmPassword: "Confirmer le nouveau mot de passe",
        save: "Mettre à jour le mot de passe",
        saving: "Mise à jour...",
        tooShort: "Le mot de passe doit contenir au moins 8 caractères.",
        mismatch: "Les deux mots de passe ne correspondent pas.",
        success: "Mot de passe mis à jour avec succès.",
        failed: "Impossible de mettre à jour le mot de passe.",
        unavailable: "La connexion Supabase Auth n’est pas configurée.",
      };
    }
    if (lang === "en") {
      return {
        title: "Security and password",
        desc: "Change temporary passwords after first login.",
        helper: "Use a strong password with at least 8 characters.",
        newPassword: "New password",
        confirmPassword: "Confirm new password",
        save: "Update password",
        saving: "Updating...",
        tooShort: "Password must be at least 8 characters.",
        mismatch: "New password and confirmation do not match.",
        success: "Password updated successfully.",
        failed: "Unable to update password.",
        unavailable: "Supabase Auth is not configured.",
      };
    }
    return {
      title: "الأمان وكلمة المرور",
      desc: "غيّر كلمة المرور المؤقتة بعد أول تسجيل دخول.",
      helper: "استعمل كلمة مرور قوية لا تقل عن 8 أحرف.",
      newPassword: "كلمة المرور الجديدة",
      confirmPassword: "تأكيد كلمة المرور الجديدة",
      save: "تحديث كلمة المرور",
      saving: "جاري التحديث...",
      tooShort: "يجب أن تكون كلمة المرور 8 أحرف على الأقل.",
      mismatch: "كلمة المرور الجديدة وتأكيدها غير متطابقين.",
      success: "تم تحديث كلمة المرور بنجاح.",
      failed: "تعذر تحديث كلمة المرور.",
      unavailable: "Supabase Auth غير مفعّل.",
    };
  }, [lang]);

  const setPasswordField = (key) => (event) => {
    setPasswordMessage({ type: "", text: "" });
    setPasswordForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const handlePasswordUpdate = async () => {
    const newPassword = passwordForm.newPassword;
    const confirmPassword = passwordForm.confirmPassword;
    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: passwordLabels.tooShort });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: passwordLabels.mismatch });
      return;
    }
    if (!isSupabaseEnabled) {
      setPasswordMessage({ type: "error", text: passwordLabels.unavailable });
      return;
    }

    setPasswordBusy(true);
    setPasswordMessage({ type: "", text: "" });
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordForm({ newPassword: "", confirmPassword: "" });
      setPasswordMessage({ type: "success", text: passwordLabels.success });
      onToast?.(passwordLabels.success, "success");
    } catch {
      setPasswordMessage({ type: "error", text: passwordLabels.failed });
      onToast?.(passwordLabels.failed, "error");
    } finally {
      setPasswordBusy(false);
    }
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

  const canManageUsers = normalizedRole === "manager" || normalizedRole === "owner";
  const canManageBackups = !isSupabaseEnabled || ["manager", "owner", "admin"].includes(normalizedRole);
  const canManageContractTemplates = !isSupabaseEnabled || ["manager", "owner", "admin"].includes(normalizedRole);
  const canManagePosterTemplates = !isSupabaseEnabled || ["manager", "owner", "admin"].includes(normalizedRole);

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
  const backupExportSuccessText = (
    lang === "fr"
      ? "La sauvegarde a été téléchargée sous forme de fichier ZIP organisé."
      : lang === "en"
      ? "Backup downloaded as an organized ZIP file."
      : "تم تحميل النسخة الاحتياطية كملف مضغوط منظم."
  );
  const backupExportErrorText = (
    lang === "fr"
      ? "Impossible de télécharger la sauvegarde"
      : lang === "en"
      ? "Unable to download the backup"
      : "تعذر تحميل النسخة الاحتياطية"
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
  const posterTemplatesTitle = (
    lang === "fr" ? "Modèles d’affiches programmes" : lang === "en" ? "Program Poster Templates" : "قوالب ملصقات البرامج"
  );
  const posterTemplatesDesc = (
    lang === "fr"
      ? "Importez un modèle d’affiche vide qui sera utilisé plus tard pour générer automatiquement les affiches des programmes."
      : lang === "en"
      ? "Upload a blank poster template that will later be used to generate program posters automatically."
      : "ارفع قالب ملصق فارغ، وسيتم استعماله لاحقًا لتوليد ملصقات البرامج تلقائيًا."
  );
  const posterDefaultLabels = React.useMemo(() => {
    if (lang === "fr") {
      return {
        section: "Paramètres des affiches",
        label: "Modèle d’affiche par défaut",
        desc: "Choisissez le modèle qui sera utilisé automatiquement lors du téléchargement des affiches des programmes.",
        official: "Modèle officiel Rukn",
        officialHint: "Disponible pour toutes les agences.",
        codeGroup: "Modèles privés de l’agence",
        onlyOfficial: "Seul le modèle officiel Rukn est disponible pour le moment.",
        loading: "Chargement des modèles...",
        unavailable: "Le modèle sélectionné n’est pas disponible pour cette agence.",
      };
    }
    if (lang === "en") {
      return {
        section: "Poster settings",
        label: "Default poster template",
        desc: "Choose the template that will be used automatically when downloading program posters.",
        official: "Official Rukn template",
        officialHint: "Available to every agency.",
        codeGroup: "Agency private templates",
        onlyOfficial: "Only the official Rukn template is available right now.",
        loading: "Loading templates...",
        unavailable: "The selected template is not available to this agency.",
      };
    }
    return {
      section: "إعدادات الملصقات",
      label: "قالب الملصق الافتراضي",
      desc: "اختر القالب الذي سيتم استعماله تلقائيًا عند تنزيل ملصقات البرامج.",
      official: "قالب ركن الرسمي",
      officialHint: "متاح لكل الوكالات.",
      codeGroup: "قوالب خاصة بالوكالة",
      onlyOfficial: "قالب ركن الرسمي هو القالب الوحيد المتاح حاليًا.",
      loading: "جاري تحميل القوالب...",
      unavailable: "القالب المحدد غير متاح لهذه الوكالة.",
    };
  }, [lang]);
  const defaultPosterTemplateOptions = React.useMemo(() => ([
    {
      value: OFFICIAL_POSTER_TEMPLATE_VALUE,
      label: posterDefaultLabels.official,
      group: posterDefaultLabels.section,
      description: posterDefaultLabels.officialHint,
    },
    ...agencyCodePosterTemplates.map((template) => ({
      value: `code:${template.key}`,
      label: template.meta?.name?.[lang] || template.meta?.name?.ar || template.key,
      group: posterDefaultLabels.codeGroup,
      description: "",
    })),
  ]), [agencyCodePosterTemplates, lang, posterDefaultLabels]);
  const savedPosterTemplateValue = selectedDefaultPosterTemplateValue || getDefaultPosterTemplateValue(form);
  const selectedPosterTemplateValue = defaultPosterTemplateOptions.some((option) => option.value === savedPosterTemplateValue)
    ? savedPosterTemplateValue
    : OFFICIAL_POSTER_TEMPLATE_VALUE;
  const selectedPosterTemplateOption = defaultPosterTemplateOptions.find((option) => option.value === selectedPosterTemplateValue)
    || defaultPosterTemplateOptions[0];
  const posterTemplateOptionsLoading = agencyCodePosterTemplatesLoading;
  const handleDefaultPosterTemplateChange = (value) => {
    if (!programPostersEnabled) return;
    if (posterTemplateOptionsLoading) return;
    const parsed = parseDefaultPosterTemplateValue(value);
    setSelectedDefaultPosterTemplateValue(value);
    setForm((current) => ({ ...current, ...parsed }));
  };

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
      try {
        await store.exportData();
        onToast(backupExportSuccessText, "success");
      } catch (error) {
        console.error("[backup export]", error);
        onToast(backupExportErrorText, "error");
      } finally {
        closeBackupConfirm();
      }
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

  if (agencyAccessError) {
    return (
      <div className="page-body settings-page" style={{ padding:"24px 32px" }}>
        <h1 style={{ fontSize:21, fontWeight:800, color:"#f8fafc", marginBottom:6 }}>{t.settingsTitle}</h1>
        <GlassCard style={{ padding:18, marginTop:18 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, color:"var(--rukn-danger)", fontWeight:800 }}>
            <AppIcon name="alert" size={18} />
            <span>{agencyAccessError}</span>
          </div>
        </GlassCard>
      </div>
    );
  }

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

      <SettingsSectionCard
        title={passwordLabels.title}
        description={passwordLabels.desc}
        open={securityOpen}
        onToggle={() => setSecurityOpen((current) => !current)}
      >
        <div style={{ display:"flex", flexDirection:"column", gap:14, maxWidth:560 }}>
          <p style={{ margin:0, fontSize:12, color:"var(--rukn-text-muted)", lineHeight:1.7 }}>
            {passwordLabels.helper}
          </p>
          <div className="form-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:12 }}>
            <Input
              label={passwordLabels.newPassword}
              type="password"
              value={passwordForm.newPassword}
              onChange={setPasswordField("newPassword")}
              autoComplete="new-password"
              disabled={passwordBusy}
            />
            <Input
              label={passwordLabels.confirmPassword}
              type="password"
              value={passwordForm.confirmPassword}
              onChange={setPasswordField("confirmPassword")}
              autoComplete="new-password"
              disabled={passwordBusy}
            />
          </div>
          {passwordMessage.text && (
            <p style={{
              margin:0,
              fontSize:12,
              fontWeight:700,
              color: passwordMessage.type === "success" ? t2.greenLight : "var(--rukn-danger)",
              lineHeight:1.7,
            }}>
              {passwordMessage.text}
            </p>
          )}
          <div>
            <Button
              variant="secondary"
              icon="shieldCheck"
              disabled={passwordBusy}
              onClick={handlePasswordUpdate}
            >
              {passwordBusy ? passwordLabels.saving : passwordLabels.save}
            </Button>
          </div>
        </div>
      </SettingsSectionCard>

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
        title="إعدادات نسك"
        description={NUSUK_SETTINGS_MODAL_DESCRIPTION}
        open={nusukSettingsOpen}
        onToggle={() => setNusukSettingsOpen((current) => !current)}
      >
        <div style={{ display:"grid", gap:12 }}>
          {!canManageNusukSettings && (
            <p style={{ margin:0, color:"var(--rukn-text-muted)", fontSize:12, lineHeight:1.7 }}>
              يمكن تعديل هذه الإعدادات من مالك أو مدير الوكالة فقط.
            </p>
          )}
          <NusukSettingsFields
            value={nusukSettingsForm}
            onChange={handleNusukSettingsChange}
            errors={nusukSettingsErrors}
            disabled={!canManageNusukSettings || settingsSaving}
          />
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
                alt={getLocalizedAgencyName(form, lang, t.agencyFallbackName)}
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

      {badgesEnabled && (
        <SettingsSectionCard
          title={badgeTemplatesTitle}
          description={badgeTemplatesDesc}
          open={badgeTemplatesOpen}
          onToggle={() => setBadgeTemplatesOpen((current) => !current)}
        >
          <BadgeTemplatesPage
            store={store}
            onToast={onToast}
            embedded
            onRegisterSettingsSave={registerBadgeTemplateSettingsSave}
            onSelectedTemplateChange={handleSelectedBadgeTemplateChange}
          />
        </SettingsSectionCard>
      )}

      {contractsEnabled && canManageContractTemplates && (
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

      <SettingsSectionCard
        title={posterTemplatesTitle}
        description={posterTemplatesDesc}
        open={posterTemplatesOpen}
        onToggle={() => setPosterTemplatesOpen((current) => !current)}
      >
        <style>{`
          .default-poster-template-option:not(:disabled):hover {
            border-color: rgba(212,175,55,.46) !important;
            background: rgba(255,255,255,.96) !important;
            box-shadow: 0 12px 26px rgba(15,23,42,.08), 0 1px 0 rgba(255,255,255,.8) inset !important;
            transform: translateY(-1px);
          }
        `}</style>
        <div style={{
          border:"1px solid rgba(212,175,55,.24)",
          background:"linear-gradient(135deg,rgba(212,175,55,.08),rgba(255,255,255,.03))",
          borderRadius:14,
          padding:14,
          marginBottom:16,
          display:"grid",
          gap:12,
          direction: lang === "ar" ? "rtl" : "ltr",
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", gap:12, flexWrap:"wrap", alignItems:"flex-start" }}>
            <div style={{ minWidth:0 }}>
              <p style={{ margin:0, fontSize:13, fontWeight:900, color:"var(--rukn-text-strong)" }}>
                {posterDefaultLabels.label}
              </p>
              <p style={{ margin:"4px 0 0", fontSize:12, color:"var(--rukn-text-muted)", lineHeight:1.7 }}>
                {posterDefaultLabels.desc}
              </p>
            </div>
            {selectedPosterTemplateOption && (
              <span style={{
                border:"1px solid rgba(212,175,55,.26)",
                background:"rgba(212,175,55,.08)",
                color:"var(--rukn-gold)",
                borderRadius:999,
                padding:"5px 10px",
                fontSize:11,
                fontWeight:900,
                lineHeight:1,
                maxWidth:"100%",
                overflow:"hidden",
                textOverflow:"ellipsis",
                whiteSpace:"nowrap",
              }}>
                {selectedPosterTemplateOption.label}
              </span>
            )}
          </div>
          <div style={{ display:"grid", gap:7, maxWidth:560 }}>
            <div
              role="radiogroup"
              aria-label={posterDefaultLabels.label}
              style={{
                display:"grid",
                gap:8,
                opacity:posterTemplateOptionsLoading ? .68 : 1,
              }}
            >
              {defaultPosterTemplateOptions.map((option) => {
                const active = option.value === selectedPosterTemplateValue;
                return (
                  <button
                    key={option.value}
                    className="default-poster-template-option"
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={posterTemplateOptionsLoading}
                    onClick={() => handleDefaultPosterTemplateChange(option.value)}
                    style={{
                      width:"100%",
                      border:`1px solid ${active ? "rgba(212,175,55,.62)" : "rgba(148,163,184,.24)"}`,
                      background:active
                        ? "linear-gradient(135deg,rgba(212,175,55,.16),rgba(255,255,255,.92))"
                        : "rgba(255,255,255,.9)",
                      color:"#111827",
                      borderRadius:12,
                      padding:"11px 12px",
                      display:"flex",
                      alignItems:"center",
                      justifyContent:"space-between",
                      gap:12,
                      textAlign:"start",
                      cursor:posterTemplateOptionsLoading ? "not-allowed" : "pointer",
                      fontFamily:"'Cairo',sans-serif",
                      boxShadow:active
                        ? "0 12px 28px rgba(212,175,55,.13), 0 1px 0 rgba(255,255,255,.78) inset"
                        : "0 8px 20px rgba(15,23,42,.055), 0 1px 0 rgba(255,255,255,.72) inset",
                      transition:"border-color .18s ease, background .18s ease, box-shadow .18s ease, transform .18s ease",
                    }}
                  >
                    <span style={{ minWidth:0, display:"grid", gap:3 }}>
                      <span style={{
                        fontSize:13,
                        fontWeight:900,
                        color:active ? "#8A6A10" : "#111827",
                        overflow:"hidden",
                        textOverflow:"ellipsis",
                        whiteSpace:"nowrap",
                      }}>
                        {option.label}
                      </span>
                      {option.description && (
                        <span style={{
                          fontSize:11,
                          color:"#64748B",
                          lineHeight:1.5,
                        }}>
                          {option.description}
                        </span>
                      )}
                    </span>
                    <span style={{
                      width:18,
                      height:18,
                      borderRadius:999,
                      border:`2px solid ${active ? "var(--rukn-gold)" : "rgba(148,163,184,.5)"}`,
                      display:"inline-flex",
                      alignItems:"center",
                      justifyContent:"center",
                      flex:"0 0 auto",
                    }}>
                      <span style={{
                        width:8,
                        height:8,
                        borderRadius:999,
                        background:active ? "var(--rukn-gold)" : "transparent",
                      }} />
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ minHeight:18 }}>
              {posterTemplateOptionsLoading ? (
                <span style={{ color:"var(--rukn-text-muted)", fontSize:11.5, lineHeight:1.6 }}>
                  {posterDefaultLabels.loading}
                </span>
              ) : defaultPosterTemplateOptions.length <= 1 ? (
                <span style={{ color:"var(--rukn-text-muted)", fontSize:11.5, lineHeight:1.6 }}>
                  {posterDefaultLabels.onlyOfficial}
                </span>
              ) : (
                <span style={{ color:"var(--rukn-text-muted)", fontSize:11.5, lineHeight:1.6 }}>
                  {selectedPosterTemplateOption?.group || posterDefaultLabels.section}
                </span>
              )}
            </div>
            {!programPostersEnabled && (
              <p style={{ margin:0, color:"var(--rukn-text-muted)", fontSize:12, lineHeight:1.8 }}>
                يمكنكم استعمال قوالب ركن الرسمية. وللحصول على قالب خاص بوكالتكم، يرجى التواصل مع إدارة ركن.
              </p>
            )}
          </div>
        </div>
        {programPostersEnabled && (
          <ProgramPosterTemplatesSettings
            store={store}
            onToast={onToast}
            canManage={canManagePosterTemplates}
            embedded
          />
        )}
      </SettingsSectionCard>

      <div
        className="page-actions"
        style={{
          margin:"-2px 0 20px",
          padding:"14px",
          border:"1px solid rgba(212,175,55,.22)",
          borderRadius:14,
          background:"linear-gradient(135deg,rgba(212,175,55,.08),rgba(255,255,255,.02))",
          display:"flex",
          justifyContent: lang === "ar" ? "flex-start" : "flex-end",
          direction: lang === "ar" ? "rtl" : "ltr",
        }}
      >
        <Button variant="primary" icon="save" onClick={handleSave} disabled={settingsSaving}>
          {t.saveSettingsLabel}
        </Button>
      </div>

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
              accept=".zip,application/zip,application/x-zip-compressed,application/json,.json"
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
