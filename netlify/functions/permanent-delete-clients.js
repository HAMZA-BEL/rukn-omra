const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ACTIVE_PAYMENT_BLOCK_MESSAGE =
  "لا يمكن حذف هذا المعتمر نهائيًا لأنه يحتوي على دفعات محفوظة. احذف الدفعات أولًا إذا كنت متأكدًا.";
const ACTIVE_INVOICE_BLOCK_MESSAGE =
  "لا يمكن الحذف النهائي لوجود فواتير نشطة مرتبطة بهذا المعتمر.";
const ACTIVE_FINANCIAL_RECORDS_MESSAGE =
  "لا يمكن الحذف النهائي لوجود سجلات مالية نشطة مرتبطة بهذا المعتمر.";
const HIDDEN_PAYMENTS_BLOCK_MESSAGE =
  "لا يمكن الحذف النهائي لوجود دفعات مرتبطة غير ظاهرة ضمن بيانات الوكالة الحالية.";
const HIDDEN_INVOICES_BLOCK_MESSAGE =
  "لا يمكن الحذف النهائي لوجود فواتير مرتبطة غير ظاهرة ضمن بيانات الوكالة الحالية.";
const CONFIRMATION_REQUIRED_MESSAGE =
  "يجب تأكيد الحذف النهائي مع السجلات المرتبطة قبل المتابعة.";
const LINKED_RECORDS_MESSAGE =
  "تعذر الحذف النهائي لأن هناك سجلات مرتبطة بهذا المعتمر. تحقق من الدفعات أو السجلات المرتبطة ثم حاول مرة أخرى.";

function buildClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase configuration for permanent-delete-clients function");
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

function isActiveInvoice(invoice = {}) {
  const status = String(invoice.status || "").trim().toLowerCase();
  return !["trashed", "deleted", "void", "cancelled", "canceled"].includes(status);
}

function isForeignKeyError(error = {}) {
  const message = String(error.message || error.details || "");
  return error.code === "23503" || /foreign key|violates foreign key|constraint/i.test(message);
}

function isOptionalSchemaError(error = {}) {
  const message = String(error.message || error.details || error.hint || "");
  return ["42P01", "42703", "PGRST204", "PGRST205"].includes(String(error.code || ""))
    || /schema cache|could not find|does not exist|column .* not found|relation .* not found/i.test(message);
}

function optionalQueryResult(label, error) {
  if (!error) return null;
  if (isOptionalSchemaError(error)) {
    console.warn(`permanent-delete-clients optional ${label} skipped`, {
      code: error.code,
      message: error.message,
    });
    return { data: [], skipped: true, error: null };
  }
  return { data: [], skipped: false, error };
}

async function optionalSelect(label, query) {
  const { data, error } = await query;
  const optional = optionalQueryResult(label, error);
  if (optional) return optional;
  return { data: Array.isArray(data) ? data : [], skipped: false, error: null };
}

async function optionalMutation(label, query) {
  const { data, error } = await query;
  const optional = optionalQueryResult(label, error);
  if (optional) return optional;
  return { data: Array.isArray(data) ? data : [], skipped: false, error: null };
}

function extractForeignKeyInfo(error = {}) {
  const text = [error.message, error.details, error.hint].filter(Boolean).join(" ");
  const constraint = String(error.constraint || text.match(/constraint "([^"]+)"/i)?.[1] || "").trim();
  const table = String(error.table || text.match(/table "([^"]+)"/i)?.[1] || "").trim();
  return { constraint, table };
}

