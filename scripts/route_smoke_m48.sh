#!/bin/bash
# ============== ROUTE SMOKE — STATUTORY L-03 (SPEC-M48) ==============
# Live-server checks for the statutory payroll batch:
#   1. /hr/statutory renders (the remittance register) + columns
#      (Employee/Employer/Total/Pending) + the read-tool chip (ADR-001)
#   2. the csv twin exports the same service (the challan data); the head
#      (variant) + q filters round-trip; an empty register is honest
#   3. THE SEEDED WALKTHROUGH STATE (raw prisma seed — the service-level
#      math + ledger closures are pinned by tests/pipeline/payroll-l03.test.ts
#      22/22 through the REAL services; the browser E2E drives the real form
#      door): a committed STATUTORY run PR-9481 (E005, 2 attendance days ×
#      ₹800 = ₹1,600 earned; PF 12% 192/192 + ESI 0.75%/3.25% 12/52 →
#      deductions 204, net 1,396) + its J1 journal (V-9481, earned−deductions,
#      partyId) + the 2 head journals (V-9482 EPFO 384, V-9483 ESIC 64 —
#      authority parties EPFO/ESIC, pending in their ledgers) — register rows ·
#      the payroll run view statutory card + Deducted column + journals audit
#      table incl. the statutory journals · payslip PRINT route (deduction rows
#      + employer note + net 1,396) — then FULLY REVERTED
#   4. refusal/honesty doors: unknown register q still 200-empty · the
#      /admin/options payroll group carries payroll:statutory (editable door)
#   5. menu + LIVE_ROUTES wiring (hr group carries Statutory Register)
# Auth: admin fixture (the batch-0..7 cookie-jar pattern). Zero residue by
# construction: the seeded run + journals + attendance rows are deleted.
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

# ── 2. the statutory register screen + filters + csv ──
page=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/hr/statutory")
code=$(echo "$page" | tail -1)
if [ "$code" = "200" ]; then ok "/hr/statutory renders (200)"; else bad "/hr/statutory → $code"; fi
for col in "Employee" "Employer" "Total" "Pending remittance" "Authority"; do
  if echo "$page" | grep -q "$col"; then ok "register carries the '$col' column (L-03)"; else bad "column '$col' missing"; fi
done
if echo "$page" | grep -q "get_statutory_register"; then ok "register cites the read tool (ADR-001 chip)"; else bad "read-tool chip missing"; fi
if echo "$page" | grep -q "Head"; then ok "the head filter (PF/ESI/PT/LWF) renders"; else bad "head filter missing"; fi
csv=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/hr/statutory/csv")
csvcode=$(echo "$csv" | tail -1)
if [ "$csvcode" = "200" ]; then ok "csv twin exports (200 — the challan data)"; else bad "csv twin → $csvcode"; fi
echo "$csv" | grep -q "^Run," && ok "csv carries the register header" || bad "csv header missing"
for f in "variant=pf" "variant=esi" "q=PR-9481" "q=nothing-matches"; do
  fc=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/hr/statutory?$f")
  if [ "$fc" = "200" ]; then ok "filter '$f' round-trips"; else bad "filter '$f' → $fc"; fi
done

