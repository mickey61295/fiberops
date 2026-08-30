#!/usr/bin/env bash
# M33 route smoke (SPEC-M33): bundle labels — seed a cut order with 3 bundles
# → /print/bundle-labels/<cutNo> renders 3 label cards with Code128 SVGs + human
# text; the single reprint by bundleNo AND barcode; unknown → 404; the cut
# order VIEW carries the print-labels door; no-residue cleanup.
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M33: start dev server =="
(npm run dev > /tmp/m33_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m33_dev.log; exit 1; }

echo "== M33: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M33: fixture — cut order + 3 bundles =="
FIX=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const ts = Date.now();
  const buyer = await db.buyer.create({ data: { code: 'SM33-B-' + ts, name: 'Smoke33 ' + ts } });
  const style = await db.style.create({ data: { styleNo: 'SM33-ST-' + ts } });
  const order = await db.order.create({ data: { orderNo: 'SM33-O-' + ts, buyerId: buyer.id, styleId: style.id, finYear: '26-27', totalPcs: 250 } });
  const cut = await db.cutOrder.create({ data: { cutNo: 'SM33-CUT-' + ts, orderId: order.id, fabricIssued: 180, totalPcs: 250, status: 'planned' } });
  for (let i = 1; i <= 3; i++) {
    await db.cutBundle.create({ data: { cutOrderId: cut.id, bundleNo: 'SM33-CUT-' + ts + '/B' + i, barcode: '*SM33CUT' + ts + 'B00' + i + '*', qty: 100, status: 'in_cutting' } });
  }
  console.log(JSON.stringify({ cut: cut.cutNo }));
  await db.\$disconnect();
})();
")
CUT=$(echo "$FIX" | grep -oE 'SM33-CUT-[0-9]+')
echo "$CUT" | grep -q SM33 && ok "fixture cut order $CUT" || bad "fixture missing"

echo "== M33: the label sheet (3 cards, Code128 SVGs, human text) =="
page=$(curl -s --max-time 30 -b "$JAR" "$BASE/print/bundle-labels/$CUT")
echo "$page" | grep -q 'label-cards' && ok "label-card grid present" || bad "label grid missing"
echo "$page" | grep -q 'BUNDLE LABELS' && ok "sheet title" || bad "sheet title missing"
CARDS=$(echo "$page" | grep -oE "${CUT}/B[0-9]+" | sort -u | wc -l)
[ "$CARDS" = "3" ] && ok "3 distinct label cards" || bad "expected 3 cards, got $CARDS"
SVGS=$(echo "$page" | grep -o 'crispEdges' | wc -l)
[ "$SVGS" -ge "3" ] && ok "$SVGS Code128 SVGs rendered" || bad "barcode SVGs missing ($SVGS)"
echo "$page" | grep -q "\*SM33CUT" && ok "human-readable barcode text" || bad "barcode text missing"
echo "$page" | grep -q 'SM33-O-' && ok "order no on the sheet" || bad "order no missing"

echo "== M33: single label reprint (by bundleNo AND by barcode) =="
# bundleNo carries '/' → %2F in the path; the barcode is path-safe as-is
one=$(curl -s --max-time 30 -b "$JAR" "$BASE/print/bundle-label/$CUT%2FB2")
echo "$one" | grep -q 'BUNDLE LABEL' && ok "single reprint renders (by bundleNo)" || bad "single reprint missing"
echo "$one" | grep -q "${CUT}/B2" && ok "reprint names the bundle" || bad "reprint bundle no missing"
BC=$(echo "$one" | grep -oE '\*SM33CUT[0-9]+B002\*' | head -1)
if [ -z "$BC" ]; then
  bad "could not read the barcode text from the reprint"
else
  # the asterisk is a legal path char — no encoding needed
  two=$(curl -s --max-time 30 -b "$JAR" "$BASE/print/bundle-label/$BC")
  echo "$two" | grep -q "${CUT}/B2" && ok "reprint by BARCODE resolves the same bundle" || bad "barcode reprint failed"
fi

echo "== M33: honest 404s =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR" "$BASE/print/bundle-labels/CUT-9999")
[ "$code" = "404" ] && ok "unknown cut → 404" || bad "unknown cut → $code"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR" "$BASE/print/bundle-label/CUT-9999/B1")
[ "$code" = "404" ] && ok "unknown bundle → 404" || bad "unknown bundle → $code"

echo "== M33: the cut-order VIEW door =="
view=$(curl -s --max-time 30 -b "$JAR" "$BASE/cutting/job-order/$CUT")
echo "$view" | grep -q 'Print bundle labels' && ok "view carries the labels door" || bad "labels door missing on view"
echo "$view" | grep -q "bundle-labels/$CUT" && ok "door links the right cut" || bad "door link wrong"

echo "== M33: cleanup =="
CLEAN=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  await db.cutBundle.deleteMany({ where: { bundleNo: { startsWith: 'SM33-CUT-' } } });
  await db.cutOrder.deleteMany({ where: { cutNo: { startsWith: 'SM33-CUT-' } } });
  await db.order.deleteMany({ where: { orderNo: { startsWith: 'SM33-O-' } } });
  await db.style.deleteMany({ where: { styleNo: { startsWith: 'SM33-ST-' } } });
  await db.buyer.deleteMany({ where: { code: { startsWith: 'SM33-B-' } } });
  const residue = await db.cutBundle.count({ where: { bundleNo: { startsWith: 'SM33-CUT-' } } });
  console.log(residue === 0 ? 'cleaned' : 'RESIDUE ' + residue);
  await db.\$disconnect();
})();
")
echo "$CLEAN" | grep -q cleaned && ok "fixtures cleaned" || bad "cleanup: $CLEAN"

echo
echo "== M33 RESULT: $pass pass / $fail fail =="
[ "$fail" = "0" ] || exit 1
