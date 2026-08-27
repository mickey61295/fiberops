#!/usr/bin/env bash
# M7 Wave C route smoke (SPEC-M7 §4): rights enforcement —
#   1. Restricted user (group rights = orders+production):
#      - login sets BOTH cookies (fo_session + fo_rights)
#      - allowed routes 200 (/ , /orders, /orders/new, /production)
#      - denied routes 307 → first-allowed landing "/" (/accounts,
#        /accounts/invoice, /cutting, /admin/users)
#      - SSR sidebar: Orders & Sales present, Accounts & GST ABSENT
#   2. fo_rights cookie absent (session only) → layout layer-2 still denies
#      (the cookie can never GRANT; fresh DB check catches it)
#   3. fo_rights tampered → same 307 (edge skips, layout catches)
#   4. Stale-cookie window: admin tightens rights to ['accounts'] mid-session
#      → /orders (stale-allowed at edge) 307 via the LAYOUT fresh check;
#        /accounts (stale-DENIED at edge) 307 too (documented re-login lag)
#   5. Admin bypass: /accounts + /admin/users + /parity + /programs/new 200
#   6. /api/auth/admin/set-password door: 401 unauth / 403 non-admin /
#      set → login with new password / clear → 401 / clear-self → 400
#   7. Deactivated mid-session: still-cookie'd user → 307 /login (layer 2)
#   8. /api/seed non-admin → 403 (admin-only destructive door)
BASE="http://localhost:3000"
JAR_R1=$(mktemp); JAR_R2=$(mktemp); JAR_R3=$(mktemp); JAR_A=$(mktemp)
JAR_STRIPPED=$(mktemp); JAR_TAMPERED=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

code_of() { curl -s -o /dev/null -w "%{http_code}" --max-time 60 -b "$1" "$BASE$2"; }

# assert 307 redirect to the first-allowed landing (BASE + "/")
deny() { # <label> <jar> <path>
  local out
  out=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" --max-time 60 -b "$2" "$BASE$3")
  if [[ "$out" == "307 $BASE/" || "$out" == "307 /" ]]; then
    ok "$3 -> 307 '/' (denied → first allowed landing)"
  else
    bad "$3 -> '$out' (expected 307 to /)"
  fi
}

echo "== M7 Wave C: fixtures (seed admin + restricted user/group) =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
FIXTURE_OUT=$(npx tsx scripts/m7c_smoke_fixture.ts setup 2>&1)
echo "$FIXTURE_OUT" | grep -q "KEY=setup-ok" && ok "fixture setup" || bad "fixture setup: $FIXTURE_OUT"
RUSER_ID=$(echo "$FIXTURE_OUT" | grep -o 'KEY=user-id=[a-z0-9-]*' | cut -d= -f3)
[ -n "$RUSER_ID" ] && ok "restricted user id captured" || bad "user-id not captured"