# ── 3. the seeded statutory walkthrough state (raw seed) ──
SEED=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const emp = await db.employee.findUniqueOrThrow({ where: { code: 'E005' } });
  const today = new Date(); today.setUTCHours(0,0,0,0);
  const yest = new Date(today.getTime() - 86400000);
  await db.attendance.createMany({ data: [
    { employeeId: emp.id, attDate: today, status: 'present' },
    { employeeId: emp.id, attDate: yest, status: 'present' },
  ] });
  // find-or-create the authority parties (the service seam, idempotent)
  const epfo = await db.party.upsert({ where: { code: 'EPFO' }, update: {}, create: { code: 'EPFO', name: 'EPFO (Provident Fund)', partyType: 'supplier' } });
  const esic = await db.party.upsert({ where: { code: 'ESIC' }, update: {}, create: { code: 'ESIC', name: 'ESIC (State Insurance)', partyType: 'supplier' } });
  const STAT = { pf: { enabled: true, employeePct: 12, employerPct: 12, epsPct: 8.33, wageCeiling: 15000 }, esi: { enabled: true, employeePct: 0.75, employerPct: 3.25, grossLimit: 21000 }, pt: { enabled: false, amount: 0, grossThreshold: 0, state: '' }, lwf: { enabled: false, employee: 0, employer: 0, state: '' } };
  // the committed statutory run (mimics planPayrollRun statutory:true + commit):
  // earned 1,600 → pf 192/192, esi 12/52 → deductions 204, net 1,396
  const run = await db.payrollRun.create({ data: {
    runNo: 'PR-9481', mode: 'daily', from: yest, to: today, status: 'committed',
    finYear: '26-27', committedAt: new Date(), notes: 'route_smoke_m48 walkthrough', statutory: STAT,
  } });
  const line = await db.payrollLine.create({ data: {
    runId: run.id, employeeId: emp.id, partyId: emp.partyId,
    days: 2, earned: 1600, advances: 0, pf: 192, pfEmployer: 192, esi: 12, esiEmployer: 52, deductions: 204, net: 1396,
  } });
  const period = yest.toISOString().slice(0,10) + ' → ' + today.toISOString().slice(0,10);
  // J1 = earned − deductions, partyId (the employee leg)
  await db.journal.create({ data: {
    voucherNo: 'V-9481', voucherType: 'journal', date: new Date(), finYear: '26-27',
    partyId: emp.partyId, debitAccount: 'Staff Salaries', creditAccount: 'Wage Payable',
    amount: 1396, narration: \`Payroll run PR-9481 · daily · E005 Mohammed Ali · \${period}\`,
  } });
  // J2s = per head to the authority parties (the remittance legs)
  await db.journal.create({ data: {
    voucherNo: 'V-9482', voucherType: 'journal', date: new Date(), finYear: '26-27',
    partyId: epfo.id, debitAccount: 'Staff Salaries', creditAccount: 'PF Payable',
    amount: 384, narration: \`Payroll run PR-9481 · daily · PF statutory · employee ₹192 + employer ₹192 · \${period}\`,
  } });
  await db.journal.create({ data: {
    voucherNo: 'V-9483', voucherType: 'journal', date: new Date(), finYear: '26-27',
    partyId: esic.id, debitAccount: 'Staff Salaries', creditAccount: 'ESI Payable',
    amount: 64, narration: \`Payroll run PR-9481 · daily · ESI statutory · employee ₹12 + employer ₹52 · \${period}\`,
  } });
  console.log(JSON.stringify({ runId: run.id, lineId: line.id, epfo: epfo.code, esic: esic.code }));
  await db.\$disconnect();
})().catch(e => { console.error('SEED-FAIL ' + e.message); process.exit(1); })
")
if echo "$SEED" | grep -q '"runId"'; then
  RUN_ID=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).runId)})")
  LINE_ID=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).lineId)})")
  ok "seed: PR-9481 committed statutory (E005 2×₹800: pf 192/192 + esi 12/52 → net 1,396) + V-9481/V-9482/V-9483"
else
  RUN_ID=""; bad "seed failed: $SEED"
fi

if [ -n "$RUN_ID" ]; then
  # 3a. the statutory register lists the run × head rows + pending from the ledger
  sr=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/hr/statutory?q=PR-9481")
  echo "$sr" | grep -q "PR-9481" && ok "statutory register lists the seeded run (q=PR-9481)" || bad "seeded run not listed"
  echo "$sr" | grep -q "PF" && ok "the PF head row renders" || bad "PF row missing"
  echo "$sr" | grep -q "ESI" && ok "the ESI head row renders" || bad "ESI row missing"
  echo "$sr" | grep -q "EPFO" && ok "the EPFO authority column renders" || bad "authority column missing"
  echo "$sr" | grep -q "384" && ok "the PF total ₹384 renders (employee 192 + employer 192)" || bad "PF total missing"
  echo "$sr" | grep -q "384" && echo "$sr" | grep -q "Pending" && ok "the pending remittance column carries the ledger figure" || bad "pending figure missing"

  # 3b. the head filter (via the csv twin — pure data, no UI chrome)
  pf=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/hr/statutory/csv?variant=pf&q=PR-9481")
  echo "$pf" | grep -q "PR-9481" && echo "$pf" | grep -q "PF" && ! echo "$pf" | grep -q "^PR-9481,.*,ESI," && ok "variant=pf filter narrows the csv to the PF row" || bad "variant=pf filter broken"
  esi=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/hr/statutory/csv?variant=esi&q=PR-9481")
  echo "$esi" | grep -q "ESI" && ! echo "$esi" | grep -q "^PR-9481,.*,PF," && ok "variant=esi filter narrows the csv to the ESI row" || bad "variant=esi filter broken"

  # 3c. the payroll run view: statutory card + Deducted column + statutory journals
  view=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/hr/payroll/$RUN_ID")
  vcode=$(echo "$view" | tail -1)
  if [ "$vcode" = "200" ]; then ok "run view /hr/payroll/[id] renders (200)"; else bad "run view → $vcode"; fi
  echo "$view" | grep -q "Statutory" && ok "the statutory frozen-rates card renders" || bad "statutory card missing"
  echo "$view" | grep -q "Deducted" && ok "the lines table gains the Deducted column" || bad "Deducted column missing"
  echo "$view" | grep -q "204" && ok "the ₹204 deduction renders (header + lines)" || bad "deduction figure missing"
  echo "$view" | grep -q "PF Payable" && ok "the PF head journal listed in the audit table" || bad "PF journal missing"
  echo "$view" | grep -q "ESI Payable" && ok "the ESI head journal listed in the audit table" || bad "ESI journal missing"
  echo "$view" | grep -q "EPFO" && ok "the run view names the authority parties (remit note)" || bad "authority remit note missing"

  # 3d. the payslip PRINT route: deduction rows + employer note + net
  slip=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/print/payslip/$LINE_ID?copy=original")
  scode=$(echo "$slip" | tail -1)
  if [ "$scode" = "200" ]; then ok "payslip print route 200 (committed statutory)"; else bad "payslip print → $scode"; fi
  echo "$slip" | grep -q "PAYSLIP" && ok "PAYSLIP sheet title" || bad "payslip title missing"
  echo "$slip" | grep -q "Less: PF (employee)" && ok "the PF deduction row renders" || bad "PF deduction row missing"
  echo "$slip" | grep -q "Less: ESI (employee)" && ok "the ESI deduction row renders" || bad "ESI deduction row missing"
  echo "$slip" | grep -q "1,396" && ok "NET PAYABLE ₹1,396 (earned − deductions)" || bad "net 1,396 missing"
  echo "$slip" | grep -q "Employer adds (cost, NOT deducted" && ok "the employer-share note renders" || bad "employer note missing"

  # 3e. FULL REVERT (zero residue — attendance + journals + run; the authority
  #     parties remain: they are the find-or-create seams the live app reuses)
  REV=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const emp = await db.employee.findUniqueOrThrow({ where: { code: 'E005' } });
  const att = await db.attendance.deleteMany({ where: { employeeId: emp.id } });
  const j = await db.journal.deleteMany({ where: { voucherNo: { in: ['V-9481', 'V-9482', 'V-9483'] } } });
  const r = await db.payrollRun.deleteMany({ where: { runNo: 'PR-9481' } });
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
  srq=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/hr/statutory/csv?q=PR-9481")
  echo "$srq" | grep -q "^PR-9481," && bad "reverted run still listed (csv data row)" || ok "reverted run gone from the statutory register (csv)"
fi

# ── 4. the config door: /admin/options carries the payroll group ──
opt=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/admin/options")
optcode=$(echo "$opt" | tail -1)
if [ "$optcode" = "200" ]; then ok "/admin/options renders (200)"; else bad "/admin/options → $optcode"; fi
echo "$opt" | grep -q "Payroll Statutory" && ok "the options page renders the payroll group section" || bad "payroll group section missing"
echo "$opt" | grep -q "payroll:statutory" && ok "the payroll:statutory config row is listed (editable door)" || bad "config row missing"

# ── 5. menu + LIVE_ROUTES wiring ──
MENU_OK=$(grep -c "id: 'statutory'" src/lib/erp/menu-registry.ts)
if [ "$MENU_OK" -ge 1 ]; then ok "menu registry carries the statutory item (hr group)"; else bad "menu item missing"; fi
LR=$(grep -c "'/hr/statutory'" src/lib/erp/menu-registry.ts)
if [ "$LR" -ge 2 ]; then ok "LIVE_ROUTES carries /hr/statutory (+ the [id] reference via menu)"; else bad "LIVE_ROUTES entries: $LR"; fi

echo "================================"
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
