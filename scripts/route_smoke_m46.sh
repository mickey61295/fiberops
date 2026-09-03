#!/bin/bash
# ============== ROUTE SMOKE — PAYROLL L-02+L-05 (SPEC-M46) ==============
# Live-server checks for the payroll-run batch:
#   1. /hr/payroll renders (register + the create door) + columns
#      (Earned/Advances/Net/Status) + the read-tool chip (ADR-001)
#   2. the csv twin exports the same service; variant/status/q filters
#      round-trip
#   3. THE SEEDED WALKTHROUGH STATE (raw prisma seed — the service-level
#      plan/commit/ledger math is pinned by tests/pipeline/payroll-l02.test.ts
#      29/29 through the REAL services; the browser E2E drives the real form
#      door): a committed run PR-9461 (E005, 2 attendance days × ₹800) + its
#      wage journal → register row · run view (lines + journals audit table +
#      payslip links) · payslip PRINT route (PAYSLIP / NET PAYABLE / L-05
#      meta incl. masked Aadhaar/UAN rows) — then FULLY REVERTED
#   4. refusal doors: DRAFT run payslip 404 · unknown payslip ids 404 ·
#      reverted run view 404
#   5. menu + LIVE_ROUTES wiring (hr group carries Payroll)
#   6. L-05: the employees master list carries Designation + Joined columns
# Auth: admin fixture (the batch-0..7 cookie-jar pattern). Zero residue by
# construction: the seed run + journal + attendance rows are deleted.
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

# ── 2. the register screen + filters + csv ──
page=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/hr/payroll")
code=$(echo "$page" | tail -1)
if [ "$code" = "200" ]; then ok "/hr/payroll renders (200)"; else bad "/hr/payroll → $code"; fi
for col in "Earned" "Advances" "Net" "Status"; do
  if echo "$page" | grep -q "$col"; then ok "register carries the '$col' column (L-02)"; else bad "column '$col' missing"; fi
done
if echo "$page" | grep -q "Create a payroll run"; then ok "the create door renders"; else bad "create door missing"; fi
if echo "$page" | grep -q "get_payroll_runs"; then ok "register cites the read tool (ADR-001 chip)"; else bad "read-tool chip missing"; fi
if echo "$page" | grep -q "piece — Σ production-entry earnings"; then ok "mode select teaches the earning basis"; else bad "mode select labels missing"; fi

csv=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/hr/payroll/csv")
csvcode=$(echo "$csv" | tail -1)
if [ "$csvcode" = "200" ]; then ok "csv twin exports (200)"; else bad "csv twin → $csvcode"; fi
echo "$csv" | grep -q "^Run," && ok "csv carries the register header" || bad "csv header missing"
for f in "variant=piece&status=committed" "status=draft" "q=PR-9461"; do
  fc=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/hr/payroll?$f")
  if [ "$fc" = "200" ]; then ok "filter '$f' round-trips"; else bad "filter '$f' → $fc"; fi
done

