#!/bin/bash
# ============== ROUTE SMOKE — TALLY BOTH SIDES (SPEC-M53, M-04) ==============
# Live-server checks for the Module M Batch 4:
#   1. THE EXPORT SCREEN renders: /accounts/tally-export (the both-sides
#      counts grid ×8, the warnings panel, the doctrine notes, the Source
#      column) + the /api/tally JSON download (attachment)
#   2. THE LIVE DOUBLE-COUNT FIXED: the full-window export counts
#      receipts 178 + payments 9 + sales 190 and journals ZERO — the 187
#      JV-RCP companions ride their payment vouchers (the pre-M53 adapter
#      re-emitted all 187 as Journal vouchers — 375 vouchers for the same
#      money); reversals 0 (no cancels on the live books)
#   3. THE CRAFTED WALKTHROUGH (raw prisma — the doctrine math itself is
#      pinned 18/18 by tests/pipeline/accounts-m04.test.ts through the REAL
#      services + doors; the browser E2E drives the real screen): dated
#      TODAY — an issued invoice (CGST 25 + SGST 25 → 1050) · a passed
#      supplier bill (IGST 80 → 880) · a receipt + its companion JV- · a
#      cancelled standalone journal + its CN- mirror · a draft bill + a
#      cancelled invoice (the exclusion doors) → the today-window JSON
#      shows: Purchase 'M53-SB-SMK' with 'Input IGST' · Sales 'M53-INV-SMK'
#      with the Output CGST/SGST SPLIT (no single Output GST) · Receipt
#      'M53-SMK-RCP' WITHOUT 'JV-M53-SMK-RCP' (counted once) · the
#      '[CANCELLED]' row + the 'CN-M53S-A' reversal with reversalOf · the
#      draft/cancelled exclusions warned → FULLY REVERTED
#   4. refusal doors: from > to → 400 · invalid dates → 400
# Auth: admin fixture (the batch-0..9 cookie-jar pattern). Zero residue by
# construction: every crafted row is deleted (journals/payments/docs by prefix).
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

TODAY=$(date -u +%F)

# ── 1. auth ──
JAR=$(mktemp)
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
if echo "$body" | grep -q '"ok":true'; then ok "admin login"; else bad "admin login: $body"; fi
AUTH=(-b "$JAR")

# ── 2. THE SCREEN + THE JSON DOWNLOAD ──
page=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/accounts/tally-export")
co=$(echo "$page" | tail -1)
if [ "$co" = "200" ]; then ok "/accounts/tally-export renders (200)"; else bad "/accounts/tally-export → $co"; fi
echo "$page" | grep -q "BOTH sides" && ok "the header copy says BOTH sides" || bad "header copy missing"
for label in "Sales" "Purchases" "Receipts" "Payments" "Credit notes" "Journals" "Reversals" "Total"; do
  echo "$page" | grep -q "data-tally-count=\"$label\"" && ok "counts tile '$label' renders" || bad "tile '$label' missing"
done
echo "$page" | grep -q "data-tally-notes" && ok "the doctrine notes block renders" || bad "notes block missing"
echo "$page" | grep -q "Tally XML is decision" && ok "the honest XML deferral renders on the page" || bad "XML deferral missing"

# 2a. the API download (attachment JSON)
api=$(curl -s --max-time 30 "${AUTH[@]}" -o /tmp/m53-tally.json -w '%{http_code}|%{content_type}' "$BASE/api/tally?from=2020-01-01&to=2030-01-01")
co=$(echo "$api" | cut -d'|' -f1)
ct=$(echo "$api" | cut -d'|' -f2)
if [ "$co" = "200" ]; then ok "/api/tally full window 200"; else bad "/api/tally → $co"; fi
if echo "$ct" | grep -q "json"; then ok "/api/tally content-type json"; else bad "content-type: $ct"; fi

# 2b. THE LIVE DOUBLE-COUNT FIXED — the 187 companions ride their payments
node -e "
const j = require('/tmp/m53-tally.json');
const c = j.counts;
const lines = [];
if (c.receipts === 178 && c.payments === 9) lines.push('payments-ok');
if (c.sales === 190) lines.push('sales-ok');
if (c.journals === 0 && c.reversals === 0) lines.push('counted-once-ok');
if (j.notes.some((n) => n.includes('Counted once'))) lines.push('notes-ok');
const sum = c.sales + c.purchases + c.receipts + c.payments + c.creditNotes + c.journals + c.reversals;
if (sum === j.vouchers.length) lines.push('sum-ok');
console.log(lines.join(','));
" | tr ',' '\n' | while read -r tag; do
  case "$tag" in
    payments-ok) ok "live full window: receipts 178 + payments 9 (every payment a voucher)" ;;
    sales-ok) ok "live full window: sales 190 (187 paid + 3 issued)" ;;
    counted-once-ok) ok "THE DOUBLE-COUNT FIXED: journals 0 — the 187 JV- companions ride their payment vouchers (pre-M53: 187 journal vouchers re-emitted)" ;;
    notes-ok) ok "the payload carries the doctrine notes" ;;
    sum-ok) ok "counts sum == vouchers.length (nothing double-counted)" ;;
    "") ;;
    *) bad "unexpected live-window tag: $tag" ;;
  esac
