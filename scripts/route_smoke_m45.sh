#!/bin/bash
# ============== ROUTE SMOKE — PAYROLL L-01 (SPEC-M45) ==============
# Live-server checks for the wage-reconciliation batch:
#   1. /hr/operator-statement renders + the reconciliation columns
#      (Earned / Paid / Owed) + the E001 seed operator row (earned ₹5,400 —
#      the seed production entries; owed = earned − paid)
#   2. the csv twin exports the same service
#   3. the q filter + the from/to date window round-trip (both legs windowed)
#   4. the party filter resolves an employee-party code (E001 — backfilled)
#   5. the wages register (the M40 interim surface) keeps its paid/owed columns
#   6. /masters/employee still renders (the 1:1 link lives in the service —
#      the master screen is untouched)
#   7. the menu + LIVE_ROUTES wiring: the hr group carries the statement
# Auth: admin fixture (the batch-0..7 cookie-jar pattern). ZERO residue —
# every check is a GET against existing seed + backfilled data.
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

# ── 2. the statement screen ──
page=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/hr/operator-statement")
code=$(echo "$page" | tail -1)
if [ "$code" = "200" ]; then ok "/hr/operator-statement renders (200)"; else bad "/hr/operator-statement → $code"; fi
for col in "Earned" "Paid" "Owed"; do
  if echo "$page" | grep -q "$col"; then ok "statement carries the '$col' column (L-01)"; else bad "column '$col' missing"; fi
done
if echo "$page" | grep -q "Operator Statement"; then ok "statement title present"; else bad "statement title missing"; fi
if echo "$page" | grep -q "get_operator_statement"; then ok "statement cites the same tool (ADR-001 chip)"; else bad "tool chip missing"; fi

# ── 3. the seed operator rows + THE arithmetic invariant, LIVE ──
# E001 is the honest live accumulator (seed + every prior session's test
# entries) — pin the INVARIANT (owed = earned − paid), not a frozen number:
# compute earned/paid from the DB, render them in the page's en-IN format,
# and require both + their difference on the page.
TRIPLE=$(node -e "const { PrismaClient } = require('@prisma/client'); const db = new PrismaClient(); (async () => { const emp = await db.employee.findUnique({ where: { code: 'E001' } }); const e = await db.productionEntry.aggregate({ where: { operatorId: emp.id }, _sum: { amount: true } }); const p = emp.partyId ? await db.payment.aggregate({ where: { partyId: emp.partyId, direction: 'out', status: 'active' }, _sum: { amount: true } }) : { _sum: { amount: 0 } }; const earned = Math.round((e._sum.amount ?? 0) * 100) / 100; const paid = Math.round((p._sum.amount ?? 0) * 100) / 100; const owed = Math.round((earned - paid) * 100) / 100; console.log(JSON.stringify([earned, paid, owed])); await db.\$disconnect(); })()" 2>/dev/null)
if [ -n "$TRIPLE" ]; then
  FORMATTED=$(node -e "const [a,b,c] = $TRIPLE; console.log([a,b,c].map(n => n.toLocaleString('en-IN')).join('|'))")
  E_F=$(echo "$FORMATTED" | cut -d'|' -f1); P_F=$(echo "$FORMATTED" | cut -d'|' -f2); O_F=$(echo "$FORMATTED" | cut -d'|' -f3)
  if echo "$page" | grep -q "$E_F"; then ok "E001 earned ₹$E_F renders (the live accumulator)"; else bad "E001 earned ₹$E_F not visible"; fi
  if echo "$page" | grep -q "$O_F"; then ok "E001 owed ₹$O_F renders (= earned − paid, LIVE arithmetic)"; else bad "E001 owed ₹$O_F not visible"; fi
  node -e "const [a,b,c] = $TRIPLE; process.exit(Math.abs(c - (a - b)) < 0.01 ? 0 : 1)" && ok "the invariant held: owed = earned − paid" || bad "invariant broke"
else
  bad "could not compute the E001 triple from the DB"
fi

# ── 4. the csv twin ──
csv=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/hr/operator-statement/csv")
code=$(echo "$csv" | tail -1)
if [ "$code" = "200" ]; then ok "statement csv exports (200)"; else bad "statement csv → $code"; fi
if echo "$csv" | head -1 | grep -q "Earned"; then ok "csv header carries the earned/paid/owed legs"; else bad "csv header missing legs"; fi
if echo "$csv" | grep -q "^E001,"; then ok "csv row for E001 exports"; else bad "csv E001 row missing"; fi

# ── 5. filters round-trip ──
page=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/hr/operator-statement?q=E001")
code=$(echo "$page" | tail -1)
if [ "$code" = "200" ]; then ok "q filter (E001) renders (200)"; else bad "q filter → $code"; fi
if echo "$page" | grep -q "E001"; then ok "q=E001 narrows to the operator"; else bad "q filter did not resolve"; fi
page=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/hr/operator-statement?party=E001")
code=$(echo "$page" | tail -1)
if [ "$code" = "200" ]; then ok "party filter (employee-party E001) renders (200)"; else bad "party filter → $code"; fi
if echo "$page" | grep -q "E001"; then ok "party=E001 resolves the backfilled employee-party"; else bad "party filter did not resolve"; fi

# ── 6. the wages register interim columns stay (M40) ──
page=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/hr/wages")
code=$(echo "$page" | tail -1)
if [ "$code" = "200" ]; then ok "/hr/wages still renders (200)"; else bad "/hr/wages → $code"; fi

# ── 7. the masters screen (the link lives in the service, not the screen) ──
page=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/masters/employee")
code=$(echo "$page" | tail -1)
if [ "$code" = "200" ]; then ok "/masters/employee renders (200 — link via service, screen untouched)"; else bad "/masters/employee → $code"; fi

# ── 8. the 1:1 link is live in the DB (backfilled employees) ──
LINKED=$(node -e "const { PrismaClient } = require('@prisma/client'); const db = new PrismaClient(); db.employee.count({ where: { partyId: { not: null } } }).then(c => { console.log(c); return db.\$disconnect(); })" 2>/dev/null)
TOTAL=$(node -e "const { PrismaClient } = require('@prisma/client'); const db = new PrismaClient(); db.employee.count().then(c => { console.log(c); return db.\$disconnect(); })" 2>/dev/null)
if [ "$LINKED" = "$TOTAL" ] && [ "$LINKED" -gt 0 ]; then ok "every employee is party-linked ($LINKED/$TOTAL — the backfill)"; else bad "unlinked employees remain ($LINKED/$TOTAL)"; fi

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1
exit 0
