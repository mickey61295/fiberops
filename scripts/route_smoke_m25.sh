#!/usr/bin/env bash
# M25 route smoke (SPEC-M25): the line-grid keypad on /pieces/despatch —
# overlay renders the big line editor (ADD LINE + Lines counter), the base
# page carries the toggle, SAVE without lines shows the guard (client-side,
# verified via component contract in unit tests + SSR markers here), and a
# service-level two-line commitDocAction round-trip proves the door carries
# { header, lines } payloads.
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M25: start dev server =="
(npm run dev > /tmp/m25_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m25_dev.log; exit 1; }

echo "== M25: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M25: the despatch keypad overlay =="
page=$(curl -s --max-time 30 -b "$JAR" "$BASE/pieces/despatch?mode=keypad")
echo "$page" | grep -q 'keypad-surface' && ok "overlay renders" || bad "overlay missing"
echo "$page" | grep -q 'Pcs Despatch' && ok "title" || bad "title missing"
echo "$page" | grep -q 'ADD LINE' && ok "ADD LINE button" || bad "ADD LINE missing"
echo "$page" | grep -q 'Lines (' && ok "Lines counter" || bad "Lines counter missing"
echo "$page" | grep -q 'Order No' && ok "orderNo header field" || bad "orderNo missing"
echo "$page" | grep -q 'Total Pcs' && ok "totalPcs header field" || bad "totalPcs missing"
echo "$page" | grep -q 'keypad-add-line' && ok "add-line testid" || bad "add-line testid missing"

echo "== M25: the base page toggle =="
page2=$(curl -s --max-time 30 -b "$JAR" "$BASE/pieces/despatch")
echo "$page2" | grep -q 'mode=keypad' && ok "toggle link on base page" || bad "toggle missing"
echo "$page2" | grep -q 'keypad-surface' && bad "base page should NOT render the overlay" || ok "base page clean of overlay"

echo "== M25: the door itself — two-line commitDocAction round-trip =="
COMMIT=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const ts = Date.now();
  const buyer = await db.buyer.create({ data: { code: 'SM25-B-' + ts, name: 'Smoke Buyer ' + ts } });
  const style = await db.style.create({ data: { styleNo: 'SM25-S-' + ts, buyerId: buyer.id } });
  const order = await db.order.create({ data: { orderNo: 'SM25-O-' + ts, buyerId: buyer.id, styleId: style.id, orderDate: new Date(), finYear: '26-27', totalPcs: 5000 } });
  const gd = await db.godown.create({ data: { code: 'SM25-G-' + ts, name: 'Smoke GD ' + ts } });
  await db.stockLedger.create({ data: { docNo: 'SM25-OPEN-' + ts, docDate: new Date(), txnType: 'stock_adjustment_add', finYear: '26-27', itemType: 'pcs', itemId: style.id, godownId: gd.id, inPcs: 3000, rate: 100 } });
  await db.currentStock.create({ data: { itemType: 'pcs', itemId: style.id, godownId: gd.id, pcs: 3000, rate: 100 } });
  const { commitDocAction } = await import('./src/lib/erp/doc-actions');
  const res = await commitDocAction('despatch', {
    header: { orderNo: order.orderNo, totalPcs: '2' },
    lines: [ { styleNo: style.styleNo, qty: '1' }, { styleNo: style.styleNo, qty: '1' } ],
  });
  const dcNo = res.ok ? res.doc?.dcNo : null;
  const dc = dcNo ? await db.pcsDespatch.findUnique({ where: { dcNo }, include: { lines: true } }) : null;
  const ledger = dc ? await db.stockLedger.findFirst({ where: { docNo: dc.dcNo } }) : null;
  console.log(JSON.stringify({ ok: res.ok, dcNo, totalPcs: dc?.totalPcs, lineCount: dc?.lines?.length, outPcs: ledger?.outPcs }));
  // children-first cleanup
  if (dc) {
    await db.pcsDespatchLine.deleteMany({ where: { pcsDespatchId: dc.id } });
    await db.pcsDespatch.delete({ where: { id: dc.id } });
  }
  await db.stockLedger.deleteMany({ where: { itemId: style.id } });
  await db.currentStock.deleteMany({ where: { itemId: style.id } });
  await db.order.deleteMany({ where: { orderNo: 'SM25-O-' + ts } });
  await db.style.deleteMany({ where: { styleNo: 'SM25-S-' + ts } });
  await db.buyer.deleteMany({ where: { code: 'SM25-B-' + ts } });
  await db.godown.deleteMany({ where: { code: 'SM25-G-' + ts } });
  await db.\$disconnect();
})();
")
echo "$COMMIT" | grep -q '"ok":true' && ok "two-line payload commits through the door" || bad "commit failed: $COMMIT"
echo "$COMMIT" | grep -q '"lineCount":2' && ok "both line rows land" || bad "lines missing: $COMMIT"
echo "$COMMIT" | grep -q '"totalPcs":2' && ok "totalPcs honored" || bad "totalPcs wrong: $COMMIT"
echo "$COMMIT" | grep -q '"outPcs":2' && ok "pcs ledger out-row written" || bad "ledger missing: $COMMIT"

echo "== M25: cleanup check =="
RESIDUE=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const c = await Promise.all([
    db.buyer.count({ where: { code: { startsWith: 'SM25-' } } }),
    db.order.count({ where: { orderNo: { startsWith: 'SM25-' } } }),
  ]);
  console.log(c[0] + c[1]);
  await db.\$disconnect();
})();
")
[ "$RESIDUE" = "0" ] && ok "zero fixture residue" || bad "residue: $RESIDUE"

echo
echo "== M25 RESULT: $pass pass / $fail fail =="
[ "$fail" = "0" ] || exit 1
