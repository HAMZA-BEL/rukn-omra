import React from "react";
import { BadgeFieldBox } from "./BadgeFieldBox";
import { normalizeBadgeLayout, sampleBadgeData } from "../utils/badgeLayout";
import { getBadgeCanvasPixelSize, toBadgeBackgroundLayerStyles } from "../utils/badgeBackground";
import { useLang } from "../../../hooks/useLang";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const isEditableTarget = (target) => {
  const tag = target?.tagName?.toLowerCase();
  return target?.isContentEditable || ["input", "textarea", "select"].includes(tag);
};

export function BadgeCanvas({
  imageUrl = "",
  widthMm = 90,
  heightMm = 140,
  layout,
  selectedFieldId,
  onSelectField,
  onFieldChange,
  onRemoveField,
  onDropField,
  onBackgroundImageLoad,
  useDefaultDesign = false,
}) {
  const { t } = useLang();
  const normalized = React.useMemo(() => normalizeBadgeLayout(layout), [layout]);
  const aspect = Number(widthMm || 90) / Number(heightMm || 140);
  const viewportRef = React.useRef(null);
  const baseRef = React.useRef(null);
  const stageRef = React.useRef(null);
  const [zoom, setZoom] = React.useState(1);
  const [backgroundImageSize, setBackgroundImageSize] = React.useState(null);
  const canvasSize = React.useMemo(() => getBadgeCanvasPixelSize(widthMm, heightMm), [heightMm, widthMm]);

  React.useEffect(() => {
    setBackgroundImageSize(null);
  }, [imageUrl]);

  const backgroundLayerStyles = React.useMemo(() => {
    if (!imageUrl || !backgroundImageSize?.width || !backgroundImageSize?.height) return null;
    return toBadgeBackgroundLayerStyles({
      background: normalized.background,
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height,
      imageNaturalWidth: backgroundImageSize.width,
      imageNaturalHeight: backgroundImageSize.height,
    });
  }, [backgroundImageSize, canvasSize.height, canvasSize.width, imageUrl, normalized.background]);

  const fitToScreen = React.useCallback(() => {
    const viewport = viewportRef.current;
    const base = baseRef.current;
    if (!viewport || !base) return;
    const availableW = Math.max(240, viewport.clientWidth - 72);
    const availableH = Math.max(280, viewport.clientHeight - 72);
    const next = Math.min(availableW / base.offsetWidth, availableH / base.offsetHeight, 1.2);
    setZoom(clamp(next, 0.35, 2));
    requestAnimationFrame(() => {
      viewport.scrollLeft = Math.max(0, (base.offsetWidth * next - viewport.clientWidth) / 2);
      viewport.scrollTop = Math.max(0, (base.offsetHeight * next - viewport.clientHeight) / 2);
    });
  }, []);

  React.useLayoutEffect(() => {
    fitToScreen();
  }, [fitToScreen, aspect, widthMm, heightMm]);

  React.useEffect(() => {
    const handler = () => fitToScreen();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [fitToScreen]);

  React.useEffect(() => {
    if (typeof ResizeObserver === "undefined" || !viewportRef.current) return undefined;
    const observer = new ResizeObserver(() => fitToScreen());
    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [fitToScreen]);

  const zoomBy = (delta) => setZoom((current) => clamp(Math.round((current + delta) * 100) / 100, 0.35, 2.5));
  const setActualSize = () => setZoom(1);

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (!selectedFieldId || isEditableTarget(event.target)) return;
      const directions = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };
      const direction = directions[event.key];
      if (!direction) return;
      const selected = normalized.fields.find((field) => field.id === selectedFieldId);
      const stageBox = stageRef.current?.getBoundingClientRect();
      if (!selected || !stageBox?.width || !stageBox?.height) return;
      event.preventDefault();
      const stepPx = event.shiftKey ? 10 : 1;
      const deltaXPct = (direction[0] * stepPx / stageBox.width) * 100;
      const deltaYPct = (direction[1] * stepPx / stageBox.height) * 100;
      onFieldChange?.(selected.id, {
        xPct: clamp(selected.xPct + deltaXPct, 0, 100 - selected.wPct),
        yPct: clamp(selected.yPct + deltaYPct, 0, 100 - selected.hPct),
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [normalized.fields, onFieldChange, selectedFieldId]);

  const handleDrop = (event) => {
    const key = event.dataTransfer.getData("application/x-rukn-badge-field") || event.dataTransfer.getData("text/plain");
    if (!key) return;
    event.preventDefault();
    const stage = event.currentTarget.querySelector("[data-badge-stage]");
    const box = stage?.getBoundingClientRect();
    if (!box?.width || !box?.height) return;
    const xPct = ((event.clientX - box.left) / box.width) * 100;
    const yPct = ((event.clientY - box.top) / box.height) * 100;
    onDropField?.(key, { xPct: Math.max(0, xPct - 5), yPct: Math.max(0, yPct - 3) });
  };

  const handleBackgroundLoad = (event) => {
    const image = event.currentTarget;
    const size = {
      width: image.naturalWidth || image.width || 0,
      height: image.naturalHeight || image.height || 0,
    };
    setBackgroundImageSize(size);
    onBackgroundImageLoad?.(size);
  };

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto minmax(0,1fr)", minHeight: 0, height: "100%" }}>
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: 8,
        flexWrap: "wrap",
        padding: "10px 12px",
        borderBottom: "1px solid var(--rukn-border-soft)",
      }}>
        <button type="button" title={t.badgeZoomOut || "تصغير"} aria-label={t.badgeZoomOut || "تصغير"} onClick={() => zoomBy(-0.1)} style={toolButtonStyle}>−</button>
        <button type="button" title={t.badgeFitScreen || "ملاءمة"} aria-label={t.badgeFitScreen || "ملاءمة"} onClick={fitToScreen} style={toolButtonStyle}>⛶</button>
        <button type="button" title="100%" aria-label="100%" onClick={setActualSize} style={toolButtonStyle}>100%</button>
        <button type="button" title={t.badgeZoomIn || "تكبير"} aria-label={t.badgeZoomIn || "تكبير"} onClick={() => zoomBy(0.1)} style={toolButtonStyle}>+</button>
        <span style={{ fontSize: 12, color: "var(--rukn-text-muted)", alignSelf: "center", minWidth: 48, textAlign: "center" }}>
          {Math.round(zoom * 100)}%
        </span>
      </div>
      <div
        ref={viewportRef}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        style={{
          overflow: "auto",
          minHeight: 0,
          padding: 32,
          display: "grid",
          placeItems: "center",
          background: "radial-gradient(circle at center, rgba(212,175,55,.08), transparent 58%)",
        }}
      >
        <div
          ref={baseRef}
          style={{
            width: 460,
            aspectRatio: `${aspect}`,
            minHeight: 560,
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
            transition: "transform .16s ease",
          }}
        >
          <div style={{
            padding: 14,
            borderRadius: 20,
            background: "var(--rukn-bg-card)",
            border: "1px solid var(--rukn-border-soft)",
            boxShadow: "0 18px 50px rgba(0,0,0,.16)",
            height: "100%",
          }}>
            <div
              data-badge-stage
              ref={stageRef}
              onPointerDown={() => onSelectField?.("")}
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid rgba(212,175,55,.24)",
                background: imageUrl
                  ? "#ffffff"
                  : useDefaultDesign
                  ? "linear-gradient(180deg,#f8fafc 0%,#f8fafc 52%,#e8f0fa 52%,#e8f0fa 100%)"
                  : "linear-gradient(135deg,var(--rukn-bg-soft),var(--rukn-bg-card))",
              }}
            >
              {imageUrl && (
                backgroundLayerStyles ? (
                  <div style={backgroundLayerStyles.wrapperStyle}>
                    <img
                      src={imageUrl}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      onLoad={handleBackgroundLoad}
                      style={backgroundLayerStyles.imageStyle}
                    />
                  </div>
                ) : (
                  <img
                    src={imageUrl}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    onLoad={handleBackgroundLoad}
                    style={fallbackBackgroundImageStyle}
                  />
                )
              )}
              {useDefaultDesign && !imageUrl && (
                <>
                  <div style={{
                    position: "absolute",
                    insetInlineStart: "7%",
                    top: "5%",
                    width: "34%",
                    height: "7%",
                    borderRadius: 999,
                    background: "rgba(212,175,55,.2)",
                    border: "1px solid rgba(212,175,55,.32)",
                  }} />
                  <div style={{
                    position: "absolute",
                    insetInlineEnd: "7%",
                    top: "5%",
                    width: "18%",
                    height: "11%",
                    borderRadius: 14,
                    background: "rgba(15,23,42,.08)",
                    border: "1px solid rgba(15,23,42,.12)",
                  }} />
                  <div style={{
                    position: "absolute",
                    left: "8%",
                    right: "8%",
                    bottom: "7%",
                    height: "14%",
                    borderRadius: 18,
                    background: "rgba(255,255,255,.72)",
                    border: "1px solid rgba(15,23,42,.1)",
                  }} />
                </>
              )}
              {!imageUrl && !useDefaultDesign && (
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
                  {t.badgeUploadDesignPrompt || "Import the badge design to start"}
                </div>
              )}
              {normalized.fields.filter((field) => field.visible !== false).map((field) => (
                <BadgeFieldBox
                  key={field.id}
                  field={field}
                  selected={selectedFieldId === field.id}
                  value={sampleBadgeData[field.key]}
                  label={t[field.labelKey] || field.labelAr}
                  onSelect={onSelectField}
                  onChange={onFieldChange}
                  onRemove={onRemoveField}
                />
              ))}
            </div>
          </div>
          <p style={{ fontSize: 11, color: "var(--rukn-text-muted)", marginTop: 10, textAlign: "center" }}>
            {widthMm}mm × {heightMm}mm · {t.badgePercentHint || "Positions are saved as percentages"}
          </p>
        </div>
      </div>
    </div>
  );
}

const toolButtonStyle = {
  minWidth: 34,
  height: 30,
  borderRadius: 9,
  border: "1px solid var(--rukn-border-soft)",
  background: "var(--rukn-bg-card)",
  color: "var(--rukn-text)",
  cursor: "pointer",
  fontFamily: "'Cairo',sans-serif",
  fontSize: 12,
  fontWeight: 800,
};

const fallbackBackgroundImageStyle = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
  pointerEvents: "none",
  userSelect: "none",
};
