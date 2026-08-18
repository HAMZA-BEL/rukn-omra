import { isSupabaseEnabled, supabase } from "../../../lib/supabase";
import { SMART_BADGE_SCHEMA_VERSION, normalizeSmartBadgeConfig } from "../smartBadgeConfig";

const localKey = (agencyId) => `rukn-smart-badge-settings-${agencyId || "local"}`;

export async function loadSmartBadgeSettings(agencyId, fallbackColor) {
  if (!isSupabaseEnabled || !supabase) {
    try {
      return { data: normalizeSmartBadgeConfig(JSON.parse(localStorage.getItem(localKey(agencyId)) || "{}"), fallbackColor), error: null };
    } catch {
      return { data: normalizeSmartBadgeConfig({}, fallbackColor), error: null };
    }
  }
  const { data, error } = await supabase.from("agency_smart_badge_settings")
    .select("schema_version, config").eq("agency_id", agencyId).maybeSingle();
  return { data: normalizeSmartBadgeConfig(data?.config || {}, fallbackColor), error };
}

export async function saveSmartBadgeSettings(agencyId, config, fallbackColor) {
  const normalized = normalizeSmartBadgeConfig(config, fallbackColor);
  if (!isSupabaseEnabled || !supabase) {
    localStorage.setItem(localKey(agencyId), JSON.stringify(normalized));
    return { data: normalized, error: null };
  }
  const { data, error } = await supabase.from("agency_smart_badge_settings").upsert({
    agency_id: agencyId,
    schema_version: SMART_BADGE_SCHEMA_VERSION,
    config: normalized,
  }, { onConflict: "agency_id" }).select("config").single();
  return { data: data ? normalizeSmartBadgeConfig(data.config, fallbackColor) : null, error };
}
