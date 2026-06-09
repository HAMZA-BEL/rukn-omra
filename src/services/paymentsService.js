import { db } from "../lib/db";
import { isPreviousPaymentRecord } from "../utils/paymentRecords";

export function fetchPayments(agencyId) {
  return db.payments.fetchAll(agencyId);
}

export function fetchTrashedPayments(agencyId) {
  return db.payments.fetchTrashed(agencyId);
}

export function savePayment(payment, agencyId) {
  if (isPreviousPaymentRecord(payment)) return db.payments.createPrevious(payment, agencyId);
  return db.payments.upsert(payment, agencyId);
}

export function createPaymentWithReceipt(payment, agencyId) {
  return db.payments.createWithReceipt(payment, agencyId);
}

export function createPreviousPayment(payment, agencyId) {
  return db.payments.createPrevious(payment, agencyId);
}

export function createSharedReceipt(payload, agencyId) {
  return db.payments.createSharedReceipt(payload, agencyId);
}

export function fetchPaymentGroup(id, agencyId) {
  return db.payments.fetchPaymentGroup(id, agencyId);
}

export function deletePayment(id, agencyId) {
  return db.payments.delete(id, agencyId);
}

export function restorePayment(id, agencyId) {
  return db.payments.restore(id, agencyId);
}

export function deleteTrashedPayment(id, agencyId) {
  return db.payments.deleteTrashed(id, agencyId);
}
