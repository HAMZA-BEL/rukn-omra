import { BADGE_TEMPLATE_PRINT_DPI, DEFAULT_BADGE_SIZE } from "./badgeDefaults";

export const BADGE_BACKGROUND_FIT_MODES = ["contain", "cover", "stretch", "original"];
export const DEFAULT_BADGE_BACKGROUND_FIT_MODE = "contain";

const numberOr = (value, fallback) => {
  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(/\s+/g, "").replace(/٫/g, ".").replace(/,/g, "."));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const positiveOr = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

const roundPixel = (value) => Math.round(value * 1000) / 1000;
const roundScale = (value) => Math.round(value * 1000000) / 1000000;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const getBadgeCanvasPixelSize = (widthMm, heightMm) => {
  const scale = BADGE_TEMPLATE_PRINT_DPI / 25.4;
  return {
    width: Math.max(1, Math.round(positiveOr(widthMm, DEFAULT_BADGE_SIZE.widthMm) * scale)),
    height: Math.max(1, Math.round(positiveOr(heightMm, DEFAULT_BADGE_SIZE.heightMm) * scale)),
  };
};

export const normalizeBadgeBackgroundTransform = (background = {}) => {
  const fitMode = BADGE_BACKGROUND_FIT_MODES.includes(background?.fitMode)
    ? background.fitMode
    : DEFAULT_BADGE_BACKGROUND_FIT_MODE;

  return {
    x: numberOr(background?.x, 0),
    y: numberOr(background?.y, 0),
    scaleX: positiveOr(background?.scaleX, 1),
    scaleY: positiveOr(background?.scaleY, 1),
    rotation: numberOr(background?.rotation, 0),
    fitMode,
    naturalWidth: positiveOr(background?.naturalWidth ?? background?.imageNaturalWidth, 0),
    naturalHeight: positiveOr(background?.naturalHeight ?? background?.imageNaturalHeight, 0),
    cropX: numberOr(background?.cropX, 0),
    cropY: numberOr(background?.cropY, 0),
    cropWidth: positiveOr(background?.cropWidth, 0),
    cropHeight: positiveOr(background?.cropHeight, 0),
  };
};

export const hasStoredBadgeBackgroundTransform = (background = {}) => (
  Boolean(background && typeof background === "object")
  && positiveOr(background.naturalWidth ?? background.imageNaturalWidth, 0) > 0
  && positiveOr(background.naturalHeight ?? background.imageNaturalHeight, 0) > 0
  && ["x", "y", "scaleX", "scaleY", "rotation"].some((key) => background[key] !== undefined)
);

export const getBadgeBackgroundSourceRect = (background = {}, imageNaturalWidth = 0, imageNaturalHeight = 0) => {
  const normalized = normalizeBadgeBackgroundTransform(background);
  const naturalWidth = positiveOr(normalized.naturalWidth, positiveOr(imageNaturalWidth, 1));
  const naturalHeight = positiveOr(normalized.naturalHeight, positiveOr(imageNaturalHeight, 1));
  const cropWidth = positiveOr(normalized.cropWidth, naturalWidth);
  const cropHeight = positiveOr(normalized.cropHeight, naturalHeight);
  const width = clamp(cropWidth, 1, naturalWidth);
  const height = clamp(cropHeight, 1, naturalHeight);
  const x = clamp(normalized.cropX, 0, Math.max(0, naturalWidth - width));
  const y = clamp(normalized.cropY, 0, Math.max(0, naturalHeight - height));

  return {
    cropX: roundPixel(x),
    cropY: roundPixel(y),
    cropWidth: roundPixel(width),
    cropHeight: roundPixel(height),
    naturalWidth,
    naturalHeight,
  };
};

