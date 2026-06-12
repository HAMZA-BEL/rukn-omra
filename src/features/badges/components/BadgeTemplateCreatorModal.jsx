import React from "react";
import { Button, Input, Modal } from "../../../components/UI";
import { isSupabaseEnabled } from "../../../lib/supabase";
import { compressBadgeTemplateImage, getBadgeImageDimensions } from "../utils/badgeImageCompression";
import { BADGE_TEMPLATE_PRINT_DPI, DEFAULT_BADGE_SIZE } from "../utils/badgeDefaults";
import { createDefaultBadgeLayout } from "../utils/badgeLayout";
import { calculateBadgeBackgroundFit, getBadgeCanvasPixelSize } from "../utils/badgeBackground";
import { createBadgeTemplateId } from "../services/badgeTemplatesApi";
import { uploadBadgeTemplateImage } from "../utils/badgeStorage";
import { validateBadgeTemplateImageFile } from "../utils/badgeValidation";
import { normalizeBadgeNumber } from "../utils/badgeTemplateMapping";
import { useLang } from "../../../hooks/useLang";
import { BadgeBoundsModal } from "./BadgeBoundsModal";

const roundMm = (value) => Math.max(0, Math.round(normalizeBadgeNumber(value, 0) * 10) / 10);
const positiveNumber = (value) => {
  const number = normalizeBadgeNumber(value, 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
};
const isSupportedBadgeImageType = (file) => (
  ["image/jpeg", "image/png", "image/webp"].includes(file?.type)
);

const lowTemplateQualityMessage = (lang = "ar") => (
  lang === "fr"
    ? "La qualité du modèle est faible pour l’impression. Il est recommandé d’utiliser une image plus haute résolution."
    : lang === "en"
      ? "Template quality is low for printing. Please upload a higher-resolution image."
      : "جودة القالب منخفضة للطباعة، يفضل رفع صورة بدقة أعلى"
);

const hasLowPrintResolution = ({ imageWidth = 0, imageHeight = 0, widthMm = 90, heightMm = 140 } = {}) => {
  const requiredWidth = normalizeBadgeNumber(widthMm, DEFAULT_BADGE_SIZE.widthMm) * BADGE_TEMPLATE_PRINT_DPI / 25.4;
  const requiredHeight = normalizeBadgeNumber(heightMm, DEFAULT_BADGE_SIZE.heightMm) * BADGE_TEMPLATE_PRINT_DPI / 25.4;
  return imageWidth > 0 && imageHeight > 0 && (imageWidth < requiredWidth || imageHeight < requiredHeight);
};

const fullCropFromDimensions = (dimensions = {}) => ({
  x: 0,
  y: 0,
  width: Math.max(1, Number(dimensions.width) || 1),
  height: Math.max(1, Number(dimensions.height) || 1),
  naturalWidth: Math.max(1, Number(dimensions.width) || 1),
  naturalHeight: Math.max(1, Number(dimensions.height) || 1),
});

const mapCropToDimensions = (crop = {}, nextDimensions = {}) => {
  const sourceWidth = Math.max(1, Number(crop.naturalWidth) || Number(crop.width) || 1);
  const sourceHeight = Math.max(1, Number(crop.naturalHeight) || Number(crop.height) || 1);
  const targetWidth = Math.max(1, Number(nextDimensions.width) || 1);
  const targetHeight = Math.max(1, Number(nextDimensions.height) || 1);
  const scaleX = targetWidth / sourceWidth;
  const scaleY = targetHeight / sourceHeight;
  const cropX = Math.min(targetWidth - 1, Math.max(0, Math.round((Number(crop.x) || 0) * scaleX)));
  const cropY = Math.min(targetHeight - 1, Math.max(0, Math.round((Number(crop.y) || 0) * scaleY)));
  const cropWidth = Math.max(1, Math.min(targetWidth - cropX, Math.round((Number(crop.width) || sourceWidth) * scaleX)));
  const cropHeight = Math.max(1, Math.min(targetHeight - cropY, Math.round((Number(crop.height) || sourceHeight) * scaleY)));
  return { cropX, cropY, cropWidth, cropHeight };
};

function BadgeDraftBoundsPreview({ imageUrl, crop }) {
  if (!imageUrl || !crop?.width || !crop?.height) return null;
  return (
    <div style={{
      width: 96,
      aspectRatio: `${crop.width} / ${crop.height}`,
      borderRadius: 10,
      overflow: "hidden",
      border: "1px solid rgba(212,175,55,.32)",
      background: "#ffffff",
      position: "relative",
      flexShrink: 0,
    }}>
      <img
        src={imageUrl}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: "absolute",
          left: `${-(crop.x || 0) / crop.width * 100}%`,
          top: `${-(crop.y || 0) / crop.height * 100}%`,
          width: `${(crop.naturalWidth || crop.width) / crop.width * 100}%`,
          height: `${(crop.naturalHeight || crop.height) / crop.height * 100}%`,
          maxWidth: "none",
          pointerEvents: "none",
          userSelect: "none",
        }}
      />
    </div>
  );
}

