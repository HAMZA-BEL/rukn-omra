import React from "react";
import { BadgeFieldBox } from "./BadgeFieldBox";
import { normalizeBadgeLayout, sampleBadgeData } from "../utils/badgeLayout";

export function BadgeTemplatePreview({
  imageUrl = "",
  widthMm = 90,
  heightMm = 140,
  layout,
  selectedFieldKey,
  onSelectField,
  onFieldChange,
}) {
  const normalized = normalizeBadgeLayout(layout);
  const aspect = Number(widthMm || 90) / Number(heightMm || 140);

  return (
    <div style={{
      width: "100%",
      maxWidth: 430,
      marginInline: "auto",
    }}>
      <div
        data-badge-stage
        onPointerDown={() => onSelectField?.("")}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: `${aspect}`,
          minHeight: 360,
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid rgba(212,175,55,.22)",
          background: imageUrl
            ? `center / cover no-repeat url("${imageUrl}")`
            : "linear-gradient(135deg,var(--rukn-bg-soft),var(--rukn-bg-card))",
          boxShadow: "0 18px 42px rgba(0,0,0,.16)",
        }}
      >
        {!imageUrl && (
          <div style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            color: "var(--rukn-text-muted)",
            fontSize: 13,
            fontWeight: 800,
          }}>
            ارفع تصميم الشارة للبدء
          </div>
        )}
        {normalized.fields.map((field) => (
          <BadgeFieldBox
            key={field.key}
            field={field}
            selected={selectedFieldKey === field.key}
            value={sampleBadgeData[field.key]}
            onSelect={onSelectField}
            onChange={onFieldChange}
          />
        ))}
      </div>
      <p style={{ fontSize: 11, color: "var(--rukn-text-muted)", marginTop: 8, textAlign: "center" }}>
        {widthMm}mm × {heightMm}mm · تحفظ المواضع كنسب مئوية
      </p>
    </div>
  );
}
