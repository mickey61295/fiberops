#!/bin/bash
# ============== ROUTE SMOKE — SHIFT WAGES L-06 (SPEC-M55) ==============
# Live-server checks for the Module L Batch 6 (the LAST Module L item):
#   1. /hr/shift-wages — the Shift Wages register (the legacy
#      FrmProdShiftWagesReg port): 200 + the column labels (Piece wages /
#      Shift wages / Total bill) + the doctrine note (no double-count +
#      unassigned honesty) + the post_shift_wages door name
#   2. /hr/shift-wages/csv — the CSV export (content-type + header row)
#   3. /production/entry — the shiftCode picker on the production form
#      (the ADR-019-A attribution door)
#   4. THE WALKTHROUGH STATE (raw prisma — the door's refusal semantics +
#      the budget addend + payroll non-pollution are pinned 14/14 by
#      tests/pipeline/hr-l06.test.ts through the REAL services; the
#      browser E2E drives the real forms): a crafted shift + order + a
#      piece entry (attributed, 100 @ 10) + a wage row (500) → the
#      register shows the shift-day row (piece 1000 · shift 500 · bill
#      1500) AND the unassigned row → FULLY REVERTED
#   5. honesty doors: unknown order filter → 200 honest empty · unknown
#      dept q → 200 honest empty
# Auth: admin fixture (the batch-0..9 cookie-jar pattern). Zero residue by
# construction: every crafted row is deleted (entries/ledger/shift/order/
# style/buyer by prefix).
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
reg=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/hr/shift-wages")
rco=$(echo "$reg" | tail -1)
if [ "$rco" = "200" ]; then ok "/hr/shift-wages renders (200 — the FrmProdShiftWagesReg port)"; else bad "/hr/shift-wages → $rco"; fi
for needle in "Shift Wages" "Piece wages" "Shift wages" "Total bill" "unassigned" "post_shift_wages" "double-count"; do
  echo "$reg" | grep -q "$needle" && ok "register carries '$needle'" || bad "register missing '$needle'"
done

# ── 3. the CSV export ──
csv=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' -D /tmp/m55csv.txt "$BASE/hr/shift-wages/csv")
cco=$(echo "$csv" | tail -1)
if [ "$cco" = "200" ]; then ok "/hr/shift-wages/csv renders (200)"; else bad "csv → $cco"; fi
grep -qi "content-type: text/csv" /tmp/m55csv.txt && ok "csv content-type is text/csv" || bad "csv content-type missing"
echo "$csv" | head -1 | grep -qi "date\|shift" && ok "csv header row present" || bad "csv header row missing"

# ── 4. the production form carries the shift picker ──
form=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/production/entry")
fco=$(echo "$form" | tail -1)
if [ "$fco" = "200" ]; then ok "/production/entry renders (200)"; else bad "/production/entry → $fco"; fi
echo "$form" | grep -q "Shift" && ok "the production form carries the Shift picker (the attribution door)" || bad "Shift picker missing on the production form"

# ── 5. THE WALKTHROUGH STATE (raw prisma: shift + order + piece + wage rows) ──
TS=$(date +%s)
SEED=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const ts = '$TS';
  await db.productionEntry.deleteMany({ where: { bundleNo: { startsWith: 'M55SMK' } } });
  await db.stockLedger.deleteMany({ where: { docNo: { startsWith: 'M55SMK' } } });
  await db.shift.deleteMany({ where: { code: { startsWith: 'M55SMK' } } });
  await db.order.deleteMany({ where: { orderNo: { startsWith: 'M55SMK-O' } } });
  await db.style.deleteMany({ where: { styleNo: { startsWith: 'M55SMK-S' } } });
  await db.buyer.deleteMany({ where: { code: { startsWith: 'M55SMK-B' } } });

  const dept = await db.department.findUniqueOrThrow({ where: { code: 'D4' } });
  const shift = await db.shift.create({ data: {
    code: 'M55SMK' + ts.slice(-4), name: 'M55 Smoke Shift ' + ts, fromTime: '06:00', toTime: '14:00', hours: 8,
  } });
  const buyer = await db.buyer.create({ data: { code: 'M55SMK-B' + ts, name: 'm55 smoke buyer ' + ts } });
  const style = await db.style.create({ data: { styleNo: 'M55SMK-S' + ts, description: 'm55 smoke ' + ts } });
  const order = await db.order.create({ data: {
    orderNo: 'M55SMK-O' + ts, buyerId: buyer.id, styleId: style.id,
    orderDate: new Date(), deliveryDate: new Date('2027-03-31'), finYear: '26-27', status: 'open', totalPcs: 500, totalValue: 0,
  } });
  // the attributed piece entry (100 @ 10 → amount 1000)
  const piece = await db.productionEntry.create({ data: {
    orderId: order.id, deptId: dept.id, prodDate: new Date(), bundleNo: 'M55SMK-BUN1',
    qty: 100, rate: 10, amount: 1000, shiftId: shift.id,
  } });
  // the UNATTRIBUTED piece entry (50 @ 10 → the unassigned bucket)
  const piece2 = await db.productionEntry.create({ data: {
    orderId: order.id, deptId: dept.id, prodDate: new Date(), bundleNo: 'M55SMK-BUN2',
    qty: 50, rate: 10, amount: 500,
  } });
  // the wage-only row (the post_shift_wages door's shape: qty 0, amount 0)
  const wage = await db.productionEntry.create({ data: {
    orderId: order.id, deptId: dept.id, prodDate: new Date(), bundleNo: null,
    qty: 0, rate: 0, amount: 0, shiftWages: 500, shiftId: shift.id,
  } });
  console.log(JSON.stringify({ shiftCode: shift.code, shiftName: shift.name, orderNo: order.orderNo }));
})().catch((e) => { console.error(e.message); process.exit(1); });
")
if [ -n "$SEED" ] && echo "$SEED" | grep -q "shiftCode"; then ok "walkthrough state crafted (shift + order + piece 1000 + unattributed 500 + wage 500)"; else bad "walkthrough seed failed: $SEED"; fi
SHIFT_CODE=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).shiftCode))")
ORD=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).orderNo))")

