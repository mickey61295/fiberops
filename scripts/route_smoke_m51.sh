#!/bin/bash
# ============== ROUTE SMOKE — TRUE DOUBLE-ENTRY POSTS (SPEC-M51, M-02) ==============
# Live-server checks for the Module M Batch 2:
#   1. /masters/account — the 20th seeded row (5120 Other Expenses) renders
#   2. /accounts/payments — the form carries the bankAccountNo picker (label
#      'Bank Account (GL leg)') + the DE-06 field hint (the mode→leg rule)
#   3. /accounts/debit-note + /costing/expenses — the GL-leg form fields
#      (debitAccount / glAccount) render with their hints
#   4. /masters/bank-account — the GL Acct column + the glAccountCode field
#   5. THE CRAFTED WALKTHROUGH (raw prisma — the posting doors themselves are
#      pinned 32/32 by tests/pipeline/accounts-m02.test.ts through the REAL
#      services; the browser E2E drives the real payment form): a bank-linked
#      receipt (Payment.bankAccountId + the companion journal Dr 1012 / Cr
#      Sundry Debtors) + a debit note with its JV-DN companion (Dr Sales ·
#      4010 chip on the journal register) → FULLY REVERTED
#   6. THE BILLS-REGISTER HONESTY DOOR (DE-04): a CANCELLED receipt leaves
#      the day-book (the active RCP-9501 stays, RCP-9502 cancelled goes)
#   7. refusal doors: unknown payment view 404 · unknown q stays 200-empty
# Auth: admin fixture (the batch-0..9 cookie-jar pattern). Zero residue by
# construction: every crafted row is deleted (parties last — FK order).
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

# ── 2. the 20th CoA row renders on the master page ──
coa=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/masters/account")
cco=$(echo "$coa" | tail -1)
if [ "$cco" = "200" ]; then ok "/masters/account renders (200)"; else bad "/masters/account → $cco"; fi
echo "$coa" | grep -q "Other Expenses" && ok "the 20th row (5120 Other Expenses) renders" || bad "5120 row missing on the CoA master"

# ── 3. the payment form: the bankAccountNo picker + the hint ──
pay=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/accounts/payments")
pco=$(echo "$pay" | tail -1)
if [ "$pco" = "200" ]; then ok "/accounts/payments (form + register) 200"; else bad "payments page → $pco"; fi
echo "$pay" | grep -q "Bank Account (GL leg)" && ok "the bankAccountNo picker field renders" || bad "bankAccountNo field missing"
echo "$pay" | grep -q "with a bank mode the journal posts to this bank" && ok "the DE-06 field hint renders (the mode→leg rule)" || bad "field hint missing"

# ── 4. the DN + expense forms: the GL-leg fields ──
dn=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/accounts/debit-note")
dnco=$(echo "$dn" | tail -1)
if [ "$dnco" = "200" ]; then ok "/accounts/debit-note (form) 200"; else bad "debit-note form → $dnco"; fi
echo "$dn" | grep -q "GL Debit Account" && ok "the debitAccount field renders (default Sales [4010] hint)" || bad "debitAccount field missing"
exp=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/costing/expenses")
eco=$(echo "$exp" | tail -1)
if [ "$eco" = "200" ]; then ok "/costing/expenses (form) 200"; else bad "expense form → $eco"; fi
echo "$exp" | grep -q "GL Expense Account" && ok "the glAccount field renders (Freight/Other Expenses hint)" || bad "glAccount field missing"

# ── 5. the bank master: the GL Acct column ──
bam=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/masters/bank-account")
bco=$(echo "$bam" | tail -1)
if [ "$bco" = "200" ]; then ok "/masters/bank-account 200"; else bad "bank-account master → $bco"; fi
echo "$bam" | grep -q "GL Acct" && ok "the GL Acct column renders" || bad "GL Acct column missing"

