#!/usr/bin/env bash
# M5 Wave C route smoke — the 4 approval-gate IN screens (SPEC-M5 §12-6): every
# new route 200 + the kind-filtered inbox renders + /approvals?kind= filter +
# the API kind filter contract; previous live routes stay 200 (spot set).
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

echo "== seed 4 pending kind approvals (idempotent) =="
(cd /home/z/my-project && bunx tsx scripts/seed_m5c_smoke.ts) || echo "  WARN  seed failed — kind-content checks may fail"

echo "== M5 Wave C: the 4 approval-gate IN screens (SPEC-M5 §6) =="
smoke "/accounts/bill-pass"
content "/accounts/bill-pass" "Bill Pass"
smoke "/dispatch/unit-transfer-ack"
content "/dispatch/unit-transfer-ack" "Unit Transfer Ack"
smoke "/quality/reprocess-approval"
content "/quality/reprocess-approval" "Reprocess Approval"
smoke "/quality/non-return-dc"
content "/quality/non-return-dc" "Non-Return DC Approval"

echo "== inbox kind filter (/approvals + ?kind=) =="
smoke "/approvals"
content "/approvals" "All"
smoke "/approvals?kind=supplier_bill"
content "/approvals?kind=supplier_bill" "Bill Pass"
smoke "/approvals?kind=godown_transfer"
smoke "/approvals?kind=reprocess"
smoke "/approvals?kind=non_return_dc"
smoke "/approvals?kind=bogus_kind"   # unknown kind degrades to All — never 500s

echo "== API kind filter contract (kind === Approval.entity) =="
api_kind() {
  local kind="$1"; local needle="$2"
  local body
  body=$(curl -s --max-time 30 "$BASE/api/erp?resource=approvals&kind=$kind")
  if echo "$body" | grep -q "$needle"; then
    pass=$((pass+1)); echo "  OK    api kind=$kind -> '$needle'"
  else
    fail=$((fail+1)); echo "  FAIL  api kind=$kind missing '$needle'"
  fi
}
api_kind "supplier_bill" '"entity":"supplier_bill"'
api_kind "godown_transfer" '"entity":"godown_transfer"'
api_kind "reprocess" '"entity":"reprocess"'
api_kind "non_return_dc" '"entity":"non_return_dc"'
# an unknown kind must return an EMPTY list (no rows leak through)
body=$(curl -s --max-time 30 "$BASE/api/erp?resource=approvals&kind=bogus_kind")
if [ "$body" = "[]" ]; then
  pass=$((pass+1)); echo "  OK    api kind=bogus_kind -> []"
else
  fail=$((fail+1)); echo "  FAIL  api kind=bogus_kind -> $body"
fi

echo "== supplier-bill register shows the bill-pass column =="
smoke "/accounts/supplier-bills"
content "/accounts/supplier-bills" "Bill pass"
smoke "/accounts/supplier-bills?format=csv"

echo "== group landing opened by Wave C =="
smoke "/quality/reprocess-approval"  # quality group landing (dispatch lands on /dispatch/unit-transfer-ack, checked above)

echo "== regression spot set (previous live routes) =="
smoke "/"
smoke "/orders"
smoke "/orders/register"
smoke "/orders/status"
smoke "/procurement/po"
smoke "/procurement/grn"
smoke "/procurement/supplier-orders"
smoke "/procurement/rate-confirmation"
smoke "/procurement/party-balance"
smoke "/inventory"
smoke "/inventory/register"
smoke "/inventory/io-history"
smoke "/inventory/transfer"
smoke "/cutting/job-order"
smoke "/cutting/panel"
smoke "/production/entry"
smoke "/production/operations"
smoke "/production/line-transfer"
smoke "/pieces/despatch"
smoke "/pieces/stock"
smoke "/pieces/shortage"
smoke "/jobwork/order"
smoke "/jobwork/register"
smoke "/jobwork/pcs-return"
smoke "/accounts/invoice"
smoke "/accounts/invoice/local"
smoke "/accounts/payments"
smoke "/accounts/journal"
smoke "/accounts/bills-register"
smoke "/accounts/party-ledger"
smoke "/costing/cost-sheet"
smoke "/costing/budget"
smoke "/costing/piece-rate"
smoke "/costing/input"
smoke "/hr/wages"
smoke "/hr/wage-payments"
smoke "/approvals/audit"

echo
echo "RESULT: $pass passed, $fail failed"
[ "$fail" = "0" ]
