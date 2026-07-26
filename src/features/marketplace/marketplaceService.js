import { isSupabaseEnabled, supabase } from "../../lib/supabase";

const unavailable = () => ({
  data: null,
  error: new Error("marketplace_backend_unavailable"),
});

const normalizeListing = (row) => row ? ({
  id: row.id || "",
  agencyId: row.agency_id || "",
  programId: row.program_id || "",
  status: row.status || "draft",
  publicSlug: row.public_slug || "",
  publicData: row.public_data || {},
  marketplaceConfig: {
    included_services: Array.isArray(row.marketplace_config?.included_services)
      ? row.marketplace_config.included_services
      : [],
    required_documents: Array.isArray(row.marketplace_config?.required_documents)
      ? row.marketplace_config.required_documents
      : [],
    available_seats: Number.isInteger(row.marketplace_config?.available_seats)
      ? row.marketplace_config.available_seats
      : null,
  },
  createdAt: row.created_at || "",
  updatedAt: row.updated_at || "",
  publishedAt: row.published_at || "",
}) : null;

export async function fetchMarketplaceListings(agencyId) {
  if (!isSupabaseEnabled || !supabase || !agencyId) return unavailable();
  const { data, error } = await supabase
    .from("marketplace_listings")
    .select("id, agency_id, program_id, status, public_slug, public_data, marketplace_config, created_at, updated_at, published_at")
    .eq("agency_id", agencyId)
    .order("updated_at", { ascending: false });
  return {
    data: error ? null : (data || []).map(normalizeListing),
    error,
  };
}

async function runListingRpc(name, programId) {
  if (!isSupabaseEnabled || !supabase || !programId) return unavailable();
  const { data, error } = await supabase.rpc(name, { p_program_id: programId });
  return { data: error ? null : normalizeListing(data), error };
}

export function prepareMarketplaceListing(programId) {
  return runListingRpc("prepare_marketplace_listing", programId);
}

export async function saveMarketplaceListingConfig(programId, marketplaceConfig) {
  if (!isSupabaseEnabled || !supabase || !programId) return unavailable();
  const { data, error } = await supabase.rpc("save_marketplace_listing_config", {
    p_program_id: programId,
    p_marketplace_config: marketplaceConfig,
  });
  return { data: error ? null : normalizeListing(data), error };
}

export function publishMarketplaceListing(programId) {
  return runListingRpc("publish_marketplace_listing", programId);
}

export function hideMarketplaceListing(programId) {
  return runListingRpc("hide_marketplace_listing", programId);
}
