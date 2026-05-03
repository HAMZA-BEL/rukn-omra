import React from "react";
import { Button, Input, Modal } from "../../../components/UI";
import { isSupabaseEnabled } from "../../../lib/supabase";
import { compressBadgeTemplateImage } from "../utils/badgeImageCompression";
import { DEFAULT_BADGE_SIZE } from "../utils/badgeDefaults";
import { createDefaultBadgeLayout } from "../utils/badgeLayout";
import { createBadgeTemplateId } from "../services/badgeTemplatesApi";
import { uploadBadgeTemplateImage } from "../utils/badgeStorage";

export function BadgeTemplateCreatorModal({ open, onClose, agencyId, onCreate, onToast }) {
  const inputRef = React.useRef(null);
  const [name, setName] = React.useState("قالب الشارة");
  const [description, setDescription] = React.useState("");
  const [widthMm, setWidthMm] = React.useState(DEFAULT_BADGE_SIZE.widthMm);
  const [heightMm, setHeightMm] = React.useState(DEFAULT_BADGE_SIZE.heightMm);
  const [file, setFile] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName("قالب الشارة");
    setDescription("");
    setWidthMm(DEFAULT_BADGE_SIZE.widthMm);
    setHeightMm(DEFAULT_BADGE_SIZE.heightMm);
    setFile(null);
    setBusy(false);
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    if (!isSupabaseEnabled || !agencyId) {
      onToast?.("إنشاء قوالب الشارات يتطلب Supabase Storage", "error");
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
      onToast?.("تعذر إنشاء قالب الشارة", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="قالب جديد" width={560}>
      <div style={{ display: "grid", gap: 14 }}>
        <Input label="اسم القالب" value={name} onChange={(event) => setName(event.target.value)} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="العرض (mm)" type="number" value={widthMm} onChange={(event) => setWidthMm(Number(event.target.value) || DEFAULT_BADGE_SIZE.widthMm)} />
          <Input label="الارتفاع (mm)" type="number" value={heightMm} onChange={(event) => setHeightMm(Number(event.target.value) || DEFAULT_BADGE_SIZE.heightMm)} />
        </div>
        <Input label="وصف اختياري" value={description} onChange={(event) => setDescription(event.target.value)} />
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
            {file ? file.name : "ارفع تصميم الشارة PNG/JPG/WebP"}
          </span>
          <Button variant="secondary" size="sm" icon="upload" onClick={() => inputRef.current?.click()} disabled={busy || !isSupabaseEnabled}>
            رفع تصميم الشارة
          </Button>
        </div>
        {!isSupabaseEnabled && (
          <p style={{ fontSize: 12, color: "var(--rukn-danger)", fontWeight: 700 }}>
            رفع قوالب الشارات يتطلب Supabase Storage.
          </p>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button variant="primary" icon="plus" onClick={handleCreate} disabled={busy || !isSupabaseEnabled}>
            إنشاء القالب
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