echo "== M7 Wave C: restricted login sets BOTH cookies =="
body=$(curl -s --max-time 30 -c "$JAR_R1" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"smoke.restricted@fiberpro.local","password":"restricted123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "restricted login ok" || bad "restricted login: $body"
grep -q "fo_session" "$JAR_R1" && ok "jar has fo_session" || bad "jar missing fo_session"
grep -q "fo_rights" "$JAR_R1" && ok "jar has fo_rights (Wave C)" || bad "jar missing fo_rights"

echo "== M7 Wave C: allowed routes -> 200 (orders + production + universal home) =="
[ "$(code_of "$JAR_R1" "/")" = "200" ] && ok "GET / -> 200 (home always allowed)" || bad "GET / not 200"
[ "$(code_of "$JAR_R1" "/orders")" = "200" ] && ok "GET /orders -> 200" || bad "GET /orders not 200"
[ "$(code_of "$JAR_R1" "/orders/new")" = "200" ] && ok "GET /orders/new -> 200" || bad "GET /orders/new not 200"
[ "$(code_of "$JAR_R1" "/production")" = "200" ] && ok "GET /production -> 200" || bad "GET /production not 200"

echo "== M7 Wave C: denied routes -> 307 '/' (edge rights pre-check) =="
deny "accounts landing" "$JAR_R1" "/accounts"
deny "accounts item"    "$JAR_R1" "/accounts/invoice"
deny "cutting"          "$JAR_R1" "/cutting"
deny "admin screens"    "$JAR_R1" "/admin/users"

echo "== M7 Wave C: SSR sidebar filtered to allowed groups =="
html=$(curl -s --max-time 60 -b "$JAR_R1" "$BASE/")
echo "$html" | grep -q 'Orders &amp; Sales' && ok "sidebar shows Orders & Sales" || bad "sidebar missing Orders & Sales"
if echo "$html" | grep -q 'Accounts &amp; GST'; then bad "sidebar LEAKS Accounts & GST"; else ok "sidebar hides Accounts & GST"; fi
if echo "$html" | grep -q 'Seed demo data'; then bad "restricted user sees Seed button"; else ok "Seed button admin-only"; fi

echo "== M7 Wave C: fo_rights cookie ABSENT -> layout layer-2 still denies =="
grep -v "fo_rights" "$JAR_R1" > "$JAR_STRIPPED"
out=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" --max-time 60 -b "$JAR_STRIPPED" "$BASE/accounts")
[[ "$out" == "307 $BASE/" || "$out" == "307 /" ]] && ok "no fo_rights + GET /accounts -> 307 (fresh DB check)" || bad "no fo_rights: '$out'"

echo "== M7 Wave C: fo_rights TAMPERED -> same 307 (edge skips, layout catches) =="
sed 's/\(fo_rights\t[A-Za-z0-9_.-]\{1,\}\)$/\1X/' "$JAR_R1" > "$JAR_TAMPERED"
grep -q "fo_rights" "$JAR_TAMPERED" || cp "$JAR_R1" "$JAR_TAMPERED" # sed fallback
out=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" --max-time 60 -b "$JAR_TAMPERED" "$BASE/accounts")
[[ "$out" == "307 $BASE/" || "$out" == "307 /" ]] && ok "tampered fo_rights + GET /accounts -> 307" || bad "tampered fo_rights: '$out'"

echo "== M7 Wave C: stale-cookie window (admin tightens rights mid-session) =="
npx tsx scripts/m7c_smoke_fixture.ts tighten >/dev/null 2>&1
out=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" --max-time 60 -b "$JAR_R1" "$BASE/orders")
[[ "$out" == "307 $BASE/" || "$out" == "307 /" ]] \
  && ok "stale-allowed /orders -> 307 via LAYOUT fresh check (revocation works)" \
  || bad "stale-allowed /orders: '$out' (expected 307 — fresh layer did not deny)"
out=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" --max-time 60 -b "$JAR_R1" "$BASE/accounts")
[[ "$out" == "307 $BASE/" || "$out" == "307 /" ]] \
  && ok "stale-denied /accounts -> 307 at edge (new grants need re-login)" \
  || bad "stale-denied /accounts: '$out'"

echo "== M7 Wave C: admin role bypass (no group needed) =="
body=$(curl -s --max-time 30 -c "$JAR_A" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login ok" || bad "admin login: $body"
[ "$(code_of "$JAR_A" "/accounts")" = "200" ] && ok "GET /accounts -> 200 (admin bypass)" || bad "admin /accounts not 200"
[ "$(code_of "$JAR_A" "/admin/users")" = "200" ] && ok "GET /admin/users -> 200" || bad "admin /admin/users not 200"
[ "$(code_of "$JAR_A" "/parity")" = "200" ] && ok "GET /parity -> 200 (meta page)" || bad "admin /parity not 200"
[ "$(code_of "$JAR_A" "/programs/new")" = "200" ] && ok "GET /programs/new -> 200 (regression)" || bad "admin /programs/new not 200"

echo "== M7 Wave C: /api/auth/admin/set-password door =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -X POST -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$RUSER_ID\",\"password\":\"newpass-123\"}" "$BASE/api/auth/admin/set-password")
[ "$code" = "401" ] && ok "unauth set-password -> 401" || bad "unauth set-password -> $code"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR_R1" -X POST -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$RUSER_ID\",\"password\":\"newpass-123\"}" "$BASE/api/auth/admin/set-password")
[ "$code" = "403" ] && ok "non-admin set-password -> 403" || bad "non-admin set-password -> $code"
body=$(curl -s --max-time 30 -b "$JAR_A" -X POST -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$RUSER_ID\",\"password\":\"newpass-123\"}" "$BASE/api/auth/admin/set-password")
echo "$body" | grep -q '"ok":true' && ok "admin sets restricted password" || bad "admin set: $body"
body=$(curl -s --max-time 30 -c "$JAR_R2" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"smoke.restricted@fiberpro.local","password":"newpass-123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "restricted login with NEW password" || bad "new-password login: $body"
body=$(curl -s --max-time 30 -b "$JAR_A" -X POST -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$RUSER_ID\",\"clear\":true}" "$BASE/api/auth/admin/set-password")
echo "$body" | grep -q '"ok":true' && ok "admin clears restricted password" || bad "admin clear: $body"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -X POST -H 'Content-Type: application/json' \
  -d '{"email":"smoke.restricted@fiberpro.local","password":"newpass-123"}' "$BASE/api/auth/login")
[ "$code" = "401" ] && ok "cleared password login -> 401" || bad "cleared-password login -> $code"
ADMIN_ID=$(curl -s --max-time 30 -b "$JAR_A" "$BASE/api/auth/session" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
body=$(curl -s --max-time 30 -b "$JAR_A" -X POST -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$ADMIN_ID\",\"clear\":true}" "$BASE/api/auth/admin/set-password")
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR_A" -X POST -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$ADMIN_ID\",\"clear\":true}" "$BASE/api/auth/admin/set-password")
[ "$code" = "400" ] && ok "clear-self -> 400 (self-lockout guard)" || bad "clear-self -> $code"

echo "== M7 Wave C: /api/seed is admin-only =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR_R2" -X POST "$BASE/api/seed")
[ "$code" = "403" ] && ok "non-admin POST /api/seed -> 403" || bad "non-admin /api/seed -> $code"

echo "== M7 Wave C: deactivated mid-session -> 307 /login (layout layer 2) =="
curl -s --max-time 30 -b "$JAR_A" -X POST -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$RUSER_ID\",\"password\":\"final-pass-123\"}" "$BASE/api/auth/admin/set-password" >/dev/null
body=$(curl -s --max-time 30 -c "$JAR_R3" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"smoke.restricted@fiberpro.local","password":"final-pass-123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "restricted re-login for deactivate test" || bad "re-login: $body"
npx tsx scripts/m7c_smoke_fixture.ts deactivate >/dev/null 2>&1
out=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" --max-time 60 -b "$JAR_R3" "$BASE/")
[[ "$out" == *"login"* ]] && ok "deactivated user page GET -> 307 /login" || bad "deactivated: '$out'"

echo "== M7 Wave C: cleanup =="
CLEANUP_OUT=$(npx tsx scripts/m7c_smoke_fixture.ts cleanup 2>&1)
echo "$CLEANUP_OUT" | grep -q "KEY=cleanup-ok" && ok "fixture cleanup" || bad "cleanup: $CLEANUP_OUT"

echo ""
echo "M7 Wave C smoke: $pass passed, $fail failed"
[ "$fail" = "0" ] || exit 1
