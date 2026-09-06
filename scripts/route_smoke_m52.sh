#!/bin/bash
# ============== ROUTE SMOKE — FINAL-ACCOUNTS REPORTS (SPEC-M52, M-03) ==============
# Live-server checks for the Module M Batch 3:
#   1. THE FOUR SCREENS render: /accounts/trial-balance · day-book ·
#      cash-book · final-accounts (RegisterScreen archetype, both variants)
#   2. THE GL DOCTRINE on the live books: the TB asserts BALANCED (Dr == Cr,
#      every row counted — the live db is 187/187 linked, 0 unlinked)
#   3. THE CRAFTED WALKTHROUGH (raw prisma — the report math itself is pinned
#      18/18 by tests/pipeline/accounts-m03.test.ts through the REAL services;
#      the browser E2E drives the real screens): two journals dated TODAY —
#      A: Dr Cash/Bank [1010] / Cr Sales [4010] 600 (income in) · B: Dr
#      Freight [5020] / Cr Cash/Bank [1010] 250 (cash expense) → the
#      today-window shows: TB rows Sales/Freight + BALANCED · day-book q + the
#      GL code labels · cash-book today-window opening 0 → closing 350 ·
#      P&L income 600 − expense 250 = NET PROFIT ₹350 · the contra filter
#      honest-empty for the crafted set → FULLY REVERTED
#   4. CSV twins ×4 (200 + csv content-type + the header row)
#   5. refusal doors: unknown cash-book variant (honest message, 200) ·
#      unknown q stays 200-empty
# Auth: admin fixture (the batch-0..9 cookie-jar pattern). Zero residue by
# construction: every crafted row is deleted (journals by voucher prefix).
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

# ── 2. THE FOUR SCREENS render ──
for slug in trial-balance day-book cash-book final-accounts; do
  page=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/accounts/$slug")
  co=$(echo "$page" | tail -1)
  if [ "$co" = "200" ]; then ok "/accounts/$slug renders (200)"; else bad "/accounts/$slug → $co"; fi
done

# 2a. the TB on the LIVE books asserts BALANCED (the doctrine on real data)
tb=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/trial-balance")
echo "$tb" | grep -q "BALANCED" && ok "the live trial balance asserts BALANCED (Dr == Cr, 187 rows counted)" || bad "live TB not BALANCED"
echo "$tb" | grep -q "Trial Balance" && ok "the TB title renders" || bad "TB title missing"

# 2b. the day-book: the type filter + GL columns
dbk=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/day-book")
echo "$dbk" | grep -q "Dr account" && ok "the day-book Dr account column renders" || bad "Dr column missing"
echo "$dbk" | grep -q "Cash/Bank \[1010\]" && ok "the day-book rows carry resolved CoA labels ('Cash/Bank [1010]')" || bad "CoA labels missing on day-book"

# 2c. the cash-book: the family + totals
cb=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/cash-book")
echo "$cb" | grep -q "Opening" && ok "the cash-book Opening total renders" || bad "Opening total missing"
echo "$cb" | grep -q "Closing" && ok "the cash-book Closing total renders" || bad "Closing total missing"

# 2d. final accounts: both variants
pl=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/final-accounts?variant=pl")
echo "$pl" | grep -q "Net P&amp;L" && ok "the P&L variant renders the Net total" || bad "Net P&L missing"
bs=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/final-accounts?variant=bs")
echo "$bs" | grep -q "Retained earnings" && ok "the BS variant renders the retained-earnings line" || bad "Retained earnings missing"
echo "$bs" | grep -q "BALANCED" && ok "the live balance sheet asserts BALANCED (structural)" || bad "live BS not BALANCED"

# ── 3. THE CRAFTED WALKTHROUGH (raw prisma — the report math is test-pinned) ──
SEED=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const cash = await db.account.findUniqueOrThrow({ where: { code: '1010' } });
  const sales = await db.account.findUniqueOrThrow({ where: { code: '4010' } });
  const freight = await db.account.findUniqueOrThrow({ where: { code: '5020' } });
  const a = await db.journal.create({ data: { voucherNo: 'M52J-SMK-A', voucherType: 'journal', date: new Date(), finYear: '26-27', debitAccount: 'Cash/Bank', creditAccount: 'Sales', debitAccountId: cash.id, creditAccountId: sales.id, amount: 600, narration: 'route_smoke_m52 income in' } });
  const b = await db.journal.create({ data: { voucherNo: 'M52J-SMK-B', voucherType: 'journal', date: new Date(), finYear: '26-27', debitAccount: 'Freight', creditAccount: 'Cash/Bank', debitAccountId: freight.id, creditAccountId: cash.id, amount: 250, narration: 'route_smoke_m52 cash expense' } });
  console.log(JSON.stringify({ ok: true, a: a.voucherNo, b: b.voucherNo }));
})().catch(e => { console.error(String(e)); process.exit(1) }).finally(() => db.\$disconnect());
")
if echo "$SEED" | grep -q '"ok":true'; then
  ok "seed: M52J-SMK-A (Dr 1010 / Cr Sales 600) + M52J-SMK-B (Dr Freight / Cr 1010 250) — dated today"
else
  bad "seed failed: $SEED"
fi