function mapForeignKeyCode(error = {}) {
  const info = extractForeignKeyInfo(error);
  const target = `${info.constraint} ${info.table}`.toLowerCase();
  if (target.includes("payments_client") || target.includes("table \"payments\"") || info.table === "payments") {
    return { code: "LINKED_PAYMENT_RECORDS", message: HIDDEN_PAYMENTS_BLOCK_MESSAGE, details: info };
  }
  if (target.includes("clients_represented_by") || info.constraint === "clients_represented_by_same_agency_fkey") {
    return { code: "LINKED_REPRESENTATION_CLIENTS", message: LINKED_RECORDS_MESSAGE, details: info };
  }
  if (target.includes("rooming")) return { code: "LINKED_ROOMING_ASSIGNMENTS", message: LINKED_RECORDS_MESSAGE, details: info };
  if (target.includes("activity")) return { code: "LINKED_ACTIVITY_LOGS", message: LINKED_RECORDS_MESSAGE, details: info };
  if (target.includes("notification")) return { code: "LINKED_NOTIFICATIONS", message: LINKED_RECORDS_MESSAGE, details: info };
  if (target.includes("document") || target.includes("file")) return { code: "LINKED_DOCUMENTS", message: LINKED_RECORDS_MESSAGE, details: info };
  if (target.includes("badge")) return { code: "LINKED_BADGE_DATA", message: LINKED_RECORDS_MESSAGE, details: info };
  return { code: "UNKNOWN_LINKED_RECORDS", message: LINKED_RECORDS_MESSAGE, details: info };
}

function makeCleanup() {
  return {
    deletedPaymentsCount: 0,
    deletedInvoicesCount: 0,
    cleanedRoomingAssignmentsCount: 0,
    deletedNotificationsCount: 0,
    clearedRepresentationLinksCount: 0,
    deletedBadgePhotosCount: 0,
  };
}

function addCleanup(target, source = {}) {
  target.deletedPaymentsCount += Number(source.deletedPaymentsCount || 0);
  target.deletedInvoicesCount += Number(source.deletedInvoicesCount || 0);
  target.cleanedRoomingAssignmentsCount += Number(source.cleanedRoomingAssignmentsCount || 0);
  target.deletedNotificationsCount += Number(source.deletedNotificationsCount || 0);
  target.clearedRepresentationLinksCount += Number(source.clearedRepresentationLinksCount || 0);
  target.deletedBadgePhotosCount += Number(source.deletedBadgePhotosCount || 0);
}

function getSafeBadgePhotoPath(client = {}, { agencyId, clientId } = {}) {
  const docs = client.docs && typeof client.docs === "object" ? client.docs : {};
  const path = String(client.badge_photo_path || client.badgePhotoPath || docs.badgePhotoPath || "").trim();
  const safePrefix = `agencies/${agencyId}/pilgrims/${clientId}/`;
  return path && path.startsWith(safePrefix) ? path : "";
}

function ensureClientBucket(map, clientId) {
  if (!map.has(clientId)) map.set(clientId, []);
  return map.get(clientId);
}

function cleanupRoomingValueForClients(value, clientIds) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => {
        if (typeof item === "string") return !clientIds.has(item);
        if (item && typeof item === "object") {
          const itemClientId = String(item.clientId || item.client_id || item.id || "").trim();
          return !clientIds.has(itemClientId);
        }
        return true;
      })
      .map((item) => cleanupRoomingValueForClients(item, clientIds));
  }
  if (!value || typeof value !== "object") return value;

  const next = { ...value };
  if (Array.isArray(next.occupantIds)) {
    next.occupantIds = next.occupantIds.filter((id) => !clientIds.has(String(id)));
  }
  if (next.genderOverrides && typeof next.genderOverrides === "object") {
    next.genderOverrides = Object.fromEntries(
      Object.entries(next.genderOverrides).filter(([id]) => !clientIds.has(String(id)))
    );
  }
  if (next.priceOverrides && typeof next.priceOverrides === "object") {
    next.priceOverrides = Object.fromEntries(
      Object.entries(next.priceOverrides).filter(([id]) => !clientIds.has(String(id)))
    );
  }
  return next;
}

