#!/usr/bin/env bash
# M4 Wave B route smoke — the 13 new register screens + their CSV exports +
# filter deep-links (SPEC-M4 §13 Wave B exit; full waveE script comes in Wave C).
# Runs against the dev server on :3000 (start it first if needed).
BASE="http://localhost:3000"
declare -a WAVE_B=(
  "/orders/in-hand" "/procurement/party-balance" "/inventory/register"
  "/inventory/lots" "/inventory/io-history" "/pieces/stock"
  "/production/register" "/jobwork/register" "/accounts/bills-register"
  "/accounts/supplier-bills" "/accounts/party-ledger"
  "/costing/budget-vs-actual" "/approvals/audit"
)
declare -a WAVE_A=(
  "/registers/daily-in-out" "/orders/register" "/inventory/ledger"
)
declare -a FILTERS=(
  "/orders/in-hand?q=SO" "/inventory/register?variant=style"
  "/inventory/io-history?itemType=yarn" "/jobwork/register?status=sent"
  "/accounts/bills-register?from=2026-01-01&to=2026-12-31"
  "/approvals/audit?status=approved" "/inventory/lots?q=LOT"
  "/production/register?order=SO-1001"
)
pass=0; fail=0
smoke() {
  local path="$1"; local expect="${2:-200}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "$BASE$path")
  if [ "$code" = "$expect" ]; then
    pass=$((pass+1)); echo "  OK    $path -> $code"
  else
    fail=$((fail+1)); echo "  FAIL  $path -> $code (expected $expect)"
  fi
}
csv_smoke() {
  local path="$1"
  local out
  out=$(curl -s --max-time 20 "$BASE$path" | head -1)
  if echo "$out" | grep -qE "^[A-Za-z\"]" && [ -n "$out" ]; then
    pass=$((pass+1)); echo "  OK    $path (csv header: $(echo "$out" | cut -c1-40)...)"
  else
    fail=$((fail+1)); echo "  FAIL  $path (no csv header: '$out')"
  fi
}

echo "== Wave A flagship registers (regression) =="
for p in "${WAVE_A[@]}"; do smoke "$p"; done
echo "== Wave B registers =="
for p in "${WAVE_B[@]}"; do smoke "$p"; done
echo "== CSV exports (header line check) =="
for p in "${WAVE_B[@]}"; do csv_smoke "$p/csv"; done
echo "== Filter deep-links (shareable URLs) =="
for p in "${FILTERS[@]}"; do smoke "$p"; done
echo "== Unknown filter values degrade (no 500) =="
smoke "/inventory/io-history?itemType=bogus" 200
smoke "/inventory/ledger?from=not-a-date" 200

echo
echo "RESULT: $pass passed, $fail failed"
[ "$fail" = "0" ] && echo "WAVE B ROUTE SMOKE: GREEN" || exit 1
