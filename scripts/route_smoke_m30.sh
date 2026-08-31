#!/usr/bin/env bash
# M30 route smoke (SPEC-M30 §3.4): the approval-door CONTRACT — the
# correlation token is required and verified. The live proposing loop is
# owned by tests/unit/agent-loop.test.ts + approval-correlation.test.ts;
# this smoke drives the DOOR against the running dev server:
#   1. /api/agent POST without session → 401 JSON (M7 Wave B pin).
#   2. Approve door without session → 401.
#   3. Input guards: missing approvalId → 400; unknown tool → 400;
#      read-only tool → 400; invalid args (zod) → 400.
#   4. Unknown approvalId → 404.
#   5. Happy path: fixture proposal row → approve with the token → 200 +
#      party committed + turn row approved (SCOPED) + audit row (M15 choke).
#   6. Double-approve → 409 already_approved (idempotency).
#   7. Stale plan (TOCTOU): tampered persisted plan → 409 plan_changed and
#      NOTHING commits.
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

code_of() { printf '%s' "$1" | tail -c 3; }

echo "== M30: start dev server (one shell with the smoke) =="
(npm run dev > /tmp/m30_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m30_dev.log; exit 1; }

echo "== M30: seed admin + login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M30: guard pins (401 without session) =="
out=$(curl -s -w "\n%{http_code}" --max-time 30 -X POST -H 'Content-Type: application/json' -d '{"messages":[]}' "$BASE/api/agent")
code="${out##*$'\n'}"
[ "$code" = "401" ] && ok "POST /api/agent (no cookie) -> 401" || bad "POST /api/agent -> $code"
out=$(curl -s -w "\n%{http_code}" --max-time 30 -X POST -H 'Content-Type: application/json' -d '{"toolName":"create_party","args":{},"approvalId":"x"}' "$BASE/api/agent/approve")
code="${out##*$'\n'}"
[ "$code" = "401" ] && ok "POST /api/agent/approve (no cookie) -> 401" || bad "POST /api/agent/approve -> $code"

echo "== M30: approve-door input guards (400) =="
out=$(curl -s -w "\n%{http_code}" --max-time 30 -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"toolName":"create_party","args":{"name":"X","partyType":"both"}}' "$BASE/api/agent/approve")
code="${out##*$'\n'}"; body="${out%$'\n'*}"
[ "$code" = "400" ] && echo "$body" | grep -q 'approvalId required' && ok "missing approvalId -> 400 (panel must round-trip the token)" || bad "missing approvalId -> $code '$body'"
out=$(curl -s -w "\n%{http_code}" --max-time 30 -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"toolName":"no_such_tool","args":{},"approvalId":"x"}' "$BASE/api/agent/approve")
code="${out##*$'\n'}"
[ "$code" = "400" ] && ok "unknown tool -> 400" || bad "unknown tool -> $code"
out=$(curl -s -w "\n%{http_code}" --max-time 30 -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"toolName":"list_orders","args":{},"approvalId":"x"}' "$BASE/api/agent/approve")
code="${out##*$'\n'}"
[ "$code" = "400" ] && ok "read-only tool -> 400" || bad "read-only tool -> $code"

echo "== M30: unknown approvalId -> 404 =="
out=$(curl -s -w "\n%{http_code}" --max-time 30 -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"toolName":"create_party","args":{"name":"Ghost","partyType":"both","code":"SM30-GHOST"},"approvalId":"no-such-token"}' "$BASE/api/agent/approve")
code="${out##*$'\n'}"; body="${out%$'\n'*}"
[ "$code" = "404" ] && echo "$body" | grep -q 'Unknown approval' && ok "unknown approvalId -> 404" || bad "unknown approvalId -> $code '$body'"

echo "== M30: invalid args (zod) -> 400, nothing executes =="
out=$(curl -s -w "\n%{http_code}" --max-time 30 -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"toolName":"create_party","args":{"partyType":"both"},"approvalId":"no-such-token"}' "$BASE/api/agent/approve")
code="${out##*$'\n'}"; body="${out%$'\n'*}"
[ "$code" = "400" ] && echo "$body" | grep -q 'Invalid arguments' && ok "invalid args -> 400 with zod issues" || bad "invalid args -> $code '$body'"

