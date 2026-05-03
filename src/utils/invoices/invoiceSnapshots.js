import { trimInvoiceValue } from "./invoiceNumbering";

export const SAVED_INVOICES_KEY = "rukn_saved_invoices_v1";

const nowIso = () => new Date().toISOString();

const safeAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const invoiceYearFromDisplay = (displayNumber = "") => {
  const match = trimInvoiceValue(displayNumber).match(/\/(\d{4})$/);
  return match?.[1] || String(new Date().getFullYear());
};

const paymentReferenceSnapshot = (payment = {}) => ({
  receiptNumber: trimInvoiceValue(payment.receiptNo || payment.receiptNumber),
  date: trimInvoiceValue(payment.date),
  amount: safeAmount(payment.amount),
  method: trimInvoiceValue(payment.method),
  chequeNumber: trimInvoiceValue(payment.chequeNumber),
  paidBy: trimInvoiceValue(payment.paidBy),
});

const normalizeInvoiceStatus = (status) => (
  status === "trashed" || status === "deleted" ? status : "issued"
);

export const readSavedInvoices = () => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return [];
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_INVOICES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(normalizeSavedInvoice).filter(Boolean) : [];
  } catch {
    return [];
  }
};

export const writeSavedInvoices = (invoices = []) => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(SAVED_INVOICES_KEY, JSON.stringify(invoices.filter(Boolean)));
  } catch {
    /* Invoice printing should not fail if localStorage is unavailable. */
  }
};

export const normalizeSavedInvoice = (invoice = {}) => {
  const invoiceDisplayNumber = trimInvoiceValue(invoice.invoiceDisplayNumber || invoice.invoiceNumber);
  if (!invoiceDisplayNumber) return null;
  const recipientSnapshot = invoice.recipientSnapshot || {};
  const programSnapshot = invoice.programSnapshot || {};
  const amountSnapshot = invoice.amountSnapshot || {};
  return {
    id: trimInvoiceValue(invoice.id) || trimInvoiceValue(invoice.invoiceKey) || invoiceDisplayNumber,
    invoiceKey: trimInvoiceValue(invoice.invoiceKey),
    invoiceNumber: trimInvoiceValue(invoice.invoiceNumber) || invoiceDisplayNumber,
    invoiceDisplayNumber,
    year: String(invoice.year || invoiceYearFromDisplay(invoiceDisplayNumber)),
    issueDate: trimInvoiceValue(invoice.issueDate || invoice.date),
    status: normalizeInvoiceStatus(invoice.status),
    clientId: trimInvoiceValue(invoice.clientId),
    programId: trimInvoiceValue(invoice.programId),
    recipientType: invoice.recipientType === "company" ? "company" : "client",
    recipientSnapshot: {
      name: trimInvoiceValue(recipientSnapshot.name),
      clientName: trimInvoiceValue(recipientSnapshot.clientName || recipientSnapshot.name),
      latinName: trimInvoiceValue(recipientSnapshot.latinName),
      phone: trimInvoiceValue(recipientSnapshot.phone),
      cin: trimInvoiceValue(recipientSnapshot.cin),
      passportNumber: trimInvoiceValue(recipientSnapshot.passportNumber),
      companyName: trimInvoiceValue(recipientSnapshot.companyName),
      ice: trimInvoiceValue(recipientSnapshot.ice),
    },
    programSnapshot: {
      programName: trimInvoiceValue(programSnapshot.programName),
      departureDate: trimInvoiceValue(programSnapshot.departureDate),
      returnDate: trimInvoiceValue(programSnapshot.returnDate),
      level: trimInvoiceValue(programSnapshot.level),
      roomType: trimInvoiceValue(programSnapshot.roomType),
      carrier: trimInvoiceValue(programSnapshot.carrier),
    },
    amountSnapshot: {
      total: safeAmount(amountSnapshot.total),
      currency: trimInvoiceValue(amountSnapshot.currency) || "MAD",
    },
    paymentReferences: Array.isArray(invoice.paymentReferences)
      ? invoice.paymentReferences.map(paymentReferenceSnapshot)
      : [],
    createdAt: trimInvoiceValue(invoice.createdAt) || nowIso(),
    trashedAt: trimInvoiceValue(invoice.trashedAt),
    deletedAt: trimInvoiceValue(invoice.deletedAt),
  };
};

