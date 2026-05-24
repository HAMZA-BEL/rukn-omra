import React from "react";
import { AppIcon } from "../../../components/Icon";
import { Button, GlassCard, Input, Modal } from "../../../components/UI";
import { useLang } from "../../../hooks/useLang";
import PosterFillAreasEditor from "./PosterFillAreasEditor";
import {
  getPosterTemplateImageUrl,
  deletePosterTemplate,
  fetchPosterTemplates,
  savePosterTemplate,
} from "../services/posterTemplatesApi";
import {
  normalizePosterTemplateLevelsCount,
  POSTER_TEMPLATE_DEFAULT_LEVELS_COUNT,
  POSTER_TEMPLATE_LEVEL_COUNT_OPTIONS,
  POSTER_TEMPLATE_MAX_BYTES,
  POSTER_TEMPLATE_TYPE_LABELS,
  POSTER_TEMPLATE_TYPES,
  validatePosterTemplateFile,
} from "../utils/posterTemplateData";

const text = (lang) => ({
  title: lang === "fr" ? "Modèles d’affiches programmes" : lang === "en" ? "Program Poster Templates" : "قوالب ملصقات البرامج",
  subtitle: lang === "fr"
    ? "Importez un modèle d’affiche vide qui sera utilisé plus tard pour générer automatiquement les affiches des programmes."
    : lang === "en"
    ? "Upload a blank poster template that will later be used to generate program posters automatically."
    : "ارفع قالب ملصق فارغ، وسيتم استعماله لاحقًا لتوليد ملصقات البرامج تلقائيًا.",
  newTemplate: lang === "fr" ? "Nouveau modèle" : lang === "en" ? "New template" : "قالب جديد",
  editTemplate: lang === "fr" ? "Modifier le modèle" : lang === "en" ? "Edit template" : "تعديل القالب",
  templateName: lang === "fr" ? "Nom du modèle" : lang === "en" ? "Template name" : "اسم القالب",
  templateNamePlaceholder: lang === "fr" ? "Ex. Ramadan 1447" : lang === "en" ? "Ex. Ramadan 1447" : "مثال: رمضان 1447",
  programType: lang === "fr" ? "Type de programme" : lang === "en" ? "Program type" : "نوع البرنامج",
  levelsCount: lang === "fr" ? "Nombre de niveaux du modèle" : lang === "en" ? "Template levels count" : "عدد مستويات القالب",
  posterImage: lang === "fr" ? "Affiche vide" : lang === "en" ? "Blank poster image" : "صورة الملصق الفارغ",
  chooseImage: lang === "fr" ? "Choisir l’image" : lang === "en" ? "Choose image" : "اختيار الصورة",
  replaceImage: lang === "fr" ? "Remplacer l’image" : lang === "en" ? "Replace image" : "استبدال الصورة",
  save: lang === "fr" ? "Enregistrer" : lang === "en" ? "Save" : "حفظ",
  saving: lang === "fr" ? "Enregistrement..." : lang === "en" ? "Saving..." : "جاري الحفظ...",
  defineAreas: lang === "fr" ? "Définir les zones" : lang === "en" ? "Define fill areas" : "تحديد مناطق التعبئة",
  cancel: lang === "fr" ? "Annuler" : lang === "en" ? "Cancel" : "إلغاء",
  edit: lang === "fr" ? "Modifier" : lang === "en" ? "Edit" : "تعديل",
  remove: lang === "fr" ? "Supprimer" : lang === "en" ? "Delete" : "حذف",
  loading: lang === "fr" ? "Chargement..." : lang === "en" ? "Loading..." : "جاري التحميل...",
  noTemplatesTitle: lang === "fr" ? "Aucun modèle d’affiche" : lang === "en" ? "No poster templates yet" : "لا توجد قوالب ملصقات بعد",
  noTemplatesSubtitle: lang === "fr"
    ? "Ajoutez le premier modèle vide pour préparer la génération automatique des affiches."
    : lang === "en"
    ? "Add the first blank template to prepare automated poster generation."
    : "أضف أول قالب فارغ للتحضير لتوليد الملصقات تلقائيًا.",
  createdAt: lang === "fr" ? "Créé" : lang === "en" ? "Created" : "تاريخ الإنشاء",
  updatedAt: lang === "fr" ? "Mis à jour" : lang === "en" ? "Updated" : "آخر تحديث",
  fileHint: lang === "fr"
    ? "PNG, JPG ou WEBP. Taille maximale : 12 Mo."
    : lang === "en"
    ? "PNG, JPG, or WEBP. Maximum size: 12 MB."
    : "PNG أو JPG أو WEBP. الحد الأقصى 12MB.",
  invalidType: lang === "fr"
    ? "Format non pris en charge. Utilisez PNG, JPG ou WEBP."
    : lang === "en"
    ? "Unsupported file type. Use PNG, JPG, or WEBP."
    : "صيغة الملف غير مدعومة. استعمل PNG أو JPG أو WEBP.",
  tooLarge: lang === "fr"
    ? "L’image est trop volumineuse. Taille maximale : 12 Mo."
    : lang === "en"
    ? "Image is too large. Maximum size is 12 MB."
    : "حجم الصورة كبير جدًا. الحد الأقصى 12MB.",
  nameRequired: lang === "fr" ? "Ajoutez un nom au modèle." : lang === "en" ? "Add a template name." : "أدخل اسم القالب.",
  imageRequired: lang === "fr" ? "Ajoutez l’image vide du modèle." : lang === "en" ? "Add the blank template image." : "أضف صورة القالب الفارغ.",
  loadError: lang === "fr" ? "Impossible de charger les modèles d’affiches." : lang === "en" ? "Unable to load poster templates." : "تعذر تحميل قوالب الملصقات.",
  setupMissing: lang === "fr"
    ? "La table ou le bucket des affiches n’est pas encore configuré dans Supabase."
    : lang === "en"
    ? "The poster template table or bucket is not configured in Supabase yet."
    : "لم يتم إعداد جدول أو bucket قوالب الملصقات في Supabase بعد.",
  saveSuccess: lang === "fr" ? "Modèle enregistré" : lang === "en" ? "Template saved" : "تم حفظ القالب",
  saveError: lang === "fr" ? "Impossible d’enregistrer le modèle" : lang === "en" ? "Unable to save template" : "تعذر حفظ القالب",
  areasSaveSuccess: lang === "fr" ? "Zones enregistrées" : lang === "en" ? "Areas saved" : "تم حفظ المناطق",
  areasSaveError: lang === "fr" ? "Impossible d’enregistrer les zones" : lang === "en" ? "Unable to save areas" : "تعذر حفظ المناطق",
  deleteSuccess: lang === "fr" ? "Modèle supprimé" : lang === "en" ? "Template deleted" : "تم حذف القالب",
  deleteError: lang === "fr" ? "Impossible de supprimer le modèle" : lang === "en" ? "Unable to delete template" : "تعذر حذف القالب",
  deleteTitle: lang === "fr" ? "Supprimer ce modèle ?" : lang === "en" ? "Delete this template?" : "حذف هذا القالب؟",
  deleteMessage: lang === "fr"
    ? "Cette action supprimera le modèle et son image vide."
    : lang === "en"
    ? "This will remove the template and its blank image."
    : "سيتم حذف القالب وصورته الفارغة.",
  readOnly: lang === "fr"
    ? "Votre rôle permet de consulter les modèles, pas de les modifier."
    : lang === "en"
    ? "Your role can view templates but cannot edit them."
    : "يمكن لدورك عرض القوالب دون تعديلها.",
});

