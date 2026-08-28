#!/usr/bin/env bash
# SPEC-M12 §1 — the ONE command: 8 golden-path E2E specs against an isolated
# database copy (db/e2e.db) on a dedicated dev server (:3100).
#
#   bash scripts/e2e.sh            # full suite
#   bash scripts/e2e.sh 03         # subset: specs matching "03"
#
# CRITICAL: DATABASE_URL is EXPORTED for the whole playwright process tree —
# globalSetup's posting-service imports (src/lib/db → PrismaClient) resolve
# the env at client construction; without this export they would silently
# seed the DEV database (.env default) instead of the disposable copy. That
# exact leak happened during bring-up and needed e2e_cleanup_devdb.ts.
#
# RAM note (PITFALLS #34): the run adds one dev server (~1 GB while compiling)
# + one Chromium to the box's load. If the box is starved (system :3000 server
# grown fat after a long session), stop it for the duration of this run:
#   pkill -f "next dev" ; bash scripts/e2e.sh
# (the system server has no watchdog; nothing auto-restarts it — your call).
set -uo pipefail
cd "$(dirname "$0")/.."

DEV_DB="/home/z/my-project/db/custom.db"
E2E_DB_URL="file:/home/z/my-project/db/e2e.db"

# guard 1: the disposable copy's PARENT must exist and be non-empty
if [[ ! -s "$DEV_DB" ]]; then
  echo "FATAL: db/custom.db missing/empty — nothing to copy (the dev DB is the seed source)" >&2
  exit 1
fi

# guard 2: the playwright package
if ! [[ -d node_modules/@playwright/test ]]; then
  echo "FATAL: @playwright/test not installed — run: bun add -d @playwright/test@1.62.1" >&2
  exit 1
fi

# guard 3: the isolation contract (SPEC-M12 §5 gate 2) — checksum the dev DB
# before and after; any mutation fails the run loudly.
DEV_DB_MD5_BEFORE=$(md5sum "$DEV_DB" | awk '{print $1}')
trap 'DEV_DB_MD5_AFTER=$(md5sum "$DEV_DB" | awk "{print \$1}"); if [[ "$DEV_DB_MD5_AFTER" != "$DEV_DB_MD5_BEFORE" ]]; then echo "FATAL: db/custom.db CHANGED during the E2E run ($DEV_DB_MD5_BEFORE → $DEV_DB_MD5_AFTER) — isolation violated" >&2; fi' EXIT

# THE fix: the whole playwright tree (globalSetup + its service imports +
# the specs' process) must resolve DATABASE_URL to the disposable copy.
export DATABASE_URL="$E2E_DB_URL"

# browsers: chromium v1234 ships with playwright 1.62.1 and is already cached
# at ~/.cache/ms-playwright — no download on this box. A fresh environment
# would need: npx playwright install chromium

FILTER="${1:-}"
if [[ -n "$FILTER" ]]; then
  npx playwright test --grep "$FILTER"
else
  npx playwright test
fi
RC=$?

# post-run isolation check (before the trap fires its own)
DEV_DB_MD5_AFTER=$(md5sum "$DEV_DB" | awk '{print $1}')
if [[ "$DEV_DB_MD5_AFTER" != "$DEV_DB_MD5_BEFORE" ]]; then
  echo "FATAL: db/custom.db CHANGED during the E2E run ($DEV_DB_MD5_BEFORE → $DEV_DB_MD5_AFTER) — isolation violated" >&2
  exit 1
fi
echo "[e2e] isolation check OK — db/custom.db untouched ($DEV_DB_MD5_AFTER)"
exit $RC
