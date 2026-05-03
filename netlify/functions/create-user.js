const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = (
  process.env.APP_SITE_URL ||
  process.env.REACT_APP_SITE_URL ||
  process.env.URL ||
  process.env.DEPLOY_PRIME_URL ||
  ""
).replace(/\/$/, "");
const ALLOWED_ROLES = new Set(["manager", "staff"]);
const ADMIN_ROLES = new Set(["owner", "manager"]);

function buildClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase configuration for create-user function");
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    }
    const accessToken = authHeader.slice(7).trim();
    if (!accessToken) {
      return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (err) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    const email = (payload.email || "").trim().toLowerCase();
    const fullName = (payload.fullName || "").trim();
    const role = (payload.role || "staff").toLowerCase();
    const status = "invited";

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Email is required" }) };
    }
    if (!ALLOWED_ROLES.has(role)) {
      return { statusCode: 422, body: JSON.stringify({ error: "Invalid role" }) };
    }

    const supabase = buildClient();

    const { data: requesterData, error: requesterError } = await supabase.auth.getUser(accessToken);
    if (requesterError || !requesterData?.user) {
      return { statusCode: 401, body: JSON.stringify({ error: requesterError?.message || "Unauthorized" }) };
    }
    const requesterId = requesterData.user.id;
    const { data: requesterProfile, error: profileError } = await supabase
      .from("users")
      .select("agency_id, role")
      .eq("id", requesterId)
      .single();
    if (profileError || !requesterProfile?.agency_id) {
      return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
    }
    const requesterRole = (requesterProfile.role || "").toLowerCase();
    if (!ADMIN_ROLES.has(requesterRole)) {
      return { statusCode: 403, body: JSON.stringify({ error: "Insufficient permissions" }) };
    }

    const agencyId = requesterProfile.agency_id;
    const { data: existingUsers, error: existingUsersError } = await supabase
      .from("users")
      .select("id, role")
      .eq("agency_id", agencyId);
    if (existingUsersError) {
      return { statusCode: 500, body: JSON.stringify({ error: existingUsersError.message }) };
    }
    const existing = Array.isArray(existingUsers) ? existingUsers : [];
    const managerExists = existing.some((user) => ["owner", "manager"].includes(String(user.role || "").toLowerCase()));
    const staffExists = existing.some((user) => String(user.role || "").toLowerCase() === "staff");
    if (existing.length >= 2) {
      return { statusCode: 409, body: JSON.stringify({ error: "This agency has reached the maximum number of users" }) };
    }
    if (role === "manager" && managerExists) {
      return { statusCode: 409, body: JSON.stringify({ error: "A manager already exists for this agency" }) };
    }
    if (role === "staff" && staffExists) {
      return { statusCode: 409, body: JSON.stringify({ error: "A staff user already exists for this agency" }) };
    }

    const tempPassword = crypto.randomUUID();

    const { data: authResult, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError) {
      const statusCode = authError?.status || 400;
      return { statusCode, body: JSON.stringify({ error: authError.message || "Failed to create auth user" }) };
    }

    const authUserId = authResult?.user?.id;
    if (!authUserId) {
      return { statusCode: 500, body: JSON.stringify({ error: "Auth user missing id" }) };
    }

    const now = new Date().toISOString();
    const payloadRow = {
      id: authUserId,
      agency_id: agencyId,
      email,
      full_name: fullName || null,
      role,
      status,
      invited_at: status === "invited" ? now : null,
      invited_by: requesterId,
    };

    const { error: insertError } = await supabase.from("users").insert(payloadRow);
    if (insertError) {
      await supabase.auth.admin.deleteUser(authUserId);
      return { statusCode: 400, body: JSON.stringify({ error: insertError.message }) };
    }

    let setupEmailSent = false;
    if (status !== "disabled") {
      if (!SITE_URL) {
        await supabase.auth.admin.deleteUser(authUserId);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: "Missing APP_SITE_URL for password setup email" }),
        };
      }

      const { error: setupEmailError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: SITE_URL,
      });

      if (setupEmailError) {
        await supabase.auth.admin.deleteUser(authUserId);
        return {
          statusCode: setupEmailError?.status || 502,
          body: JSON.stringify({ error: setupEmailError.message || "Failed to send password setup email" }),
        };
      }
      setupEmailSent = true;
    }

    return {
      statusCode: 201,
      body: JSON.stringify({ id: authUserId, email, role, status, setupEmailSent }),
    };
  } catch (err) {
    console.error("create-user error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};