# ── 6. THE CRAFTED WALKTHROUGH (raw prisma — services pinned by the tests) ──
SMK="M51-SMK"
SEED=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  // the smoke party (customer) + its invoice
  const party = await db.party.create({ data: { code: '${SMK}', name: 'Route Smoke M51 Party', partyType: 'customer', openingBalance: 0 } });
  const inv = await db.salesInvoice.create({ data: { invoiceNo: 'M51-SINV-9501', partyId: party.id, finYear: '26-27', billAmount: 500, status: 'issued', invoiceDate: new Date() } });
  // the per-bank GL account + the linked BankAccount
  const cash = await db.account.findUniqueOrThrow({ where: { code: '1010' } });
  const bankAcc = await db.account.create({ data: { code: '1012', name: 'Route Smoke Bank GL', type: 'asset', parentId: cash.id, active: true } });
  const bank = await db.bank.create({ data: { code: 'M51-SMOKE-BK', name: 'Route Smoke Bank' } });
  const ba = await db.bankAccount.create({ data: { accountNo: '9999111122', bankId: bank.id, glAccountCode: '1012' } });
  const debtors = await db.account.findUniqueOrThrow({ where: { code: '1110' } });
  const sales = await db.account.findUniqueOrThrow({ where: { code: '4010' } });
  // the bank-linked receipt + its companion journal (Dr the bank's OWN 1012 / Cr Sundry Debtors)
  const pay = await db.payment.create({ data: { voucherNo: 'RCP-9501', partyId: party.id, invoiceId: inv.id, payDate: new Date(), finYear: '26-27', direction: 'in', amount: 500, mode: 'neft', bankAccountId: ba.id, status: 'active' } });
  const jv = await db.journal.create({ data: { voucherNo: 'JV-RCP-9501', voucherType: 'receipt', partyId: party.id, date: new Date(), finYear: '26-27', debitAccount: 'Route Smoke Bank GL', creditAccount: 'Route Smoke M51 Party', debitAccountId: bankAcc.id, creditAccountId: debtors.id, amount: 500, narration: 'route_smoke_m51 bank-linked receipt' } });
  // the debit note + its JV-DN companion (Dr Sales / Cr Sundry Debtors — the deduction)
  const note = await db.debitNote.create({ data: { noteNo: 'DN-9501', noteType: 'fabric', partyId: party.id, date: new Date(), finYear: '26-27', amount: 100, reason: 'route smoke', status: 'raised' } });
  const jvdn = await db.journal.create({ data: { voucherNo: 'JV-DN-9501', voucherType: 'debit-note', partyId: party.id, date: new Date(), finYear: '26-27', debitAccount: 'Sales', creditAccount: 'Route Smoke M51 Party', debitAccountId: sales.id, creditAccountId: debtors.id, amount: 100, narration: 'route_smoke_m51 DN companion' } });
  // the CANCELLED receipt — the bills-register honesty probe (must NOT render)
  const pay2 = await db.payment.create({ data: { voucherNo: 'RCP-9502', partyId: party.id, payDate: new Date(), finYear: '26-27', direction: 'in', amount: 999, mode: 'cash', status: 'cancelled', cancelledAt: new Date() } });
  console.log(JSON.stringify({ ok: true, partyId: party.id, invId: inv.id, bankAccId: bankAcc.id, bankId: bank.id, baId: ba.id, payId: pay.id, jvId: jv.id, noteId: note.id, jvdnId: jvdn.id, pay2Id: pay2.id }));
})().catch(e => { console.error(String(e)); process.exit(1) }).finally(() => db.\$disconnect());
")
if echo "$SEED" | grep -q '"ok":true'; then
  ok "seed: smoke party + 1012/1010 + bank-linked RCP-9501 + JV-DN-9501 + cancelled RCP-9502"
else
  bad "seed failed: $SEED"
fi

# 6a. the payment register lists the bank-linked receipt
preg=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/payments?q=RCP-9501")
echo "$preg" | grep -q "RCP-9501" && ok "the payment register lists RCP-9501" || bad "RCP-9501 missing on the register"

