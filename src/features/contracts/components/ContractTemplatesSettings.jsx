import React from "react";
import { Button, GlassCard, Modal } from "../../../components/UI";
import { AppIcon } from "../../../components/Icon";
import { useLang } from "../../../hooks/useLang";
import { theme } from "../../../components/styles";
import {
  CONTRACT_TEMPLATE_FIELD_GROUPS,
  CONTRACT_TEMPLATE_LABELS,
  CONTRACT_TEMPLATE_TYPES,
} from "../utils/contractTemplateFields";
import {
  CONTRACT_TEMPLATE_MAX_BYTES,
  validateContractTemplateFile,
} from "../utils/contractTemplateData";
import {
  deleteContractTemplate,
  fetchContractTemplates,
  saveContractTemplate,
} from "../services/contractTemplatesApi";

const tc = theme.colors;

const text = (lang) => ({
  title: lang === "fr" ? "Modèles de contrats" : lang === "en" ? "Contract Templates" : "قوالب العقود",
  subtitle: lang === "fr"
    ? "Importez un modèle Word pour Omra et un modèle Word pour Hajj."
    : lang === "en"
    ? "Upload one Word template for Umrah and one Word template for Hajj."
    : "ارفع قالب Word واحد للعمرة وقالب Word واحد للحج.",
  instructions: lang === "fr"
    ? "Utilisez uniquement un fichier .docx. Les champs entre accolades seront remplacés lors du téléchargement du contrat."
    : lang === "en"
    ? "Use a .docx file only. Placeholder fields will be replaced when downloading a contract."
    : "استعمل ملف .docx فقط. سيتم تعويض الحقول داخل الأقواس عند تحميل العقد.",
  uploaded: lang === "fr" ? "Modèle importé" : lang === "en" ? "Template uploaded" : "تم رفع القالب",
  missing: lang === "fr" ? "Aucun modèle importé" : lang === "en" ? "No template uploaded" : "لم يتم رفع قالب",
  lastUpdated: lang === "fr" ? "Dernière mise à jour" : lang === "en" ? "Last updated" : "آخر تحديث",
  upload: lang === "fr" ? "Importer" : lang === "en" ? "Upload" : "رفع القالب",
  replace: lang === "fr" ? "Remplacer" : lang === "en" ? "Replace" : "استبدال",
  remove: lang === "fr" ? "Supprimer" : lang === "en" ? "Remove" : "حذف",
  showFields: lang === "fr" ? "Afficher les champs" : lang === "en" ? "Show available fields" : "عرض الحقول المتاحة",
  fieldsTitle: lang === "fr" ? "Champs disponibles" : lang === "en" ? "Available fields" : "الحقول المتاحة",
  modalHelp: lang === "fr"
    ? "Copiez le champ souhaité, puis collez-le dans le fichier Word à l’endroit où vous voulez afficher l’information. Ensuite, enregistrez le fichier Word et importez-le ici comme modèle de contrat."
    : lang === "en"
    ? "Copy the field you need, then paste it into the Word file where the information should appear. Save the Word file and upload it here as the contract template."
    : "انسخ الحقل المطلوب، ثم الصقه داخل ملف Word في المكان الذي تريد أن تظهر فيه المعلومة. بعد ذلك احفظ ملف Word وارفعه هنا كقالب للعقد.",
  wordPasteWarning: lang === "fr"
    ? "Si le champ apparaît incorrectement dans Word, supprimez-le puis collez-le à nouveau en texte brut. Le champ doit rester complet, par exemple : {{pilgrim.full_name}}"
    : lang === "en"
    ? "If the field appears incorrectly in Word, delete it and paste it again as plain text. The field must remain complete, for example: {{pilgrim.full_name}}"
    : "إذا ظهر الحقل بشكل غير صحيح داخل Word، احذفه والصقه مرة أخرى كنص عادي. يجب أن يكون الحقل كاملًا مثل: {{pilgrim.full_name}}",
  copy: lang === "fr" ? "Copier" : lang === "en" ? "Copy" : "نسخ",
  copied: lang === "fr" ? "Champ copié" : lang === "en" ? "Field copied" : "تم نسخ الحقل",
  invalidType: lang === "fr"
    ? "Veuillez importer uniquement un fichier Word au format .docx."
    : lang === "en"
    ? "Please upload a Word file in .docx format only."
    : "يجب رفع ملف Word بصيغة .docx فقط.",
  tooLarge: lang === "fr"
    ? "Le modèle est trop volumineux. Taille maximale : 10 Mo."
    : lang === "en"
    ? "Template is too large. Maximum size is 10 MB."
    : "حجم القالب كبير جدًا. الحد الأقصى 10MB.",
  saveSuccess: lang === "fr" ? "Modèle enregistré" : lang === "en" ? "Template saved" : "تم حفظ القالب",
  saveError: lang === "fr" ? "Impossible d’enregistrer le modèle" : lang === "en" ? "Unable to save template" : "تعذر حفظ القالب",
  removeSuccess: lang === "fr" ? "Modèle supprimé" : lang === "en" ? "Template removed" : "تم حذف القالب",
  removeError: lang === "fr" ? "Impossible de supprimer le modèle" : lang === "en" ? "Unable to remove template" : "تعذر حذف القالب",
  loadError: lang === "fr" ? "Impossible de charger les modèles de contrats" : lang === "en" ? "Unable to load contract templates" : "تعذر تحميل قوالب العقود",
  setupMissing: lang === "fr"
    ? "Les tables ou le bucket des contrats ne sont pas encore configurés dans Supabase."
    : lang === "en"
    ? "Contract template tables or bucket are not configured in Supabase yet."
    : "لم يتم إعداد جدول أو bucket قوالب العقود في Supabase بعد.",
});