function collectRoomingClientIds(value, clientIds, found = new Set()) {
  if (!value || found.size === clientIds.size) return found;
  if (Array.isArray(value)) {
    value.forEach((item) => collectRoomingClientIds(item, clientIds, found));
    return found;
  }
  if (typeof value !== "object") {
    const raw = String(value || "");
    if (clientIds.has(raw)) found.add(raw);
    return found;
  }

  const directClientId = String(value.clientId || value.client_id || value.id || "").trim();
  if (clientIds.has(directClientId)) found.add(directClientId);
  Object.keys(value).forEach((key) => {
    if (clientIds.has(key)) found.add(key);
  });
  if (Array.isArray(value.occupantIds)) {
    value.occupantIds.forEach((id) => {
      const raw = String(id);
      if (clientIds.has(raw)) found.add(raw);
    });
  }
  if (value.genderOverrides && typeof value.genderOverrides === "object") {
    Object.keys(value.genderOverrides).forEach((id) => {
      if (clientIds.has(id)) found.add(id);
    });
  }
  if (value.priceOverrides && typeof value.priceOverrides === "object") {
    Object.keys(value.priceOverrides).forEach((id) => {
      if (clientIds.has(id)) found.add(id);
    });
  }
  Object.values(value).forEach((nested) => collectRoomingClientIds(nested, clientIds, found));
  return found;
}

function jsonChanged(a, b) {
  return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
}

function makeResult(clientId, status, { code = "", reasonKey = "", message = "", cleanup = null, details = null } = {}) {
  return {
    client_id: clientId,
    clientId,
    status,
    code,
    reason_key: reasonKey,
    reasonKey,
    message,
    cleanup: cleanup || makeCleanup(),
    details,
  };
}

