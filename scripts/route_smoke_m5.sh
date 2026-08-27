#!/usr/bin/env bash
# M5 Wave A route smoke — the 7 money/rates items (SPEC-M5 §12-6): every new
# route 200 + representative filter query + CSV on the registers; all previous
# live routes stay 200 (spot set). Runs against the dev server on :3000.
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

echo "== M5 Wave A: the 7 items (SPEC-M5 §7-A) =="
smoke "/costing/budget"
content "/costing/budget" "Budget"
content "/costing/budget" "Recent budgets"
smoke "/costing/budget?order=SO-1001"
smoke "/orders/commercial-invoice"
content "/orders/commercial-invoice" "Commercial Invoice"
content "/orders/commercial-invoice" "ERN"
smoke "/accounts/invoice/local"
content "/accounts/invoice/local" "Local Invoice"
smoke "/accounts/invoice/piece"
content "/accounts/invoice/piece" "Piece / Jobwork Invoice"
smoke "/procurement/supplier-orders"
content "/procurement/supplier-orders" "Supplier Orders"

echo "== registers + filters + CSV =="
smoke "/procurement/rate-confirmation"
content "/procurement/rate-confirmation" "Rate Confirmation"
smoke "/procurement/rate-confirmation?itemType=yarn"
smoke "/procurement/rate-confirmation?from=2020-01-01&to=2030-01-01"
smoke "/procurement/rate-confirmation?format=csv"
smoke "/costing/piece-rate"
content "/costing/piece-rate" "Piece-Rate"
smoke "/costing/piece-rate?q=SEW"
smoke "/costing/piece-rate?format=csv"

echo "== previous live routes stay 200 (spot set) =="
smoke "/"
smoke "/orders"
smoke "/orders/new"
smoke "/orders/register"
smoke "/orders/status"
smoke "/procurement/po"
smoke "/procurement/party-balance"
smoke "/accounts/invoice"
smoke "/accounts/bills-register"
smoke "/costing/budget-vs-actual"
smoke "/inventory/lots"
smoke "/approvals"
smoke "/parity"

echo
echo "route_smoke_m5: $pass pass, $fail fail"
[ "$fail" = "0" ] || exit 1
