#!/usr/bin/env bash
# M6 Wave C route smoke (SPEC-M6 §12-7): the 9 new screens + CSV + regression.
BASE="http://localhost:3000"
pass=0; fail=0
smoke() {
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 "$BASE$1")
  if [ "$code" = "200" ]; then pass=$((pass+1)); echo "  OK    $1"; else fail=$((fail+1)); echo "  FAIL  $1 -> $code"; fi
}
content() {
  local body
  body=$(curl -s --max-time 60 "$BASE$1")
  if echo "$body" | grep -q "$2"; then pass=$((pass+1)); echo "  OK    $1 contains '$2'"; else fail=$((fail+1)); echo "  FAIL  $1 missing '$2'"; fi
}
echo "== M6 Wave C: the 9 registers & lifecycle screens =="
smoke "/orders/enquiry"; content "/orders/enquiry" "Order Register"
smoke "/programs/status"; content "/programs/status" "Program Status"
smoke "/programs/status/csv"
smoke "/inventory/stock"; content "/inventory/stock" "Current Stock"
smoke "/inventory/stock/csv"
smoke "/production/line-status"; content "/production/line-status" "Line Status"
smoke "/orders/amendments"; content "/orders/amendments" "Order Amendments"
smoke "/orders/close"; content "/orders/close" "Close Order"
smoke "/programs/cancel"; content "/programs/cancel" "Cancel Program"
smoke "/programs/complete"; content "/programs/complete" "Complete Program"
smoke "/procurement/po/close"; content "/procurement/po/close" "PO Cancel"
echo "== regression =="
smoke "/"; smoke "/reports"; smoke "/reports/mis"; smoke "/orders/register"; smoke "/programs/new"
smoke "/inventory/register"; smoke "/production/register"; smoke "/procurement/po"; smoke "/masters"; smoke "/parity"
content "/parity" "95"
echo ""; echo "M6 Wave C route smoke: $pass pass / $fail fail"
[ "$fail" = "0" ] || exit 1
