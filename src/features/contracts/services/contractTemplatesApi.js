import { db } from "../../../lib/db";
import { supabase, isSupabaseEnabled } from "../../../lib/supabase";
import {
  buildContractTemplatePath,
  CONTRACT_DOCX_MIME,
  CONTRACT_TEMPLATE_BUCKET,
  LOCAL_CONTRACT_TEMPLATES_KEY,
} from "../utils/contractTemplateData";

const createTemplateId = () => (
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `contract-template-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
);

const readLocal = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_CONTRACT_TEMPLATES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocal = (templates) => {
  try {
    localStorage.setItem(LOCAL_CONTRACT_TEMPLATES_KEY, JSON.stringify(templates));
  } catch {
    /* Local/demo templates are best-effort; Supabase mode stores files in Storage. */
  }
};

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = () => reject(reader.error || new Error("Unable to read file"));
  reader.readAsDataURL(file);
});

const dataUrlToArrayBuffer = async (dataUrl) => {
  const response = await fetch(dataUrl);
  return response.arrayBuffer();
};

export async function fetchContractTemplates({ agencyId } = {}) {
  if (isSupabaseEnabled && agencyId) return db.contractTemplates.fetchAll(agencyId);
  return { data: readLocal(), error: null };
}

export async function saveContractTemplate({ agencyId, templateType, file } = {}) {
  const type = templateType === "hajj" ? "hajj" : "umrah";
  if (isSupabaseEnabled && agencyId) {
    const path = buildContractTemplatePath({ agencyId, templateType: type });
    const uploadFile = new Blob([file], { type: CONTRACT_DOCX_MIME });
    const { error: uploadError } = await supabase.storage
      .from(CONTRACT_TEMPLATE_BUCKET)
      .upload(path, uploadFile, {
        cacheControl: "3600",
        contentType: CONTRACT_DOCX_MIME,
        upsert: true,
      });
    if (uploadError) {
      console.error("[Contracts] Template upload failed", {
        bucket: CONTRACT_TEMPLATE_BUCKET,
        path,
        templateType: type,
        fileName: file?.name,
        fileType: file?.type,
        forcedContentType: CONTRACT_DOCX_MIME,
        error: uploadError,
      });
      return { data: null, error: uploadError };
    }

    const result = await db.contractTemplates.upsert({
      templateType: type,
      templatePath: path,
      fileName: file.name,
      fileSize: file.size,
    }, agencyId);
    if (result.error) {
      console.error("[Contracts] Template metadata save failed", {
        table: "contract_templates",
        templateType: type,
        path,
        error: result.error,
      });
    }
    return result;
  }

  const dataUrl = await fileToDataUrl(file);
  const now = new Date().toISOString();
  const nextTemplate = {
    id: createTemplateId(),
    templateType: type,
    type,
    templatePath: `local://${type}`,
    fileName: file.name,
    fileSize: file.size,
    dataUrl,
    updatedAt: now,
    createdAt: now,
  };
  const next = [nextTemplate, ...readLocal().filter((item) => item.templateType !== type && item.type !== type)];
  writeLocal(next);
  return { data: nextTemplate, error: null };
}

export async function deleteContractTemplate({ agencyId, template } = {}) {
  const type = template?.templateType || template?.type;
  if (isSupabaseEnabled && agencyId) {
    const { error } = await db.contractTemplates.deleteByType(type, agencyId);
    if (error) return { error };
    const path = template?.templatePath || buildContractTemplatePath({ agencyId, templateType: type });
    if (path) {
      const { error: storageError } = await supabase.storage.from(CONTRACT_TEMPLATE_BUCKET).remove([path]);
      return { error: null, storageError };
    }
    return { error: null };
  }
  const next = readLocal().filter((item) => (item.templateType || item.type) !== type);
  writeLocal(next);
  return { error: null };
}

export async function getContractTemplateArrayBuffer({ template } = {}) {
  if (!template) return { data: null, error: new Error("Missing contract template") };
  if (template.dataUrl || String(template.templatePath || "").startsWith("local://")) {
    if (!template.dataUrl) return { data: null, error: new Error("Missing local contract template data") };
    return { data: await dataUrlToArrayBuffer(template.dataUrl), error: null };
  }
  if (isSupabaseEnabled) {
    const { data, error } = await supabase.storage
      .from(CONTRACT_TEMPLATE_BUCKET)
      .download(template.templatePath);
    if (error) {
      console.error("[Contracts] Template download failed", {
        bucket: CONTRACT_TEMPLATE_BUCKET,
        path: template.templatePath,
        error,
      });
      return { data: null, error };
    }
    return { data: await data.arrayBuffer(), error: null };
  }
  return { data: null, error: new Error("Missing contract template file") };
}
