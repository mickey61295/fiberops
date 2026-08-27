#!/usr/bin/env bash
# M7 Wave B route smoke (SPEC-M7 §4): API guarding + agent user context —
#   1. Unauthenticated API matrix → 401 JSON {"error":"Authentication required"}
#      on /api/erp (GET), /api/agent (POST), /api/agent/approve (POST),
#      /api/upload (GET + POST multipart), /api/seed (POST).
#   2. /api/auth/* stays OPEN (session route: 200 {"user":null} without cookie).
#   3. Login (seeded admin) → cookie jar → guarded APIs return 200.
#   4. Authed upload POST (multipart) round-trips.
#   5. Approval actor e2e: accept_grn GRN-001 through the HUMAN approve door →
#      Approval.approvedBy = admin@fiberpro.local (requestedBy stays 'agent').
#   6. Approve-door input guards: read-only tool → 400, unknown tool → 400.
#   7. Page-guard regression: unauth page still 307 → /login?next=.
BASE="http://localhost:3000"
JAR=$(mktemp)
pass=0; fail=0

ok()   { pass=$((pass+1)); echo "  OK    $1"; }
bad()  { fail=$((fail+1)); echo "  FAIL  $1"; }

echo "== M7 Wave B: seed admin (idempotent) =="
npx tsx scripts/seed_admin.ts >/dev/null 2>&1 || bad "seed_admin.ts errored"

echo "== M7 Wave B: unauthenticated API guard matrix (401 JSON) =="
guard401() { # <label> <curl-args...>
  local label="$1"; shift
  local out code body
  out=$(curl -s -w "\n%{http_code}" --max-time 30 "$@")
  code="${out##*$'\n'}"
  body="${out%$'\n'*}"
  if [ "$code" = "401" ] && echo "$body" | grep -q '"error":"Authentication required"'; then
    ok "$label -> 401 JSON"
  else
    bad "$label -> $code '$body' (expected 401 JSON)"
  fi
}
guard401 "GET  /api/erp?resource=orders"        "$BASE/api/erp?resource=orders"
guard401 "GET  /api/erp?resource=approvals"     "$BASE/api/erp?resource=approvals"
guard401 "GET  /api/erp?resource=master_search" "$BASE/api/erp?resource=master_search&slug=party&q="
guard401 "GET  /api/upload"                     "$BASE/api/upload"
guard401 "POST /api/agent"                      -X POST -H 'Content-Type: application/json' -d '{"messages":[]}' "$BASE/api/agent"
guard401 "POST /api/agent/approve"              -X POST -H 'Content-Type: application/json' -d '{"toolName":"create_party","args":{}}' "$BASE/api/agent/approve"
guard401 "POST /api/seed"                       -X POST "$BASE/api/seed"
# multipart POST 401 (the paperclip door)
echo "smoke-upload-probe" > /tmp/m7b-probe.txt
guard401 "POST /api/upload (multipart)"         -X POST -F "file=@/tmp/m7b-probe.txt" "$BASE/api/upload"

echo "== M7 Wave B: auth APIs stay open (session: user null) =="
out=$(curl -s -w "\n%{http_code}" --max-time 30 "$BASE/api/auth/session")
code="${out##*$'\n'}"; body="${out%$'\n'*}"
if [ "$code" = "200" ] && echo "$body" | grep -q '"user":null'; then
  ok "GET /api/auth/session (no cookie) -> 200 user:null"
else
  bad "GET /api/auth/session -> $code '$body' (expected 200 user:null)"
fi

echo "== M7 Wave B: login → cookie jar =="
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
if echo "$body" | grep -q '"ok":true'; then ok "login ok:true"; else bad "login body: $body"; fi
if grep -q "fo_session" "$JAR"; then ok "cookie jar has fo_session"; else bad "cookie jar missing fo_session"; fi

echo "== M7 Wave B: authenticated guarded APIs (200) =="
authed() { # <path>
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -b "$JAR" "$BASE$1")
  if [ "$code" = "200" ]; then ok "$1 -> 200"; else bad "$1 -> $code (expected 200)"; fi
}
authed "/api/erp?resource=orders"
authed "/api/erp?resource=approvals"
authed "/api/erp?resource=agent_turns"
authed "/api/erp?resource=dashboard"
authed "/api/erp?resource=master_search&slug=party&q="
authed "/api/upload"

echo "== M7 Wave B: authed multipart upload round-trip =="
out=$(curl -s -w "\n%{http_code}" --max-time 30 -b "$JAR" -X POST -F "file=@/tmp/m7b-probe.txt" "$BASE/api/upload")
code="${out##*$'\n'}"; body="${out%$'\n'*}"
if [ "$code" = "200" ] && echo "$body" | grep -q '"ok":true'; then
  ok "POST /api/upload (authed) -> 200 ok:true"
else
  bad "POST /api/upload (authed) -> $code '$body'"
fi

echo "== M7 Wave B: approval actor e2e (accept_grn through the human door) =="
npx tsx scripts/m7b_smoke_fixture.ts setup | grep -q "KEY=setup-ok" && ok "fixture setup (stale rows cleared)" || bad "fixture setup failed"
out=$(curl -s -w "\n%{http_code}" --max-time 60 -b "$JAR" -X POST -H 'Content-Type: application/json' -d '{"toolName":"accept_grn","args":{"grnNo":"GRN-001","comments":"m7b smoke"}}' "$BASE/api/agent/approve")
code="${out##*$'\n'}"; body="${out%$'\n'*}"
if [ "$code" = "200" ] && echo "$body" | grep -q '"success":true'; then
  ok "approve accept_grn GRN-001 -> success:true"
else
  bad "approve accept_grn -> $code '$body'"
fi
verify=$(npx tsx scripts/m7b_smoke_fixture.ts verify 2>/dev/null)
if echo "$verify" | grep -q "KEY=verify-ok"; then
  ok "actor stamped: approvedBy=admin@fiberpro.local requestedBy=agent"
else
  bad "actor verify: $verify"
fi

echo "== M7 Wave B: approve-door input guards (400) =="
out=$(curl -s -w "\n%{http_code}" --max-time 30 -b "$JAR" -X POST -H 'Content-Type: application/json' -d '{"toolName":"list_orders","args":{}}' "$BASE/api/agent/approve")
code="${out##*$'\n'}"
if [ "$code" = "400" ]; then ok "read-only tool -> 400"; else bad "read-only tool -> $code (expected 400)"; fi
out=$(curl -s -w "\n%{http_code}" --max-time 30 -b "$JAR" -X POST -H 'Content-Type: application/json' -d '{"toolName":"no_such_tool","args":{}}' "$BASE/api/agent/approve")
code="${out##*$'\n'}"
if [ "$code" = "400" ]; then ok "unknown tool -> 400"; else bad "unknown tool -> $code (expected 400)"; fi

echo "== M7 Wave B: page-guard regression (307 → /login?next=) =="
out=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" --max-time 60 "$BASE/programs/new")
if [[ "$out" == 307\ *login*next* ]]; then ok "/programs/new (unauth) -> 307 login?next"; else bad "/programs/new -> '$out'"; fi
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 -b "$JAR" "$BASE/programs/new")
if [ "$code" = "200" ]; then ok "/programs/new (authed) -> 200"; else bad "/programs/new (authed) -> $code"; fi

rm -f "$JAR" /tmp/m7b-probe.txt
echo
echo "== RESULT: $pass pass / $fail fail =="
[ "$fail" = "0" ] && exit 0 || exit 1