export const calculateBadgeBackgroundFit = ({
  canvasWidth,
  canvasHeight,
  imageNaturalWidth,
  imageNaturalHeight,
  cropX = 0,
  cropY = 0,
  cropWidth,
  cropHeight,
  fitMode = DEFAULT_BADGE_BACKGROUND_FIT_MODE,
  rotation = 0,
} = {}) => {
  const safeCanvasWidth = positiveOr(canvasWidth, 1);
  const safeCanvasHeight = positiveOr(canvasHeight, 1);
  const safeImageWidth = positiveOr(imageNaturalWidth, 1);
  const safeImageHeight = positiveOr(imageNaturalHeight, 1);
  const source = getBadgeBackgroundSourceRect({
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    naturalWidth: safeImageWidth,
    naturalHeight: safeImageHeight,
  }, safeImageWidth, safeImageHeight);
  const safeFitMode = BADGE_BACKGROUND_FIT_MODES.includes(fitMode)
    ? fitMode
    : DEFAULT_BADGE_BACKGROUND_FIT_MODE;

  if (safeFitMode === "stretch") {
    return {
      x: 0,
      y: 0,
      scaleX: roundScale(safeCanvasWidth / source.cropWidth),
      scaleY: roundScale(safeCanvasHeight / source.cropHeight),
      rotation: numberOr(rotation, 0),
      fitMode: safeFitMode,
      naturalWidth: safeImageWidth,
      naturalHeight: safeImageHeight,
      cropX: source.cropX,
      cropY: source.cropY,
      cropWidth: source.cropWidth,
      cropHeight: source.cropHeight,
    };
  }

  if (safeFitMode === "original") {
    return {
      x: roundPixel((safeCanvasWidth - source.cropWidth) / 2),
      y: roundPixel((safeCanvasHeight - source.cropHeight) / 2),
      scaleX: 1,
      scaleY: 1,
      rotation: numberOr(rotation, 0),
      fitMode: safeFitMode,
      naturalWidth: safeImageWidth,
      naturalHeight: safeImageHeight,
      cropX: source.cropX,
      cropY: source.cropY,
      cropWidth: source.cropWidth,
      cropHeight: source.cropHeight,
    };
  }

  const scale = safeFitMode === "cover"
    ? Math.max(safeCanvasWidth / source.cropWidth, safeCanvasHeight / source.cropHeight)
    : Math.min(safeCanvasWidth / source.cropWidth, safeCanvasHeight / source.cropHeight);
  const drawnWidth = source.cropWidth * scale;
  const drawnHeight = source.cropHeight * scale;

  return {
    x: roundPixel((safeCanvasWidth - drawnWidth) / 2),
    y: roundPixel((safeCanvasHeight - drawnHeight) / 2),
    scaleX: roundScale(scale),
    scaleY: roundScale(scale),
    rotation: numberOr(rotation, 0),
    fitMode: safeFitMode,
    naturalWidth: safeImageWidth,
    naturalHeight: safeImageHeight,
    cropX: source.cropX,
    cropY: source.cropY,
    cropWidth: source.cropWidth,
    cropHeight: source.cropHeight,
  };
};

export const resolveBadgeBackgroundTransform = ({
  background = {},
  canvasWidth,
  canvasHeight,
  imageNaturalWidth,
  imageNaturalHeight,
} = {}) => {
  const actualWidth = positiveOr(imageNaturalWidth, 0);
  const actualHeight = positiveOr(imageNaturalHeight, 0);
  const normalized = normalizeBadgeBackgroundTransform(background);
  const naturalWidth = positiveOr(normalized.naturalWidth, actualWidth);
  const naturalHeight = positiveOr(normalized.naturalHeight, actualHeight);
  const source = getBadgeBackgroundSourceRect(normalized, naturalWidth, naturalHeight);

  if (!hasStoredBadgeBackgroundTransform(background) && naturalWidth > 0 && naturalHeight > 0) {
    return calculateBadgeBackgroundFit({
      canvasWidth,
      canvasHeight,
      imageNaturalWidth: naturalWidth,
      imageNaturalHeight: naturalHeight,
      cropX: source.cropX,
      cropY: source.cropY,
      cropWidth: source.cropWidth,
      cropHeight: source.cropHeight,
      fitMode: normalized.fitMode,
      rotation: normalized.rotation,
    });
  }

  return {
    ...normalized,
    naturalWidth,
    naturalHeight,
    cropX: source.cropX,
    cropY: source.cropY,
    cropWidth: source.cropWidth,
    cropHeight: source.cropHeight,
  };
};

