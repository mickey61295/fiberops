#!/bin/bash
# M35 live browser check — server + holiday + digest page, one session
# (zombie-chrome lesson applied: kill everything first).
cd /home/z/my-project
agent-browser close > /dev/null 2>&1
pkill -f "agent-browser-linux" 2>/dev/null
pkill -f "chrome-152" 2>/dev/null
sleep 2

nohup bun run dev > /tmp/dev.log 2>&1 &
for i in $(seq 1 40); do
  sleep 2
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login 2>/dev/null)
  if [ "$CODE" = "200" ]; then break; fi
done
echo "server: $CODE"

TS=$(date +%s)
npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  await db.govtHoliday.create({ data: { date: new Date(new Date(Date.now() + 6 * 86400000).setHours(0, 0, 0, 0)), name: 'M35L Deepavali ' + '$TS' } });
  console.log('seeded');
  await db.\$disconnect();
})();
" > /dev/null 2>&1
echo "holiday seeded (6d out)"

agent-browser open http://localhost:3000/login > /dev/null 2>&1
sleep 6

SNAP=$(agent-browser snapshot -i 2>&1)
EMAIL_REF=$(echo "$SNAP" | grep 'textbox "Email"' | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)
PASS_REF=$(echo "$SNAP" | grep 'textbox "Password"' | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)
SIGN_REF=$(echo "$SNAP" | grep 'button "Sign in"' | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)

agent-browser fill @$EMAIL_REF "admin@fiberpro.local" > /dev/null 2>&1
agent-browser fill @$PASS_REF "admin123" > /dev/null 2>&1
agent-browser click @$SIGN_REF > /dev/null 2>&1
for i in $(seq 1 30); do
  sleep 2
  URL=$(agent-browser get url 2>/dev/null | tail -1)
  if [[ "$URL" == *"localhost:3000"* && "$URL" != *"login"* ]]; then break; fi
done
echo "url: $URL"

# the digest page with the shutdowns card
agent-browser open "http://localhost:3000/notifications/digest" > /dev/null 2>&1
sleep 5
CARD=$(agent-browser eval "(() => { const c = document.querySelector('[data-digest-shutdowns]'); return c ? 'present' : 'missing' })()" 2>/dev/null | tr -d '"' | tail -1)
echo "shutdowns-card: $CARD"
TITLE=$(agent-browser eval "(() => document.querySelector('[data-digest-shutdowns] h2')?.textContent?.trim())()" 2>/dev/null | tr -d '"' | tail -1)
echo "card-title: $TITLE"
HOLIDAY=$(agent-browser eval "(() => document.body.innerText.includes('M35L Deepavali') ? 'holiday-listed' : 'missing')()" 2>/dev/null | tr -d '"' | tail -1)
echo "holiday: $HOLIDAY"
DAYS=$(agent-browser eval "(() => { const b = [...document.querySelectorAll('[data-digest-shutdowns] span')].map(s => s.textContent).find(t => t && t.includes('d away')); return b || 'missing' })()" 2>/dev/null | tr -d '"' | tail -1)
echo "days-chip: $DAYS"
CAL=$(agent-browser eval "(() => document.querySelector('[data-digest-shutdowns] a[href=\"/masters/govt-holiday\"]') ? 'calendar-link' : 'missing')()" 2>/dev/null | tr -d '"' | tail -1)
echo "calendar-link: $CAL"
TEXTBLK=$(agent-browser eval "(() => { const t = document.querySelector('[data-digest-text]')?.textContent || ''; return t.includes('Upcoming shutdowns (14d)') ? 'text-block' : 'missing' })()" 2>/dev/null | tr -d '"' | tail -1)
echo "text-block: $TEXTBLK"

# console errors + full screenshot
agent-browser errors 2>&1 | head -3
agent-browser screenshot --full download/m35-digest-holidays.png 2>&1 | tail -1
agent-browser close > /dev/null 2>&1

# cleanup
CLEAN=$(npx tsx -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  await db.govtHoliday.deleteMany({ where: { name: { startsWith: 'M35L ' } } });
  console.log('cleaned');
  await db.\$disconnect();
})();
" 2>/dev/null | tail -1)
echo "cleanup: $CLEAN"
echo DONE
