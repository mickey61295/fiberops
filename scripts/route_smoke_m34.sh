#!/usr/bin/env bash
# M34 route smoke (SPEC-M34): the frmTerms master feeding invoice print —
# seed an invoice + the print.terms.invoice option → the print carries the
# owned terms lines (NOT the fallback); delete the option → the fallback
# returns; the /admin/options page mentions the key; no-residue cleanup.
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M34: start dev server =="
(npm run dev > /tmp/m34_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m34_dev.log; exit 1; }

echo "== M34: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M34: fixture — invoice + terms option =="
FIX=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const ts = Date.now();
  const party = await db.party.create({ data: { code: 'SM34-P-' + ts, name: 'Smoke34 ' + ts, partyType: 'customer', state: 'Tamil Nadu' } });
  const inv = await db.salesInvoice.create({ data: { invoiceNo: 'SM34-INV-' + ts, partyId: party.id, invoiceDate: new Date(), finYear: '26-27', billAmount: 100000, status: 'issued' } });
  await db.appOption.create({ data: { key: 'print.terms.invoice', value: 'SM34 terms line one.\nSM34 interest at 18% p.a.\nSM34 subject to Tirupur jurisdiction.', label: 'Invoice Terms & Conditions', group: 'print' } });
  console.log(JSON.stringify({ inv: inv.invoiceNo }));
  await db.\$disconnect();
})();
")
INV=$(echo "$FIX" | grep -oE 'SM34-INV-[0-9]+')
echo "$INV" | grep -q SM34 && ok "fixture invoice $INV" || bad "fixture missing"

echo "== M34: the invoice print carries the OWNED terms =="
page=$(curl -s --max-time 30 -b "$JAR" "$BASE/print/invoice/$INV")
echo "$page" | grep -q 'SM34 terms line one' && ok "terms line 1 renders" || bad "terms line 1 missing"
echo "$page" | grep -q 'SM34 interest at 18% p.a.' && ok "terms line 2 renders" || bad "terms line 2 missing"
echo "$page" | grep -q 'SM34 subject to Tirupur jurisdiction' && ok "terms line 3 renders" || bad "terms line 3 missing"
echo "$page" | grep -q 'Goods once sold will not be taken back' && bad "the FALLBACK should NOT print when owned terms exist" || ok "fallback correctly absent"

echo "== M34: delete the option → the fallback returns =="
npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  await db.appOption.deleteMany({ where: { key: 'print.terms.invoice' } });
  await db.\$disconnect();
})();
"
page2=$(curl -s --max-time 30 -b "$JAR" "$BASE/print/invoice/$INV")
echo "$page2" | grep -q 'Goods once sold will not be taken back. Subject to Tirupur jurisdiction.' && ok "fallback returns after option deleted" || bad "fallback missing after delete"
echo "$page2" | grep -q 'SM34 terms line one' && bad "owned terms should be gone" || ok "owned terms gone after delete"

echo "== M34: the /admin/options page mentions the key =="
opt=$(curl -s --max-time 30 -b "$JAR" "$BASE/admin/options")
echo "$opt" | grep -q 'print.terms.invoice' && ok "options page mentions print.terms.invoice" || bad "options page mention missing"
echo "$opt" | grep -q 'frmTerms' && ok "options page cites the frmTerms lineage" || bad "frmTerms mention missing"

echo "== M34: cleanup =="
CLEAN=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  await db.salesInvoice.deleteMany({ where: { invoiceNo: { startsWith: 'SM34-INV-' } } });
  await db.party.deleteMany({ where: { code: { startsWith: 'SM34-P-' } } });
  await db.appOption.deleteMany({ where: { key: 'print.terms.invoice' } });
  const residue = await db.salesInvoice.count({ where: { invoiceNo: { startsWith: 'SM34-INV-' } } });
  console.log(residue === 0 ? 'cleaned' : 'RESIDUE ' + residue);
  await db.\$disconnect();
})();
")
echo "$CLEAN" | grep -q cleaned && ok "fixtures cleaned" || bad "cleanup: $CLEAN"

echo
echo "== M34 RESULT: $pass pass / $fail fail =="
[ "$fail" = "0" ] || exit 1
