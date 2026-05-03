import { supabase, isSupabaseEnabled } from "../../../lib/supabase";
import {
  BADGE_PHOTO_BUCKET,
  BADGE_TEMPLATE_BUCKET,
  buildBadgePhotoPath,
  buildBadgeTemplatePath,
} from "./badgeDefaults";

export const canUseBadgePhotoStorage = () => Boolean(isSupabaseEnabled && supabase);

export async function uploadPilgrimPhoto({ agencyId, clientId, file }) {
  if (!canUseBadgePhotoStorage()) {
    return { data: null, error: new Error("Supabase Storage is unavailable") };
  }
  const extension = file?.type === "image/jpeg" ? "jpg" : "webp";
  const path = buildBadgePhotoPath({ agencyId, clientId, extension });
  if (!path || !file) {
    return { data: null, error: new Error("Missing badge photo upload data") };
  }
  const { error } = await supabase.storage
    .from(BADGE_PHOTO_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || "image/webp",
      upsert: true,
    });
  if (error) return { data: null, error };
  return { data: { path }, error: null };
}

export async function removePilgrimPhoto(path) {
  if (!canUseBadgePhotoStorage() || !path) return { error: null };
  const { error } = await supabase.storage.from(BADGE_PHOTO_BUCKET).remove([path]);
  return { error };
}

export async function getPilgrimPhotoUrl(path) {
  if (!canUseBadgePhotoStorage() || !path) return "";
  const { data, error } = await supabase.storage
    .from(BADGE_PHOTO_BUCKET)
    .createSignedUrl(path, 60 * 30);
  if (error) return "";
  return data?.signedUrl || "";
}

export async function uploadBadgeTemplateImage({ agencyId, templateId, file }) {
  if (!canUseBadgePhotoStorage()) {
    return { data: null, error: new Error("Supabase Storage is unavailable") };
  }
  const extension = file?.type === "image/jpeg" ? "jpg" : "webp";
  const path = buildBadgeTemplatePath({ agencyId, templateId, extension });
  if (!path || !file) {
    return { data: null, error: new Error("Missing badge template upload data") };
  }
  const { error } = await supabase.storage
    .from(BADGE_TEMPLATE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || "image/webp",
      upsert: true,
    });
  if (error) return { data: null, error };
  return { data: { path }, error: null };
}

export async function getBadgeTemplateImageUrl(path) {
  if (!canUseBadgePhotoStorage() || !path) return "";
  const { data, error } = await supabase.storage
    .from(BADGE_TEMPLATE_BUCKET)
    .createSignedUrl(path, 60 * 30);
  if (error) return "";
  return data?.signedUrl || "";
}

export async function removeBadgeTemplateImage(path) {
  if (!canUseBadgePhotoStorage() || !path) return { error: null };
  const { error } = await supabase.storage.from(BADGE_TEMPLATE_BUCKET).remove([path]);
  return { error };
}
