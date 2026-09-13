#!/bin/bash
# ============== ROUTE SMOKE — M60 (SPEC-M60, ADR-026 Batch 2 part 1) ==============
# Live-server checks for the auth-hardening core:
#   1. THE LOCKOUT WALKTHROUGH — 5 bad logins on the ADMIN's own email →
#      429 on the 6th; the CORRECT password also 429 (lockout precedes
#      credentials); the admin clear (API, session stays valid — a lock
#      never revokes a live session) → the correct password logs in (200)
#   2. /admin/login-audit — the register: 200 + the currently-locked strip
#      appears DURING the lock + the event filter + the csv
#   3. /profile — the Sessions card + POST /api/auth/sessions/clear →
#      200 + the sessions_cleared audit row
#   4. /api/auth/admin/clear-lockout 401 without a session
# Residue-free: every LoginAttempt/LoginAudit row the smoke created (both
# emails) is deleted at the end and re-counted at zero.
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
TS=$(date +%s)
ADMIN_EMAIL="admin@fiberpro.local"
SMOKE_EMAIL="smoke-m60-${TS}@fiberpro.local"

# ── 1. admin login (the fixture) ──
JAR=$(mktemp)
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"admin123\"}" "$BASE/api/auth/login")
if echo "$body" | grep -q '"ok":true'; then ok "admin login"; else bad "admin login: $body"; fi
AUTH=(-b "$JAR")

# ── 2. M60 FR-A6: the lockout walkthrough on the admin's own email ──
for i in 1 2 3 4 5; do
  code=$(curl -s --max-time 15 -o /tmp/m60-bad.json -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"wrong-$i\"}" "$BASE/api/auth/login")
  [ "$code" = "401" ] && ok "bad login $i → 401" || bad "bad login $i → $code"
done
code6=$(curl -s --max-time 15 -o /tmp/m60-locked.json -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"wrong-6\"}" "$BASE/api/auth/login")
[ "$code6" = "429" ] && ok "6th attempt → 429 (locked)" || bad "6th attempt → $code6: $(cat /tmp/m60-locked.json)"
grep -q "locked" /tmp/m60-locked.json && ok "429 body names the lock" || bad "429 body: $(cat /tmp/m60-locked.json)"
# the CORRECT password is refused too (lockout precedes credentials)
codeC=$(curl -s --max-time 15 -o /tmp/m60-correct.json -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"admin123\"}" "$BASE/api/auth/login")
[ "$codeC" = "429" ] && ok "the CORRECT password also 429 while locked" || bad "correct password → $codeC"

# the register shows the lock live (currently-locked strip names the email)
# NOTE: React SSR emits `Currently locked (<!-- -->1<!-- -->)` — comment
# separators between text nodes — so grep the stable label, then the email.
reg=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/admin/login-audit")
echo "$reg" | grep -q "Currently locked" && ok "login-audit strip: the currently-locked strip renders" || bad "strip not rendering"
echo "$reg" | grep -q "No emails are locked" && bad "strip says nothing locked (wrong)" || ok "strip is NOT in the empty state"
echo "$reg" | grep -q "$ADMIN_EMAIL" && ok "the strip names the locked email" || bad "strip missing the email"
for needle in "Login Audit" "Event" "Email" "User Agent"; do
  echo "$reg" | grep -q "$needle" && ok "register carries '$needle'" || bad "register missing '$needle'"
done

# the admin clear (the API — the smoke's session is still valid: a lock never revokes a session)
cl=$(curl -s --max-time 15 "${AUTH[@]}" -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\"}" "$BASE/api/auth/admin/clear-lockout")
echo "$cl" | grep -q '"ok":true' && ok "admin clear-lockout → ok" || bad "clear-lockout: $cl"
# 401 without a session
u401=$(curl -s --max-time 10 -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
  -d '{"email":"x@y.z"}' "$BASE/api/auth/admin/clear-lockout")
