import React from "react";
import { Button, Input, Select } from "../../../components/UI";
import { useLang } from "../../../hooks/useLang";
import { normalizeBadgeBackgroundTransform } from "../utils/badgeBackground";

const safeNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export function BadgePropertiesPanel({
  field,
  onChange,
  onRemove,
  hasBackgroundImage = false,
  background,
  onBackgroundChange,
  onBackgroundFitChange,
  onBackgroundReset,
}) {
  const { t } = useLang();
  const alignOptions = [
    { value: "start", label: t.badgeAlignStart || "بداية" },
    { value: "center", label: t.badgeAlignCenter || "وسط" },
    { value: "end", label: t.badgeAlignEnd || "نهاية" },
  ];
  const directionOptions = [
    { value: "auto", label: t.badgeTextDirectionAuto || "تلقائي" },
    { value: "rtl", label: t.badgeTextDirectionRtl || "يمين إلى يسار" },
    { value: "ltr", label: t.badgeTextDirectionLtr || "يسار إلى يمين" },
  ];
  const imageFitOptions = [
    { value: "contain", label: t.badgeFitContain || "احتواء" },
  ];
  const backgroundFitOptions = [
    { value: "contain", label: t.badgeBackgroundFitContain || t.badgeFitContain || "Fit inside / contain" },
    { value: "cover", label: t.badgeBackgroundFitCover || t.badgeFitCover || "Fill / cover" },
    { value: "stretch", label: t.badgeBackgroundFitStretch || t.badgeFitStretch || "Stretch" },
    { value: "original", label: t.badgeBackgroundFitOriginal || "Original size" },
  ];

  if (!field) {
    if (hasBackgroundImage) {
      const normalizedBackground = normalizeBadgeBackgroundTransform(background);
      const backgroundNumberInput = (label, key, { min, max, step = 1 } = {}) => (
        <Input
          label={label}
          type="number"
          min={min}
          max={max}
          step={step}
          value={normalizedBackground[key]}
          onChange={(event) => onBackgroundChange?.({ [key]: safeNumber(event.target.value, normalizedBackground[key]) })}
        />
      );

      return (
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 900, color: "var(--rukn-text)" }}>
              {t.badgeBackgroundImage || "Background image"}
            </p>
            <p style={{ fontSize: 11, color: "var(--rukn-text-muted)", marginTop: 3, lineHeight: 1.6 }}>
              {t.badgeBackgroundImageHint || "Control how the imported badge design fits inside the canvas."}
            </p>
          </div>
          <Select
            label={t.badgeBackgroundFit || "Background fit"}
            value={normalizedBackground.fitMode || "contain"}
            onChange={(event) => onBackgroundFitChange?.(event.target.value)}
            options={backgroundFitOptions}
          />
          <Button variant="secondary" size="sm" icon="restore" onClick={onBackgroundReset}>
            {t.badgeResetFit || "Reset fit"}
          </Button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            {backgroundNumberInput("X px", "x")}
            {backgroundNumberInput("Y px", "y")}
            {backgroundNumberInput("Scale X", "scaleX", { min: 0.001, step: 0.01 })}
            {backgroundNumberInput("Scale Y", "scaleY", { min: 0.001, step: 0.01 })}
          </div>
          {backgroundNumberInput(t.badgeRotation || "Rotation", "rotation", { step: 1 })}
        </div>
      );
    }

    return (
      <div style={{
        border: "1px dashed var(--rukn-border-soft)",
        borderRadius: 14,
        padding: 14,
        color: "var(--rukn-text-muted)",
        fontSize: 12,
        lineHeight: 1.7,
      }}>
        {t.badgeNoFieldSelected || "اختر حقلاً من الشارة لتعديل خصائصه."}
      </div>
    );
  }

  const numberInput = (label, key, min = 0, max = 100) => (
    <Input
      label={label}
      type="number"
      min={min}
      max={max}
      value={field[key]}
      onChange={(event) => onChange?.(field.id, { [key]: safeNumber(event.target.value, field[key]) })}
    />
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <p style={{ fontSize: 12, fontWeight: 900, color: "var(--rukn-text)" }}>{t.badgeFieldProperties || "خصائص الحقل"}</p>
        <p style={{ fontSize: 11, color: "var(--rukn-gold)", fontWeight: 800, marginTop: 3 }}>{t[field.labelKey] || field.labelAr}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {numberInput("X %", "xPct")}
        {numberInput("Y %", "yPct")}
        {numberInput("W %", "wPct", 3)}
        {numberInput("H %", "hPct", 3)}
      </div>
      {field.type === "text" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            <Input
              label={t.badgeFontSize || "حجم الخط"}
              type="number"
              min={6}
              value={field.fontSize || 12}
              onChange={(event) => onChange?.(field.id, {
                fontSize: Number(event.target.value) || 12,
                autoFitText: false,
              })}
            />
            <Input
              label={t.badgeFontWeight || "السماكة"}
              type="number"
              min={300}
              max={900}
              step={100}
              value={field.fontWeight || 700}
              onChange={(event) => onChange?.(field.id, { fontWeight: Number(event.target.value) || 700 })}
            />
          </div>
          <label style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "9px 10px",
            border: "1px solid var(--rukn-border-soft)",
            borderRadius: 10,
            background: "var(--rukn-bg-soft)",
            color: "var(--rukn-text)",
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
          }}>
            <input
              type="checkbox"
              checked={field.autoFitText === true}
              onChange={(event) => onChange?.(field.id, { autoFitText: event.target.checked })}
            />
            <span>{t.badgeAutoFitText || "ضبط تلقائي للنص"}</span>
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            <Select
              label={t.badgeAlignment || "المحاذاة"}
              value={field.align || "center"}
              onChange={(event) => onChange?.(field.id, { align: event.target.value })}
              options={alignOptions}
            />
            <Input
              label={t.badgeTextColor || "اللون"}
              type="color"
              value={field.color || "#111111"}
              onChange={(event) => onChange?.(field.id, { color: event.target.value })}
              inputStyle={{ minHeight: 42, padding: 4 }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            <Input
              label={t.badgeMaxLines || "عدد الأسطر"}
              type="number"
              min={1}
              max={3}
              value={field.maxLines || 1}
              onChange={(event) => onChange?.(field.id, { maxLines: Number(event.target.value) || 1 })}
            />
            <Select
              label={t.badgeTextDirection || "اتجاه النص"}
              value={field.textDirection || "auto"}
              onChange={(event) => onChange?.(field.id, { textDirection: event.target.value })}
              options={directionOptions}
            />
          </div>
        </>
      ) : (
        <Select
          label={t.badgeImageFit || "ملاءمة الصورة"}
          value="contain"
          onChange={(event) => onChange?.(field.id, { fit: event.target.value })}
          options={imageFitOptions}
        />
      )}
      <Button variant="danger" size="sm" icon="trash" onClick={() => onRemove?.(field.id)}>
        {t.badgeRemoveField || "حذف الحقل"}
      </Button>
    </div>
  );
}
