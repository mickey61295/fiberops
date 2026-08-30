#!/usr/bin/env bash
# M21 route smoke (SPEC-M21): waste receipt — the DocScreen form renders with
# the waste-class select, a committed WST- row shows in the recent table, the
# menu/sidebar carry the item, the ledger row is visible on the stock ledger
# register, and receive_waste is in the agent registry.
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M21: start dev server =="
(npm run dev > /tmp/m21_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m21_dev.log; exit 1; }

echo "== M21: login + commit a waste receipt via the service =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

SEED=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const ts = Date.now();
  const g = await db.godown.create({ data: { code: 'SM21-G-' + ts, name: 'Smoke GD ' + ts } });
  const uom = await db.uOM.findFirst();
  const y = await db.yarn.create({ data: { code: 'SM21-Y-' + ts, count: '30s', uomId: uom.id, rate: 180 } });
  const { planWasteReceipt } = await import('./src/lib/erp/posting/stock-adj');
  const plan = await planWasteReceipt({ godownCode: g.code, itemType: 'yarn', itemCode: y.code, qty: 33, wasteClass: 'knitting', notes: 'smoke' });
  const res = await plan.commit();
  console.log('WST=' + res.docNo + ' YARN=' + y.code + ' GODOWN=' + g.code);
  await db.\$disconnect();
})();
")
WST=$(echo "$SEED" | grep -o 'WST=[^ ]*' | cut -d= -f2)
YARN=$(echo "$SEED" | grep -o 'YARN=[^ ]*' | cut -d= -f2)
GODOWN=$(echo "$SEED" | grep -o 'GODOWN=[^ ]*' | cut -d= -f2)
[ -n "$WST" ] && ok "waste receipt committed ($WST)" || bad "commit: $SEED"

echo "== M21: the DocScreen page =="
page=$(curl -s --max-time 30 -b "$JAR" "$BASE/inventory/waste-receipt")
[ -n "$page" ] && ok "GET /inventory/waste-receipt renders" || bad "page empty"
echo "$page" | grep -q "Waste Receipt" && ok "title renders" || bad "title missing"
echo "$page" | grep -q "Waste class" && ok "waste-class select present" || bad "waste class field missing"
echo "$page" | grep -q "Cutting waste" && ok "chindi option present" || bad "cutting waste option missing"
echo "$page" | grep -q "$WST" && ok "recent table shows $WST" || bad "recent table missing $WST"
echo "$page" | grep -q "$YARN" && ok "recent table resolves item code" || bad "item code missing"
echo "$page" | grep -q "knitting" && ok "waste class renders on the row" || bad "class missing on row"

echo "== M21: ledger visibility (the stock ledger day-book) =="
ledger=$(curl -s --max-time 30 -b "$JAR" "$BASE/inventory/ledger?from=$(date +%F)&to=$(date +%F)")
echo "$ledger" | grep -q "$WST" && ok "stock ledger shows the WST row" || bad "stock ledger missing $WST"

echo "== M21: menu + sidebar + tool =="
ipage=$(curl -s --max-time 30 -b "$JAR" "$BASE/inventory")
echo "$ipage" | grep -q "/inventory/waste-receipt" && ok "inventory group links Waste Receipt" || bad "group link missing"
spage=$(curl -s --max-time 30 -b "$JAR" "$BASE/inventory/waste-receipt")
echo "$spage" | grep -q "Waste Receipt" && echo "$spage" | grep -q "Inventory" && ok "breadcrumb renders" || bad "breadcrumb missing"
TOOLCHECK=$(npx tsx -e "
(async () => {
  const { allTools } = await import('./src/lib/agent/tools');
  const t = allTools.find((x: any) => x.name === 'receive_waste');
  console.log(JSON.stringify({ found: !!t, write: t?.isWrite, domain: t?.domain }));
})();
")
echo "$TOOLCHECK" | grep -q '"found":true' && ok "receive_waste in registry (write, inventory)" || bad "tool missing: $TOOLCHECK"

echo "== M21: cleanup =="
CLEAN=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const yarn = await db.yarn.findFirst({ where: { code: { startsWith: 'SM21-Y-' } } });
  if (yarn) {
    await db.stockLedger.deleteMany({ where: { itemId: yarn.id } });
    await db.currentStock.deleteMany({ where: { itemId: yarn.id } });
    await db.yarn.deleteMany({ where: { id: yarn.id } });
  }
  await db.godown.deleteMany({ where: { code: { startsWith: 'SM21-G-' } } });
  console.log('cleaned');
  await db.\$disconnect();
})();
")
echo "$CLEAN" | grep -q "cleaned" && ok "fixtures cleaned" || bad "cleanup: $CLEAN"

echo
echo "== M21 RESULT: $pass pass / $fail fail =="
[ "$fail" = "0" ] || exit 1
