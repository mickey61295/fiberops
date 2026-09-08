#!/bin/bash
# ============== ROUTE SMOKE — CHEQUE/PDC LIFECYCLE (SPEC-M56, PAY-08 §17-3) ==============
# Live-server checks for the Money Batch 7 (the §17-3 ADR-020 resolution):
#   1. /accounts/pdc — the PDC / cheques-in-hand register: 200 + the column
#      labels (Cheque No / Cheque Date / Type / Due) + the doctrine card
#      (post_cheque_clear + post_cheque_bounce + OVERDUE + the M51 GL note)
#   2. /accounts/pdc/csv — the CSV export (content-type + header row)
#   3. /accounts/payments — the Cheque Date field on the payment form
#   4. THE WALKTHROUGH STATE (raw prisma): a party + invoice + an ISSUED
#      post-dated cheque receipt (+7d) → the register shows the row (PDC
#      badge + 'due in N d' aging + the drill-down) → the CLEAR transition
#      (chequeStatus cleared) removes it → THE BOUNCE shape pinned by
#      tests/pipeline/pay-pdc.test.ts through the REAL services (contra +
#      allocation reversal + statuses); the browser E2E drives the real
#      doors
#   5. honesty doors: unknown party filter → 200 honest empty · direction
#      filter → 200 · cleared rows never render
# Auth: admin fixture (the batch-0..9 cookie-jar pattern). Zero residue by
# construction: every crafted row is deleted (payments/journals/
# allocations/invoice/party by prefix).
set -e
cd "$(dirname "$0")/.."
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  OK    $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  FAIL  $1"; }

BASE="http://localhost:3000"
if ! curl -s -o /dev/null --max-time 5 "$BASE/"; then
  echo "dev server not running on :3000 — start it first (npm run dev)"
  exit 1
fi

# ── 1. auth ──
JAR=$(mktemp)
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
if echo "$body" | grep -q '"ok":true'; then ok "admin login"; else bad "admin login: $body"; fi
AUTH=(-b "$JAR")

# ── 2. the register page ──
reg=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/accounts/pdc")
rco=$(echo "$reg" | tail -1)
if [ "$rco" = "200" ]; then ok "/accounts/pdc renders (200 — the PDC register)"; else bad "/accounts/pdc → $rco"; fi
for needle in "PDC / Cheques in Hand" "Cheque No" "Cheque Date" "Type" "Due" "post_cheque_clear" "post_cheque_bounce" "OVERDUE" "How to read this register"; do
  echo "$reg" | grep -q "$needle" && ok "register carries '$needle'" || bad "register missing '$needle'"
done

# ── 3. the CSV export ──
csv=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' -D /tmp/m56csv.txt "$BASE/accounts/pdc/csv")
cco=$(echo "$csv" | tail -1)
if [ "$cco" = "200" ]; then ok "/accounts/pdc/csv renders (200)"; else bad "csv → $cco"; fi
grep -qi "content-type: text/csv" /tmp/m56csv.txt && ok "csv content-type is text/csv" || bad "csv content-type missing"
echo "$csv" | head -1 | grep -qi "voucher\|cheque" && ok "csv header row present" || bad "csv header row missing"

# ── 4. the payment form carries the Cheque Date field ──
form=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/accounts/payments")
fco=$(echo "$form" | tail -1)
if [ "$fco" = "200" ]; then ok "/accounts/payments renders (200)"; else bad "/accounts/payments → $fco"; fi
echo "$form" | grep -q "Cheque Date (mode=cheque)" && ok "the payment form carries the Cheque Date field (the PDC-02 door)" || bad "Cheque Date field missing on the payment form"

