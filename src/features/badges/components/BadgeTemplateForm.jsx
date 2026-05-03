import React from "react";
import { Button, GlassCard, Input, Select } from "../../../components/UI";
import { DEFAULT_BADGE_SIZE } from "../utils/badgeDefaults";

const alignOptions = [
  { value: "center", label: "وسط" },
  { value: "start", label: "بداية" },
  { value: "end", label: "نهاية" },
];

export function BadgeTemplateForm({
  template,
  selectedField,
  onTemplateChange,
  onFieldChange,
  onUpload,
  uploadDisabled,
  busy,
}) {
  return (
    <GlassCard style={{ padding: 14 }}>
      <div style={{ display: "grid", gap: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 900, color: "var(--rukn-text)" }}>إعدادات القالب</p>
        <Input
          label="اسم القالب"
          value={template.name}
          onChange={(event) => onTemplateChange({ name: event.target.value })}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input
            label="العرض (mm)"
            type="number"
            min={40}
            value={template.widthMm || DEFAULT_BADGE_SIZE.widthMm}
            onChange={(event) => onTemplateChange({ widthMm: Number(event.target.value) || DEFAULT_BADGE_SIZE.widthMm })}
          />
          <Input
            label="الارتفاع (mm)"
            type="number"
            min={40}
            value={template.heightMm || DEFAULT_BADGE_SIZE.heightMm}
            onChange={(event) => onTemplateChange({ heightMm: Number(event.target.value) || DEFAULT_BADGE_SIZE.heightMm })}
          />
        </div>
        <div>
          <Button variant="secondary" size="sm" icon="upload" disabled={uploadDisabled || busy} onClick={onUpload}>
            رفع تصميم الشارة
          </Button>
          {uploadDisabled && (
            <p style={{ fontSize: 11, color: "var(--rukn-text-muted)", marginTop: 7 }}>
              رفع الصور يتطلب تفعيل Supabase Storage.
            </p>
          )}
        </div>
        {selectedField && (
          <div style={{
            borderTop: "1px solid var(--rukn-border-soft)",
            paddingTop: 12,
            display: "grid",
            gap: 10,
          }}>
            <p style={{ fontSize: 12, fontWeight: 900, color: "var(--rukn-gold)" }}>
              الحقل المحدد: {selectedField.labelAr}
            </p>
            {selectedField.type === "text" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input
                  label="حجم الخط"
                  type="number"
                  min={6}
                  value={selectedField.fontSize || 12}
                  onChange={(event) => onFieldChange(selectedField.key, { fontSize: Number(event.target.value) || 12 })}
                />
                <Select
                  label="المحاذاة"
                  value={selectedField.align || "center"}
                  onChange={(event) => onFieldChange(selectedField.key, { align: event.target.value })}
                  options={alignOptions}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
