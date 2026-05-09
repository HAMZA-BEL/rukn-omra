const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ACTIVE_PAYMENT_BLOCK_MESSAGE =
  "لا يمكن حذف هذا المعتمر نهائيًا لأنه يحتوي على دفعات محفوظة. احذف الدفعات أولًا إذا كنت متأكدًا.";
const LINKED_RECORDS_MESSAGE =
  "تعذر الحذف النهائي لأن هناك سجلات مرتبطة بهذا المعتمر. تحقق من الدفعات أو السجلات المرتبطة ثم حاول مرة أخرى.";

function buildClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase configuration for permanent-delete-client function");
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function isDeletedClient(client = {}) {
  const status = String(client.status || "").trim().toLowerCase();
  return Boolean(
    client.deleted === true
    || client.is_deleted === true
    || client.deleted_at
    || client.trashed_at
    || status === "deleted"
    || status === "trashed"
  );
}

function isInactivePayment(payment = {}) {
  const status = String(payment.status || "").trim().toLowerCase();
  if (["trashed", "deleted", "inactive", "archived", "void", "cancelled", "canceled"].includes(status)) {
    return true;
  }
  if (payment.trashed_at || payment.deleted_at) return true;
  if (payment.deleted === true || payment.trashed === true || payment.archived === true) return true;
  return false;
}

function isForeignKeyError(error = {}) {
  const message = String(error.message || error.details || "");
  return error.code === "23503" || /foreign key|violates foreign key|constraint/i.test(message);
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return json(204, {});
    }
    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method Not Allowed" });
    }

    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return json(401, { error: "Unauthorized" });
    }
    const accessToken = authHeader.slice(7).trim();
    if (!accessToken) {
      return json(401, { error: "Unauthorized" });
    }

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (err) {
      return json(400, { error: "Invalid JSON" });
    }

    const clientId = String(payload.clientId || "").trim();
    const agencyId = String(payload.agencyId || "").trim();
    const type = String(payload.type || "client").trim();
    if (!clientId || !agencyId) {
      return json(400, { error: "clientId and agencyId are required" });
    }
    if (type !== "client") {
      return json(400, { error: "Unsupported permanent delete type" });
    }

    const supabase = buildClient();
    const { data: requesterData, error: requesterError } = await supabase.auth.getUser(accessToken);
    if (requesterError || !requesterData?.user) {
      return json(401, { error: requesterError?.message || "Unauthorized" });
    }

    const { data: requesterProfile, error: profileError } = await supabase
      .from("users")
      .select("agency_id, status")
      .eq("id", requesterData.user.id)
      .single();
    if (profileError || !requesterProfile?.agency_id) {
      return json(403, { error: "Forbidden" });
    }
    if (String(requesterProfile.status || "").toLowerCase() !== "active") {
      return json(403, { error: "Inactive account" });
    }
    if (requesterProfile.agency_id !== agencyId) {
      return json(403, { error: "Forbidden" });
    }

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .eq("agency_id", agencyId)
      .maybeSingle();
    if (clientError) {
      return json(500, { error: clientError.message });
    }
    if (!client) {
      return json(404, { error: "Client not found" });
    }
    if (!isDeletedClient(client)) {
      return json(409, {
        code: "CLIENT_NOT_TRASHED",
        error: "Client must be in Trash before permanent deletion",
      });
    }

    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("*")
      .eq("agency_id", agencyId)
      .eq("client_id", clientId);
    if (paymentsError) {
      return json(500, { error: paymentsError.message });
    }

    const linkedPayments = Array.isArray(payments) ? payments : [];
    const activePayments = linkedPayments.filter((payment) => !isInactivePayment(payment));
    if (activePayments.length) {
      return json(409, {
        code: "ACTIVE_PAYMENTS",
        error: ACTIVE_PAYMENT_BLOCK_MESSAGE,
        activePaymentsCount: activePayments.length,
      });
    }

    const inactivePaymentIds = linkedPayments
      .filter(isInactivePayment)
      .map((payment) => payment.id)
      .filter(Boolean);

    if (inactivePaymentIds.length) {
      const { error: deletePaymentsError } = await supabase
        .from("payments")
        .delete()
        .eq("agency_id", agencyId)
        .in("id", inactivePaymentIds);
      if (deletePaymentsError) {
        console.error("permanent-delete-client payment cleanup error", deletePaymentsError);
        return json(500, { error: LINKED_RECORDS_MESSAGE });
      }
    }

    const { data: deletedClients, error: deleteClientError } = await supabase
      .from("clients")
      .delete()
      .eq("agency_id", agencyId)
      .eq("id", clientId)
      .select("id");
    if (deleteClientError) {
      console.error("permanent-delete-client client delete error", deleteClientError);
      return json(isForeignKeyError(deleteClientError) ? 409 : 500, {
        code: isForeignKeyError(deleteClientError) ? "LINKED_RECORDS" : "DELETE_FAILED",
        error: isForeignKeyError(deleteClientError) ? LINKED_RECORDS_MESSAGE : deleteClientError.message,
      });
    }
    if (!Array.isArray(deletedClients) || !deletedClients.length) {
      return json(404, { error: "Client not found" });
    }

    return json(200, {
      ok: true,
      deletedClientId: clientId,
      deletedInactivePaymentsCount: inactivePaymentIds.length,
    });
  } catch (err) {
    console.error("permanent-delete-client error", err);
    return json(500, { error: "Internal Server Error" });
  }
};
