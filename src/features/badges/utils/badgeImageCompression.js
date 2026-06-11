import {
  BADGE_PHOTO_MAX_DIMENSION,
  BADGE_PHOTO_QUALITY,
  BADGE_TEMPLATE_MAX_DIMENSION,
  BADGE_TEMPLATE_QUALITY,
} from "./badgeDefaults";

const canvasToBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("Image compression failed"));
  }, type, quality);
});

const alphaSafeTypes = new Set(["image/png", "image/webp"]);

const extensionFromType = (type = "") => {
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
  return "webp";
};

const canvasHasAlpha = (context, width, height) => {
  try {
    const { data } = context.getImageData(0, 0, width, height);
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] < 255) return true;
    }
  } catch {
    return false;
  }
  return false;
};

const loadImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error("Image load failed"));
  };
  image.src = url;
});

export async function compressBadgeImage(file, {
  maxDimension = BADGE_PHOTO_MAX_DIMENSION,
  quality = BADGE_PHOTO_QUALITY,
  preserveOriginal = false,
} = {}) {
  if (!file) throw new Error("Missing image file");
  const image = await loadImage(file);
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  if (preserveOriginal && scale >= 1) return file;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");
  context.drawImage(image, 0, 0, width, height);

  const sourceType = file.type || "image/webp";
  const hasAlpha = alphaSafeTypes.has(sourceType) && canvasHasAlpha(context, width, height);
  if (hasAlpha && scale >= 1) return file;

  const preferredType = hasAlpha
    ? sourceType === "image/png" ? "image/png" : "image/webp"
    : preserveOriginal
    ? file.type === "image/png"
      ? "image/png"
      : file.type === "image/jpeg"
        ? "image/jpeg"
        : "image/webp"
    : "image/webp";
  try {
    const type = preferredType;
    const blob = await canvasToBlob(canvas, type, quality);
    const extension = extensionFromType(type);
    return new File([blob], `photo.${extension}`, { type, lastModified: Date.now() });
  } catch {
    if (hasAlpha) {
      const type = "image/png";
      const blob = await canvasToBlob(canvas, type, quality);
      return new File([blob], "photo.png", { type, lastModified: Date.now() });
    }
    const type = "image/jpeg";
    const blob = await canvasToBlob(canvas, type, quality);
    return new File([blob], "photo.jpg", { type, lastModified: Date.now() });
  }
}

export const compressBadgeTemplateImage = (file) => (
  compressBadgeImage(file, {
    maxDimension: BADGE_TEMPLATE_MAX_DIMENSION,
    quality: BADGE_TEMPLATE_QUALITY,
    preserveOriginal: true,
  })
);

export const getBadgeImageDimensions = async (file) => {
  const image = await loadImage(file);
  return {
    width: image.naturalWidth || image.width || 0,
    height: image.naturalHeight || image.height || 0,
  };
};
