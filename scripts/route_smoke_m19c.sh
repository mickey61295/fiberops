#!/usr/bin/env bash
# M19 Wave C route smoke (SPEC-M19 §3 / ADR-019): the 11 completion masters.
#   1. /masters hub lists the new cards (commercial/org/product/admin counts)
#   2. /masters/<slug> MasterTable renders ×11 (200 + title)
#   3. create via the form-door service (seed script) → row visible
#   4. agent list tools exist (unit-level; here: page CSV export)
#   5. /api/agent tool registry carries create_bank etc. (via prompt static — separate)
# Server + smoke in ONE shell (PITFALLS #34).
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M19C: start dev server (one shell with the smoke) =="
(npm run dev > /tmp/m19c_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m19c_dev.log; exit 1; }

echo "== M19C: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M19C: seed one master via the form-door service =="
SEED=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const ts = Date.now();
  const bank = await db.bank.create({ data: { code: 'SM19C-BK-' + ts, name: 'Smoke Bank ' + ts } });
  const acc = await db.bankAccount.create({ data: { accountNo: 'SM19C-ACC-' + ts, bankId: bank.id, branch: 'Tirupur', ifsc: 'HDFC0001234' } });
  console.log(JSON.stringify({ ts: String(ts), bank: bank.name, bankCode: bank.code, acc: acc.accountNo }));
  await db.\$disconnect();
})()")
TS=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).ts)}catch{console.log('')}})")
BANK=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).bank)}catch{console.log('')}})")
BANKCODE=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).bankCode)}catch{console.log('')}})")
ACC=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).acc)}catch{console.log('')}})")
[ -n "$TS" ] && ok "fixtures seeded (bank $BANKCODE / account $ACC)" || { bad "fixture seed failed"; echo "$SEED" | head -3; }

cleanup() {
  [ -n "$TS" ] && npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const acc = await db.bankAccount.findUnique({ where: { accountNo: 'SM19C-ACC-$TS' } }).catch(()=>null);
  if (acc) await db.bankAccount.delete({ where: { id: acc.id } }).catch(()=>{});
  await db.bank.deleteMany({ where: { code: 'SM19C-BK-$TS' } }).catch(()=>{});
  await db.\$disconnect();
})()" >/dev/null 2>&1
}
trap cleanup EXIT

fetch_page() { curl -s --max-time 30 -b "$JAR" "$BASE$1"; }

echo "== M19C-1: masters hub carries the new cards =="
body=$(fetch_page "/masters")
echo "$body" | grep -q 'Banks' && echo "$body" | grep -q 'Bank Accounts' && ok "hub: bank cards" || bad "hub bank cards missing"
echo "$body" | grep -q 'Mills' && echo "$body" | grep -q 'Machines' && ok "hub: mill + machine cards" || bad "hub mill/machine cards missing"
echo "$body" | grep -q 'Shades' && echo "$body" | grep -q 'Size Ranges' && echo "$body" | grep -q 'States' && ok "hub: shade/range/state cards" || bad "hub shade/range/state cards missing"

echo "== M19C-2: the 11 MasterTable pages render =="
for slug in bank bank-account mill machine-category machine state shade thread-type count-group range-group size-range; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR" "$BASE/masters/$slug")
  [ "$code" = "200" ] && ok "/masters/$slug 200" || bad "/masters/$slug: $code"
done

echo "== M19C-3: bank page lists the fixture; bank-account resolves the bank FK =="
body=$(fetch_page "/masters/bank")
echo "$body" | grep -q "$BANK" && ok "bank row present ($BANK)" || bad "bank row missing"
body=$(fetch_page "/masters/bank-account")
echo "$body" | grep -q "$ACC" && ok "account row present ($ACC)" || bad "account row missing"
echo "$body" | grep -q "$BANK" && ok "account row resolves bank FK ($BANK)" || bad "bank FK unresolved"

echo "== M19C-4: unknown master slug still 404s =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR" "$BASE/masters/nope-$TS")
[ "$code" = "404" ] && ok "unknown slug 404" || bad "unknown slug: $code"

echo "== M19C-5: master-table CSV export is client-side (M2) — verify the export button renders =="
body=$(fetch_page "/masters/bank")
echo "$body" | grep -q 'CSV' && ok "CSV export button present" || bad "CSV button missing"

echo
echo "== M19C smoke: $pass passed, $fail failed =="
[ "$fail" = "0" ] && exit 0 || exit 1
