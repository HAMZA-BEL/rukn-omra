import React from "react";
import { Button, Input, Modal } from "../../../components/UI";
import { isSupabaseEnabled } from "../../../lib/supabase";
import { compressBadgeTemplateImage, getBadgeImageDimensions } from "../utils/badgeImageCompression";
import { BADGE_TEMPLATE_PRINT_DPI, DEFAULT_BADGE_SIZE, DEFAULT_BADGE_TEMPLATE_PATH } from "../utils/badgeDefaults";
import { createDefaultBadgeLayout } from "../utils/badgeLayout";
import { createBadgeTemplateId } from "../services/badgeTemplatesApi";
import { uploadBadgeTemplateImage } from "../utils/badgeStorage";
import { validateBadgeTemplateImageFile } from "../utils/badgeValidation";
import { useLang } from "../../../hooks/useLang";

const lowTemplateQualityMessage = (lang = "ar") => (
  lang === "fr"
    ? "La qualité du modèle est faible pour l’impression. Il est recommandé d’utiliser une image plus haute résolution."
    : lang === "en"
      ? "Template quality is low for printing. Please upload a higher-resolution image."
      : "جودة القالب منخفضة للطباعة، يفضل رفع صورة بدقة أعلى"
);

const hasLowPrintResolution = ({ imageWidth = 0, imageHeight = 0, widthMm = 90, heightMm = 140 } = {}) => {
  const requiredWidth = Number(widthMm || DEFAULT_BADGE_SIZE.widthMm) * BADGE_TEMPLATE_PRINT_DPI / 25.4;
  const requiredHeight = Number(heightMm || DEFAULT_BADGE_SIZE.heightMm) * BADGE_TEMPLATE_PRINT_DPI / 25.4;
  return imageWidth > 0 && imageHeight > 0 && (imageWidth < requiredWidth || imageHeight < requiredHeight);
};

