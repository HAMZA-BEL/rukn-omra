import { getClientDisplayName } from "../clientNames";
import { ensureInvoiceRegistryItem } from "./invoiceRegistry";
import { trimInvoiceValue } from "./invoiceNumbering";
import { normalizeInvoiceRecipient, validateInvoiceRecipient } from "./invoiceValidation";

export const getInvoiceClientCin = (client = {}) => (
  trimInvoiceValue(client.cin)
  || trimInvoiceValue(client.CIN)
  || trimInvoiceValue(client.nationalId)
  || trimInvoiceValue(client.national_id)
  || trimInvoiceValue(client.passport?.cin)
  || trimInvoiceValue(client.passport?.nationalId)
);

export const calculateInvoiceTotals = ({ client = {}, payments = [] } = {}) => {
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const salePrice = client.salePrice || client.price || 0;
  const remaining = Math.max(0, salePrice - totalPaid);
  return { totalPaid, salePrice, remaining, paidInFull: remaining <= 0 };
};

export const getLatestInvoicePayment = (payments = []) => (
  [...payments].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0] || null
);

const getTodayDate = () => new Date().toISOString().slice(0, 10);

export const buildInvoiceData = ({
  client,
  program,
  payments = [],
  recipient,
  recipientType,
  companyName,
  companyIce,
  ice,
  fallbackName = "—",
  lang = "ar",
  documentType = "invoice",
} = {}) => {
  const safeClient = client || {};
  const safeProgram = program || {};
  const invoiceRecipient = normalizeInvoiceRecipient({ recipient, recipientType, companyName, companyIce, ice });
  const validation = validateInvoiceRecipient(invoiceRecipient);
  if (!validation.valid) return { valid: false, field: validation.field, recipient: invoiceRecipient };

  const clientName = getClientDisplayName(safeClient, fallbackName, lang);
  const latinName = safeClient.nameLatin && safeClient.nameLatin !== clientName ? safeClient.nameLatin : "";
  const { totalPaid, salePrice, remaining, paidInFull } = calculateInvoiceTotals({ client: safeClient, payments });
  const cin = getInvoiceClientCin(safeClient);
  const passportNo = trimInvoiceValue(safeClient.passport?.number);
  const carrier = trimInvoiceValue(safeProgram?.carrier || safeProgram?.company || safeProgram?.compagnie || safeProgram?.airline || safeProgram?.transport);
  const latestPayment = getLatestInvoicePayment(payments);
  const isProforma = documentType === "proforma";
  if (!isProforma && !paidInFull) {
    return {
      valid: false,
      field: "notPaidInFull",
      recipient: invoiceRecipient,
      totalPaid,
      salePrice,
      remaining,
      paidInFull,
    };
  }
  const invoiceItem = isProforma ? null : ensureInvoiceRegistryItem({ client: safeClient, payments, recipient: invoiceRecipient });

  return {
    valid: true,
    documentType,
    recipient: invoiceRecipient,
    clientName,
    latinName,
    totalPaid,
    salePrice,
    remaining,
    paidInFull,
    cin,
    passportNo,
    carrier,
    latestPayment,
    invoiceItem,
    invoiceNo: invoiceItem?.invoiceNumber || "",
    invoiceDate: invoiceItem?.date || getTodayDate(),
    issuedToCompany: invoiceRecipient.type === "company",
  };
};