echo "== M30: happy path — correlated approve commits (200) =="
SEED=$(npx tsx scripts/m30_smoke_fixture.ts setup 2>/dev/null)
TS=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).ts)}catch{console.log('')}})")
APPROVAL_ID=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).approvalId)}catch{console.log('')}})")
[ -n "$APPROVAL_ID" ] && ok "proposal turn row + approvalId fixture" || { bad "fixture setup failed"; echo "$SEED" | head -3; }

out=$(curl -s -w "\n%{http_code}" --max-time 60 -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"toolName":"create_party","args":{"name":"M30 Smoke Party '$TS'","partyType":"both","code":"SM30-P-'$TS'"},"approvalId":"'$APPROVAL_ID'"}' "$BASE/api/agent/approve")
code="${out##*$'\n'}"; body="${out%$'\n'*}"
if [ "$code" = "200" ] && echo "$body" | grep -q '"success":true'; then
  ok "correlated approve -> 200 success (approvalId round-tripped)"
else
  bad "correlated approve -> $code '$body'"
fi

verify=$(npx tsx scripts/m30_smoke_fixture.ts verify "$TS" 2>/dev/null)
echo "$verify" | grep -q "KEY=verify-ok" && ok "party committed + turn row approved (SCOPED)" || bad "verify: $verify"

AUDIT=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const row = await db.auditLog.findFirst({ where: { docNo: 'SM30-P-$TS' } });
  console.log(row ? row.actorSource + ':' + row.action : 'none');
  await db.\$disconnect();
})()" 2>/dev/null)
[ "$AUDIT" = "agent:create" ] && ok "audit row via the M15 runCommit choke point (source=agent)" || bad "audit row: '$AUDIT'"

echo "== M30: double-approve -> 409 already_approved =="
out=$(curl -s -w "\n%{http_code}" --max-time 60 -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"toolName":"create_party","args":{"name":"M30 Smoke Party '$TS'","partyType":"both","code":"SM30-P-'$TS'"},"approvalId":"'$APPROVAL_ID'"}' "$BASE/api/agent/approve")
code="${out##*$'\n'}"; body="${out%$'\n'*}"
[ "$code" = "409" ] && echo "$body" | grep -q 'already_approved' && ok "double-approve -> 409 already_approved" || bad "double-approve -> $code '$body'"

echo "== M30: stale plan (TOCTOU) -> 409 plan_changed, NOTHING commits =="
SEED2=$(npx tsx scripts/m30_smoke_fixture.ts setup 2>/dev/null)
TS2=$(echo "$SEED2" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).ts)}catch{console.log('')}})")
APPROVAL_ID2=$(echo "$SEED2" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).approvalId)}catch{console.log('')}})")
npx tsx scripts/m30_smoke_fixture.ts stale "$TS2" 2>/dev/null | grep -q "KEY=stale-ok" && ok "persisted plan tampered" || bad "stale fixture failed"

out=$(curl -s -w "\n%{http_code}" --max-time 60 -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"toolName":"create_party","args":{"name":"M30 Smoke Party '$TS2'","partyType":"both","code":"SM30-P-'$TS2'"},"approvalId":"'$APPROVAL_ID2'"}' "$BASE/api/agent/approve")
code="${out##*$'\n'}"; body="${out%$'\n'*}"
if [ "$code" = "409" ] && echo "$body" | grep -q 'plan_changed'; then
  ok "stale plan -> 409 plan_changed (TOCTOU guard held)"
else
  bad "stale plan -> $code '$body'"
fi
status=$(npx tsx scripts/m30_smoke_fixture.ts partystatus "$TS2" 2>/dev/null)
[ "$status" = "KEY=party-absent" ] && ok "NOTHING committed on plan_changed" || bad "stale plan committed anyway: $status"

echo "== M30: cleanup =="
npx tsx scripts/m30_smoke_fixture.ts clean "$TS" >/dev/null 2>&1
npx tsx scripts/m30_smoke_fixture.ts clean "$TS2" >/dev/null 2>&1
status=$(npx tsx scripts/m30_smoke_fixture.ts partystatus "$TS" 2>/dev/null)
[ "$status" = "KEY=party-absent" ] && ok "fixture rows cleaned" || bad "cleanup left rows"

rm -f "$JAR"
echo
echo "== RESULT: $pass pass / $fail fail =="
[ "$fail" = "0" ] && exit 0 || exit 1