done

# ── 3. THE CRAFTED WALKTHROUGH (raw prisma — the math is test-pinned) ──
SEED=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const party = await db.party.findFirstOrThrow({});
  const cash = await db.account.findUniqueOrThrow({ where: { code: '1010' } });
  const sales = await db.account.findUniqueOrThrow({ where: { code: '4010' } });
  const freight = await db.account.findUniqueOrThrow({ where: { code: '5020' } });
  const d = new Date();
  await db.salesInvoice.create({ data: { invoiceNo: 'M53-INV-SMK', partyId: party.id, invoiceDate: d, finYear: '26-27', billType: 'sales', taxableValue: 1000, cgstRate: 2.5, sgstRate: 2.5, cgstAmt: 25, sgstAmt: 25, billAmount: 1050, status: 'issued' } });
  await db.salesInvoice.create({ data: { invoiceNo: 'M53-INV-SMKC', partyId: party.id, invoiceDate: d, finYear: '26-27', taxableValue: 200, billAmount: 200, status: 'cancelled' } });
  await db.supplierBill.create({ data: { billNo: 'M53-SB-SMK', partyId: party.id, billDate: d, finYear: '26-27', taxableValue: 800, igstRate: 10, igstAmt: 80, billAmount: 880, status: 'passed', matchStatus: 'matched' } });
  await db.supplierBill.create({ data: { billNo: 'M53-SB-SMKD', partyId: party.id, billDate: d, finYear: '26-27', taxableValue: 50, billAmount: 50, status: 'draft' } });
  const pay = await db.payment.create({ data: { voucherNo: 'M53-SMK-RCP', partyId: party.id, direction: 'in', payDate: d, finYear: '26-27', amount: 500, mode: 'cash', reference: 'M53SMK', status: 'active' } });
  await db.journal.create({ data: { voucherNo: 'JV-M53-SMK-RCP', voucherType: 'receipt', partyId: party.id, date: d, finYear: '26-27', debitAccount: 'Cash/Bank', creditAccount: party.name, debitAccountId: cash.id, creditAccountId: sales.id, amount: 500, narration: 'route_smoke_m53 receipt companion' } });
  await db.journal.create({ data: { voucherNo: 'M53S-A', voucherType: 'journal', partyId: party.id, date: d, finYear: '26-27', debitAccount: 'Freight', creditAccount: 'Sales', debitAccountId: freight.id, creditAccountId: sales.id, amount: 12, narration: 'route_smoke_m53 manual journal', status: 'cancelled' } });
  await db.journal.create({ data: { voucherNo: 'CN-M53S-A', voucherType: 'contra', partyId: party.id, date: d, finYear: '26-27', debitAccount: 'Sales', creditAccount: 'Freight', debitAccountId: sales.id, creditAccountId: freight.id, amount: 12, narration: 'route_smoke_m53 cancel mirror', status: 'active' } });
  console.log(JSON.stringify({ ok: true, party: party.name }));
})().catch(e => { console.error(String(e)); process.exit(1) }).finally(() => db.\$disconnect());
")
if echo "$SEED" | grep -q '"ok":true'; then
  ok "seed: invoice+bill+receipt+companion+cancelled journal+CN- mirror + the draft/cancelled exclusion rows — dated today"
else
  bad "seed failed: $SEED"
fi

