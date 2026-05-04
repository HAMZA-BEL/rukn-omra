import { supabase, isSupabaseEnabled } from "../lib/supabase";

export const AGENCY_ASSETS_BUCKET = "agency-assets";
export const AGENCY_LOGO_MAX_SIZE = 5 * 1024 * 1024;
export const AGENCY_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

const extensionFromFile = (file) => {
  if (file?.type === "image/png") return "png";
  if (file?.type === "image/webp") return "webp";
  return "jpg";
};

export const canUseAgencyLogoStorage = () => Boolean(isSupabaseEnabled && supabase);

export const validateAgencyLogoFile = (file) => {
  if (!file) return { valid: false, reason: "missing" };
  if (!AGENCY_LOGO_TYPES.includes(file.type)) return { valid: false, reason: "type" };
  if (file.size > AGENCY_LOGO_MAX_SIZE) return { valid: false, reason: "size" };
  return { valid: true, reason: "" };
};

export const buildAgencyLogoPath = ({ agencyId, file } = {}) => {
  const safeAgencyId = String(agencyId || "").trim();
  if (!safeAgencyId) return "";
  const extension = extensionFromFile(file);
  return `agencies/${safeAgencyId}/logos/logo-${Date.now()}.${extension}`;
};

export async function uploadAgencyLogo({ agencyId, file, previousPath } = {}) {
  if (!canUseAgencyLogoStorage()) {
    return { data: null, error: new Error("Supabase Storage is unavailable") };
  }
  const validation = validateAgencyLogoFile(file);
  if (!validation.valid) {
    return { data: null, error: new Error(`invalid-logo-${validation.reason}`) };
  }
  const path = buildAgencyLogoPath({ agencyId, file });
  if (!path) return { data: null, error: new Error("Missing agency logo path") };

  const { error } = await supabase.storage
    .from(AGENCY_ASSETS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || "image/png",
      upsert: false,
    });
  if (error) return { data: null, error };

  if (previousPath && previousPath !== path) {
    await supabase.storage.from(AGENCY_ASSETS_BUCKET).remove([previousPath]);
  }

  return { data: { path }, error: null };
}

export async function removeAgencyLogo(path) {
  if (!canUseAgencyLogoStorage() || !path) return { error: null };
  const { error } = await supabase.storage.from(AGENCY_ASSETS_BUCKET).remove([path]);
  return { error };
}

export async function getAgencyLogoUrl(path) {
  if (!canUseAgencyLogoStorage() || !path) return "";
  const { data, error } = await supabase.storage
    .from(AGENCY_ASSETS_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24);
  if (error) return "";
  return data?.signedUrl || "";
}
