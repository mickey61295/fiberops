#!/usr/bin/env bash
# M19 Wave D route smoke (SPEC-M19 §4): closing-stock as-of + counter-book
# mode + Tally JSON export.
#   1. /inventory/closing-stock      → 200 + fixture row + as-of cutoff
#   2. ?mode=counter on /inventory/ledger → sections + day subtotals + toggle
#   3. /accounts/tally-export        → 200 + preview counts + download door
#   4. /api/tally                    → 401 unauth + 200 JSON w/ fixture voucher
# Server + smoke in ONE shell (PITFALLS #34).
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M19D: start dev server (one shell with the smoke) =="
(npm run dev > /tmp/m19d_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m19d_dev.log; exit 1; }

echo "== M19D: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M19D: seed fixtures (godown + yarn + ledger rows + invoice + payment + journal) =="
SEED=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const ts = Date.now();
  const g = await db.godown.create({ data: { code: 'SM19D-G-' + ts, name: 'Smoke GD ' + ts } });
  let uom = await db.uOM.findFirst({ where: { code: 'KGS' } });
  if (!uom) uom = await db.uOM.create({ data: { code: 'KGS', name: 'Kgs' } });
  const y = await db.yarn.create({ data: { code: 'SM19D-Y-' + ts, count: '30S', uomId: uom.id } });
  await db.stockLedger.createMany({ data: [
    { txnType: 'opening', itemType: 'yarn', itemId: y.id, godownId: g.id, docNo: 'SM19D-L1-' + ts, docDate: new Date('2026-12-01'), finYear: 'FY26', inKgs: 100, rate: 10 },
    { txnType: 'process_delivery', itemType: 'yarn', itemId: y.id, godownId: g.id, docNo: 'SM19D-L2-' + ts, docDate: new Date('2026-12-02'), finYear: 'FY26', outKgs: 30 },
    { txnType: 'purchase_grn', itemType: 'yarn', itemId: y.id, godownId: g.id, docNo: 'SM19D-L3-' + ts, docDate: new Date('2026-12-03'), finYear: 'FY26', inKgs: 50, rate: 12 },
    { txnType: 'purchase_grn', itemType: 'yarn', itemId: y.id, godownId: g.id, docNo: 'SM19D-L4-' + ts, docDate: new Date('2026-12-10'), finYear: 'FY26', inKgs: 999, rate: 99 },
  ]});
  const p = await db.party.create({ data: { code: 'SM19D-P-' + ts, name: 'Smoke Party ' + ts } });
  await db.salesInvoice.create({ data: { invoiceNo: 'SM19D-INV-' + ts, partyId: p.id, invoiceDate: new Date('2026-12-02'), finYear: 'FY26', taxableValue: 1000, cgstAmt: 25, sgstAmt: 25, billAmount: 1050, status: 'issued' } });
  await db.payment.create({ data: { voucherNo: 'SM19D-RCP-' + ts, partyId: p.id, direction: 'in', payDate: new Date('2026-12-03'), finYear: 'FY26', amount: 800, mode: 'bank' } });
  console.log(JSON.stringify({ ts: String(ts), yarn: y.code, godown: g.code, godownId: g.id, partyId: p.id }));
  await db.\$disconnect();
})()")
TS=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).ts)}catch{console.log('')}})")
YARN=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).yarn)}catch{console.log('')}})")
GODOWN=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).godown)}catch{console.log('')}})")
PARTYID=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).partyId)}catch{console.log('')}})")
[ -n "$TS" ] && ok "fixtures seeded (yarn $YARN)" || { bad "fixture seed failed"; echo "$SEED" | head -3; }

cleanup() {
  [ -n "$TS" ] && npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const g = await db.godown.findUnique({ where: { code: 'SM19D-G-$TS' } }).catch(()=>null);
  if (g) await db.stockLedger.deleteMany({ where: { godownId: g.id } }).catch(()=>{});
  await db.payment.deleteMany({ where: { voucherNo: 'SM19D-RCP-$TS' } }).catch(()=>{});
  await db.salesInvoice.deleteMany({ where: { invoiceNo: 'SM19D-INV-$TS' } }).catch(()=>{});
  await db.party.deleteMany({ where: { id: '$PARTYID' } }).catch(()=>{});
  await db.yarn.deleteMany({ where: { code: 'SM19D-Y-$TS' } }).catch(()=>{});
  if (g) await db.godown.deleteMany({ where: { id: g.id } }).catch(()=>{});
  await db.\$disconnect();
})()" >/dev/null 2>&1
}
trap cleanup EXIT

