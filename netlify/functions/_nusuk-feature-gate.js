const NUSUK_UPLOAD_FEATURE_KEY = "nusuk_upload";

async function fetchAgencyFeatureEnabled(adminClient, agencyId, featureKey = NUSUK_UPLOAD_FEATURE_KEY) {
  const { data, error } = await adminClient
    .from("agency_features")
    .select("enabled")
    .eq("agency_id", agencyId)
    .eq("feature_key", featureKey)
    .maybeSingle();
  if (error) return { enabled: false, error };
  return { enabled: Boolean(data?.enabled), error: null };
}

async function resolveNusukUploadFeatureGate({ adminClient, agencyId }) {
  const feature = await fetchAgencyFeatureEnabled(adminClient, agencyId);
  if (feature.error) {
    return {
      allowed: false,
      agencyFeatureEnabled: false,
      error: feature.error,
    };
  }

  const agencyFeatureEnabled = Boolean(feature.enabled);

  return {
    allowed: agencyFeatureEnabled === true,
    agencyFeatureEnabled,
    error: null,
  };
}

module.exports = {
  resolveNusukUploadFeatureGate,
};
