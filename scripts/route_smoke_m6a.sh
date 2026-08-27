#!/usr/bin/env bash
# M6 Wave A route smoke (SPEC-M6 §12-7): the 4 new report screens + all 28
# report runner slugs + CSV + print param + MIS + daily-pnl + regression set
# (all prior live route groups). Runs against the dev server on :3000.
BASE="http://localhost:3000"
pass=0; fail=0
smoke() {
  local path="$1"; local expect="${2:-200}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 "$BASE$path")
  if [ "$code" = "$expect" ]; then
    pass=$((pass+1)); echo "  OK    $path -> $code"
  else
    fail=$((fail+1)); echo "  FAIL  $path -> $code (expected $expect)"
  fi
}
content() {
  local path="$1"; local needle="$2"
  local body
  body=$(curl -s --max-time 60 "$BASE$path")
  if echo "$body" | grep -q "$needle"; then
    pass=$((pass+1)); echo "  OK    $path contains '$needle'"
  else
    fail=$((fail+1)); echo "  FAIL  $path missing '$needle'"
  fi
}

echo "== M6 Wave A: the 4 report screens (SPEC-M6 §2 rows 1-4) =="
smoke "/reports"
content "/reports" "Report Hub"
smoke "/reports/packs"
content "/reports/packs" "Report Packs"
smoke "/reports/mis"
content "/reports/mis" "MIS Dashboard"
smoke "/costing/daily-pnl"
content "/costing/daily-pnl" "Daily Unit P&amp;L"

echo "== the 28 report runner slugs =="
for s in order-register inhand-orders order-status-summary sample-status despatch-packing-summary \
         production-status daily-in-out line-wip rejection-summary operation-summary \
         stock-register current-stock stock-ledger lot-tracking io-history \
         bills-register supplier-bills party-ledger party-balance outstanding-summary gst-summary \
         budget-vs-actual daily-unit-pnl expenses-summary production-wages cost-sheet-summary \
         lab-tests approval-audit; do
  smoke "/reports/$s"
done

echo "== unknown slug 404s (no dead silent routes) =="
smoke "/reports/not-a-report" 404

echo "== CSV export + filters + print param =="
smoke "/reports/order-register/csv?limit=500"
smoke "/reports/order-register?status=open&from=2025-01-01&to=2026-12-31"
smoke "/reports/current-stock?itemType=yarn"
smoke "/reports/outstanding-summary?party=B001"
smoke "/reports/daily-unit-pnl?from=2024-02-01&to=2024-02-28"
smoke "/costing/daily-pnl?copy=duplicate"

echo "== regression spot set (prior live routes stay 200) =="
smoke "/"
smoke "/orders"
smoke "/orders/register"
smoke "/orders/status"
smoke "/masters"
smoke "/masters/party"
smoke "/inventory/ledger"
smoke "/inventory/register"
smoke "/procurement/po"
smoke "/procurement/grn"
smoke "/production/register"
smoke "/jobwork/register"
smoke "/accounts/bills-register"
smoke "/accounts/party-ledger"
smoke "/costing/budget-vs-actual"
smoke "/hr/wages"
smoke "/quality/lab-tests"
smoke "/dispatch/gate-entry"
smoke "/pieces/packing-list"
smoke "/approvals"
smoke "/approvals/audit"
smoke "/admin/company"
smoke "/parity"
content "/parity" "81"

echo ""
echo "M6 Wave A route smoke: $pass pass / $fail fail"
[ "$fail" = "0" ] || exit 1
