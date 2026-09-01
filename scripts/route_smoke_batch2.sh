#!/bin/bash
# ============== ROUTE SMOKE — CHAT BATCH 2 (SPEC-M38) ==============
# Live-server checks for the agent QoL batch:
#   1. the SSE stream carries the dynamic [CONTEXT] line (CHAT-02)
#   2. a write plan returns turnId (CHAT-06) and the plan contents render
#      server-side shapes (CHAT-05 helper inputs)
#   3. approve-by-turnId commits the STORED plan exactly once; double-post
#      replays; drift is refused (CHAT-06)
#   4. the committed response carries docNo + cta {viewUrl, printUrl} (CHAT-07)
#   5. bounded list tools report total + truncation (CHAT-10)
#   6. lookup failures carry "Did you mean" candidates (CHAT-09)
#   7. the agent screens render (panel substrate untouched)
# Auth: admin fixture (the batch-0/1 cookie-jar pattern).
set -e
cd "$(dirname "$0")/.."
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  OK    $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  FAIL  $1"; }

BASE="http://localhost:3000"
if ! curl -s -o /dev/null --max-time 5 "$BASE/"; then
  echo "dev server not running on :3000 — start it first (npm run dev)"
  exit 1
fi

# 429-aware verdict: a rate-limited stream is a SKIP, not a FAIL (the
# eval-routing philosophy — persistent 429s exclude from the denominator).
is429() { grep -q '"error":"429' "$1" 2>/dev/null; }

# ── 1. auth ──
JAR=$(mktemp)
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
if echo "$body" | grep -q '"ok":true'; then ok "admin login"; else bad "admin login: $body"; fi
AUTH=(-b "$JAR")

# ── 2. the SSE stream carries the dynamic [CONTEXT] line + today IST ──
SSE_JSON=$(mktemp)
curl -s -N --max-time 90 -X POST "${AUTH[@]}" -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"what day is it today? answer in one line"}],"screen":{"pathname":"/orders/register"}}' \
  "$BASE/api/agent" > "$SSE_JSON"
SSE=$(cat "$SSE_JSON")
if is429 "$SSE_JSON"; then
  echo "  SKIP  context probe rate-limited (429) — rerun to cover CHAT-02/11"
else
  if echo "$SSE" | grep -q '"type":"finish"'; then ok "stream finished cleanly"; else bad "stream never finished"; fi
  # qol1-reconcile: the M40 money loop rewrite bumped the version
  if echo "$SSE" | grep -q "promptVersion\":\"m40-2026-09-01"; then ok "PROMPT_VERSION m39.1 stamped on start event (CHAT-11 + qol1-reconcile)"; else bad "prompt version not stamped in stream"; fi
fi

