export const trimInvoiceValue = (value) => (typeof value === "string" ? value.trim() : "");

export const toPositiveInt = (value) => {
  const parsed = Number.parseInt(String(value ?? "").replace(/\D+/g, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const padInvoiceSequence = (value) => String(Math.max(1, Number(value) || 1)).padStart(4, "0");

export const latestPaymentForInvoice = (payments = []) => (
  [...payments].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0] || null
);

export const getInvoiceYear = (payments = []) => {
  const dated = [...payments]
    .map((payment) => trimInvoiceValue(payment?.date))
    .find(Boolean);
  if (dated) {
    const match = dated.match(/^(\d{4})/);
    if (match) return match[1];
    const parsed = new Date(dated);
    if (!Number.isNaN(parsed.getTime())) return String(parsed.getFullYear());
  }
  return String(new Date().getFullYear());
};

export const getInvoiceIssueDate = (payments = []) => {
  const latest = latestPaymentForInvoice(payments);
  const rawDate = trimInvoiceValue(latest?.date) || new Date().toISOString().slice(0, 10);
  const match = rawDate.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
};

export const invoiceRecipientKey = (recipient = {}) => (
  recipient.type === "company"
    ? `company:${trimInvoiceValue(recipient.companyName)}:${trimInvoiceValue(recipient.ice)}`
    : "client"
);

export const buildInvoiceKey = ({ client, payments = [], recipient = {} }) => {
  const latest = latestPaymentForInvoice(payments);
  return [
    "invoice",
    client?.id || "unknown-client",
    latest?.id || "no-payment",
    invoiceRecipientKey(recipient),
  ].join(":");
};

export const nextInvoiceSequence = (registry, year) => {
  const maxSeq = registry
    .filter((item) => String(item.year) === String(year))
    .map((item) => toPositiveInt(item.invoiceNumber))
    .filter((value) => value !== null)
    .reduce((max, value) => Math.max(max, value), 0);
  return maxSeq + 1;
};

export const latestIssuedDateForYear = (registry, year) => (
  registry
    .filter((item) => String(item.year) === String(year) && item.status !== "cancelled")
    .map((item) => trimInvoiceValue(item.date))
    .filter(Boolean)
    .sort()
    .pop() || ""
);
