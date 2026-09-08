#!/bin/bash
# ============== ROUTE SMOKE — STATUTORY L-03 (SPEC-M47) ==============
# Live-server checks for the statutory-payroll batch:
#   1. /hr/statutory renders (register + challan note) + columns
#      (UAN/ESI No/PF EE/ESI EE/Deduction/Net) + the read-tool chip (ADR-001)
#   2. the csv twin: full register export + per-head CHALLAN shapes
#      (variant=pf → UAN + PF wages + ER EPS/EPF/EDLI/Admin; variant=esi →
#      IP No; variant=pt; variant=lwf)
#   3. /admin/statutory renders (the rates board: 4 head cards, toggles,
#      per-field notes) + arming a head via the stat: AppOption shows 'armed'
#   4. THE SEEDED WALKTHROUGH STATE (raw prisma seed — the service-level
#      plan/commit/ledger math is pinned by tests/pipeline/payroll-l03.test.ts
#      25/25 through the REAL services; the browser E2E drives the real
#      doors): E005 gains UAN+esiNo, a committed run PR-9471 with statutory
#      legs (earned 1600 → PF 192 / ESI 12 / PT 208 / LWF 20 → deduction 432
#      → net 1168) + the wage journal (partySide credit) + 4 deduction
#      journals (partySide debit) → register row (variant=pf + q) · run view
#      (statutory columns + deduction journals in the audit table) · payslip
#      PRINT route (deduction rows + NET PAYABLE 1,168 + employer note) —
#      then FULLY REVERTED
#   5. refusal doors: unknown payslip 404; future-window register filter
#      returns the empty honest state
#   6. menu + LIVE_ROUTES wiring (hr group carries Statutory; masters-admin
#      carries Statutory Rates)
# Auth: admin fixture (the batch-0..7 cookie-jar pattern). Zero residue by
# construction: the seeded run + journals + attendance + UAN/esiNo + stat
# rows are deleted/restored.
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

# ── 2. the statutory register screen ──
page=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/hr/statutory")
code=$(echo "$page" | tail -1)
if [ "$code" = "200" ]; then ok "/hr/statutory renders (200)"; else bad "/hr/statutory → $code"; fi
for col in "UAN" "ESI No" "PF EE" "ESI EE" "Deduction" "Net"; do
  if echo "$page" | grep -q "$col"; then ok "register carries the '$col' column (L-03)"; else bad "column '$col' missing"; fi
done
if echo "$page" | grep -q "get_statutory_register"; then ok "register cites the read tool (ADR-001 chip)"; else bad "read-tool chip missing"; fi
if echo "$page" | grep -q "Challan export"; then ok "the challan note renders (variant hint)"; else bad "challan note missing"; fi
if echo "$page" | grep -q "committed payroll line"; then ok "the description states committed-only honestly"; else bad "committed-only wording missing"; fi

csv=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/hr/statutory/csv")
csvcode=$(echo "$csv" | tail -1)
if [ "$csvcode" = "200" ]; then ok "csv twin exports (200)"; else bad "csv twin → $csvcode"; fi
echo "$csv" | grep -q "^Run," && ok "csv carries the register header" || bad "csv header missing"
# the per-head challan shapes
pfcsv=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/hr/statutory/csv?variant=pf")
echo "$pfcsv" | grep -q "UAN" && echo "$pfcsv" | grep -q "ER EPS" && ok "PF challan csv: UAN + ER EPS/EPF/EDLI/Admin columns" || bad "PF challan csv shape wrong"
esicsv=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/hr/statutory/csv?variant=esi")
echo "$esicsv" | grep -q "IP No" && ok "ESI challan csv: IP No column" || bad "ESI challan csv shape wrong"
for f in "variant=pf" "variant=esi" "variant=pt" "variant=lwf" "q=PR-9471"; do
  fc=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/hr/statutory?$f")
  if [ "$fc" = "200" ]; then ok "filter '$f' round-trips"; else bad "filter '$f' → $fc"; fi
done

# ── 3. the rates board /admin/statutory ──
admin=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/admin/statutory")
acode=$(echo "$admin" | tail -1)
if [ "$acode" = "200" ]; then ok "/admin/statutory renders (200)"; else bad "/admin/statutory → $acode"; fi
for head in "Provident Fund" "Employee State Insurance" "Professional Tax" "Labour Welfare Fund"; do
  if echo "$admin" | grep -q "$head"; then ok "rates card renders: $head"; else bad "rates card missing: $head"; fi
