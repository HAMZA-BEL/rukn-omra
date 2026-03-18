import { db } from "../lib/db";

export function fetchClients(agencyId) {
  return db.clients.fetchAll(agencyId);
}

export function fetchDeletedClients(agencyId) {
  return db.clients.fetchDeleted(agencyId);
}

export function saveClient(client, agencyId) {
  return db.clients.upsert(client, agencyId);
}

export function deleteClient(id, agencyId) {
  return db.clients.delete(id, agencyId);
}

export function markClientsDeleted(ids, agencyId, batchId) {
  return db.clients.markDeleted(ids, agencyId, batchId);
}

export function restoreClients(ids, agencyId) {
  return db.clients.restore(ids, agencyId);
}

export function deleteClientsPermanent(ids, agencyId) {
  return db.clients.deleteMany(ids, agencyId);
}
