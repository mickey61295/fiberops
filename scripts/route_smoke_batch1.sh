#!/bin/bash
# ============== ROUTE SMOKE — OPS BATCH 1 (SPEC-M37) ==============
# Live-server checks for the ops-trust batch:
#   1. money/inventory screens still render (IST sweep touched their services)
#   2. the ledger-family doc screens render (docKey writers)
#   3. digest page renders (new ops section)
#   4. WAL is live on the production DB (OPS-02)
#   5. docKey unique index + IdempotencyKey table exist (OPS-04/05)
#   6. the live DB has docKey backfilled on the GT out-legs (OPS-05)
# Auth: smoke@fiberops.test (the pinned e2e admin fixture path — scripts/lib/api-auth.mjs)
set -e
cd "$(dirname "$0")/.."
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  OK    $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  FAIL  $1"; }

BASE="http://localhost:3000"
if ! curl -s -o /dev/null --max-time 5 "$BASE/"; then
  echo "dev server not running on :3000 — start it first (npm run dev)"
  exit 1
fi

# ── 1. auth (the batch-0 cookie-jar pattern) ──
JAR=$(mktemp)
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
if echo "$body" | grep -q '"ok":true'; then ok "admin login"; else bad "admin login: $body"; fi
AUTH=(-b "$JAR")

# ── 2. screens touched by the IST sweep + docKey writers render ──
for path in "/accounts/payments" "/inventory/adjustment" "/inventory/transfer" \
            "/inventory/rolls" "/cutting/ready-to-cut" "/notifications/digest" \
            "/hr/attendance" "/production/entry" "/inventory/stock"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${AUTH[@]}" "$BASE$path")
  if [ "$code" = "200" ]; then ok "GET $path"; else bad "GET $path → $code"; fi
done

# ── 3. digest carries the ops section ──
BODY=$(curl -s --max-time 15 "${AUTH[@]}" "$BASE/notifications/digest")
if echo "$BODY" | grep -q "data growth"; then ok "digest shows the ops & data-growth section"; else bad "digest ops section missing"; fi
if echo "$BODY" | grep -qi "backup:"; then ok "digest reports backup status"; else bad "digest backup status missing"; fi

# ── 4. WAL live on the production DB ──
MODE=$(python3 -c "
import sqlite3
con = sqlite3.connect('file:db/custom.db?mode=ro', uri=True)
print(con.execute('PRAGMA journal_mode').fetchone()[0])
con.close()")
if [ "$MODE" = "wal" ]; then ok "custom.db journal_mode = wal (OPS-02)"; else bad "custom.db journal_mode = $MODE (want wal)"; fi

# ── 5. schema artifacts ──
ART=$(python3 -c "
import sqlite3
con = sqlite3.connect('file:db/custom.db?mode=ro', uri=True)
cur = con.cursor()
idx = cur.execute(\"SELECT name FROM sqlite_master WHERE type='index' AND name='StockLedger_docKey_key'\").fetchone()
tbl = cur.execute(\"SELECT name FROM sqlite_master WHERE type='table' AND name='IdempotencyKey'\").fetchone()
print('yes' if idx and tbl else 'no')
con.close()")
if [ "$ART" = "yes" ]; then ok "StockLedger.docKey unique index + IdempotencyKey table live"; else bad "schema artifacts missing"; fi

# ── 6. docKey backfill on the existing GT/RSP pairs ──
BF=$(python3 -c "
import sqlite3
con = sqlite3.connect('file:db/custom.db?mode=ro', uri=True)
n = con.execute(\"SELECT COUNT(*) FROM StockLedger WHERE docKey IS NOT NULL\").fetchone()[0]
gt = con.execute(\"SELECT COUNT(DISTINCT docNo) FROM StockLedger WHERE docNo LIKE 'GT-%'\").fetchone()[0]
rsp = con.execute(\"SELECT COUNT(DISTINCT docNo) FROM StockLedger WHERE docNo LIKE 'RSP-%'\").fetchone()[0]
print(f'{n} {gt} {rsp}')
con.close()")
DOCVALUES=$(echo $BF | cut -d' ' -f1); GT=$(echo $BF | cut -d' ' -f2); RSP=$(echo $BF | cut -d' ' -f3)
EXPECTED=$((GT + RSP))
if [ "$DOCVALUES" -ge "$EXPECTED" ] && [ "$EXPECTED" -gt 0 ]; then
  ok "docKey backfilled: $DOCVALUES anchored docs (GT $GT + RSP $RSP pairs)"
else
  bad "docKey backfill incomplete: $DOCVALUES anchored vs $EXPECTED expected"
fi

echo "================================"
echo "OPS BATCH 1 SMOKE: $PASS passed, $FAIL failed"
[ "$FAIL" = "0" ]
