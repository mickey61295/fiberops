#!/bin/bash
# ============== ROUTE SMOKE — ATTENDANCE DEPTH L-04 (SPEC-M49) ==============
# Live-server checks for the attendance-depth batch:
#   1. /hr/attendance — the day-book gains the OT Hrs column + the OT summary
#      total; a CROSS-MIDNIGHT row (22:00→06:00) renders with honest hours
#   2. /hr/payroll — the runs register gains the OT ₹ column; the create form
#      carries the Overtime checkbox (the form door)
#   3. THE WALKTHROUGH STATE (raw prisma seed — the service-level math +
#      ledger closures are pinned by tests/pipeline/payroll-l04.test.ts 19/19
#      through the REAL services; the browser E2E drives the real form door):
#      E005 (₹800/day) — yesterday 22:00→06:00 cross-midnight (8h, OT 0) +
#      today 06:00→17:00 (11h vs the 8h standard → OT 3h) → the committed OT
#      run PR-9491 (days 2, base 1,600 + OT 3×₹100×2 = 600 → earned 2,200) +
#      its J1 journal (V-9491, 2,200, partyId) — run view OT card + OT column
#      + payslip OT row — then FULLY REVERTED
#   4. refusal/honesty doors: unknown register q still 200-empty · the
#      /admin/options payroll group carries attendance:ot (the config door)
#   5. menu + LIVE_ROUTES wiring unchanged (depth, not width — pinned by
#      context_check 606)
# Auth: admin fixture (the batch-0..7 cookie-jar pattern). Zero residue by
# construction: the seeded run + journal + attendance rows are deleted.
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

# ── 2. the attendance day-book: OT Hrs column + summary; /hr/payroll: OT column + form checkbox ──
YEST=$(node -e "const d=new Date(Date.now()-86400000);d.setUTCHours(0,0,0,0);console.log(d.toISOString().slice(0,10))")
TODAY=$(node -e "const d=new Date();d.setUTCHours(0,0,0,0);console.log(d.toISOString().slice(0,10))")
page=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/hr/attendance?from=$YEST&to=$TODAY")
code=$(echo "$page" | tail -1)
if [ "$code" = "200" ]; then ok "/hr/attendance renders (200)"; else bad "/hr/attendance → $code"; fi
echo "$page" | grep -q "OT Hrs" && ok "the day-book carries the 'OT Hrs' column (L-04)" || bad "OT Hrs column missing"
echo "$page" | grep -q "22:00" && ok "the cross-midnight in-time renders (posted below if fresh db)" || true

pay=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/hr/payroll")
pcode=$(echo "$pay" | tail -1)
if [ "$pcode" = "200" ]; then ok "/hr/payroll renders (200)"; else bad "/hr/payroll → $pcode"; fi
echo "$pay" | grep -q "OT ₹" && ok "the payroll register carries the 'OT ₹' column (L-04)" || bad "OT ₹ column missing"
echo "$pay" | grep -q 'name="ot"' && ok "the create form carries the Overtime checkbox (the form door)" || bad "OT checkbox missing"
for f in "variant=daily" "q=nothing-m49" "status=draft"; do
  fc=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/hr/payroll?$f")
  if [ "$fc" = "200" ]; then ok "payroll filter '$f' round-trips"; else bad "filter '$f' → $fc"; fi
done

