import { trimInvoiceValue } from "./invoiceNumbering";

export const normalizeInvoiceRecipient = ({ recipient, recipientType, companyName, companyIce, ice } = {}) => {
  const source = recipient || {};
  const type = source.type || recipientType || "client";
  if (type !== "company") return { type: "client" };
  return {
    type: "company",
    companyName: trimInvoiceValue(source.companyName || companyName),
    ice: trimInvoiceValue(source.ice || source.companyIce || companyIce || ice),
  };
};

export const validateInvoiceRecipient = (recipient = {}) => {
  if (recipient.type !== "company") return { valid: true, field: null };
  if (!trimInvoiceValue(recipient.companyName)) return { valid: false, field: "companyName" };
  if (!trimInvoiceValue(recipient.ice)) return { valid: false, field: "ice" };
  return { valid: true, field: null };
};
