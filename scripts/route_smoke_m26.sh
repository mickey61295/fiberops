#!/usr/bin/env bash
# M26 route smoke (SPEC-M26): the IRN cancellation workflow — the invoice
# view renders the Cancel form (reason select) on a freshly-stamped invoice;
# a service-level cancel → the history line renders + regen button returns;
# the print carries NO IRN rows after cancel; the agent tool is registered.
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M26: start dev server =="
(npm run dev > /tmp/m26_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m26_dev.log; exit 1; }

echo "== M26: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M26: stamp an invoice, then check the Cancel form =="
STAMP=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const ts = Date.now();
  const party = await db.party.create({ data: { code: 'SM26-P-' + ts, name: 'Smoke26 ' + ts, partyType: 'supplier' } });
  const inv = await db.salesInvoice.create({ data: { invoiceNo: 'SM26-INV-' + ts, partyId: party.id, finYear: '26-27', billAmount: 80000, status: 'issued', invoiceDate: new Date() } });
  const { planGenerateIrn } = await import('./src/lib/erp/einvoice');
  const plan = await planGenerateIrn({ invoiceNo: inv.invoiceNo });
  if (plan.ok) await plan.commit();
  console.log(JSON.stringify({ invoiceNo: inv.invoiceNo, stamped: plan.ok }));
  await db.\$disconnect();
})();
")
INV=$(echo "$STAMP" | grep -oE 'SM26-INV-[0-9]+')
echo "$STAMP" | grep -q '"stamped":true' && ok "invoice stamped via the service" || bad "stamp failed: $STAMP"

page=$(curl -s --max-time 30 -b "$JAR" "$BASE/accounts/invoice/$INV")
echo "$page" | grep -q 'cancel-irn-form' && ok "Cancel form renders on the stamped invoice" || bad "cancel form missing"
echo "$page" | grep -q 'cancel-irn-button' && ok "Cancel IRN button present" || bad "cancel button missing"
echo "$page" | grep -q 'IRN cancellation reason' && ok "reason select (aria-label)" || bad "reason select missing"
echo "$page" | grep -qE '<option value="order_cancelled">' && ok "govt reason enum options" || bad "reason options missing"
echo "$page" | grep -q '24h window' && ok "24h window note" || bad "window note missing"

echo "== M26: cancel through the SERVICE (the form door's same plan), verify view + print =="
CANCEL=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const { planCancelIrn } = await import('./src/lib/erp/einvoice');
  const plan = await planCancelIrn({ invoiceNo: '$INV', reason: 'wrong_entry' });
  let result = { ok: plan.ok };
  if (plan.ok) {
    await plan.commit();
    const inv = await db.salesInvoice.findUnique({ where: { invoiceNo: '$INV' } });
    result = { ok: true, irn: inv.irn, ack: inv.irnAckNo, cancelledIrn: (inv.irnCancelledIrn || '').slice(0, 12), hasDate: !!inv.irnCancelledAt };
  } else { result = { ok: false, error: plan.error }; }
  console.log(JSON.stringify(result));
  await db.\$disconnect();
})();
")
echo "$CANCEL" | grep -q '"ok":true' && ok "cancel commits" || bad "cancel failed: $CANCEL"
echo "$CANCEL" | grep -q '"irn":null' && ok "live IRN cleared" || bad "irn not cleared: $CANCEL"
echo "$CANCEL" | grep -q '"cancelledIrn":"............' && ok "history slot preserved" || bad "history missing: $CANCEL"

page2=$(curl -s --max-time 30 -b "$JAR" "$BASE/accounts/invoice/$INV")
echo "$page2" | grep -q 'irn-cancelled-history' && ok "view shows the cancelled-IRN history line" || bad "history line missing"
echo "$page2" | grep -q 'Generate IRN again' && ok "regen button returned" || bad "regen button missing"
echo "$page2" | grep -q 'Previous IRN cancelled' && ok "history text present" || bad "history text missing"

echo "== M26: print carries NO IRN rows after cancel =="
PRINT=$(curl -s --max-time 30 -b "$JAR" "$BASE/print/invoice/$INV")
echo "$PRINT" | grep -q 'IRN Ack No' && bad "print still shows IRN rows" || ok "print clean of cancelled IRN"

echo "== M26: the agent tool =="
TOOL=$(npx tsx -e "
(async () => {
  const { allTools } = await import('./src/lib/agent/tools');
  console.log(allTools.length);
})();
")
[ "$TOOL" = "227" ] && ok "cancel_einvoice_irn registered (tools 227)" || bad "tool count: $TOOL"

echo "== M26: cleanup =="
CLEAN=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const inv = await db.salesInvoice.findFirst({ where: { invoiceNo: { startsWith: 'SM26-INV-' } } });
  if (inv) {
    await db.salesInvoice.delete({ where: { id: inv.id } });
    await db.party.delete({ where: { id: inv.partyId } });
  }
  console.log('cleaned');
  await db.\$disconnect();
})();
")
echo "$CLEAN" | grep -q "cleaned" && ok "fixtures cleaned" || bad "cleanup: $CLEAN"

echo
echo "== M26 RESULT: $pass pass / $fail fail =="
[ "$fail" = "0" ] || exit 1
