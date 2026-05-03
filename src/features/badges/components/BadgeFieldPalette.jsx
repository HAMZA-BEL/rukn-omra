import React from "react";
import { BADGE_FIELD_DEFINITIONS } from "../utils/badgeDefaults";

export function BadgeFieldPalette({ fields = [], onAddField }) {
  const placedKeys = new Set(fields.map((field) => field.key));
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div>
        <p style={{ fontSize: 12, fontWeight: 900, color: "var(--rukn-text)" }}>الحقول</p>
        <p style={{ fontSize: 11, color: "var(--rukn-text-muted)", marginTop: 3 }}>
          اختر حقلاً لإضافته إلى الشارة.
        </p>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {BADGE_FIELD_DEFINITIONS.map((field) => {
          const disabled = !field.repeatable && placedKeys.has(field.key);
          return (
            <button
              key={field.key}
              type="button"
              disabled={disabled}
              onClick={() => onAddField?.(field.key)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "10px 11px",
                borderRadius: 12,
                border: "1px solid var(--rukn-border-soft)",
                background: disabled ? "var(--rukn-bg-soft)" : "var(--rukn-bg-card)",
                color: disabled ? "var(--rukn-text-muted)" : "var(--rukn-text)",
                cursor: disabled ? "not-allowed" : "pointer",
                fontFamily: "'Cairo',sans-serif",
                opacity: disabled ? .55 : 1,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800 }}>{field.labelAr}</span>
              <span style={{ fontSize: 11, color: "var(--rukn-gold)" }}>{field.repeatable ? "+" : disabled ? "مضاف" : "+"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
