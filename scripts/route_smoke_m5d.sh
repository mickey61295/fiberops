#!/usr/bin/env bash
# M5 Wave D route smoke (SPEC-M5 §12-6): the 11 new screens + 6 view routes +
# content checks seeded by scripts/seed_m5d_smoke.ts (idempotent, fixed doc
# numbers); previous live routes stay 200 (regression spot set).
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

echo "== seed M5 Wave D fixtures (idempotent) =="
SEED_OUT=$(cd /home/z/my-project && bunx tsx scripts/seed_m5d_smoke.ts 2>&1) || echo "  WARN  seed failed — view checks may fail"
echo "$SEED_OUT" | grep -E "^(SAMPLE_ID|GATE_ID|PASS_ID|PACK_ID|LAB_ID|EXPENSE_ID|ALLOT_ID)=" > /tmp/m5d_ids.env
SAMPLE_ID=$(grep '^SAMPLE_ID=' /tmp/m5d_ids.env | cut -d= -f2)
GATE_ID=$(grep '^GATE_ID=' /tmp/m5d_ids.env | cut -d= -f2)
PASS_ID=$(grep '^PASS_ID=' /tmp/m5d_ids.env | cut -d= -f2)
PACK_ID=$(grep '^PACK_ID=' /tmp/m5d_ids.env | cut -d= -f2)
LAB_ID=$(grep '^LAB_ID=' /tmp/m5d_ids.env | cut -d= -f2)
EXPENSE_ID=$(grep '^EXPENSE_ID=' /tmp/m5d_ids.env | cut -d= -f2)
ALLOT_ID=$(grep '^ALLOT_ID=' /tmp/m5d_ids.env | cut -d= -f2)

echo "== M5 Wave D: the 11 new screens (SPEC-M5 §7-D) =="
smoke "/orders/samples"
content "/orders/samples" "Samples"
content "/orders/samples" "SMP-"
smoke "/dispatch/gate-entry"
content "/dispatch/gate-entry" "Gate Entry"
smoke "/dispatch/gate-pass"
content "/dispatch/gate-pass" "Gate Pass"
smoke "/pieces/packing-list"
content "/pieces/packing-list" "PKL-"
smoke "/quality/lab-tests"
content "/quality/lab-tests" "LT-"
smoke "/costing/expenses"
content "/costing/expenses" "EXP-"
smoke "/hr/shifts"
content "/hr/shifts" "General Shift"
content "/hr/shifts" "create_shift"
smoke "/accounts/production-bills"
content "/accounts/production-bills" "Production Bills"
smoke "/inventory/rolls"
content "/inventory/rolls" "M5D-SMOKE-LOT"
content "/inventory/rolls" "RSP-"
smoke "/jobwork/contract"
content "/jobwork/contract" "AL-"
smoke "/programs/allotment"
content "/programs/allotment" "Allot"

echo "== view routes (real ids from the seed) =="
[ -n "$SAMPLE_ID" ] && { smoke "/orders/samples/$SAMPLE_ID"; content "/orders/samples/$SAMPLE_ID" "SMP-M5D-1"; }
[ -n "$GATE_ID" ] && { smoke "/dispatch/gate-entry/$GATE_ID"; content "/dispatch/gate-entry/$GATE_ID" "GE-M5D-1"; }
[ -n "$PASS_ID" ] && { smoke "/dispatch/gate-pass/$PASS_ID"; content "/dispatch/gate-pass/$PASS_ID" "GP-M5D-1"; }
[ -n "$PACK_ID" ] && { smoke "/pieces/packing-list/$PACK_ID"; content "/pieces/packing-list/$PACK_ID" "CTN-01"; content "/pieces/packing-list/$PACK_ID" "DC-M5D-1"; }
[ -n "$LAB_ID" ] && { smoke "/quality/lab-tests/$LAB_ID"; content "/quality/lab-tests/$LAB_ID" "LT-M5D-1"; }
[ -n "$EXPENSE_ID" ] && { smoke "/costing/expenses/$EXPENSE_ID"; content "/costing/expenses/$EXPENSE_ID" "EXP-M5D-1"; }
[ -n "$ALLOT_ID" ] && { smoke "/jobwork/order/$ALLOT_ID"; }

echo "== W4 picker feeds the new typed pickers ride =="
smoke "/api/erp?resource=master_search&slug=shift&q="
smoke "/api/erp?resource=master_search&slug=style&q="

echo "== regression spot set (previous live routes stay 200) =="
smoke "/"
smoke "/orders"
smoke "/orders/new"
smoke "/orders/register"
smoke "/orders/commercial-invoice"
smoke "/procurement/po"
smoke "/procurement/grn"
smoke "/procurement/supplier-orders"
smoke "/inventory"
smoke "/inventory/lots"
smoke "/inventory/adjustment"
smoke "/production/entry"
smoke "/production/operations"
smoke "/production/bundles"
smoke "/pieces/despatch"
smoke "/pieces/finished-goods"
smoke "/jobwork/order"
smoke "/jobwork/pcs-return"
smoke "/accounts/invoice"
smoke "/accounts/invoice/local"
smoke "/accounts/journal"
smoke "/accounts/bill-pass"
smoke "/costing/budget"
smoke "/costing/input"
smoke "/hr/wages"
smoke "/hr/wage-payments"
smoke "/quality/reprocess-approval"
smoke "/dispatch/unit-transfer-ack"
smoke "/approvals"
smoke "/parity"

echo
echo "RESULT: $pass passed, $fail failed"
[ "$fail" = "0" ]
