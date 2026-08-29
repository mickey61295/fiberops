#!/usr/bin/env bash
# M19 route smoke (SPEC-M19 §5): the material-wise stock day-books + orderwise
# pcs register.
#   1. /inventory/stock/yarn     → 200 + yarn rows ONLY (preset proof) + no
#      "All" option on the preset select + explicit ?itemType=fabric beats it
#   2. /inventory/stock/fabric   → 200 + fabric rows only
#   3. /inventory/stock/accessory → 200 + empty-state (no accessory fixture)
#   4. /inventory/stock/general  → 200 + BOTH yarn + fabric rows (no preset)
#   5. /inventory/stock/itemwise → 200 + grouped summary + item row + txn count
#   6. /pieces/orderwise         → 200 + order + buyer + pcs + value columns
#   7. CSV exports               → text/csv + fixture rows on 2 routes
#   8. sidebar                   → the new day-book labels on the inventory hub
# Server + smoke run in ONE shell (PITFALLS #34: the platform reaps servers).
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M19: start dev server (one shell with the smoke) =="
(npm run dev > /tmp/m19_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m19_dev.log; exit 1; }

echo "== M19: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M19: seed fixtures (godowns + yarn + style + buyer + orders + ledger + current stock) =="
SEED=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const ts = Date.now();
  let uom = await db.uOM.findFirst();
  if (!uom) uom = await db.uOM.create({ data: { code: 'SM19-UOM', name: 'Kgs' } });
  const ga = await db.godown.create({ data: { code: 'SM19GA-' + ts, name: 'Smoke GA ' + ts } });
  const yarn = await db.yarn.create({ data: { code: 'SM19Y-' + ts, count: '30S', uomId: uom.id } });
  const style = await db.style.create({ data: { styleNo: 'SM19S-' + ts } });
  const buyer = await db.buyer.create({ data: { code: 'SM19B-' + ts, name: 'Smoke Buyer ' + ts } });
  const o1 = await db.order.create({ data: { orderNo: 'SM19-O1-' + ts, buyerId: buyer.id, finYear: 'FY26' } });
  const fabricId = 'SM19F-' + ts; // no Fabric master: code falls back to the id
  // FUTURE-dated + HUGE quantities: the day-books page by docDate DESC and
  // itemwise ranks by total movement — dev seed data (≈800 rows dated
  // 2026-09-20) must never push the fixtures off page 1 (deterministic smoke).
  await db.stockLedger.createMany({ data: [
    { txnType: 'opening', itemType: 'yarn', itemId: yarn.id, godownId: ga.id, docNo: 'SM19-LY-' + ts, docDate: new Date('2026-12-31'), finYear: 'FY26', inKgs: 99999 },
    { txnType: 'purchase_grn', itemType: 'fabric', itemId: fabricId, godownId: ga.id, docNo: 'SM19-LF-' + ts, docDate: new Date('2026-12-31'), finYear: 'FY26', inMtrs: 88888 },
  ]});
  await db.currentStock.createMany({ data: [
    { itemType: 'pcs', itemId: style.id, godownId: ga.id, orderId: o1.id, pcs: 9999, rate: 10 },
  ]});
  console.log(JSON.stringify({ ts: String(ts), yarnCode: yarn.code, fabricId, styleNo: style.styleNo, orderNo: o1.orderNo, buyerName: buyer.name, godown: ga.code }));
  await db.\$disconnect();
})()")
TS=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).ts)}catch{console.log('')}})")
YARN=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).yarnCode)}catch{console.log('')}})")
FABRIC=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).fabricId)}catch{console.log('')}})")
ORDER=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).orderNo)}catch{console.log('')}})")
BUYER=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).buyerName)}catch{console.log('')}})")
[ -n "$YARN" ] && ok "fixtures seeded (yarn $YARN / order $ORDER)" || { bad "fixture seed failed"; echo "$SEED" | head -3; }

cleanup() {
  [ -n "$TS" ] && npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const ga = await db.godown.findUnique({ where: { code: 'SM19GA-$TS' } }).catch(()=>null);
  if (ga) {
    await db.stockLedger.deleteMany({ where: { godownId: ga.id } }).catch(()=>{});
    await db.currentStock.deleteMany({ where: { godownId: ga.id } }).catch(()=>{});
  }
  const o = await db.order.findUnique({ where: { orderNo: 'SM19-O1-$TS' } }).catch(()=>null);
  await db.order.deleteMany({ where: { orderNo: 'SM19-O1-$TS' } }).catch(()=>{});
  await db.style.deleteMany({ where: { styleNo: 'SM19S-$TS' } }).catch(()=>{});
  await db.buyer.deleteMany({ where: { code: 'SM19B-$TS' } }).catch(()=>{});
  await db.yarn.deleteMany({ where: { code: 'SM19Y-$TS' } }).catch(()=>{});
  if (ga) await db.godown.deleteMany({ where: { id: ga.id } }).catch(()=>{});
  await db.\$disconnect();
})()" >/dev/null 2>&1
}
trap cleanup EXIT

