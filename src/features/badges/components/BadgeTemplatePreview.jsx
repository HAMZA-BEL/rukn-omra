import React from "react";
import { useLang } from "../../../hooks/useLang";
import { BadgeFieldBox } from "./BadgeFieldBox";
import { normalizeBadgeLayout, sampleBadgeData } from "../utils/badgeLayout";
import { getBadgeCanvasPixelSize, toBadgeBackgroundLayerStyles } from "../utils/badgeBackground";

export function BadgeTemplatePreview({
  imageUrl = "",
  widthMm = 90,
  heightMm = 140,
  layout,
  selectedFieldKey,
  onSelectField,
  onFieldChange,
}) {
  const { t } = useLang();
  const normalized = normalizeBadgeLayout(layout);
  const aspect = Number(widthMm || 90) / Number(heightMm || 140);
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
            ? "#ffffff"
            : "linear-gradient(135deg,var(--rukn-bg-soft),var(--rukn-bg-card))",
          boxShadow: "0 18px 42px rgba(0,0,0,.16)",
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
                onLoad={(event) => {
                  const image = event.currentTarget;
                  setBackgroundImageSize({
                    width: image.naturalWidth || image.width || 0,
                    height: image.naturalHeight || image.height || 0,
                  });
                }}
                style={backgroundLayerStyles.imageStyle}
              />
            </div>
          ) : (
            <img
              src={imageUrl}
              alt=""
              aria-hidden="true"
              draggable={false}
              onLoad={(event) => {
                const image = event.currentTarget;
                setBackgroundImageSize({
                  width: image.naturalWidth || image.width || 0,
                  height: image.naturalHeight || image.height || 0,
                });
              }}
              style={fallbackBackgroundImageStyle}
            />
          )
        )}
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
            {t.badgeUploadDesignPrompt || "Import the badge design to start"}
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
        {widthMm}mm × {heightMm}mm · {t.badgePercentHint || "Positions are saved as percentages"}
      </p>
    </div>
  );
}

const fallbackBackgroundImageStyle = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
  pointerEvents: "none",
  userSelect: "none",
};
