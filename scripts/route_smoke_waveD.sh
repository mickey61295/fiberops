#!/usr/bin/env bash
# M3 Wave D route smoke — all LIVE_ROUTES + Wave D specifics (SPEC-M3 §13).
# Runs against the dev server on :3000 (started by the session env).
BASE="http://localhost:3000"
declare -a LIVE=(
  "/" "/orders" "/orders/new" "/programs/new" "/procurement" "/procurement/po"
  "/procurement/grn" "/jobwork/order" "/jobwork/receipt" "/cutting" "/cutting/job-order"
  "/production" "/production/issue" "/production/entry" "/production/rework"
  "/pieces/rejection" "/pieces/despatch" "/inventory" "/accounts" "/costing" "/hr"
  "/masters" "/admin/company" "/approvals" "/parity"
)
declare -a WAVE_D=(
  "/accounts/invoice" "/accounts/debit-note" "/accounts/payments" "/accounts/journal"
  "/costing/cost-sheet" "/inventory/adjustment" "/inventory/transfer"
)
declare -a WAVE_D_VIEWS=(
  "/accounts/invoice/INV-0001" "/accounts/debit-note/DN-SMOKE-1"
  "/accounts/payments/RCP-0001" "/accounts/journal/V-SMOKE-1"
)
declare -a PREFILLS=(
  "/accounts/invoice?order=SO-1001" "/accounts/payments?invoice=INV-0001"
  "/costing/cost-sheet?order=SO-1001" "/inventory/adjustment" "/inventory/transfer"
)
declare -a NOTFOUND=(
  "/accounts/invoice/NOPE-9999" "/accounts/debit-note/NOPE-9999"
  "/accounts/payments/NOPE-9999" "/accounts/journal/NOPE-9999"
  "/costing/cost-sheet/nonexistent-id-123"
)
pass=0; fail=0
smoke() {
  code=$(curl -s -o /dev/null -w "%{http_code}" -m 30 "$BASE$1")
  if [ "$code" = "$2" ]; then pass=$((pass+1)); echo "  OK    $1 → $code"
  else fail=$((fail+1)); echo "  FAIL  $1 → $code (want $2)"; fi
}
echo "== baseline live routes (25) =="
for r in "${LIVE[@]}"; do smoke "$r" 200; done
echo "== Wave D item routes (7) =="
for r in "${WAVE_D[@]}"; do smoke "$r" 200; done
echo "== Wave D views by doc number (4) =="
for r in "${WAVE_D_VIEWS[@]}"; do smoke "$r" 200; done
echo "== Wave D prefilled CTAs (5) =="
for r in "${PREFILLS[@]}"; do smoke "$r" 200; done
echo "== unknown ids must 404 (5) =="
for r in "${NOTFOUND[@]}"; do smoke "$r" 404; done
echo "== /api/upload (SPEC-M3 §12) =="
code=$(curl -s -o /dev/null -w "%{http_code}" -m 15 "$BASE/api/upload")
if [ "$code" = "200" ]; then pass=$((pass+1)); echo "  OK    GET /api/upload → 200"
else fail=$((fail+1)); echo "  FAIL  GET /api/upload → $code"; fi
echo "POST txt upload:"
echo "wave-d smoke test $(date +%s)" > /tmp/wd-smoke.txt
code=$(curl -s -o /tmp/wd-smoke-resp.json -w "%{http_code}" -m 15 -F "file=@/tmp/wd-smoke.txt" "$BASE/api/upload")
if [ "$code" = "200" ]; then pass=$((pass+1)); echo "  OK    POST /api/upload → 200 ($(python3 -c "import json;print(json.load(open('/tmp/wd-smoke-resp.json'))['fileName'])" 2>/dev/null))"
else fail=$((fail+1)); echo "  FAIL  POST /api/upload → $code"; cat /tmp/wd-smoke-resp.json 2>/dev/null | head -2; fi
echo "POST bad extension:"
echo "x" > /tmp/wd-smoke.exe
code=$(curl -s -o /dev/null -w "%{http_code}" -m 15 -F "file=@/tmp/wd-smoke.exe" "$BASE/api/upload")
if [ "$code" = "415" ]; then pass=$((pass+1)); echo "  OK    POST .exe → 415"
else fail=$((fail+1)); echo "  FAIL  POST .exe → $code (want 415)"; fi
echo ""
echo "RESULT: $pass pass / $fail fail"
[ "$fail" = "0" ] || exit 1
