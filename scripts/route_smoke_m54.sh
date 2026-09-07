#!/bin/bash
# ============== ROUTE SMOKE — EXPENSE HEADS M-05 (SPEC-M54) ==============
# Live-server checks for the Module M Batch 5 (the LAST Module M item):
#   1. /masters/expense-head — the ExpenseHead master page (the M2 engine
#      ride, legacy FrmMasExpenses port): the form labels + the EXH-####
#      auto-code hint + the GL Account preference hint (a stale value falls
#      back, never blocks)
#   2. /costing/expenses — the expense book: the HEAD picker on the form +
#      the category not-required hint + the Head column on the recent rows
#   3. /costing/expenses/[id] — the view's Head field
#   4. /costing/budget-vs-actual — the EXPENSES column (the EH-03 addend)
#   5. THE WALKTHROUGH STATE (raw prisma — THE HEAD REFINES NEVER BLOCKS +
#      the leg precedence + the refusal doors are pinned 16/16 by
#      tests/pipeline/accounts-m05.test.ts through the REAL services; the
#      browser E2E drives the real masters + expense forms): a crafted head
#      (transport + glAccount 5020) + a crafted stylewise expense (750,
#      headId linked, category from the head) + the order → the master page
#      shows the head row · the expense book shows the Head name · the view
#      shows the Head field · the budget screen shows Expenses 750 in the
#      row + the totals → FULLY REVERTED
#   6. honesty doors: unknown expense view id → 404 · the masters page
#      unknown-q stays 200
# Auth: admin fixture (the batch-0..9 cookie-jar pattern). Zero residue by
# construction: every crafted row is deleted (head/expense/journal/order by prefix).
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

# ── 2. the ExpenseHead master page (empty of crafted rows yet — the form is the check) ──
eh=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/masters/expense-head")
eco=$(echo "$eh" | tail -1)
if [ "$eco" = "200" ]; then ok "/masters/expense-head renders (200 — the M2 engine ride, FrmMasExpenses port)"; else bad "/masters/expense-head → $eco"; fi
for needle in "Expense Head" "EXH-" "GL Account" "never blocks"; do
  echo "$eh" | grep -q "$needle" && ok "masters page carries '$needle'" || bad "masters page missing '$needle'"
done

# ── 3. the expense book: the head picker + the Head column ──
book=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/costing/expenses")
bco=$(echo "$book" | tail -1)
if [ "$bco" = "200" ]; then ok "/costing/expenses renders (200)"; else bad "/costing/expenses → $bco"; fi
echo "$book" | grep -q "Head" && ok "the expense form carries the Head picker" || bad "Head picker missing"
echo "$book" | grep -q "the head overrides it" && ok "the category hint names the head override" || bad "category hint missing"
echo "$book" | grep -q "Required when no head is picked" && ok "the category not-required hint renders" || bad "category-required hint missing"

# ── 4. the budget-vs-actual screen: the Expenses column ──
bva=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/costing/budget-vs-actual")
vco=$(echo "$bva" | tail -1)
if [ "$vco" = "200" ]; then ok "/costing/budget-vs-actual renders (200)"; else bad "budget-vs-actual → $vco"; fi
echo "$bva" | grep -q "Expenses" && ok "the budget screen carries the Expenses column" || bad "Expenses column missing"

