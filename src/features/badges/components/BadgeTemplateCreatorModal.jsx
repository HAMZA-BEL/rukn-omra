import React from "react";
import { Button, Input, Modal } from "../../../components/UI";
import { isSupabaseEnabled } from "../../../lib/supabase";
import { compressBadgeTemplateImage } from "../utils/badgeImageCompression";
import { DEFAULT_BADGE_SIZE } from "../utils/badgeDefaults";
import { createDefaultBadgeLayout } from "../utils/badgeLayout";
import { createBadgeTemplateId } from "../services/badgeTemplatesApi";
import { uploadBadgeTemplateImage } from "../utils/badgeStorage";
import { useLang } from "../../../hooks/useLang";

export function BadgeTemplateCreatorModal({ open, onClose, agencyId, onCreate, onToast }) {
  const { t } = useLang();
  const inputRef = React.useRef(null);
  const [name, setName] = React.useState(t.badgeDefaultTemplateName || "Badge template");
  const [description, setDescription] = React.useState("");
  const [widthMm, setWidthMm] = React.useState(DEFAULT_BADGE_SIZE.widthMm);
  const [heightMm, setHeightMm] = React.useState(DEFAULT_BADGE_SIZE.heightMm);
  const [file, setFile] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName(t.badgeDefaultTemplateName || "Badge template");
    setDescription("");
    setWidthMm(DEFAULT_BADGE_SIZE.widthMm);
    setHeightMm(DEFAULT_BADGE_SIZE.heightMm);
    setFile(null);
    setBusy(false);
  }, [open, t.badgeDefaultTemplateName]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    if (!isSupabaseEnabled || !agencyId) {
      onToast?.(t.badgeStorageRequired || "Creating badge templates requires Supabase Storage", "error");
      return;
    }
    setBusy(true);
    try {
      const id = createBadgeTemplateId();
      let templatePath = "";
      if (file) {
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
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          style={{ display: "none" }}
        />
      </div>
    </Modal>
  );
}