fetch_page() { curl -s --max-time 30 -b "$JAR" "$BASE$1"; }

echo "== M19D-1: closing-stock register (as-of 2026-12-05 → 120 kgs @12) =="
body=$(fetch_page "/inventory/closing-stock?to=2026-12-05&godown=$GODOWN")
echo "$body" | grep -q 'Closing Stock' && ok "closing-stock title" || bad "closing title missing"
echo "$body" | grep -q "$YARN" && ok "fixture row present" || bad "fixture row missing"
echo "$body" | grep -q '120' && ok "cumulative 120 kgs rendered" || bad "120 kgs missing"
echo "$body" | grep -q '1,440' && ok "valuation 120×12=1,440 rendered" || bad "valuation missing"

echo "== M19D-2: counter-book mode on /inventory/ledger =="
body=$(fetch_page "/inventory/ledger?godown=$GODOWN&mode=counter")
echo "$body" | grep -q 'data-counter-toggle' && ok "counter-book toggle rendered" || bad "toggle missing"
echo "$body" | grep -q 'data-counter-section' && ok "date sections rendered" || bad "sections missing"
echo "$body" | grep -q 'data-counter-subtotal' && ok "day subtotal rows rendered" || bad "subtotals missing"
echo "$body" | grep -q 'Day total' && ok "Day total label" || bad "Day total label missing"
# flat mode default: no sections
body=$(fetch_page "/inventory/ledger?godown=$GODOWN")
echo "$body" | grep -q 'data-counter-section' && bad "sections leaked into flat mode" || ok "flat mode stays default"

echo "== M19D-3: tally export screen =="
body=$(fetch_page "/accounts/tally-export?from=2026-12-01&to=2026-12-31")
echo "$body" | grep -q 'Tally Export' && ok "tally screen title" || bad "tally title missing"
echo "$body" | grep -q 'data-tally-download' && ok "download door present" || bad "download door missing"
echo "$body" | grep -q 'Sales vouchers' && ok "preview counts render" || bad "preview counts missing"
echo "$body" | grep -q 'SM19D-INV' && ok "fixture voucher previewed" || bad "fixture voucher missing"

echo "== M19D-4: /api/tally guard + payload =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$BASE/api/tally?from=2026-12-01&to=2026-12-31")
[ "$code" = "401" ] && ok "unauthenticated 401" || bad "unauth: $code"
body=$(curl -s --max-time 30 -b "$JAR" "$BASE/api/tally?from=2026-12-01&to=2026-12-31")
echo "$body" | grep -q '"voucherType": "Sales"' && ok "Sales voucher in payload" || bad "Sales voucher missing"
echo "$body" | grep -q "SM19D-INV-$TS" && ok "fixture invoice in payload" || bad "fixture invoice missing"
echo "$body" | grep -q '"voucherType": "Receipt"' && ok "Receipt voucher in payload" || bad "Receipt voucher missing"
echo "$body" | grep -q 'Output GST' && ok "GST ledger entry in payload" || bad "GST entry missing"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR" "$BASE/api/tally?from=bad")
[ "$code" = "400" ] && ok "invalid date 400" || bad "invalid date: $code"

echo "== M19D-5: sidebar carries the new items (group-local) =="
body=$(fetch_page "/inventory")
echo "$body" | grep -q 'Closing Stock (as-of)' && ok "sidebar: closing stock label" || bad "sidebar closing label missing"
body=$(fetch_page "/accounts")
echo "$body" | grep -q 'Tally Export' && ok "sidebar: tally label (accounts group)" || bad "sidebar tally label missing"

echo
echo "== M19D smoke: $pass passed, $fail failed =="
[ "$fail" = "0" ] && exit 0 || exit 1
