import React from "react";
import { Button, Input, Select } from "../../../components/UI";

const alignOptions = [
  { value: "start", label: "بداية" },
  { value: "center", label: "وسط" },
  { value: "end", label: "نهاية" },
];

const fitOptions = [
  { value: "cover", label: "ملء وقص" },
  { value: "contain", label: "احتواء" },
];

const safeNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export function BadgePropertiesPanel({ field, onChange, onRemove }) {
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
        اختر حقلاً من الشارة لتعديل خصائصه.
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
        <p style={{ fontSize: 12, fontWeight: 900, color: "var(--rukn-text)" }}>الخصائص</p>
        <p style={{ fontSize: 11, color: "var(--rukn-gold)", fontWeight: 800, marginTop: 3 }}>{field.labelAr}</p>
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
              label="حجم الخط"
              type="number"
              min={6}
              value={field.fontSize || 12}
              onChange={(event) => onChange?.(field.id, { fontSize: Number(event.target.value) || 12 })}
            />
            <Input
              label="السماكة"
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
              label="المحاذاة"
              value={field.align || "center"}
              onChange={(event) => onChange?.(field.id, { align: event.target.value })}
              options={alignOptions}
            />
            <Input
              label="اللون"
              type="color"
              value={field.color || "#111111"}
              onChange={(event) => onChange?.(field.id, { color: event.target.value })}
              inputStyle={{ minHeight: 42, padding: 4 }}
            />
          </div>
          <Input
            label="عدد الأسطر"
            type="number"
            min={1}
            max={3}
            value={field.maxLines || 1}
            onChange={(event) => onChange?.(field.id, { maxLines: Number(event.target.value) || 1 })}
          />
        </>
      ) : (
        <Select
          label="ملاءمة الصورة"
          value={field.fit || "cover"}
          onChange={(event) => onChange?.(field.id, { fit: event.target.value })}
          options={fitOptions}
        />
      )}
      <Button variant="danger" size="sm" icon="trash" onClick={() => onRemove?.(field.id)}>
        حذف الحقل
      </Button>
    </div>
  );
}
