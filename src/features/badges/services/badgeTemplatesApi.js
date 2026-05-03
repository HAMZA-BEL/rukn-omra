import { db } from "../../../lib/db";
import { isSupabaseEnabled } from "../../../lib/supabase";
import { toBadgeTemplatePayload } from "../utils/badgeTemplateMapping";

const LOCAL_KEY = "rukn_badge_templates_local_v1";

const readLocal = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocal = (templates) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(templates));
  } catch {
    /* Ignore local quota errors; template images are never stored here. */
  }
};

export const createBadgeTemplateId = () => (
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `badge-template-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
);

export async function fetchBadgeTemplates({ agencyId } = {}) {
  if (isSupabaseEnabled && agencyId) return db.badgeTemplates.fetchAll(agencyId);
  return { data: readLocal(), error: null };
}

export async function saveBadgeTemplate({ agencyId, template } = {}) {
  const payload = toBadgeTemplatePayload(template);
  if (isSupabaseEnabled && agencyId) return db.badgeTemplates.upsert(payload, agencyId);
  const id = payload.id || createBadgeTemplateId();
  const nextTemplate = { ...payload, id, updatedAt: new Date().toISOString() };
  const templates = readLocal();
  const next = templates.some((item) => item.id === id)
    ? templates.map((item) => item.id === id ? nextTemplate : item)
    : [nextTemplate, ...templates];
  writeLocal(next);
  return { data: nextTemplate, error: null };
}

export async function deleteBadgeTemplate({ agencyId, id } = {}) {
  if (isSupabaseEnabled && agencyId) return db.badgeTemplates.delete(id, agencyId);
  const next = readLocal().filter((item) => item.id !== id);
  writeLocal(next);
  return { error: null };
}

export async function setDefaultBadgeTemplate({ agencyId, id } = {}) {
  if (isSupabaseEnabled && agencyId) return db.badgeTemplates.setDefault(id, agencyId);
  const next = readLocal().map((item) => ({ ...item, isDefault: item.id === id }));
  writeLocal(next);
  return { data: next.find((item) => item.id === id) || null, error: null };
}
