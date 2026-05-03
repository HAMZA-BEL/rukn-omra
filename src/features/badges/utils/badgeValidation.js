import { BADGE_PHOTO_MAX_BYTES } from "./badgeDefaults";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const validateBadgePhotoFile = (file, lang = "ar") => {
  if (!file) return { ok: false, message: "" };
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return {
      ok: false,
      message: lang === "fr"
        ? "Choisissez une image JPG, PNG ou WebP."
        : lang === "en"
          ? "Choose a JPG, PNG, or WebP image."
          : "يرجى اختيار صورة بصيغة JPG أو PNG أو WebP.",
    };
  }
  if (file.size > BADGE_PHOTO_MAX_BYTES) {
    return {
      ok: false,
      message: lang === "fr"
        ? "L'image est trop volumineuse. Choisissez une image plus légère."
        : lang === "en"
          ? "The image is too large. Choose a smaller image."
          : "الصورة كبيرة جداً. يرجى اختيار صورة أصغر.",
    };
  }
  return { ok: true, message: "" };
};

export const badgeStorageUnavailableMessage = (lang = "ar") => (
  lang === "fr"
    ? "Le stockage photo nécessite Supabase Storage."
    : lang === "en"
      ? "Photo storage requires Supabase Storage."
      : "تخزين الصور يتطلب تفعيل Supabase Storage."
);

export const badgePhotoCompressionErrorMessage = (lang = "ar") => (
  lang === "fr"
    ? "Impossible de préparer l'image. Essayez une autre photo."
    : lang === "en"
      ? "Could not prepare the image. Try another photo."
      : "تعذر تجهيز الصورة. جرّب صورة أخرى."
);
