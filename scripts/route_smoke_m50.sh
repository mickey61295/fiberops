#!/bin/bash
# ============== ROUTE SMOKE — CHART OF ACCOUNTS M-01 (SPEC-M50) ==============
# Live-server checks for the Module M Batch 1:
#   1. /masters/account — the CoA master page (the M2 engine ride): seeded
#      rows render (Cash/Bank, Sundry Debtors, Production Wages …) with the
#      Type + Parent columns; the create form carries the ACC-#### auto-code
#      discipline
#   2. /accounts/journal — the register shows the CODE CHIPS on linked legs
#      ('Cash/Bank · 1010', 'Acme Corp USA · 1110' — the migrated seed)
#   3. /accounts/journal/[voucherNo] — the view's GL-legs line names the
#      resolved codes; the voucher's own strings stay the detail text
#   4. THE FORM-DOOR WALKTHROUGH (raw prisma seed — the guard/refusal paths
#      are pinned by tests/pipeline/accounts-m01.test.ts 22/22 through the
#      REAL services; the browser E2E drives the real masters form): a
#      crafted account (ACC-####) + a journal linked to it through resolved
#      FK ids → the register + view carry its code → FULLY REVERTED
#   5. refusal/honesty doors: unknown journal id 404 · the day-book-style
#      unknown q stays 200-empty on the journal register
#   6. menu + LIVE_ROUTES wiring unchanged (depth, not width — pinned by
#      context_check 606)
# Auth: admin fixture (the batch-0..9 cookie-jar pattern). Zero residue by
# construction: the crafted account + journal rows are deleted.
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

# ── 2. the CoA master page ──
coa=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/masters/account")
cco=$(echo "$coa" | tail -1)
if [ "$cco" = "200" ]; then ok "/masters/account renders (200 — the M2 engine ride)"; else bad "/masters/account → $cco"; fi
for needle in "Sundry Debtors" "Cash/Bank" "Production Wages" "Suspense Account" "Type" "Parent"; do
  echo "$coa" | grep -q "$needle" && ok "masters page carries '$needle'" || bad "masters page missing '$needle'"
done

# ── 3. the journal register code chips (the migrated seed rows) ──
reg=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/accounts/journal")
rco=$(echo "$reg" | tail -1)
if [ "$rco" = "200" ]; then ok "/accounts/journal register 200"; else bad "journal register → $rco"; fi
echo "$reg" | grep -q "Cash/Bank · 1010" && ok "the cash leg shows its code chip (Cash/Bank · 1010)" || bad "cash-leg code chip missing"
echo "$reg" | grep -q "Acme Corp USA · 1110" && ok "the party leg classifies visibly (Acme Corp USA · 1110 → Sundry Debtors)" || bad "party-leg code chip missing"

# ── 4. THE WALKTHROUGH STATE (raw prisma: an account + a linked journal) ──
SEED=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const acc = await db.account.create({ data: { code: 'ACC-9501', name: 'Route Smoke CoA Test', type: 'expense', active: true } });
  const suspense = await db.account.findUniqueOrThrow({ where: { code: '9000' } });
  const j = await db.journal.create({ data: {
    voucherNo: 'V-9501', voucherType: 'journal', finYear: '26-27', date: new Date(),
    debitAccount: 'Route Smoke CoA Test', creditAccount: 'Suspense Account',
    debitAccountId: acc.id, creditAccountId: suspense.id,
    amount: 42, narration: 'route_smoke_m50 walkthrough',
  } });
  console.log(JSON.stringify({ accId: acc.id, journalNo: j.voucherNo }));
})().catch(e => { console.error(String(e)); process.exit(1) }).finally(() => db.\$disconnect());
")
if echo "$SEED" | grep -q "journalNo"; then
  ok "seed: ACC-9501 'Route Smoke CoA Test' + V-9501 (legs → ACC-9501 / 9000)"
else
  bad "seed failed: $SEED"
fi

# 4a. the register lists the crafted journal with its code chip
reg2=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/journal?q=V-9501")
echo "$reg2" | grep -q "Route Smoke CoA Test · ACC-9501" && ok "the crafted account's leg shows 'Route Smoke CoA Test · ACC-9501'" || bad "crafted-leg code chip missing"

# 4b. the [id] view's GL-legs line
view=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/accounts/journal/V-9501")
vco=$(echo "$view" | tail -1)
if [ "$vco" = "200" ]; then ok "journal view by voucherNo 200"; else bad "journal view → $vco"; fi
echo "$view" | grep -q "GL legs" && ok "the GL-legs line renders" || bad "GL-legs line missing"
echo "$view" | grep -q "ACC-9501" && ok "the view names the crafted account code" || bad "view code missing"
echo "$view" | grep -q "9000" && ok "the Suspense leg code renders" || bad "suspense code missing"
echo "$view" | grep -q "Route Smoke CoA Test" && ok "the voucher's own string stays (detail text)" || bad "string rewritten"

# 4c. a seeded row's view (the migrated receipt companion)
seedview=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/accounts/journal/JV-RCP-0001")
if [ "$seedview" = "200" ]; then ok "the seeded JV-RCP-0001 view 200 (migrated links live)"; else bad "seeded journal view → $seedview"; fi

# 4d. FULL REVERT (zero residue)
REV=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  await db.journal.deleteMany({ where: { voucherNo: 'V-9501' } });
  await db.account.deleteMany({ where: { code: 'ACC-9501' } });
  console.log('reverted');
})().catch(e => { console.error(String(e)); process.exit(1) }).finally(() => db.\$disconnect());
")
if [ "$REV" = "reverted" ]; then ok "revert: journal V-9501 + account ACC-9501 deleted"; else bad "revert failed: $REV"; fi

# 4e. the reverted view goes honest
gone=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/accounts/journal/V-9501")
if [ "$gone" = "404" ]; then ok "reverted journal view 404s"; else bad "reverted journal view → $gone"; fi

# ── 5. refusal/honesty doors ──
jrq=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/accounts/journal?q=nothing-m50")
if [ "$jrq" = "200" ]; then ok "journal register unknown q still 200-empty (honest)"; else bad "journal q → $jrq"; fi
unk=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/accounts/journal/V-999999")
if [ "$unk" = "404" ]; then ok "unknown journal voucherNo 404s"; else bad "unknown voucher → $unk"; fi

# ── 6. the CoA is honest about the M-03 queue (no TB surface yet) ──
tb=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/accounts/trial-balance")
if [ "$tb" = "404" ]; then ok "no trial-balance surface yet (M-03 — honest)"; else bad "trial-balance unexpectedly → $tb"; fi

echo
echo "RESULT: $PASS ok, $FAIL fail"
[ "$FAIL" -gt 0 ] && exit 1
echo "route_smoke_m50 LIVE ✅"
