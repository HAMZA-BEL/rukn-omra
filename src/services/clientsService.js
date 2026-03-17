import { db } from "../lib/db";

export function fetchClients(agencyId) {
  return db.clients.fetchAll(agencyId);
}

export function saveClient(client, agencyId) {
  return db.clients.upsert(client, agencyId);
}

export function deleteClient(id, agencyId) {
  return db.clients.delete(id, agencyId);
}
