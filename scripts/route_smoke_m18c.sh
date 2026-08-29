#!/usr/bin/env bash
# M18 Wave C route smoke (SPEC-M18 §4): doc-view actions + rate memory +
# change password.
#   1. /api/erp?resource=last_rate → 401 unauth · 400 missing params · 200 with
#      a seeded fixture PO (rate + source + docNo) · empty {} for unknown pair
#   2. /api/auth/change-password → 401 unauth · 400 bad body · 200 happy on a
#      fixture user (hash rotates — old password then 401) · user restored
#   3. /procurement/po/<poNo> view → 200 + Duplicate + Cancel PO markers (the
#      doc-view action row, SPEC-M18 §4-C1/C2)
#   4. /accounts/invoice/<invNo> view → 200 + Void invoice marker
#   5. /orders/<orderId> Hub → 200 + Cancel order + Duplicate markers
#   6. topbar → 'Change my password' door in SSR (client dialog behind it)
# Server + smoke run in ONE shell (PITFALLS #34: the platform reaps servers).
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M18-C: start dev server (one shell with the smoke) =="
(npm run dev > /tmp/m18c_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m18c_dev.log; exit 1; }

echo "== M18-C: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M18-C: seed fixtures (party + yarn + PO line + view docs) =="
SEED=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const ts = Date.now();
  let uom = await db.uOM.findFirst();
  if (!uom) uom = await db.uOM.create({ data: { code: 'SMC-UOM', name: 'Kgs' } });
  const party = await db.party.create({ data: { code: 'SMCPY-' + ts, name: 'Smoke Party ' + ts, city: 'Tirupur', partyType: 'supplier' } });
  const yarn = await db.yarn.create({ data: { code: 'SMCYN-' + ts, count: '30S', uomId: uom.id } });
  const po = await db.purchaseOrder.create({ data: { poNo: 'SMCPO-' + ts, poType: 'yarn', partyId: party.id, finYear: 'FY26', status: 'open', lines: { create: { itemType: 'yarn', itemId: yarn.id, qty: 5, rate: 92.5, amount: 462.5 } } } });
  const user = await db.user.create({ data: { email: 'smokepw-' + ts + '@fiberpro.local', name: 'Smoke PW', role: 'merchandiser' } });
  console.log(JSON.stringify({ ts: String(ts), partyCode: party.code, yarnCode: yarn.code, poNo: po.poNo, poId: po.id, userId: user.id, email: user.email }));
  await db.\$disconnect();
})()")
TS=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).ts)}catch{console.log('')}})")
PARTY_CODE=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).partyCode)}catch{console.log('')}})")
YARN_CODE=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).yarnCode)}catch{console.log('')}})")
PO_NO=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).poNo)}catch{console.log('')}})")
PO_ID=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).poId)}catch{console.log('')}})")
CHPW_EMAIL=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).email)}catch{console.log('')}})")
[ -n "$PO_NO" ] && ok "fixtures seeded (PO $PO_NO)" || { bad "fixture seed failed"; echo "$SEED" | head -3; }

cleanup() {
  [ -n "$TS" ] && npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  // POLines FIRST — PO delete is FK-restricted while lines exist
  await db.pOLine.deleteMany({ where: { po: { poNo: 'SMCPO-$TS' } } }).catch(()=>{});
  await db.purchaseOrder.deleteMany({ where: { poNo: 'SMCPO-$TS' } }).catch(()=>{});
  await db.yarn.deleteMany({ where: { code: 'SMCYN-$TS' } }).catch(()=>{});
  await db.party.deleteMany({ where: { code: 'SMCPY-$TS' } }).catch(()=>{});
  await db.user.deleteMany({ where: { email: 'smokepw-$TS@fiberpro.local' } }).catch(()=>{});
  await db.\$disconnect();
})()" >/dev/null 2>&1
}
trap cleanup EXIT

echo "== M18-C-1: last_rate API =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE/api/erp?resource=last_rate&party=X&itemType=yarn&itemCode=Y")
[ "$code" = "401" ] && ok "last_rate unauth -> 401" || bad "last_rate unauth: $code"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -b "$JAR" "$BASE/api/erp?resource=last_rate&party=X")
[ "$code" = "400" ] && ok "last_rate missing params -> 400" || bad "last_rate missing params: $code"
body=$(curl -s --max-time 30 -b "$JAR" "$BASE/api/erp?resource=last_rate&party=$PARTY_CODE&itemType=yarn&itemCode=$YARN_CODE")
echo "$body" | grep -q '"rate":92.5' && ok "last_rate hit rate 92.5" || bad "last_rate hit: $body"
echo "$body" | grep -q "\"source\":\"PO\"" && ok "last_rate cites source PO" || bad "last_rate source missing: $body"
echo "$body" | grep -q "\"docNo\":\"$PO_NO\"" && ok "last_rate cites docNo" || bad "last_rate docNo missing: $body"
body=$(curl -s --max-time 30 -b "$JAR" "$BASE/api/erp?resource=last_rate&party=NOPE-$TS&itemType=yarn&itemCode=$YARN_CODE")
[ "$body" = "{}" ] && ok "last_rate unknown pair -> {}" || bad "last_rate unknown pair: $body"