export function BadgeTemplateCreatorModal({ open, onClose, agencyId, onCreate, onToast }) {
  const { t, lang } = useLang();
  const inputRef = React.useRef(null);
  const [name, setName] = React.useState(t.badgeDefaultTemplateName || "Badge template");
  const [description, setDescription] = React.useState("");
  const [widthMm, setWidthMm] = React.useState(DEFAULT_BADGE_SIZE.widthMm);
  const [heightMm, setHeightMm] = React.useState(DEFAULT_BADGE_SIZE.heightMm);
  const [file, setFile] = React.useState(null);
  const [fileError, setFileError] = React.useState("");
  const [qualityWarning, setQualityWarning] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [designPromptOpen, setDesignPromptOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName(t.badgeDefaultTemplateName || "Badge template");
    setDescription("");
    setWidthMm(DEFAULT_BADGE_SIZE.widthMm);
    setHeightMm(DEFAULT_BADGE_SIZE.heightMm);
    setFile(null);
    setFileError("");
    setQualityWarning("");
    setBusy(false);
    setDesignPromptOpen(false);
  }, [open, t.badgeDefaultTemplateName]);

  React.useEffect(() => {
    let cancelled = false;
    setQualityWarning("");
    if (!file) return undefined;
    getBadgeImageDimensions(file).then((dimensions) => {
      if (cancelled) return;
      setQualityWarning(hasLowPrintResolution({
        imageWidth: dimensions.width,
        imageHeight: dimensions.height,
        widthMm,
        heightMm,
      }) ? lowTemplateQualityMessage(lang) : "");
    }).catch(() => {
      if (!cancelled) setQualityWarning("");
    });
    return () => { cancelled = true; };
  }, [file, heightMm, lang, widthMm]);

  const createTemplate = async ({ useDefaultDesign = false } = {}) => {
    if (!name.trim()) return;
    if (!isSupabaseEnabled || !agencyId) {
      onToast?.(t.badgeStorageRequired || "Creating badge templates requires Supabase Storage", "error");
      return;
    }
    setBusy(true);
    try {
      const id = createBadgeTemplateId();
      let templatePath = "";
      if (useDefaultDesign) {
        templatePath = DEFAULT_BADGE_TEMPLATE_PATH;
      } else if (file) {
        const validation = validateBadgeTemplateImageFile(file, lang);
        if (!validation.ok) {
          setFileError(validation.message);
          onToast?.(validation.message, "error");
          return;
        }
        const compressed = await compressBadgeTemplateImage(file);
        const { data, error } = await uploadBadgeTemplateImage({ agencyId, templateId: id, file: compressed });
        if (error || !data?.path) throw error || new Error("Upload failed");
        templatePath = data.path;
      }
      await onCreate?.({
        id,
        name: name.trim(),
        description: description.trim(),
        templatePath,
        widthMm,
        heightMm,
        layout: createDefaultBadgeLayout(),
        isDefault: false,
      });
      onClose?.();
    } catch {
      onToast?.(t.badgeCreateError || "Unable to create badge template", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    if (!file) {
      setDesignPromptOpen(true);
      return;
    }
    await createTemplate();
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    event.target.value = "";
    setFileError("");
    setQualityWarning("");
    if (!selectedFile) {
      setFile(null);
      return;
    }
    const validation = validateBadgeTemplateImageFile(selectedFile, lang);
    if (!validation.ok) {
      setFile(null);
      setFileError(validation.message);
      onToast?.(validation.message, "error");
      return;
    }
    setFile(selectedFile);
  };

  const handlePromptUpload = () => {
    setDesignPromptOpen(false);
    requestAnimationFrame(() => inputRef.current?.click());
  };

  const handleUseDefaultDesign = async () => {
    setDesignPromptOpen(false);
    await createTemplate({ useDefaultDesign: true });
  };

  return (
    <Modal open={open} onClose={onClose} title={t.badgeNewTemplate || "New template"} width={560}>
      <div style={{ display: "grid", gap: 14 }}>
        <Input label={t.badgeTemplateName || "Template name"} value={name} onChange={(event) => setName(event.target.value)} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label={t.badgeWidthMm || "Width (mm)"} type="number" value={widthMm} onChange={(event) => setWidthMm(Number(event.target.value) || DEFAULT_BADGE_SIZE.widthMm)} />
          <Input label={t.badgeHeightMm || "Height (mm)"} type="number" value={heightMm} onChange={(event) => setHeightMm(Number(event.target.value) || DEFAULT_BADGE_SIZE.heightMm)} />
        </div>
        <Input label={t.badgeDescriptionOptional || "Optional description"} value={description} onChange={(event) => setDescription(event.target.value)} />
        <div style={{
          border: "1px dashed var(--rukn-border-soft)",
          borderRadius: 14,
          padding: 14,
          background: "var(--rukn-bg-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 12, color: "var(--rukn-text-muted)" }}>
            {file ? file.name : (t.badgeUploadDesignFile || "Import badge design PNG/JPG/WebP")}
          </span>
          <Button variant="secondary" size="sm" icon="upload" onClick={() => inputRef.current?.click()} disabled={busy || !isSupabaseEnabled}>
            {t.badgeUploadDesign || "Import design"}
          </Button>
        </div>
        {!isSupabaseEnabled && (
          <p style={{ fontSize: 12, color: "var(--rukn-danger)", fontWeight: 700 }}>
            {t.badgeStorageRequired || "Creating badge templates requires Supabase Storage."}
          </p>
        )}
        {fileError && (
          <p style={{ fontSize: 12, color: "var(--rukn-danger)", fontWeight: 700, margin: 0 }}>
            {fileError}
          </p>
        )}
        {qualityWarning && !fileError && (
          <p style={{
            fontSize: 12,
            color: "var(--rukn-warning, #b45309)",
            fontWeight: 800,
            margin: 0,
            lineHeight: 1.6,
          }}>
            {qualityWarning}
          </p>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={onClose}>{t.cancel || "Cancel"}</Button>
          <Button variant="primary" icon="plus" onClick={handleCreate} disabled={busy || !isSupabaseEnabled}>
            {t.badgeCreateTemplate || "Create template"}
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>
      <Modal
        open={designPromptOpen}
        onClose={() => setDesignPromptOpen(false)}
        title={t.badgeDesignRequiredTitle || t.badgeNewTemplate || "Badge design required"}
        width={480}
      >
        <div style={{ display: "grid", gap: 16 }}>
          <p style={{ margin: 0, color: "var(--rukn-text-strong)", fontSize: 14, lineHeight: 1.8 }}>
            {t.badgeDesignRequiredMessage || "You must first upload a badge design or choose the default design before continuing."}
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
            <Button variant="ghost" onClick={() => setDesignPromptOpen(false)}>
              {t.cancel || "Cancel"}
            </Button>
            <Button variant="secondary" icon="upload" onClick={handlePromptUpload} disabled={busy || !isSupabaseEnabled}>
              {t.badgePromptUploadDesign || t.badgeUploadDesign || "Upload design"}
            </Button>
            <Button variant="primary" onClick={handleUseDefaultDesign} disabled={busy || !isSupabaseEnabled}>
              {t.badgeUseDefaultDesign || "Use default design"}
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}
