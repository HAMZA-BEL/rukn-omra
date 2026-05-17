import { db } from "../lib/db";

export function fetchClients(agencyId) {
  return db.clients.fetchAll(agencyId);
}

export function fetchClientsPage(agencyId, options) {
  return db.clients.fetchPage(agencyId, options);
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

export function archiveClientRecord(clientId, agencyId, archivedAt) {
  return db.clients.archiveRecord(clientId, agencyId, archivedAt);
}

export function restoreClientRecord(clientId, agencyId) {
  return db.clients.restoreRecord(clientId, agencyId);
}

export function deleteClientsPermanent(ids, agencyId) {
  return db.clients.deleteMany(ids, agencyId);
}