# ── 3. the walkthrough state (raw seed) ──
SEED=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const emp = await db.employee.findUniqueOrThrow({ where: { code: 'E005' } });
  const today = new Date(); today.setUTCHours(0,0,0,0);
  const yest = new Date(today.getTime() - 86400000);
  // the attendance: cross-midnight 8h + a long 11h day (both PRESENT)
  await db.attendance.createMany({ data: [
    { employeeId: emp.id, attDate: yest, status: 'present', inTime: '22:00', outTime: '06:00', hours: 8 },
    { employeeId: emp.id, attDate: today, status: 'present', inTime: '06:00', outTime: '17:00', hours: 11 },
  ] });
  // the committed OT run (mimics planPayrollRun ot:true + commit):
  // base 2 days x 800 = 1,600 + OT 3h x (800/8) x 2 = 600 → earned 2,200
  const run = await db.payrollRun.create({ data: {
    runNo: 'PR-9491', mode: 'daily', from: yest, to: today, status: 'committed',
    finYear: '26-27', committedAt: new Date(), notes: 'route_smoke_m49 walkthrough',
    ot: { otMultiplier: 2, standardHours: 8 },
  } });
  const line = await db.payrollLine.create({ data: {
    runId: run.id, employeeId: emp.id, partyId: emp.partyId,
    days: 2, earned: 2200, advances: 0, otHours: 3, otPay: 600, net: 2200,
  } });
  const period = yest.toISOString().slice(0,10) + ' → ' + today.toISOString().slice(0,10);
  // J1 = FULL earned (no statutory on this run) with partyId
  await db.journal.create({ data: {
    voucherNo: 'V-9491', voucherType: 'journal', date: new Date(), finYear: '26-27',
    partyId: emp.partyId, debitAccount: 'Staff Salaries', creditAccount: 'Wage Payable',
    amount: 2200, narration: \`Payroll run PR-9491 · daily · E005 Mohammed Ali · \${period}\`,
  } });
  console.log(JSON.stringify({ runId: run.id, lineId: line.id }));
  await db.\$disconnect();
})().catch(e => { console.error('SEED-FAIL ' + e.message); process.exit(1); })
")
if echo "$SEED" | grep -q '"runId"'; then
  RUN_ID=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).runId)})")
  LINE_ID=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).lineId)})")
  ok "seed: PR-9491 committed OT run (E005: cross-midnight 8h + 11h day → OT 3h = ₹600, earned ₹2,200) + V-9491"
else
  RUN_ID=""; bad "seed failed: $SEED"
fi

if [ -n "$RUN_ID" ]; then
  # 3a. the day-book shows the OT column values + the summary total
  att=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/hr/attendance?from=$YEST&to=$TODAY")
  echo "$att" | grep -q "22:00" && ok "the cross-midnight row's in-time renders" || bad "cross-midnight row missing"
  echo "$att" | grep -q "OT 3 h beyond standard" && ok "the summary carries 'OT 3 h beyond standard'" || bad "OT summary total missing"

  # 3b. the payroll register lists the run with the OT ₹ figure
  preg=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/hr/payroll?q=PR-9491")
  echo "$preg" | grep -q "PR-9491" && ok "the payroll register lists PR-9491" || bad "PR-9491 not listed"
  echo "$preg" | grep -q "600" && ok "the OT ₹ 600 renders on the register row" || bad "OT figure missing"

  # 3c. the run view: the OT card + OT column + freeze note
  view=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/hr/payroll/$RUN_ID")
  vcode=$(echo "$view" | tail -1)
  if [ "$vcode" = "200" ]; then ok "run view /hr/payroll/[id] renders (200)"; else bad "run view → $vcode"; fi
  echo "$view" | grep -q "Overtime (SPEC-M49 L-04)" && ok "the OT frozen-config card renders" || bad "OT card missing"
  echo "$view" | grep -q "× the hourly rate" && ok "the frozen multiplier (2×) renders" || bad "multiplier missing"
  echo "$view" | grep -q "OT ₹" && ok "the lines table gains the OT ₹ column" || bad "OT column missing on run view"
  echo "$view" | grep -q "OT multiplier + standard hours" && ok "the freeze note lists OT" || bad "OT freeze note missing"
  echo "$view" | grep -q "incl. OT" && ok "the header summary carries 'incl. OT'" || bad "incl-OT header missing"

  # 3d. the payslip PRINT route: the OT EARNINGS row + base + net
  slip=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/print/payslip/$LINE_ID?copy=original")
  scode=$(echo "$slip" | tail -1)
  if [ "$scode" = "200" ]; then ok "payslip print route 200 (committed OT run)"; else bad "payslip print → $scode"; fi
  echo "$slip" | grep -q "PAYSLIP" && ok "PAYSLIP sheet title" || bad "payslip title missing"
  echo "$slip" | grep -q "Overtime" && ok "the Overtime EARNINGS row renders" || bad "OT row missing"
  echo "$slip" | grep -q "3 h beyond the 8h standard" && ok "the OT basis line (3 h beyond the 8h standard × 2×)" || bad "OT basis missing"
  echo "$slip" | grep -q "1,600" && ok "the base earnings ₹1,600 (earned − otPay)" || bad "base figure missing"
  echo "$slip" | grep -q "2,200" && ok "NET PAYABLE ₹2,200" || bad "net 2,200 missing"
  echo "$slip" | grep -q "Overtime is paid on PRESENT days" && ok "the OT note renders" || bad "OT note missing"

  # 3e. FULL REVERT (zero residue — attendance + journal + run)
  REV=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const emp = await db.employee.findUniqueOrThrow({ where: { code: 'E005' } });
  const att = await db.attendance.deleteMany({ where: { employeeId: emp.id, attDate: { gte: new Date('$YEST') } } });
  const j = await db.journal.deleteMany({ where: { voucherNo: 'V-9491' } });
  const r = await db.payrollRun.deleteMany({ where: { runNo: 'PR-9491' } });
  console.log('REVERTED att=' + att.count + ' journals=' + j.count + ' runs=' + r.count);
  await db.\$disconnect();
})().catch(e => { console.error('REVERT-FAIL ' + e.message); process.exit(1); })
")
  if echo "$REV" | grep -q "REVERTED"; then
    ok "seed fully reverted ($REV)"
  else
    bad "revert failed: $REV"
  fi

  # 3f. the reverted views go honest
  gone=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/hr/payroll/$RUN_ID")
  if [ "$gone" = "404" ]; then ok "reverted run view 404s"; else bad "reverted run view → $gone"; fi
  prq=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/hr/payroll?q=PR-9491")
  echo "$prq" | grep -q "No payroll runs" && ok "reverted run gone from the payroll register" || bad "reverted run still listed"
fi

# ── 4. the config door + refusal honesty ──
opts=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/admin/options")
if echo "$opts" | grep -q "attendance:ot"; then ok "the /admin/options payroll group carries attendance:ot (editable door)"; else bad "attendance:ot config row missing from options"; fi
attq=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/hr/attendance?q=nothing-m49")
if [ "$attq" = "200" ]; then ok "day-book unknown q still 200-empty (honest)"; else bad "day-book q → $attq"; fi

echo
echo "RESULT: $PASS ok, $FAIL fail"
[ "$FAIL" -gt 0 ] && exit 1
echo "route_smoke_m49 LIVE ✅"
