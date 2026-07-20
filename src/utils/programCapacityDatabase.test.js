import fs from "fs";
import path from "path";
import {
  PROGRAM_CAPACITY_BELOW_REGISTRATION,
  PROGRAM_CAPACITY_REACHED,
  getProgramCapacityDatabaseErrorCode,
  getProgramCapacityDatabaseErrorMessage,
  getProgramCapacityInfo,
  isCapacityActiveClient,
  normalizeProgramCapacityDatabaseError,
} from "./programCapacity";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/202607200001_enforce_program_capacity.sql"
);
const migrationSql = fs.readFileSync(migrationPath, "utf8");

describe("program capacity database guard contract", () => {
  test("serializes every seat-consuming client write on the target program", () => {
    expect(migrationSql).toMatch(/before insert or update of[\s\S]*on public\.clients/i);
    expect(migrationSql).toMatch(/from public\.programs p[\s\S]*for update;/i);
    expect(migrationSql).toContain("PROGRAM_CAPACITY_REACHED");
    expect(migrationSql).toMatch(/c\.id <> new\.id/i);
  });

  test("uses the existing active-client rule for counts", () => {
    expect(migrationSql).toMatch(/coalesce\(c\.deleted, false\) = false/i);
    expect(migrationSql).toMatch(/c\.deleted_at is null/i);
    expect(migrationSql).toMatch(/coalesce\(c\.archived, false\) = false/i);
    expect(migrationSql).toMatch(/c\.archived_at is null/i);
  });

  test("blocks lowering seats below registrations and preserves unlimited capacity", () => {
    expect(migrationSql).toMatch(/before update of seats[\s\S]*on public\.programs/i);
    expect(migrationSql).toContain("PROGRAM_CAPACITY_BELOW_REGISTRATION");
    expect(migrationSql).toMatch(/if new\.seats is null or new\.seats <= 0 then/i);
    expect(migrationSql).toMatch(/if new\.seats is not distinct from old\.seats then/i);
  });

  test("aborts before installing guards when existing data is over capacity", () => {
    const preflightIndex = migrationSql.indexOf("PROGRAM_CAPACITY_PREFLIGHT_FAILED");
    const triggerIndex = migrationSql.indexOf("create trigger clients_program_capacity_guard");
    expect(preflightIndex).toBeGreaterThan(-1);
    expect(triggerIndex).toBeGreaterThan(preflightIndex);
    expect(migrationSql).toMatch(/having count\(c\.id\) > p\.seats/i);
  });
});

describe("program capacity database errors", () => {
  test("recognizes stable markers from Supabase error fields", () => {
    expect(getProgramCapacityDatabaseErrorCode({
      code: "P0001",
      message: PROGRAM_CAPACITY_REACHED,
    })).toBe(PROGRAM_CAPACITY_REACHED);
    expect(getProgramCapacityDatabaseErrorCode({
      details: PROGRAM_CAPACITY_BELOW_REGISTRATION,
    })).toBe(PROGRAM_CAPACITY_BELOW_REGISTRATION);
  });

  test("returns safe Arabic messages without PostgreSQL details", () => {
    expect(getProgramCapacityDatabaseErrorMessage(PROGRAM_CAPACITY_REACHED, "ar"))
      .toBe("اكتملت سعة هذا البرنامج ولا يمكن إضافة معتمر آخر.");
    expect(getProgramCapacityDatabaseErrorMessage(PROGRAM_CAPACITY_BELOW_REGISTRATION, "ar"))
      .toBe("لا يمكن خفض سعة البرنامج إلى أقل من عدد المعتمرين المسجلين.");
  });

  test("normalizes the error while retaining its PostgreSQL code separately", () => {
    const error = normalizeProgramCapacityDatabaseError({
      code: "P0001",
      message: PROGRAM_CAPACITY_REACHED,
      details: "program_id=secret capacity=1 registered_count=1",
    });
    expect(error.code).toBe(PROGRAM_CAPACITY_REACHED);
    expect(error.postgresCode).toBe("P0001");
    expect(error.message).toBe("اكتملت سعة هذا البرنامج ولا يمكن إضافة معتمر آخر.");
  });
});

describe("existing client-side capacity semantics remain unchanged", () => {
  test("the final seat is allowed and the following seat is rejected", () => {
    const program = { id: "program-1", seats: 2 };
    const clients = [{ id: "one", programId: "program-1" }];
    expect(getProgramCapacityInfo(program, clients, 1).canAddRequested).toBe(true);
    expect(getProgramCapacityInfo(program, clients, 2).canAddRequested).toBe(false);
  });

  test("archived and deleted clients do not consume seats", () => {
    expect(isCapacityActiveClient({ archived: true })).toBe(false);
    expect(isCapacityActiveClient({ archivedAt: "2026-07-20T00:00:00Z" })).toBe(false);
    expect(isCapacityActiveClient({ deleted: true })).toBe(false);
    expect(isCapacityActiveClient({ status: "trashed" })).toBe(false);
    expect(isCapacityActiveClient({})).toBe(true);
  });

  test("zero and null retain the existing unlimited meaning", () => {
    expect(getProgramCapacityInfo({ seats: 0 }, 100, 1).canAddRequested).toBe(true);
    expect(getProgramCapacityInfo({ seats: null }, 100, 1).canAddRequested).toBe(true);
  });
});