# ── 5. THE WALKTHROUGH STATE (raw prisma: party + invoice + an issued PDC receipt) ──
TS=$(date +%s)
SEED=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const ts = '$TS';
  const stale = await db.payment.findMany({ where: { voucherNo: { startsWith: 'M56SMK' } }, select: { id: true } });
  if (stale.length) await db.paymentAllocation.deleteMany({ where: { paymentId: { in: stale.map((p: any) => p.id) } } });
  await db.payment.deleteMany({ where: { voucherNo: { startsWith: 'M56SMK' } } });
  await db.journal.deleteMany({ where: { voucherNo: { startsWith: 'M56SMK' } } });
  await db.salesInvoice.deleteMany({ where: { invoiceNo: { startsWith: 'M56SMK' } } });
  await db.party.deleteMany({ where: { code: { startsWith: 'M56SMK' } } });

  const party = await db.party.create({ data: { code: 'M56SMK' + ts.slice(-5), name: 'm56 smoke party ' + ts, partyType: 'customer' } });
  const inv = await db.salesInvoice.create({ data: {
    invoiceNo: 'M56SMK-INV' + ts, partyId: party.id, invoiceDate: new Date(), finYear: '26-27', billAmount: 2500, status: 'issued',
  } });
  const pay = await db.payment.create({ data: {
    voucherNo: 'M56SMK-RCP' + ts, partyId: party.id, direction: 'in', invoiceId: inv.id,
    payDate: new Date(), finYear: '26-27', amount: 2500, mode: 'cheque', reference: 'CHQ-M56SMK',
    chequeDate: new Date(Date.now() + 7 * 86400000), chequeStatus: 'issued', status: 'active',
  } });
  await db.paymentAllocation.create({ data: { paymentId: pay.id, invoiceId: inv.id, amount: 2500 } });
  await db.salesInvoice.update({ where: { id: inv.id }, data: { status: 'paid' } });
  console.log(JSON.stringify({ voucherNo: pay.voucherNo, partyCode: party.code }));
})().catch((e) => { console.error(e.message); process.exit(1); });
")
if [ -n "$SEED" ] && echo "$SEED" | grep -q "voucherNo"; then ok "walkthrough state crafted (party + invoice + an ISSUED post-dated cheque receipt ₹2,500)"; else bad "walkthrough seed failed: $SEED"; fi
VCH=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).voucherNo))")
PCODE=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).partyCode))")

# 5a. the register shows the PDC row with the badge + aging
reg2=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/pdc?q=$PCODE")
echo "$reg2" | grep -q "$VCH" && ok "the register shows the cheque row ($VCH)" || bad "register missing the row $VCH"
echo "$reg2" | grep -q ">PDC<" && ok "the row carries the PDC badge (post-dated at issue)" || bad "PDC badge missing"
echo "$reg2" | grep -q "due in" && ok "the aging renders ('due in N d' off the cheque date)" || bad "aging missing"
echo "$reg2" | grep -q "CHQ-M56SMK" && ok "the Cheque No column carries the reference" || bad "cheque no missing"
echo "$reg2" | grep -q "2,500\|2500" && ok "the amount column renders (₹2,500)" || bad "amount missing"

# 5b. the direction filter (out — the receipt is 'in', so it must vanish)
regOut=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/pdc?direction=out")
echo "$regOut" | grep -q "$VCH" && bad "direction=out still shows the receipt" || ok "the direction filter scopes (out hides the receipt)"

# 5c. THE CLEAR TRANSITION — the row leaves (the clear door's read effect; the
# write door is the agent's post_cheque_clear, pinned 13/13 in pay-pdc.test.ts)
node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  await db.payment.update({ where: { voucherNo: '$VCH' }, data: { chequeStatus: 'cleared', clearedAt: new Date() } });
  await db.\$disconnect();
})();
"
reg3=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/pdc?q=$PCODE")
echo "$reg3" | grep -q "$VCH" && bad "a CLEARED cheque still renders (must leave)" || ok "the cleared cheque leaves the register (the journey is over)"

# 5d. honesty door — unknown party filter → 200 honest empty
reg4=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/accounts/pdc?q=NO-SUCH-PARTY-M56")
r4=$(echo "$reg4" | tail -1)
if [ "$r4" = "200" ]; then ok "unknown party filter → 200 honest empty"; else bad "unknown party filter → $r4"; fi

# ── 6. revert: zero residue ──
node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const stale = await db.payment.findMany({ where: { voucherNo: { startsWith: 'M56SMK' } }, select: { id: true } });
  if (stale.length) await db.paymentAllocation.deleteMany({ where: { paymentId: { in: stale.map((p: any) => p.id) } } });
  await db.payment.deleteMany({ where: { voucherNo: { startsWith: 'M56SMK' } } });
  await db.salesInvoice.deleteMany({ where: { invoiceNo: { startsWith: 'M56SMK' } } });
  await db.party.deleteMany({ where: { code: { startsWith: 'M56SMK' } } });
  await db.\$disconnect();
})();
"
LEFT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const p = await db.payment.count({ where: { voucherNo: { startsWith: 'M56SMK' } } });
  const i = await db.salesInvoice.count({ where: { invoiceNo: { startsWith: 'M56SMK' } } });
  const y = await db.party.count({ where: { code: { startsWith: 'M56SMK' } } });
  console.log(p + i + y);
  await db.\$disconnect();
})();
")
if [ "$LEFT" = "0" ]; then ok "walkthrough fully reverted (payments/invoices/parties residue 0)"; else bad "residue remains: $LEFT rows"; fi

echo
echo "===== RESULT: $PASS OK · $FAIL FAIL ====="
[ "$FAIL" = "0" ] || exit 1
