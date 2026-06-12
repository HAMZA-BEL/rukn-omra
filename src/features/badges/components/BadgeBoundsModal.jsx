import React from "react";
import { Button, Modal } from "../../../components/UI";
import { useLang } from "../../../hooks/useLang";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value) => Math.round(Number(value) || 0);

const fullCrop = (naturalWidth, naturalHeight) => ({
  x: 0,
  y: 0,
  width: Math.max(1, naturalWidth),
  height: Math.max(1, naturalHeight),
  naturalWidth,
  naturalHeight,
});

const normalizeCrop = (crop, naturalWidth, naturalHeight) => {
  const full = fullCrop(naturalWidth, naturalHeight);
  if (!crop) return full;
  const width = clamp(Number(crop.width) || full.width, 1, full.width);
  const height = clamp(Number(crop.height) || full.height, 1, full.height);
  return {
    x: clamp(Number(crop.x) || 0, 0, Math.max(0, full.width - width)),
    y: clamp(Number(crop.y) || 0, 0, Math.max(0, full.height - height)),
    width,
    height,
    naturalWidth,
    naturalHeight,
  };
};

const handleList = [
  ["nw", "nwse-resize", 0, 0],
  ["n", "ns-resize", 50, 0],
  ["ne", "nesw-resize", 100, 0],
  ["e", "ew-resize", 100, 50],
  ["se", "nwse-resize", 100, 100],
  ["s", "ns-resize", 50, 100],
  ["sw", "nesw-resize", 0, 100],
  ["w", "ew-resize", 0, 50],
];