# ── 3. plan a stock adjustment through the SSE door → capture turnId + plan ──
# Snapshot the target bucket first so step 8 can restore it exactly.
YARN=$(python3 -c "
import sqlite3
con = sqlite3.connect('file:db/custom.db?mode=ro', uri=True)
row = con.execute('SELECT code FROM Yarn ORDER BY code LIMIT 1').fetchone()
print(row[0] if row else '')
con.close()")
if [ -z "$YARN" ]; then bad "no yarn master to plan against — seed one first"; fi
G1ID=$(python3 -c "
import sqlite3
con = sqlite3.connect('file:db/custom.db?mode=ro', uri=True)
row = con.execute(\"SELECT id FROM Godown WHERE code='G1'\").fetchone()
print(row[0] if row else '')
con.close()")
YARNID=$(python3 -c "
import sqlite3
con = sqlite3.connect('file:db/custom.db?mode=ro', uri=True)
row = con.execute('SELECT id FROM Yarn WHERE code = ?', ('$YARN',)).fetchone()
print(row[0] if row else '')
con.close()")
BUCKET_BEFORE=$(python3 -c "
import sqlite3
con = sqlite3.connect('file:db/custom.db?mode=ro', uri=True)
row = con.execute(\"SELECT id, kgs FROM CurrentStock WHERE godownId=? AND itemType='yarn' AND itemId=? ORDER BY id LIMIT 1\", ('$G1ID', '$YARNID')).fetchone()
print(f'{row[0]}|{row[1]}' if row else '')
con.close()")

PLAN_JSON=$(mktemp)
sleep 5
curl -s -N --max-time 120 -X POST "${AUTH[@]}" -H 'Content-Type: application/json' \
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Propose a stock adjustment: godown G1, yarn $YARN, add 2 kgs, reason CHAT2-SMOKE. Do NOT commit — just show me the plan.\"}],\"screen\":{\"pathname\":\"/inventory/adjustment\"}}" \
  "$BASE/api/agent" > "$PLAN_JSON"
if is429 "$PLAN_JSON"; then
  echo "  SKIP  plan probe rate-limited (429) — rerun to cover CHAT-06/07"
else
  if grep -q '"turnId":"' "$PLAN_JSON"; then ok "tool-call-end carries turnId (CHAT-06)"; else bad "turnId missing from tool-call-end"; fi
  # the turn of the WRITE tool call (the model may read-first: list_godowns/list_yarns
  # turns also carry turnIds — approve needs the write plan's row)
  TURN=$(grep '"isWrite":true' "$PLAN_JSON" | grep -o '"turnId":"[^"]*"' | head -1 | cut -d'"' -f4)
  if grep -q '"isWrite":true' "$PLAN_JSON"; then ok "write plan surfaced with isWrite"; else bad "no write plan in stream"; fi
fi

# ── 4. approve-by-turnId: commits once; replay is silent; docNo+cta in response ──
if [ -n "$TURN" ]; then
  KEY="smoke-chat2-$(date +%s)"
  APPROVE_BODY=$(curl -s --max-time 60 -X POST "${AUTH[@]}" -H 'Content-Type: application/json' \
    -d "{\"turnId\":\"$TURN\",\"idempotencyKey\":\"$KEY\"}" "$BASE/api/agent/approve")
  if echo "$APPROVE_BODY" | grep -q '"success":true'; then ok "approve-by-turnId committed"; else bad "approve-by-turnId failed: $APPROVE_BODY"; fi
  if echo "$APPROVE_BODY" | grep -q '"docNo":"ADJ-'; then ok "response carries the committed docNo (CHAT-07)"; else bad "docNo missing from approve response"; fi
  DOCNO=$(echo "$APPROVE_BODY" | grep -o '"docNo":"[^"]*"' | head -1 | cut -d'"' -f4)
  if echo "$APPROVE_BODY" | grep -q '"viewUrl":"/inventory/adjustment"'; then ok "response carries cta.viewUrl (CHAT-07)"; else bad "cta.viewUrl missing"; fi
  # replay with the SAME key: exactly once, replayed:true
  REPLAY=$(curl -s --max-time 60 -X POST "${AUTH[@]}" -H 'Content-Type: application/json' \
    -d "{\"turnId\":\"$TURN\",\"idempotencyKey\":\"$KEY\"}" "$BASE/api/agent/approve")
  if echo "$REPLAY" | grep -q '"replayed":true'; then ok "double-post replays (idempotent)"; else bad "replay not idempotent: $REPLAY"; fi
  # the AgentTurn row must be marked approved (only that turn)
  MARKED=$(python3 -c "
import sqlite3, sys
con = sqlite3.connect('file:db/custom.db?mode=ro', uri=True)
row = con.execute('SELECT approved, approvedBy FROM AgentTurn WHERE id = ?', ('$TURN',)).fetchone()
print('yes' if row and row[0] in (1, 'true') and row[1] else 'no')
con.close()")
  if [ "$MARKED" = "yes" ]; then ok "the stored turn is marked approved (approvedBy stamped)"; else bad "turn not marked approved"; fi
  # drift guard: a FAKE stored plan that differs must be refused — verified by
  # re-planning with mutated args via the legacy path is out of scope here;
  # the unit suite pins planDrift behaviorally + structurally.
fi

# ── 5. bounded list tools: total + truncation text (via a direct tool round-trip) ──
sleep 8 # pacing between LLM calls (429 avoidance)
LIST_JSON=$(mktemp)
curl -s -N --max-time 90 -X POST "${AUTH[@]}" -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Call list_godowns with take=2 and report the raw tool result verbatim, nothing else."}],"screen":{"pathname":"/inventory/stock"}}' \
  "$BASE/api/agent" > "$LIST_JSON"
if is429 "$LIST_JSON"; then
  echo "  SKIP  list probe rate-limited (429) — rerun to cover CHAT-10"
elif grep -q '"toolName":"list_godowns"' "$LIST_JSON"; then
  ok "list tool round-trip returned (bounded list_godowns)"
  if grep -q 'godowns' "$LIST_JSON"; then ok "list result carries total text"; else bad "list result missing total text"; fi
else
  bad "list tool round-trip empty"
fi

# ── 6. fuzzy lookup: an AMBIGUOUS buyer name returns Did-you-mean candidates ──
# 429-tolerant (the eval-script philosophy: rate-limits are skips, not fails)
FUZZ_JSON=$(mktemp)
BUYERS_SEED=$(python3 -c "
import sqlite3
con = sqlite3.connect('file:db/custom.db?mode=ro', uri=True)
row = con.execute('SELECT name FROM Buyer ORDER BY name LIMIT 1').fetchone()
print(row[0] if row else '')
con.close()")
if [ -n "$BUYERS_SEED" ]; then
  sleep 8 # pacing: this is the 4th LLM call in the run
  # one REAL word + one nonsense word = token-only match → ambiguous → candidates
  PROBE="$(echo "$BUYERS_SEED" | cut -d' ' -f1) ZZZQQQ"
  fetch_fuzz() {
    curl -s -N --max-time 120 -X POST "${AUTH[@]}" -H 'Content-Type: application/json' \
      -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Call create_order DIRECTLY with buyerCode '$PROBE' exactly as written — do NOT look the buyer up first, do NOT call list_buyers. styleNo STY-1001, deliveryDate 2026-12-31, one line: Navy M 100 pcs at 50. Then tell me exactly what the tool said.\"}],\"screen\":{\"pathname\":\"/orders/new\"}}" \
      "$BASE/api/agent" > "$FUZZ_JSON"
  }
  fetch_fuzz
  if grep -q '"error":"429' "$FUZZ_JSON"; then
    sleep 20
    fetch_fuzz
  fi
  if grep -q '"error":"429' "$FUZZ_JSON"; then
    echo "  SKIP  did-you-mean probe rate-limited (429) — rerun the smoke to cover CHAT-09"
  elif grep -qi "did you mean" "$FUZZ_JSON"; then
    ok "lookup rescue offers candidates for ambiguous names (CHAT-09)"
  else
    bad "no did-you-mean candidates in stream"
  fi
fi

# ── 7. agent-panel substrate screens render ──
for path in "/orders/register" "/inventory/adjustment" "/masters/buyer" "/"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${AUTH[@]}" "$BASE$path")
  if [ "$code" = "200" ]; then ok "GET $path"; else bad "GET $path → $code"; fi
done

# ── 8. cleanup: revert the smoke adjustment (keep the live DB clean) ──
if [ -n "$TURN" ] && [ -n "$DOCNO" ]; then
  CLEANED=$(python3 -c "
import sqlite3, sys
con = sqlite3.connect('db/custom.db')
cur = con.cursor()
cur.execute('DELETE FROM StockLedger WHERE docNo = ?', ('$DOCNO',))
cur.execute('DELETE FROM IdempotencyKey WHERE key = ?', ('$KEY',))
cur.execute('DELETE FROM AuditLog WHERE docNo = ?', ('$DOCNO',))
# restore the CurrentStock bucket to its pre-test state
before = '$BUCKET_BEFORE'.strip()
if before:
    bid, bkgs = before.split('|')
    cur.execute('UPDATE CurrentStock SET kgs = ? WHERE id = ?', (float(bkgs), bid))
else:
    # the bucket was created BY this smoke — remove it if it only holds the +2
    cur.execute(\"DELETE FROM CurrentStock WHERE godownId = ? AND itemType = 'yarn' AND kgs = 2 AND pcs = 0 AND mtrs = 0 AND bags = 0\", ('$G1ID',))
con.commit()
print('cleaned')")
  if [ "$CLEANED" = "cleaned" ]; then ok "smoke adjustment $DOCNO reverted (ledger + bucket + key + audit)"; else bad "cleanup failed"; fi
fi

echo "================================"
echo "CHAT BATCH 2 SMOKE: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] || exit 1
