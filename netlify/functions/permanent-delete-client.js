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
    console.warn(`permanent-delete-client optional ${label} skipped`, {
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

function mapForeignKeyError(error = {}) {
  const info = extractForeignKeyInfo(error);
  const target = `${info.constraint} ${info.table}`.toLowerCase();
  if (target.includes("payments_client") || target.includes("table \"payments\"") || info.table === "payments") {
    return {
      code: "LINKED_PAYMENT_RECORDS",
      success: false,
      deleted: false,
      error: HIDDEN_PAYMENTS_BLOCK_MESSAGE,
      details: info,
    };
  }
  if (target.includes("clients_represented_by") || info.constraint === "clients_represented_by_same_agency_fkey") {
    return {
      code: "LINKED_REPRESENTATION_CLIENTS",
      success: false,
      deleted: false,
      error: LINKED_RECORDS_MESSAGE,
      details: info,
    };
  }
  if (target.includes("rooming")) {
    return { code: "LINKED_ROOMING_ASSIGNMENTS", success: false, deleted: false, error: LINKED_RECORDS_MESSAGE, details: info };
  }
  if (target.includes("activity")) {
    return { code: "LINKED_ACTIVITY_LOGS", success: false, deleted: false, error: LINKED_RECORDS_MESSAGE, details: info };
  }
  if (target.includes("notification")) {
    return { code: "LINKED_NOTIFICATIONS", success: false, deleted: false, error: LINKED_RECORDS_MESSAGE, details: info };
  }
  if (target.includes("document") || target.includes("file")) {
    return { code: "LINKED_DOCUMENTS", success: false, deleted: false, error: LINKED_RECORDS_MESSAGE, details: info };
  }
  if (target.includes("badge")) {
    return { code: "LINKED_BADGE_DATA", success: false, deleted: false, error: LINKED_RECORDS_MESSAGE, details: info };
  }
  return {
    code: "UNKNOWN_LINKED_RECORDS",
    success: false,
    deleted: false,
    error: LINKED_RECORDS_MESSAGE,
    details: info,
  };
}

function buildCleanupPreview({ linkedPayments = [], linkedInvoices = [], representationLinks = [], notifications = [], roomingAssignments = [], badgePhotoPath = "" } = {}) {
  const cleanupReasons = [];

  if (linkedPayments.length) cleanupReasons.push({ code: "DELETE_LINKED_PAYMENTS", count: linkedPayments.length });
  if (linkedInvoices.length) cleanupReasons.push({ code: "DELETE_LINKED_INVOICES", count: linkedInvoices.length });
  if (representationLinks.length) cleanupReasons.push({ code: "CLEANUP_REPRESENTATION_LINKS", count: representationLinks.length });
  if (roomingAssignments.length) cleanupReasons.push({ code: "CLEANUP_ROOMING_ASSIGNMENTS", count: roomingAssignments.length });
  if (notifications.length) cleanupReasons.push({ code: "CLEANUP_NOTIFICATIONS", count: notifications.length });
  if (badgePhotoPath) cleanupReasons.push({ code: "DELETE_BADGE_PHOTO", count: 1 });

  return {
    hasSafeCleanup: cleanupReasons.length > 0,
    cleanupReasons,
    cleanupPreview: {
      deletedPaymentsCount: linkedPayments.length,
      deletedPaymentIds: linkedPayments.map((payment) => payment.id).filter(Boolean),
      deletedInvoicesCount: linkedInvoices.length,
      clearedRepresentationLinksCount: representationLinks.length,
      cleanedRoomingAssignmentsCount: roomingAssignments.length,
      deletedNotificationsCount: notifications.length,
      deletedBadgePhotosCount: badgePhotoPath ? 1 : 0,
    },
  };
}

function buildLinkedRecordBlock({ activePayments = [], activeInvoices = [], hiddenPayments = [], hiddenInvoices = [] } = {}) {
  const activeHiddenInvoices = hiddenInvoices.filter(isActiveInvoice);
  const activePaymentCount = activePayments.length;
  const activeInvoiceCount = activeInvoices.length;
  const reasons = [];

  if (activePaymentCount) {
    reasons.push({ code: "ACTIVE_LINKED_PAYMENTS", count: activePaymentCount });
  }
  if (activeInvoiceCount) {
    reasons.push({ code: "ACTIVE_LINKED_INVOICES", count: activeInvoiceCount });
  }
  if (hiddenPayments.length) {
    reasons.push({ code: "LINKED_EXTERNAL_PAYMENTS", count: hiddenPayments.length });
  }
  if (activeHiddenInvoices.length) {
    reasons.push({ code: "LINKED_EXTERNAL_INVOICES", count: activeHiddenInvoices.length });
  }
  if (!reasons.length) return null;

  const hasActivePayments = activePaymentCount > 0;
  const hasActiveInvoices = activeInvoiceCount > 0;
  const hasHiddenPayments = hiddenPayments.length > 0;
  const hasHiddenInvoices = activeHiddenInvoices.length > 0;
  let reasonCode = "UNKNOWN_LINKED_RECORDS";
  let error = LINKED_RECORDS_MESSAGE;
  if (hasActivePayments && hasActiveInvoices) {
    reasonCode = "ACTIVE_LINKED_FINANCIAL_RECORDS";
    error = ACTIVE_FINANCIAL_RECORDS_MESSAGE;
  } else if (hasActivePayments) {
    reasonCode = "ACTIVE_LINKED_PAYMENTS";
    error = ACTIVE_PAYMENT_BLOCK_MESSAGE;
  } else if (hasActiveInvoices) {
    reasonCode = "ACTIVE_LINKED_INVOICES";
    error = ACTIVE_INVOICE_BLOCK_MESSAGE;
  } else if (hasHiddenPayments && !hasHiddenInvoices) {
    reasonCode = "LINKED_EXTERNAL_PAYMENTS";
    error = HIDDEN_PAYMENTS_BLOCK_MESSAGE;
  } else if (hasHiddenInvoices && !hasHiddenPayments) {
    reasonCode = "LINKED_EXTERNAL_INVOICES";
    error = HIDDEN_INVOICES_BLOCK_MESSAGE;
  }
  return {
    code: reasonCode,
    error,
    reasons,
    linkedRecords: {
      payments: {
        total: activePaymentCount,
        active: activePaymentCount,
        inactive: 0,
      },
      invoices: {
        total: activeInvoiceCount,
        active: activeInvoiceCount,
        inactive: 0,
      },
      hiddenPayments: {
        total: hiddenPayments.length,
      },
      hiddenInvoices: {
        total: hiddenInvoices.length,
        active: activeHiddenInvoices.length,
      },
    },
  };
}

function cleanupRoomingValueForClient(value, clientId) {
  if (Array.isArray(value)) {
    const next = value
      .filter((item) => {
        if (typeof item === "string") return item !== clientId;
        if (item && typeof item === "object") {
          const itemClientId = String(item.clientId || item.client_id || item.id || "").trim();
          return itemClientId !== clientId;
        }
        return true;
      })
      .map((item) => cleanupRoomingValueForClient(item, clientId));
    return next;
  }
  if (!value || typeof value !== "object") return value;

  const next = { ...value };
  if (Array.isArray(next.occupantIds)) {
    next.occupantIds = next.occupantIds.filter((id) => String(id) !== clientId);
  }
  if (next.genderOverrides && typeof next.genderOverrides === "object") {
    const { [clientId]: _removed, ...rest } = next.genderOverrides;
    next.genderOverrides = rest;
  }
  if (next.priceOverrides && typeof next.priceOverrides === "object") {
    const { [clientId]: _removed, ...rest } = next.priceOverrides;
    next.priceOverrides = rest;
  }
  return next;
}

function roomingValueContainsClient(value, clientId) {
  if (!clientId) return false;
  if (Array.isArray(value)) {
    return value.some((item) => roomingValueContainsClient(item, clientId));
  }
  if (!value || typeof value !== "object") {
    return String(value || "") === clientId;
  }

  const directClientId = String(value.clientId || value.client_id || value.id || "").trim();
  if (directClientId === clientId) return true;
  if (Object.prototype.hasOwnProperty.call(value, clientId)) return true;
  if (Array.isArray(value.occupantIds) && value.occupantIds.some((id) => String(id) === clientId)) {
    return true;
  }
  if (value.genderOverrides && typeof value.genderOverrides === "object" && Object.prototype.hasOwnProperty.call(value.genderOverrides, clientId)) {
    return true;
  }
  if (value.priceOverrides && typeof value.priceOverrides === "object" && Object.prototype.hasOwnProperty.call(value.priceOverrides, clientId)) {
    return true;
  }
  return Object.values(value).some((nested) => roomingValueContainsClient(nested, clientId));
}

function roomingAssignmentContainsClient(assignment = {}, clientId = "") {
  return roomingValueContainsClient(assignment.rooms || [], clientId)
    || roomingValueContainsClient(assignment.unassigned || [], clientId);
}

async function getAffectedRoomingAssignmentsForClient(supabase, { agencyId, clientId }) {
  const roomingResult = await optionalSelect(
    "rooming inspection",
    supabase
      .from("rooming_assignments")
      .select("id, rooms, unassigned")
      .eq("agency_id", agencyId)
  );
  if (roomingResult.error) return { data: [], error: roomingResult.error };
  return {
    data: roomingResult.data.filter((assignment) => roomingAssignmentContainsClient(assignment, clientId)),
    error: null,
  };
}

function jsonChanged(a, b) {
  return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
}

function getSafeBadgePhotoPath(client = {}, { agencyId, clientId } = {}) {
  const docs = client.docs && typeof client.docs === "object" ? client.docs : {};
  const path = String(client.badge_photo_path || client.badgePhotoPath || docs.badgePhotoPath || "").trim();
  const safePrefix = `agencies/${agencyId}/pilgrims/${clientId}/`;
  return path && path.startsWith(safePrefix) ? path : "";
}

async function inspectSafeLinkedRecords(supabase, { agencyId, clientId, client = {}, linkedPayments = [], linkedInvoices = [], roomingAssignments = null }) {
  const [representationResult, notificationResult] = await Promise.all([
    optionalSelect(
      "representation inspection",
      supabase
        .from("clients")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("represented_by_client_id", clientId)
    ),
    optionalSelect(
      "notification inspection",
      supabase
        .from("notifications")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("target_type", "client")
        .eq("target_id", clientId)
    ),
  ]);
  if (representationResult.error) return { error: representationResult.error };
  if (notificationResult.error) return { error: notificationResult.error };

  const affectedRoomingAssignments = Array.isArray(roomingAssignments)
    ? roomingAssignments
    : (await getAffectedRoomingAssignmentsForClient(supabase, { agencyId, clientId }));
  if (!Array.isArray(roomingAssignments) && affectedRoomingAssignments.error) {
    return { error: affectedRoomingAssignments.error };
  }
  const safeRoomingAssignments = Array.isArray(roomingAssignments)
    ? roomingAssignments
    : affectedRoomingAssignments.data;

  return {
    ...buildCleanupPreview({
      linkedPayments,
      linkedInvoices,
      representationLinks: representationResult.data,
      notifications: notificationResult.data,
      roomingAssignments: safeRoomingAssignments,
      badgePhotoPath: getSafeBadgePhotoPath(client, { agencyId, clientId }),
    }),
    error: null,
  };
}

async function deleteLinkedRecordsForClient(supabase, { agencyId, clientId, client = {}, linkedPayments = [], linkedInvoices = [], roomingAssignments = null }) {
  const cleanup = {
    deletedPaymentsCount: 0,
    deletedPaymentIds: [],
    deletedInvoicesCount: 0,
    clearedRepresentationLinksCount: 0,
    cleanedRoomingAssignmentsCount: 0,
    deletedNotificationsCount: 0,
    deletedBadgePhotosCount: 0,
  };

  const linkedPaymentIds = linkedPayments.map((payment) => payment.id).filter(Boolean);
  if (linkedPaymentIds.length) {
    const { data, error } = await supabase
      .from("payments")
      .delete()
      .eq("agency_id", agencyId)
      .eq("client_id", clientId)
      .in("id", linkedPaymentIds)
      .select("id");
    if (error) return { error };
    cleanup.deletedPaymentsCount = Array.isArray(data) ? data.length : linkedPaymentIds.length;
    cleanup.deletedPaymentIds = Array.isArray(data) ? data.map((payment) => payment.id).filter(Boolean) : linkedPaymentIds;
  }

  const linkedInvoiceIds = linkedInvoices.map((invoice) => invoice.id).filter(Boolean);
  if (linkedInvoiceIds.length) {
    const invoiceDelete = await optionalMutation(
      "invoice cleanup",
      supabase
        .from("invoices")
        .delete()
        .eq("agency_id", agencyId)
        .eq("client_id", clientId)
        .in("id", linkedInvoiceIds)
        .select("id")
    );
    if (invoiceDelete.error) return { error: invoiceDelete.error };
    cleanup.deletedInvoicesCount = invoiceDelete.skipped ? 0 : invoiceDelete.data.length || linkedInvoiceIds.length;
  }

  const representationUpdate = await optionalMutation(
    "representation cleanup",
    supabase
      .from("clients")
      .update({ represented_by_client_id: null, represented_by_relationship: null })
      .eq("agency_id", agencyId)
      .eq("represented_by_client_id", clientId)
      .select("id")
  );
  if (representationUpdate.error) return { error: representationUpdate.error };
  cleanup.clearedRepresentationLinksCount = representationUpdate.skipped ? 0 : representationUpdate.data.length;

  const notificationDelete = await optionalMutation(
    "notification cleanup",
    supabase
      .from("notifications")
      .delete()
      .eq("agency_id", agencyId)
      .eq("target_type", "client")
      .eq("target_id", clientId)
      .select("id")
  );
  if (notificationDelete.error) return { error: notificationDelete.error };
  cleanup.deletedNotificationsCount = notificationDelete.skipped ? 0 : notificationDelete.data.length;

  const affectedRoomingAssignments = Array.isArray(roomingAssignments)
    ? { data: roomingAssignments, error: null }
    : await getAffectedRoomingAssignmentsForClient(supabase, { agencyId, clientId });
  if (affectedRoomingAssignments.error) return { error: affectedRoomingAssignments.error };

  for (const assignment of affectedRoomingAssignments.data) {
    const nextRooms = cleanupRoomingValueForClient(Array.isArray(assignment.rooms) ? assignment.rooms : [], clientId);
    const nextUnassigned = cleanupRoomingValueForClient(Array.isArray(assignment.unassigned) ? assignment.unassigned : [], clientId);
    if (!jsonChanged(assignment.rooms, nextRooms) && !jsonChanged(assignment.unassigned, nextUnassigned)) continue;
    const roomingUpdate = await optionalMutation(
      "rooming cleanup update",
      supabase
        .from("rooming_assignments")
        .update({ rooms: nextRooms, unassigned: nextUnassigned })
        .eq("agency_id", agencyId)
        .eq("id", assignment.id)
        .select("id")
    );
    if (roomingUpdate.error) return { error: roomingUpdate.error };
    if (!roomingUpdate.skipped) cleanup.cleanedRoomingAssignmentsCount += 1;
  }

  const badgePhotoPath = getSafeBadgePhotoPath(client, { agencyId, clientId });
  if (badgePhotoPath) {
    const { data, error } = await supabase.storage
      .from("pilgrim-photos")
      .remove([badgePhotoPath]);
    if (error) {
      console.warn("permanent-delete-client badge photo cleanup skipped", {
        code: error.code,
        message: error.message,
      });
    } else {
      cleanup.deletedBadgePhotosCount = Array.isArray(data) ? data.length : 0;
    }
  }

  return { cleanup, error: null };
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
      return json(401, { code: "UNAUTHORIZED", success: false, deleted: false, error: "Unauthorized" });
    }
    const accessToken = authHeader.slice(7).trim();
    if (!accessToken) {
      return json(401, { code: "UNAUTHORIZED", success: false, deleted: false, error: "Unauthorized" });
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
    const dryRun = payload.dryRun === true || payload.checkOnly === true || payload.action === "check";
    const confirmed = payload.confirmPermanentDelete === true
      || payload.confirmLinkedRecords === true
      || payload.confirmed === true;
    if (!clientId || !agencyId) {
      return json(400, { code: "INVALID_REQUEST", success: false, deleted: false, error: "clientId and agencyId are required" });
    }
    if (type !== "client") {
      return json(400, { code: "UNSUPPORTED_TYPE", success: false, deleted: false, error: "Unsupported permanent delete type" });
    }

    const supabase = buildClient();
    const { data: requesterData, error: requesterError } = await supabase.auth.getUser(accessToken);
    if (requesterError || !requesterData?.user) {
      return json(401, { code: "UNAUTHORIZED", success: false, deleted: false, error: requesterError?.message || "Unauthorized" });
    }

    const { data: requesterProfile, error: profileError } = await supabase
      .from("users")
      .select("agency_id, status")
      .eq("id", requesterData.user.id)
      .single();
    if (profileError || !requesterProfile?.agency_id) {
      return json(403, { code: "UNAUTHORIZED", success: false, deleted: false, error: "Forbidden" });
    }
    if (String(requesterProfile.status || "").toLowerCase() !== "active") {
      return json(403, { code: "UNAUTHORIZED", success: false, deleted: false, error: "Inactive account" });
    }
    if (requesterProfile.agency_id !== agencyId) {
      return json(403, { code: "UNAUTHORIZED", success: false, deleted: false, error: "Forbidden" });
    }

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, agency_id, deleted, deleted_at, docs")
      .eq("id", clientId)
      .eq("agency_id", agencyId)
      .maybeSingle();
    if (clientError) {
      return json(500, { code: "FETCH_FAILED", success: false, deleted: false, error: clientError.message });
    }
    if (!client) {
      return json(404, { code: "NOT_FOUND", success: false, deleted: false, error: "Client not found" });
    }
    if (!isDeletedClient(client)) {
      return json(409, {
        code: "CLIENT_NOT_TRASHED",
        success: false,
        deleted: false,
        error: "Client must be in Trash before permanent deletion",
      });
    }
    if (!dryRun && !confirmed) {
      return json(409, {
        code: "CONFIRMATION_REQUIRED",
        success: false,
        deleted: false,
        error: CONFIRMATION_REQUIRED_MESSAGE,
      });
    }

    const [paymentResult, invoiceResult] = await Promise.all([
      supabase
        .from("payments")
        .select("id, agency_id, client_id, status, trashed_at, deleted_at")
        .eq("client_id", clientId),
      optionalSelect(
        "invoice inspection",
        supabase
          .from("invoices")
          .select("id, agency_id, client_id, status, trashed_at, deleted_at")
          .eq("client_id", clientId)
      ),
    ]);
    const { data: allPayments, error: paymentsError } = paymentResult;
    if (paymentsError) {
      return json(500, { code: "FETCH_FAILED", success: false, deleted: false, error: paymentsError.message });
    }

    const payments = Array.isArray(allPayments) ? allPayments : [];
    const linkedPayments = payments.filter((payment) => String(payment.agency_id || "") === agencyId);
    const hiddenPayments = payments.filter((payment) => String(payment.agency_id || "") !== agencyId);
    const activeLinkedPayments = linkedPayments.filter((payment) => !isInactivePayment(payment));
    const inactiveLinkedPayments = linkedPayments.filter(isInactivePayment);

    if (invoiceResult.error) {
      return json(500, { code: "FETCH_FAILED", success: false, deleted: false, error: invoiceResult.error.message });
    }
    const invoices = invoiceResult.data;
    const linkedInvoices = invoices.filter((invoice) => String(invoice.agency_id || "") === agencyId);
    const hiddenInvoices = invoices.filter((invoice) => String(invoice.agency_id || "") !== agencyId);
    const activeLinkedInvoices = linkedInvoices.filter(isActiveInvoice);
    const inactiveLinkedInvoices = linkedInvoices.filter((invoice) => !isActiveInvoice(invoice));

    const linkedRecordBlock = buildLinkedRecordBlock({
      activePayments: activeLinkedPayments,
      activeInvoices: activeLinkedInvoices,
      hiddenPayments,
      hiddenInvoices,
    });
    if (linkedRecordBlock) {
      return json(dryRun ? 200 : 409, {
        ok: dryRun,
        success: false,
        deleted: false,
        dryRun,
        blocked: true,
        canDelete: false,
        ...linkedRecordBlock,
      });
    }

    const roomingAssignmentsResult = await getAffectedRoomingAssignmentsForClient(supabase, { agencyId, clientId });
    if (roomingAssignmentsResult.error) {
      console.error("permanent-delete-client rooming inspection error", roomingAssignmentsResult.error);
      return json(500, {
        code: "SAFE_CLEANUP_CHECK_FAILED",
        success: false,
        deleted: false,
        error: LINKED_RECORDS_MESSAGE,
      });
    }
    const affectedRoomingAssignments = roomingAssignmentsResult.data;

    const cleanupPreview = await inspectSafeLinkedRecords(supabase, {
      agencyId,
      clientId,
      client,
      linkedPayments: inactiveLinkedPayments,
      linkedInvoices: inactiveLinkedInvoices,
      roomingAssignments: affectedRoomingAssignments,
    });
    if (cleanupPreview.error) {
      console.error("permanent-delete-client safe cleanup inspection error", cleanupPreview.error);
      return json(500, {
        code: "SAFE_CLEANUP_CHECK_FAILED",
        success: false,
        deleted: false,
        error: LINKED_RECORDS_MESSAGE,
      });
    }

    if (dryRun) {
      return json(200, {
        ok: true,
        success: true,
        deleted: false,
        dryRun: true,
        blocked: false,
        canDelete: true,
        code: cleanupPreview.hasSafeCleanup ? "DELETE_LINKED_RECORDS_AFTER_CONFIRMATION" : "",
        hasSafeCleanup: cleanupPreview.hasSafeCleanup,
        cleanupReasons: cleanupPreview.cleanupReasons,
        cleanupPreview: cleanupPreview.cleanupPreview,
        linkedRecords: {
          payments: {
            total: linkedPayments.length,
            active: linkedPayments.filter((payment) => !isInactivePayment(payment)).length,
            inactive: linkedPayments.filter(isInactivePayment).length,
          },
          invoices: {
            total: linkedInvoices.length,
            active: linkedInvoices.filter(isActiveInvoice).length,
            inactive: linkedInvoices.filter((invoice) => !isActiveInvoice(invoice)).length,
          },
          hiddenPayments: { total: hiddenPayments.length },
          hiddenInvoices: {
            total: hiddenInvoices.length,
            active: hiddenInvoices.filter(isActiveInvoice).length,
          },
        },
      });
    }

    const cleanupResult = await deleteLinkedRecordsForClient(supabase, {
      agencyId,
      clientId,
      client,
      linkedPayments: inactiveLinkedPayments,
      linkedInvoices: inactiveLinkedInvoices,
      roomingAssignments: affectedRoomingAssignments,
    });
    if (cleanupResult.error) {
      console.error("permanent-delete-client safe cleanup error", cleanupResult.error);
      return json(500, {
        code: "SAFE_CLEANUP_FAILED",
        success: false,
        deleted: false,
        error: LINKED_RECORDS_MESSAGE,
      });
    }

    const { data: deletedClients, error: deleteClientError } = await supabase
      .from("clients")
      .delete()
      .eq("agency_id", agencyId)
      .eq("id", clientId)
      .eq("deleted", true)
      .select("id");
    if (deleteClientError) {
      console.error("permanent-delete-client client delete error", deleteClientError);
      if (isForeignKeyError(deleteClientError)) {
        return json(409, mapForeignKeyError(deleteClientError));
      }
      return json(500, {
        code: "DELETE_FAILED",
        success: false,
        deleted: false,
        error: deleteClientError.message,
      });
    }
    if (!Array.isArray(deletedClients) || !deletedClients.length) {
      return json(404, { code: "NOT_FOUND", success: false, deleted: false, error: "Client not found" });
    }

    return json(200, {
      ok: true,
      success: true,
      deleted: true,
      deletedClientId: clientId,
      deletedLinkedRecords: cleanupResult.cleanup,
      cleanup: cleanupResult.cleanup,
      messageKey: "CLIENT_PERMANENT_DELETE_WITH_LINKED_RECORDS_SUCCESS",
    });
  } catch (err) {
    console.error("permanent-delete-client error", err);
    return json(500, { error: "Internal Server Error" });
  }
};
