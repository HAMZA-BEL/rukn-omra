const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
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
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
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

function buildAuthClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase public auth configuration for extension login");
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function buildAdminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase server configuration for extension login");
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function cleanEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
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

function sessionExpiresAt(session = {}) {
  if (session.expires_at) {
    return new Date(Number(session.expires_at) * 1000).toISOString();
  }
  if (session.expires_in) {
    return new Date(Date.now() + Number(session.expires_in) * 1000).toISOString();
  }
  return null;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: corsHeaders(event), body: "" };
    }

    if (event.httpMethod !== "POST") {
      return json(event, 405, { error: "Method Not Allowed" });
    }

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return json(event, 400, { error: "Invalid JSON" });
    }

    const email = cleanEmail(payload.email);
    const password = typeof payload.password === "string" ? payload.password : "";

    if (!email || !password) {
      return json(event, 400, { error: "Email and password are required" });
    }

    const authClient = buildAuthClient();
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData?.session?.access_token || !authData?.user?.id) {
      return json(event, 401, { error: "Invalid email or password" });
    }

    const adminClient = buildAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from("users")
      .select("id, agency_id, email, role, status")
      .eq("id", authData.user.id)
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

    return json(event, 200, {
      session: {
        accessToken: authData.session.access_token,
        expiresAt: sessionExpiresAt(authData.session),
      },
      user: {
        id: authData.user.id,
        email: authData.user.email || profile.email || email,
      },
      profile: {
        userId: profile.id,
        agencyId: profile.agency_id,
        role: profile.role,
      },
      agency: {
        id: agency.id,
        name: agencyName(agency),
      },
    });
  } catch (err) {
    console.error("extension-auth-login error", {
      message: err?.message || "Unknown error",
    });
    return json(event, 500, { error: "Internal Server Error" });
  }
};
