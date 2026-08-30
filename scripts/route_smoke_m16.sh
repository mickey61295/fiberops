#!/usr/bin/env bash
# M16 route smoke (SPEC-M16): role-aware dashboard SSR — admin superset (tiles
# + all 3 charts + customize door), merchandiser pipeline vs accountant cash
# picks (present/absent), and the persisted tile layout (AppOption
# dashboard:admin:tiles) honored by the page render end-to-end.
BASE="http://localhost:3000"
JAR=$(mktemp)
JAR_M=$(mktemp)
JAR_A=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M16: start dev server =="
(npm run dev > /tmp/m16_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m16_dev.log; exit 1; }

echo "== M16: login admin + fixture users =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

FIX=$(npx tsx scripts/m16_smoke_fixture.ts setup 2>&1)
MERCH_EMAIL=$(echo "$FIX" | grep MERCH_EMAIL= | cut -d= -f2)
ACCT_EMAIL=$(echo "$FIX" | grep ACCT_EMAIL= | cut -d= -f2)
[ -n "$MERCH_EMAIL" ] && [ -n "$ACCT_EMAIL" ] && ok "fixture users created" || bad "fixture setup: $FIX"

mbody=$(curl -s --max-time 30 -c "$JAR_M" -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$MERCH_EMAIL\",\"password\":\"m16pass123\"}" "$BASE/api/auth/login")
echo "$mbody" | grep -q '"ok":true' && ok "merchandiser login" || bad "merchandiser login: $mbody"
abody=$(curl -s --max-time 30 -c "$JAR_A" -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ACCT_EMAIL\",\"password\":\"m16pass123\"}" "$BASE/api/auth/login")
echo "$abody" | grep -q '"ok":true' && ok "accountant login" || bad "accountant login: $abody"

echo "== M16: admin dashboard (superset) =="
page=$(curl -s --max-time 30 -b "$JAR" "$BASE/")
[ -n "$page" ] && ok "GET / renders" || bad "GET / empty"
echo "$page" | grep -q 'dashboard-role-label">Admin' && ok "role label: Admin" || bad "role label admin missing"
echo "$page" | grep -q 'dashboard-tile-open_orders' && ok "tile: open_orders" || bad "tile open_orders missing"
echo "$page" | grep -q 'dashboard-tile-received_30d' && ok "tile: received_30d" || bad "tile received_30d missing"
echo "$page" | grep -q 'dashboard-customize"' && ok "customize door present" || bad "customize door missing"
echo "$page" | grep -q 'dashboard-chain-chart' && ok "chart: chain funnel" || bad "chain chart missing"
echo "$page" | grep -q 'dashboard-production-chart' && ok "chart: production trend" || bad "production chart missing"
echo "$page" | grep -q 'dashboard-cash-chart' && ok "chart: cash position" || bad "cash chart missing"
echo "$page" | grep -q 'data-testid="dashboard-tile-low_stock"' && bad "admin must NOT render storekeeper low_stock tile" || ok "admin tile set excludes low_stock (role-aware)"
echo "$page" | grep -q 'NavSidebar\|nav' && ok "shell still renders" || bad "shell missing"

echo "== M16: merchandiser dashboard (order pipeline) =="
mpage=$(curl -s --max-time 30 -b "$JAR_M" "$BASE/")
echo "$mpage" | grep -q 'dashboard-role-label">Merchandiser' && ok "role label: Merchandiser" || bad "role label merch missing"
echo "$mpage" | grep -q 'dashboard-tile-inhand_pcs' && ok "tile: inhand_pcs (pipeline)" || bad "inhand_pcs missing"
echo "$mpage" | grep -q 'dashboard-tile-samples_pending' && ok "tile: samples_pending" || bad "samples_pending missing"
echo "$mpage" | grep -q 'dashboard-chain-chart' && ok "chart: chain funnel" || bad "merch chain chart missing"
echo "$mpage" | grep -q 'dashboard-cash-chart' && bad "merchandiser must NOT get the cash chart" || ok "cash chart absent (role picks)"
echo "$mpage" | grep -q 'dashboard-tile-employees' && bad "merchandiser must NOT get hr employees tile" || ok "employees tile absent"

echo "== M16: accountant dashboard (cash position) =="
apage=$(curl -s --max-time 30 -b "$JAR_A" "$BASE/")
echo "$apage" | grep -q 'dashboard-role-label">Accountant' && ok "role label: Accountant" || bad "role label acct missing"
echo "$apage" | grep -q 'dashboard-cash-chart' && ok "chart: cash position" || bad "acct cash chart missing"
echo "$apage" | grep -q 'dashboard-tile-received_30d' && ok "tile: received_30d" || bad "acct received_30d missing"
echo "$apage" | grep -q 'dashboard-chain-chart' && bad "accountant must NOT get the chain chart" || ok "chain chart absent (role picks)"
echo "$apage" | grep -q 'dashboard-tile-today_pcs' && bad "accountant must NOT get today_pcs" || ok "today_pcs absent"

echo "== M16: persisted tile layout drives SSR =="
npx tsx scripts/m16_smoke_fixture.ts persist >/dev/null 2>&1
ppage=$(curl -s --max-time 30 -b "$JAR" "$BASE/")
echo "$ppage" | grep -q 'dashboard-tile-employees' && ok "persisted tile renders (employees)" || bad "persisted tile employees missing"
echo "$ppage" | grep -q 'dashboard-tile-open_orders' && bad "un-persisted tile must NOT render" || ok "open_orders absent under pinned layout"

echo "== M16: cleanup =="
npx tsx scripts/m16_smoke_fixture.ts cleanup >/dev/null 2>&1 && ok "fixture cleaned" || bad "cleanup errored"

echo
echo "== M16 RESULT: $pass pass / $fail fail =="
[ "$fail" = "0" ] || exit 1