done
if echo "$admin" | grep -qi "time and freeze"; then ok "the freeze-at-plan note renders"; else bad "freeze note missing"; fi

# ── 4. the seeded walkthrough state (raw seed) ──
SEED=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const emp = await db.employee.findUniqueOrThrow({ where: { code: 'E005' } });
  // E005 gains UAN + esiNo for the register/challan columns (reverted below)
  await db.employee.update({ where: { id: emp.id }, data: { uan: '100999888777', esiNo: '7788990011' } });
  const today = new Date(); today.setUTCHours(0,0,0,0);
  const yest = new Date(today.getTime() - 86400000);
  await db.attendance.createMany({ data: [
    { employeeId: emp.id, attDate: today, status: 'present' },
    { employeeId: emp.id, attDate: yest, status: 'present' },
  ] });
  // a committed run with the statutory legs frozen (mimics planPayrollRun output)
  const run = await db.payrollRun.create({ data: {
    runNo: 'PR-9471', mode: 'daily', from: yest, to: today, status: 'committed',
    finYear: '26-27', committedAt: new Date(), notes: 'route_smoke_m47 walkthrough',
  } });
  const line = await db.payrollLine.create({ data: {
    runId: run.id, employeeId: emp.id, partyId: emp.partyId,
    days: 2, earned: 1600, advances: 0, net: 1168,
    pfWages: 1600, pfEe: 192, pfEr: 192, pfEps: 133, pfEpf: 59, pfEdli: 8, pfAdmin: 8,
    esiEe: 12, esiEr: 52, ptAmt: 208, lwfEe: 20, lwfEr: 20, statDeduction: 432,
  } });
  // the wage journal (credit side) + the four deduction journals (debit side)
  const period = yest.toISOString().slice(0,10) + ' → ' + today.toISOString().slice(0,10);
  const j = await db.journal.create({ data: {
    voucherNo: 'V-9471', voucherType: 'journal', date: new Date(), finYear: '26-27',
    partyId: emp.partyId, partySide: 'credit',
    debitAccount: 'Staff Salaries', creditAccount: 'Wage Payable',
    amount: 1600, narration: \`Payroll run PR-9471 · daily · E005 Mohammed Ali · \${period}\`,
  } });
  const heads = [
    ['V-9472', 'PF Payable', 192, 'PF'], ['V-9473', 'ESI Payable', 12, 'ESI'],
    ['V-9474', 'PT Payable', 208, 'PT'], ['V-9475', 'LWF Payable', 20, 'LWF'],
  ];
  for (const [v, acc, amt, label] of heads) {
    await db.journal.create({ data: {
      voucherNo: v, voucherType: 'journal', date: new Date(), finYear: '26-27',
      partyId: emp.partyId, partySide: 'debit',
      debitAccount: 'Wage Payable', creditAccount: acc, amount: amt,
      narration: \`Payroll run PR-9471 · statutory \${label} · E005 Mohammed Ali · \${period}\`,
    } });
  }
  console.log(JSON.stringify({ runId: run.id, lineId: line.id }));
  await db.\$disconnect();
})().catch(e => { console.error('SEED-FAIL ' + e.message); process.exit(1); })
")
if echo "$SEED" | grep -q '"runId"'; then
  RUN_ID=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).runId)})")
  LINE_ID=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).lineId)})")
  ok "seed: PR-9471 committed (E005, statutory legs 432 → net 1168) + 5 journals (1 credit + 4 debit)"
else
  RUN_ID=""; bad "seed failed: $SEED"
fi

if [ -n "$RUN_ID" ]; then
  # 4a. the register row (q + variant)
  rp=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/hr/statutory?q=PR-9471")
  echo "$rp" | grep -q "PR-9471" && ok "register lists the seeded run (q=PR-9471)" || bad "seeded run not listed"
  echo "$rp" | grep -q "100999888777" && ok "register renders the UAN (challan data)" || bad "UAN missing"
  echo "$rp" | grep -q "432" && ok "register renders the deduction 432" || bad "deduction missing"
  rpf=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/hr/statutory?variant=pf&q=PR-9471")
  echo "$rpf" | grep -q "PR-9471" && ok "variant=pf keeps the seeded PF line" || bad "variant=pf lost the line"

  # 4b. the PF challan csv carries the row + the full breakdown
  pfc2=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/hr/statutory/csv?variant=pf")
  echo "$pfc2" | grep -q "PR-9471" && echo "$pfc2" | grep -q "133" && ok "PF challan csv: the row + EPS 133" || bad "PF challan csv row missing"

  # 4c. the run view: statutory columns + deduction journals in the audit table
  view=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/hr/payroll/$RUN_ID")
  vcode=$(echo "$view" | tail -1)
  if [ "$vcode" = "200" ]; then ok "run view /hr/payroll/[id] renders (200)"; else bad "run view → $vcode"; fi
  echo "$view" | grep -q "statutory" && ok "run view names the statutory total" || bad "statutory total missing"
  echo "$view" | grep -q "Deduction" && ok "the lines table carries the Deduction column" || bad "Deduction column missing"
  echo "$view" | grep -q "statutory deduction" && ok "the journals audit table lists the deduction journals" || bad "deduction journals missing"
  echo "$view" | grep -q "PF Payable" && ok "the Cr PF Payable leg named in the audit table" || bad "PF Payable leg missing"

  # 4d. the payslip PRINT route: deduction rows + NET PAYABLE 1,168
  slip=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/print/payslip/$LINE_ID?copy=original")
  scode=$(echo "$slip" | tail -1)
  if [ "$scode" = "200" ]; then ok "payslip print renders (200, committed)"; else bad "payslip print → $scode"; fi
  echo "$slip" | grep -q "Less: PF (employee share)" && ok "payslip: the PF deduction row" || bad "PF deduction row missing"
  echo "$slip" | grep -q "Less: professional tax" && ok "payslip: the PT deduction row" || bad "PT deduction row missing"
  echo "$slip" | grep -q "1,168" && ok "payslip: NET PAYABLE ₹1,168 (net of statutory)" || bad "NET PAYABLE 1,168 missing"
  echo "$slip" | grep -q "Employer contributions" && ok "payslip: the employer-contributions note" || bad "employer note missing"

  # 4e. refusal doors
  u=$(curl -s --max-time 30 -o /dev/null -w '%{http_code}' "${AUTH[@]}" "$BASE/print/payslip/does-not-exist")
  if [ "$u" = "404" ]; then ok "unknown payslip → 404"; else bad "unknown payslip → $u"; fi
  fut=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/hr/statutory?from=2099-01-01")
  echo "$fut" | grep -q "No committed statutory lines" && ok "future window: the honest empty state" || bad "future window empty state missing"
fi

# ── 5. menu + LIVE_ROUTES wiring (source contracts) ──
if grep -q "id: 'statutory'," src/lib/erp/menu-registry.ts; then ok "menu-registry: the statutory item (hr group)"; else bad "statutory menu item missing"; fi
if grep -q "id: 'statutory-rates'," src/lib/erp/menu-registry.ts; then ok "menu-registry: the statutory-rates item (masters-admin)"; else bad "statutory-rates menu item missing"; fi
if grep -q "'/hr/statutory'," src/lib/erp/menu-registry.ts; then ok "LIVE_ROUTES carries /hr/statutory"; else bad "/hr/statutory not live"; fi
if grep -q "'/admin/statutory'," src/lib/erp/menu-registry.ts; then ok "LIVE_ROUTES carries /admin/statutory"; else bad "/admin/statutory not live"; fi

# ── 6. FULL REVERT (zero residue) ──
node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  await db.journal.deleteMany({ where: { voucherNo: { in: ['V-9471','V-9472','V-9473','V-9474','V-9475'] } } });
  await db.payrollRun.deleteMany({ where: { runNo: 'PR-9471' } });
  const emp = await db.employee.findUniqueOrThrow({ where: { code: 'E005' } });
  await db.attendance.deleteMany({ where: { employeeId: emp.id, attDate: { gte: new Date(Date.now() - 2*86400000) } } });
  await db.employee.update({ where: { id: emp.id }, data: { uan: null, esiNo: null } });
  await db.\$disconnect();
  console.log('reverted');
})().catch(e => { console.error('REVERT-FAIL ' + e.message); process.exit(1); })
" | grep -q reverted && ok "revert: run + journals + attendance + UAN/esiNo restored" || bad "revert failed"

echo
echo "RESULT: $PASS passed, $FAIL failed (route_smoke_m47)"
[ "$FAIL" = "0" ]