# ── 5. THE WALKTHROUGH STATE (raw prisma: head + order + stylewise expense) ──
TS=$(date +%s)
SEED=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const ts = '$TS';
  // residue hygiene
  await db.expense.deleteMany({ where: { expNo: { startsWith: 'M54SMK' } } });
  await db.journal.deleteMany({ where: { voucherNo: { startsWith: 'JV-M54SMK' } } });
  await db.expenseHead.deleteMany({ where: { name: { startsWith: 'M54 Smoke Head' } } });
  await db.order.deleteMany({ where: { orderNo: 'M54SMK-O' + ts } });
  await db.style.deleteMany({ where: { styleNo: 'M54SMK-S' + ts } });

  // the head (transport + 5020 — the Freight preference)
  const head = await db.expenseHead.create({ data: {
    code: 'M54SMK' + ts.slice(-4), name: 'M54 Smoke Head ' + ts, category: 'transport', glAccount: '5020', active: true,
  } });
  // the order (no PO/prod/costsheet — the ONLY-expense door)
  const buyer = await db.buyer.findUnique({ where: { code: 'B001' } });
  const style = await db.style.create({ data: { styleNo: 'M54SMK-S' + ts, description: 'm54 smoke ' + ts } });
  const order = await db.order.create({ data: {
    orderNo: 'M54SMK-O' + ts, buyerId: buyer.id, styleId: style.id,
    orderDate: new Date(), deliveryDate: new Date('2027-03-31'), finYear: '26-27', status: 'open', totalPcs: 10, totalValue: 1000,
  } });
  // the stylewise expense booked under the head (category FROM the head)
  const exp = await db.expense.create({ data: {
    expNo: 'M54SMK-E1', expDate: new Date(), finYear: '26-27', category: 'stylewise',
    orderId: order.id, headId: head.id, amount: 750, narration: 'm54 smoke walkthrough', status: 'recorded',
  } });
  // the companion the real door would write (Dr Freight — the head's 5020 / Cr Cash/Bank)
  const freight = await db.account.findUnique({ where: { code: '5020' } });
  const cash = await db.account.findUnique({ where: { code: '1010' } });
  const jv = await db.journal.create({ data: {
    voucherNo: 'JV-M54SMK-E1', voucherType: 'journal', partyId: null, date: new Date(), finYear: '26-27',
    debitAccount: 'Freight', creditAccount: 'Cash/Bank',
    debitAccountId: freight.id, creditAccountId: cash.id, amount: 750,
    narration: 'Expense M54SMK-E1 (stylewise · M54 Smoke Head ' + ts + ')',
  } });
  console.log(JSON.stringify({ headName: head.name, orderNo: order.orderNo, expId: exp.id, expNo: exp.expNo, jv: jv.voucherNo }));
})().catch((e) => { console.error(e.message); process.exit(1); });
")
if [ -n "$SEED" ] && echo "$SEED" | grep -q "headName"; then ok "walkthrough state crafted (head + order + stylewise expense 750 + companion)"; else bad "walkthrough seed failed: $SEED"; fi
HEAD_NAME=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).headName))")
ORD=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).orderNo))")
EXP_ID=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).expId))")

# 5a. the master page shows the crafted head row
eh2=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/masters/expense-head?M54=1")
echo "$eh2" | grep -q "$HEAD_NAME" && ok "the crafted head renders on the master page ($HEAD_NAME)" || bad "crafted head not listed"
echo "$eh2" | grep -q "M54SMK" && ok "the crafted head code (M54SMK####) renders" || bad "crafted head code missing"

# 5b. the expense book shows the Head column with the head name (recent rows)
book2=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/costing/expenses")
echo "$book2" | grep -q "$HEAD_NAME" && ok "the expense book resolves the Head name (headName via id-map)" || bad "expense book Head name missing"
echo "$book2" | grep -q "M54SMK-E1" && ok "the crafted expense renders in the book" || bad "crafted expense not in the book"

# 5c. the expense view shows the Head field
view=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/costing/expenses/$EXP_ID")
wco=$(echo "$view" | tail -1)
if [ "$wco" = "200" ]; then ok "the expense view renders (200)"; else bad "expense view → $wco"; fi
echo "$view" | grep -q "$HEAD_NAME" && ok "the view shows the Head field ($HEAD_NAME)" || bad "view Head field missing"

# 5d. the budget screen shows the expense addend for the only-expense order
bva2=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/costing/budget-vs-actual?order=$ORD")
echo "$bva2" | grep -q "750" && ok "the budget row carries the expense addend (750) for $ORD" || bad "budget row expense addend missing"
echo "$bva2" | grep -q "Expenses" && ok "the single-order budget view shows the Expenses total" || bad "Expenses total missing"

# ── 6. honesty doors ──
nf=$(curl -s -o /dev/null --max-time 30 "${AUTH[@]}" -w '%{http_code}' "$BASE/costing/expenses/m54-nonexistent-id")
if [ "$nf" = "404" ]; then ok "unknown expense view id → 404"; else bad "unknown expense id → $nf"; fi
uk=$(curl -s -o /dev/null --max-time 30 "${AUTH[@]}" -w '%{http_code}' "$BASE/masters/expense-head?M54=unknown")
if [ "$uk" = "200" ]; then ok "the masters page unknown-q stays 200"; else bad "masters unknown-q → $uk"; fi

# ── 7. FULL REVERT ──
node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  await db.expense.deleteMany({ where: { expNo: { startsWith: 'M54SMK' } } });
  await db.journal.deleteMany({ where: { voucherNo: { startsWith: 'JV-M54SMK' } } });
  await db.expenseHead.deleteMany({ where: { name: { startsWith: 'M54 Smoke Head' } } });
  await db.order.deleteMany({ where: { orderNo: { startsWith: 'M54SMK-O' } } });
  await db.style.deleteMany({ where: { styleNo: { startsWith: 'M54SMK-S' } } });
  const left = await db.expenseHead.count({ where: { name: { startsWith: 'M54 Smoke Head' } } });
  console.log(left === 0 ? 'reverted' : 'residue ' + left);
})().catch((e) => { console.error(e.message); process.exit(1); });
" | grep -q "reverted" && ok "FULLY REVERTED (zero residue)" || bad "revert left residue"

echo "════ RESULT: $PASS ok · $FAIL fail"
[ "$FAIL" = "0" ] || exit 1