const isMissingSetupError = (error) => Boolean(error && (
  String(error.message || "").includes("contract_templates")
  || String(error.message || "").includes("contract-templates")
  || String(error.message || "").includes("relation")
  || String(error.message || "").includes("bucket")
  || String(error.message || "").includes("does not exist")
  || String(error.code || "") === "42P01"
));

const formatDate = (value, lang) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(lang === "fr" ? "fr-FR" : lang === "en" ? "en-GB" : "ar-MA");
};

const getArabicPilgrimTerm = (templateType) => templateType === "hajj" ? "الحاج" : "المعتمر";

const getLocalizedFieldDescription = (field, lang, templateType) => {
  if (lang !== "ar") return field.description[lang] || field.description.ar;
  const pilgrimTerm = getArabicPilgrimTerm(templateType);
  if (field.placeholder === "{{pilgrim.full_name}}") return `الاسم الكامل ل${pilgrimTerm}`;
  if (field.placeholder === "{{pilgrim.room_type}}") return `نوع الغرفة المختار ل${pilgrimTerm}`;
  return String(field.description.ar || "").replace(/المعتمر/g, pilgrimTerm);
};

const getLocalizedGroupTitle = (group, lang, templateType) => {
  if (lang !== "ar") return group.title[lang] || group.title.ar;
  if (group.key === "pilgrim") return getArabicPilgrimTerm(templateType);
  return String(group.title.ar || "").replace(/المعتمر/g, getArabicPilgrimTerm(templateType));
};

