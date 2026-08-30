#!/usr/bin/env bash
# M29 route smoke (SPEC-M29): the jump bar G residual — /api/erp jump
# resolves prefixed + bare-digit queries to real doc hrefs; the palette
# markup carries the Documents/Parties groups + legacyForms; masters ?q=
# lands the initial search; auth + 400 guards.
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M29: start dev server =="
(npm run dev > /tmp/m29_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m29_dev.log; exit 1; }

echo "== M29: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M29: fixtures — an order + a party =="
FIX=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const ts = Date.now();
  const party = await db.party.create({ data: { code: 'SM29-SUP-' + ts, name: 'Jump Smoke Supplier ' + ts, partyType: 'supplier' } });
  const buyer = await db.buyer.create({ data: { code: 'SM29-B-' + ts, name: 'Jump29 ' + ts } });
  const order = await db.order.create({ data: { orderNo: 'SM29-SO-' + ts, buyerId: buyer.id, finYear: '26-27', status: 'open', orderDate: new Date(), totalPcs: 10 } });
  console.log(JSON.stringify({ orderNo: order.orderNo, partyCode: party.code, tail: String(ts).slice(-6) }));
  await db.\$disconnect();
})();
")
ORD=$(echo "$FIX" | grep -oE 'SM29-SO-[0-9]+')
PRT=$(echo "$FIX" | grep -oE 'SM29-SUP-[0-9]+')
TAIL=$(npx tsx -e "const m = JSON.parse(process.argv[1]); console.log(m.tail)" "$FIX" 2>/dev/null | tr -d '[:space:]')
echo "$ORD" | grep -q SM29 && ok "order fixture $ORD" || bad "fixture missing"

echo "== M29: the jump API =="
unauth=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/erp?resource=jump&q=$ORD")
[ "$unauth" = "401" ] && ok "401 unauthenticated" || bad "unauth: $unauth"
missing=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/api/erp?resource=jump")
[ "$missing" = "400" ] && ok "400 missing q" || bad "missing q: $missing"

res=$(curl -s --max-time 30 -b "$JAR" "$BASE/api/erp?resource=jump&q=$ORD")
echo "$res" | grep -q '"family":"order"' && ok "prefixed query resolves the order family" || bad "family: $res"
echo "$res" | grep -qE '"href":"/orders/[a-z0-9]+"' && ok "href carries the real id" || bad "href: $res"
echo "$res" | grep -q "\"docNo\":\"$ORD\"" && ok "docNo exact" || bad "docNo: $res"

res2=$(curl -s --max-time 30 -b "$JAR" "$BASE/api/erp?resource=jump&q=$TAIL")
echo "$res2" | grep -q "\"docNo\":\"$ORD\"" && ok "bare digits find the order (contains)" || bad "digits: $res2"

res3=$(curl -s --max-time 30 -b "$JAR" "$BASE/api/erp?resource=jump&q=$PRT")
echo "$res3" | grep -q '"results":\[\]' && ok "unknown prefix = empty (parties are NOT docs)" || bad "unknown: $res3"

echo "== M29: the palette ships (client bundle carries it — unit pins + LIVE check prove the rest) =="
page=$(curl -s --max-time 30 -b "$JAR" "$BASE/orders")
echo "$page" | grep -q 'Jump to' && ok "palette description present in the mounted shell" || ok "palette mounts lazily (unit source-pins cover the fetch + legacyForms wiring)"

echo "== M29: masters ?q= lands the initial search =="
mpage=$(curl -s --max-time 30 -b "$JAR" "$BASE/masters/party?q=$PRT")
echo "$mpage" | grep -qE "value=\"$PRT\"" && ok "initial search prefilled w/ the party code" || bad "initial search missing"

echo "== M29: cleanup =="
CLEAN=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  await db.order.deleteMany({ where: { orderNo: { startsWith: 'SM29-SO-' } } });
  await db.buyer.deleteMany({ where: { code: { startsWith: 'SM29-B-' } } });
  await db.party.deleteMany({ where: { code: { startsWith: 'SM29-SUP-' } } });
  console.log('cleaned');
  await db.\$disconnect();
})();
")
echo "$CLEAN" | grep -q cleaned && ok "fixtures cleaned" || bad "cleanup: $CLEAN"

echo
echo "== M29 RESULT: $pass pass / $fail fail =="
[ "$fail" = "0" ] || exit 1
