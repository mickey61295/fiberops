#!/usr/bin/env bash
# M5 Wave B route smoke — the 14 production/pcs items (SPEC-M5 §12-6): every
# new route 200 + representative filter/prefill queries + CSV on the wages
# register + content checks; previous live routes stay 200 (spot set).
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

echo "== M5 Wave B: the ProductionEntry family (SPEC-M5 §7-B 8-10/13-14) =="
smoke "/pieces/finished-goods"
content "/pieces/finished-goods" "Finished Goods Entry"
smoke "/pieces/finished-goods?order=SO-1001"
smoke "/production/operations"
content "/production/operations" "Operation Entry"
smoke "/production/bundles"
content "/production/bundles" "Bundle / Barcode Entry"
smoke "/production/bundles?bundle=CUT-001/B1"
smoke "/production/line-transfer"
content "/production/line-transfer" "Line Transfer"
smoke "/cutting/panel-production"
content "/cutting/panel-production" "Panel Production"
smoke "/cutting/panel-excess"
content "/cutting/panel-excess" "Panel Excess"

echo "== cutting variants (panel cut + rejections) =="
smoke "/cutting/panel"
content "/cutting/panel" "Panel Cutting / Add"
smoke "/cutting/panel-rework"
content "/cutting/panel-rework" "Panel Rejection / Rework"
smoke "/cutting/fab-rejection"
content "/cutting/fab-rejection" "Fabric Rejection Return"
smoke "/pieces/shortage"
content "/pieces/shortage" "Pcs Shortage"

echo "== jobwork return + costing input =="
smoke "/jobwork/pcs-return"
content "/jobwork/pcs-return" "Jobwork Pcs Return"
smoke "/costing/input"
content "/costing/input" "Costing Input"

echo "== HR: wages register + wage payments =="
smoke "/hr/wages"
content "/hr/wages" "Production Wages"
content "/hr/wages" "Generate wage bill"
smoke "/hr/wages?q=D4"
smoke "/hr/wages?order=SO-1001"
content "/hr/wages?order=SO-1001" "Budget vs Actual"
smoke "/hr/wages?from=2020-01-01&to=2030-01-01"
smoke "/hr/wages/csv"
smoke "/hr/wage-payments"
content "/hr/wage-payments" "Wage Payments"

echo "== previous live routes stay 200 (spot set) =="
smoke "/"
smoke "/orders"
smoke "/orders/new"
smoke "/orders/register"
smoke "/orders/status"
smoke "/procurement/po"
smoke "/procurement/grn"
smoke "/procurement/rate-confirmation"
smoke "/cutting/job-order"
smoke "/production/entry"
smoke "/production/issue"
smoke "/production/rework"
smoke "/production/register"
smoke "/pieces/despatch"
smoke "/pieces/rejection"
smoke "/pieces/stock"
smoke "/jobwork/order"
smoke "/jobwork/register"
smoke "/costing/budget"
smoke "/costing/cost-sheet"
smoke "/costing/piece-rate"
smoke "/accounts/invoice"
smoke "/accounts/invoice/local"
smoke "/accounts/payments"
smoke "/accounts/journal"
smoke "/accounts/party-ledger"
smoke "/inventory/ledger"
smoke "/inventory/lots"
smoke "/approvals"
smoke "/approvals/audit"
smoke "/masters/employee"
smoke "/hr"

echo
echo "== RESULT: $pass passed, $fail failed =="
[ "$fail" -eq 0 ] && exit 0 || exit 1
