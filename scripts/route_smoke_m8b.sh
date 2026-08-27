#!/usr/bin/env bash
# M8 Wave B route smoke (SPEC-M8 §6): the 15 Wave-B doc-family print routes.
#   1. Unauthenticated /print/gate-pass/x → 307 /login (middleware layer 1)
#   2. Authenticated: all 15 Wave-B print docTypes 200 + title grep for REAL
#      docs (debit-note + budget are seeded when empty — cleaned up after)
#   3. Gate type mismatch → 404 (an IN entry is not a gate pass — §4 rule-2)
#   4. Unknown Wave-B docType → 404; unknown id → 404
#   5. The 15 doc view pages carry the print door (link to /print/…)
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M8 Wave B: unauthenticated guard =="
out=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" --max-time 60 "$BASE/print/gate-pass/x")
[[ "$out" == "307 $BASE/login"* ]] && ok "/print/gate-pass/x unauth -> 307 /login" || bad "unauth guard: '$out'"

echo "== M8 Wave B: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M8 Wave B: resolve one real doc per family (seed debit-note/budget when empty) =="
RES=$(node -e "
const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();
(async()=>{
  const TS=Date.now(); let dnSeed='', bgSeed='';
  let dn=await db.debitNote.findFirst({orderBy:{createdAt:'asc'}});
  if(!dn){ dn=await db.debitNote.create({data:{noteNo:'PBN-SMK-'+TS,noteType:'fabric',finYear:'FY26',amount:1000,reason:'smoke fixture'}}); dnSeed=dn.id; }
  let bg=await db.budget.findFirst({orderBy:{createdAt:'asc'}});
  if(!bg){ bg=await db.budget.create({data:{finYear:'FY26',amount:1000}}); bgSeed=bg.id; }
  const jr=await db.journal.findFirst({orderBy:{createdAt:'asc'}});
  const cs=await db.costSheet.findFirst({orderBy:{createdAt:'asc'}});
  const ex=await db.expense.findFirst({orderBy:{createdAt:'asc'}});
  const ct=await db.cutOrder.findFirst({orderBy:{createdAt:'asc'}});
  const ge=await db.gateEntry.findFirst({where:{gateType:'in'},orderBy:{createdAt:'asc'}});
  const gp=await db.gateEntry.findFirst({where:{gateType:'out'},orderBy:{createdAt:'asc'}});
  const sm=await db.sample.findFirst({orderBy:{createdAt:'asc'}});
  const dc=await db.pcsDespatch.findFirst({orderBy:{createdAt:'asc'}});
  const pk=await db.packingList.findFirst({orderBy:{createdAt:'asc'}});
  const rj=await db.rejectionEntry.findFirst({orderBy:{createdAt:'asc'}});
  const pe=await db.productionEntry.findFirst({where:{rework:false},orderBy:{createdAt:'asc'}});
  const li=await db.lineIssue.findFirst({orderBy:{createdAt:'asc'}});
  const lt=await db.labTest.findFirst({orderBy:{createdAt:'asc'}});
  const out={
    DN_NO:dn?dn.noteNo:'', DN_SEEDED:dnSeed,
    JR_NO:jr?jr.voucherNo:'',
    BG_ID:bg?bg.id:'', BG_SEEDED:bgSeed,
    CS_ID:cs?cs.id:'',
    EX_NO:ex?ex.expNo:'', EX_ID:ex?ex.id:'',
    CT_NO:ct?ct.cutNo:'',
    GE_NO:ge?ge.entryNo:'', GE_ID:ge?ge.id:'',
    GP_NO:gp?gp.entryNo:'', GP_ID:gp?gp.id:'',
    SM_NO:sm?sm.sampleNo:'', SM_ID:sm?sm.id:'',
    DC_NO:dc?dc.dcNo:'',
    PK_NO:pk?pk.packNo:'', PK_ID:pk?pk.id:'',
    RJ_NO:rj?rj.rejNo:'',
    PE_ID:pe?pe.id:'',
    LI_NO:li?li.issueNo:'',
    LT_NO:lt?lt.testNo:'', LT_ID:lt?lt.id:'',
  };
  for(const k of Object.keys(out)) console.log(k+'='+out[k]);
  await db.\$disconnect();
})()")

val() { echo "$RES" | sed -n "s/^$1=//p" | head -1; }
DN_NO=$(val DN_NO); DN_SEEDED=$(val DN_SEEDED)
JR_NO=$(val JR_NO)
BG_ID=$(val BG_ID); BG_SEEDED=$(val BG_SEEDED)
CS_ID=$(val CS_ID)
EX_NO=$(val EX_NO); EX_ID=$(val EX_ID)
CT_NO=$(val CT_NO)
GE_NO=$(val GE_NO); GE_ID=$(val GE_ID)
GP_NO=$(val GP_NO); GP_ID=$(val GP_ID)
SM_NO=$(val SM_NO); SM_ID=$(val SM_ID)
DC_NO=$(val DC_NO)
PK_NO=$(val PK_NO); PK_ID=$(val PK_ID)
RJ_NO=$(val RJ_NO)
PE_ID=$(val PE_ID)
LI_NO=$(val LI_NO)
LT_NO=$(val LT_NO); LT_ID=$(val LT_ID)

missing=""
for v in "$DN_NO" "$JR_NO" "$BG_ID" "$CS_ID" "$EX_NO" "$CT_NO" "$GE_NO" "$GP_NO" "$SM_NO" "$DC_NO" "$PK_NO" "$RJ_NO" "$PE_ID" "$LI_NO" "$LT_NO"; do
  [[ -z "$v" ]] && missing="$missing X"
done
[[ -z "$missing" ]] && ok "resolved a doc for all 15 families" || bad "resolution incomplete ($missing)"

echo "== M8 Wave B: the 15 families 200 + title grep =="
smoke_doc() { # <docType> <id> <title-fragment>
  local code html
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 -b "$JAR" "$BASE/print/$1/$2?autoprint=0")
  html=$(curl -s --max-time 60 -b "$JAR" "$BASE/print/$1/$2?autoprint=0")
  if [[ "$code" == "200" && "$html" == *"$3"* ]]; then
    ok "/print/$1 -> 200, sheet title '$3'"
  else
    bad "/print/$1 -> $code (want 200 + '$3')"
  fi
}
smoke_doc debit-note "$DN_NO" "DEBIT NOTE"
smoke_doc journal "$JR_NO" "VOUCHER"
smoke_doc budget "$BG_ID" "BUDGET"
smoke_doc cost-sheet "$CS_ID" "COST SHEET"
smoke_doc expense "$EX_NO" "EXPENSE VOUCHER"
smoke_doc cut-order "$CT_NO" "CUTTING ORDER"
smoke_doc gate-entry "$GE_NO" "GATE ENTRY"
smoke_doc gate-pass "$GP_NO" "GATE PASS"
smoke_doc sample "$SM_NO" "SAMPLE CARD"
smoke_doc pcs-despatch "$DC_NO" "DESPATCH CHALLAN"
smoke_doc packing-list "$PK_NO" "PACKING LIST"
smoke_doc rejection "$RJ_NO" "REJECTION NOTE"
smoke_doc production-entry "$PE_ID" "PRODUCTION ENTRY"
smoke_doc line-issue "$LI_NO" "LINE ISSUE SLIP"
smoke_doc lab-test "$LT_NO" "LAB TEST REPORT"

