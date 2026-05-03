import React from "react";
import { Button, Input, Select } from "../../../components/UI";
import { useLang } from "../../../hooks/useLang";

const safeNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export function BadgePropertiesPanel({ field, onChange, onRemove }) {
  const { t } = useLang();
  const alignOptions = [
    { value: "start", label: t.badgeAlignStart || "بداية" },
    { value: "center", label: t.badgeAlignCenter || "وسط" },
    { value: "end", label: t.badgeAlignEnd || "نهاية" },
  ];
  const fitOptions = [
    { value: "cover", label: t.badgeFitCover || "ملء وقص" },
    { value: "contain", label: t.badgeFitContain || "احتواء" },
  ];

  if (!field) {
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
              onChange={(event) => onChange?.(field.id, { fontSize: Number(event.target.value) || 12 })}
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
          <Input
            label={t.badgeMaxLines || "عدد الأسطر"}
            type="number"
            min={1}
            max={3}
            value={field.maxLines || 1}
            onChange={(event) => onChange?.(field.id, { maxLines: Number(event.target.value) || 1 })}
          />
        </>
      ) : (
        <Select
          label={t.badgeImageFit || "ملاءمة الصورة"}
          value={field.fit || "cover"}
          onChange={(event) => onChange?.(field.id, { fit: event.target.value })}
          options={fitOptions}
        />
      )}
      <Button variant="danger" size="sm" icon="trash" onClick={() => onRemove?.(field.id)}>
        {t.badgeRemoveField || "حذف الحقل"}
      </Button>
    </div>
  );
}
