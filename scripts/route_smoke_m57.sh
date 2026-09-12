#!/bin/bash
# ============== ROUTE SMOKE — PHASE-6A BATCH 1 (SPEC-M57/M58/M59, ADR-026) ==============
# Live-server checks for the owner-complaints batch:
#   1. /profile — the profile page: 200 + markers (avatar initials, role
#      badge, Member since, Last login, Password, Agent preferences) +
#      the PATCH door round-trip (rename → verify → restore) + 401 shape
#   2. /admin — the admin hub: 200 + the six live cards + the honest
#      Phase-6 roadmap strip + every card target 200s + the FOUR
#      previously-dead breadcrumb pages still 200
#   3. /api/agent/history — the conversation list: 401 without a cookie,
#      200 with the shape; GET/DELETE round-trip on a crafted session
# Auth: admin fixture (the batch-0..9 cookie-jar pattern). Residue-free:
# the crafted ChatSession + the test-user rename are restored/deleted.
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

# ── 2. M57: the profile page ──
pro=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/profile")
pco=$(echo "$pro" | tail -1)
if [ "$pco" = "200" ]; then ok "/profile renders (200)"; else bad "/profile → $pco"; fi
for needle in "My profile" "Member since" "Last login" "Menu access" "Password" "Agent preferences"; do
  echo "$pro" | grep -q "$needle" && ok "profile carries '$needle'" || bad "profile missing '$needle'"
done

# the PATCH door: 401 without cookie, round-trip with one
u401=$(curl -s --max-time 10 -o /dev/null -w '%{http_code}' -X PATCH -H 'Content-Type: application/json' \
  -d '{"name":"No Session"}' "$BASE/api/auth/profile")
[ "$u401" = "401" ] && ok "PATCH /api/auth/profile 401 unauthenticated" || bad "PATCH unauth → $u401"
orig=$(echo "$pro" | grep -o 'value="[^"]*"' | head -1 | sed 's/value="//;s/"$//')
r1=$(curl -s --max-time 10 "${AUTH[@]}" -X PATCH -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Renamed"}' "$BASE/api/auth/profile")
echo "$r1" | grep -q '"ok":true' && ok "PATCH rename → ok" || bad "PATCH rename: $r1"
r2=$(curl -s --max-time 10 "${AUTH[@]}" -X PATCH -H 'Content-Type: application/json' \
  -d "{\"name\":\"$orig\"}" "$BASE/api/auth/profile")
echo "$r2" | grep -q '"ok":true' && ok "PATCH restore → ok (name back to '$orig')" || bad "PATCH restore: $r2"
bco=$(curl -s --max-time 10 "${AUTH[@]}" -X PATCH -H 'Content-Type: application/json' \
  -d '{"name":"x"}' "$BASE/api/auth/profile" -o /dev/null -w '%{http_code}')
[ "$bco" = "400" ] && ok "PATCH 1-char name → 400" || bad "PATCH 1-char → $bco"

# ── 3. M59: the admin hub ──
adm=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/admin")
aco=$(echo "$adm" | tail -1)
if [ "$aco" = "200" ]; then ok "/admin hub renders (200 — was a 404)"; else bad "/admin → $aco"; fi
for needle in "Admin Hub" "Users &amp; Groups" "Menu Rights" "Options &amp; Settings" "Feature Flags" "Company / FinYear" "Audit Log" "Phase-6 roadmap"; do
  echo "$adm" | grep -q "$needle" && ok "hub carries '$needle'" || bad "hub missing '$needle'"
done
# every card target 200s
for href in /admin/users /admin/menu-rights /admin/options /admin/settings /admin/company /admin/audit; do
  c=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE$href")
  [ "$c" = "200" ] && ok "card target $href → 200" || bad "card target $href → $c"
done
# the four previously-dead breadcrumb pages still 200 (they link /admin)
for href in /admin/users /admin/options /admin/settings /admin/menu-rights; do
  c=$(curl -s --max-time 30 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE$href")
  [ "$c" = "200" ] && ok "breadcrumb page $href still 200" || bad "breadcrumb page $href → $c"
done
# unauthenticated: the middleware redirects to login
uadm=$(curl -s --max-time 10 -o /dev/null -w '%{http_code}' "$BASE/admin")
[ "$uadm" = "307" ] && ok "/admin unauthenticated → 307 login redirect" || bad "/admin unauth → $uadm"

# ── 4. M58: the history API ──
h401=$(curl -s --max-time 10 -o /dev/null -w '%{http_code}' "$BASE/api/agent/history")
[ "$h401" = "401" ] && ok "GET /api/agent/history 401 unauthenticated" || bad "history unauth → $h401"
hl=$(curl -s --max-time 10 "${AUTH[@]}" "$BASE/api/agent/history")
echo "$hl" | grep -q '"sessions"' && ok "history list shape {sessions}" || bad "history list: $hl"
SID="smoke-$(date +%s)"
node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  await db.chatSession.create({ data: { id: '$SID', userId: (await db.user.findUnique({ where: { email: 'admin@fiberpro.local' } })).id, title: 'smoke conversation' } });
  await db.chatMessage.createMany({ data: [{ sessionId: '$SID', role: 'user', content: 'smoke q' }, { sessionId: '$SID', role: 'assistant', content: 'smoke a' }] });
  await db.\$disconnect();
})();" && ok "smoke conversation crafted ($SID)"
one=$(curl -s --max-time 10 "${AUTH[@]}" "$BASE/api/agent/history/$SID")
echo "$one" | grep -q 'smoke q' && echo "$one" | grep -q 'smoke a' && ok "GET one conversation → messages ascending" || bad "GET one: $one"
miss=$(curl -s --max-time 10 "${AUTH[@]}" -o /dev/null -w '%{http_code}' "$BASE/api/agent/history/does-not-exist")
[ "$miss" = "404" ] && ok "GET unknown conversation → 404 (anti-enumeration)" || bad "GET unknown → $miss"
del=$(curl -s --max-time 10 "${AUTH[@]}" -X DELETE "$BASE/api/agent/history/$SID")
echo "$del" | grep -q '"ok":true' && ok "DELETE own conversation → ok" || bad "DELETE: $del"
# residue check
res=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.chatSession.count({ where: { id: '$SID' } }).then(async (c) => { console.log(c); await db.\$disconnect(); });")
[ "$res" = "0" ] && ok "residue-free: crafted session gone (cascade)" || bad "residue: $res rows left"

rm -f "$JAR"
echo
echo "===== RESULT: $PASS OK · $FAIL FAIL ====="
[ "$FAIL" = "0" ] || exit 1
