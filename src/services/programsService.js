import { db } from "../lib/db";

export function fetchPrograms(agencyId) {
  return db.programs.fetchAll(agencyId);
}

export function saveProgram(program, agencyId) {
  return db.programs.upsert(program, agencyId);
}

export function deleteProgram(id, agencyId) {
  return db.programs.delete(id, agencyId);
}
