#!/usr/bin/env bash
# M19 Wave B route smoke (SPEC-M19 §2): cutting + line-issue + supplier registers
# + the trading fold on /orders/in-hand.
#   1. /cutting/register            → 200 + fixture cut row (bundles, fabric, pcs)
#   2. /production/issue/register   → 200 + fixture issue row
#   3. /procurement/supplier-pending→ 200 + half-received PO chase row
#   4. /procurement/po/register     → 200 + variant=general narrows to PO2
#   5. /procurement/supplier-history→ 200 + party rollup (2 POs, 2 GRNs)
#   6. /orders/in-hand?variant=...  → trading vs manufacturing discriminator
#   7. CSV exports                  → text/csv on 2 routes
#   8. sidebar                      → new labels in cutting + procurement groups
# Server + smoke run in ONE shell (PITFALLS #34: the platform reaps servers).
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M19B: start dev server (one shell with the smoke) =="
(npm run dev > /tmp/m19b_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m19b_dev.log; exit 1; }

echo "== M19B: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M19B: seed fixtures (party + godown + buyer + 2 orders + cut + bundles + line issue + 2 POs + 2 GRNs) =="
SEED=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const ts = Date.now();
  const party = await db.party.create({ data: { code: 'SM19B-P-' + ts, name: 'Smoke Party ' + ts } });
  const ga = await db.godown.create({ data: { code: 'SM19B-G-' + ts, name: 'Smoke GD ' + ts } });
  const buyer = await db.buyer.create({ data: { code: 'SM19B-B-' + ts, name: 'Smoke Buyer ' + ts } });
  const om = await db.order.create({ data: { orderNo: 'SM19B-OM-' + ts, buyerId: buyer.id, finYear: 'FY26', totalPcs: 500, status: 'in_progress' } });
  const ot = await db.order.create({ data: { orderNo: 'SM19B-OT-' + ts, buyerId: buyer.id, finYear: 'FY26', totalPcs: 200, status: 'open' } });
  // manufacturing signal on OM only
  const cut = await db.cutOrder.create({ data: { cutNo: 'SM19B-CUT-' + ts, orderId: om.id, cutDate: new Date('2026-12-31'), fabricIssued: 55.5, totalPcs: 300, status: 'cut' } });
  await db.cutBundle.createMany({ data: [
    { cutOrderId: cut.id, bundleNo: 'SM19B-BN1-' + ts, barcode: 'SM19B-BC1-' + ts, qty: 180 },
    { cutOrderId: cut.id, bundleNo: 'SM19B-BN2-' + ts, barcode: 'SM19B-BC2-' + ts, qty: 120 },
  ]});
  let line = await db.line.findFirst({ where: { code: 'L1' } });
  if (!line) line = await db.line.create({ data: { code: 'SM19B-L-' + ts, name: 'Smoke Line ' + ts } });
  await db.lineIssue.create({ data: { issueNo: 'SM19B-LI-' + ts, orderId: om.id, lineId: line.id, issueDate: new Date('2026-12-31'), qty: 150, status: 'issued' } });
  // po1 half-received (chase), po2 fully received
  const po1 = await db.purchaseOrder.create({ data: { poNo: 'SM19B-PO1-' + ts, poType: 'yarn', partyId: party.id, orderDate: new Date('2026-12-31'), deliveryDate: new Date('2026-12-31'), finYear: 'FY26', status: 'partial', totalQty: 100, totalValue: 1000, lines: { create: [{ itemType: 'yarn', itemId: 'SM19B-ANY', qty: 100, rate: 10, amount: 1000 }] } } });
  const po2 = await db.purchaseOrder.create({ data: { poNo: 'SM19B-PO2-' + ts, poType: 'general', partyId: party.id, orderDate: new Date('2026-12-31'), deliveryDate: new Date('2026-12-31'), finYear: 'FY26', status: 'received', totalQty: 40, totalValue: 200, lines: { create: [{ itemType: 'accessory', itemId: 'SM19B-ANY2', qty: 40, rate: 5, amount: 200 }] } } });
  await db.gRN.createMany({ data: [
    { grnNo: 'SM19B-G1-' + ts, grnType: 'purchase', poId: po1.id, partyId: party.id, godownId: ga.id, grnDate: new Date('2026-12-31'), finYear: 'FY26', totalQty: 50, totalValue: 500 },
    { grnNo: 'SM19B-G2-' + ts, grnType: 'purchase', poId: po2.id, partyId: party.id, godownId: ga.id, grnDate: new Date('2026-12-31'), finYear: 'FY26', totalQty: 40, totalValue: 200 },
  ]});
  console.log(JSON.stringify({ ts: String(ts), party: party.name, cutNo: cut.cutNo, li: 'SM19B-LI-' + ts, po1: po1.poNo, po2: po2.poNo, om: om.orderNo, ot: ot.orderNo }));
  await db.\$disconnect();
})()")
TS=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).ts)}catch{console.log('')}})")
PARTY=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).party)}catch{console.log('')}})")
CUT=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).cutNo)}catch{console.log('')}})")
LI=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).li)}catch{console.log('')}})")
PO1=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).po1)}catch{console.log('')}})")
PO2=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).po2)}catch{console.log('')}})")
OM=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).om)}catch{console.log('')}})")
OT=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).ot)}catch{console.log('')}})")
[ -n "$TS" ] && ok "fixtures seeded (cut $CUT / po1 $PO1)" || { bad "fixture seed failed"; echo "$SEED" | head -3; }