const isMissingSetupError = (error) => Boolean(error && (
  String(error.message || "").includes("program_poster_templates")
  || String(error.message || "").includes("program-poster-templates")
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

const fileSizeMb = Math.round(POSTER_TEMPLATE_MAX_BYTES / 1024 / 1024);

const formatLevelsCount = (value, lang) => {
  const count = normalizePosterTemplateLevelsCount(value);
  if (lang === "fr") return `${count} ${count === 1 ? "niveau" : "niveaux"}`;
  if (lang === "en") return `${count} ${count === 1 ? "level" : "levels"}`;
  return `${count} ${count === 1 ? "مستوى" : "مستويات"}`;
};

export function ProgramPosterTemplatesSettings({ store, onToast, canManage = false, embedded = false, onTemplatesChanged }) {
  const { lang } = useLang();
  const l = React.useMemo(() => text(lang), [lang]);
  const agencyId = store?.agencyId || store?.agency?.id || "";
  const [templates, setTemplates] = React.useState([]);
  const [imageUrls, setImageUrls] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState(null);
  const [areaEditorTemplate, setAreaEditorTemplate] = React.useState(null);
  const [areaSaving, setAreaSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [form, setForm] = React.useState({
    name: "",
    programType: "umrah",
    levelsCount: POSTER_TEMPLATE_DEFAULT_LEVELS_COUNT,
  });
  const [selectedFile, setSelectedFile] = React.useState(null);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [formError, setFormError] = React.useState("");
  const fileInputRef = React.useRef(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await fetchPosterTemplates({ agencyId });
      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("[Posters] Template load failed", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all((templates || []).map(async (template) => {
      const url = await getPosterTemplateImageUrl(template);
      return [template.id, url];
    })).then((entries) => {
      if (!cancelled) setImageUrls(Object.fromEntries(entries));
    });
    return () => { cancelled = true; };
  }, [templates]);

  React.useEffect(() => () => {
    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const openCreate = () => {
    setEditingTemplate(null);
    setForm({ name: "", programType: "umrah", levelsCount: POSTER_TEMPLATE_DEFAULT_LEVELS_COUNT });
    setSelectedFile(null);
    setPreviewUrl("");
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (template) => {
    setEditingTemplate(template);
    setForm({
      name: template.name || "",
      programType: template.programType || "umrah",
      levelsCount: normalizePosterTemplateLevelsCount(template.levelsCount),
    });
    setSelectedFile(null);
    setPreviewUrl(imageUrls[template.id] || "");
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingTemplate(null);
    setSelectedFile(null);
    setFormError("");
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const validation = validatePosterTemplateFile(file);
    if (!validation.valid) {
      setFormError(validation.reason === "size" ? l.tooLarge : l.invalidType);
      return;
    }
    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setFormError("");
  };

  const handleSave = async () => {
    if (!canManage || saving) return;
    const name = form.name.trim();
    if (!name) {
      setFormError(l.nameRequired);
      return;
    }
    if (!selectedFile && !editingTemplate?.imagePath && !editingTemplate?.dataUrl) {
      setFormError(l.imageRequired);
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const { error } = await savePosterTemplate({
        agencyId,
        template: {
          ...editingTemplate,
          name,
          programType: form.programType,
          levelsCount: normalizePosterTemplateLevelsCount(form.levelsCount),
        },
        file: selectedFile,
      });
      if (error) throw error;
      await refresh();
      onTemplatesChanged?.();
      setModalOpen(false);
      onToast?.(l.saveSuccess, "success");
    } catch (error) {
      console.error("[Posters] Template save failed", error);
      setError(error);
      setFormError(l.saveError);
      onToast?.(l.saveError, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !canManage) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      const { error, storageError } = await deletePosterTemplate({ agencyId, template: target });
      if (error) throw error;
      await refresh();
      onTemplatesChanged?.();
      onToast?.(storageError ? l.deleteError : l.deleteSuccess, storageError ? "error" : "info");
    } catch (error) {
      console.error("[Posters] Template delete failed", error);
      setError(error);
      onToast?.(l.deleteError, "error");
    }
  };

  const handleSaveAreas = async (areas) => {
    if (!areaEditorTemplate || !canManage || areaSaving) return;
    setAreaSaving(true);
    try {
      const { error } = await savePosterTemplate({
        agencyId,
        template: {
          ...areaEditorTemplate,
          areas,
        },
        file: null,
      });
      if (error) throw error;
      await refresh();
      setAreaEditorTemplate(null);
      onToast?.(l.areasSaveSuccess, "success");
    } catch (error) {
      console.error("[Posters] Area mapping save failed", error);
      setError(error);
      onToast?.(l.areasSaveError, "error");
    } finally {
      setAreaSaving(false);
    }
  };

  const setupMissing = isMissingSetupError(error);

  const content = (
    <>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 14,
      }}>
        {!embedded && (
          <div>
            <p style={{ fontSize: 19, fontWeight: 900, color: "var(--rukn-gold)" }}>{l.title}</p>
            <p style={{ fontSize: 12, color: "var(--rukn-text-muted)", marginTop: 5, lineHeight: 1.7 }}>
              {l.subtitle}
            </p>
          </div>
        )}
        {canManage ? (
          <Button variant="primary" size="sm" icon="plus" onClick={openCreate}>
            {l.newTemplate}
          </Button>
        ) : (
          <span style={{ fontSize: 12, color: "var(--rukn-text-muted)", lineHeight: 1.7 }}>{l.readOnly}</span>
        )}
      </div>

      {embedded && (
        <p style={{ fontSize: 12, color: "var(--rukn-text-muted)", lineHeight: 1.7, marginBottom: 14 }}>
          {l.subtitle}
        </p>
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
          lineHeight: 1.6,
          marginBottom: 14,
        }}>
          {setupMissing ? l.setupMissing : l.loadError}
        </div>
      )}

      {loading && (
        <div style={{ color: "var(--rukn-text-muted)", fontSize: 12, marginBottom: 12 }}>{l.loading}</div>
      )}

      {!loading && !templates.length && (
        <GlassCard style={{
          padding: 18,
          borderStyle: "dashed",
          textAlign: "center",
          display: "grid",
          placeItems: "center",
          gap: 8,
          minHeight: 150,
        }}>
          <span style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            border: "1px solid var(--rukn-border-soft)",
            background: "var(--rukn-bg-card)",
            color: "var(--rukn-gold)",
            display: "grid",
            placeItems: "center",
          }}>
            <AppIcon name="file" size={20} />
          </span>
          <p style={{ fontSize: 14, fontWeight: 900, color: "var(--rukn-text)" }}>{l.noTemplatesTitle}</p>
          <p style={{ fontSize: 12, color: "var(--rukn-text-muted)", lineHeight: 1.7, maxWidth: 460 }}>
            {l.noTemplatesSubtitle}
          </p>
        </GlassCard>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(220px,280px))",
        gap: 12,
        alignItems: "start",
      }}>
        {templates.map((template) => {
          const imageUrl = imageUrls[template.id] || "";
          const typeLabel = POSTER_TEMPLATE_TYPE_LABELS[template.programType]?.[lang]
            || POSTER_TEMPLATE_TYPE_LABELS[template.programType]?.ar
            || template.programType;
          const levelsCountBadge = formatLevelsCount(template.levelsCount, lang);
          return (
            <div
              key={template.id}
              style={{
                border: "1px solid var(--rukn-border-soft)",
                background: "var(--rukn-bg-soft)",
                borderRadius: 16,
                overflow: "hidden",
                minWidth: 0,
                maxWidth: 280,
              }}
            >
              <div style={{
                height: "clamp(180px, 22vw, 220px)",
                background: "var(--rukn-bg-card)",
                borderBottom: "1px solid var(--rukn-border-soft)",
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
              }}>
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={template.name}
                    style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                  />
                ) : (
                  <AppIcon name="file" size={28} color="var(--rukn-text-muted)" />
                )}
              </div>
              <div style={{ padding: 12, display: "grid", gap: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 900, color: "var(--rukn-text)", overflowWrap: "anywhere" }}>
                      {template.name}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--rukn-gold)", marginTop: 3, fontWeight: 800 }}>
                      {typeLabel}
                    </p>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      width: "fit-content",
                      borderRadius: 999,
                      border: "1px solid var(--rukn-border-soft)",
                      background: "var(--rukn-bg-card)",
                      color: "var(--rukn-text-muted)",
                      fontSize: 10.5,
                      fontWeight: 900,
                      lineHeight: 1,
                      padding: "5px 8px",
                      marginTop: 6,
                    }}>
                      {levelsCountBadge}
                    </span>
                  </div>
                  <span style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    border: "1px solid rgba(212,175,55,.24)",
                    background: "rgba(212,175,55,.08)",
                    color: "var(--rukn-gold)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}>
                    <AppIcon name="program" size={16} />
                  </span>
                </div>

                <div style={{ display: "grid", gap: 2, fontSize: 10.5, color: "var(--rukn-text-muted)", lineHeight: 1.5 }}>
                  {template.createdAt && <span>{l.createdAt}: {formatDate(template.createdAt, lang)}</span>}
                  {template.updatedAt && <span>{l.updatedAt}: {formatDate(template.updatedAt, lang)}</span>}
                </div>

                {canManage && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 1 }}>
                    <Button variant="secondary" size="sm" icon="edit" onClick={() => setAreaEditorTemplate(template)}>
                      {l.defineAreas}
                    </Button>
                    <Button variant="secondary" size="sm" icon="edit" onClick={() => openEdit(template)}>
                      {l.edit}
                    </Button>
                    <Button variant="ghost" size="sm" icon="trash" onClick={() => setDeleteTarget(template)}>
                      {l.remove}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingTemplate ? l.editTemplate : l.newTemplate}
        width={680}
      >
        <div style={{ display: "grid", gap: 14 }}>
          <Input
            label={l.templateName}
            value={form.name}
            onChange={(event) => {
              setForm((current) => ({ ...current, name: event.target.value }));
              setFormError("");
            }}
            placeholder={l.templateNamePlaceholder}
            disabled={saving}
          />

          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--rukn-text-muted)", marginBottom: 7 }}>
              {l.programType}
            </p>
            <div style={{ display: "inline-grid", gridTemplateColumns: "repeat(2,minmax(100px,1fr))", gap: 6 }}>
              {POSTER_TEMPLATE_TYPES.map((type) => {
                const active = form.programType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={saving}
                    onClick={() => setForm((current) => ({ ...current, programType: type }))}
                    style={{
                      borderRadius: 999,
                      border: active ? "1px solid var(--rukn-gold)" : "1px solid var(--rukn-border-soft)",
                      background: active ? "var(--rukn-gold-dim)" : "var(--rukn-bg-soft)",
                      color: active ? "var(--rukn-gold)" : "var(--rukn-text-muted)",
                      fontFamily: "'Cairo',sans-serif",
                      fontWeight: 900,
                      fontSize: 13,
                      padding: "8px 18px",
                      cursor: saving ? "not-allowed" : "pointer",
                    }}
                  >
                    {POSTER_TEMPLATE_TYPE_LABELS[type][lang] || POSTER_TEMPLATE_TYPE_LABELS[type].ar}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--rukn-text-muted)", marginBottom: 7 }}>
              {l.levelsCount}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {POSTER_TEMPLATE_LEVEL_COUNT_OPTIONS.map((count) => {
                const active = normalizePosterTemplateLevelsCount(form.levelsCount) === count;
                return (
                  <button
                    key={count}
                    type="button"
                    disabled={saving}
                    onClick={() => setForm((current) => ({ ...current, levelsCount: count }))}
                    style={{
                      borderRadius: 999,
                      border: active ? "1px solid var(--rukn-gold)" : "1px solid var(--rukn-border-soft)",
                      background: active ? "var(--rukn-gold-dim)" : "var(--rukn-bg-soft)",
                      color: active ? "var(--rukn-gold)" : "var(--rukn-text-muted)",
                      fontFamily: "'Cairo',sans-serif",
                      fontWeight: 900,
                      fontSize: 12,
                      padding: "8px 10px",
                      whiteSpace: "nowrap",
                      cursor: saving ? "not-allowed" : "pointer",
                    }}
                  >
                    {formatLevelsCount(count, lang)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--rukn-text-muted)", marginBottom: 7 }}>
              {l.posterImage}
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "minmax(120px,170px) 1fr",
              gap: 14,
              alignItems: "center",
            }}>
              <div style={{
                aspectRatio: "4 / 5",
                borderRadius: 14,
                border: "1px solid var(--rukn-border-soft)",
                background: "var(--rukn-bg-card)",
                overflow: "hidden",
                display: "grid",
                placeItems: "center",
              }}>
                {previewUrl ? (
                  <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <AppIcon name="upload" size={24} color="var(--rukn-text-muted)" />
                )}
              </div>
              <div style={{ display: "grid", gap: 9, minWidth: 0 }}>
                <p style={{ fontSize: 12, color: "var(--rukn-text-muted)", lineHeight: 1.7 }}>
                  {l.fileHint.replace("12", String(fileSizeMb))}
                </p>
                {selectedFile && (
                  <p style={{ fontSize: 12, color: "var(--rukn-text)", overflowWrap: "anywhere" }}>
                    {selectedFile.name}
                  </p>
                )}
                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon="upload"
                    disabled={saving}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {previewUrl ? l.replaceImage : l.chooseImage}
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFile}
                  style={{ display: "none" }}
                />
              </div>
            </div>
          </div>

          {formError && (
            <p style={{
              color: "var(--rukn-danger)",
              fontSize: 12,
              fontWeight: 800,
              lineHeight: 1.6,
              margin: 0,
            }}>
              {formError}
            </p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>
              {l.cancel}
            </Button>
            <Button variant="primary" icon="save" onClick={handleSave} disabled={saving || !canManage}>
              {saving ? l.saving : l.save}
            </Button>
          </div>
        </div>
      </Modal>

      <PosterFillAreasEditor
        open={Boolean(areaEditorTemplate)}
        template={areaEditorTemplate}
        imageUrl={areaEditorTemplate ? imageUrls[areaEditorTemplate.id] || "" : ""}
        lang={lang}
        saving={areaSaving}
        onClose={() => {
          if (!areaSaving) setAreaEditorTemplate(null);
        }}
        onSave={handleSaveAreas}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={l.deleteTitle}
        width={480}
      >
        <p style={{ fontSize: 13, color: "var(--rukn-text)", lineHeight: 1.8, marginBottom: 18 }}>
          {l.deleteMessage}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            {l.cancel}
          </Button>
          <Button variant="danger" icon="trash" onClick={handleDelete}>
            {l.remove}
          </Button>
        </div>
      </Modal>
    </>
  );

  if (embedded) return <div>{content}</div>;

  return (
    <GlassCard gold style={{ padding: 18, marginBottom: 20 }}>
      {content}
    </GlassCard>
  );
}