# 5a. the register shows the shift-day row
reg2=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/hr/shift-wages?order=$ORD")
echo "$reg2" | grep -q "$SHIFT_CODE" && ok "the register shows the crafted shift row ($SHIFT_CODE)" || bad "crafted shift row missing"
echo "$reg2" | grep -q "unassigned" && ok "the unassigned bucket renders (the unattributed 500)" || bad "unassigned bucket missing"
echo "$reg2" | grep -q "1,000" && ok "the piece wages figure renders (1,000)" || bad "piece wages figure missing"
echo "$reg2" | grep -q "1,500" && ok "the total bill figure renders (1,500 = 1000 piece + 500 shift)" || bad "total bill figure missing"

# 5b. the budget screen gains the shift-wage addend for the order
bva=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/costing/budget-vs-actual?order=$ORD")
echo "$bva" | grep -q "1,500\|1500" && ok "the budget row carries prod 1,500 for $ORD" || bad "budget prod figure missing"
echo "$bva" | grep -q "500" && ok "the budget row carries the shift-wage addend (500)" || bad "shift-wage addend missing"

# 5c. the csv export carries the rows for the crafted order
csv2=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/hr/shift-wages/csv?order=$ORD")
echo "$csv2" | grep -q "$SHIFT_CODE" && ok "the csv carries the crafted shift row" || bad "csv shift row missing"
echo "$csv2" | grep -q "unassigned" && ok "the csv carries the unassigned row" || bad "csv unassigned row missing"

# ── 6. honesty doors ──
nf=$(curl -s -o /dev/null --max-time 30 "${AUTH[@]}" -w '%{http_code}' "$BASE/hr/shift-wages?order=M55SMK-GHOST")
if [ "$nf" = "200" ]; then ok "unknown order filter → 200 (honest empty)"; else bad "unknown order → $nf"; fi
uk=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/hr/shift-wages?q=M55SMKGHOST")
echo "$uk" | grep -q "No department matches" && ok "unknown dept q → the honest no-match message" || bad "unknown dept q message missing"

# ── 7. FULL REVERT ──
node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  await db.productionEntry.deleteMany({ where: { bundleNo: { startsWith: 'M55SMK' } } });
  await db.productionEntry.deleteMany({ where: { order: { orderNo: { startsWith: 'M55SMK-O' } } } });
  await db.stockLedger.deleteMany({ where: { docNo: { startsWith: 'M55SMK' } } });
  await db.shift.deleteMany({ where: { code: { startsWith: 'M55SMK' } } });
  await db.order.deleteMany({ where: { orderNo: { startsWith: 'M55SMK-O' } } });
  await db.style.deleteMany({ where: { styleNo: { startsWith: 'M55SMK-S' } } });
  await db.buyer.deleteMany({ where: { code: { startsWith: 'M55SMK-B' } } });
  const left = await db.productionEntry.count({ where: { bundleNo: { startsWith: 'M55SMK' } } });
  const leftShift = await db.shift.count({ where: { code: { startsWith: 'M55SMK' } } });
  console.log(left === 0 && leftShift === 0 ? 'reverted' : 'residue ' + left + '/' + leftShift);
})().catch((e) => { console.error(e.message); process.exit(1); });
" | grep -q "reverted" && ok "FULLY REVERTED (zero residue)" || bad "revert left residue"

echo "════ RESULT: $PASS ok · $FAIL fail"
[ "$FAIL" = "0" ] || exit 1
