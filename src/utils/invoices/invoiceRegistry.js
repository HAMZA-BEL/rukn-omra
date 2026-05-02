import {
  buildInvoiceKey,
  getInvoiceIssueDate,
  getInvoiceYear,
  latestIssuedDateForYear,
  latestPaymentForInvoice,
  nextInvoiceSequence,
  padInvoiceSequence,
  toPositiveInt,
  trimInvoiceValue,
} from "./invoiceNumbering";

export const INVOICE_REGISTRY_KEY = "rukn_invoice_registry_v1";

export const readInvoiceRegistry = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(INVOICE_REGISTRY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const writeInvoiceRegistry = (registry) => {
  try {
    window.localStorage.setItem(INVOICE_REGISTRY_KEY, JSON.stringify(registry));
  } catch {
    /* Printing should not fail if localStorage is unavailable. */
  }
};

export const findExistingInvoiceRecord = (registry, invoiceKey) => (
  registry.find((item) => item.invoiceKey === invoiceKey && item.status !== "cancelled")
);

export const ensureInvoiceRegistryItem = ({ client, payments = [], recipient = {} }) => {
  const registry = readInvoiceRegistry();
  const invoiceKey = buildInvoiceKey({ client, payments, recipient });
  const existing = findExistingInvoiceRecord(registry, invoiceKey);
  if (existing?.invoiceNumber) return existing;

  const requestedDate = getInvoiceIssueDate(payments);
  const storedInvoiceNumber = trimInvoiceValue(
    client?.invoiceDisplayNumber
    || client?.invoiceNumberDisplay
    || payments.find((payment) => trimInvoiceValue(payment?.invoiceDisplayNumber || payment?.invoiceNumberDisplay))
      ?.invoiceDisplayNumber
    || payments.find((payment) => trimInvoiceValue(payment?.invoiceDisplayNumber || payment?.invoiceNumberDisplay))
      ?.invoiceNumberDisplay
  );
  if (storedInvoiceNumber) {
    const storedYear = storedInvoiceNumber.match(/\/(\d{4})$/)?.[1] || getInvoiceYear([{ date: requestedDate }]);
    const item = {
      invoiceKey,
      invoiceNumber: storedInvoiceNumber,
      year: storedYear,
      date: requestedDate,
      status: "issued",
      paymentId: latestPaymentForInvoice(payments)?.id || null,
      clientId: client?.id || null,
      recipientType: recipient.type || "client",
      companyName: recipient.companyName || "",
      ice: recipient.ice || "",
      createdAt: new Date().toISOString(),
      cancelledAt: null,
    };
    writeInvoiceRegistry([...registry, item]);
    return item;
  }

  const requestedYear = getInvoiceYear([{ date: requestedDate }]);
  const latestDate = latestIssuedDateForYear(registry, requestedYear);
  const date = latestDate && requestedDate < latestDate ? latestDate : requestedDate;
  const year = getInvoiceYear([{ date }]);
  const reusableCancelled = registry.find((item) => (
    String(item.year) === String(year)
    && item.status === "cancelled"
    && item.date === date
    && !registry.some((other) => other.status !== "cancelled" && other.invoiceNumber === item.invoiceNumber && String(other.year) === String(year))
  ));
  const sequence = reusableCancelled ? toPositiveInt(reusableCancelled.invoiceNumber) : nextInvoiceSequence(registry, year);
  const invoiceNumber = `${padInvoiceSequence(sequence)}/${year}`;
  const item = {
    invoiceKey,
    invoiceNumber,
    year,
    date,
    status: "issued",
    paymentId: latestPaymentForInvoice(payments)?.id || null,
    clientId: client?.id || null,
    recipientType: recipient.type || "client",
    companyName: recipient.companyName || "",
    ice: recipient.ice || "",
    createdAt: new Date().toISOString(),
    cancelledAt: null,
  };
  writeInvoiceRegistry([...registry, item]);
  return item;
};

export const cancelInvoiceInRegistry = (invoiceNumber, year) => {
  const registry = readInvoiceRegistry();
  const next = registry.map((item) => (
    item.invoiceNumber === invoiceNumber && String(item.year) === String(year) && item.status !== "cancelled"
      ? { ...item, status: "cancelled", cancelledAt: new Date().toISOString() }
      : item
  ));
  writeInvoiceRegistry(next);
};
