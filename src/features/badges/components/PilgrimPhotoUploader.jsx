import React from "react";
import { Button } from "../../../components/UI";
import { compressBadgeImage } from "../utils/badgeImageCompression";
import {
  badgePhotoCompressionErrorMessage,
  validateBadgePhotoFile,
} from "../utils/badgeValidation";

const label = (lang, ar, fr, en) => (lang === "fr" ? fr : lang === "en" ? en : ar);

export function PilgrimPhotoUploader({
  lang = "ar",
  photoUrl = "",
  disabled = false,
  busy = false,
  error = "",
  onPhotoReady,
  onRemove,
}) {
  const inputRef = React.useRef(null);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [localError, setLocalError] = React.useState("");

  React.useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const visibleUrl = previewUrl || photoUrl;

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setLocalError("");
    if (!file) return;
    const validation = validateBadgePhotoFile(file, lang);
    if (!validation.ok) {
      setLocalError(validation.message);
      return;
    }
    try {
      const compressed = await compressBadgeImage(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(compressed));
      onPhotoReady?.(compressed);
    } catch {
      setLocalError(badgePhotoCompressionErrorMessage(lang));
    }
  };

  const handleRemove = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setLocalError("");
    onRemove?.();
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 800, color: "var(--rukn-gold)", marginBottom: 3 }}>
          {label(lang, "الصورة الشخصية للشارة", "Photo personnelle du badge", "Badge profile photo")}
        </p>
        <p style={{ fontSize: 11, color: "var(--rukn-text-muted)", lineHeight: 1.6 }}>
          {label(
            lang,
            "سيتم ضغط الصورة تلقائيًا لاستخدامها لاحقًا في الشارة.",
            "L'image sera compressée automatiquement pour le futur badge.",
            "The image will be compressed automatically for future badge use."
          )}
        </p>
      </div>
      <div style={{
        display: "flex",
        gap: 14,
        alignItems: "center",
        flexWrap: "wrap",
      }}>
      <div style={{
        width: 104,
        height: 124,
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid var(--rukn-border-soft)",
        background: "linear-gradient(135deg,var(--rukn-bg-soft),var(--rukn-bg-card))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--rukn-text-muted)",
        fontSize: 11,
        fontWeight: 700,
        boxShadow: "var(--rukn-shadow-card)",
      }}>
        {visibleUrl ? (
          <img
            src={visibleUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ textAlign: "center", padding: 10, lineHeight: 1.6 }}>
            {label(lang, "صورة الشارة", "Photo badge", "Badge photo")}
          </span>
        )}
      </div>
      <div style={{ display: "grid", gap: 8, flex: "1 1 220px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            variant="secondary"
            size="sm"
            icon="upload"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            {visibleUrl
              ? label(lang, "استبدال الصورة", "Remplacer la photo", "Replace photo")
              : label(lang, "إضافة صورة", "Ajouter une photo", "Add photo")}
          </Button>
          {visibleUrl && (
            <Button variant="ghost" size="sm" icon="trash" disabled={busy} onClick={handleRemove}>
              {label(lang, "إزالة", "Supprimer", "Remove")}
            </Button>
          )}
        </div>
        <p style={{ fontSize: 11, color: "var(--rukn-text-muted)", lineHeight: 1.6 }}>
          {label(
            lang,
            "JPG أو PNG أو WebP. لا يتم حفظ الصورة الأصلية الكبيرة.",
            "JPG, PNG ou WebP. L'image originale lourde n'est pas enregistrée.",
            "JPG, PNG, or WebP. The large original image is not stored."
          )}
        </p>
        {(localError || error) && (
          <p style={{ fontSize: 11, color: "var(--rukn-danger)", fontWeight: 700 }}>
            {localError || error}
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      </div>
    </div>
  );
}
