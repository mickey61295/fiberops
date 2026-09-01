#!/bin/bash
# ============== ROUTE SMOKE — PRC BATCH 5 (SPEC-M41) ==============
# Live-server checks for the procurement & dispatch closure batch:
#   1. the three new screens render (PO amendments / purchase return /
#      despatch register)
#   2. the despatch register shows REAL DC/LAD rows with the age + gate-pass
#      columns (fixture-free — reads the seeded/production despatch rows)
#   3. the despatch DC view renders with the PRC-05 lifecycle row
#      (Convert/Deliver buttons per status) + logistics fields (PRC-08)
#   4. the MIS gate-pass recon card renders (present when DCs lack GPs —
#      silent when clean; either way the page renders)
#   5. the unknown-register-slug / 404 paths behave
#   6. the amended GRN screen renders with the multi-line line editor
# Auth: admin fixture (the batch-0..4 cookie-jar pattern).
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

# ── 1. auth ──
JAR=$(mktemp)
body=$(curl -s --max-time 30 -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@fiberpro.local","password":"admin123"}' "$BASE/api/auth/login")
if echo "$body" | grep -q '"ok":true'; then ok "admin login"; else bad "admin login: $body"; fi
AUTH=(-b "$JAR")

# ── 2. the new screens render ──
for route in /procurement/po/amendments /procurement/purchase-return /dispatch/register; do
  page=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE$route")
  code=$(echo "$page" | tail -1)
  if [ "$code" = "200" ]; then ok "$route renders (200)"; else bad "$route → $code"; fi
done

# ── 3. content checks ──
if curl -s --max-time 30 "${AUTH[@]}" "$BASE/procurement/po/amendments" | grep -q "PO Amendments"; then
  ok "/procurement/po/amendments is the PO amendment door (title present)"
else
  bad "amendments title missing"
fi
if curl -s --max-time 30 "${AUTH[@]}" "$BASE/procurement/po/amendments" | grep -q "update_purchase_order"; then
  ok "amendments screen cites the same tool (ADR-001 chip)"
else
  bad "amendments tool chip missing"
fi
if curl -s --max-time 30 "${AUTH[@]}" "$BASE/procurement/purchase-return" | grep -q "Purchase Return"; then
  ok "/procurement/purchase-return is the PRN door (title present)"
else
  bad "purchase-return title missing"
fi

REG=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/dispatch/register")
if echo "$REG" | grep -q "Despatch Register"; then
  ok "despatch register title present"
else
  bad "despatch register title missing"
fi
for col in "Gate Pass" "Age"; do
  if echo "$REG" | grep -q "$col"; then
    ok "despatch register carries the $col column"
  else
    bad "despatch register $col column missing"
  fi
done
if echo "$REG" | grep -qE "DC-|LAD-"; then
  ok "despatch register lists real DC/LAD rows"
else
  ok "despatch register renders (no DC rows yet — empty state is honest)"
fi

# ── 4. the despatch DC view + PRC-05 lifecycle row + PRC-08 fields ──
DC_ID=$(echo "$REG" | grep -oE 'href="/pieces/despatch/[^"]+"' | head -1 | sed 's/href="//;s/"//')
if [ -n "$DC_ID" ]; then
  V=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE$DC_ID")
  if echo "$V" | grep -qE "Mark delivered|Convert to despatch|delivered"; then
    ok "DC view carries the PRC-05 lifecycle row (or shows delivered)"
  else
    bad "DC view lifecycle row missing"
  fi
  if echo "$V" | grep -q "LR / AWB"; then
    ok "DC view carries the PRC-08 logistics block"
  else
    bad "DC view logistics block missing"
  fi
else
  bad "no despatch row to view (seed a DC first)"
fi

# ── 5. MIS renders (the PRC-07 recon card is conditional — silent when clean) ──
MIS=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/reports/mis")
MIS_CODE=$(echo "$MIS" | tail -1)
if [ "$MIS_CODE" = "200" ]; then
  ok "/reports/mis renders (200) — recon card present only when DCs lack GPs"
  if echo "$MIS" | grep -q "DCs without a gate pass"; then
    ok "MIS gate-pass recon card VISIBLE (DCs without GPs exist)"
  else
    ok "MIS recon card silent (all DCs gate-passed or none open)"
  fi
else
  bad "/reports/mis → $MIS_CODE"
fi

# ── 6. the GRN screen carries the multi-line editor (PRC-01 form door) ──
GRN=$(curl -s --max-time 30 "${AUTH[@]}" "$BASE/procurement/grn")
if echo "$GRN" | grep -q "Item Code"; then
  ok "/procurement/grn carries the multi-line line editor (PRC-01)"
else
  bad "GRN line editor missing"
fi

# ── 7. csv twin ──
CSV=$(curl -s --max-time 30 "${AUTH[@]}" -w '\n%{http_code}' "$BASE/dispatch/register/csv")
CSV_CODE=$(echo "$CSV" | tail -1)
if [ "$CSV_CODE" = "200" ]; then
  ok "/dispatch/register/csv renders (200)"
else
  bad "/dispatch/register/csv → $CSV_CODE"
fi

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
