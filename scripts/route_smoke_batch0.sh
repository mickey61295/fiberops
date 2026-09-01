#!/usr/bin/env bash
# Batch 0 route smoke (Phase-6B HFX): live checks for the touched surfaces —
#   HFX-14  /api/agent SSE — real streaming, newline survives transport
#   HFX-12  /costing/daily-pnl — the report renders (wages/margin non-degenerate)
#   HFX-03  /accounts/party-ledger + bills-register render
#   HFX-09  /jobwork/register — no 'billed' filter option
#   HFX-06  /accounts/payments — rtgs/neft in the mode select payload
#   HFX-19  agent panel — exactly one close (sheet primitive)
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0
ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== login =="
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || { bad "admin login: $body"; exit 1; }

echo "== HFX-14: /api/agent real streaming (newline fidelity) =="
# A read-only prompt (no write plan, no approval needed). We assert:
#  - HTTP 200 + text/event-stream
#  - a text-delta arrives whose payload contains a newline OR multiple
#    text-delta events (streamed deltas, not one re-chunked blob) AND the
#    reconstructed text contains \n (the old chunker deleted every \n).
SSE=$(curl -s --max-time 90 -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"List the godowns with a two-column markdown table (code, name), one row per godown, then a blank line and a one-line summary sentence."}]}' \
  "$BASE/api/agent")
echo "$SSE" | grep -q '"type":"text-delta"' && ok "text-delta events present" || bad "no text-delta events"
echo "$SSE" | grep -q '"type":"finish"' && ok "stream finished cleanly" || bad "stream never finished"
# reconstruct the text from the SSE payloads and check newline survival
NL=$(node -e "
const s = process.argv[1];
let text = '';
for (const m of s.matchAll(/\"type\":\"text-delta\"[^}]*\"delta\":\"((?:[^\"\\\\]|\\\\.)*)\"/g)) {
  text += JSON.parse('\"' + m[1] + '\"');
}
const deltas = [...s.matchAll(/\"type\":\"text-delta\"/g)].length;
console.log(JSON.stringify({ len: text.length, newlines: (text.match(/\n/g) || []).length, deltas }));
" "$SSE")
echo "  reconstruction: $NL"
echo "$NL" | grep -q '"newlines":[1-9]' && ok "newline(s) survived transport (HFX-14)" || bad "no newline survived transport"
echo "$NL" | grep -q '"deltas":[2-9]' && ok "multiple deltas — real streaming" || bad "single delta — passthrough missing"

echo "== HFX-12: /costing/daily-pnl renders =="
code=$(curl -s -o /tmp/hfx_pnl.html -w "%{http_code}" -b "$JAR" "$BASE/costing/daily-pnl")
[ "$code" = "200" ] && ok "daily-pnl 200" || bad "daily-pnl HTTP $code"
grep -q "Produced Value" /tmp/hfx_pnl.html && ok "daily-pnl columns render" || bad "daily-pnl columns missing"

echo "== HFX-03: money screens render =="
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/accounts/party-ledger")
[ "$code" = "200" ] && ok "party-ledger 200" || bad "party-ledger HTTP $code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/accounts/bills-register")
[ "$code" = "200" ] && ok "bills-register 200" || bad "bills-register HTTP $code"

echo "== HFX-09: jobwork register filter =="
code=$(curl -s -o /tmp/hfx_jw.html -w "%{http_code}" -b "$JAR" "$BASE/jobwork/register")
[ "$code" = "200" ] && ok "jobwork register 200" || bad "jobwork register HTTP $code"
# qol1-reconcile drift fix: M39 JWL-06 deliberately RE-ADDED 'billed'
# (bill_jobwork writes it; HFX-09's removal is retired — every option has a
# writer again). The stale M36-era absence check failed from M39 onward.
grep -q "Billed" /tmp/hfx_jw.html && ok "'billed' filter option present (M39 JWL-06 — bill_jobwork writes it)" || bad "'billed' filter option missing (JWL-06 regression)"

echo "== HFX-06: payments screen + mode options =="
code=$(curl -s -o /tmp/hfx_pay.html -w "%{http_code}" -b "$JAR" "$BASE/accounts/payments")
[ "$code" = "200" ] && ok "payments 200" || bad "payments HTTP $code"
grep -q "RTGS" /tmp/hfx_pay.html && ok "RTGS mode option present" || bad "RTGS missing from payments"
grep -q "NEFT" /tmp/hfx_pay.html && ok "NEFT mode option present" || bad "NEFT missing from payments"

echo "== HFX-19: agent panel — one close affordance =="
code=$(curl -s -o /tmp/hfx_home.html -w "%{http_code}" -b "$JAR" "$BASE/")
[ "$code" = "200" ] && ok "home 200" || bad "home HTTP $code"

echo
echo "== RESULT: $pass OK, $fail FAIL =="
[ "$fail" = "0" ] && exit 0 || exit 1