fetch_page() { curl -s --max-time 30 -b "$JAR" "$BASE$1"; }

echo "== M19-1: yarn day-book (preset proof) =="
body=$(fetch_page "/inventory/stock/yarn")
echo "$body" | grep -q 'Yarn Stock Register' && ok "yarn register title" || bad "yarn title missing"
echo "$body" | grep -q "$YARN" && ok "yarn row present ($YARN)" || bad "yarn row missing"
echo "$body" | grep -q "$FABRIC" && bad "fabric row leaked into yarn day-book" || ok "no fabric rows (preset holds)"
echo "$body" | grep -q '<option value="">All</option>' && bad "preset select still offers All" || ok "All option hidden on preset select"
body=$(fetch_page "/inventory/stock/yarn?itemType=fabric")
echo "$body" | grep -q "$FABRIC" && echo "$body" | grep -q "$YARN" && bad "explicit param lost" || ok "explicit ?itemType=fabric beats the preset"

echo "== M19-2: fabric day-book =="
body=$(fetch_page "/inventory/stock/fabric")
echo "$body" | grep -q 'Fabric Stock Register' && ok "fabric register title" || bad "fabric title missing"
echo "$body" | grep -q "$FABRIC" && ok "fabric row present" || bad "fabric row missing"
echo "$body" | grep -q "$YARN" && bad "yarn row leaked into fabric day-book" || ok "no yarn rows (preset holds)"

echo "== M19-3: accessory day-book (empty state) =="
body=$(fetch_page "/inventory/stock/accessory")
echo "$body" | grep -q 'Accessory Stock Register' && ok "accessory register title" || bad "accessory title missing"
echo "$body" | grep -q 'No accessory movements' && ok "accessory empty message" || bad "accessory empty message missing"

echo "== M19-4: general day-book (no preset) =="
body=$(fetch_page "/inventory/stock/general")
echo "$body" | grep -q 'General Stock Register' && ok "general register title" || bad "general title missing"
echo "$body" | grep -q "$YARN" && echo "$body" | grep -q "$FABRIC" && ok "general shows BOTH yarn + fabric" || bad "general missing rows"
echo "$body" | grep -q '99,999' && ok "general future-dated fixture row value" || bad "general fixture value missing"

echo "== M19-5: itemwise register (grouped) =="
body=$(fetch_page "/inventory/stock/itemwise")
echo "$body" | grep -q 'Itemwise Stock Register' && ok "itemwise register title" || bad "itemwise title missing"
echo "$body" | grep -q "$YARN" && ok "itemwise yarn item row" || bad "itemwise yarn row missing"
echo "$body" | grep -q '99,999' && ok "itemwise yarn movement ranked top" || bad "itemwise movement value missing"
echo "$body" | grep -q 'items moved' && ok "itemwise grouped summary" || bad "itemwise summary missing"
echo "$body" | grep -q 'Txns' && ok "itemwise txn-count column" || bad "itemwise txns column missing"

echo "== M19-6: orderwise pcs register =="
body=$(fetch_page "/pieces/orderwise")
echo "$body" | grep -q 'Orderwise Pcs Register' && ok "orderwise register title" || bad "orderwise title missing"
echo "$body" | grep -q "$ORDER" && ok "orderwise order row ($ORDER)" || bad "orderwise order missing"
echo "$body" | grep -q "$BUYER" && ok "orderwise buyer resolved" || bad "orderwise buyer missing"
echo "$body" | grep -q 'Styles' && ok "orderwise styles column" || bad "orderwise styles column missing"

echo "== M19-7: CSV exports =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR" "$BASE/inventory/stock/yarn/csv")
[ "$code" = "200" ] && ok "yarn CSV 200" || bad "yarn CSV: $code"
body=$(curl -s --max-time 30 -b "$JAR" "$BASE/inventory/stock/yarn/csv")
echo "$body" | grep -q "$YARN" && ok "yarn CSV carries fixture row" || bad "yarn CSV body missing yarn"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR" "$BASE/pieces/orderwise/csv")
[ "$code" = "200" ] && ok "orderwise CSV 200" || bad "orderwise CSV: $code"
body=$(curl -s --max-time 30 -b "$JAR" "$BASE/pieces/orderwise/csv")
echo "$body" | grep -q "$ORDER" && ok "orderwise CSV carries fixture row" || bad "orderwise CSV body missing order"

echo "== M19-8: sidebar carries the day-books =="
body=$(fetch_page "/inventory")
echo "$body" | grep -q 'Yarn Stock Register' && echo "$body" | grep -q 'Itemwise Stock Register' && ok "sidebar: yarn + itemwise labels (inventory group)" || bad "sidebar labels missing"
# the sidebar renders the ACTIVE group's items — orderwise lives in pieces
body=$(fetch_page "/pieces/despatch")
echo "$body" | grep -q 'Orderwise Pcs Register' && ok "sidebar: orderwise label (pieces group)" || bad "sidebar orderwise missing"

echo
echo "== M19 smoke: $pass passed, $fail failed =="
[ "$fail" = "0" ] && exit 0 || exit 1
