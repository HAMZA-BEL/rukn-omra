const { createClient } = require("@supabase/supabase-js");
const { resolveNusukUploadFeatureGate } = require("./_nusuk-feature-gate");
const { buildNusukClientBatch } = require("./_extension-program-clients-contract");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
    throw new Error("Missing Supabase server configuration for extension program clients");
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
    .select("id, status")
    .eq("id", agencyId)
    .single();

  if (!withStatus.error || !isOptionalColumnError(withStatus.error)) return withStatus;

  return adminClient
    .from("agencies")
    .select("id")
    .eq("id", agencyId)
    .single();
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isProgramAvailableForNusuk(row = {}, agencyId = "") {
  const status = String(row.status || "active").toLowerCase();
  return row.nusuk_upload_enabled === true
    && row.agency_id === agencyId
    && row.deleted !== true
    && !row.deleted_at
    && status !== "archived";
}

function isHajjProgram(row = {}) {
  const value = String(row.type || row.program_type || "").trim().toLowerCase();
  return value === "hajj" || value === "hadj" || value === "حج" || value === "الحج";
}

function parseSelectedClientIds(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value)
    .split(",")
    .map((clientId) => clientId.trim())
    .filter(Boolean);
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

    const programId = cleanString(event.queryStringParameters?.programId);
    if (!programId) {
      return json(event, 400, { error: "Missing programId" });
    }
    const selectedClientIds = parseSelectedClientIds(event.queryStringParameters?.clientIds);
    if (selectedClientIds && selectedClientIds.length > 500) {
      return json(event, 400, { error: "Too many clientIds" });
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

    const featureGate = await resolveNusukUploadFeatureGate({
      adminClient,
      agencyId: profile.agency_id,
    });
    if (featureGate.error) {
      return json(event, 500, { error: "Unable to verify Nusuk upload availability" });
    }
    if (!featureGate.allowed) {
      return json(event, 403, { error: "Nusuk upload is not enabled for this agency" });
    }

    const { data: program, error: programError } = await adminClient
      .from("programs")
      .select("id, agency_id, type, status, nusuk_upload_enabled, deleted, deleted_at")
      .eq("id", programId)
      .eq("agency_id", profile.agency_id)
      .maybeSingle();

    if (programError) {
      return json(event, 500, { error: "Unable to verify program availability" });
    }

    if (!program) {
      return json(event, 404, { error: "Program was not found" });
    }

    if (!isProgramAvailableForNusuk(program, profile.agency_id)) {
      return json(event, 403, { error: "Program is not enabled for Nusuk upload" });
    }

    const { data: clients, error: clientsError } = await adminClient
      .from("clients")
      .select([
        "id",
        "agency_id",
        "program_id",
        "travel_group_id",
        "first_name",
        "last_name",
        "name",
        "represented_by_client_id",
        "represented_by_relationship",
        "passport",
        "archived",
        "archived_at",
        "deleted",
        "deleted_at",
        "created_at",
      ].join(", "))
      .eq("agency_id", profile.agency_id)
      .eq("program_id", program.id)
      .or("deleted.is.null,deleted.eq.false")
      .is("deleted_at", null)
      .or("archived.is.null,archived.eq.false")
      .order("created_at", { ascending: true });

    if (clientsError) {
      return json(event, 500, { error: "Unable to load program clients" });
    }

    const batch = buildNusukClientBatch({
      clients,
      agencyId: profile.agency_id,
      programId: program.id,
      selectedClientIds,
      enforceTravelGroup: isHajjProgram(program),
    });

    if (batch.errors.length) {
      return json(event, 422, {
        error: "Nusuk upload preflight failed",
        code: "NUSUK_PREFLIGHT_FAILED",
        payloadVersion: batch.payloadVersion,
        programId: batch.programId,
        agencyId: batch.agencyId,
        validationErrors: batch.errors,
      });
    }

    return json(event, 200, {
      payloadVersion: batch.payloadVersion,
      programId: batch.programId,
      agencyId: batch.agencyId,
      executionOrder: batch.executionOrder,
      clients: batch.clients,
    });
  } catch (err) {
    console.error("extension-program-clients error", {
      message: err?.message || "Unknown error",
    });
    return json(event, 500, { error: "Internal Server Error" });
  }
};
