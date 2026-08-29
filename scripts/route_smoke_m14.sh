#!/usr/bin/env bash
# M14 route smoke (SPEC-M14): the /live SSE surface + the perf claim spot-check.
#   1. /live page              → 200 + SSR first snapshot
#   2. /api/live-tracker       → 401 unauth / 200 snapshot shape (session)
#   3. /api/live-tracker/stream→ 401 unauth / SSE frames with a session
#   4. indexes present         → the perf probe reruns clean (unit test covers)
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M14: start dev server (one shell with the smoke) =="
(npm run dev > /tmp/m14_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m14_dev.log; exit 1; }

echo "== M14: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M14-1: /live page (SSR first snapshot) =="
body=$(curl -s --max-time 30 -b "$JAR" "$BASE/live")
echo "$body" | grep -q 'text/event-stream\|LiveStreamTracker\|data-live' && ok "/live renders the stream client" || bad "/live client marker missing"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$BASE/live")
[ "$code" = "307" ] && ok "unauthenticated /live 307" || bad "unauth /live: $code"

echo "== M14-2: /api/live-tracker snapshot =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$BASE/api/live-tracker")
[ "$code" = "401" ] && ok "unauthenticated snapshot 401" || bad "unauth snapshot: $code"
body=$(curl -s --max-time 30 -b "$JAR" "$BASE/api/live-tracker")
echo "$body" | grep -q '"health"' && echo "$body" | grep -q '"parity"' && echo "$body" | grep -q '"families"' && ok "snapshot shape (health/parity/families)" || bad "snapshot shape wrong: $(echo "$body" | head -c 200)"

echo "== M14-3: /api/live-tracker/stream SSE =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BASE/api/live-tracker/stream")
[ "$code" = "401" ] && ok "unauthenticated stream 401" || bad "unauth stream: $code"
# authenticated: read ~8s of the stream, expect the initial frame + at least one tick (3s)
frames=$(curl -s -N --max-time 8 -b "$JAR" "$BASE/api/live-tracker/stream" 2>/dev/null | grep -c '^data: ')
[ "$frames" -ge 2 ] && ok "SSE stream delivered $frames frames in 8s (3s tick)" || bad "SSE frames: $frames"

echo "== M14-4: /tracker (the parity-style view) untouched =="
body=$(curl -s --max-time 30 -b "$JAR" "$BASE/tracker")
echo "$body" | grep -q 'tracker\|Tracker' && ok "/tracker still renders" || bad "/tracker broken"

echo
echo "== M14 smoke: $pass passed, $fail failed =="
[ "$fail" = "0" ] && exit 0 || exit 1