# 6b. the payment [id] view resolves by voucherNo
pview=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/accounts/payments/RCP-9501")
pvco=$(echo "$pview" | tail -1)
if [ "$pvco" = "200" ]; then ok "the payment view by voucherNo 200"; else bad "payment view → $pvco"; fi

# 6c. the journal register: the DN companion + its code chips
jreg=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/journal?q=JV-DN-9501")
echo "$jreg" | grep -q "JV-DN-9501" && ok "the DN companion renders on the journal register" || bad "JV-DN-9501 missing"
echo "$jreg" | grep -q "Sales · 4010" && ok "the companion's debit leg chips as 'Sales · 4010'" || bad "Sales · 4010 chip missing"

# 6d. the journal [id] view's GL-legs line
jview=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/accounts/journal/JV-DN-9501")
jvco=$(echo "$jview" | tail -1)
if [ "$jvco" = "200" ]; then ok "the JV-DN view 200"; else bad "JV-DN view → $jvco"; fi
echo "$jview" | grep -q "GL legs" && ok "the GL-legs line renders on the companion view" || bad "GL-legs line missing"

# ── 7. THE BILLS-REGISTER HONESTY DOOR (DE-04) ──
bills=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/bills-register?party=${SMK}")
echo "$bills" | grep -q "RCP-9501" && ok "the ACTIVE receipt stays in the day-book (collected column)" || bad "active receipt missing on bills register"
if echo "$bills" | grep -q "RCP-9502"; then bad "the CANCELLED receipt RCP-9502 still rides the day-book (DE-04 broken)"; else ok "the CANCELLED receipt leaves the day-book (DE-04)"; fi
echo "$bills" | grep -q "DN-9501" && ok "the raised debit note rides the deductions column" || bad "DN-9501 missing on bills register"

# ── 8. FULL REVERT (zero residue — FK order: journals → payments → note → invoice → bankAccount/bank → account → party) ──
REV=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  await db.journal.deleteMany({ where: { voucherNo: { in: ['JV-RCP-9501', 'JV-DN-9501', 'CN-JV-DN-9501'] } } });
  await db.payment.deleteMany({ where: { voucherNo: { in: ['RCP-9501', 'RCP-9502'] } } });
  await db.debitNote.deleteMany({ where: { noteNo: 'DN-9501' } });
  await db.salesInvoice.deleteMany({ where: { invoiceNo: 'M51-SINV-9501' } });
  await db.bankAccount.deleteMany({ where: { accountNo: '9999111122' } });
  await db.bank.deleteMany({ where: { code: 'M51-SMOKE-BK' } });
  await db.account.deleteMany({ where: { code: '1012' } });
  await db.party.deleteMany({ where: { code: '${SMK}' } });
  const left = await db.party.count({ where: { code: '${SMK}' } });
  console.log(left === 0 ? 'reverted' : 'LEFTOVER ' + left);
})().catch(e => { console.error(String(e)); process.exit(1) }).finally(() => db.\$disconnect());
")
if [ "$REV" = "reverted" ]; then ok "revert: all crafted rows deleted (zero residue)"; else bad "revert failed: $REV"; fi

# ── 9. refusal/honesty doors ──
gone=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/accounts/payments/RCP-9501")
if [ "$gone" = "404" ]; then ok "the reverted payment view 404s"; else bad "reverted payment view → $gone"; fi
unk=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/accounts/payments/RCP-999999")
if [ "$unk" = "404" ]; then ok "unknown payment voucherNo 404s"; else bad "unknown payment → $unk"; fi
jrq=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/accounts/journal?q=nothing-m51")
if [ "$jrq" = "200" ]; then ok "journal register unknown q still 200-empty (honest)"; else bad "journal q → $jrq"; fi

echo
echo "RESULT: $PASS ok, $FAIL fail"
[ "$FAIL" -gt 0 ] && exit 1
echo "route_smoke_m51 LIVE ✅"
