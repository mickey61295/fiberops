#!/usr/bin/env bash
# M35 route smoke (SPEC-M35): holidays digest adoption — seed a holiday 6d
# out → /notifications/digest renders the amber shutdowns card with the
# holiday + days-until + calendar link + the text block; a 30d-out holiday
# stays off the card (14d window); delete → the card hides; zero residue.
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M35: start dev server =="
(npm run dev > /tmp/m35_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m35_dev.log; exit 1; }

echo "== M35: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M35: fixture — holiday 6d out + one 30d out =="
FIX=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const ts = Date.now();
  const dayMs = 86400000;
  const at = (o: number) => new Date(new Date(Date.now() + o * dayMs).setHours(0, 0, 0, 0));
  await db.govtHoliday.createMany({ data: [
    { date: at(6), name: 'SM35 Near Pongal ' + ts },
    { date: at(30), name: 'SM35 Far Festival ' + ts },
  ] });
  console.log('seeded ' + ts);
  await db.\$disconnect();
})();
")
echo "$FIX" | grep -q seeded && ok "holidays seeded" || bad "fixture missing"

echo "== M35: the digest page shows the shutdowns card =="
page=$(curl -s --max-time 30 -b "$JAR" "$BASE/notifications/digest")
echo "$page" | grep -q 'data-digest-shutdowns' && ok "shutdowns card present" || bad "shutdowns card missing"
echo "$page" | grep -q 'Upcoming shutdowns' && ok "card title" || bad "card title missing"
echo "$page" | grep -qE 'SM35 Near Pongal' && ok "near holiday listed" || bad "near holiday missing"
echo "$page" | grep -qE 'SM35 Far Festival' && bad "30d holiday should NOT be on the 14d card" || ok "window honored"
echo "$page" | grep -q 'masters/govt-holiday' && ok "calendar deep-link" || bad "calendar link missing"
echo "$page" | sed 's/<!-- -->//g' | grep -q "next 14 days" && ok "window caption" || bad "window caption missing"
echo "$page" | grep -qE 'Upcoming shutdowns \(14d\)' && ok "text block carries the shutdowns" || bad "text block missing"

echo "== M35: no holidays in window → the card hides =="
npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  await db.govtHoliday.deleteMany({ where: { name: { startsWith: 'SM35 ' } } });
  await db.\$disconnect();
})();
"
page2=$(curl -s --max-time 30 -b "$JAR" "$BASE/notifications/digest")
echo "$page2" | grep -q 'data-digest-shutdowns' && bad "the card should hide when no holidays" || ok "card hidden when quiet"

echo "== M35: cleanup =="
CLEAN=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  await db.govtHoliday.deleteMany({ where: { name: { startsWith: 'SM35 ' } } });
  const residue = await db.govtHoliday.count({ where: { name: { startsWith: 'SM35 ' } } });
  console.log(residue === 0 ? 'cleaned' : 'RESIDUE ' + residue);
  await db.\$disconnect();
})();
")
echo "$CLEAN" | grep -q cleaned && ok "fixtures cleaned" || bad "cleanup: $CLEAN"

echo
echo "== M35 RESULT: $pass pass / $fail fail =="
[ "$fail" = "0" ] || exit 1
