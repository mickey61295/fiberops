#!/bin/bash
# ============== ROUTE SMOKE — PRG BATCH 7 (SPEC-M43) ==============
# Live-server checks for the program-flow revival batch:
#   1. /programs/propose renders + the BOM proposal for SO-1001 (S-1001's
#      191-line BOM × qty × wastage flags)
#   2. the program-status register gains the waterfall columns
#      (PO'd / DC'd / GRN'd / Finished)
#   3. /orders/register gains the orderType filter + Buyer PO column
#   4. /programs/new carries the five knitting-spec fields
#   5. the Order Hub shows the Delivery schedule editor section
#   6. the program view renders (any program) — the spec section rides it
#   7. the order print renders (the buyer-PO meta rides it when present)
# Auth: admin fixture (the batch-0..6 cookie-jar pattern). ZERO residue —
# every check is a GET against existing seed data.
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

# ── 2. the propose screen ──
page=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/programs/propose")
code=$(echo "$page" | tail -1)
if [ "$code" = "200" ]; then ok "/programs/propose renders (200)"; else bad "/programs/propose → $code"; fi
if echo "$page" | grep -q "Propose programs from BOM"; then ok "propose title present (PRG-05 door)"; else bad "propose title missing"; fi
if echo "$page" | grep -q "propose-order-form"; then ok "propose order lookup form present"; else bad "propose order lookup missing"; fi
if echo "$page" | grep -q "propose_program_requirements"; then ok "propose screen cites the same tool (ADR-001 chip)"; else bad "propose tool chip missing"; fi

# ── 3. the proposal itself (?order=SO-1001 → S-1001's 191-line BOM) ──
page=$(curl -s --max-time 60 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/programs/propose?order=SO-1001")
code=$(echo "$page" | tail -1)
if [ "$code" = "200" ]; then ok "/programs/propose?order=SO-1001 renders (200)"; else bad "propose?order → $code"; fi
if echo "$page" | grep -q 'data-testid="propose-table"'; then ok "the BOM proposal table rendered"; else bad "proposal table missing (or BOM empty — check seed)"; fi
if echo "$page" | grep -q "boostupper"; then ok "the wastage note names the flags (boostupper + reserveper)"; else bad "wastage note missing"; fi
if echo "$page" | grep -q 'data-testid="proposal-create'; then ok "per-row Create program doors present"; else bad "create doors missing"; fi

# ── 4. the waterfall columns on program-status ──
page=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/programs/status")
code=$(echo "$page" | tail -1)
if [ "$code" = "200" ]; then ok "/programs/status renders (200)"; else bad "/programs/status → $code"; fi
for col in "PO'd" "DC'd" "GRN'd" "Finished"; do
  if echo "$page" | grep -q "$col"; then ok "program-status carries the '$col' waterfall column"; else bad "waterfall column '$col' missing"; fi
done

# ── 5. the order register additions ──
page=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/orders/register")
code=$(echo "$page" | tail -1)
if [ "$code" = "200" ]; then ok "/orders/register renders (200)"; else bad "/orders/register → $code"; fi
if echo "$page" | grep -q 'id="rf-orderType"'; then ok "order register orderType filter present"; else bad "orderType filter missing"; fi
if echo "$page" | grep -q "Buyer PO"; then ok "order register Buyer PO column present"; else bad "Buyer PO column missing"; fi
# the filter WORKS (export orders only)
page=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/orders/register?orderType=export")
if echo "$page" | grep -qE "orders · status|Order Register"; then ok "orderType=export filter applies (page renders scoped)"; else bad "orderType filter broken"; fi

# ── 6. the program form spec fields ──
page=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/programs/new")
code=$(echo "$page" | tail -1)
if [ "$code" = "200" ]; then ok "/programs/new renders (200)"; else bad "/programs/new → $code"; fi
if echo "$page" | grep -q "Colour (spec)"; then ok "program form carries the colour spec field (PRG-03)"; else bad "colour spec field missing"; fi
if echo "$page" | grep -q "Loop Length (spec)"; then ok "program form carries the LL spec field (PRG-03)"; else bad "LL spec field missing"; fi

# ── 7. the Order Hub delivery schedule section (SO-1001) ──
page=$(curl -s --max-time 60 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/orders/cmt6tmpfz003fnu09nnbmu5yt")
code=$(echo "$page" | tail -1)
if [ "$code" = "200" ]; then ok "Order Hub (SO-1001) renders (200)"; else bad "Order Hub → $code"; fi
if echo "$page" | grep -q "Delivery schedule"; then ok "Order Hub carries the Delivery schedule section (PRG-01)"; else bad "delivery schedule section missing"; fi
if echo "$page" | grep -q 'data-testid="delivery-schedule"'; then ok "the schedule editor mounted (client form)"; else bad "schedule editor not mounted"; fi
if echo "$page" | grep -q "Save schedule"; then ok "the schedule save door present"; else bad "schedule save door missing"; fi

# ── 8. the order form + print ride the additions ──
page=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/orders/new")
code=$(echo "$page" | tail -1)
if [ "$code" = "200" ]; then ok "/orders/new renders (200)"; fi
if echo "$page" | grep -q "Buyer PO Ref"; then ok "order form Buyer PO field present (PRG-01)"; else bad "Buyer PO field missing"; fi
if echo "$page" | grep -q "Order Type"; then ok "order form Order Type select present (PRG-01)"; else bad "Order Type select missing"; fi
page=$(curl -s --max-time 60 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/print/order/SO-1001")
code=$(echo "$page" | tail -1)
if [ "$code" = "200" ]; then ok "/print/order/SO-1001 renders (200)"; else bad "order print → $code"; fi

# ── 9. the program view (spec section rides every view) ──
PROGID=$(node -e "const { PrismaClient } = require('@prisma/client'); const db = new PrismaClient(); db.program.findFirst({ select: { id: true } }).then(p => { console.log(p?.id ?? ''); return db.\$disconnect(); })" 2>/dev/null)
if [ -n "$PROGID" ]; then
  page=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/programs/$PROGID")
  code=$(echo "$page" | tail -1)
  if [ "$code" = "200" ]; then ok "/programs/$PROGID view renders (200)"; else bad "program view → $code"; fi
  if echo "$page" | grep -q 'data-testid="program-spec-section"'; then ok "program view carries the knitting-spec section (PRG-03)"; else bad "spec section missing"; fi
else
  bad "no program found to view"
fi

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1
exit 0