export const findSavedInvoiceSnapshot = ({ invoiceKey, invoiceDisplayNumber, invoiceNumber } = {}) => {
  const key = trimInvoiceValue(invoiceKey);
  const displayNumber = trimInvoiceValue(invoiceDisplayNumber || invoiceNumber);
  return readSavedInvoices().find((invoice) => (
    (key && invoice.invoiceKey === key)
    || (displayNumber && invoice.invoiceDisplayNumber === displayNumber)
  )) || null;
};

export const createInvoiceSnapshotDraft = ({
  invoiceData = {},
  client = {},
  program = {},
  payments = [],
} = {}) => {
  const recipient = invoiceData.recipient || {};
  const issuedToCompany = recipient.type === "company";
  const companyName = trimInvoiceValue(recipient.companyName);
  const ice = trimInvoiceValue(recipient.ice);
  const clientName = trimInvoiceValue(invoiceData.clientName);
  const recipientName = issuedToCompany ? companyName : clientName;

  return {
    invoiceKey: trimInvoiceValue(invoiceData.invoiceItem?.invoiceKey),
    issueDate: trimInvoiceValue(invoiceData.invoiceDate),
    clientId: trimInvoiceValue(client?.id),
    programId: trimInvoiceValue(client?.programId || program?.id),
    recipientType: issuedToCompany ? "company" : "client",
    recipientSnapshot: {
      name: recipientName,
      clientName,
      latinName: trimInvoiceValue(invoiceData.latinName),
      phone: trimInvoiceValue(client?.phone),
      cin: trimInvoiceValue(invoiceData.cin),
      passportNumber: trimInvoiceValue(invoiceData.passportNo),
      companyName,
      ice,
    },
    programSnapshot: {
      programName: trimInvoiceValue(program?.name),
      departureDate: trimInvoiceValue(program?.departure),
      returnDate: trimInvoiceValue(program?.returnDate),
      level: trimInvoiceValue(client?.packageLevel || client?.hotelLevel),
      roomType: trimInvoiceValue(client?.roomType || client?.roomTypeLabel),
      carrier: trimInvoiceValue(invoiceData.carrier),
    },
    amountSnapshot: {
      total: safeAmount(invoiceData.salePrice),
      currency: "MAD",
    },
    paymentReferences: payments.map(paymentReferenceSnapshot),
  };
};

export const createInvoiceSnapshot = ({
  invoiceData = {},
  client = {},
  program = {},
  payments = [],
} = {}) => {
  const invoiceItem = invoiceData.invoiceItem || {};
  const invoiceDisplayNumber = trimInvoiceValue(invoiceData.invoiceNo || invoiceItem.invoiceNumber);
  if (!invoiceDisplayNumber) return null;
  const recipient = invoiceData.recipient || {};
  const issuedToCompany = recipient.type === "company";
  const invoiceKey = trimInvoiceValue(invoiceItem.invoiceKey || invoiceData.invoiceKey);
  const draft = createInvoiceSnapshotDraft({ invoiceData, client, program, payments });

  return normalizeSavedInvoice({
    id: invoiceKey || `invoice:${invoiceDisplayNumber}:${client?.id || "client"}:${issuedToCompany ? "company" : "client"}`,
    invoiceKey,
    invoiceNumber: invoiceDisplayNumber,
    invoiceDisplayNumber,
    year: String(invoiceItem.year || invoiceYearFromDisplay(invoiceDisplayNumber)),
    issueDate: trimInvoiceValue(invoiceData.invoiceDate || invoiceItem.date || draft.issueDate),
    status: "issued",
    clientId: draft.clientId,
    programId: draft.programId,
    recipientType: draft.recipientType,
    recipientSnapshot: draft.recipientSnapshot,
    programSnapshot: draft.programSnapshot,
    amountSnapshot: draft.amountSnapshot,
    paymentReferences: draft.paymentReferences,
    createdAt: nowIso(),
    trashedAt: "",
    deletedAt: "",
  });
};

