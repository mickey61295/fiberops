#!/bin/bash
# M34 live browser check — server + terms option + invoice print, one session.
cd /home/z/my-project
nohup bun run dev > /tmp/dev.log 2>&1 &
for i in $(seq 1 40); do
  sleep 2
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login 2>/dev/null)
  if [ "$CODE" = "200" ]; then break; fi
done
echo "server: $CODE"

TS=$(date +%s)
FIX=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const party = await db.party.create({ data: { code: 'M34L-P-' + '$TS', name: 'M34 Live Party ' + '$TS', partyType: 'customer', state: 'Tamil Nadu' } });
  const inv = await db.salesInvoice.create({ data: { invoiceNo: 'M34L-INV-' + '$TS', partyId: party.id, invoiceDate: new Date(), finYear: '26-27', billAmount: 148500, status: 'issued' } });
  await db.appOption.create({ data: { key: 'print.terms.invoice', value: 'Goods once sold will not be taken back under any circumstances.\nInterest at 18% p.a. on overdue payments beyond 30 days.\nAll disputes subject to Tirupur jurisdiction only.', label: 'Invoice Terms & Conditions', group: 'print' } });
  console.log(inv.invoiceNo);
  await db.\$disconnect();
})();
" 2>/dev/null | tail -1)
INV=$(echo "$FIX" | grep -oE 'M34L-INV-[0-9]+')
echo "fixture: $INV"

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
# wait for the dashboard: URL must be a localhost page AND not /login
# (about:blank before load is NOT success — the M33 check got lucky)
for i in $(seq 1 30); do
  sleep 2
  URL=$(agent-browser get url 2>/dev/null | tail -1)
  if [[ "$URL" == *"localhost:3000"* && "$URL" != *"login"* ]]; then break; fi
  if [[ "$URL" == *"/login" && $i -eq 12 ]]; then
    # the click may have missed — retry once via Enter on the password box
    agent-browser click @$PASS_REF > /dev/null 2>&1
    agent-browser press Enter > /dev/null 2>&1
  fi
done
echo "url: $URL"

# the invoice print with the owned terms
agent-browser open "http://localhost:3000/print/invoice/$INV?autoprint=0" > /dev/null 2>&1
sleep 5
TERMS1=$(agent-browser eval "(() => document.body.innerText.includes('Goods once sold will not be taken back under any circumstances') ? 'term-1-rendered' : 'missing')()" 2>/dev/null | tr -d '"' | tail -1)
echo "term-1: $TERMS1"
TERMS2=$(agent-browser eval "(() => document.body.innerText.includes('Interest at 18% p.a. on overdue payments') ? 'term-2-rendered' : 'missing')()" 2>/dev/null | tr -d '"' | tail -1)
echo "term-2: $TERMS2"
TERMS3=$(agent-browser eval "(() => document.body.innerText.includes('All disputes subject to Tirupur jurisdiction only') ? 'term-3-rendered' : 'missing')()" 2>/dev/null | tr -d '"' | tail -1)
echo "term-3: $TERMS3"
FALLBACK=$(agent-browser eval "(() => document.body.innerText.includes('Subject to Tirupur jurisdiction.') && !document.body.innerText.includes('All disputes subject to Tirupur jurisdiction only') ? 'fallback-leaked' : 'no-fallback')()" 2>/dev/null | tr -d '"' | tail -1)
echo "fallback: $FALLBACK"
NOTES=$(agent-browser eval "(() => { const notes = [...document.querySelectorAll('.text-\\[9px\\].text-slate-500')].map(n => n.textContent?.trim()).filter(t => t && /^[0-9]+\\./.test(t)); return notes.length + ' numbered notes' })()" 2>/dev/null | tr -d '"' | tail -1)
echo "notes: $NOTES"

# console errors + screenshot
agent-browser errors 2>&1 | head -3
agent-browser screenshot --full download/m34-invoice-terms.png 2>&1 | tail -1
agent-browser close > /dev/null 2>&1

# cleanup
CLEAN=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  await db.salesInvoice.deleteMany({ where: { invoiceNo: { startsWith: 'M34L-INV-' } } });
  await db.party.deleteMany({ where: { code: { startsWith: 'M34L-P-' } } });
  await db.appOption.deleteMany({ where: { key: 'print.terms.invoice' } });
  console.log('cleaned');
  await db.\$disconnect();
})();
" 2>/dev/null | tail -1)
echo "cleanup: $CLEAN"
echo DONE