[ "$u401" = "401" ] && ok "clear-lockout 401 unauthenticated" || bad "clear-lockout unauth → $u401"
# now the correct password logs in
okL=$(curl -s --max-time 15 -o /tmp/m60-relogin.json -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"admin123\"}" "$BASE/api/auth/login")
[ "$okL" = "200" ] && ok "after clear, the correct password logs in (200)" || bad "post-clear login → $okL: $(cat /tmp/m60-relogin.json)"

# the event filter + the csv
filt=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/admin/login-audit?variant=login_fail")
echo "$filt" | grep -q "login_fail" && ok "event filter renders login_fail rows" || bad "event filter empty"
csvc=$(curl -s --max-time 30 "${AUTH[@]}" -o /tmp/m60-audit.csv -w '%{http_code}' "$BASE/admin/login-audit/csv")
[ "$csvc" = "200" ] && ok "csv → 200" || bad "csv → $csvc"
head -1 /tmp/m60-audit.csv | grep -qi "event" && ok "csv carries the event column" || bad "csv header: $(head -1 /tmp/m60-audit.csv)"

# ── 3. M60 FR-A8: the profile Sessions card + sessions/clear ──
pro=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/profile")
echo "$pro" | grep -q "Sign out all devices" && ok "profile carries the Sessions card" || bad "profile missing the card"
sc=$(curl -s --max-time 15 -b "$JAR" -c "$JAR" -X POST "$BASE/api/auth/sessions/clear")
echo "$sc" | grep -q '"ok":true' && ok "sessions/clear → ok (this session re-issued)" || bad "sessions/clear: $sc"
# the re-issued cookie still works (the smoke's jar was replaced — use a fresh page load)
still=$(curl -s --max-time 30 -o /dev/null -w '%{http_code}' "${AUTH[@]}" "$BASE/profile")
[ "$still" = "200" ] && ok "the session survives its own clear (re-issued)" || bad "post-clear profile → $still"
sess=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/admin/login-audit?variant=sessions_cleared")
echo "$sess" | grep -q "$ADMIN_EMAIL" && ok "sessions_cleared audit row present" || bad "sessions_cleared row missing"

# ── 4. unknown emails lock identically (anti-enumeration parity) ──
for i in 1 2 3 4 5; do
  curl -s --max-time 15 -o /dev/null -X POST -H 'Content-Type: application/json' \
    -d "{\"email\":\"$SMOKE_EMAIL\",\"password\":\"nope\"}" "$BASE/api/auth/login"
done
codeU=$(curl -s --max-time 15 -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SMOKE_EMAIL\",\"password\":\"nope\"}" "$BASE/api/auth/login")
[ "$codeU" = "429" ] && ok "unknown email locks identically (429)" || bad "unknown email → $codeU"

# ── 5. residue cleanup: delete every row this smoke created, verify zero ──
CLEANUP_RC=0
node - "$ADMIN_EMAIL" "$SMOKE_EMAIL" <<'EOF' || CLEANUP_RC=$?
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
const emails = [process.argv[2], process.argv[3]]
;(async () => {
  const a = await p.loginAttempt.deleteMany({ where: { email: { in: emails } } })
  const u = await p.loginAudit.deleteMany({ where: { email: { in: emails } } })
  const left = await p.loginAttempt.count({ where: { email: { in: emails } } })
  const leftU = await p.loginAudit.count({ where: { email: { in: emails } } })
  console.log(`CLEANUP attempts=${a.count} audits=${u.count} residue=${left + leftU}`)
  await p.$disconnect()
  process.exit(left + leftU === 0 ? 0 : 1)
})()
EOF
if [ $CLEANUP_RC -eq 0 ]; then ok "residue-free (both ledgers back to zero for the smoke emails)"; else bad "residue left behind"; fi

echo
echo "===== RESULT: $PASS OK · $FAIL FAIL ====="
[ $FAIL -eq 0 ]