cleanup() {
  [ -n "$TS" ] && npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  await db.gRN.deleteMany({ where: { grnNo: { in: ['SM19B-G1-$TS','SM19B-G2-$TS'] } } }).catch(()=>{});
  const pos = await db.purchaseOrder.findMany({ where: { poNo: { in: ['SM19B-PO1-$TS','SM19B-PO2-$TS'] } }, select: { id: true } });
  if (pos.length) {
    await db.pOLine.deleteMany({ where: { poId: { in: pos.map(p=>p.id) } } }).catch(()=>{});
    await db.purchaseOrder.deleteMany({ where: { id: { in: pos.map(p=>p.id) } } }).catch(()=>{});
  }
  await db.lineIssue.deleteMany({ where: { issueNo: 'SM19B-LI-$TS' } }).catch(()=>{});
  const cuts = await db.cutOrder.findMany({ where: { cutNo: 'SM19B-CUT-$TS' }, select: { id: true } });
  if (cuts.length) {
    await db.cutBundle.deleteMany({ where: { cutOrderId: { in: cuts.map(c=>c.id) } } }).catch(()=>{});
    await db.cutOrder.deleteMany({ where: { id: { in: cuts.map(c=>c.id) } } }).catch(()=>{});
  }
  await db.order.deleteMany({ where: { orderNo: { in: ['SM19B-OM-$TS','SM19B-OT-$TS'] } } }).catch(()=>{});
  await db.buyer.deleteMany({ where: { code: 'SM19B-B-$TS' } }).catch(()=>{});
  await db.line.deleteMany({ where: { code: 'SM19B-L-$TS' } }).catch(()=>{});
  await db.party.deleteMany({ where: { code: 'SM19B-P-$TS' } }).catch(()=>{});
  await db.godown.deleteMany({ where: { code: 'SM19B-G-$TS' } }).catch(()=>{});
  await db.\$disconnect();
})()" >/dev/null 2>&1
}
trap cleanup EXIT

fetch_page() { curl -s --max-time 30 -b "$JAR" "$BASE$1"; }

echo "== M19B-1: cutting register =="
body=$(fetch_page "/cutting/register")
echo "$body" | grep -q 'Cutting Register' && ok "cutting register title" || bad "cutting title missing"
echo "$body" | grep -q "$CUT" && ok "cut row present ($CUT)" || bad "cut row missing"
echo "$body" | grep -q 'Bundles' && ok "bundles column" || bad "bundles column missing"

