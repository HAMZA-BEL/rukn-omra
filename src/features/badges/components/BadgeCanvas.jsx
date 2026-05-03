import React from "react";
import { BadgeFieldBox } from "./BadgeFieldBox";
import { normalizeBadgeLayout, sampleBadgeData } from "../utils/badgeLayout";

export function BadgeCanvas({
  imageUrl = "",
  widthMm = 90,
  heightMm = 140,
  layout,
  selectedFieldId,
  onSelectField,
  onFieldChange,
}) {
  const normalized = React.useMemo(() => normalizeBadgeLayout(layout), [layout]);
  const aspect = Number(widthMm || 90) / Number(heightMm || 140);

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: 520 }}>
      <div style={{
        width: "min(430px, 100%)",
        padding: 14,
        borderRadius: 20,
        background: "var(--rukn-bg-card)",
        border: "1px solid var(--rukn-border-soft)",
        boxShadow: "0 18px 50px rgba(0,0,0,.16)",
      }}>
        <div
          data-badge-stage
          onPointerDown={() => onSelectField?.("")}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: `${aspect}`,
            minHeight: 380,
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid rgba(212,175,55,.24)",
            background: imageUrl
              ? `center / cover no-repeat url("${imageUrl}")`
              : "linear-gradient(135deg,var(--rukn-bg-soft),var(--rukn-bg-card))",
          }}
        >
          {!imageUrl && (
            <div style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              padding: 24,
              textAlign: "center",
              color: "var(--rukn-text-muted)",
              fontSize: 13,
              fontWeight: 800,
              lineHeight: 1.7,
            }}>
              ارفع تصميم الشارة للبدء
            </div>
          )}
          {normalized.fields.filter((field) => field.visible !== false).map((field) => (
            <BadgeFieldBox
              key={field.id}
              field={field}
              selected={selectedFieldId === field.id}
              value={sampleBadgeData[field.key]}
              onSelect={onSelectField}
              onChange={onFieldChange}
            />
          ))}
        </div>
        <p style={{ fontSize: 11, color: "var(--rukn-text-muted)", marginTop: 10, textAlign: "center" }}>
          {widthMm}mm × {heightMm}mm · تحفظ المواضع كنسب مئوية
        </p>
      </div>
    </div>
  );
}
