#!/usr/bin/env bash
# M22 route smoke (SPEC-M22): keypad-operator mode — all three surfaces render
# the full-screen overlay with big-SAVE + field labels (required-only), the
# base pages carry the toggle, the exit link points home, and a service-level
# commit proves the door (the doc-actions path the keypad calls).
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M22: start dev server =="
(npm run dev > /tmp/m22_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m22_dev.log; exit 1; }

echo "== M22: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M22: production tally keypad =="
page=$(curl -s --max-time 30 -b "$JAR" "$BASE/production/entry?mode=keypad")
echo "$page" | grep -q 'keypad-surface' && ok "overlay renders" || bad "overlay missing"
echo "$page" | grep -q 'keypad-save' && ok "big SAVE button" || bad "SAVE missing"
echo "$page" | grep -q "Production Tally" && ok "title" || bad "title missing"
echo "$page" | grep -q "Order No" && echo "$page" | grep -q "Bundle No" && echo "$page" | grep -q "Operator" && ok "required fields (order/bundle/operator)" || bad "required fields missing"
echo "$page" | grep -q ">Style</label>" && bad "optional field leaked into keypad" || ok "optional fields excluded"
echo "$page" | grep -q 'keypad-exit' && ok "exit link" || bad "exit missing"

echo "== M22: cut order keypad =="
cpage=$(curl -s --max-time 30 -b "$JAR" "$BASE/cutting/job-order?mode=keypad")
echo "$cpage" | grep -q 'keypad-surface' && echo "$cpage" | grep -q "Cut Order" && ok "cut order overlay" || bad "cut order overlay missing"
echo "$cpage" | grep -q "Fabric Issued" && ok "fabricIssued field" || bad "fabricIssued missing"
echo "$cpage" | grep -q "Cut No" && bad "auto cutNo must NOT be a keypad field" || ok "auto number excluded"

echo "== M22: waste receipt keypad =="
wpage=$(curl -s --max-time 30 -b "$JAR" "$BASE/inventory/waste-receipt?mode=keypad")
echo "$wpage" | grep -q 'keypad-surface' && echo "$wpage" | grep -q "Waste Receipt" && ok "waste keypad overlay" || bad "waste keypad missing"
echo "$wpage" | grep -q "Waste class" && ok "wasteClass select" || bad "wasteClass missing"

echo "== M22: base pages carry the toggle =="
for r in "/production/entry" "/cutting/job-order" "/inventory/waste-receipt"; do
  b=$(curl -s --max-time 30 -b "$JAR" "$BASE$r")
  echo "$b" | grep -q 'keypad-toggle' && ok "toggle on $r" || bad "toggle missing on $r"
done

echo "== M22: the door itself — commitDocAction round-trip (the keypad's call) =="
COMMIT=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const ts = Date.now();
  const g = await db.godown.create({ data: { code: 'SM22-G-' + ts, name: 'Smoke GD ' + ts } });
  const uom = await db.uOM.findFirst();
  const y = await db.yarn.create({ data: { code: 'SM22-Y-' + ts, count: '30s', uomId: uom.id, rate: 180 } });
  const { commitDocAction } = await import('./src/lib/erp/doc-actions');
  const res = await commitDocAction('waste-receipt', {
    header: { godownCode: g.code, itemType: 'yarn', itemCode: y.code, qty: '12', wasteClass: 'cutting' },
    lines: [],
  });
  const row = res.ok ? await db.stockLedger.findFirst({ where: { docNo: res.doc.docNo } }) : null;
  console.log(JSON.stringify({ ok: res.ok, docNo: res.doc?.docNo, notes: row?.notes, inKgs: row?.inKgs }));
  await db.\$disconnect();
})();
")
echo "$COMMIT" | grep -q '"ok":true' && ok "keypad-shaped payload commits (header-only, lines [])" || bad "commit failed: $COMMIT"
echo "$COMMIT" | grep -q 'Waste — cutting' && ok "waste class carried through the door" || bad "class missing: $COMMIT"

echo "== M22: cleanup =="
CLEAN=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const yarn = await db.yarn.findFirst({ where: { code: { startsWith: 'SM22-Y-' } } });
  if (yarn) {
    await db.stockLedger.deleteMany({ where: { itemId: yarn.id } });
    await db.currentStock.deleteMany({ where: { itemId: yarn.id } });
    await db.yarn.deleteMany({ where: { id: yarn.id } });
  }
  await db.godown.deleteMany({ where: { code: { startsWith: 'SM22-G-' } } });
  console.log('cleaned');
  await db.\$disconnect();
})();
")
echo "$CLEAN" | grep -q "cleaned" && ok "fixtures cleaned" || bad "cleanup: $CLEAN"

echo
echo "== M22 RESULT: $pass pass / $fail fail =="
[ "$fail" = "0" ] || exit 1
