export const PAYMENT_TYPE_NORMAL = "normal";
export const PAYMENT_TYPE_PREVIOUS = "previous";

const cleanText = (value) => String(value ?? "").trim();

export const normalizePaymentType = (payment = {}) => {
  const raw = cleanText(payment.paymentType ?? payment.payment_type).toLowerCase();
  if (raw === PAYMENT_TYPE_PREVIOUS || payment.isPreviousPayment === true || payment.is_previous_payment === true) {
    return PAYMENT_TYPE_PREVIOUS;
  }
  return PAYMENT_TYPE_NORMAL;
};

export const isPreviousPaymentRecord = (payment = {}) => (
  normalizePaymentType(payment) === PAYMENT_TYPE_PREVIOUS
);

export const getLegacyReceiptNumber = (payment = {}) => cleanText(
  payment.legacyReceiptNumber
  ?? payment.legacy_receipt_number
  ?? payment.oldReceiptNumber
  ?? payment.old_receipt_number
);

export const normalizePaymentRecord = (payment = {}) => {
  const paymentType = normalizePaymentType(payment);
  const legacyReceiptNumber = getLegacyReceiptNumber(payment);
  const note = cleanText(payment.note ?? payment.notes);

  return {
    ...payment,
    paymentType,
    payment_type: paymentType,
    isPreviousPayment: paymentType === PAYMENT_TYPE_PREVIOUS,
    is_previous_payment: paymentType === PAYMENT_TYPE_PREVIOUS,
    legacyReceiptNumber,
    legacy_receipt_number: legacyReceiptNumber,
    note,
    notes: note,
  };
};