echo "== M8 Wave B: doc-no banner on a Wave-B sheet =="
html=$(curl -s --max-time 60 -b "$JAR" "$BASE/print/debit-note/$DN_NO?copy=duplicate&autoprint=0")
if [[ "$html" == *"Duplicate"* && "$html" == *"$DN_NO"* ]]; then
  ok "debit-note sheet: Duplicate banner + doc no $DN_NO"
else
  bad "debit-note sheet banner/doc-no missing"
fi

echo "== M8 Wave B: gate type mismatch + 404s =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 -b "$JAR" "$BASE/print/gate-pass/$GE_NO?autoprint=0")
[[ "$code" == "404" ]] && ok "IN entry via gate-pass docType -> 404 (type filter)" || bad "gate mismatch -> $code"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 -b "$JAR" "$BASE/print/nope-b/x?autoprint=0")
[[ "$code" == "404" ]] && ok "unknown Wave-B docType -> 404" || bad "unknown docType -> $code"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 -b "$JAR" "$BASE/print/lab-test/NOPE-404?autoprint=0")
[[ "$code" == "404" ]] && ok "unknown lab-test id -> 404" || bad "unknown id -> $code"

echo "== M8 Wave B: view pages carry the print door =="
check_door() { # <path>
  local html
  html=$(curl -s --max-time 60 -b "$JAR" "$BASE$1")
  if [[ "$html" == *"/print/"* ]]; then
    ok "$1 has the print door"
  else
    bad "$1 missing print door"
  fi
}
check_door "/accounts/debit-note/$DN_NO"
check_door "/accounts/journal/$JR_NO"
check_door "/costing/budget/$BG_ID"
check_door "/costing/cost-sheet/$CS_ID"
check_door "/costing/expenses/$EX_ID"
check_door "/cutting/job-order/$CT_NO"
check_door "/dispatch/gate-entry/$GE_ID"
check_door "/dispatch/gate-pass/$GP_ID"
check_door "/orders/samples/$SM_ID"
check_door "/pieces/despatch/$DC_NO"
check_door "/pieces/packing-list/$PK_ID"
check_door "/pieces/rejection/$RJ_NO"
check_door "/production/entry/$PE_ID"
check_door "/production/issue/$LI_NO"
check_door "/quality/lab-tests/$LT_ID"

echo "== M8 Wave B: cleanup seeded fixtures =="
if [[ -n "$DN_SEEDED" || -n "$BG_SEEDED" ]]; then
  node -e "
const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();
(async()=>{
  await db.debitNote.deleteMany({where:{id:'$DN_SEEDED'}}).catch(()=>{});
  await db.budget.deleteMany({where:{id:'$BG_SEEDED'}}).catch(()=>{});
  await db.\$disconnect();
})()" && ok "seeded fixtures removed"
else
  ok "nothing to clean (no fixtures seeded)"
fi

rm -f "$JAR"
echo
echo "== M8 Wave B smoke: $pass passed, $fail failed =="
[[ $fail -eq 0 ]] && echo "RESULT: ALL GREEN" || echo "RESULT: FAILURES PRESENT"
exit $fail
