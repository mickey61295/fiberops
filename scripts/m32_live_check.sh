#!/bin/bash
# M32 live browser check — server + login + panel + speaker toggle, one session
cd /home/z/my-project
nohup bun run dev > /tmp/dev.log 2>&1 &
for i in $(seq 1 40); do
  sleep 2
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login 2>/dev/null)
  if [ "$CODE" = "200" ]; then break; fi
done
echo "server: $CODE"

agent-browser close > /dev/null 2>&1
agent-browser open http://localhost:3000/login > /dev/null 2>&1
sleep 6

# discover refs dynamically
SNAP=$(agent-browser snapshot -i 2>&1)
EMAIL_REF=$(echo "$SNAP" | grep 'textbox "Email"' | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)
PASS_REF=$(echo "$SNAP" | grep 'textbox "Password"' | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)
SIGN_REF=$(echo "$SNAP" | grep 'button "Sign in"' | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)
echo "refs: $EMAIL_REF $PASS_REF $SIGN_REF"

agent-browser fill @$EMAIL_REF "admin@fiberpro.local" > /dev/null 2>&1
agent-browser fill @$PASS_REF "admin123" > /dev/null 2>&1
agent-browser click @$SIGN_REF > /dev/null 2>&1

# wait for the dashboard (url leaves /login)
for i in $(seq 1 20); do
  sleep 2
  URL=$(agent-browser get url 2>/dev/null | tail -1)
  if [[ "$URL" != *"login"* ]]; then break; fi
done
echo "url: $URL"

# wait for hydration + find the Agent button
AGENT_BTN="not-found"
for i in $(seq 1 10); do
  AGENT_BTN=$(agent-browser eval "(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Agent')); if (b) { b.click(); return 'clicked' } return 'not-found' })()" 2>/dev/null | tr -d '"' | tail -1)
  if [ "$AGENT_BTN" = "clicked" ]; then break; fi
  sleep 3
done
echo "agent-btn: $AGENT_BTN"
sleep 3

# the panel state (Voice / EN / 🔇)
PANEL=$(agent-browser eval "(() => { const t = [...document.querySelectorAll('button')].map(b => b.textContent?.trim()).filter(t => t && (t.includes('Voice') || t.includes('🔇') || t.includes('🔊') || t === 'EN')); return JSON.stringify(t) })()" 2>/dev/null | tail -1)
echo "panel-before: $PANEL"

# toggle the speaker ON
TOGGLE=$(agent-browser eval "(() => { const b = [...document.querySelectorAll('button')].find(b => (b.textContent || '').trim() === '🔇' || b.dataset.testid === 'voice-speak-toggle'); if (b) { b.click(); return 'toggled' } return 'missing' })()" 2>/dev/null | tr -d '"' | tail -1)
echo "toggle: $TOGGLE"
sleep 1
PANEL2=$(agent-browser eval "(() => { const b = document.querySelector('[data-testid=\"voice-speak-toggle\"]'); return b ? b.textContent.trim() : 'missing' })()" 2>/dev/null | tr -d '"' | tail -1)
echo "toggle-now: $PANEL2"
STORED=$(agent-browser storage local fo.voiceSpeak 2>/dev/null | tail -1)
echo "localStorage: $STORED"

# toggle back OFF (leave the default state)
agent-browser eval "(() => { const b = document.querySelector('[data-testid=\"voice-speak-toggle\"]'); if (b) b.click(); return 'off' })()" > /dev/null 2>&1
sleep 1
STORED2=$(agent-browser storage local fo.voiceSpeak 2>/dev/null | tail -1)
echo "localStorage-after-off: $STORED2"

# console errors + screenshot
agent-browser errors 2>&1 | head -3
agent-browser screenshot download/m32-voice-confirm.png 2>&1 | tail -1
agent-browser close > /dev/null 2>&1
echo DONE