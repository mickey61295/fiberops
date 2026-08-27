#!/usr/bin/env bash
# M6 Wave B route smoke (SPEC-M6 §12-7): the 5 new screens + regression set.
BASE="http://localhost:3000"
pass=0; fail=0
smoke() {
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 "$BASE$1")
  if [ "$code" = "200" ]; then pass=$((pass+1)); echo "  OK    $1 -> $code"; else fail=$((fail+1)); echo "  FAIL  $1 -> $code"; fi
}
content() {
  local body
  body=$(curl -s --max-time 60 "$BASE$1")
  if echo "$body" | grep -q "$2"; then pass=$((pass+1)); echo "  OK    $1 contains '$2'"; else fail=$((fail+1)); echo "  FAIL  $1 missing '$2'"; fi
}

echo "== M6 Wave B: the 5 admin/dispatch screens (SPEC-M6 §2 rows 5-9) =="
smoke "/dispatch/courier"; content "/dispatch/courier" "Courier DC"
smoke "/dispatch/loading"; content "/dispatch/loading" "Loading Challan"
smoke "/admin/users"; content "/admin/users" "Users &amp; Groups"
smoke "/admin/users?tab=groups"; content "/admin/users?tab=groups" "User Groups"
smoke "/admin/menu-rights"; content "/admin/menu-rights" "Menu Rights"
smoke "/admin/options"; content "/admin/options" "Options &amp; Settings"
smoke "/masters/user"; smoke "/masters/user-group"; smoke "/masters/app-option"; smoke "/masters/hsn"; smoke "/masters/test-parameter"

echo "== regression spot set =="
smoke "/"; smoke "/reports"; smoke "/reports/mis"; smoke "/orders/register"; smoke "/pieces/despatch"
smoke "/masters"; smoke "/masters/party"; smoke "/approvals"; smoke "/admin/company"; smoke "/parity"
content "/parity" "86"

echo ""
echo "M6 Wave B route smoke: $pass pass / $fail fail"
[ "$fail" = "0" ] || exit 1
