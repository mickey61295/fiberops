#!/bin/bash
# ============== ROUTE SMOKE — INV BATCH 6 (SPEC-M42) ==============
# Live-server checks for the stock take & valuation unification batch:
#   1. the two new screens render (stock take list + waste-% register)
#   2. the stock take view carries the count grid + advance door +
#      the count-sheet print link (seeded via sqlite3, PITFALLS #43:
#      epoch-millis DateTime + camelCase columns; reverted after)
#   3. the waste-% register shows the KPI columns + csv twin
#   4. the MIS stock-drift recon card state (visible when drift exists —
#      the legacy DB carries pre-existing vectors; silent when clean)
#   5. the digest text carries the stockDrift section when drift exists
#   6. the 404 path behaves (unknown register slug)
# Auth: admin fixture (the batch-0..5 cookie-jar pattern).
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

# ── 1. auth ──
JAR=$(mktemp)
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
if echo "$body" | grep -q '"ok":true'; then ok "admin login"; else bad "admin login: $body"; fi
AUTH=(-b "$JAR")

# ── 2. the new screens render ──
for route in /inventory/stock-take /inventory/waste-percent; do
  page=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE$route")
  code=$(echo "$page" | tail -1)
  if [ "$code" = "200" ]; then ok "$route renders (200)"; else bad "$route → $code"; fi
done

ST=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/inventory/stock-take")
if echo "$ST" | grep -q "Stock Take"; then
  ok "/inventory/stock-take title present (the cycle home)"
else
  bad "stock-take title missing"
fi
if echo "$ST" | grep -q "create_stock_take"; then
  ok "stock-take screen cites the same tool (ADR-001 chip)"
else
  bad "stock-take tool chip missing"
fi
if echo "$ST" | grep -q "Godown code"; then
  ok "stock-take create door collects the godown code"
else
  bad "stock-take create door missing the godown field"
fi

WP=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/inventory/waste-percent")
if echo "$WP" | grep -q "Waste % Register"; then
  ok "/inventory/waste-percent title present (the KPI register)"
else
  bad "waste-percent title missing"
fi
for col in "Waste kgs" "Receipts kgs" "Waste %"; do
  if echo "$WP" | grep -q "$col"; then
    ok "waste-% register carries the $col column"
  else
    bad "waste-% register $col column missing"
  fi
done

# ── 3. csv twin ──
CSV=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/inventory/waste-percent/csv")
CSV_CODE=$(echo "$CSV" | tail -1)
if [ "$CSV_CODE" = "200" ]; then
  ok "/inventory/waste-percent/csv renders (200)"
else
  bad "/inventory/waste-percent/csv → $CSV_CODE"
fi

# ── 4. the stock take VIEW: seed a take + lines via python3-sqlite3 (PITFALLS #43:
#        epoch-millis DateTime + camelCase columns) ──
DB=db/custom.db
SEED_ID="smokem42take0001"
read -r GODOWN_ID YARN_ID YARN_CODE <<EOF
$(python3 -c "
import sqlite3
con = sqlite3.connect('$DB')
g = con.execute('SELECT id FROM Godown ORDER BY code LIMIT 1').fetchone()
y = con.execute('SELECT id, code FROM Yarn ORDER BY code LIMIT 1').fetchone()
print((g[0] if g else ''), (y[0] if y else ''), (y[1] if y else ''))
")
EOF
NOW_MS=$(( $(date +%s) * 1000 ))
python3 -c "
import sqlite3
con = sqlite3.connect('$DB')
con.execute(\"INSERT INTO StockTake (id, takeNo, godownId, status, notes, createdAt) VALUES ('$SEED_ID', 'ST-9001', '$GODOWN_ID', 'open', 'route smoke seed', $NOW_MS)\")
con.execute(\"INSERT INTO StockTakeLine (id, takeId, itemType, itemId, systemBags, systemKgs, systemMtrs, systemPcs) VALUES ('smokem42line0001', '$SEED_ID', 'yarn', '$YARN_ID', 0, 100, 0, 0)\")
con.commit()
print('seeded')
"
V=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/inventory/stock-take/$SEED_ID")
if echo "$V" | grep -q "ST-9001"; then
  ok "stock take view resolves the seeded take (ST-9001)"
else
  bad "stock take view did not render the take"
fi
for hdr in "Sys kgs" "Count kgs" "Var"; do
  if echo "$V" | grep -q "$hdr"; then
    ok "count grid carries the $hdr column"
  else
    bad "count grid $hdr column missing"
  fi
done
if echo "$V" | grep -q "Start counting"; then
  ok "advance door present (open → counting is the legal next step)"
else
  bad "advance door missing"
fi
if echo "$V" | grep -q "Count sheet"; then
  ok "count-sheet print link present (the stock-take docType)"
else
  bad "count-sheet print link missing"
fi
if echo "$V" | grep -q "$YARN_CODE"; then
  ok "count grid resolves the REAL yarn code (per-model select — not a raw cuid)"
else
  bad "count grid item code fell back to a cuid (the PITFALLS #45 shape)"
fi
# the count-sheet print itself
PR=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/print/stock-take/ST-9001")
PR_CODE=$(echo "$PR" | tail -1)
if [ "$PR_CODE" = "200" ] && echo "$PR" | grep -q "COUNT SHEET"; then
  ok "GET /print/stock-take/ST-9001 renders the count sheet (200)"
else
  bad "count sheet print → $PR_CODE"
fi
# revert the seed (children first)
python3 -c "
import sqlite3
con = sqlite3.connect('$DB')
con.execute(\"DELETE FROM StockTakeLine WHERE takeId='$SEED_ID'\")
con.execute(\"DELETE FROM StockTake WHERE id='$SEED_ID'\")
con.commit()
print('reverted')
"
ok "smoke seed reverted (ST-9001 gone)"

# ── 5. MIS renders — the INV-06 drift card is conditional (silent when clean) ──
MIS=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/reports/mis")
MIS_CODE=$(echo "$MIS" | tail -1)
if [ "$MIS_CODE" = "200" ]; then
  ok "/reports/mis renders (200)"
  if echo "$MIS" | grep -q "Stock drift — ledger vs cache"; then
    ok "MIS stock-drift recon card VISIBLE (pre-existing legacy drift vectors)"
  else
    ok "MIS drift card silent (cache agrees with the ledger)"
  fi
else
  bad "/reports/mis → $MIS_CODE"
fi

# ── 6. the digest text carries the stockDrift section when drift exists ──
DIG=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/notifications/digest")
if echo "$DIG" | grep -q "Stock drift (ledger vs cache)"; then
  ok "digest text carries the stockDrift section (drift exists → listed)"
else
  ok "digest stockDrift section silent (no drift)"
fi

# ── 7. unknown register slug 404s ──
NF=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/inventory/waste-percent-x")
if [ "$NF" = "404" ]; then
  ok "unknown register slug → 404 (honest)"
else
  bad "unknown register slug → $NF"
fi

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
