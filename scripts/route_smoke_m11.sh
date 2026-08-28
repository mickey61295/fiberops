#!/usr/bin/env bash
# M11 route smoke (SPEC-M11 §4): the Feature Flags screen + the /api/config doors.
#   1. Unauthenticated: /admin/settings → 307 /login (middleware layer 1);
#      GET and POST /api/config → 401 JSON (requireApiSession — GET guarded since M11)
#   2. Admin login; GET /api/config shape: 28 typed flags + 28-entry registry
#   3. /admin/settings 200: title, category card, flag row, sidebar door
#   4. 400s: unknown flag (registry drift-safe), bad number, missing value
#   5. Persistence round-trips: boolean flip + number set → GET reflects typed
#      values → the reloaded SCREEN carries the new value (grn_dev 6.5) → restore
#   6. Non-admin WITH masters-admin group rights (role layer under group layer):
#      page 200 + "Admin role required" notice, POST → 403
BASE="http://localhost:3000"
JAR=$(mktemp)
JAR2=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

jqn() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log($1)})" 2>/dev/null; }

echo "== M11: unauthenticated guards =="
out=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" --max-time 60 "$BASE/admin/settings")
[[ "$out" == "307 $BASE/login"* ]] && ok "/admin/settings unauth -> 307 /login" || bad "unauth page guard: '$out'"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 "$BASE/api/config")
[[ "$code" == "401" ]] && ok "GET /api/config unauth -> 401 (guarded since M11)" || bad "GET unauth: $code"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 -X POST -H 'Content-Type: application/json' \
  -d '{"name":"po_bud","value":false}' "$BASE/api/config")
[[ "$code" == "401" ]] && ok "POST /api/config unauth -> 401" || bad "POST unauth: $code"

echo "== M11: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M11: GET /api/config shape (FlagsProvider + registry) =="
body=$(curl -s --max-time 60 -b "$JAR" "$BASE/api/config")
n=$(echo "$body" | jqn "Object.keys(j.flags).length")
[[ "$n" == "28" ]] && ok "flags record has 28 keys" || bad "flags keys: '$n' (want 28)"
n=$(echo "$body" | jqn "j.registry.length")
[[ "$n" == "28" ]] && ok "registry has 28 entries" || bad "registry length: '$n' (want 28)"
echo "$body" | grep -q '"po_bud"' && ok "po_bud present in flags" || bad "po_bud missing"
v=$(echo "$body" | jqn "typeof j.flags.po_bud")
[[ "$v" == "boolean" ]] && ok "po_bud arrives typed boolean" || bad "po_bud type: '$v'"

echo "== M11: the /admin/settings screen =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 -b "$JAR" "$BASE/admin/settings")
html=$(curl -s --max-time 60 -b "$JAR" "$BASE/admin/settings")
if [[ "$code" == "200" && "$html" == *"Feature Flags"* ]]; then
  ok "/admin/settings -> 200 with 'Feature Flags' title"
else
  bad "/admin/settings -> $code (want 200 + title)"
fi
[[ "$html" == *"Tolerances &amp; Deviations"* || "$html" == *"Tolerances & Deviations"* ]] && ok "category card 'Tolerances & Deviations' present" || bad "tolerance category card missing"
[[ "$html" == *"Commercial Switches"* ]] && ok "category card 'Commercial Switches' present" || bad "commercial category card missing"
[[ "$html" == *"data-flag=\"po_bud\""* ]] && ok "flag row po_bud renders" || bad "po_bud row missing"
[[ "$html" == *"Value for grn_dev"* ]] && ok "grn_dev value input renders" || bad "grn_dev input missing"
[[ "$html" == *"/admin/settings"* ]] && ok "sidebar carries the Feature Flags door (SSR)" || bad "sidebar door missing"

echo "== M11: POST validation (400s) =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"evil_flag_not_in_registry","value":"1"}' "$BASE/api/config")
[[ "$code" == "400" ]] && ok "unknown flag -> 400 (registry drift-safe)" || bad "unknown flag -> $code"
body=$(curl -s --max-time 30 -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"evil_flag_not_in_registry","value":"1"}' "$BASE/api/config")
echo "$body" | grep -q "not in the registry" && ok "drift-safe message text" || bad "message: $body"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"grn_dev","value":"not-a-number"}' "$BASE/api/config")
[[ "$code" == "400" ]] && ok "non-finite number -> 400" || bad "bad number -> $code"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"po_bud"}' "$BASE/api/config")
[[ "$code" == "400" ]] && ok "missing value -> 400" || bad "missing value -> $code"

