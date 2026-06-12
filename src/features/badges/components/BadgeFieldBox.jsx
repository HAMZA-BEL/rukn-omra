import React from "react";
import {
  BADGE_TEXT_FIT_DEFAULTS,
  fitTextBox,
  getBadgeTextPadding,
  resolveBadgeTextDirection,
} from "../utils/badgeTextFit";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const BADGE_FIELD_FONT_FAMILY = "\"Tajawal\", \"Cairo\", \"Noto Sans Arabic\", Arial, sans-serif";
const pointToPct = (event, box) => ({
  xPct: ((event.clientX - box.left) / box.width) * 100,
  yPct: ((event.clientY - box.top) / box.height) * 100,
});

const alignItemsForField = (align = "center") => {
  if (align === "start") return "flex-start";
  if (align === "end") return "flex-end";
  return "center";
};

export function BadgeFieldBox({ field, selected, value, label, onSelect, onChange, onRemove }) {
  const boxRef = React.useRef(null);
  const interactionRef = React.useRef(null);
  const measureCanvasRef = React.useRef(null);
  const displayValue = String(value || label || field.labelAr || "");
  const [textFit, setTextFit] = React.useState(null);

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

  React.useLayoutEffect(() => {
    if (field.type !== "text") return undefined;
    const element = boxRef.current;
    if (!element) return undefined;
    const measure = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (!width || !height) return;
      const canvas = measureCanvasRef.current || document.createElement("canvas");
      measureCanvasRef.current = canvas;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const padding = getBadgeTextPadding({ width, height });
      const fitted = fitTextBox(ctx, displayValue, { width, height }, {
        autoFit: field.autoFitText === true,
        fontSize: Number(field.fontSize) || 12,
        fontWeight: field.fontWeight || 700,
        fontFamily: BADGE_FIELD_FONT_FAMILY,
        minFontSize: field.autoFitText === true
          ? Number(field.minFontSize || BADGE_TEXT_FIT_DEFAULTS.minFontSize)
          : Math.max(6, Number(field.minFontSize || 7)),
        maxFontSize: Number(field.maxFontSize || BADGE_TEXT_FIT_DEFAULTS.maxFontSize),
        maxLines: Math.max(1, Number(field.maxLines || 1)),
        paddingX: padding.x,
        paddingY: padding.y,
      });
      setTextFit({
        ...fitted,
        direction: resolveBadgeTextDirection(displayValue, field.textDirection || "auto", "rtl"),
      });
    };
    measure();
    let cancelled = false;
    document.fonts?.ready?.then(() => {
      if (!cancelled) measure();
    }).catch(() => {});
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => {
        cancelled = true;
        window.removeEventListener("resize", measure);
      };
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [
    displayValue,
    field.align,
    field.autoFitText,
    field.fontSize,
    field.fontWeight,
    field.maxFontSize,
    field.maxLines,
    field.minFontSize,
    field.textDirection,
    field.type,
  ]);

  return (
    <div
      ref={boxRef}
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
        justifyContent: field.type === "image"
          ? "center"
          : alignItemsForField(field.align),
        textAlign: field.align || "center",
        fontSize: `${textFit?.fontSize || field.fontSize || 12}px`,
        fontWeight: field.fontWeight || 700,
        fontFamily: BADGE_FIELD_FONT_FAMILY,
        overflow: "hidden",
        padding: field.type === "text"
          ? `${textFit?.paddingY ?? 4}px ${textFit?.paddingX ?? 6}px`
          : 4,
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
        <div
          dir={textFit?.direction || resolveBadgeTextDirection(displayValue, field.textDirection || "auto", "rtl")}
          style={{
            width: "100%",
            minWidth: 0,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: alignItemsForField(field.align),
            gap: 0,
            lineHeight: textFit ? `${textFit.lineHeight}px` : 1.18,
            textAlign: field.align || "center",
            unicodeBidi: "plaintext",
            pointerEvents: "none",
          }}
        >
          {(textFit?.lines?.length ? textFit.lines : [displayValue]).map((line, index) => (
            <span
              key={`${line}-${index}`}
              style={{
                display: "block",
                maxWidth: "100%",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "clip",
              }}
            >
              {line}
            </span>
          ))}
        </div>
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
