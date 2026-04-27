const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_ROLES = new Set(["owner", "manager", "staff"]);
const ADMIN_ROLES = new Set(["owner", "manager"]);
const ADMIN_ONLY_ROLE_CHANGE = new Set(["owner", "manager"]);

function buildClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase configuration for update-user function");
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "PATCH") {
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
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    const targetUserId = payload.userId;
    const nextRole = payload.role ? String(payload.role).toLowerCase() : undefined;
    const nextStatus = payload.status ? String(payload.status).toLowerCase() : undefined;

    if (!targetUserId || (!nextRole && !nextStatus)) {
      return { statusCode: 400, body: JSON.stringify({ error: "userId and an update field are required" }) };
    }
    if (nextRole && !ALLOWED_ROLES.has(nextRole)) {
      return { statusCode: 422, body: JSON.stringify({ error: "Invalid role" }) };
    }
    if (nextStatus && !["active", "disabled", "invited"].includes(nextStatus)) {
      return { statusCode: 422, body: JSON.stringify({ error: "Invalid status" }) };
    }

    const supabase = buildClient();
    const { data: requesterData, error: requesterError } = await supabase.auth.getUser(accessToken);
    if (requesterError || !requesterData?.user) {
      return { statusCode: 401, body: JSON.stringify({ error: requesterError?.message || "Unauthorized" }) };
    }
    const requesterId = requesterData.user.id;

    const { data: requesterProfile, error: requesterProfileError } = await supabase
      .from("users")
      .select("id, agency_id, role, status")
      .eq("id", requesterId)
      .single();

    if (requesterProfileError || !requesterProfile?.agency_id) {
      return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
    }

    const requesterRole = (requesterProfile.role || "").toLowerCase();
    if (!ADMIN_ROLES.has(requesterRole)) {
      return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
    }

    const { data: targetProfile, error: targetError } = await supabase
      .from("users")
      .select("id, agency_id, role, status")
      .eq("id", targetUserId)
      .single();

    if (targetError || !targetProfile) {
      return { statusCode: 404, body: JSON.stringify({ error: "Target user not found" }) };
    }
    if (targetProfile.agency_id !== requesterProfile.agency_id) {
      return { statusCode: 403, body: JSON.stringify({ error: "Cross-agency updates are not allowed" }) };
    }
    if (targetProfile.id === requesterId) {
      return { statusCode: 403, body: JSON.stringify({ error: "You cannot modify your own account" }) };
    }

    const targetRole = (targetProfile.role || "").toLowerCase();
    const updates = {};

    if (nextRole && nextRole !== targetRole) {
      if (requesterRole !== "owner") {
        if (requesterRole === "manager") {
          if (targetRole !== "staff" || nextRole === "owner") {
            return { statusCode: 403, body: JSON.stringify({ error: "Managers can update staff only" }) };
          }
        } else {
          return { statusCode: 403, body: JSON.stringify({ error: "Insufficient permissions" }) };
        }
      }

      if (targetRole === "owner" && nextRole !== "owner") {
        const { data: remainingOwners, error: ownersError } = await supabase
          .from("users")
          .select("id")
          .eq("agency_id", requesterProfile.agency_id)
          .eq("role", "owner")
          .eq("status", "active");
        if (ownersError) {
          return { statusCode: 500, body: JSON.stringify({ error: ownersError.message }) };
        }
        const otherOwners = (remainingOwners || []).filter((row) => row.id !== targetProfile.id);
        if (otherOwners.length === 0) {
          return { statusCode: 409, body: JSON.stringify({ error: "Cannot remove the last active owner" }) };
        }
      }

      updates.role = nextRole;
    }

    if (nextStatus && nextStatus !== targetProfile.status) {
      if (requesterRole === "manager" && targetRole !== "staff") {
        return { statusCode: 403, body: JSON.stringify({ error: "Managers can change status for staff only" }) };
      }
      if (targetRole === "owner" && nextStatus !== "active") {
        const { data: remainingOwners, error: ownersError } = await supabase
          .from("users")
          .select("id")
          .eq("agency_id", requesterProfile.agency_id)
          .eq("role", "owner")
          .eq("status", "active");
        if (ownersError) {
          return { statusCode: 500, body: JSON.stringify({ error: ownersError.message }) };
        }
        const otherOwners = (remainingOwners || []).filter((row) => row.id !== targetProfile.id);
        if (otherOwners.length === 0) {
          return { statusCode: 409, body: JSON.stringify({ error: "Cannot disable the last active owner" }) };
        }
      }
      updates.status = nextStatus;
    }

    if (Object.keys(updates).length === 0) {
      return { statusCode: 200, body: JSON.stringify({ message: "No changes applied" }) };
    }

    const { error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("id", targetUserId);

    if (updateError) {
      return { statusCode: 400, body: JSON.stringify({ error: updateError.message }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ id: targetUserId, ...updates }),
    };
  } catch (err) {
    console.error("update-user error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};
