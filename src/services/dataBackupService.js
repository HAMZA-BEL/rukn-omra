const BACKUP_VERSION = 5;

export function buildExportPayload({
  programs = [],
  clients = [],
  payments = [],
  agency = {},
  invoices = [],
  rooming = [],
} = {}) {
  return {
    programs,
    clients,
    payments,
    agency,
    invoices,
    rooming,
    exportedAt: new Date().toISOString(),
    version: BACKUP_VERSION,
  };
}

export function parseImportPayload(raw) {
  if (!raw || typeof raw !== "object") throw new Error("ملف غير صالح");
  if (!raw.programs || !raw.clients || !raw.payments) throw new Error("ملف غير صالح");
  const safePrograms = Array.isArray(raw.programs) ? raw.programs.filter((p) => !p?.deleted) : [];
  const safeClients = Array.isArray(raw.clients) ? raw.clients.filter((c) => !c?.deleted) : [];
  const clientIds = new Set(safeClients.map((c) => c.id));
  const safePayments = Array.isArray(raw.payments)
    ? raw.payments.filter((p) => p?.clientId && clientIds.has(p.clientId))
    : [];
  return {
    programs: safePrograms,
    clients: safeClients,
    payments: safePayments,
    agency: raw.agency || null,
  };
}
