import { getClientDisplayName } from "./clientNames";

const normalizeKey = (value) => String(value ?? "").trim().toLowerCase();

const firstText = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const getProgramId = (value = {}) => firstText(
  value.programId,
  value.program_id,
  value.program?.id,
  value.metadata?.programId,
  value.metadata?.program_id,
  value.meta?.programId,
  value.meta?.program_id
);

const getProgramName = (value = {}) => firstText(
  value.programName,
  value.program_name,
  value.program?.name,
  value.metadata?.programName,
  value.metadata?.program_name,
  value.meta?.programName,
  value.meta?.program_name
);

const getClientId = (value = {}) => firstText(
  value.clientId,
  value.client_id,
  value.metadata?.clientId,
  value.metadata?.client_id,
  value.meta?.clientId,
  value.meta?.client_id
);

const getPaymentId = (value = {}) => firstText(
  value.paymentId,
  value.payment_id,
  value.metadata?.paymentId,
  value.metadata?.payment_id,
  value.meta?.paymentId,
  value.meta?.payment_id
);

const getPaymentClientId = (payment = {}) => firstText(payment.clientId, payment.client_id);

const getActivityClientName = (activity = {}) => firstText(
  activity.clientName,
  activity.client_name,
  activity.metadata?.clientName,
  activity.metadata?.client_name,
  activity.meta?.clientName,
  activity.meta?.client_name
);

const getClientNameKeys = (client = {}) => [
  getClientDisplayName(client, ""),
  client.name,
  client.clientName,
  client.client_name,
  client.nameLatin,
  client.name_latin,
].map(normalizeKey).filter(Boolean);

const unique = (values = []) => Array.from(new Set(values.filter(Boolean)));

const buildProgramContext = (program, fallbackName = "") => {
  const id = firstText(program?.id);
  const name = firstText(program?.name, program?.nameFr, fallbackName);
  if (!id && !name) return null;
  return { id, name };
};

export const createActivityProgramResolver = ({
  clients = [],
  deletedClients = [],
  programs = [],
  deletedPrograms = [],
  payments = [],
  deletedPayments = [],
} = {}) => {
  const allPrograms = [...(programs || []), ...(deletedPrograms || [])].filter(Boolean);
  const programById = new Map();
  allPrograms.forEach((program) => {
    const id = firstText(program?.id);
    if (id && !programById.has(id)) programById.set(id, program);
  });

  const allClients = [...(clients || []), ...(deletedClients || [])].filter(Boolean);
  const clientById = new Map();
  const clientsByName = new Map();
  allClients.forEach((client) => {
    const id = firstText(client?.id);
    if (id && !clientById.has(id)) clientById.set(id, client);
    getClientNameKeys(client).forEach((key) => {
      const rows = clientsByName.get(key) || [];
      rows.push(client);
      clientsByName.set(key, rows);
    });
  });

  const allPayments = [...(payments || []), ...(deletedPayments || [])].filter(Boolean);
  const paymentById = new Map();
  allPayments.forEach((payment) => {
    const id = firstText(payment?.id);
    if (id && !paymentById.has(id)) paymentById.set(id, payment);
  });

  const programFromId = (programId, fallbackName = "") => {
    const id = firstText(programId);
    if (!id) return fallbackName ? buildProgramContext(null, fallbackName) : null;
    return buildProgramContext(programById.get(id), fallbackName);
  };

  const programFromClient = (client) => {
    const programId = getProgramId(client);
    return programFromId(programId);
  };

  const programFromClientName = (clientName) => {
    const key = normalizeKey(clientName);
    if (!key) return null;
    const matches = clientsByName.get(key) || [];
    if (!matches.length) return null;
    const programIds = unique(matches.map(getProgramId));
    if (programIds.length !== 1) return null;
    return programFromId(programIds[0]);
  };

  const programFromProgramActionDescription = (activity) => {
    const type = normalizeKey(activity?.type);
    if (!type.startsWith("program_")) return null;
    const description = normalizeKey(activity?.description);
    if (!description) return null;
    const matches = allPrograms.filter((program) => {
      const names = unique([program?.name, program?.nameFr].map(normalizeKey));
      return names.some((name) => name && description.includes(name));
    });
    const programIds = unique(matches.map((program) => firstText(program.id)));
    if (programIds.length !== 1) return null;
    return buildProgramContext(matches.find((program) => firstText(program.id) === programIds[0]));
  };

  return (activity = {}) => {
    const explicitProgramName = getProgramName(activity);
    const explicitProgramId = getProgramId(activity);
    if (explicitProgramId || explicitProgramName) {
      return programFromId(explicitProgramId, explicitProgramName);
    }

    const clientId = getClientId(activity);
    if (clientId) {
      const context = programFromClient(clientById.get(clientId));
      if (context) return context;
    }

    const paymentId = getPaymentId(activity);
    if (paymentId) {
      const payment = paymentById.get(paymentId);
      const context = programFromClient(clientById.get(getPaymentClientId(payment)));
      if (context) return context;
    }

    const clientNameContext = programFromClientName(getActivityClientName(activity));
    if (clientNameContext) return clientNameContext;

    return programFromProgramActionDescription(activity);
  };
};

export const getActivityProgramLabel = (lang = "ar", t = {}) => (
  t.program || (lang === "fr" ? "Programme" : lang === "en" ? "Program" : "البرنامج")
);
