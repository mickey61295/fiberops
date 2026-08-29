#!/usr/bin/env bash
# M15 route smoke (SPEC-M9 §9): the engine-level audit trail — every commit
# door leaves a row; the /admin/audit viewer renders + filters; non-admins
# get the notice card.
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M15: start dev server (one shell with the smoke) =="
(npm run dev > /tmp/m15_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m15_dev.log; exit 1; }

echo "== M15: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M15: commit something through the AGENT DOOR (approve a master create) =="
SEED=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const ts = Date.now();
  const before = await db.auditLog.count();
  console.log(JSON.stringify({ ts: String(ts), before }));
  await db.\$disconnect();
})()")
TS=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).ts)}catch{console.log('')}})")
BEFORE=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).before)}catch{console.log('')}})")
[ -n "$TS" ] && ok "baseline audit count = $BEFORE" || { bad "baseline probe failed"; echo "$SEED" | head -3; }

# agent door: create_party via the approve endpoint (auto-approves its own pending)
body=$(curl -s --max-time 60 -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"toolName":"create_party","args":{"name":"Smoke Audit Party '$TS'","partyType":"both","code":"SM15-P-'$TS'"}}' "$BASE/api/agent/approve")
echo "$body" | grep -q '"success":true' && ok "agent-door commit succeeded" || bad "agent commit: $(echo $body | head -c 200)"

# verify the audit row landed with source=agent + the docNo extracted
AFTER=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const c = await db.auditLog.count();
  const row = await db.auditLog.findFirst({ where: { docNo: 'SM15-P-$TS' } });
  console.log(JSON.stringify({ c, row: row ? { source: row.actorSource, actor: row.actorName, action: row.action, entity: row.entity } : null }));
  await db.party.deleteMany({ where: { code: 'SM15-P-$TS' } }).catch(()=>{});
  await db.auditLog.deleteMany({ where: { docNo: 'SM15-P-$TS' } }).catch(()=>{});
  await db.\$disconnect();
})()")
COUNT=$(echo "$AFTER" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).c)}catch{console.log('')}})")
ROW=$(echo "$AFTER" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.stringify(JSON.parse(s).row))}catch{console.log('null')}})")
echo "$ROW" | grep -q '"source":"agent"' && ok "audit row: source=agent actor=$ROW" || bad "audit row wrong: $ROW"
[ "$COUNT" -gt "$BEFORE" ] && ok "audit count grew ($BEFORE → $COUNT)" || bad "audit count did not grow"

echo "== M15: the admin viewer =="
body=$(curl -s --max-time 30 -b "$JAR" "$BASE/admin/audit")
echo "$body" | grep -q 'Audit Log' && ok "viewer title" || bad "viewer title missing"
echo "$body" | grep -q 'Actor' && echo "$body" | grep -q 'Doc No' && ok "viewer columns" || bad "viewer columns missing"
body=$(curl -s --max-time 30 -b "$JAR" "$BASE/admin/audit?variant=agent")
echo "$body" | grep -q 'Audit Log' && ok "source filter renders" || bad "source filter broke"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR" "$BASE/admin/audit/csv")
[ "$code" = "200" ] && ok "audit CSV 200" || bad "audit CSV: $code"

echo "== M15: non-admin gets the notice card (role door) =="
NONADMIN=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const ts = $TS;
  let u = await db.user.findUnique({ where: { email: 'sm15-merch@test.local' } });
  if (!u) u = await db.user.create({ data: { email: 'sm15-merch@test.local', name: 'Smoke Merch ' + ts, role: 'merchandiser', passwordHash: '' } });
  console.log(u.id);
  await db.\$disconnect();
})()")
JAR2=$(mktemp)
body=$(curl -s --max-time 30 -c "$JAR2" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"sm15-merch@test.local","password":"admin123"}' "$BASE/api/auth/login")
if echo "$body" | grep -q '"ok":true'; then
  body=$(curl -s --max-time 30 -b "$JAR2" "$BASE/admin/audit")
  echo "$body" | grep -q 'Admin role required' && ok "non-admin gets the notice card" || bad "non-admin saw rows"
else
  # merchandiser has no password — the admin set-password door sets one
  body=$(curl -s --max-time 30 -b "$JAR" -X POST -H 'Content-Type: application/json' \
    -d '{"userId":"'$NONADMIN'","password":"smoke123"}' "$BASE/api/auth/admin/set-password")
  body=$(curl -s --max-time 30 -c "$JAR2" -X POST -H 'Content-Type: application/json' \
    -d '{"email":"sm15-merch@test.local","password":"smoke123"}' "$BASE/api/auth/login")
  echo "$body" | grep -q '"ok":true' && ok "non-admin login" || bad "non-admin login failed"
  body=$(curl -s --max-time 30 -b "$JAR2" "$BASE/admin/audit")
  echo "$body" | grep -q 'Admin role required' && ok "non-admin gets the notice card" || bad "non-admin saw rows"
fi
# cleanup the non-admin fixture
npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  await db.user.deleteMany({ where: { email: 'sm15-merch@test.local' } }).catch(()=>{});
  await db.\$disconnect();
})()" >/dev/null 2>&1

echo "== M15: sidebar carries the audit door (masters-admin group) =="
body=$(curl -s --max-time 30 -b "$JAR" "$BASE/admin/users")
echo "$body" | grep -q 'Audit Log' && ok "sidebar: Audit Log label" || bad "sidebar label missing"

echo
echo "== M15 smoke: $pass passed, $fail failed =="
[ "$fail" = "0" ] && exit 0 || exit 1
