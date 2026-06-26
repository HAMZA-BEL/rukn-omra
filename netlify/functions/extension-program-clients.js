const { createClient } = require("@supabase/supabase-js");

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

function toExtensionClient(row = {}) {
  const arabicFirstName = cleanString(row.first_name);
  const arabicLastName = cleanString(row.last_name);
  const fallbackFullName = [arabicFirstName, arabicLastName].filter(Boolean).join(" ").trim();
  return {
    clientId: row.id,
    passportNumber: cleanString(row.passport_number),
    arabicFirstName,
    arabicLastName,
    arabicFullName: cleanString(row.name) || fallbackFullName,
  };
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

    const { data: program, error: programError } = await adminClient
      .from("programs")
      .select("id, agency_id, status, nusuk_upload_enabled, deleted, deleted_at")
      .eq("id", programId)
      .eq("agency_id", profile.agency_id)
      .eq("nusuk_upload_enabled", true)
      .or("deleted.is.null,deleted.eq.false")
      .is("deleted_at", null)
      .maybeSingle();

    if (programError) {
      return json(event, 500, { error: "Unable to verify program availability" });
    }

    if (!program || !isProgramAvailableForNusuk(program, profile.agency_id)) {
      return json(event, 404, { error: "Program is not available for Nusuk upload" });
    }

    const { data: clients, error: clientsError } = await adminClient
      .from("clients")
      .select("id, first_name, last_name, name, passport_number:passport->>number")
      .eq("agency_id", profile.agency_id)
      .eq("program_id", program.id)
      .or("deleted.is.null,deleted.eq.false")
      .is("deleted_at", null)
      .or("archived.is.null,archived.eq.false")
      .order("created_at", { ascending: true });

    if (clientsError) {
      return json(event, 500, { error: "Unable to load program clients" });
    }

    return json(event, 200, {
      programId: program.id,
      agencyId: profile.agency_id,
      clients: Array.isArray(clients) ? clients.map(toExtensionClient) : [],
    });
  } catch (err) {
    console.error("extension-program-clients error", {
      message: err?.message || "Unknown error",
    });
    return json(event, 500, { error: "Internal Server Error" });
  }
};
