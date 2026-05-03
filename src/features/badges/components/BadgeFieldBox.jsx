import React from "react";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const pointToPct = (event, box) => ({
  xPct: ((event.clientX - box.left) / box.width) * 100,
  yPct: ((event.clientY - box.top) / box.height) * 100,
});

export function BadgeFieldBox({ field, selected, value, label, onSelect, onChange, onRemove }) {
  const interactionRef = React.useRef(null);

  const beginInteraction = (event, mode) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect?.(field.id);
    const box = event.currentTarget.closest("[data-badge-stage]")?.getBoundingClientRect();
    if (!box || !box.width || !box.height) return;
    const point = pointToPct(event, box);
    const start = { ...field };
    interactionRef.current = {
      mode,
      box,
      start,
      grabOffsetXPct: point.xPct - start.xPct,
      grabOffsetYPct: point.yPct - start.yPct,
      previousUserSelect: document.body.style.userSelect,
      frame: null,
      pendingPatch: null,
    };
    document.body.style.userSelect = "none";
    event.currentTarget.setPointerCapture?.(event.pointerId);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", endInteraction, { once: true });
  };

  const handlePointerMove = (event) => {
    const interaction = interactionRef.current;
    if (!interaction) return;
    const point = pointToPct(event, interaction.box);
    let patch;
    if (interaction.mode === "resize") {
      patch = {
        wPct: clamp(point.xPct - interaction.start.xPct, 4, 100 - interaction.start.xPct),
        hPct: clamp(point.yPct - interaction.start.yPct, 4, 100 - interaction.start.yPct),
      };
    } else {
      patch = {
        xPct: clamp(point.xPct - interaction.grabOffsetXPct, 0, 100 - interaction.start.wPct),
        yPct: clamp(point.yPct - interaction.grabOffsetYPct, 0, 100 - interaction.start.hPct),
      };
    }
    interaction.pendingPatch = patch;
    if (interaction.frame) return;
    interaction.frame = window.requestAnimationFrame(() => {
      const current = interactionRef.current;
      if (!current?.pendingPatch) return;
      onChange(field.id, current.pendingPatch);
      current.pendingPatch = null;
      current.frame = null;
    });
  };

  const endInteraction = () => {
    if (interactionRef.current) {
      if (interactionRef.current.frame) {
        window.cancelAnimationFrame(interactionRef.current.frame);
      }
      if (interactionRef.current.pendingPatch) {
        onChange(field.id, interactionRef.current.pendingPatch);
      }
      document.body.style.userSelect = interactionRef.current.previousUserSelect || "";
    }
    interactionRef.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
  };

  React.useEffect(() => () => {
    if (interactionRef.current) {
      if (interactionRef.current.frame) {
        window.cancelAnimationFrame(interactionRef.current.frame);
      }
      document.body.style.userSelect = interactionRef.current.previousUserSelect || "";
    }
    window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return (
    <div
      onPointerDown={(event) => beginInteraction(event, "move")}
      onClick={(event) => { event.stopPropagation(); onSelect?.(field.id); }}
      style={{
        position: "absolute",
        left: `${field.xPct}%`,
        top: `${field.yPct}%`,
        width: `${field.wPct}%`,
        height: `${field.hPct}%`,
        border: selected ? "1.5px solid var(--rukn-gold)" : "1px solid rgba(212,175,55,.42)",
        background: selected
          ? "rgba(212,175,55,.18)"
          : field.type === "image" ? "rgba(15,23,42,.12)" : "rgba(255,255,255,.1)",
        color: "var(--rukn-text-strong)",
        cursor: "move",
        borderRadius: 8,
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: field.align === "start" ? "flex-start" : field.align === "end" ? "flex-end" : "center",
        textAlign: field.align || "center",
        fontSize: `${field.fontSize || 12}px`,
        fontWeight: 800,
        overflow: "hidden",
        padding: 4,
        boxShadow: selected ? "0 8px 24px rgba(0,0,0,.18)" : "none",
        backdropFilter: "blur(2px)",
        zIndex: selected ? 3 : 2,
        touchAction: "none",
      }}
    >
      {selected && (
        <button
          type="button"
          aria-label="Remove field"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove?.(field.id);
          }}
          style={{
            position: "absolute",
            top: -9,
            left: -9,
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: "1px solid rgba(239,68,68,.45)",
            background: "#fff",
            color: "#dc2626",
            fontSize: 13,
            lineHeight: "18px",
            cursor: "pointer",
            zIndex: 4,
            boxShadow: "0 6px 16px rgba(0,0,0,.18)",
          }}
        >
          ×
        </button>
      )}
      {field.type === "image" ? (
        <div style={{
          width: "100%",
          height: "100%",
          borderRadius: 6,
          background: "rgba(255,255,255,.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          color: "var(--rukn-text-muted)",
        }}>
          {label || field.labelAr}
        </div>
      ) : (
        value || label || field.labelAr
      )}
      <span
        onPointerDown={(event) => beginInteraction(event, "resize")}
        style={{
          position: "absolute",
          width: 14,
          height: 14,
          right: -1,
          bottom: -1,
          borderRadius: "8px 0 8px 0",
          background: "var(--rukn-gold)",
          opacity: selected ? 1 : .75,
          cursor: "nwse-resize",
        }}
      />
    </div>
  );
}
