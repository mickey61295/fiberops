#!/usr/bin/env bash
# M9 route smoke (SPEC-M9 §7, REVISED parity-style board): the Live Operations Tracker.
#   1. Unauthenticated /tracker → 307 /login (middleware layer 1)
#   2. Unauthenticated /api/tracker → 401 JSON (requireApiSession)
#   3. Authenticated: /tracker 200 + "Live Tracker" + LIVE badge + the board
#      (summary tile "Screens active today", table columns Records/Latest)
#   4. /api/tracker 200 with the §4 snapshot shape (kpis/feed/modules/approvals/agent/system)
#   5. feedLimit caps: ?feedLimit=1 → ≤1 entry; 0/99/abc → 400
#   6. Liveness: a freshly written AgentTurn marker appears in the feed, then is cleaned up
#   7. The sidebar carries the Live Tracker door (SSR)
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M9: unauthenticated guards =="
out=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" --max-time 60 "$BASE/tracker")
[[ "$out" == "307 $BASE/login"* ]] && ok "/tracker unauth -> 307 /login" || bad "unauth page guard: '$out'"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 "$BASE/api/tracker")
body=$(curl -s --max-time 60 "$BASE/api/tracker")
[[ "$code" == "401" && "$body" == *"error"* ]] && ok "/api/tracker unauth -> 401 JSON" || bad "unauth API guard: $code $body"

echo "== M9: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M9: the /tracker screen =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 -b "$JAR" "$BASE/tracker")
html=$(curl -s --max-time 60 -b "$JAR" "$BASE/tracker")
if [[ "$code" == "200" && "$html" == *"Live Tracker"* ]]; then
  ok "/tracker -> 200 with 'Live Tracker' title"
else
  bad "/tracker -> $code (want 200 + title)"
fi
[[ "$html" == *"LIVE"* ]] && ok "/tracker renders the LIVE badge" || bad "LIVE badge missing"
[[ "$html" == *"Live Operations Board"* ]] && ok "/tracker renders the board summary card" || bad "board summary card missing"
[[ "$html" == *"Screens active today"* ]] && ok "summary tile 'Screens active today' present" || bad "summary tile missing"
[[ "$html" == *"Records"* ]] && ok "board table 'Records' column present" || bad "Records column missing"
[[ "$html" == *"Latest"* ]] && ok "board table 'Latest' column present" || bad "Latest column missing"
[[ "$html" == *"Activity Feed"* ]] && ok "/tracker renders the Activity Feed card" || bad "Activity Feed card missing"
[[ "$html" == *"/tracker"* ]] && ok "sidebar carries the Live Tracker door (SSR)" || bad "sidebar door missing"

echo "== M9: /api/tracker snapshot shape (§4) =="
body=$(curl -s --max-time 60 -b "$JAR" "$BASE/api/tracker")
for key in '"generatedAt"' '"kpis"' '"docsToday"' '"feed"' '"modules"' '"activeToday"' '"familiesTotal"' '"listHref"' '"approvals"' '"pendingApprovals"' '"agent"' '"system"' '"serverTime"'; do
  echo "$body" | grep -q "$key" && ok "snapshot has $key" || bad "snapshot missing $key"
done
n=$(echo "$body" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.feed.length)})" 2>/dev/null)
[[ "$n" =~ ^[0-9]+$ && "$n" -ge 1 ]] && ok "feed has $n entries (non-empty)" || bad "feed empty/malformed: '$n'"
g=$(echo "$body" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.modules.groups.length)})" 2>/dev/null)
[[ "$g" == "11" ]] && ok "modules board has 11 groups" || bad "modules groups: '$g' (want 11)"
f=$(echo "$body" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.modules.familiesTotal)})" 2>/dev/null)
[[ "$f" == "17" ]] && ok "modules board has 17 families" || bad "modules familiesTotal: '$f' (want 17)"

echo "== M9: feedLimit caps =="
body=$(curl -s --max-time 60 -b "$JAR" "$BASE/api/tracker?feedLimit=1")
n=$(echo "$body" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.feed.length)})" 2>/dev/null)
[[ "$n" == "1" ]] && ok "?feedLimit=1 -> exactly 1 entry" || bad "?feedLimit=1 -> '$n'"
for badlimit in 0 99 abc; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR" "$BASE/api/tracker?feedLimit=$badlimit")
  [[ "$code" == "400" ]] && ok "?feedLimit=$badlimit -> 400" || bad "?feedLimit=$badlimit -> $code"
done

echo "== M9: liveness — a fresh marker row shows up in the feed =="
MARKER="M9-SMOKE-MARKER-$(date +%s)"
TURN_ID=$(node -e "
const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();
(async()=>{
  const t=await db.agentTurn.create({data:{prompt:'${MARKER} live feed probe',userId:'m9-smoke'}});
  console.log(t.id);
  await db.\$disconnect();
})()")
body=$(curl -s --max-time 60 -b "$JAR" "$BASE/api/tracker")
if [[ "$body" == *"${MARKER}"* ]]; then
  ok "fresh AgentTurn appears in the live feed"
else
  bad "fresh AgentTurn NOT in the feed"
fi
node -e "
const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();
(async()=>{
  await db.agentTurn.deleteMany({where:{id:'$TURN_ID'}}).catch(()=>{});
  await db.\$disconnect();
})()" && ok "marker row cleaned up"

echo "== M9: non-admin (restricted rights) still sees the tracker (home group = always allowed) =="
npx tsx scripts/m7c_smoke_fixture.ts setup | grep -q "setup-ok" && ok "restricted fixture user ready (m7c helper)" || bad "restricted fixture setup failed"

JAR2=$(mktemp)
body=$(curl -s --max-time 30 -c "$JAR2" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"smoke.restricted@fiberpro.local","password":"restricted123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "restricted user login" || bad "restricted login: $body"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 -b "$JAR2" "$BASE/tracker")
[[ "$code" == "200" ]] && ok "restricted user /tracker -> 200 (home always allowed)" || bad "restricted /tracker -> $code"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR2" "$BASE/api/tracker")
[[ "$code" == "200" ]] && ok "restricted user /api/tracker -> 200" || bad "restricted /api/tracker -> $code"
npx tsx scripts/m7c_smoke_fixture.ts cleanup | grep -q "cleanup-ok" && ok "restricted fixture cleaned up" || bad "fixture cleanup failed"

rm -f "$JAR" "$JAR2"
echo
echo "== M9 smoke: $pass passed, $fail failed =="
[[ $fail -eq 0 ]] && echo "RESULT: ALL GREEN" || echo "RESULT: FAILURES PRESENT"
exit $fail