function blockForFinancialRecords(clientId, { activePayments = [], activeInvoices = [], hiddenPayments = [], hiddenInvoices = [] } = {}) {
  const activeHiddenInvoices = hiddenInvoices.filter(isActiveInvoice);
  if (activePayments.length && activeInvoices.length) {
    return makeResult(clientId, "blocked", {
      code: "ACTIVE_LINKED_FINANCIAL_RECORDS",
      reasonKey: "active_financial_records",
      message: ACTIVE_FINANCIAL_RECORDS_MESSAGE,
    });
  }
  if (activePayments.length) {
    return makeResult(clientId, "blocked", {
      code: "ACTIVE_LINKED_PAYMENTS",
      reasonKey: "active_payments",
      message: ACTIVE_PAYMENT_BLOCK_MESSAGE,
    });
  }
  if (activeInvoices.length) {
    return makeResult(clientId, "blocked", {
      code: "ACTIVE_LINKED_INVOICES",
      reasonKey: "final_invoices",
      message: ACTIVE_INVOICE_BLOCK_MESSAGE,
    });
  }
  if (hiddenPayments.length && activeHiddenInvoices.length) {
    return makeResult(clientId, "blocked", {
      code: "UNKNOWN_LINKED_RECORDS",
      reasonKey: "hidden_financial_records",
      message: LINKED_RECORDS_MESSAGE,
    });
  }
  if (hiddenPayments.length) {
    return makeResult(clientId, "blocked", {
      code: "LINKED_EXTERNAL_PAYMENTS",
      reasonKey: "hidden_payments",
      message: HIDDEN_PAYMENTS_BLOCK_MESSAGE,
    });
  }
  if (activeHiddenInvoices.length) {
    return makeResult(clientId, "blocked", {
      code: "LINKED_EXTERNAL_INVOICES",
      reasonKey: "hidden_invoices",
      message: HIDDEN_INVOICES_BLOCK_MESSAGE,
    });
  }
  return null;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return json(204, {});
    if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });

    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return json(401, { code: "UNAUTHORIZED", success: false, error: "Unauthorized" });
    }
    const accessToken = authHeader.slice(7).trim();
    if (!accessToken) return json(401, { code: "UNAUTHORIZED", success: false, error: "Unauthorized" });

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { code: "INVALID_JSON", success: false, error: "Invalid JSON" });
    }

    const agencyId = String(payload.agencyId || "").trim();
    const type = String(payload.type || "client").trim();
    const confirmed = payload.confirmPermanentDelete === true
      || payload.confirmLinkedRecords === true
      || payload.confirmed === true;
    const clientIds = Array.from(new Set(
      (Array.isArray(payload.clientIds) ? payload.clientIds : payload.client_ids || [])
        .map((id) => String(id || "").trim())
        .filter(Boolean)
    ));

    if (!agencyId || !clientIds.length) {
      return json(400, { code: "INVALID_REQUEST", success: false, error: "agencyId and clientIds are required" });
    }
    if (type !== "client") {
      return json(400, { code: "UNSUPPORTED_TYPE", success: false, error: "Unsupported permanent delete type" });
    }
    if (!confirmed) {
      return json(409, { code: "CONFIRMATION_REQUIRED", success: false, error: CONFIRMATION_REQUIRED_MESSAGE });
    }

    const supabase = buildClient();
    const { data: requesterData, error: requesterError } = await supabase.auth.getUser(accessToken);
    if (requesterError || !requesterData?.user) {
      return json(401, { code: "UNAUTHORIZED", success: false, error: requesterError?.message || "Unauthorized" });
    }

    const { data: requesterProfile, error: profileError } = await supabase
      .from("users")
      .select("agency_id, status")
      .eq("id", requesterData.user.id)
      .single();
    if (profileError || !requesterProfile?.agency_id) {
      return json(403, { code: "UNAUTHORIZED", success: false, error: "Forbidden" });
    }
    if (String(requesterProfile.status || "").toLowerCase() !== "active") {
      return json(403, { code: "UNAUTHORIZED", success: false, error: "Inactive account" });
    }
    if (requesterProfile.agency_id !== agencyId) {
      return json(403, { code: "UNAUTHORIZED", success: false, error: "Forbidden" });
    }

    const resultsByClient = new Map();
    const cleanupByClient = new Map(clientIds.map((id) => [id, makeCleanup()]));

    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("*")
      .eq("agency_id", agencyId)
      .in("id", clientIds);
    if (clientsError) {
      return json(500, { code: "FETCH_FAILED", success: false, error: clientsError.message });
    }

    const clientsById = new Map((clients || []).map((client) => [String(client.id), client]));
    clientIds.forEach((clientId) => {
      const client = clientsById.get(clientId);
      if (!client) {
        resultsByClient.set(clientId, makeResult(clientId, "skipped", {
          code: "NOT_FOUND",
          reasonKey: "not_found",
          message: "Client not found",
        }));
      } else if (!isDeletedClient(client)) {
        resultsByClient.set(clientId, makeResult(clientId, "skipped", {
          code: "CLIENT_NOT_TRASHED",
          reasonKey: "client_not_trashed",
          message: "Client must be in Trash before permanent deletion",
        }));
      }
    });

    const trashedClientIds = clientIds.filter((clientId) => !resultsByClient.has(clientId));
    if (!trashedClientIds.length) {
      const results = clientIds.map((clientId) => resultsByClient.get(clientId));
      return json(200, {
        ok: true,
        success: true,
        results,
        deletedClientIds: [],
        blockedClientIds: [],
        failedClientIds: [],
        skippedClientIds: results.map((result) => result.client_id),
        cleanup: makeCleanup(),
      });
    }

    const [paymentResult, invoiceResult] = await Promise.all([
      supabase
        .from("payments")
        .select("*")
        .in("client_id", trashedClientIds),
      optionalSelect(
        "invoice inspection",
        supabase
          .from("invoices")
          .select("*")
          .in("client_id", trashedClientIds)
      ),
    ]);
    if (paymentResult.error) {
      return json(500, { code: "FETCH_FAILED", success: false, error: paymentResult.error.message });
    }
    if (invoiceResult.error) {
      return json(500, { code: "FETCH_FAILED", success: false, error: invoiceResult.error.message });
    }

    const paymentsByClient = new Map();
    (paymentResult.data || []).forEach((payment) => {
      const clientId = String(payment.client_id || payment.clientId || "").trim();
      if (!clientId) return;
      ensureClientBucket(paymentsByClient, clientId).push(payment);
    });

    const invoicesByClient = new Map();
    (invoiceResult.data || []).forEach((invoice) => {
      const clientId = String(invoice.client_id || invoice.clientId || "").trim();
      if (!clientId) return;
      ensureClientBucket(invoicesByClient, clientId).push(invoice);
    });

    const inactivePaymentsByClient = new Map();
    const inactiveInvoicesByClient = new Map();
    trashedClientIds.forEach((clientId) => {
      const linkedPayments = (paymentsByClient.get(clientId) || []).filter((payment) => String(payment.agency_id || "") === agencyId);
      const hiddenPayments = (paymentsByClient.get(clientId) || []).filter((payment) => String(payment.agency_id || "") !== agencyId);
      const activePayments = linkedPayments.filter((payment) => !isInactivePayment(payment));
      const inactivePayments = linkedPayments.filter(isInactivePayment);
      const linkedInvoices = (invoicesByClient.get(clientId) || []).filter((invoice) => String(invoice.agency_id || "") === agencyId);
      const hiddenInvoices = (invoicesByClient.get(clientId) || []).filter((invoice) => String(invoice.agency_id || "") !== agencyId);
      const activeInvoices = linkedInvoices.filter(isActiveInvoice);
      const inactiveInvoices = linkedInvoices.filter((invoice) => !isActiveInvoice(invoice));
      const financialBlock = blockForFinancialRecords(clientId, {
        activePayments,
        activeInvoices,
        hiddenPayments,
        hiddenInvoices,
      });
      if (financialBlock) {
        resultsByClient.set(clientId, financialBlock);
        return;
      }
      inactivePaymentsByClient.set(clientId, inactivePayments);
      inactiveInvoicesByClient.set(clientId, inactiveInvoices);
    });

    const eligibleClientIds = trashedClientIds.filter((clientId) => !resultsByClient.has(clientId));
    const eligibleClientIdSet = new Set(eligibleClientIds);

    let representationRows = [];
    let notificationRows = [];
    let roomingAssignments = [];
    if (eligibleClientIds.length) {
      const [representationResult, notificationResult, roomingResult] = await Promise.all([
        optionalSelect(
          "representation inspection",
          supabase
            .from("clients")
            .select("id, represented_by_client_id")
            .eq("agency_id", agencyId)
            .in("represented_by_client_id", eligibleClientIds)
        ),
        optionalSelect(
          "notification inspection",
          supabase
            .from("notifications")
            .select("id, target_id")
            .eq("agency_id", agencyId)
            .eq("target_type", "client")
            .in("target_id", eligibleClientIds)
        ),
        optionalSelect(
          "rooming inspection",
          supabase
            .from("rooming_assignments")
            .select("id, rooms, unassigned")
            .eq("agency_id", agencyId)
        ),
      ]);
      if (representationResult.error) {
        return json(500, { code: "SAFE_CLEANUP_CHECK_FAILED", success: false, error: representationResult.error.message });
      }
      if (notificationResult.error) {
        return json(500, { code: "SAFE_CLEANUP_CHECK_FAILED", success: false, error: notificationResult.error.message });
      }
      if (roomingResult.error) {
        return json(500, { code: "SAFE_CLEANUP_CHECK_FAILED", success: false, error: roomingResult.error.message });
      }
      representationRows = representationResult.data;
      notificationRows = notificationResult.data;
      roomingAssignments = roomingResult.data;
    }

    representationRows.forEach((row) => {
      const clientId = String(row.represented_by_client_id || "").trim();
      const cleanup = cleanupByClient.get(clientId);
      if (cleanup) cleanup.clearedRepresentationLinksCount += 1;
    });
    notificationRows.forEach((row) => {
      const clientId = String(row.target_id || "").trim();
      const cleanup = cleanupByClient.get(clientId);
      if (cleanup) cleanup.deletedNotificationsCount += 1;
    });
    eligibleClientIds.forEach((clientId) => {
      const cleanup = cleanupByClient.get(clientId);
      if (!cleanup) return;
      cleanup.deletedPaymentsCount += (inactivePaymentsByClient.get(clientId) || []).length;
      cleanup.deletedInvoicesCount += (inactiveInvoicesByClient.get(clientId) || []).length;
      cleanup.deletedBadgePhotosCount += getSafeBadgePhotoPath(clientsById.get(clientId), { agencyId, clientId }) ? 1 : 0;
    });

    const changedRoomingAssignments = [];
    roomingAssignments.forEach((assignment) => {
      const found = collectRoomingClientIds([assignment.rooms || [], assignment.unassigned || []], eligibleClientIdSet);
      if (!found.size) return;
      found.forEach((clientId) => {
        const cleanup = cleanupByClient.get(clientId);
        if (cleanup) cleanup.cleanedRoomingAssignmentsCount += 1;
      });
      const nextRooms = cleanupRoomingValueForClients(Array.isArray(assignment.rooms) ? assignment.rooms : [], eligibleClientIdSet);
      const nextUnassigned = cleanupRoomingValueForClients(Array.isArray(assignment.unassigned) ? assignment.unassigned : [], eligibleClientIdSet);
      if (jsonChanged(assignment.rooms, nextRooms) || jsonChanged(assignment.unassigned, nextUnassigned)) {
        changedRoomingAssignments.push({ id: assignment.id, rooms: nextRooms, unassigned: nextUnassigned });
      }
    });

    const inactivePaymentIds = eligibleClientIds.flatMap((clientId) => (
      (inactivePaymentsByClient.get(clientId) || []).map((payment) => payment.id).filter(Boolean)
    ));
    if (inactivePaymentIds.length) {
      const { error } = await supabase
        .from("payments")
        .delete()
        .eq("agency_id", agencyId)
        .in("id", inactivePaymentIds)
        .select("id");
      if (error) return json(500, { code: "SAFE_CLEANUP_FAILED", success: false, error: error.message });
    }

    const inactiveInvoiceIds = eligibleClientIds.flatMap((clientId) => (
      (inactiveInvoicesByClient.get(clientId) || []).map((invoice) => invoice.id).filter(Boolean)
    ));
    if (inactiveInvoiceIds.length) {
      const invoiceDelete = await optionalMutation(
        "invoice cleanup",
        supabase
          .from("invoices")
          .delete()
          .eq("agency_id", agencyId)
          .in("id", inactiveInvoiceIds)
          .select("id")
      );
      if (invoiceDelete.error) return json(500, { code: "SAFE_CLEANUP_FAILED", success: false, error: invoiceDelete.error.message });
    }

    const representationIds = representationRows.map((row) => row.id).filter(Boolean);
    if (representationIds.length) {
      const representationUpdate = await optionalMutation(
        "representation cleanup",
        supabase
          .from("clients")
          .update({ represented_by_client_id: null, represented_by_relationship: null })
          .eq("agency_id", agencyId)
          .in("id", representationIds)
          .select("id")
      );
      if (representationUpdate.error) {
        return json(500, { code: "SAFE_CLEANUP_FAILED", success: false, error: representationUpdate.error.message });
      }
    }

    const notificationIds = notificationRows.map((row) => row.id).filter(Boolean);
    if (notificationIds.length) {
      const notificationDelete = await optionalMutation(
        "notification cleanup",
        supabase
          .from("notifications")
          .delete()
          .eq("agency_id", agencyId)
          .eq("target_type", "client")
          .in("id", notificationIds)
          .select("id")
      );
      if (notificationDelete.error) {
        return json(500, { code: "SAFE_CLEANUP_FAILED", success: false, error: notificationDelete.error.message });
      }
    }

    for (const assignment of changedRoomingAssignments) {
      const roomingUpdate = await optionalMutation(
        "rooming cleanup update",
        supabase
          .from("rooming_assignments")
          .update({ rooms: assignment.rooms, unassigned: assignment.unassigned })
          .eq("agency_id", agencyId)
          .eq("id", assignment.id)
          .select("id")
      );
      if (roomingUpdate.error) {
        return json(500, { code: "SAFE_CLEANUP_FAILED", success: false, error: roomingUpdate.error.message });
      }
    }

    const badgePhotoPaths = eligibleClientIds
      .map((clientId) => getSafeBadgePhotoPath(clientsById.get(clientId), { agencyId, clientId }))
      .filter(Boolean);
    if (badgePhotoPaths.length) {
      const { error } = await supabase.storage.from("pilgrim-photos").remove(badgePhotoPaths);
      if (error) {
        console.warn("permanent-delete-clients badge photo cleanup skipped", {
          code: error.code,
          message: error.message,
        });
        badgePhotoPaths.forEach((path) => {
          const clientId = eligibleClientIds.find((id) => path.includes(`/pilgrims/${id}/`));
          const cleanup = clientId ? cleanupByClient.get(clientId) : null;
          if (cleanup) cleanup.deletedBadgePhotosCount = 0;
        });
      }
    }

    const deletedClientIds = [];
    if (eligibleClientIds.length) {
      const { data, error } = await supabase
        .from("clients")
        .delete()
        .eq("agency_id", agencyId)
        .eq("deleted", true)
        .in("id", eligibleClientIds)
        .select("id");
      if (error) {
        console.error("permanent-delete-clients batch client delete error", error);
        for (const clientId of eligibleClientIds) {
          const singleDelete = await supabase
            .from("clients")
            .delete()
            .eq("agency_id", agencyId)
            .eq("id", clientId)
            .eq("deleted", true)
            .select("id");
          if (singleDelete.error) {
            if (isForeignKeyError(singleDelete.error)) {
              const mapped = mapForeignKeyCode(singleDelete.error);
              resultsByClient.set(clientId, makeResult(clientId, "blocked", {
                code: mapped.code,
                reasonKey: "linked_records",
                message: mapped.message,
                details: mapped.details,
              }));
            } else {
              resultsByClient.set(clientId, makeResult(clientId, "failed", {
                code: "DELETE_FAILED",
                reasonKey: "delete_failed",
                message: singleDelete.error.message || "Permanent delete failed",
                details: singleDelete.error,
              }));
            }
            continue;
          }
          if (Array.isArray(singleDelete.data) && singleDelete.data.length) {
            deletedClientIds.push(clientId);
          } else {
            resultsByClient.set(clientId, makeResult(clientId, "failed", {
              code: "NOT_DELETED",
              reasonKey: "not_deleted",
              message: "Client was not deleted",
            }));
          }
        }
      } else {
        deletedClientIds.push(...(Array.isArray(data) ? data.map((row) => String(row.id)) : []));
        const deletedSet = new Set(deletedClientIds);
        eligibleClientIds.forEach((clientId) => {
          if (!deletedSet.has(clientId)) {
            resultsByClient.set(clientId, makeResult(clientId, "failed", {
              code: "NOT_DELETED",
              reasonKey: "not_deleted",
              message: "Client was not deleted",
            }));
          }
        });
      }
    }

    deletedClientIds.forEach((clientId) => {
      resultsByClient.set(clientId, makeResult(clientId, "deleted", {
        reasonKey: "deleted",
        message: "Client permanently deleted",
        cleanup: cleanupByClient.get(clientId) || makeCleanup(),
      }));
    });

    const results = clientIds.map((clientId) => (
      resultsByClient.get(clientId)
      || makeResult(clientId, "failed", {
        code: "UNKNOWN_RESULT",
        reasonKey: "unknown_result",
        message: "Permanent delete result unavailable",
      })
    ));
    const cleanup = makeCleanup();
    results.filter((result) => result.status === "deleted").forEach((result) => addCleanup(cleanup, result.cleanup));

    return json(200, {
      ok: true,
      success: true,
      results,
      deletedClientIds: results.filter((result) => result.status === "deleted").map((result) => result.client_id),
      blockedClientIds: results.filter((result) => result.status === "blocked").map((result) => result.client_id),
      failedClientIds: results.filter((result) => result.status === "failed").map((result) => result.client_id),
      skippedClientIds: results.filter((result) => result.status === "skipped").map((result) => result.client_id),
      cleanup,
    });
  } catch (err) {
    console.error("permanent-delete-clients error", err);
    return json(500, { code: "INTERNAL_ERROR", success: false, error: "Internal Server Error" });
  }
};