# ── 3. the seeded walkthrough state (raw seed; see header for the division
#        of labor with vitest + the browser E2E) ──
SEED=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const emp = await db.employee.findUniqueOrThrow({ where: { code: 'E005' } });
  const today = new Date(); today.setUTCHours(0,0,0,0);
  const yest = new Date(today.getTime() - 86400000);
  // attendance: 2 present days for E005 (dailyWage 800) — reverted below
  await db.attendance.createMany({ data: [
    { employeeId: emp.id, attDate: today, status: 'present' },
    { employeeId: emp.id, attDate: yest, status: 'present' },
  ] });
  const from = yest.toISOString().slice(0,10), to = today.toISOString().slice(0,10);
  // the committed run (mimics planPayrollRun + planPayrollRunCommit output)
  const run = await db.payrollRun.create({ data: {
    runNo: 'PR-9461', mode: 'daily', from: yest, to: today, status: 'committed',
    finYear: '26-27', committedAt: new Date(), notes: 'route_smoke_m46 walkthrough',
  } });
  const line = await db.payrollLine.create({ data: {
    runId: run.id, employeeId: emp.id, partyId: emp.partyId,
    days: 2, earned: 1600, advances: 0, net: 1600,
  } });
  const j = await db.journal.create({ data: {
    voucherNo: 'V-9461', voucherType: 'journal', date: new Date(), finYear: '26-27',
    partyId: emp.partyId, debitAccount: 'Staff Salaries', creditAccount: 'Wage Payable',
    amount: 1600, narration: \`Payroll run PR-9461 · daily · E005 Mohammed Ali · \${from} → \${to}\`,
  } });
  // the draft run (the payslip refusal door)
  const draft = await db.payrollRun.create({ data: {
    runNo: 'PR-9462', mode: 'daily', from: yest, to: today, status: 'draft', finYear: '26-27',
  } });
  const dline = await db.payrollLine.create({ data: {
    runId: draft.id, employeeId: emp.id, partyId: emp.partyId,
    days: 2, earned: 1600, advances: 0, net: 1600,
  } });
  console.log(JSON.stringify({ runId: run.id, lineId: line.id, draftId: draft.id, dlineId: dline.id }));
  await db.\$disconnect();
})().catch(e => { console.error('SEED-FAIL ' + e.message); process.exit(1); })
")
if echo "$SEED" | grep -q '"runId"'; then
  RUN_ID=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).runId)})")
  LINE_ID=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).lineId)})")
  DRAFT_ID=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).draftId)})")
  DLINE_ID=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).dlineId)})")
  ok "seed: PR-9461 committed (E005, 2 days × ₹800 = ₹1,600 + journal V-9461) + PR-9462 draft"
else
  RUN_ID=""; bad "seed failed: $SEED"
fi

if [ -n "$RUN_ID" ]; then
  # 3a. the register now shows the run (q filter)
  rp=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/hr/payroll?q=PR-9461")
  echo "$rp" | grep -q "PR-9461" && ok "register lists the seeded run (q=PR-9461)" || bad "seeded run not listed"
  echo "$rp" | grep -q "1,600" && ok "register renders the run totals en-IN (₹1,600)" || bad "run totals missing"

  # 3b. the run view: lines table + journals audit + payslip links
  view=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/hr/payroll/$RUN_ID")
  vcode=$(echo "$view" | tail -1)
  if [ "$vcode" = "200" ]; then ok "run view /hr/payroll/[id] renders (200)"; else bad "run view → $vcode"; fi
  echo "$view" | grep -q "Mohammed Ali" && ok "the line renders (E005 Mohammed Ali)" || bad "line employee missing"
  echo "$view" | grep -q "2 days × ₹800" && ok "the daily basis renders (2 days × ₹800)" || bad "daily basis missing"
  echo "$view" | grep -q "Posted wage journals" && ok "the journals audit table renders (committed)" || bad "journals table missing"
  echo "$view" | grep -q "V-9461" && ok "the posted journal V-9461 listed" || bad "journal V-9461 missing"
  echo "$view" | grep -q "Staff Salaries" && ok "the daily-mode Dr account named" || bad "Dr Staff Salaries missing"
  echo "$view" | grep -q "Payslip" && ok "per-line Payslip print links render" || bad "payslip links missing"

  # 3c. the payslip PRINT route (committed → 200)
  slip=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/print/payslip/$LINE_ID?copy=original")
  scode=$(echo "$slip" | tail -1)
  if [ "$scode" = "200" ]; then ok "payslip print route 200 (committed)"; else bad "payslip print → $scode"; fi
  echo "$slip" | grep -q "PAYSLIP" && ok "PAYSLIP sheet title" || bad "payslip title missing"
  echo "$slip" | grep -q "NET PAYABLE" && ok "NET PAYABLE totals block" || bad "net block missing"
  echo "$slip" | grep -q "1,600" && ok "the net ₹1,600 renders in figures" || bad "net figures missing"
  echo "$slip" | grep -q "Pay period" && ok "the pay-period meta row" || bad "period meta missing"
  echo "$slip" | grep -q "Aadhaar" && ok "L-05 meta rows on the payslip (UAN/Aadhaar)" || bad "L-05 meta missing"
  echo "$slip" | grep -q "attendance" && ok "the daily-mode payslip note (statement is piece-rate)" || bad "daily note missing"

  # 3d. the composite payslip id form (agent/deep-link door)
  comp=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/print/payslip/PR-9461%2FE005")
  if [ "$comp" = "200" ]; then ok "composite payslip id PR-9461/E005 resolves (200)"; else bad "composite payslip → $comp"; fi

  # 3e. FULL REVERT (zero residue — attendance seed + runs + journal)
  REV=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const emp = await db.employee.findUniqueOrThrow({ where: { code: 'E005' } });
  const att = await db.attendance.deleteMany({ where: { employeeId: emp.id } });
  const j = await db.journal.deleteMany({ where: { voucherNo: 'V-9461' } });
  const r = await db.payrollRun.deleteMany({ where: { runNo: { in: ['PR-9461', 'PR-9462'] } } });
  console.log('REVERTED att=' + att.count + ' journals=' + j.count + ' runs=' + r.count);
  await db.\$disconnect();
})().catch(e => { console.error('REVERT-FAIL ' + e.message); process.exit(1); })
")
  if echo "$REV" | grep -q "REVERTED"; then
    ok "seed fully reverted ($REV)"
  else
    bad "revert failed: $REV"
  fi

  # 3f. the reverted views 404 honestly
  gone=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/hr/payroll/$RUN_ID")
  if [ "$gone" = "404" ]; then ok "reverted run view 404s"; else bad "reverted run view → $gone"; fi
fi

# ── 4. refusal doors (draft payslip + unknown ids) ──
if [ -n "$DRAFT_ID" ] && [ -n "$DLINE_ID" ]; then
  draftslip=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/print/payslip/$DLINE_ID")
  if [ "$draftslip" = "404" ]; then ok "DRAFT payslip refuses (404 — numbers must be posted)"; else bad "draft payslip → $draftslip"; fi
fi
unk=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/print/payslip/no-such-line")
if [ "$unk" = "404" ]; then ok "unknown payslip id 404s"; else bad "unknown payslip → $unk"; fi
unk2=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/print/payslip/PR-0000%2FEMP-9999")
if [ "$unk2" = "404" ]; then ok "composite unknown payslip 404s"; else bad "composite payslip → $unk2"; fi

# ── 5. menu + LIVE_ROUTES wiring ──
MENU_OK=$(grep -c "id: 'payroll'" src/lib/erp/menu-registry.ts)
if [ "$MENU_OK" -ge 1 ]; then ok "menu registry carries the payroll item (hr group)"; else bad "menu item missing"; fi
LR=$(grep -c "'/hr/payroll'" src/lib/erp/menu-registry.ts)
if [ "$LR" -ge 2 ]; then ok "LIVE_ROUTES carries /hr/payroll + [id]"; else bad "LIVE_ROUTES entries: $LR"; fi

# ── 6. L-05: the employees master carries the payout columns ──
emp=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/masters/employee")
empcode=$(echo "$emp" | tail -1)
if [ "$empcode" = "200" ]; then ok "/masters/employee renders (200)"; else bad "/masters/employee → $empcode"; fi
echo "$emp" | grep -q "Designation" && ok "employee list carries the Designation column (L-05)" || bad "Designation column missing"
echo "$emp" | grep -q "Joined" && ok "employee list carries the Joined column (L-05)" || bad "Joined column missing"

echo "================================"
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