echo "== M11: persistence round-trips (restore after) =="
# capture originals
body=$(curl -s --max-time 60 -b "$JAR" "$BASE/api/config")
ORIG_PO=$(echo "$body" | jqn "j.flags.po_bud")
ORIG_DEV=$(echo "$body" | jqn "j.flags.grn_dev")

# boolean flip
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"po_bud","value":false}' "$BASE/api/config")
[[ "$code" == "200" ]] && ok "POST po_bud=false -> 200" || bad "POST po_bud -> $code"
body=$(curl -s --max-time 60 -b "$JAR" "$BASE/api/config")
v=$(echo "$body" | jqn "j.flags.po_bud")
[[ "$v" == "false" ]] && ok "GET reflects po_bud=false (typed)" || bad "po_bud after flip: '$v'"

# number set to a value no registry default has (6.5) so the page grep is unambiguous
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"grn_dev","value":6.5}' "$BASE/api/config")
[[ "$code" == "200" ]] && ok "POST grn_dev=6.5 -> 200" || bad "POST grn_dev -> $code"
body=$(curl -s --max-time 60 -b "$JAR" "$BASE/api/config")
v=$(echo "$body" | jqn "j.flags.grn_dev")
[[ "$v" == "6.5" ]] && ok "GET reflects grn_dev=6.5 (typed number)" || bad "grn_dev after set: '$v'"

# the reloaded SCREEN carries the persisted value (persistence across reload)
html=$(curl -s --max-time 60 -b "$JAR" "$BASE/admin/settings")
[[ "$html" == *"value=\"6.5\""* ]] && ok "reloaded screen renders grn_dev value 6.5" || bad "screen does not carry 6.5"

# restore both
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"po_bud\",\"value\":$ORIG_PO}" "$BASE/api/config")
[[ "$code" == "200" ]] && ok "po_bud restored to $ORIG_PO" || bad "po_bud restore -> $code"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"grn_dev\",\"value\":$ORIG_DEV}" "$BASE/api/config")
[[ "$code" == "200" ]] && ok "grn_dev restored to $ORIG_DEV" || bad "grn_dev restore -> $code"
body=$(curl -s --max-time 60 -b "$JAR" "$BASE/api/config")
v=$(echo "$body" | jqn "String(j.flags.grn_dev)")
[[ "$v" == "$ORIG_DEV" ]] && ok "GET confirms grn_dev back at $ORIG_DEV" || bad "grn_dev restore check: '$v' vs '$ORIG_DEV'"

echo "== M11: non-admin WITH masters-admin group rights (role layer under group layer) =="
npx tsx scripts/m11_smoke_fixture.ts setup | grep -q "setup-ok" && ok "flag-ops fixture user ready" || bad "fixture setup failed"
body=$(curl -s --max-time 30 -c "$JAR2" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"smoke.flagops@fiberpro.local","password":"flagops123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "non-admin (merchandiser, masters-admin group) login" || bad "non-admin login: $body"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 -b "$JAR2" "$BASE/admin/settings")
html=$(curl -s --max-time 60 -b "$JAR2" "$BASE/admin/settings")
if [[ "$code" == "200" && "$html" == *"Admin role required"* ]]; then
  ok "non-admin /admin/settings -> 200 + admin-only notice (no board)"
else
  bad "non-admin page: $code (want 200 + notice)"
fi
[[ "$html" != *"data-flag=\"po_bud\""* ]] && ok "notice page leaks NO flag rows" || bad "flag rows leaked to non-admin"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR2" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"po_bud","value":true}' "$BASE/api/config")
[[ "$code" == "403" ]] && ok "non-admin POST /api/config -> 403" || bad "non-admin POST -> $code"
npx tsx scripts/m11_smoke_fixture.ts cleanup | grep -q "cleanup-ok" && ok "flag-ops fixture cleaned up" || bad "fixture cleanup failed"

rm -f "$JAR" "$JAR2"
echo
echo "== M11 smoke: $pass passed, $fail failed =="
[[ $fail -eq 0 ]] && echo "RESULT: ALL GREEN" || echo "RESULT: FAILURES PRESENT"
exit $fail
