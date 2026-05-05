import { db } from "../lib/db";

export function fetchPayments(agencyId) {
  return db.payments.fetchAll(agencyId);
}

export function fetchTrashedPayments(agencyId) {
  return db.payments.fetchTrashed(agencyId);
}

export function savePayment(payment, agencyId) {
  return db.payments.upsert(payment, agencyId);
}

export function createPaymentWithReceipt(payment, agencyId) {
  return db.payments.createWithReceipt(payment, agencyId);
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