export function BadgeTemplateCreatorModal({ open, onClose, agencyId, onCreate, onToast }) {
  const { t, lang } = useLang();
  const inputRef = React.useRef(null);
  const previewUrlRef = React.useRef("");
  const [name, setName] = React.useState(t.badgeDefaultTemplateName || "Badge template");
  const [description, setDescription] = React.useState("");
  const [widthMm, setWidthMm] = React.useState(DEFAULT_BADGE_SIZE.widthMm);
  const [heightMm, setHeightMm] = React.useState(DEFAULT_BADGE_SIZE.heightMm);
  const [heightManuallyEdited, setHeightManuallyEdited] = React.useState(false);
  const [aspectLocked, setAspectLocked] = React.useState(true);
  const [file, setFile] = React.useState(null);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [imageDimensions, setImageDimensions] = React.useState(null);
  const [crop, setCrop] = React.useState(null);
  const [fileError, setFileError] = React.useState("");
  const [qualityWarning, setQualityWarning] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [boundsOpen, setBoundsOpen] = React.useState(false);

  const revokePreviewUrl = React.useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }
  }, []);

  const resetDraft = React.useCallback(() => {
    revokePreviewUrl();
    setName(t.badgeDefaultTemplateName || "Badge template");
    setDescription("");
    setWidthMm(DEFAULT_BADGE_SIZE.widthMm);
    setHeightMm(DEFAULT_BADGE_SIZE.heightMm);
    setHeightManuallyEdited(false);
    setAspectLocked(true);
    setFile(null);
    setPreviewUrl("");
    setImageDimensions(null);
    setCrop(null);
    setFileError("");
    setQualityWarning("");
    setBusy(false);
    setBoundsOpen(false);
  }, [revokePreviewUrl, t.badgeDefaultTemplateName]);

  React.useEffect(() => {
    if (open) resetDraft();
  }, [open, resetDraft]);

  React.useEffect(() => () => revokePreviewUrl(), [revokePreviewUrl]);

  React.useEffect(() => {
    setQualityWarning("");
    const imageWidth = crop?.width || imageDimensions?.width || 0;
    const imageHeight = crop?.height || imageDimensions?.height || 0;
    if (!imageWidth || !imageHeight) return;
    setQualityWarning(hasLowPrintResolution({
      imageWidth,
      imageHeight,
      widthMm,
      heightMm,
    }) ? lowTemplateQualityMessage(lang) : "");
  }, [crop, heightMm, imageDimensions, lang, widthMm]);

  const closeAndDiscard = () => {
    resetDraft();
    onClose?.();
  };

  const updateSizeFromCrop = (nextCrop, preferredHeight = heightMm) => {
    if (!nextCrop?.width || !nextCrop?.height) return;
    const ratio = nextCrop.width / nextCrop.height;
    const targetHeight = positiveNumber(heightManuallyEdited ? preferredHeight : DEFAULT_BADGE_SIZE.heightMm)
      || DEFAULT_BADGE_SIZE.heightMm;
    setHeightMm(roundMm(targetHeight));
    setWidthMm(roundMm(targetHeight * ratio));
  };

  const handleApplyBounds = (nextCrop) => {
    setCrop(nextCrop);
    setBoundsOpen(false);
    updateSizeFromCrop(nextCrop);
    onToast?.(t.badgeBoundsApplied || "تم اعتماد حدود الشارة", "success");
  };

  const handleWidthChange = (event) => {
    const nextWidth = positiveNumber(event.target.value);
    setWidthMm(nextWidth || "");
    if (aspectLocked && crop?.width && crop?.height && nextWidth > 0) {
      setHeightMm(roundMm(nextWidth / (crop.width / crop.height)));
      setHeightManuallyEdited(true);
    }
  };

  const handleHeightChange = (event) => {
    const nextHeight = positiveNumber(event.target.value);
    setHeightMm(nextHeight || "");
    setHeightManuallyEdited(true);
    if (aspectLocked && crop?.width && crop?.height && nextHeight > 0) {
      setWidthMm(roundMm(nextHeight * (crop.width / crop.height)));
    }
  };

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files?.[0] || null;
    event.target.value = "";
    setFileError("");
    setQualityWarning("");
    setCrop(null);
    setImageDimensions(null);
    if (!selectedFile) {
      setFile(null);
      revokePreviewUrl();
      setPreviewUrl("");
      return;
    }
    if (!isSupportedBadgeImageType(selectedFile)) {
      const message = t.badgeUnsupportedImageType || "صيغة الصورة غير مدعومة";
      setFile(null);
      revokePreviewUrl();
      setPreviewUrl("");
      setFileError(message);
      onToast?.(message, "error");
      return;
    }
    const validation = validateBadgeTemplateImageFile(selectedFile, lang);
    if (!validation.ok) {
      setFile(null);
      revokePreviewUrl();
      setPreviewUrl("");
      const message = validation.message || t.badgeUnsupportedImageType || "صيغة الصورة غير مدعومة";
      setFileError(message);
      onToast?.(message, "error");
      return;
    }
    try {
      const dimensions = await getBadgeImageDimensions(selectedFile);
      const objectUrl = URL.createObjectURL(selectedFile);
      revokePreviewUrl();
      previewUrlRef.current = objectUrl;
      setFile(selectedFile);
      setPreviewUrl(objectUrl);
      setImageDimensions(dimensions);
      setBoundsOpen(true);
    } catch {
      setFile(null);
      setFileError(t.badgeUnsupportedImageType || "صيغة الصورة غير مدعومة");
      onToast?.(t.badgeUnsupportedImageType || "صيغة الصورة غير مدعومة", "error");
    }
  };

  const validationMessage = () => {
    if (!name.trim()) return t.badgeNameRequired || "اسم القالب مطلوب";
    if (!file) return t.badgeImportDesignRequired || "يرجى استيراد تصميم الشارة";
    if (!crop?.width || !crop?.height) return t.badgeBoundsRequired || "يرجى تحديد حدود الشارة";
    if (!positiveNumber(widthMm) || !positiveNumber(heightMm)) {
      return t.badgePositiveSizeRequired || "العرض والارتفاع يجب أن يكونا أكبر من صفر";
    }
    if (!isSupportedBadgeImageType(file)) return t.badgeUnsupportedImageType || "صيغة الصورة غير مدعومة";
    const validation = validateBadgeTemplateImageFile(file, lang);
    if (!validation.ok) return validation.message || t.badgeUnsupportedImageType || "صيغة الصورة غير مدعومة";
    return "";
  };

  const createTemplate = async () => {
    const message = validationMessage();
    if (message) {
      setFileError(message);
      onToast?.(message, "error");
      return;
    }
    if (!isSupabaseEnabled || !agencyId) {
      onToast?.(t.badgeStorageRequired || "Creating badge templates requires Supabase Storage", "error");
      return;
    }

    setBusy(true);
    setFileError("");
    onToast?.(t.badgeSavingTemplate || "جاري حفظ القالب…", "info");
    try {
      const id = createBadgeTemplateId();
      const compressed = await compressBadgeTemplateImage(file);
      const compressedDimensions = await getBadgeImageDimensions(compressed);
      const mappedCrop = mapCropToDimensions(crop, compressedDimensions);
      const canvasSize = getBadgeCanvasPixelSize(widthMm, heightMm);
      const layout = {
        ...createDefaultBadgeLayout(),
        background: calculateBadgeBackgroundFit({
          canvasWidth: canvasSize.width,
          canvasHeight: canvasSize.height,
          imageNaturalWidth: compressedDimensions.width,
          imageNaturalHeight: compressedDimensions.height,
          ...mappedCrop,
          fitMode: "contain",
        }),
      };
      const { data, error } = await uploadBadgeTemplateImage({ agencyId, templateId: id, file: compressed });
      if (error || !data?.path) throw error || new Error("Upload failed");
      const saved = await onCreate?.({
        id,
        name: name.trim(),
        description: description.trim(),
        templatePath: data.path,
        widthMm: positiveNumber(widthMm),
        heightMm: positiveNumber(heightMm),
        layout,
        isDefault: false,
      });
      if (!saved) throw new Error("Template save failed");
      onToast?.(t.badgeSaveSuccess || "تم حفظ القالب", "success");
      closeAndDiscard();
    } catch {
      onToast?.(t.badgeSaveError || "تعذر حفظ القالب", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={closeAndDiscard} title={t.badgeNewTemplate || "New template"} width={620}>
      <div style={{ display: "grid", gap: 14 }}>
        <Input
          label={t.badgeTemplateName || "Template name"}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

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
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: "1 1 260px" }}>
            <BadgeDraftBoundsPreview imageUrl={previewUrl} crop={crop || (imageDimensions ? fullCropFromDimensions(imageDimensions) : null)} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, color: "var(--rukn-text)", fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {file ? file.name : (t.badgeUploadDesignFile || "Import badge design PNG/JPG/WebP")}
              </p>
              <p style={{ fontSize: 11, color: crop ? "var(--rukn-gold)" : "var(--rukn-text-muted)", marginTop: 3 }}>
                {crop
                  ? `${Math.round(crop.width)}×${Math.round(crop.height)} px`
                  : (file ? (t.badgeBoundsRequired || "يرجى تحديد حدود الشارة") : (t.badgeImportDesignRequired || "يرجى استيراد تصميم الشارة"))}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {file && imageDimensions && (
              <Button variant="ghost" size="sm" onClick={() => setBoundsOpen(true)} disabled={busy}>
                {t.badgeDefineBoundsTitle || "تحديد حدود الشارة"}
              </Button>
            )}
            <Button variant="secondary" size="sm" icon="upload" onClick={() => inputRef.current?.click()} disabled={busy || !isSupabaseEnabled}>
              {t.badgeUploadDesign || "Import design"}
            </Button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input
            label={t.badgeWidthMm || "Width (mm)"}
            type="text"
            inputMode="decimal"
            value={widthMm}
            onChange={handleWidthChange}
          />
          <Input
            label={t.badgeHeightMm || "Height (mm)"}
            type="text"
            inputMode="decimal"
            value={heightMm}
            onChange={handleHeightChange}
          />
        </div>

        <label style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          fontWeight: 800,
          color: "var(--rukn-text-muted)",
          userSelect: "none",
        }}>
          <input
            type="checkbox"
            checked={aspectLocked}
            onChange={(event) => setAspectLocked(event.target.checked)}
          />
          {t.badgeAspectLock || "قفل النسبة"}
        </label>

        <Input
          label={t.badgeDescriptionOptional || "Optional description"}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

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
          <Button variant="ghost" onClick={closeAndDiscard}>{t.cancel || "Cancel"}</Button>
          <Button variant="primary" icon="plus" onClick={createTemplate} disabled={busy || !isSupabaseEnabled}>
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

      <BadgeBoundsModal
        open={boundsOpen}
        imageUrl={previewUrl}
        imageName={file?.name || ""}
        naturalWidth={imageDimensions?.width || 0}
        naturalHeight={imageDimensions?.height || 0}
        initialCrop={crop || (imageDimensions ? fullCropFromDimensions(imageDimensions) : null)}
        onApply={handleApplyBounds}
        onCancel={() => setBoundsOpen(false)}
      />
    </Modal>
  );
}
