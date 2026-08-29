#!/usr/bin/env bash
# M13 route smoke (SPEC-M9 §9): notifications digest — screen, flags gating,
# /api/cron/digest auth matrix (session OR cron secret; POST session-only).
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()  { pass=$((pass+1)); echo "  OK    $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M13: start dev server (one shell with the smoke) =="
(npm run dev > /tmp/m13_dev.log 2>&1 &)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] && ok "dev server up on :3000" || { bad "dev server never came up"; tail -5 /tmp/m13_dev.log; exit 1; }

echo "== M13: login =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
echo "$body" | grep -q '"ok":true' && ok "admin login" || bad "admin login: $body"

echo "== M13: seed fixtures (pending approval + low pcs + negative yarn + gate entry) + arm flags =="
SEED=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const ts = Date.now();
  const g = await db.godown.create({ data: { code: 'SM13-G-' + ts, name: 'Smoke GD ' + ts } });
  const s = await db.style.create({ data: { styleNo: 'SM13-S-' + ts } });
  const p = await db.party.create({ data: { code: 'SM13-P-' + ts, name: 'Smoke Party ' + ts } });
  await db.currentStock.createMany({ data: [
    { itemType: 'pcs', itemId: s.id, godownId: g.id, pcs: 120, rate: 10 },
    { itemType: 'yarn', itemId: 'SM13-NEG', godownId: g.id, kgs: -25 },
  ]});
  await db.approval.create({ data: { entity: 'po', entityId: 'SM13-PO-' + ts, step: 1, requestedBy: 'smoke' } });
  await db.gateEntry.create({ data: { entryNo: 'SM13-GE-' + ts, gateType: 'in', partyId: p.id, vehicleNo: 'TN33XY9999' } });
  console.log(JSON.stringify({ ts: String(ts), styleNo: s.styleNo, partyId: p.id }));
  await db.\$disconnect();
})()")
TS=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).ts)}catch{console.log('')}})")
STYLE=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).styleNo)}catch{console.log('')}})")
PARTYID=$(echo "$SEED" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).partyId)}catch{console.log('')}})")
[ -n "$TS" ] && ok "fixtures seeded" || { bad "fixture seed failed"; echo "$SEED" | head -3; }

setflag() { npx tsx -e "
(async () => {
  const { setFlag } = await import('./src/lib/erp/flags');
  await setFlag('$1', '$2');
})()" >/dev/null 2>&1; }

cleanup() {
  [ -n "$TS" ] && npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  await db.gateEntry.deleteMany({ where: { entryNo: 'SM13-GE-$TS' } }).catch(()=>{});
  await db.approval.deleteMany({ where: { entityId: 'SM13-PO-$TS' } }).catch(()=>{});
  const g = await db.godown.findUnique({ where: { code: 'SM13-G-$TS' } }).catch(()=>null);
  if (g) await db.currentStock.deleteMany({ where: { godownId: g.id } }).catch(()=>{});
  await db.style.deleteMany({ where: { styleNo: 'SM13-S-$TS' } }).catch(()=>{});
  await db.party.deleteMany({ where: { id: '$PARTYID' } }).catch(()=>{});
  if (g) await db.godown.deleteMany({ where: { id: g.id } }).catch(()=>{});
  await db.\$disconnect();
})()" >/dev/null 2>&1
  setflag notification.digest_enabled false
  setflag notification.webhook_url ''
  setflag notification.cron_secret ''
  setflag notification.low_stock_pcs 0
}
trap cleanup EXIT

echo "== M13-1: arm the low-stock threshold + verify the screen =="
setflag notification.low_stock_pcs 500
body=$(curl -s --max-time 30 -b "$JAR" "$BASE/notifications/digest")
echo "$body" | grep -q 'Daily Digest' && ok "digest screen title" || bad "digest title missing"
echo "$body" | grep -q 'data-digest-approvals-count' && ok "approvals section" || bad "approvals section missing"
echo "$body" | grep -q "$STYLE" && ok "low-stock pcs row (120 < 500)" || bad "low-stock pcs row missing"
echo "$body" | grep -q 'SM13-NEG' && ok "negative yarn row flagged" || bad "negative yarn row missing"
echo "$body" | grep -q 'SM13-GE' && ok "gate entry row" || bad "gate entry missing"
echo "$body" | grep -q 'SM13-PO' && ok "pending approval row" || bad "approval row missing"
echo "$body" | grep -q 'data-digest-send' && ok "Send now button" || bad "send button missing"
echo "$body" | grep -q 'Webhook not armed' && ok "channel status honest (not armed)" || bad "channel status wrong"

echo "== M13-2: /api/cron/digest auth matrix =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$BASE/api/cron/digest")
[ "$code" = "401" ] && ok "unauthenticated GET 401" || bad "unauth GET: $code"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$BASE/api/cron/digest?secret=wrong")
[ "$code" = "401" ] && ok "wrong secret 401" || bad "wrong secret: $code"
body=$(curl -s --max-time 30 -b "$JAR" "$BASE/api/cron/digest")
echo "$body" | grep -q '"approvals"' && echo "$body" | grep -q "SM13-PO-$TS" && ok "session GET returns digest" || bad "session GET: $body"

echo "== M13-3: cron secret opens the unauthenticated door =="
setflag notification.cron_secret "smoke-secret-$TS"
body=$(curl -s --max-time 30 "$BASE/api/cron/digest?secret=smoke-secret-$TS")
echo "$body" | grep -q "SM13-PO-$TS" && ok "secret-authenticated GET returns digest" || bad "secret GET failed"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$BASE/api/cron/digest?secret=smoke-secret-$TS-NOPE")
[ "$code" = "401" ] && ok "stale secret still 401" || bad "stale secret: $code"

echo "== M13-4: POST send is flag-gated =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$BASE/api/cron/digest" -X POST)
[ "$code" = "401" ] && ok "unauthenticated POST 401" || bad "unauth POST: $code"
body=$(curl -s --max-time 30 -b "$JAR" -X POST "$BASE/api/cron/digest")
echo "$body" | grep -q 'digest_enabled is off' && ok "disabled flag blocks send" || bad "flag gate failed: $body"
setflag notification.digest_enabled true
body=$(curl -s --max-time 30 -b "$JAR" -X POST "$BASE/api/cron/digest")
echo "$body" | grep -q 'webhook_url is empty' && ok "empty webhook blocks send" || bad "webhook gate failed: $body"

echo "== M13-5: flags admin carries the notification card =="
body=$(curl -s --max-time 30 -b "$JAR" "$BASE/admin/settings")
echo "$body" | grep -q 'Notifications' && echo "$body" | grep -q 'Digest' && ok "flags admin notification card" || bad "flags card missing"
echo "$body" | grep -q 'notification.digest_enabled' && ok "digest flag row visible" || bad "digest flag row missing"

echo "== M13-6: sidebar carries the digest (home group) =="
body=$(curl -s --max-time 30 -b "$JAR" "$BASE/")
echo "$body" | grep -q 'Daily Digest' && ok "sidebar: Daily Digest label" || bad "sidebar label missing"

echo
echo "== M13 smoke: $pass passed, $fail failed =="
[ "$fail" = "0" ] && exit 0 || exit 1
