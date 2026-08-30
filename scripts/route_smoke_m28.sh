#!/usr/bin/env bash
# M28 route smoke (SPEC-M28): holiday surfacing — seed a holiday 6d out +
# an order delivering 10d out → the Order Hub warning strip + the MIS
# shutdown card; a holiday AFTER delivery does NOT warn; no-residue cleanup.
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M28: start dev server =="
(npm run dev > /tmp/m28_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m28_dev.log; exit 1; }

echo "== M28: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M28: fixtures — holiday 6d out, orders delivering 10d / 3d out =="
FIX=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const ts = Date.now();
  const dayMs = 86400000;
  const at = (o: number) => new Date(new Date(Date.now() + o * dayMs).setHours(0, 0, 0, 0));
  await db.govtHoliday.createMany({ data: [
    { date: at(6), name: 'SM28 Pongal ' + ts },
    { date: at(61), name: 'SM28 Far ' + ts },
  ] });
  const buyer = await db.buyer.create({ data: { code: 'SM28-B-' + ts, name: 'Smoke28 ' + ts } });
  const o1 = await db.order.create({ data: { orderNo: 'SM28-O-RISK-' + ts, buyerId: buyer.id, finYear: '26-27', status: 'open', orderDate: new Date(), deliveryDate: at(10), totalPcs: 100 } });
  const o2 = await db.order.create({ data: { orderNo: 'SM28-O-SAFE-' + ts, buyerId: buyer.id, finYear: '26-27', status: 'open', orderDate: new Date(), deliveryDate: at(3), totalPcs: 100 } });
  console.log(JSON.stringify({ risk: o1.orderNo, safe: o2.orderNo }));
  await db.\$disconnect();
})();
")
RISK=$(echo "$FIX" | grep -oE 'SM28-O-RISK-[0-9]+')
SAFE=$(echo "$FIX" | grep -oE 'SM28-O-SAFE-[0-9]+')
echo "$RISK" | grep -q SM28 && ok "risk order $RISK" || bad "fixture missing"

echo "== M28: the Order Hub warning =="
page=$(curl -s --max-time 30 -b "$JAR" "$BASE/orders/$RISK")
echo "$page" | grep -q 'holiday-warning' && ok "warning strip on the at-risk order" || bad "warning missing"
echo "$page" | grep -q 'Shutdown before delivery' && ok "warning text" || bad "warning text missing"
echo "$page" | grep -qE 'SM28 Pongal' && ok "holiday named" || bad "holiday not named"

echo "== M28: the safe order (holiday AFTER delivery) stays silent =="
page2=$(curl -s --max-time 30 -b "$JAR" "$BASE/orders/$SAFE")
echo "$page2" | grep -q 'holiday-warning' && bad "safe order should NOT warn" || ok "no warning on the safe order"

echo "== M28: the MIS shutdown card =="
mis=$(curl -s --max-time 30 -b "$JAR" "$BASE/reports/mis")
echo "$mis" | grep -q 'holiday-strip' && ok "MIS strip present" || bad "MIS strip missing"
echo "$mis" | grep -q 'Upcoming shutdowns' && ok "MIS card title" || bad "MIS title missing"
echo "$mis" | grep -qE 'SM28 Pongal' && ok "holiday listed on MIS" || bad "holiday not on MIS"
echo "$mis" | grep -qE 'SM28 Far' && bad "61d holiday should NOT be on the 45d card" || ok "window honored on MIS"

echo "== M28: cleanup =="
CLEAN=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  await db.govtHoliday.deleteMany({ where: { name: { startsWith: 'SM28 ' } } });
  await db.order.deleteMany({ where: { orderNo: { startsWith: 'SM28-O-' } } });
  await db.buyer.deleteMany({ where: { code: { startsWith: 'SM28-B-' } } });
  const residue = await db.govtHoliday.count({ where: { name: { startsWith: 'SM28 ' } } });
  console.log(residue === 0 ? 'cleaned' : 'RESIDUE ' + residue);
  await db.\$disconnect();
})();
")
echo "$CLEAN" | grep -q cleaned && ok "fixtures cleaned" || bad "cleanup: $CLEAN"

echo
echo "== M28 RESULT: $pass pass / $fail fail =="
[ "$fail" = "0" ] || exit 1
