import { db } from "../lib/db";

export function fetchPrograms(agencyId) {
  return db.programs.fetchAll(agencyId);
}

export function fetchDeletedPrograms(agencyId) {
  return db.programs.fetchDeleted(agencyId);
}

export function saveProgram(program, agencyId) {
  return db.programs.upsert(program, agencyId);
}

export function deleteProgram(id, agencyId) {
  return db.programs.delete(id, agencyId);
}

export function markProgramDeleted(id, agencyId, batchId) {
  return db.programs.markDeleted(id, agencyId, batchId);
}

export function archiveProgramRecord(programId, agencyId) {
  return db.programs.archiveRecord(programId, agencyId);
}

export function restoreProgramRecord(programId, agencyId) {
  return db.programs.restoreRecord(programId, agencyId);
}

export function restoreProgram(id, agencyId) {
  return db.programs.restore(id, agencyId);
}

export function deleteProgramsPermanent(ids, agencyId) {
  return db.programs.deleteMany(ids, agencyId);
}

export function fetchProgramTravelGroups(agencyId, programId) {
  return db.programTravelGroups.fetchByProgram(agencyId, programId);
}

export function createProgramTravelGroup(group, agencyId) {
  return db.programTravelGroups.create(group, agencyId);
}

export function updateProgramTravelGroup(group, agencyId) {
  return db.programTravelGroups.update(group, agencyId);
}

export function deleteProgramTravelGroup(id, agencyId) {
  return db.programTravelGroups.delete(id, agencyId);
}
