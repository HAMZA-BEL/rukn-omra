import { db } from "../lib/db";

export function fetchPayments(agencyId) {
  return db.payments.fetchAll(agencyId);
}

export function savePayment(payment, agencyId) {
  return db.payments.upsert(payment, agencyId);
}

export function deletePayment(id, agencyId) {
  return db.payments.delete(id, agencyId);
}
