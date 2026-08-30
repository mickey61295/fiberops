#!/usr/bin/env bash
# M27 route smoke (SPEC-M27): the print QR — a stamped invoice's print page
# carries the QR svg beside the IRN meta; an unstamped invoice has NO QR;
# a cancelled IRN leaves no QR on the print (the M26 rule).
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M27: start dev server =="
(npm run dev > /tmp/m27_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m27_dev.log; exit 1; }

echo "== M27: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M27: fixtures — one stamped, one plain =="
FIXTURE=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const ts = Date.now();
  const party = await db.party.create({ data: { code: 'SM27-P-' + ts, name: 'Smoke27 ' + ts, partyType: 'supplier' } });
  const stamped = await db.salesInvoice.create({ data: { invoiceNo: 'SM27-INV-A-' + ts, partyId: party.id, finYear: '26-27', billAmount: 80000, status: 'issued', invoiceDate: new Date() } });
  const plain = await db.salesInvoice.create({ data: { invoiceNo: 'SM27-INV-B-' + ts, partyId: party.id, finYear: '26-27', billAmount: 5000, status: 'issued', invoiceDate: new Date() } });
  const { planGenerateIrn } = await import('./src/lib/erp/einvoice');
  const plan = await planGenerateIrn({ invoiceNo: stamped.invoiceNo });
  if (plan.ok) await plan.commit();
  console.log(JSON.stringify({ stamped: stamped.invoiceNo, plain: plain.invoiceNo }));
  await db.\$disconnect();
})();
")
A=$(echo "$FIXTURE" | grep -oE 'SM27-INV-A-[0-9]+')
B=$(echo "$FIXTURE" | grep -oE 'SM27-INV-B-[0-9]+')
echo "$A" | grep -q SM27 && ok "stamped fixture $A" || bad "fixture A missing"
echo "$B" | grep -q SM27 && ok "plain fixture $B" || bad "fixture B missing"

echo "== M27: the stamped print carries the QR =="
pageA=$(curl -s --max-time 30 -b "$JAR" "$BASE/print/invoice/$A")
echo "$pageA" | grep -q 'invoice-qr' && ok "QR block present" || bad "QR block missing"
echo "$pageA" | grep -q '<svg' && ok "inline svg renders" || bad "svg missing"
echo "$pageA" | grep -q 'Scan to verify (mock IRN)' && ok "mock label present" || bad "label missing"
echo "$pageA" | grep -qE 'viewBox="0 0 45 45"' && ok "v5 matrix + quiet zone (45 = 37+8)" || bad "viewBox wrong"
echo "$pageA" | grep -q 'IRN Ack No' && ok "IRN meta rows still present" || bad "meta rows missing"

echo "== M27: the plain print has NO QR =="
pageB=$(curl -s --max-time 30 -b "$JAR" "$BASE/print/invoice/$B")
echo "$pageB" | grep -q 'invoice-qr' && bad "QR should be absent on unstamped" || ok "no QR on unstamped"
echo "$pageB" | grep -q 'IRN Ack No' && bad "IRN rows should be absent" || ok "no IRN rows on unstamped"

echo "== M27: cancel the IRN → the QR leaves the print (M26 rule) =="
CANCEL=$(npx tsx -e "
(async () => {
  const { planCancelIrn } = await import('./src/lib/erp/einvoice');
  const plan = await planCancelIrn({ invoiceNo: '$A', reason: 'typo' });
  if (plan.ok) await plan.commit();
  console.log(plan.ok ? 'cancelled' : 'FAILED');
  await Promise.resolve();
})();
")
echo "$CANCEL" | grep -q cancelled && ok "IRN cancelled" || bad "cancel failed"
pageA2=$(curl -s --max-time 30 -b "$JAR" "$BASE/print/invoice/$A")
echo "$pageA2" | grep -q 'invoice-qr' && bad "QR still on print after cancel" || ok "QR gone after cancel"

echo "== M27: cleanup =="
CLEAN=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  await db.salesInvoice.deleteMany({ where: { invoiceNo: { startsWith: 'SM27-INV-' } } });
  await db.party.deleteMany({ where: { code: { startsWith: 'SM27-P-' } } });
  console.log('cleaned');
  await db.\$disconnect();
})();
")
echo "$CLEAN" | grep -q "cleaned" && ok "fixtures cleaned" || bad "cleanup: $CLEAN"

echo
echo "== M27 RESULT: $pass pass / $fail fail =="
[ "$fail" = "0" ] || exit 1
