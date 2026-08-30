#!/bin/bash
# M33 live browser check — server + login + cut order view + Print bundle labels
# → the label sheet with barcode SVGs; one session (sandbox kills bg processes).
cd /home/z/my-project
nohup bun run dev > /tmp/dev.log 2>&1 &
for i in $(seq 1 40); do
  sleep 2
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login 2>/dev/null)
  if [ "$CODE" = "200" ]; then break; fi
done
echo "server: $CODE"

# seed a cut order with bundles (a real LIVE one, cleaned at the end)
TS=$(date +%s)
FIX=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const buyer = await db.buyer.create({ data: { code: 'M33L-B-' + '$TS', name: 'M33 Live ' + '$TS' } });
  const style = await db.style.create({ data: { styleNo: 'M33L-ST-' + '$TS' } });
  const order = await db.order.create({ data: { orderNo: 'M33L-O-' + '$TS', buyerId: buyer.id, styleId: style.id, finYear: '26-27', totalPcs: 250 } });
  const cut = await db.cutOrder.create({ data: { cutNo: 'M33L-CUT-' + '$TS', orderId: order.id, fabricIssued: 180, totalPcs: 250, status: 'planned' } });
  for (let i = 1; i <= 3; i++) {
    await db.cutBundle.create({ data: { cutOrderId: cut.id, bundleNo: 'M33L-CUT-' + '$TS' + '/B' + i, barcode: '*M33LCUT' + '$TS' + 'B00' + i + '*', qty: 100, status: 'in_cutting' } });
  }
  console.log(cut.cutNo);
  await db.\$disconnect();
})();
" 2>/dev/null | tail -1)
CUT=$(echo "$FIX" | grep -oE 'M33L-CUT-[0-9]+')
echo "fixture: $CUT"

agent-browser close > /dev/null 2>&1
agent-browser open http://localhost:3000/login > /dev/null 2>&1
sleep 6

SNAP=$(agent-browser snapshot -i 2>&1)
EMAIL_REF=$(echo "$SNAP" | grep 'textbox "Email"' | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)
PASS_REF=$(echo "$SNAP" | grep 'textbox "Password"' | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)
SIGN_REF=$(echo "$SNAP" | grep 'button "Sign in"' | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)

agent-browser fill @$EMAIL_REF "admin@fiberpro.local" > /dev/null 2>&1
agent-browser fill @$PASS_REF "admin123" > /dev/null 2>&1
agent-browser click @$SIGN_REF > /dev/null 2>&1
for i in $(seq 1 20); do
  sleep 2
  URL=$(agent-browser get url 2>/dev/null | tail -1)
  if [[ "$URL" != *"login"* ]]; then break; fi
done
echo "url: $URL"

# the cut order view — the Print bundle labels door
agent-browser open "http://localhost:3000/cutting/job-order/$CUT" > /dev/null 2>&1
sleep 4
DOOR=$(agent-browser eval "(() => { const b = [...document.querySelectorAll('a')].find(a => (a.textContent || '').includes('Print bundle labels')); return b ? b.getAttribute('href') : 'missing' })()" 2>/dev/null | tr -d '"' | tail -1)
echo "labels-door: $DOOR"

# click it → the label sheet
CLICKED=$(agent-browser eval "(() => { const b = [...document.querySelectorAll('a')].find(a => (a.textContent || '').includes('Print bundle labels')); if (b) { b.click(); return 'clicked' } return 'missing' })()" 2>/dev/null | tr -d '"' | tail -1)
sleep 5
SHEET_URL=$(agent-browser get url 2>/dev/null | tail -1)
echo "sheet-url: $SHEET_URL"

# the label sheet contents
CARDS=$(agent-browser eval "(() => document.querySelectorAll('[data-testid=\"label-cards\"] > div').length)()" 2>/dev/null | tail -1)
echo "cards: $CARDS"
SVGS=$(agent-browser eval "(() => document.querySelectorAll('[data-testid=\"label-cards\"] svg').length)()" 2>/dev/null | tail -1)
echo "barcode-svgs: $SVGS"
HEADING=$(agent-browser eval "(() => document.querySelector('[data-testid=\"label-cards\"] .font-mono.font-bold')?.textContent)()" 2>/dev/null | tr -d '"' | tail -1)
echo "first-card-heading: $HEADING"
BARTEXT=$(agent-browser eval "(() => document.querySelector('[data-testid=\"label-cards\"] .tracking-wider')?.textContent)()" 2>/dev/null | tr -d '"' | tail -1)
echo "barcode-text: $BARTEXT"
BARS=$(agent-browser eval "(() => { const p = document.querySelector('[data-testid=\"label-cards\"] svg path'); return p ? (p.getAttribute('d').match(/M/g) || []).length + ' bars' : 'none' })()" 2>/dev/null | tr -d '"' | tail -1)
echo "first-barcode: $BARS"

# console errors + screenshot
agent-browser errors 2>&1 | head -3
agent-browser screenshot download/m33-bundle-labels.png 2>&1 | tail -1
agent-browser close > /dev/null 2>&1

# cleanup
CLEAN=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  await db.cutBundle.deleteMany({ where: { bundleNo: { startsWith: 'M33L-CUT-' } } });
  await db.cutOrder.deleteMany({ where: { cutNo: { startsWith: 'M33L-CUT-' } } });
  await db.order.deleteMany({ where: { orderNo: { startsWith: 'M33L-O-' } } });
  await db.style.deleteMany({ where: { styleNo: { startsWith: 'M33L-ST-' } } });
  await db.buyer.deleteMany({ where: { code: { startsWith: 'M33L-B-' } } });
  console.log('cleaned');
  await db.\$disconnect();
})();
" 2>/dev/null | tail -1)
echo "cleanup: $CLEAN"
echo DONE
