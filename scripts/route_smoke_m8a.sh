#!/usr/bin/env bash
# M8 Wave A route smoke (SPEC-M8 §6): the doc-family print route.
#   1. Unauthenticated /print/invoice/x → 307 /login (middleware layer 1)
#   2. Authenticated: all 5 print docTypes 200 with the sheet (title grep)
#      for REAL seeded docs, resolved by doc NO
#   3. Copy param: ?copy=duplicate → Duplicate banner
#   4. Preview mode: ?autoprint=0 → 200 (no auto-print)
#   5. Unknown docType → 404; unknown id → 404
#   6. Doc view pages carry the print door (link to /print/…)
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M8 Wave A: unauthenticated guard =="
out=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" --max-time 60 "$BASE/print/invoice/x")
[[ "$out" == "307 $BASE/login"* ]] && ok "/print/invoice/x unauth -> 307 /login" || bad "unauth guard: '$out'"

echo "== M8 Wave A: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

# resolve one real doc per family (doc NO, not db id — the fetcher contract)
INV_NO=$(node -e "const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();(async()=>{const r=await db.salesInvoice.findFirst({orderBy:{createdAt:'asc'}});console.log(r?r.invoiceNo:'');await db.\$disconnect()})()")
PO_NO=$(node -e "const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();(async()=>{const r=await db.purchaseOrder.findFirst({orderBy:{createdAt:'asc'}});console.log(r?r.poNo:'');await db.\$disconnect()})()")
GRN_NO=$(node -e "const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();(async()=>{const r=await db.gRN.findFirst({orderBy:{createdAt:'asc'}});console.log(r?r.grnNo:'');await db.\$disconnect()})()")
PAY_NO=$(node -e "const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();(async()=>{const r=await db.payment.findFirst({orderBy:{createdAt:'asc'}});console.log(r?r.voucherNo:'');await db.\$disconnect()})()")
DC_NO=$(node -e "const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();(async()=>{const r=await db.jobworkOrder.findFirst({orderBy:{createdAt:'asc'}});console.log(r?r.dcNo:'');await db.\$disconnect()})()")

echo "== M8 Wave A: the 5 families 200 + title grep (by doc no) =="
smoke_doc() { # <docType> <docNo> <title-fragment>
  local code html
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 -b "$JAR" "$BASE/print/$1/$2?autoprint=0")
  html=$(curl -s --max-time 60 -b "$JAR" "$BASE/print/$1/$2?autoprint=0")
  if [[ "$code" == "200" && "$html" == *"$3"* ]]; then
    ok "/print/$1/$2 -> 200, sheet title '$3'"
  else
    bad "/print/$1/$2 -> $code (want 200 + '$3')"
  fi
}
smoke_doc invoice "$INV_NO" "TAX INVOICE"
smoke_doc po "$PO_NO" "PURCHASE ORDER"
smoke_doc grn "$GRN_NO" "GOODS RECEIPT NOTE"
smoke_doc payment "$PAY_NO" "VOUCHER"
smoke_doc dc "$DC_NO" "DELIVERY CHALLAN"

echo "== M8 Wave A: copy param + doc-no banner =="
html=$(curl -s --max-time 60 -b "$JAR" "$BASE/print/invoice/$INV_NO?copy=duplicate&autoprint=0")
if [[ "$html" == *"Duplicate"* ]]; then
  ok "?copy=duplicate renders the Duplicate banner"
else
  bad "?copy=duplicate banner missing"
fi
if [[ "$html" == *"$INV_NO"* ]]; then
  ok "sheet shows the doc no $INV_NO"
else
  bad "sheet doc no missing"
fi

echo "== M8 Wave A: 404s =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 -b "$JAR" "$BASE/print/nope/x?autoprint=0")
[[ "$code" == "404" ]] && ok "unknown docType -> 404" || bad "unknown docType -> $code"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 -b "$JAR" "$BASE/print/invoice/NOPE-404?autoprint=0")
[[ "$code" == "404" ]] && ok "unknown id -> 404" || bad "unknown id -> $code"

echo "== M8 Wave A: view pages carry the print door =="
for path in "/accounts/invoice/$INV_NO" "/procurement/po/$PO_NO" "/procurement/grn/$GRN_NO" "/accounts/payments/$PAY_NO" "/jobwork/order/$DC_NO"; do
  html=$(curl -s --max-time 60 -b "$JAR" "$BASE$path")
  if [[ "$html" == *"/print/"* ]]; then
    ok "$path has the print door"
  else
    bad "$path missing print door"
  fi
done

rm -f "$JAR"
echo
echo "== M8 Wave A smoke: $pass passed, $fail failed =="
[[ $fail -eq 0 ]] && echo "RESULT: ALL GREEN" || echo "RESULT: FAILURES PRESENT"
exit $fail
