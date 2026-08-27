#!/usr/bin/env bash
# M4 Wave C route smoke — W6 recon cards on the doc views + Order Status
# Board + KPI deep-link targets (SPEC-M4 §13 Wave C exit, acceptance #9).
# Runs against the dev server on :3000.
BASE="http://localhost:3000"
pass=0; fail=0
smoke() {
  local path="$1"; local expect="${2:-200}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$BASE$path")
  if [ "$code" = "$expect" ]; then
    pass=$((pass+1)); echo "  OK    $path -> $code"
  else
    fail=$((fail+1)); echo "  FAIL  $path -> $code (expected $expect)"
  fi
}
content() {
  local path="$1"; local needle="$2"
  local body
  body=$(curl -s --max-time 30 "$BASE$path")
  if echo "$body" | grep -q "$needle"; then
    pass=$((pass+1)); echo "  OK    $path contains '$needle'"
  else
    fail=$((fail+1)); echo "  FAIL  $path missing '$needle'"
  fi
}

echo "== Order Status Board (SPEC-M4 §10) =="
smoke "/orders/status"
content "/orders/status" "Order Status Board"
content "/orders/status" "Open orders"

echo "== Seed smoke fixture (JW-SMOKE-1) =="
(cd /home/z/my-project && bunx tsx scripts/seed_wave_smoke.ts) || echo "  WARN  seed failed — jobwork card check may fail"

echo "== W6 recon cards render on the doc views =="
# PO view: use the newest real PO number from the read API
PO_NO=$(curl -s --max-time 20 "$BASE/api/erp?resource=purchase_orders" | grep -oE '"poNo":"[^"]+"' | head -1 | cut -d'"' -f4)
if [ -n "$PO_NO" ]; then
  content "/procurement/po/$PO_NO" "PO ↔ GRNs"
else
  echo "  SKIP  no PO in db to check the recon card"
fi
content "/jobwork/order/JW-SMOKE-1" "Jobwork out ↔ in"
smoke "/procurement/po/NOPE-9999" 404
smoke "/jobwork/order/NOPE-9999" 404

echo "== KPI deep-link targets (SPEC-M4 §8.3; stock tile → /inventory ERRATUM) =="
smoke "/orders/register?status=open"
smoke "/procurement/party-balance"
smoke "/inventory"
smoke "/production/register?from=2026-08-27&to=2026-08-27"
smoke "/approvals"
smoke "/accounts/bills-register?status=issued"

echo "== Register fleet regression (one per group) =="
smoke "/registers/daily-in-out"
smoke "/orders/in-hand"
smoke "/inventory/io-history"
smoke "/pieces/stock"
smoke "/costing/budget-vs-actual"
smoke "/approvals/audit"

echo
echo "RESULT: $pass passed, $fail failed"
[ "$fail" = "0" ] && echo "WAVE C ROUTE SMOKE: GREEN" || exit 1
