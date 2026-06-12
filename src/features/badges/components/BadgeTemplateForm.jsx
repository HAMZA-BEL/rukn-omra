import React from "react";
import { Button, GlassCard, Input, Select } from "../../../components/UI";
import { useLang } from "../../../hooks/useLang";
import { DEFAULT_BADGE_SIZE } from "../utils/badgeDefaults";

export function BadgeTemplateForm({
  template,
  selectedField,
  onTemplateChange,
  onFieldChange,
  onUpload,
  uploadDisabled,
  busy,
}) {
  const { t } = useLang();
  const alignOptions = [
    { value: "center", label: t.badgeAlignCenter || "Center" },
    { value: "start", label: t.badgeAlignStart || "Start" },
    { value: "end", label: t.badgeAlignEnd || "End" },
  ];
  const directionOptions = [
    { value: "auto", label: t.badgeTextDirectionAuto || "Auto" },
    { value: "rtl", label: t.badgeTextDirectionRtl || "RTL" },
    { value: "ltr", label: t.badgeTextDirectionLtr || "LTR" },
  ];
  const selectedFieldLabel = selectedField
    ? (t[selectedField.labelKey] || selectedField.label || selectedField.key)
    : "";
  return (
    <GlassCard style={{ padding: 14 }}>
      <div style={{ display: "grid", gap: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 900, color: "var(--rukn-text)" }}>{t.badgeTemplateSettings || t.badgeTemplateName || "Template settings"}</p>
        <Input
          label={t.badgeTemplateName || "Template name"}
          value={template.name}
          onChange={(event) => onTemplateChange({ name: event.target.value })}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input
            label={t.badgeWidthMm || "Width (mm)"}
            type="number"
            min={40}
            value={template.widthMm || DEFAULT_BADGE_SIZE.widthMm}
            onChange={(event) => onTemplateChange({ widthMm: Number(event.target.value) || DEFAULT_BADGE_SIZE.widthMm })}
          />
          <Input
            label={t.badgeHeightMm || "Height (mm)"}
            type="number"
            min={40}
            value={template.heightMm || DEFAULT_BADGE_SIZE.heightMm}
            onChange={(event) => onTemplateChange({ heightMm: Number(event.target.value) || DEFAULT_BADGE_SIZE.heightMm })}
          />
        </div>
        <div>
          <Button variant="secondary" size="sm" icon="upload" disabled={uploadDisabled || busy} onClick={onUpload}>
            {t.badgeUploadDesign || "Import design"}
          </Button>
          {uploadDisabled && (
            <p style={{ fontSize: 11, color: "var(--rukn-text-muted)", marginTop: 7 }}>
              {t.badgeStorageRequired || "Creating badge templates requires Supabase Storage."}
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
              {(t.badgeSelectedField || "Selected field")}: {selectedFieldLabel}
            </p>
            {selectedField.type === "text" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Input
                    label={t.badgeFontSize || "Font size"}
                    type="number"
                    min={6}
                    value={selectedField.fontSize || 12}
                    onChange={(event) => onFieldChange(selectedField.key, {
                      fontSize: Number(event.target.value) || 12,
                      autoFitText: false,
                    })}
                  />
                  <Select
                    label={t.badgeAlignment || "Alignment"}
                    value={selectedField.align || "center"}
                    onChange={(event) => onFieldChange(selectedField.key, { align: event.target.value })}
                    options={alignOptions}
                  />
                </div>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  color: "var(--rukn-text)",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                }}>
                  <input
                    type="checkbox"
                    checked={selectedField.autoFitText === true}
                    onChange={(event) => onFieldChange(selectedField.key, { autoFitText: event.target.checked })}
                  />
                  <span>{t.badgeAutoFitText || "Auto fit text"}</span>
                </label>
                <Select
                  label={t.badgeTextDirection || "Text direction"}
                  value={selectedField.textDirection || "auto"}
                  onChange={(event) => onFieldChange(selectedField.key, { textDirection: event.target.value })}
                  options={directionOptions}
                />
              </>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
