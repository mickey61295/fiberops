#!/usr/bin/env bash
# M20 route smoke (SPEC-M20): attendance day-book — page renders fixture rows
# + 4 status totals + status/q filters, CSV content, menu item + sidebar,
# and the register's chip tool exists in the agent registry.
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M20: start dev server (fresh client after prisma generate) =="
(npm run dev > /tmp/m20_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m20_dev.log; exit 1; }

echo "== M20: login + seed attendance fixtures =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

SEED=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const ts = Date.now();
  const d = await db.department.create({ data: { code: 'SM20-D-' + ts, name: 'Smoke Dept ' + ts, orderSno: 99 } });
  const e1 = await db.employee.create({ data: { code: 'SM20-E1-' + ts, name: 'Smoke One ' + ts, deptId: d.id } });
  const e2 = await db.employee.create({ data: { code: 'SM20-E2-' + ts, name: 'Smoke Two ' + ts, deptId: d.id } });
  const today = new Date();
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  await db.attendance.createMany({ data: [
    { attDate: day, employeeId: e1.id, status: 'present', inTime: '06:00', outTime: '14:30', hours: 8.5 },
    { attDate: day, employeeId: e2.id, status: 'absent' },
  ]});
  console.log('E1=' + e1.code + ' E2=' + e2.code + ' DEPT=' + d.code);
  await db.\$disconnect();
})();
")
E1=$(echo "$SEED" | grep -o 'E1=[^ ]*' | cut -d= -f2)
E2=$(echo "$SEED" | grep -o 'E2=[^ ]*' | cut -d= -f2)
DEPT=$(echo "$SEED" | grep -o 'DEPT=[^ ]*' | cut -d= -f2)
[ -n "$E1" ] && ok "fixtures seeded ($E1 present, $E2 absent)" || bad "seed: $SEED"

echo "== M20: attendance register page =="
page=$(curl -s --max-time 30 -b "$JAR" "$BASE/hr/attendance")
[ -n "$page" ] && ok "GET /hr/attendance renders" || bad "page empty"
echo "$page" | grep -q "Attendance" && ok "title renders" || bad "title missing"
echo "$page" | grep -q "$E1" && ok "fixture row 1 ($E1)" || bad "row $E1 missing"
echo "$page" | grep -q "$E2" && ok "fixture row 2 ($E2)" || bad "row $E2 missing"
echo "$page" | grep -q "Absent" && ok "status totals band" || bad "totals missing"
echo "$page" | grep -q "list_attendance" && ok "read-tool chip present" || bad "chip missing"

echo "== M20: filters =="
fpage=$(curl -s --max-time 30 -b "$JAR" "$BASE/hr/attendance?status=absent")
echo "$fpage" | grep -q "$E2" && ok "status=absent shows E2" || bad "absent filter missed E2"
echo "$fpage" | grep -q "$E1" && bad "absent filter must NOT show E1" || ok "absent filter hides E1"
qpage=$(curl -s --max-time 30 -b "$JAR" "$BASE/hr/attendance?q=$DEPT")
echo "$qpage" | grep -q "$E1" && echo "$qpage" | grep -q "$E2" && ok "q=dept shows both" || bad "dept q filter"

echo "== M20: CSV =="
csv=$(curl -s --max-time 30 -b "$JAR" "$BASE/hr/attendance/csv")
echo "$csv" | grep -q "$E1" && ok "CSV carries rows" || bad "CSV missing rows"
echo "$csv" | head -1 | grep -qi "date\|code" && ok "CSV header" || bad "CSV header missing"

echo "== M20: menu + sidebar + chip tool registry =="
mpage=$(curl -s --max-time 30 -b "$JAR" "$BASE/hr")
echo "$mpage" | grep -q "/hr/attendance" && ok "HR group links the register" || bad "HR group link missing"
spage=$(curl -s --max-time 30 -b "$JAR" "$BASE/hr/attendance")
echo "$spage" | grep -q "HR &amp; Payroll" && ok "sidebar group renders" || bad "sidebar group missing"
TOOLCHECK=$(npx tsx -e "
(async () => {
  const { allTools } = await import('./src/lib/agent/tools');
  const post = allTools.find((t: any) => t.name === 'post_attendance');
  const list = allTools.find((t: any) => t.name === 'list_attendance');
  console.log(JSON.stringify({ post: !!post, list: !!list, write: post?.isWrite, domain: list?.domain }));
})();
")
echo "$TOOLCHECK" | grep -q '"post":true' && echo "$TOOLCHECK" | grep -q '"list":true' && ok "post_attendance (write) + list_attendance (read) in registry" || bad "tools missing: $TOOLCHECK"

echo "== M20: cleanup =="
CLEAN=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  await db.attendance.deleteMany({ where: { employee: { code: { startsWith: 'SM20-E' } } } });
  await db.employee.deleteMany({ where: { code: { startsWith: 'SM20-E' } } });
  await db.department.deleteMany({ where: { code: { startsWith: 'SM20-D' } } });
  console.log('cleaned');
  await db.\$disconnect();
})();
")
echo "$CLEAN" | grep -q "cleaned" && ok "fixtures cleaned" || bad "cleanup: $CLEAN"

echo
echo "== M20 RESULT: $pass pass / $fail fail =="
[ "$fail" = "0" ] || exit 1