echo "== M18-C-2: change-password API =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST -H 'Content-Type: application/json' -d '{"currentPassword":"a","newPassword":"b"}' "$BASE/api/auth/change-password")
[ "$code" = "401" ] && ok "change-password unauth -> 401" || bad "change-password unauth: $code"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -b "$JAR" -X POST -H 'Content-Type: application/json' -d '{"currentPassword":"a"}' "$BASE/api/auth/change-password")
[ "$code" = "400" ] && ok "change-password bad body -> 400" || bad "change-password bad body: $code"
# fixture user: set a known password, change it, then verify the old one fails
npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const { hashPassword } = require('./src/lib/auth/password');
  const db = new PrismaClient();
  await db.user.update({ where: { email: '$CHPW_EMAIL' }, data: { passwordHash: await hashPassword('smoke-old-123') } });
  await db.\$disconnect();
})()" >/dev/null 2>&1 || bad "could not set fixture password"
JAR2=$(mktemp)
body=$(curl -s --max-time 30 -c "$JAR2" -X POST -H 'Content-Type: application/json' -d "{\"email\":\"$CHPW_EMAIL\",\"password\":\"smoke-old-123\"}" "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "fixture user login (old pw)" || bad "fixture user login: $body"
body=$(curl -s --max-time 30 -b "$JAR2" -X POST -H 'Content-Type: application/json' -d '{"currentPassword":"smoke-old-123","newPassword":"smoke-new-456"}' "$BASE/api/auth/change-password")
echo "$body" | grep -q '"ok":true' && ok "change-password happy path" || bad "change-password happy: $body"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST -H 'Content-Type: application/json' -d '{"email":"'$CHPW_EMAIL'","password":"smoke-old-123"}' "$BASE/api/auth/login")
[ "$code" = "401" ] && ok "old password rejected after rotation" || bad "old password still works: $code"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST -H 'Content-Type: application/json' -d '{"email":"'$CHPW_EMAIL'","password":"smoke-new-456"}' "$BASE/api/auth/login")
[ "$code" = "200" ] && ok "new password logs in" || bad "new password rejected: $code"

echo "== M18-C-3: PO view action row =="
body=$(curl -s --max-time 60 -b "$JAR" "$BASE/procurement/po/$PO_NO")
echo "$body" | grep -q "Duplicate" && ok "PO view carries Duplicate" || bad "PO view missing Duplicate"
echo "$body" | grep -q "Cancel PO" && ok "PO view carries Cancel PO" || bad "PO view missing Cancel PO"

echo "== M18-C-4: invoice view action row =="
INV=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const i = await db.salesInvoice.findFirst({ where: { status: { not: 'cancelled' } } });
  console.log(i ? i.invoiceNo : '');
  await db.\$disconnect();
})()")
if [ -n "$INV" ]; then
  body=$(curl -s --max-time 60 -b "$JAR" "$BASE/accounts/invoice/$INV")
  echo "$body" | grep -q "Void invoice" && ok "invoice view carries Void invoice" || bad "invoice view missing Void invoice"
  echo "$body" | grep -q "Duplicate" && ok "invoice view carries Duplicate" || bad "invoice view missing Duplicate"
else
  echo "  SKIP  no non-cancelled invoice in dev DB"
fi

echo "== M18-C-5: Order Hub action row =="
ORD=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const o = await db.order.findFirst({ where: { status: 'open' } });
  console.log(o ? o.id : '');
  await db.\$disconnect();
})()")
if [ -n "$ORD" ]; then
  body=$(curl -s --max-time 60 -b "$JAR" "$BASE/orders/$ORD")
  echo "$body" | grep -q "Cancel order" && ok "Order Hub carries Cancel order" || bad "Order Hub missing Cancel order"
  echo "$body" | grep -q "Duplicate" && ok "Order Hub carries Duplicate" || bad "Order Hub missing Duplicate"
else
  echo "  SKIP  no open order in dev DB"
fi

echo "== M18-C-6: topbar change-password door =="
body=$(curl -s --max-time 60 -b "$JAR" "$BASE/")
echo "$body" | grep -q "Change my password" && ok "topbar carries the key icon door" || bad "topbar missing change-password door"

echo
echo "== M18-C smoke: $pass passed, $fail failed =="
[ "$fail" = "0" ] && exit 0 || exit 1
