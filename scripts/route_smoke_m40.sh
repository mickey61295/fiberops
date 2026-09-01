#!/bin/bash
# ============== ROUTE SMOKE — PAY BATCH 4 (SPEC-M40) ==============
# Live-server checks for the money-integrity batch:
#   1. the Supplier Bill screens render (new door / register / bill-pass queue)
#   2. the SB view renders REAL data (bill + lines + verdicts + status) from a
#      fixture row inserted against a seeded purchase GRN — then REVERTED
#   3. the unknown-id path 404s (notFound, never a crash)
#   4. the rewritten supplier-bills register lists the SB row
#   5. the payments/invoice doc screens still render (dueDate/creditDays added)
# Auth: admin fixture (the batch-0/1/2 cookie-jar pattern). Fixture data is
# inserted read-only-modified then fully reverted (the M39 live protocol).
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
for route in /accounts/bill /accounts/supplier-bills /accounts/bill-pass /accounts/payments /accounts/invoice; do
  page=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE$route")
  code=$(echo "$page" | tail -1)
  html=$(echo "$page" | sed '$d')
  if [ "$code" = "200" ]; then ok "$route renders (200)"; else bad "$route → $code"; fi
  if echo "$html" | grep -qi "error\|exception" && [ "$code" != "200" ]; then bad "$route error content"; fi
done
if curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/bill" | grep -q "Supplier Bill"; then
  ok "/accounts/bill is the Supplier Bill door (title present)"
else
  bad "/accounts/bill title missing"
fi

# ── 3. fixture SB against a seeded purchase GRN (inserted → asserted → reverted) ──
python3 - <<'PYEOF'
import sqlite3, json, sys
con = sqlite3.connect('db/custom.db')
con.row_factory = sqlite3.Row
cur = con.cursor()
row = cur.execute("""
  SELECT g.id AS grn_id, g.partyId AS party_id, g.poId AS po_id, l.itemType AS item_type, l.itemId AS item_id, l.qty, l.rate
  FROM GRN g JOIN GRNLine l ON l.grnId = g.id
  WHERE g.grnType = 'purchase' AND NOT EXISTS (SELECT 1 FROM SupplierBill sb WHERE sb.grnId = g.id AND sb.status != 'cancelled')
  LIMIT 1
""").fetchone()
if not row:
    print('NO_GRN')
    sys.exit(0)
# Prisma stores DateTime as INTEGER epoch-millis (never ISO strings — P2023)
now_ms = int(__import__('time').time() * 1000)
bill_no = 'SB-SMOKE-M40'
cur.execute("DELETE FROM SupplierBill WHERE billNo = ?", (bill_no,))
cur.execute("""
  INSERT INTO SupplierBill (id, billNo, partyId, grnId, poId, billDate, finYear, taxableValue,
    cgstRate, sgstRate, igstRate, cgstAmt, sgstAmt, igstAmt, otherCharges, roundOff, billAmount,
    dueDate, tdsPercent, status, matchStatus, matchVariance, matchVerdicts, notes, createdAt)
  VALUES ('sb-smoke-m40', ?, ?, ?, ?, ?, '26-27', ?, 5, 5, 0, 0, 0, 0, 0, 0, ?, NULL, 2,
    'passed', 'matched', 0, ?, 'm40 route smoke', ?)
""", (bill_no, row['party_id'], row['grn_id'], row['po_id'], now_ms,
      row['qty'] * row['rate'], row['qty'] * row['rate'],
      json.dumps([{'check': 'Bill vs GRN qty', 'flag': 'bill_bcheckdev', 'severity': 'ok', 'message': 'Billed qty 0% vs GRN qty (limit 5%)'}]),
      now_ms))
cur.execute("""
  INSERT INTO SupplierBillLine (id, billId, grnLineId, itemType, itemId, itemCode, uomId, qty, rate, amount)
  VALUES ('sbl-smoke-m40', 'sb-smoke-m40', NULL, ?, ?, 'SMOKE-ITEM', NULL, ?, ?, ?)
""", (row['item_type'], row['item_id'], row['qty'], row['rate'], row['qty'] * row['rate']))
con.commit()
print(bill_no)
con.close()
PYEOF
SBNO=$(python3 -c "
import sqlite3
con = sqlite3.connect('file:db/custom.db?mode=ro', uri=True)
row = con.execute(\"SELECT billNo FROM SupplierBill WHERE id='sb-smoke-m40'\").fetchone()
print(row[0] if row else '')
con.close()")

if [ -n "$SBNO" ]; then
  ok "fixture SupplierBill $SBNO inserted (seeded GRN, status passed)"
  # 150s — the first hit compiles the fresh [id] route (Turbopack cold build)
  page=$(curl -s --max-time 150 "${AUTH[@]}" "$BASE/accounts/bill/sb-smoke-m40")
  if echo "$page" | grep -q "$SBNO"; then ok "SB view renders the billNo"; else bad "SB view missing billNo"; fi
  if echo "$page" | grep -q "passed"; then ok "SB view shows the passed status chip"; else bad "SB view missing status"; fi
  if echo "$page" | grep -q "3-way match"; then ok "SB view shows the verdicts card (PAY-04)"; else bad "SB view missing verdicts card"; fi
  if echo "$page" | grep -q "SMOKE-ITEM"; then ok "SB view shows the bill line"; else bad "SB view missing line"; fi
  reg=$(curl -s --max-time 150 "${AUTH[@]}" "$BASE/accounts/supplier-bills")
  if echo "$reg" | grep -q "$SBNO"; then ok "supplier-bills register lists the SB row (PAY-03 rewrite)"; else bad "register missing the SB row"; fi
else
  echo "  SKIP  no billable seeded purchase GRN found — the view assertion rides on vitest coverage"
fi

# ── 4. unknown id → 404 (notFound, never a 500) ──
code=$(curl -s -o /dev/null --max-time 30 "${AUTH[@]}" -w '%{http_code}' "$BASE/accounts/bill/nope-does-not-exist")
if [ "$code" = "404" ]; then ok "unknown SB id 404s"; else bad "unknown SB id → $code (want 404)"; fi

# ── 5. revert the fixture (the M39 live-data protocol) ──
python3 - <<'PYEOF'
import sqlite3
con = sqlite3.connect('db/custom.db')
cur = con.cursor()
cur.execute("DELETE FROM SupplierBillLine WHERE billId = 'sb-smoke-m40'")
cur.execute("DELETE FROM SupplierBill WHERE id = 'sb-smoke-m40'")
con.commit()
n = cur.execute("SELECT COUNT(*) FROM SupplierBill WHERE id='sb-smoke-m40'").fetchone()[0]
con.close()
print('reverted' if n == 0 else 'LEFTOVER')
PYEOF
rv=$(python3 -c "
import sqlite3
con = sqlite3.connect('file:db/custom.db?mode=ro', uri=True)
print(con.execute(\"SELECT COUNT(*) FROM SupplierBill WHERE id='sb-smoke-m40'\").fetchone()[0])
con.close()")
if [ "$rv" = "0" ]; then ok "fixture data reverted (zero residue)"; else bad "fixture residue left"; fi

echo "================================"
echo "M40 route smoke: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" = "0" ] && echo "ALL GREEN" || exit 1