echo "== M19B-2: line-issue register =="
body=$(fetch_page "/production/issue/register")
echo "$body" | grep -q 'Issue to Line Register' && ok "issue register title" || bad "issue title missing"
echo "$body" | grep -q "$LI" && ok "issue row present ($LI)" || bad "issue row missing"

echo "== M19B-3: supplier pending =="
body=$(fetch_page "/procurement/supplier-pending")
echo "$body" | grep -q 'Supplier Pending Orders' && ok "supplier-pending title" || bad "supplier-pending title missing"
echo "$body" | grep -q "$PO1" && ok "half-received PO chased ($PO1)" || bad "PO1 chase row missing"
echo "$body" | grep -q "$PO2" && bad "fully-received PO leaked into chase list" || ok "fully-received PO correctly absent"
echo "$body" | grep -q '500' && ok "pending value column carries ₹500" || bad "pending value missing"

echo "== M19B-4: PO register (variant = poType) =="
body=$(fetch_page "/procurement/po/register?variant=general")
echo "$body" | grep -q 'PO Register' && ok "PO register title" || bad "PO register title missing"
echo "$body" | grep -q "$PO2" && ok "variant=general shows PO2" || bad "PO2 missing under general"
echo "$body" | grep -q "$PO1" && bad "yarn PO leaked under variant=general" || ok "variant narrows correctly"

echo "== M19B-5: supplier history =="
body=$(fetch_page "/procurement/supplier-history")
echo "$body" | grep -q 'Supplier Order History' && ok "supplier-history title" || bad "supplier-history title missing"
echo "$body" | grep -q "$PARTY" && ok "party rollup row ($PARTY)" || bad "party row missing"
echo "$body" | grep -q 'Last receipt' && ok "last-receipt column" || bad "last-receipt column missing"

echo "== M19B-6: trading fold on /orders/in-hand =="
body=$(fetch_page "/orders/in-hand?variant=trading")
echo "$body" | grep -q "$OT" && ok "trading view shows the no-production order ($OT)" || bad "trading order missing"
echo "$body" | grep -q "$OM" && bad "manufacturing order leaked into trading view" || ok "manufacturing order correctly absent"
body=$(fetch_page "/orders/in-hand?variant=manufacturing")
echo "$body" | grep -q "$OM" && ok "manufacturing view shows the cut order ($OM)" || bad "manufacturing order missing"
echo "$body" | grep -q "$OT" && bad "trading order leaked into manufacturing view" || ok "trading order correctly absent"

echo "== M19B-7: CSV exports =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR" "$BASE/cutting/register/csv")
[ "$code" = "200" ] && ok "cutting CSV 200" || bad "cutting CSV: $code"
body=$(curl -s --max-time 30 -b "$JAR" "$BASE/cutting/register/csv")
echo "$body" | grep -q "$CUT" && ok "cutting CSV carries fixture row" || bad "cutting CSV body missing cut"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR" "$BASE/procurement/supplier-pending/csv")
[ "$code" = "200" ] && ok "supplier-pending CSV 200" || bad "supplier-pending CSV: $code"
body=$(curl -s --max-time 30 -b "$JAR" "$BASE/procurement/supplier-pending/csv")
echo "$body" | grep -q "$PO1" && ok "supplier-pending CSV carries chase row" || bad "supplier-pending CSV body missing PO1"

echo "== M19B-8: sidebar carries the new registers (group-local — PITFALLS #41) =="
body=$(fetch_page "/cutting")
echo "$body" | grep -q 'Cutting Register' && ok "sidebar: cutting register label" || bad "sidebar cutting label missing"
body=$(fetch_page "/procurement")
echo "$body" | grep -q 'Supplier Pending Orders' && echo "$body" | grep -q 'Supplier Order History' && ok "sidebar: supplier labels (procurement group)" || bad "sidebar supplier labels missing"
body=$(fetch_page "/production")
echo "$body" | grep -q 'Issue to Line Register' && ok "sidebar: issue register label (production group)" || bad "sidebar issue label missing"

echo
echo "== M19B smoke: $pass passed, $fail failed =="
[ "$fail" = "0" ] && exit 0 || exit 1
