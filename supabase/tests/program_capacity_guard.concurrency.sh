#!/usr/bin/env bash
set -euo pipefail

# Run only against a disposable test database after applying
# 202607200001_enforce_program_capacity.sql.
# A dedicated variable is required intentionally; DATABASE_URL is not accepted.
if [[ -z "${PROGRAM_CAPACITY_TEST_DATABASE_URL:-}" ]]; then
  echo "SKIP: set PROGRAM_CAPACITY_TEST_DATABASE_URL to an isolated test database" >&2
  exit 77
fi
if ! command -v psql >/dev/null 2>&1; then
  echo "SKIP: psql is not installed" >&2
  exit 77
fi

test_url="$PROGRAM_CAPACITY_TEST_DATABASE_URL"
work_dir="$(mktemp -d)"
agency_id="cd000000-0000-4000-8000-000000000001"
program_id="ce000000-0000-4000-8000-000000000001"
client_one_id="cf000000-0000-4000-8000-000000000001"
client_two_id="cf000000-0000-4000-8000-000000000002"

cleanup() {
  psql "$test_url" -v ON_ERROR_STOP=1 -c "delete from public.agencies where id = '$agency_id';" >/dev/null 2>&1 || true
  rm -rf "$work_dir"
}
trap cleanup EXIT

psql "$test_url" -v ON_ERROR_STOP=1 <<SQL >/dev/null
insert into public.agencies (id, name_ar) values ('$agency_id', 'capacity-concurrency-test');
insert into public.programs (id, agency_id, name, seats)
values ('$program_id', '$agency_id', 'one-seat', 1);
SQL

psql "$test_url" -v ON_ERROR_STOP=1 >"$work_dir/first.log" 2>&1 <<SQL &
begin;
insert into public.clients (id, agency_id, program_id, name)
values ('$client_one_id', '$agency_id', '$program_id', 'first');
select pg_sleep(2);
commit;
SQL
first_pid=$!

sleep 0.2
set +e
psql "$test_url" -v ON_ERROR_STOP=1 >"$work_dir/second.log" 2>&1 <<SQL
insert into public.clients (id, agency_id, program_id, name)
values ('$client_two_id', '$agency_id', '$program_id', 'second');
SQL
second_status=$?
wait "$first_pid"
first_status=$?
set -e

if [[ "$first_status" -ne 0 ]]; then
  cat "$work_dir/first.log" >&2
  echo "FAIL: the first concurrent insert did not commit" >&2
  exit 1
fi
if [[ "$second_status" -eq 0 ]] || ! grep -q "PROGRAM_CAPACITY_REACHED" "$work_dir/second.log"; then
  cat "$work_dir/second.log" >&2
  echo "FAIL: the second concurrent insert was not blocked by the capacity marker" >&2
  exit 1
fi

registered_count="$(psql "$test_url" -At -v ON_ERROR_STOP=1 -c "select count(*) from public.clients where agency_id = '$agency_id' and program_id = '$program_id' and deleted = false and deleted_at is null and archived = false and archived_at is null;")"
if [[ "$registered_count" != "1" ]]; then
  echo "FAIL: expected one registered client, got $registered_count" >&2
  exit 1
fi

echo "PASS: one concurrent insert committed, one failed with PROGRAM_CAPACITY_REACHED, count=1"