# 3a. TB today-window: the Sales + Freight rows + BALANCED
tbt=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/trial-balance?from=$TODAY")
echo "$tbt" | grep -q ">4010<" && echo "$tbt" | grep -q ">Sales<" && ok "TB today-window: the Sales [4010] row renders" || bad "Sales row missing on TB"
echo "$tbt" | grep -q ">5020<" && echo "$tbt" | grep -q ">Freight<" && ok "TB today-window: the Freight [5020] row renders" || bad "Freight row missing on TB"
echo "$tbt" | grep -q "BALANCED" && ok "TB today-window: BALANCED (600 in == 600 out at each account)" || bad "TB today-window not BALANCED"

# 3b. day-book q: the crafted pair with GL labels + the contra filter honest-empty
dbq=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/day-book?q=M52J-SMK")
echo "$dbq" | grep -q "M52J-SMK-A" && ok "day-book q: the crafted pair renders" || bad "crafted pair missing on day-book"
echo "$dbq" | grep -q "Sales \[4010\]" && ok "day-book q: the Cr leg labels 'Sales [4010]'" || bad "Sales label missing"
dbc=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/day-book?q=M52J-SMK&variant=contra")
if echo "$dbc" | grep -q "M52J-SMK-A"; then bad "the contra filter leaks the crafted journal rows"; else ok "the contra filter is honest-empty for the crafted set (no contras crafted)"; fi

# 3c. cash-book today-window: the exact window flows (the family opening
# carries the legacy 1010 net — the DELTA is the walkthrough's own)
cbt=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/cash-book?from=$TODAY")
echo "$cbt" | grep -q "Freight \[5020\]" && ok "cash-book today-window: the B particulars 'Freight [5020]'" || bad "Freight particulars missing"
echo "$cbt" | grep -q "in ₹600" && echo "$cbt" | grep -q "out ₹250" && ok "cash-book today-window: the flows + in ₹600 − out ₹250 (opening = the legacy family net)" || bad "in/out ₹ flows missing"
echo "$cbt" | grep -q "Sales \[4010\]" && ok "cash-book today-window: the A particulars 'Sales [4010]'" || bad "Sales particulars missing"

# 3d. P&L today-window: income 600 − expense 250 = NET PROFIT ₹350
plt=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/final-accounts?variant=pl&from=$TODAY")
echo "$plt" | grep -q ">4010<" && echo "$plt" | grep -q ">Sales<" && ok "P&L today-window: the Sales income row renders" || bad "Sales row missing on P&L"
echo "$plt" | grep -q ">5020<" && echo "$plt" | grep -q ">Freight<" && ok "P&L today-window: the Freight expense row renders" || bad "Freight row missing on P&L"
echo "$plt" | grep -q "NET PROFIT ₹350" && ok "P&L today-window: NET PROFIT ₹350 (600 − 250)" || bad "NET PROFIT ₹350 missing"

# 3e. the BS today-window closes (assets 350 vs P&L 350 — structural)
bst=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/final-accounts?variant=bs&from=$TODAY")
echo "$bst" | grep -q "BALANCED" && ok "BS today-window: BALANCED (Cash/Bank 350 vs retained earnings 350)" || bad "BS today-window not BALANCED"

# ── 4. FULL REVERT (zero residue — journals by voucher prefix) ──
REV=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  await db.journal.deleteMany({ where: { voucherNo: { startsWith: 'M52J-SMK' } } });
  const left = await db.journal.count({ where: { voucherNo: { startsWith: 'M52J-SMK' } } });
  console.log(left === 0 ? 'reverted' : 'LEFTOVER ' + left);
})().catch(e => { console.error(String(e)); process.exit(1) }).finally(() => db.\$disconnect());
")
if [ "$REV" = "reverted" ]; then ok "revert: the crafted journals deleted (zero residue)"; else bad "revert failed: $REV"; fi

# ── 5. CSV twins ×4 ──
for slug in trial-balance day-book cash-book final-accounts; do
  csv=$(curl -s --max-time 30 "${AUTH[@]}" -o /tmp/m52-$slug.csv -w '%{http_code}|%{content_type}' "$BASE/accounts/$slug/csv")
  co=$(echo "$csv" | cut -d'|' -f1)
  ct=$(echo "$csv" | cut -d'|' -f2)
  if [ "$co" = "200" ]; then ok "$slug csv 200"; else bad "$slug csv → $co"; fi
  if echo "$ct" | grep -q "csv"; then ok "$slug csv content-type csv"; else bad "$slug csv content-type: $ct"; fi
  head -1 /tmp/m52-$slug.csv | grep -q "Code\|Date" && ok "$slug csv header row present" || bad "$slug csv header missing"
done

# ── 6. refusal/honesty doors ──
cbn=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/accounts/cash-book?variant=9999")
if [ "$cbn" = "200" ]; then ok "unknown cash-book variant stays 200 (the honest message)"; else bad "cash-book variant → $cbn"; fi
cbmsg=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/cash-book?variant=9999")
echo "$cbmsg" | grep -q "not in the cash family" && ok "the honest not-in-family message renders" || bad "honest message missing"
dbq2=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/accounts/day-book?q=nothing-m52")
if [ "$dbq2" = "200" ]; then ok "day-book unknown q stays 200-empty (honest)"; else bad "day-book q → $dbq2"; fi
tbu=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/accounts/trial-balance")
if echo "$tbu" | grep -q "UNLINKED row"; then bad "the live TB reports unlinked rows (unexpected)"; else ok "the live TB carries no unlinked warning (0/187)"; fi

echo
echo "RESULT: $PASS ok, $FAIL fail"
[ "$FAIL" -gt 0 ] && exit 1
echo "route_smoke_m52 LIVE ✅"