export function ContractTemplatesSettings({ store, onToast, canManage = false, embedded = false }) {
  const { lang } = useLang();
  const l = React.useMemo(() => text(lang), [lang]);
  const agencyId = store?.agencyId || store?.agency?.id || "";
  const [templates, setTemplates] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [busyType, setBusyType] = React.useState("");
  const [fieldsOpen, setFieldsOpen] = React.useState(false);
  const [fieldsTemplateType, setFieldsTemplateType] = React.useState("umrah");
  const [copiedField, setCopiedField] = React.useState("");
  const inputRefs = React.useRef({});

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await fetchContractTemplates({ agencyId });
      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("[Contracts] Template metadata load failed", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const getTemplate = React.useCallback((templateType) => (
    templates.find((item) => (item.templateType || item.type) === templateType) || null
  ), [templates]);

  const handleFile = async (templateType, event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !canManage) return;
    const validation = validateContractTemplateFile(file);
    if (!validation.valid) {
      onToast?.(validation.reason === "size" ? l.tooLarge : l.invalidType, "error");
      return;
    }
    setBusyType(templateType);
    try {
      const { error } = await saveContractTemplate({ agencyId, templateType, file });
      if (error) throw error;
      await refresh();
      onToast?.(l.saveSuccess, "success");
    } catch (error) {
      console.error("[Contracts] Template save failed", error);
      setError(error);
      onToast?.(l.saveError, "error");
    } finally {
      setBusyType("");
    }
  };

  const handleRemove = async (template) => {
    if (!template || !canManage) return;
    const type = template.templateType || template.type;
    setBusyType(type);
    try {
      const { error, storageError } = await deleteContractTemplate({ agencyId, template });
      if (error) throw error;
      await refresh();
      onToast?.(storageError ? l.removeError : l.removeSuccess, storageError ? "error" : "info");
    } catch (error) {
      console.error("[Contracts] Template remove failed", error);
      setError(error);
      onToast?.(l.removeError, "error");
    } finally {
      setBusyType("");
    }
  };

  const copyField = async (token) => {
    const exactToken = String(token || "");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(exactToken);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = exactToken;
        textarea.dir = "ltr";
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        textarea.style.direction = "ltr";
        textarea.style.unicodeBidi = "plaintext";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedField(exactToken);
      window.setTimeout(() => setCopiedField((current) => current === exactToken ? "" : current), 1400);
    } catch {
      setCopiedField("");
    }
  };

  const setupMissing = isMissingSetupError(error);

  const content = (
    <>
      {!embedded && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 19, fontWeight: 900, color: "var(--rukn-gold)" }}>{l.title}</p>
            <p style={{ fontSize: 12, color: "var(--rukn-text-muted)", marginTop: 5, lineHeight: 1.7 }}>
              {l.subtitle}
            </p>
          </div>
        </div>
      )}
      {error && (
        <div style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid rgba(245,158,11,.28)",
          background: "rgba(245,158,11,.1)",
          color: "var(--rukn-warning)",
          fontSize: 12,
          fontWeight: 800,
          marginBottom: 14,
          lineHeight: 1.6,
        }}>
          {setupMissing ? l.setupMissing : l.loadError}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
        {CONTRACT_TEMPLATE_TYPES.map((templateType) => {
          const template = getTemplate(templateType);
          const busy = loading || busyType === templateType;
          const uploaded = Boolean(template);
          return (
            <div
              key={templateType}
              style={{
                border: "1px solid var(--rukn-border-soft)",
                background: "var(--rukn-bg-soft)",
                borderRadius: 14,
                padding: 14,
                minWidth: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 900, color: "var(--rukn-text-strong)", lineHeight: 1.35 }}>
                    {CONTRACT_TEMPLATE_LABELS[templateType][lang] || CONTRACT_TEMPLATE_LABELS[templateType].ar}
                  </p>
                  <p style={{ fontSize: 11.5, color: "var(--rukn-text-muted)", lineHeight: 1.65, marginTop: 5 }}>
                    {l.instructions}
                  </p>
                </div>
                <span style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  border: `1px solid ${uploaded ? "rgba(34,197,94,.28)" : "rgba(148,163,184,.22)"}`,
                  background: uploaded ? "rgba(34,197,94,.1)" : "rgba(148,163,184,.08)",
                  color: uploaded ? tc.greenLight : "var(--rukn-text-muted)",
                }}>
                  <AppIcon name={uploaded ? "success" : "file"} size={17} color="currentColor" />
                </span>
              </div>

              <div style={{
                padding: "9px 10px",
                borderRadius: 10,
                background: "var(--rukn-bg-card)",
                border: "1px solid var(--rukn-border-soft)",
                marginBottom: 12,
              }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: uploaded ? tc.greenLight : "var(--rukn-text-muted)" }}>
                  {uploaded ? l.uploaded : l.missing}
                </p>
                {uploaded && (
                  <>
                    <p style={{ fontSize: 11, color: "var(--rukn-text-muted)", marginTop: 4, overflowWrap: "anywhere" }}>
                      {template.fileName || "contract-template.docx"}
                    </p>
                    {template.updatedAt && (
                      <p style={{ fontSize: 11, color: "var(--rukn-text-muted)", marginTop: 3 }}>
                        {l.lastUpdated}: {formatDate(template.updatedAt, lang)}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {canManage && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon="upload"
                      disabled={busy}
                      onClick={() => inputRefs.current[templateType]?.click()}
                    >
                      {uploaded ? l.replace : l.upload}
                    </Button>
                    {uploaded && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="trash"
                        disabled={busy}
                        onClick={() => handleRemove(template)}
                      >
                        {l.remove}
                      </Button>
                    )}
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  icon="list"
                  onClick={() => {
                    setFieldsTemplateType(templateType);
                    setFieldsOpen(true);
                  }}
                >
                  {l.showFields}
                </Button>
                <input
                  ref={(node) => { inputRefs.current[templateType] = node; }}
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => handleFile(templateType, event)}
                  style={{ display: "none" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={fieldsOpen}
        onClose={() => setFieldsOpen(false)}
        title={`${l.fieldsTitle} — ${CONTRACT_TEMPLATE_LABELS[fieldsTemplateType]?.[lang] || CONTRACT_TEMPLATE_LABELS[fieldsTemplateType]?.ar || ""}`}
        width={820}
      >
        <p style={{ fontSize: 13, color: "var(--rukn-text)", lineHeight: 1.8, marginBottom: 16 }}>
          {l.modalHelp}
        </p>
        <p style={{
          fontSize: 12,
          color: "var(--rukn-warning)",
          lineHeight: 1.75,
          marginBottom: 16,
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid rgba(245,158,11,.28)",
          background: "rgba(245,158,11,.1)",
        }}>
          {l.wordPasteWarning}
        </p>
        <div style={{ display: "grid", gap: 14 }}>
          {CONTRACT_TEMPLATE_FIELD_GROUPS.filter((group) => !group.hidden).map((group) => (
            <div key={group.key}>
              <p style={{ fontSize: 13, fontWeight: 900, color: "var(--rukn-gold)", marginBottom: 8 }}>
                {getLocalizedGroupTitle(group, lang, fieldsTemplateType)}
              </p>
              {group.help && (
                <p style={{ fontSize: 12, color: "var(--rukn-text-muted)", lineHeight: 1.65, marginBottom: 8 }}>
                  {group.help[lang] || group.help.ar}
                </p>
              )}
              <div style={{ display: "grid", gap: 7 }}>
                {group.fields.map((field) => {
                  const token = field.token || field.placeholder;
                  return (
                    <div
                      key={token}
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 10,
                        alignItems: "center",
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid var(--rukn-border-soft)",
                        background: "var(--rukn-bg-soft)",
                      }}
                    >
                      <code
                        dir="ltr"
                        lang="en"
                        style={{
                          color: "var(--rukn-gold)",
                          fontSize: 12,
                          overflowWrap: "anywhere",
                          flex: "1 1 220px",
                          minWidth: 0,
                          direction: "ltr",
                          unicodeBidi: "isolate",
                          textAlign: "left",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {token}
                      </code>
                      <span style={{ color: "var(--rukn-text-muted)", fontSize: 12, lineHeight: 1.55, flex: "2 1 240px", minWidth: 0 }}>
                        {getLocalizedFieldDescription(field, lang, fieldsTemplateType)}
                      </span>
                      <Button
                        variant={copiedField === token ? "success" : "secondary"}
                        size="sm"
                        icon="copy"
                        onClick={() => copyField(token)}
                        style={{ minWidth: 92, justifyContent: "center" }}
                      >
                        {copiedField === token ? l.copied : l.copy}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "var(--rukn-text-muted)", lineHeight: 1.6, marginTop: 16 }}>
          .docx · {Math.round(CONTRACT_TEMPLATE_MAX_BYTES / 1024 / 1024)} MB
        </p>
      </Modal>
    </>
  );

  if (embedded) {
    return <div>{content}</div>;
  }

  return (
    <GlassCard gold style={{ padding: 18, marginBottom: 20 }}>
      {content}
    </GlassCard>
  );
}
