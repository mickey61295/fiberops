#!/usr/bin/env bash
# M7 Wave A route smoke (SPEC-M7 §7): the login core —
#   guard (307 → /login?next=), login, cookie-authenticated pages, session
#   route, wrong-password 401, bootstrap closed (403), logout.
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

smoke() { # <path> <expected-code> [extra-cookie-args...]
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 "${@:3}" "$BASE$1")
  if [ "$code" = "$2" ]; then pass=$((pass+1)); echo "  OK    $1 -> $code"; else fail=$((fail+1)); echo "  FAIL  $1 -> $code (expected $2)"; fi
}

echo "== M7 Wave A: seed admin (idempotent; closes bootstrap) =="
npx tsx scripts/seed_admin.ts || { echo "  FAIL  seed_admin.ts errored"; fail=$((fail+1)); }

echo "== M7 Wave A: unauthenticated page guard (307 → /login?next=…) =="
guard() {
  local out
  out=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" --max-time 60 "$BASE$1")
  if [[ "$out" == *" 307 "* ]] || [[ "$out" == "307 "* ]]; then :; fi
  if [[ "$out" == 307\ *login*next* ]]; then pass=$((pass+1)); echo "  OK    $1 -> 307 login?next"; else fail=$((fail+1)); echo "  FAIL  $1 -> '$out' (expected 307 to /login?next=…)"; fi
}
guard "/"
guard "/programs/new"
guard "/approvals"
guard "/reports/mis"
guard "/masters"
guard "/parity"

echo "== M7 Wave A: wrong password → 401; malformed → 400 =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -X POST -H 'Content-Type: application/json' -d '{"email":"admin@fiberpro.local","password":"definitely-wrong"}' "$BASE/api/auth/login")
[ "$code" = "401" ] && { pass=$((pass+1)); echo "  OK    wrong password -> 401"; } || { fail=$((fail+1)); echo "  FAIL  wrong password -> $code"; }
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/auth/login")
[ "$code" = "400" ] && { pass=$((pass+1)); echo "  OK    empty body -> 400"; } || { fail=$((fail+1)); echo "  FAIL  empty body -> $code"; }

echo "== M7 Wave A: bootstrap closed once a password exists (403) =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -X POST -H 'Content-Type: application/json' -d '{"email":"evil@x.io","password":"hackerman1"}' "$BASE/api/auth/bootstrap")
[ "$code" = "403" ] && { pass=$((pass+1)); echo "  OK    bootstrap -> 403"; } || { fail=$((fail+1)); echo "  FAIL  bootstrap -> $code"; }

echo "== M7 Wave A: login sets cookie; session reports the user =="
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
if echo "$body" | grep -q '"ok":true'; then pass=$((pass+1)); echo "  OK    login ok:true"; else fail=$((fail+1)); echo "  FAIL  login body: $body"; fi
if grep -q "fo_session" "$JAR"; then pass=$((pass+1)); echo "  OK    cookie jar has fo_session"; else fail=$((fail+1)); echo "  FAIL  cookie jar missing fo_session"; fi
body=$(curl -s --max-time 30 -b "$JAR" "$BASE/api/auth/session")
if echo "$body" | grep -q "admin@fiberpro.local"; then pass=$((pass+1)); echo "  OK    session route returns the admin"; else fail=$((fail+1)); echo "  FAIL  session body: $body"; fi

echo "== M7 Wave A: authenticated core route set (200) =="
for p in "/" "/programs/new" "/approvals" "/cutting/production" "/cutting/issue" "/reports/mis" "/reports" "/masters" "/admin/users" "/orders" "/inventory" "/parity"; do
  smoke "$p" "200" -b "$JAR"
done

echo "== M7 Wave A: /login itself stays public (200) =="
smoke "/login" "200"

echo "== M7 Wave A: logout clears the session =="
body=$(curl -s --max-time 30 -b "$JAR" -c "$JAR" -X POST "$BASE/api/auth/logout")
if echo "$body" | grep -q '"ok":true'; then pass=$((pass+1)); echo "  OK    logout ok:true"; else fail=$((fail+1)); echo "  FAIL  logout body: $body"; fi
out=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" --max-time 60 -b "$JAR" "$BASE/programs/new")
if [[ "$out" == 307\ *login* ]]; then pass=$((pass+1)); echo "  OK    post-logout page -> 307 login"; else fail=$((fail+1)); echo "  FAIL  post-logout: '$out'"; fi

rm -f "$JAR"
echo
echo "== RESULT: $pass pass / $fail fail =="
[ "$fail" = "0" ] && exit 0 || exit 1
