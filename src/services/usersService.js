import { db } from "../lib/db";

export function fetchAgencyUsers(agencyId) {
  return db.users.fetchByAgency(agencyId);
}
