const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NUSUK_UPLOAD_FEATURE_KEY = "nusuk_upload";
const CONFIGURED_ALLOWED_ORIGINS = (
  process.env.RUKN_EXTENSION_ALLOWED_ORIGINS ||
  process.env.EXTENSION_ALLOWED_ORIGINS ||
  ""
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isDevContext() {
  return process.env.NETLIFY_DEV === "true"
    || process.env.CONTEXT === "dev"
    || process.env.NODE_ENV === "development";
}

function isAllowedOrigin(origin = "") {
  if (!origin) return false;
  if (CONFIGURED_ALLOWED_ORIGINS.includes(origin)) return true;
  return isDevContext() && origin.startsWith("chrome-extension://");
}

function corsHeaders(event) {
  const origin = event.headers.origin || event.headers.Origin || "";
  const headers = {
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };

  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
    headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
    headers["Access-Control-Max-Age"] = "600";
  }

  return headers;
}

function json(event, statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders(event),
    body: JSON.stringify(body),
  };
}

function buildAdminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase server configuration for extension programs");
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function bearerToken(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function isOptionalColumnError(error = {}) {
  const text = [error.code, error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ");
  return String(error.code || "") === "42703"
    || String(error.code || "") === "PGRST204"
    || /column .*status.* not found|could not find .*status.* column/i.test(text);
}

async function fetchAgency(adminClient, agencyId) {
  const withStatus = await adminClient
    .from("agencies")
    .select("id, name_ar, name_fr, status")
    .eq("id", agencyId)
    .single();

  if (!withStatus.error || !isOptionalColumnError(withStatus.error)) return withStatus;

  return adminClient
    .from("agencies")
    .select("id, name_ar, name_fr")
    .eq("id", agencyId)
    .single();
}

function agencyName(agency = {}) {
  return agency.name_fr || agency.name_ar || "";
}

async function fetchAgencyFeatureEnabled(adminClient, agencyId, featureKey) {
  const { data, error } = await adminClient
    .from("agency_features")
    .select("enabled")
    .eq("agency_id", agencyId)
    .eq("feature_key", featureKey)
    .maybeSingle();
  if (error) return { enabled: false, error };
  return { enabled: Boolean(data?.enabled), error: null };
}

function toExtensionProgram(row = {}) {
  return {
    programId: row.id,
    agencyId: row.agency_id,
    name: row.name || row.name_fr || "",
    type: row.type || "",
    startDate: row.departure || null,
    endDate: row.return_date || null,
    status: row.status || "active",
  };
}

function isProgramAvailableForNusuk(row = {}, agencyId = "") {
  const status = String(row.status || "active").toLowerCase();
  return row.nusuk_upload_enabled === true
    && row.agency_id === agencyId
    && row.deleted !== true
    && !row.deleted_at
    && status !== "archived";
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: corsHeaders(event), body: "" };
    }

    if (event.httpMethod !== "GET") {
      return json(event, 405, { error: "Method Not Allowed" });
    }

    const accessToken = bearerToken(event);
    if (!accessToken) {
      return json(event, 401, { error: "Missing Authorization bearer token" });
    }

    const adminClient = buildAdminClient();
    const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);
    if (userError || !userData?.user?.id) {
      return json(event, 401, { error: "Invalid or expired access token" });
    }

    const { data: profile, error: profileError } = await adminClient
      .from("users")
      .select("id, agency_id, role, status")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile) {
      return json(event, 403, { error: "Authenticated user profile is missing" });
    }

    if (!profile.agency_id) {
      return json(event, 403, { error: "Authenticated user profile is not linked to an agency" });
    }

    const profileStatus = String(profile.status || "active").toLowerCase();
    if (profileStatus !== "active") {
      return json(event, 403, { error: "User account is inactive or disabled" });
    }

    const { data: agency, error: agencyError } = await fetchAgency(adminClient, profile.agency_id);
    if (agencyError || !agency) {
      return json(event, 403, { error: "Authenticated user agency was not found" });
    }

    const agencyStatus = String(agency.status || "active").toLowerCase();
    if (agencyStatus !== "active") {
      return json(event, 403, { error: "Agency is inactive or disabled" });
    }

    const feature = await fetchAgencyFeatureEnabled(adminClient, profile.agency_id, NUSUK_UPLOAD_FEATURE_KEY);
    if (feature.error) {
      return json(event, 500, { error: "Unable to verify Nusuk upload availability" });
    }
    if (!feature.enabled) {
      return json(event, 403, { error: "Nusuk upload is not enabled for this agency" });
    }

    const { data: programs, error: programsError } = await adminClient
      .from("programs")
      .select("id, agency_id, name, name_fr, type, departure, return_date, status, nusuk_upload_enabled, deleted, deleted_at")
      .eq("agency_id", profile.agency_id)
      .eq("nusuk_upload_enabled", true)
      .or("deleted.is.null,deleted.eq.false")
      .is("deleted_at", null)
      .or("status.is.null,status.neq.archived")
      .order("created_at", { ascending: true });

    if (programsError) {
      return json(event, 500, { error: "Unable to load programs" });
    }

    return json(event, 200, {
      agency: {
        id: agency.id,
        name: agencyName(agency),
      },
      programs: Array.isArray(programs)
        ? programs.filter((program) => isProgramAvailableForNusuk(program, profile.agency_id)).map(toExtensionProgram)
        : [],
    });
  } catch (err) {
    console.error("extension-programs error", {
      message: err?.message || "Unknown error",
    });
    return json(event, 500, { error: "Internal Server Error" });
  }
};
