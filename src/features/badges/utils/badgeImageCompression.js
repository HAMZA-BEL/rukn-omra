import {
  BADGE_PHOTO_MAX_DIMENSION,
  BADGE_PHOTO_QUALITY,
} from "./badgeDefaults";

const canvasToBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("Image compression failed"));
  }, type, quality);
});

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
} = {}) {
  if (!file) throw new Error("Missing image file");
  const image = await loadImage(file);
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");
  context.drawImage(image, 0, 0, width, height);

  try {
    const type = "image/webp";
    const blob = await canvasToBlob(canvas, type, quality);
    return new File([blob], "photo.webp", { type, lastModified: Date.now() });
  } catch {
    const type = "image/jpeg";
    const blob = await canvasToBlob(canvas, type, quality);
    return new File([blob], "photo.jpg", { type, lastModified: Date.now() });
  }
}

export const compressBadgeTemplateImage = (file) => (
  compressBadgeImage(file, { maxDimension: 1800, quality: 0.9 })
);
