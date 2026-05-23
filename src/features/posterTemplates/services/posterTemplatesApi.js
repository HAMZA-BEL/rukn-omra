import { db } from "../../../lib/db";
import { supabase, isSupabaseEnabled } from "../../../lib/supabase";
import {
  buildPosterTemplatePath,
  LOCAL_POSTER_TEMPLATES_KEY,
  normalizePosterTemplate,
  normalizePosterTemplateLevelsCount,
  normalizePosterTemplateType,
  POSTER_TEMPLATE_BUCKET,
  toPosterTemplatePayload,
} from "../utils/posterTemplateData";

const readLocal = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_POSTER_TEMPLATES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocal = (templates) => {
  try {
    localStorage.setItem(LOCAL_POSTER_TEMPLATES_KEY, JSON.stringify(templates));
  } catch {
    /* Local poster templates are best-effort demo data. */
  }
};

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = () => reject(reader.error || new Error("Unable to read file"));
  reader.readAsDataURL(file);
});

const createFallbackUuid = () => {
  const randomValues = typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function"
    ? crypto.getRandomValues(new Uint8Array(16))
    : Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  randomValues[6] = (randomValues[6] & 0x0f) | 0x40;
  randomValues[8] = (randomValues[8] & 0x3f) | 0x80;
  const hex = Array.from(randomValues, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export const createPosterTemplateId = () => (
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : createFallbackUuid()
);

const logPosterSaveError = (message, details = {}) => {
  if (process.env.NODE_ENV === "production") return;
  console.error(`[Posters] ${message}`, details);
};

export async function fetchPosterTemplates({ agencyId } = {}) {
  if (isSupabaseEnabled && agencyId) return db.programPosterTemplates.fetchAll(agencyId);
  return { data: readLocal().map(normalizePosterTemplate), error: null };
}

export async function savePosterTemplate({ agencyId, template, file } = {}) {
  const payload = toPosterTemplatePayload(template);
  const id = payload.id || createPosterTemplateId();
  const programType = normalizePosterTemplateType(payload.programType);

  if (isSupabaseEnabled && agencyId) {
    let imagePath = payload.imagePath || "";
    const previousPath = payload.imagePath || "";

    if (file) {
      const uploadPath = buildPosterTemplatePath({ agencyId, templateId: id, file });
      if (!uploadPath) return { data: null, error: new Error("Missing poster template upload data") };
      const { error: uploadError } = await supabase.storage
        .from(POSTER_TEMPLATE_BUCKET)
        .upload(uploadPath, file, {
          cacheControl: "3600",
          contentType: file.type || "image/jpeg",
          upsert: true,
        });
      if (uploadError) {
        logPosterSaveError("Storage upload failed", {
          agencyId,
          templateId: id,
          bucket: POSTER_TEMPLATE_BUCKET,
          uploadPath,
          fileName: file?.name,
          fileType: file?.type,
          fileSize: file?.size,
          programType,
          error: uploadError,
        });
        return { data: null, error: uploadError };
      }
      imagePath = uploadPath;
    }

    const result = await db.programPosterTemplates.upsert({
      id,
      name: payload.name,
      programType,
      levelsCount: normalizePosterTemplateLevelsCount(payload.levelsCount),
      imagePath,
      fileName: file?.name || payload.fileName || "",
      fileSize: file?.size || payload.fileSize || 0,
      areas: payload.areas || [],
    }, agencyId);

    if (result.error) {
      logPosterSaveError("Metadata save failed", {
        agencyId,
        templateId: id,
        imagePath,
        name: payload.name,
        programType,
        levelsCount: normalizePosterTemplateLevelsCount(payload.levelsCount),
        areas: payload.areas || [],
        fileName: file?.name || payload.fileName || "",
        fileType: file?.type,
        fileSize: file?.size || payload.fileSize || 0,
        error: result.error,
      });
      if (file && imagePath) {
        await supabase.storage.from(POSTER_TEMPLATE_BUCKET).remove([imagePath]);
      }
      return result;
    }

    if (file && previousPath && previousPath !== imagePath) {
      await supabase.storage.from(POSTER_TEMPLATE_BUCKET).remove([previousPath]);
    }

    return result;
  }

  const now = new Date().toISOString();
  const existing = readLocal();
  const previous = existing.find((item) => item.id === id);
  const nextTemplate = {
    ...payload,
    id,
    programType,
    levelsCount: normalizePosterTemplateLevelsCount(payload.levelsCount),
    imagePath: `local://${id}`,
    fileName: file?.name || payload.fileName || previous?.fileName || "",
    fileSize: file?.size || payload.fileSize || previous?.fileSize || 0,
    dataUrl: file ? await fileToDataUrl(file) : payload.dataUrl || previous?.dataUrl || "",
    areas: payload.areas || previous?.areas || [],
    createdAt: payload.createdAt || previous?.createdAt || now,
    updatedAt: now,
  };
  const next = [nextTemplate, ...existing.filter((item) => item.id !== id)];
  writeLocal(next);
  return { data: nextTemplate, error: null };
}

export async function deletePosterTemplate({ agencyId, template } = {}) {
  const id = template?.id;
  if (isSupabaseEnabled && agencyId) {
    const { error } = await db.programPosterTemplates.delete(id, agencyId);
    if (error) return { error };
    const path = template?.imagePath || template?.image_path || "";
    if (path) {
      const { error: storageError } = await supabase.storage.from(POSTER_TEMPLATE_BUCKET).remove([path]);
      return { error: null, storageError };
    }
    return { error: null };
  }
  writeLocal(readLocal().filter((item) => item.id !== id));
  return { error: null };
}

export async function getPosterTemplateImageUrl(template) {
  const path = template?.imagePath || template?.image_path || "";
  if (template?.dataUrl || String(path).startsWith("local://")) return template?.dataUrl || "";
  if (!isSupabaseEnabled || !path) return "";
  const { data, error } = await supabase.storage
    .from(POSTER_TEMPLATE_BUCKET)
    .createSignedUrl(path, 60 * 30);
  if (error) return "";
  return data?.signedUrl || "";
}
