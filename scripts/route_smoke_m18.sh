#!/usr/bin/env bash
# M18 route smoke (SPEC-M18 §6): print fidelity + command surfaces.
#   1. /print/order/<orderNo> → 200 + SALES ORDER + HSN column (the sheet that
#      previously did not exist)
#   2. ?template=large → the scaled sheet (text-[14px] base)
#   3. ?copies=3 → 3 break-after-page sheets (Original/Duplicate/Triplicate burst)
#   4. /print/invoice/<invNo> → 200; bank strip APPEARS when print.bank* AppOption
#      rows exist and DISAPPEARS when they are removed (degrade gracefully)
#   5. Order Hub carries the print door (/print/order/)
#   6. Topbar ships the ⌘J agent chord (the ⌘K palette rebind — client-side
#      behaviors are covered by tsc + unit pins; SSR carries the visible copy)
# Server + smoke run in ONE shell (PITFALLS #34: the platform reaps servers).
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M18: start dev server (one shell with the smoke) =="
(npm run dev > /tmp/m18_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m18_dev.log; exit 1; }

echo "== M18: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M18: resolve fixtures (first order / invoice in the dev DB) =="
DOCS=$(node -e "
const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();
(async()=>{
  const o=await db.order.findFirst({orderBy:{orderDate:'desc'}});
  const i=await db.salesInvoice.findFirst({orderBy:{invoiceDate:'desc'}});
  console.log((o?o.orderNo:'')+ ' ' + (i?i.invoiceNo:''));
  await db.\$disconnect();
})()")
ORDER_NO=$(echo "$DOCS" | cut -d' ' -f1)
INV_NO=$(echo "$DOCS" | cut -d' ' -f2)
[ -n "$ORDER_NO" ] && ok "fixture order $ORDER_NO" || bad "no order in dev DB"
[ -n "$INV_NO" ] && ok "fixture invoice $INV_NO" || bad "no invoice in dev DB"

echo "== M18-1: order print sheet =="
body=$(curl -s --max-time 60 -b "$JAR" "$BASE/print/order/$ORDER_NO")
echo "$body" | grep -q "SALES ORDER" && ok "order sheet title" || bad "order sheet missing SALES ORDER"
echo "$body" | grep -q "HSN" && ok "order sheet HSN column" || bad "order sheet missing HSN column"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 -b "$JAR" "$BASE/print/order/does-not-exist")
[ "$code" = "404" ] && ok "unknown order print -> 404" || bad "unknown order print: $code"

echo "== M18-2: ?template=large =="
body=$(curl -s --max-time 60 -b "$JAR" "$BASE/print/order/$ORDER_NO?template=large")
echo "$body" | grep -q 'text-\[14px\]' && ok "large template scale" || bad "large template not scaled"
body=$(curl -s --max-time 60 -b "$JAR" "$BASE/print/order/$ORDER_NO")
echo "$body" | grep -q 'text-\[11px\]' && ok "default template unchanged" || bad "default template changed"

echo "== M18-3: ?copies=3 burst =="
body=$(curl -s --max-time 60 -b "$JAR" "$BASE/print/order/$ORDER_NO?copies=3")
BURST_COUNT=$(echo "$body" | grep -o 'class="print:break-after-page"' | wc -l | tr -d ' ')
[ "$BURST_COUNT" = "2" ] && ok "burst: 2 page breaks (3 sheets)" || bad "burst page breaks: $BURST_COUNT"
echo "$body" | grep -q "Original" && echo "$body" | grep -q "Duplicate" && echo "$body" | grep -q "Triplicate" \
  && ok "burst carries all 3 copy banners" || bad "burst missing a copy banner"

echo "== M18-4: invoice bank strip (seed → present; remove → absent) =="
# NOTE: companyName too — getPrintHeader returns null without it (SPEC-M6 §5 gate);
# tsx -e needs an async IIFE (no top-level await in cjs eval mode).
npx tsx -e "
import {PrismaClient} from '@prisma/client';
const db = new PrismaClient();
(async () => {
  await db.appOption.upsert({where:{key:'print.companyName'},create:{key:'print.companyName',value:'M18 Print Co',group:'print',label:'Company'},update:{value:'M18 Print Co'}});
  await db.appOption.upsert({where:{key:'print.bankName'},create:{key:'print.bankName',value:'M18 Test Bank',group:'print',label:'Bank'},update:{value:'M18 Test Bank'}});
  await db.appOption.upsert({where:{key:'print.bankIfsc'},create:{key:'print.bankIfsc',value:'M18T0001234',group:'print',label:'IFSC'},update:{value:'M18T0001234'}});
  await db.\$disconnect();
})();" || bad "bank seed errored"
body=$(curl -s --max-time 60 -b "$JAR" "$BASE/print/invoice/$INV_NO")
echo "$body" | grep -q "Bank Details" && ok "bank strip present with print.bank* options" || bad "bank strip missing despite options"
npx tsx -e "
import {PrismaClient} from '@prisma/client';
const db = new PrismaClient();
(async () => {
  await db.appOption.deleteMany({where:{key:{in:['print.bankName','print.bankIfsc']}}});
  await db.\$disconnect();
})();" || bad "bank cleanup errored"
body=$(curl -s --max-time 60 -b "$JAR" "$BASE/print/invoice/$INV_NO")
echo "$body" | grep -q "Bank Details" && bad "bank strip should degrade away" || ok "bank strip degrades away without options"
# companyName stays? No — it was ours too; remove it (dev DB back to baseline)
npx tsx -e "
import {PrismaClient} from '@prisma/client';
const db = new PrismaClient();
(async () => {
  await db.appOption.deleteMany({where:{key:'print.companyName'}});
  await db.\$disconnect();
})();" || bad "companyName cleanup errored"

echo "== M18-5: Order Hub print door =="
body=$(curl -s --max-time 60 -b "$JAR" "$BASE/orders/$ORDER_NO")
echo "$body" | grep -q "/print/order/" && ok "Order Hub carries the print door" || bad "Order Hub print door missing"

echo "== M18-6: topbar ships the ⌘J agent chord =="
body=$(curl -s --max-time 60 -b "$JAR" "$BASE/orders")
echo "$body" | grep -q "⌘J" && ok "topbar chip reads ⌘J" || bad "topbar chip not rebound"

echo
echo "== M18 smoke: $pass passed, $fail failed =="
pkill -f "next dev" 2>/dev/null
[ "$fail" = "0" ]