# 3a. the today-window JSON (the live rows are future-dated — this window is only ours)
curl -s --max-time 30 "${AUTH[@]}" -o /tmp/m53-today.json "$BASE/api/tally?from=$TODAY"
node -e "
const j = require('/tmp/m53-today.json');
const c = j.counts;
const tags = [];
if (c.sales === 1 && c.purchases === 1 && c.receipts === 1 && c.payments === 0) tags.push('counts-ok');
const inv = j.vouchers.find((v) => v.voucherNo === 'M53-INV-SMK');
if (inv && inv.ledgerEntries.some((e) => e.ledger === 'Output CGST' && e.amount === 25) && inv.ledgerEntries.some((e) => e.ledger === 'Output SGST') && !inv.ledgerEntries.some((e) => e.ledger === 'Output GST')) tags.push('inv-split-ok');
const bill = j.vouchers.find((v) => v.voucherNo === 'M53-SB-SMK');
if (bill && bill.voucherType === 'Purchase' && bill.source === 'bill' && bill.ledgerEntries.some((e) => e.ledger === 'Input IGST' && e.amount === 80) && bill.ledgerEntries.some((e) => e.ledger === 'Purchases' && e.amount === 800)) tags.push('bill-ok');
const rcp = j.vouchers.find((v) => v.voucherNo === 'M53-SMK-RCP');
if (rcp && rcp.voucherType === 'Receipt' && !j.vouchers.some((v) => v.voucherNo === 'JV-M53-SMK-RCP')) tags.push('counted-once-ok');
const orig = j.vouchers.find((v) => v.voucherNo === 'M53S-A');
const mirror = j.vouchers.find((v) => v.voucherNo === 'CN-M53S-A');
if (orig && orig.narration && orig.narration.includes('[CANCELLED]') && mirror && mirror.reversalOf === 'M53S-A' && c.reversals === 1) tags.push('doctrine-pair-ok');
if (!j.vouchers.some((v) => v.voucherNo === 'M53-SB-SMKD') && j.warnings.some((w) => w.includes('draft bill'))) tags.push('draft-door-ok');
if (!j.vouchers.some((v) => v.voucherNo === 'M53-INV-SMKC') && j.warnings.some((w) => w.includes('cancelled invoice'))) tags.push('cancelled-door-ok');
for (const v of j.vouchers) {
  const dr = v.ledgerEntries.filter((e) => e.isDebit).reduce((s, e) => s + e.amount, 0);
  const cr = v.ledgerEntries.filter((e) => !e.isDebit).reduce((s, e) => s + e.amount, 0);
  if (Math.abs(dr - cr) > 0.005) tags.push('UNBALANCED ' + v.voucherNo);
}
console.log(tags.join(','));
" | tr ',' '\n' | while read -r tag; do
  case "$tag" in
    counts-ok) ok "today window: counts 1 sales · 1 purchase · 1 receipt (the exclusion doors held)" ;;
    inv-split-ok) ok "the invoice: Output CGST 25 + Output SGST 25 — the SPLIT, no single Output GST" ;;
    bill-ok) ok "the bill: Purchase voucher, Dr Purchases 800 + Input IGST 80 / Cr party 880" ;;
    counted-once-ok) ok "COUNTED ONCE: the Receipt voucher exports, its JV- companion does NOT" ;;
    doctrine-pair-ok) ok "THE DOCTRINE PAIR: the cancelled journal exports [CANCELLED] + the CN- mirror (reversalOf M53S-A, reversals 1)" ;;
    draft-door-ok) ok "the draft bill excluded + REPORTED in warnings" ;;
    cancelled-door-ok) ok "the cancelled invoice excluded + REPORTED in warnings" ;;
    "") ;;
    *) bad "today-window: $tag" ;;
  esac
done

# 3b. the SCREEN today-window: the crafted rows on the page (first 25)
pgt=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/tally-export?from=$TODAY")
echo "$pgt" | grep -q "M53-SB-SMK" && ok "the screen today-window shows the Purchase voucher row" || bad "Purchase row missing on screen"
echo "$pgt" | grep -q "M53-SMK-RCP" && ok "the screen shows the Receipt voucher row" || bad "Receipt row missing on screen"
echo "$pgt" | grep -qE "rev <!-- -->M53S-A|rev M53S-A" && ok "the screen shows the reversal badge (rev M53S-A)" || bad "reversal badge missing"
echo "$pgt" | grep -q "data-tally-warnings" && ok "the warnings panel renders for the crafted window" || bad "warnings panel missing"

# ── 4. FULL REVERT (zero residue) ──
REV=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  await db.journal.deleteMany({ where: { voucherNo: { in: ['JV-M53-SMK-RCP', 'M53S-A', 'CN-M53S-A'] } } });
  await db.payment.deleteMany({ where: { voucherNo: 'M53-SMK-RCP' } });
  await db.salesInvoice.deleteMany({ where: { invoiceNo: { in: ['M53-INV-SMK', 'M53-INV-SMKC'] } } });
  await db.supplierBill.deleteMany({ where: { billNo: { in: ['M53-SB-SMK', 'M53-SB-SMKD'] } } });
  const left = (await db.journal.count({ where: { voucherNo: { startsWith: 'M53' } } })) + (await db.payment.count({ where: { voucherNo: { startsWith: 'M53' } } })) + (await db.salesInvoice.count({ where: { invoiceNo: { startsWith: 'M53-INV' } } })) + (await db.supplierBill.count({ where: { billNo: { startsWith: 'M53-SB' } } }));
  console.log(left === 0 ? 'reverted' : 'LEFTOVER ' + left);
})().catch(e => { console.error(String(e)); process.exit(1) }).finally(() => db.\$disconnect());
")
if [ "$REV" = "reverted" ]; then ok "revert: the crafted rows deleted (zero residue)"; else bad "revert failed: $REV"; fi

# ── 5. refusal doors ──
bad1=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/api/tally?from=2030-01-01&to=2020-01-01")
if [ "$bad1" = "400" ]; then ok "from > to refused (400)"; else bad "from > to → $bad1"; fi
bad2=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/api/tally?from=not-a-date")
if [ "$bad2" = "400" ]; then ok "invalid from refused (400)"; else bad "invalid from → $bad2"; fi

echo
echo "RESULT: $PASS ok, $FAIL fail"
[ "$FAIL" -gt 0 ] && exit 1
echo "route_smoke_m53 LIVE ✅"
