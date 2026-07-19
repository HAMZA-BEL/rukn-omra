import fs from "fs";
import path from "path";
import {
  canAgencyUseRukn,
  getAgencyAccessError,
  resolveAgencyAccessError,
} from "./agencyAccess";

test("only active agencies can use Rukn", () => {
  expect(canAgencyUseRukn("active")).toBe(true);
  expect(canAgencyUseRukn("suspended")).toBe(false);
  expect(canAgencyUseRukn("archived")).toBe(false);
  expect(canAgencyUseRukn(null)).toBe(false);
});

test("agency lifecycle statuses map to explicit access errors", () => {
  expect(getAgencyAccessError("suspended")).toBe("agency_suspended");
  expect(getAgencyAccessError("archived")).toBe("agency_archived");
  expect(getAgencyAccessError("active")).toBeNull();
});

test("linkage and lifecycle states stay independent", () => {
  const agency = (status) => ({ id: "agency-1", status });

  expect(resolveAgencyAccessError(null, null)).toBe("no_agency");
  expect(resolveAgencyAccessError("agency-1", null)).toBe("no_agency");
  expect(resolveAgencyAccessError("agency-1", agency("active"))).toBeNull();
  expect(resolveAgencyAccessError("agency-1", agency("suspended"))).toBe("agency_suspended");
  expect(resolveAgencyAccessError("agency-1", agency("archived"))).toBe("agency_archived");
  expect(resolveAgencyAccessError("agency-1", agency("suspended"))).not.toBe("no_agency");
  expect(resolveAgencyAccessError("agency-1", agency("archived"))).not.toBe("no_agency");
});

test("the access RPC is session-scoped and returns only the safe agency snapshot", () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/202607190002_current_agency_access_guard.sql"),
    "utf8"
  );
  const snapshotFunction = sql.split("create or replace function public.admin_set_agency_status")[0];

  expect(snapshotFunction).toContain("where u.id = auth.uid()");
  expect(snapshotFunction).toContain("'id', a.id");
  expect(snapshotFunction).toContain("'name_ar', a.name_ar");
  expect(snapshotFunction).toContain("'name_fr', a.name_fr");
  expect(snapshotFunction).toContain("'status', a.status");
  expect(snapshotFunction).not.toMatch(/p_agency_id|a\.status\s*=\s*'active'/);
});
