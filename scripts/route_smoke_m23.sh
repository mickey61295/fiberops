#!/usr/bin/env bash
# M23 route smoke (SPEC-M23): the mock e-invoice handshake — the invoice view
# shows the Generate door on an eligible issued invoice, the service stamps
# IRN+ack+EWB (big invoice) / IRN+ack only (small), the button disappears
# post-stamp, and the print route carries the rows.
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M23: start dev server (fresh client after prisma generate) =="
(npm run dev > /tmp/m23_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m23_dev.log; exit 1; }

echo "== M23: login + seed invoices =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

SEED=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const ts = Date.now();
  const p = await db.party.create({ data: { code: 'SM23-P-' + ts, name: 'Smoke Party ' + ts, gstin: '33XYZWVU6789K1Z2' } });
  const big = await db.salesInvoice.create({ data: { invoiceNo: 'SM23-BIG-' + ts, partyId: p.id, invoiceDate: new Date(), finYear: '26-27', billAmount: 120000, status: 'issued' } });
  const small = await db.salesInvoice.create({ data: { invoiceNo: 'SM23-SML-' + ts, partyId: p.id, invoiceDate: new Date(), finYear: '26-27', billAmount: 30000, status: 'issued' } });
  console.log('BIG=' + big.invoiceNo + ' SMALL=' + small.invoiceNo + ' PARTY=' + p.code);
  await db.\$disconnect();
})();
")
BIG=$(echo "$SEED" | grep -o 'BIG=[^ ]*' | cut -d= -f2)
SMALL=$(echo "$SEED" | grep -o 'SMALL=[^ ]*' | cut -d= -f2)
[ -n "$BIG" ] && ok "invoices seeded ($BIG ₹120k / $SMALL ₹30k)" || bad "seed: $SEED"

echo "== M23: the view shows the Generate door (eligible path) =="
vpage=$(curl -s --max-time 30 -b "$JAR" "$BASE/accounts/invoice/$BIG")
echo "$vpage" | grep -q 'generate-irn-button' && ok "Generate IRN button on fresh issued invoice" || bad "button missing"
echo "$vpage" | grep -q 'mock e-invoice' && ok "mock label" || bad "mock label missing"

echo "== M23: the service stamps (big: IRN+ack+EWB; small: IRN+ack, no EWB) =="
STAMP=$(npx tsx -e "
(async () => {
  const { planGenerateIrn } = await import('./src/lib/erp/einvoice');
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const big = await planGenerateIrn({ invoiceNo: '$BIG' });
  const small = await planGenerateIrn({ invoiceNo: '$SMALL' });
  if (big.ok) await big.commit();
  if (small.ok) await small.commit();
  const b = await db.salesInvoice.findUnique({ where: { invoiceNo: '$BIG' } });
  const s = await db.salesInvoice.findUnique({ where: { invoiceNo: '$SMALL' } });
  console.log(JSON.stringify({
    bigIrn: /^[0-9a-f]{64}$/.test(b.irn || ''), bigEwb: /^\d{12}$/.test(b.ewbNo || ''),
    smallIrn: /^[0-9a-f]{64}$/.test(s.irn || ''), smallEwb: s.ewbNo === null,
  }));
  await db.\$disconnect();
})();
")
echo "$STAMP" | grep -q '"bigIrn":true' && echo "$STAMP" | grep -q '"bigEwb":true' && ok "big invoice: 64-hex IRN + 12-digit e-Way Bill" || bad "big stamp: $STAMP"
echo "$STAMP" | grep -q '"smallIrn":true' && echo "$STAMP" | grep -q '"smallEwb":true' && ok "small invoice: IRN, NO e-Way (≤₹50k)" || bad "small stamp: $STAMP"

echo "== M23: post-stamp view shows values, button gone =="
vpage2=$(curl -s --max-time 30 -b "$JAR" "$BASE/accounts/invoice/$BIG")
echo "$vpage2" | grep -q 'IRN (mock)' && ok "stamped IRN renders" || bad "IRN block missing"
echo "$vpage2" | grep -q 'e-Way Bill No (mock)' && ok "e-Way row renders" || bad "EWB row missing"
echo "$vpage2" | grep -q 'generate-irn-button' && bad "button must disappear post-stamp" || ok "button gone post-stamp"

echo "== M23: the print route carries the rows =="
ppage=$(curl -s --max-time 30 -b "$JAR" "$BASE/print/invoice/$BIG")
echo "$ppage" | grep -q "IRN Ack No" && ok "print: IRN Ack row" || bad "print ack missing"
echo "$ppage" | grep -q "e-Way Bill No" && ok "print: e-Way row" || bad "print ewb missing"
psmall=$(curl -s --max-time 30 -b "$JAR" "$BASE/print/invoice/$SMALL")
echo "$psmall" | grep -q "e-Way Bill No" && bad "small invoice print must NOT carry e-Way" || ok "print: small invoice has no e-Way row"

echo "== M23: tool registry =="
TOOLCHECK=$(npx tsx -e "
(async () => {
  const { allTools } = await import('./src/lib/agent/tools');
  const t = allTools.find((x: any) => x.name === 'generate_einvoice_irn');
  console.log(JSON.stringify({ found: !!t, write: t?.isWrite, domain: t?.domain }));
})();
")
echo "$TOOLCHECK" | grep -q '"found":true' && ok "generate_einvoice_irn in registry (write, accounting)" || bad "tool: $TOOLCHECK"

echo "== M23: cleanup =="
CLEAN=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const p = await db.party.findFirst({ where: { code: { startsWith: 'SM23-P-' } } });
  if (p) {
    await db.salesInvoice.deleteMany({ where: { partyId: p.id } });
    await db.party.deleteMany({ where: { id: p.id } });
  }
  console.log('cleaned');
  await db.\$disconnect();
})();
")
echo "$CLEAN" | grep -q "cleaned" && ok "fixtures cleaned" || bad "cleanup: $CLEAN"

echo
echo "== M23 RESULT: $pass pass / $fail fail =="
[ "$fail" = "0" ] || exit 1
