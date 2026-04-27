const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED_ROLES = new Set(["owner", "manager", "staff"]);
const ALLOWED_STATUS = new Set(["active", "disabled", "invited"]);
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
    const status = (payload.status || "active").toLowerCase();

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Email is required" }) };
    }
    if (!ALLOWED_ROLES.has(role)) {
      return { statusCode: 422, body: JSON.stringify({ error: "Invalid role" }) };
    }
    if (!ALLOWED_STATUS.has(status)) {
      return { statusCode: 422, body: JSON.stringify({ error: "Invalid status" }) };
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
    if (role === "owner" && requesterRole !== "owner") {
      return { statusCode: 403, body: JSON.stringify({ error: "Only owners can create owners" }) };
    }

    const agencyId = requesterProfile.agency_id;
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

    return {
      statusCode: 201,
      body: JSON.stringify({ id: authUserId, email, role, status }),
    };
  } catch (err) {
    console.error("create-user error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};
