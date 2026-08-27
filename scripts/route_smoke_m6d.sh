#!/usr/bin/env bash
# M6 Wave D route smoke (SPEC-M6 §12-7): the 18 new screens + regression —
# the LAST wave (113/113).
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
echo "== M6 Wave D: the 10 DS variant screens =="
smoke "/procurement/grn/multi-process"; content "/procurement/grn/multi-process" "Multi-Process GRN"
smoke "/inventory/opening-stock"; content "/inventory/opening-stock" "Opening Stock"
smoke "/cutting/issue"; content "/cutting/issue" "Cutting Issue"
smoke "/cutting/ready-to-cut"; content "/cutting/ready-to-cut" "Ready to Cut"
smoke "/cutting/production"; content "/cutting/production" "Cutting Production"
smoke "/pieces/receipt"; content "/pieces/receipt" "Jobwork Receipt"
smoke "/pieces/transfer"; content "/pieces/transfer" "Pcs Transfer"
smoke "/production/line-output"; content "/production/line-output" "Line Output"
smoke "/dispatch/dc"; content "/dispatch/dc" "Material DC"
smoke "/dispatch/dc/process"; content "/dispatch/dc/process" "Process DC"
smoke "/dispatch/dc-return"; content "/dispatch/dc-return" "DC Return"
echo "== M6 Wave D: the 4 IN approval-kind screens =="
smoke "/procurement/grn/acceptance"; content "/procurement/grn/acceptance" "GRN Acceptance"
smoke "/cutting/ack"; content "/cutting/ack" "Cutting Ack"
smoke "/pieces/gan"; content "/pieces/gan" "Pcs GRN Acceptance"
smoke "/quality/lot-approval"; content "/quality/lot-approval" "Lot Approval"
echo "== M6 Wave D: the 2 MasterTables + employees alias =="
smoke "/accounts/hsn-gst"; content "/accounts/hsn-gst" "HSN"
smoke "/quality/parameters"; content "/quality/parameters" "Test Parameters"
smoke "/hr/employees"; content "/hr/employees" "Employee"
echo "== parametrized queries =="
smoke "/approvals?kind=grn_acceptance"
smoke "/approvals?kind=pcs_acceptance"
smoke "/approvals?kind=lot"
smoke "/pieces/receipt?dcNo=JW-0001"
echo "== regression (the prior live surface) =="
smoke "/"; smoke "/reports"; smoke "/reports/mis"; smoke "/orders/register"; smoke "/programs/new"
smoke "/programs/status"; smoke "/inventory/stock"; smoke "/production/line-status"
smoke "/procurement/po"; smoke "/procurement/grn"; smoke "/cutting/job-order"
smoke "/dispatch/courier"; smoke "/dispatch/loading"; smoke "/admin/users"; smoke "/admin/menu-rights"
smoke "/admin/options"; smoke "/masters"; smoke "/masters/employee"; smoke "/parity"
content "/parity" "113"
echo ""; echo "M6 Wave D route smoke: $pass pass / $fail fail"
[ "$fail" = "0" ] || exit 1