export function BadgeBoundsModal({
  open,
  imageUrl = "",
  imageName = "",
  naturalWidth = 0,
  naturalHeight = 0,
  initialCrop = null,
  onApply,
  onCancel,
}) {
  const { t } = useLang();
  const imageRef = React.useRef(null);
  const [crop, setCrop] = React.useState(() => normalizeCrop(initialCrop, naturalWidth, naturalHeight));
  const [zoom, setZoom] = React.useState(1);
  const [dragState, setDragState] = React.useState(null);
  const safeNaturalWidth = Math.max(1, Number(naturalWidth) || 1);
  const safeNaturalHeight = Math.max(1, Number(naturalHeight) || 1);
  const baseScale = Math.min(1, 820 / safeNaturalWidth, 520 / safeNaturalHeight);
  const displayWidth = safeNaturalWidth * baseScale * zoom;
  const displayHeight = safeNaturalHeight * baseScale * zoom;

  React.useEffect(() => {
    if (!open) return;
    setCrop(normalizeCrop(initialCrop, safeNaturalWidth, safeNaturalHeight));
    setZoom(1);
    setDragState(null);
  }, [initialCrop, open, safeNaturalHeight, safeNaturalWidth]);

  const pointerToNatural = React.useCallback((event) => {
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect?.height) return null;
    return {
      x: clamp((event.clientX - rect.left) * safeNaturalWidth / rect.width, 0, safeNaturalWidth),
      y: clamp((event.clientY - rect.top) * safeNaturalHeight / rect.height, 0, safeNaturalHeight),
    };
  }, [safeNaturalHeight, safeNaturalWidth]);

  const beginDrag = (event, action) => {
    const point = pointerToNatural(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    setDragState({ action, startPoint: point, startCrop: crop });
  };

  const applyResize = React.useCallback((action, startCrop, dx, dy) => {
    const minSize = Math.max(12, Math.min(safeNaturalWidth, safeNaturalHeight) * 0.035);
    let next = { ...startCrop };

    if (action.includes("e")) next.width = startCrop.width + dx;
    if (action.includes("s")) next.height = startCrop.height + dy;
    if (action.includes("w")) {
      next.x = startCrop.x + dx;
      next.width = startCrop.width - dx;
    }
    if (action.includes("n")) {
      next.y = startCrop.y + dy;
      next.height = startCrop.height - dy;
    }

    if (next.width < minSize) {
      if (action.includes("w")) next.x = startCrop.x + startCrop.width - minSize;
      next.width = minSize;
    }
    if (next.height < minSize) {
      if (action.includes("n")) next.y = startCrop.y + startCrop.height - minSize;
      next.height = minSize;
    }

    if (next.x < 0) {
      next.width += next.x;
      next.x = 0;
    }
    if (next.y < 0) {
      next.height += next.y;
      next.y = 0;
    }
    if (next.x + next.width > safeNaturalWidth) next.width = safeNaturalWidth - next.x;
    if (next.y + next.height > safeNaturalHeight) next.height = safeNaturalHeight - next.y;

    return normalizeCrop(next, safeNaturalWidth, safeNaturalHeight);
  }, [safeNaturalHeight, safeNaturalWidth]);

  React.useEffect(() => {
    if (!dragState) return undefined;
    const handleMove = (event) => {
      const point = pointerToNatural(event);
      if (!point) return;
      event.preventDefault();
      const dx = point.x - dragState.startPoint.x;
      const dy = point.y - dragState.startPoint.y;
      if (dragState.action === "move") {
        setCrop(normalizeCrop({
          ...dragState.startCrop,
          x: dragState.startCrop.x + dx,
          y: dragState.startCrop.y + dy,
        }, safeNaturalWidth, safeNaturalHeight));
        return;
      }
      setCrop(applyResize(dragState.action, dragState.startCrop, dx, dy));
    };
    const endMove = () => setDragState(null);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", endMove);
    window.addEventListener("pointercancel", endMove);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", endMove);
      window.removeEventListener("pointercancel", endMove);
    };
  }, [applyResize, dragState, pointerToNatural, safeNaturalHeight, safeNaturalWidth]);

  const cropStyle = {
    left: `${crop.x / safeNaturalWidth * 100}%`,
    top: `${crop.y / safeNaturalHeight * 100}%`,
    width: `${crop.width / safeNaturalWidth * 100}%`,
    height: `${crop.height / safeNaturalHeight * 100}%`,
  };

  const applyCrop = () => {
    onApply?.({
      x: round(crop.x),
      y: round(crop.y),
      width: Math.max(1, round(crop.width)),
      height: Math.max(1, round(crop.height)),
      naturalWidth: safeNaturalWidth,
      naturalHeight: safeNaturalHeight,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={t.badgeDefineBoundsTitle || "تحديد حدود الشارة"}
      width={980}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 900, color: "var(--rukn-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {imageName || t.badgeUploadDesignFile || "Badge design"}
            </p>
            <p style={{ fontSize: 11, color: "var(--rukn-text-muted)", marginTop: 2 }}>
              {round(crop.width)}×{round(crop.height)} px
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Button variant="ghost" size="sm" onClick={() => setZoom((current) => clamp(current - 0.15, 0.4, 3))}>
              {t.badgeZoomOut || "تصغير"}
            </Button>
            <span style={{ minWidth: 44, textAlign: "center", fontSize: 12, color: "var(--rukn-text-muted)", fontWeight: 800 }}>
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="sm" onClick={() => setZoom((current) => clamp(current + 0.15, 0.4, 3))}>
              {t.badgeZoomIn || "تكبير"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setCrop(normalizeCrop(initialCrop, safeNaturalWidth, safeNaturalHeight))}>
              {t.badgeBoundsReset || "إعادة ضبط"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setCrop(fullCrop(safeNaturalWidth, safeNaturalHeight))}>
              {t.badgeUseFullImage || "استعمال الصورة كاملة"}
            </Button>
          </div>
        </div>

        <div style={{
          minHeight: 320,
          maxHeight: "60vh",
          overflow: "auto",
          borderRadius: 16,
          border: "1px solid var(--rukn-border-soft)",
          background: "var(--rukn-bg-soft)",
          padding: 18,
          display: "grid",
          placeItems: "center",
          overscrollBehavior: "contain",
        }}>
          <div style={{
            position: "relative",
            width: displayWidth,
            height: displayHeight,
            maxWidth: "none",
            touchAction: "none",
          }}>
            <img
              ref={imageRef}
              src={imageUrl}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                display: "block",
                userSelect: "none",
              }}
            />
            <div style={{ position: "absolute", inset: 0, background: "rgba(2,6,23,.46)", pointerEvents: "none" }} />
            <div
              role="presentation"
              onPointerDown={(event) => beginDrag(event, "move")}
              style={{
                position: "absolute",
                ...cropStyle,
                cursor: "move",
                border: "2px solid var(--rukn-gold)",
                boxShadow: "0 0 0 9999px rgba(2,6,23,.22), 0 0 0 1px rgba(255,255,255,.72) inset",
                background: "rgba(255,255,255,.08)",
              }}
            >
              {handleList.map(([name, cursor, left, top]) => (
                <span
                  key={name}
                  role="presentation"
                  onPointerDown={(event) => beginDrag(event, name)}
                  style={{
                    position: "absolute",
                    left: `${left}%`,
                    top: `${top}%`,
                    width: 16,
                    height: 16,
                    borderRadius: 5,
                    border: "2px solid #ffffff",
                    background: "var(--rukn-gold)",
                    boxShadow: "0 2px 10px rgba(0,0,0,.24)",
                    transform: "translate(-50%, -50%)",
                    cursor,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={onCancel}>
            {t.cancel || "إلغاء"}
          </Button>
          <Button variant="primary" onClick={applyCrop}>
            {t.badgeApplyBounds || "اعتمد الحدود"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