export const ensureSavedFinalInvoiceSnapshot = (payload = {}) => {
  const invoiceData = payload.invoiceData || {};
  const existing = findSavedInvoiceSnapshot({
    invoiceKey: invoiceData.invoiceItem?.invoiceKey,
    invoiceDisplayNumber: invoiceData.invoiceNo,
  });
  if (existing) return existing;

  const snapshot = createInvoiceSnapshot(payload);
  return saveSavedInvoiceSnapshot(snapshot);
};

export const saveSavedInvoiceSnapshot = (snapshot) => {
  const normalized = normalizeSavedInvoice(snapshot);
  if (!normalized) return null;
  const existing = findSavedInvoiceSnapshot({
    invoiceKey: normalized.invoiceKey,
    invoiceDisplayNumber: normalized.invoiceDisplayNumber,
  });
  if (existing) return existing;
  const invoices = readSavedInvoices();
  writeSavedInvoices([...invoices, normalized]);
  return normalized;
};

export const savedInvoiceSnapshotToPrintData = (snapshot = {}) => {
  const invoice = normalizeSavedInvoice(snapshot);
  if (!invoice) return null;
  const recipient = invoice.recipientSnapshot;
  const program = invoice.programSnapshot;
  const latestPayment = [...invoice.paymentReferences]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0] || null;
  const clientName = recipient.clientName || recipient.name;
  return {
    valid: true,
    documentType: "invoice",
    recipient: invoice.recipientType === "company"
      ? { type: "company", companyName: recipient.companyName, ice: recipient.ice }
      : { type: "client" },
    clientName,
    latinName: recipient.latinName,
    phone: recipient.phone,
    totalPaid: invoice.amountSnapshot.total,
    salePrice: invoice.amountSnapshot.total,
    remaining: 0,
    paidInFull: true,
    cin: recipient.cin,
    passportNo: recipient.passportNumber,
    carrier: program.carrier,
    programName: program.programName,
    departureDate: program.departureDate,
    returnDate: program.returnDate,
    level: program.level,
    roomType: program.roomType,
    latestPayment: latestPayment ? {
      receiptNo: latestPayment.receiptNumber,
      date: latestPayment.date,
      amount: latestPayment.amount,
      method: latestPayment.method,
      chequeNumber: latestPayment.chequeNumber,
      paidBy: latestPayment.paidBy,
    } : null,
    invoiceItem: {
      invoiceKey: invoice.invoiceKey,
      invoiceNumber: invoice.invoiceDisplayNumber,
      year: invoice.year,
      date: invoice.issueDate,
      status: invoice.status,
      clientId: invoice.clientId,
      recipientType: invoice.recipientType,
      companyName: recipient.companyName,
      ice: recipient.ice,
    },
    invoiceNo: invoice.invoiceDisplayNumber,
    invoiceDate: invoice.issueDate,
    issuedToCompany: invoice.recipientType === "company",
  };
};

export const trashSavedInvoiceSnapshot = (id) => {
  const targetId = trimInvoiceValue(id);
  const invoices = readSavedInvoices();
  const next = invoices.map((invoice) => (
    invoice.id === targetId
      ? { ...invoice, status: "trashed", trashedAt: nowIso() }
      : invoice
  ));
  writeSavedInvoices(next);
  return next;
};

export const restoreSavedInvoiceSnapshot = (id) => {
  const targetId = trimInvoiceValue(id);
  const invoices = readSavedInvoices();
  const next = invoices.map((invoice) => (
    invoice.id === targetId
      ? { ...invoice, status: "issued", trashedAt: "" }
      : invoice
  ));
  writeSavedInvoices(next);
  return next;
};

export const deleteSavedInvoiceSnapshot = (id) => {
  const targetId = trimInvoiceValue(id);
  const next = readSavedInvoices().filter((invoice) => invoice.id !== targetId);
  writeSavedInvoices(next);
  return next;
};