export const toBadgeBackgroundLayerStyles = ({
  background = {},
  canvasWidth,
  canvasHeight,
  imageNaturalWidth,
  imageNaturalHeight,
} = {}) => {
  const transform = resolveBadgeBackgroundTransform({
    background,
    canvasWidth,
    canvasHeight,
    imageNaturalWidth,
    imageNaturalHeight,
  });
  const naturalWidth = positiveOr(transform.naturalWidth, imageNaturalWidth || 1);
  const naturalHeight = positiveOr(transform.naturalHeight, imageNaturalHeight || 1);
  const source = getBadgeBackgroundSourceRect(transform, naturalWidth, naturalHeight);
  const width = source.cropWidth * transform.scaleX;
  const height = source.cropHeight * transform.scaleY;

  return {
    wrapperStyle: {
      position: "absolute",
      left: `${(transform.x / positiveOr(canvasWidth, 1)) * 100}%`,
      top: `${(transform.y / positiveOr(canvasHeight, 1)) * 100}%`,
      width: `${(width / positiveOr(canvasWidth, 1)) * 100}%`,
      height: `${(height / positiveOr(canvasHeight, 1)) * 100}%`,
      overflow: "hidden",
      transform: `rotate(${numberOr(transform.rotation, 0)}deg)`,
      transformOrigin: "center center",
      pointerEvents: "none",
      userSelect: "none",
    },
    imageStyle: {
      position: "absolute",
      left: `${(-source.cropX / source.cropWidth) * 100}%`,
      top: `${(-source.cropY / source.cropHeight) * 100}%`,
      width: `${(naturalWidth / source.cropWidth) * 100}%`,
      height: `${(naturalHeight / source.cropHeight) * 100}%`,
      maxWidth: "none",
      pointerEvents: "none",
      userSelect: "none",
    },
  };
};

export const drawBadgeBackgroundImage = ({
  ctx,
  image,
  canvasWidth,
  canvasHeight,
  background,
} = {}) => {
  if (!ctx || !image) return;
  const imageNaturalWidth = image.naturalWidth || image.width || 1;
  const imageNaturalHeight = image.naturalHeight || image.height || 1;
  const transform = resolveBadgeBackgroundTransform({
    background,
    canvasWidth,
    canvasHeight,
    imageNaturalWidth,
      imageNaturalHeight,
  });
  const source = getBadgeBackgroundSourceRect(transform, imageNaturalWidth, imageNaturalHeight);
  const drawnWidth = source.cropWidth * transform.scaleX;
  const drawnHeight = source.cropHeight * transform.scaleY;
  const rotation = numberOr(transform.rotation, 0) * Math.PI / 180;

  ctx.save();
  if (rotation) {
    const centerX = transform.x + drawnWidth / 2;
    const centerY = transform.y + drawnHeight / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.drawImage(
      image,
      source.cropX,
      source.cropY,
      source.cropWidth,
      source.cropHeight,
      -drawnWidth / 2,
      -drawnHeight / 2,
      drawnWidth,
      drawnHeight
    );
  } else {
    ctx.drawImage(
      image,
      source.cropX,
      source.cropY,
      source.cropWidth,
      source.cropHeight,
      transform.x,
      transform.y,
      drawnWidth,
      drawnHeight
    );
  }
  ctx.restore();
};

export const toBadgeBackgroundImageStyle = (options = {}) => (
  toBadgeBackgroundLayerStyles(options).wrapperStyle
);
