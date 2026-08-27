#!/usr/bin/env bash
# context_check.sh — FiberOps ground-truth verifier.
# Run at the START of every session (see docs/CONTEXT/00-START-HERE.md).
# Compares reality against claims in docs/CONTEXT/01-STATE.md.
# EXIT CODE: 0 = no drift, 1 = drift detected (read the DIFF lines!)

cd "$(dirname "$0")/.." || exit 1

PASS=0; FAIL=0
check() { # check <label> <expected> <actual>
  if [ "$2" == "$3" ]; then
    echo "  OK    $1 = $3"
    PASS=$((PASS+1))
  else
    echo "  DRIFT $1 : STATE says '$2' but reality is '$3'"
    FAIL=$((FAIL+1))
  fi
}

echo "=== FiberOps context check ($(date '+%Y-%m-%d %H:%M')) ==="
echo

echo "[git]"
HEAD=$(git rev-parse --short HEAD 2>/dev/null || echo "NO-GIT")
DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
echo "  HEAD=$HEAD  dirty-files=$DIRTY"
TAGS=$(git tag --points-at HEAD 2>/dev/null | tr '\n' ' ')
echo "  tags-at-HEAD: ${TAGS:-none}"
echo

echo "[code metrics — reality]"
# tools: inline `name:` entries + factory-built master CRUD tools (SPEC-M2 §7)
# + docTool delegates over posting services (SPEC-M3 Wave A)
INLINE_TOOLS=$(grep -cE "^    name: '[a-z_0-9]+'," src/lib/agent/tools.ts)
FACTORY_CREATE=$(grep -c "masterCreateTool('" src/lib/agent/tools.ts)
FACTORY_UPDATE=$(grep -c "masterUpdateTool('" src/lib/agent/tools.ts)
DOCTOOLS=$(grep -cE "^  docTool\($" src/lib/agent/tools.ts)
TOOLS=$((INLINE_TOOLS + FACTORY_CREATE + FACTORY_UPDATE + DOCTOOLS))
DOMAINS=$(grep -cE "^    domain: '" src/lib/agent/tools.ts)
MODELS=$(grep -c "^model " prisma/schema.prisma)
VIEWS=$(ls src/components/erp/*.tsx 2>/dev/null | wc -l)
ARCHETYPES=$(ls src/components/archetypes/*.tsx 2>/dev/null | wc -l)
TESTS=$(grep -cE "^\s*(it|test)\(" tests/pipeline/industry-chain.test.ts 2>/dev/null)
REGTESTS=$(grep -cE "^\s*it\(" tests/unit/menu-registry.test.ts 2>/dev/null)
CFGTESTS=$(grep -cE "^\s*it\(" tests/unit/master-configs.test.ts 2>/dev/null)
PARITYTESTS=$(grep -cE "^\s*it\(" tests/pipeline/master-parity.test.ts 2>/dev/null)
DOCPARITYTESTS=$(grep -cE "^\s*it\(" tests/pipeline/doc-parity.test.ts 2>/dev/null)
MENUITEMS=$(grep -cE "^    id: '[a-z0-9-]+', label:" src/lib/erp/menu-registry.ts)
LIVEROUTES=$(grep -cE "^  '[^']+',\s*(//|$)" src/lib/erp/menu-registry.ts)
MASTERCFGS=$(ls src/lib/erp/master-configs/*.ts 2>/dev/null | grep -v types.ts | grep -v index.ts | wc -l)
SCHEMAFILES=$(ls src/lib/erp/schemas/*.ts 2>/dev/null | wc -l)
POSTINGSVCS=$(ls src/lib/erp/posting/*.ts 2>/dev/null | wc -l)
CHAINSTAGES=$(grep -cE "^  \{ step: " src/lib/erp/chain.ts)
DOCCFGS=$(ls src/lib/erp/doc-configs/*.ts 2>/dev/null | grep -v types.ts | grep -v index.ts | grep -v coerce.ts | wc -l)
DOCSCREENVIEWS=$(ls src/components/erp/*.tsx 2>/dev/null | wc -l)
MAXSTEPS=$(grep -oE "MAX_STEPS = [0-9]+" src/app/api/agent/route.ts | grep -oE "[0-9]+")
APIS=$(ls src/app/api/ | tr '\n' ' ')
echo "  tools=$TOOLS (inline=$INLINE_TOOLS + factory=$FACTORY_CREATE+$FACTORY_UPDATE + docTool=$DOCTOOLS)  prisma-models=$MODELS  erp-views=$VIEWS  archetypes=$ARCHETYPES"
echo "  pipeline-tests=$TESTS  registry-tests=$REGTESTS  master-cfg-tests=$CFGTESTS  master-parity-tests=$PARITYTESTS  doc-parity-tests=$DOCPARITYTESTS"
echo "  menu-items=$MENUITEMS  live-routes=$LIVEROUTES  master-configs=$MASTERCFGS  MAX_STEPS=$MAXSTEPS"
echo "  m3-waveA: schemas=$SCHEMAFILES  posting-files=$POSTINGSVCS  chain-stages=$CHAINSTAGES"
echo "  m3-waveB: doc-configs=$DOCCFGS  erp-shell-components=$DOCSCREENVIEWS"
echo "  m3-waveC: live-routes=$LIVEROUTES  doc-configs=$DOCCFGS  erp-views=$VIEWS"
echo "  m3-waveD: live-routes=$LIVEROUTES  doc-configs=$DOCCFGS  docTool=$DOCTOOLS  upload-route=yes"
echo "  m3-waveD: live-routes=$LIVEROUTES  doc-configs=$DOCCFGS  docTool=$DOCTOOLS  upload-route=yes"
echo "  api-routes: $APIS"

echo
echo "[vs STATE.md claims — hardcoded from last verified 2026-08-27 M3-WaveD session]"
check "agent tools (inline+factory+docTool)" "122" "$TOOLS"
check "domain markers (inline + 2 factories)" "$((INLINE_TOOLS + 2))" "$DOMAINS"
check "factory create tools"       "24"      "$FACTORY_CREATE"
check "factory update tools"       "24"      "$FACTORY_UPDATE"
check "docTool delegates (SPEC-M3 §5 + §11)" "23"    "$DOCTOOLS"
check "prisma models"              "54"      "$MODELS"
check "erp view/shell components (Wave B + Wave C recent-docs)" "20"      "$VIEWS"
check "archetype engines"          "2"       "$ARCHETYPES"
check "pipeline tests"             "15"      "$TESTS"
check "menu registry tests"        "15"      "$REGTESTS"
check "master config tests"        "8"       "$CFGTESTS"
check "master parity test blocks"   "7"       "$PARITYTESTS"  # loop-generated: 75 tests at runtime
check "doc parity tests"           "21"      "$DOCPARITYTESTS"
check "menu items"                 "113"     "$MENUITEMS"
check "live routes (M3 Wave D)"    "48"      "$LIVEROUTES"
check "master configs"             "24"      "$MASTERCFGS"
check "shared zod schema files"    "19"      "$SCHEMAFILES"
check "posting service files"      "22"      "$POSTINGSVCS"
check "chain stages"               "15"      "$CHAINSTAGES"
check "doc config files (SPEC-M3 §7/§8 — 19 configs; jobwork+production files hold 2)" "17"       "$DOCCFGS"
check "MAX_STEPS"                  "12"      "$MAXSTEPS"

echo
echo "[file existence — critical assets]"
for f in docs/CONTEXT/00-START-HERE.md docs/CONTEXT/01-STATE.md \
         docs/CONTEXT/02-DECISIONS.md docs/CONTEXT/03-PITFALLS.md \
         docs/CONTEXT/04-CONVENTIONS.md docs/PLAN-2.0-MENU-PARITY.md \
         docs/CONTEXT/specs/SPEC-M1.md docs/CONTEXT/specs/SPEC-M2.md \
         docs/CONTEXT/specs/SPEC-M3.md docs/form-taxonomy.json \
         src/lib/agent/tools.ts src/lib/agent/docExtract.ts \
         src/lib/erp/menu-registry.ts src/lib/erp/master-configs/index.ts \
         src/lib/erp/master-configs/types.ts src/lib/erp/posting/master-service.ts \
         src/lib/erp/chain.ts src/lib/erp/legacy-enums.ts \
         src/lib/erp/posting/types.ts src/lib/erp/posting/ledger.ts \
         src/lib/erp/posting/order.ts src/lib/erp/posting/grn.ts \
         src/lib/erp/schemas/order.ts src/lib/erp/schemas/cancel.ts \
         src/components/archetypes/master-table.tsx \
         src/components/archetypes/doc-screen.tsx \
         src/components/erp/chain-bar.tsx src/components/erp/doc-picker.tsx \
         src/components/erp/bom-card.tsx src/components/erp/recent-docs.tsx \
         src/lib/erp/doc-actions.ts \
         src/lib/erp/doc-configs/types.ts src/lib/erp/doc-configs/order.ts \
         src/lib/erp/doc-configs/program.ts src/lib/erp/doc-configs/purchase-order.ts \
         src/lib/erp/doc-configs/grn.ts src/lib/erp/doc-configs/jobwork.ts \
         src/lib/erp/doc-configs/cut.ts src/lib/erp/doc-configs/line-issue.ts \
         src/lib/erp/doc-configs/production.ts src/lib/erp/doc-configs/rejection.ts \
         src/lib/erp/doc-configs/despatch.ts \
         src/lib/erp/doc-configs/invoice.ts src/lib/erp/doc-configs/debit-note.ts \
         src/lib/erp/doc-configs/payment.ts src/lib/erp/doc-configs/journal.ts \
         src/lib/erp/doc-configs/cost-sheet.ts \
         src/lib/erp/doc-configs/stock-adjustment.ts \
         src/lib/erp/doc-configs/godown-transfer.ts \
         src/lib/erp/posting/stock-adj.ts src/lib/erp/posting/transfer.ts \
         src/lib/erp/schemas/stock-adj.ts src/lib/erp/schemas/transfer.ts \
         src/app/api/upload/route.ts \
         src/lib/erp/doc-configs/index.ts src/lib/erp/doc-configs/coerce.ts \
         tests/pipeline/industry-chain.test.ts tests/unit/menu-registry.test.ts \
         tests/unit/master-configs.test.ts tests/unit/doc-configs.test.ts \
         tests/unit/upload-route.test.ts \
         tests/pipeline/master-parity.test.ts \
         tests/pipeline/doc-parity.test.ts \
         'src/app/(erp)/layout.tsx' 'src/app/(erp)/coming/[id]/page.tsx' \
         'src/app/(erp)/orders/new/page.tsx' 'src/app/(erp)/orders/[id]/page.tsx' \
         'src/app/(erp)/orders/actions.ts' \
         'src/app/(erp)/programs/new/page.tsx' 'src/app/(erp)/programs/[id]/page.tsx' \
         'src/app/(erp)/procurement/po/page.tsx' 'src/app/(erp)/procurement/po/[id]/page.tsx' \
         'src/app/(erp)/procurement/grn/page.tsx' 'src/app/(erp)/procurement/grn/[id]/page.tsx' \
         'src/app/(erp)/jobwork/order/page.tsx' 'src/app/(erp)/jobwork/order/[id]/page.tsx' \
         'src/app/(erp)/jobwork/receipt/page.tsx' \
         'src/app/(erp)/cutting/job-order/page.tsx' 'src/app/(erp)/cutting/job-order/[id]/page.tsx' \
         'src/app/(erp)/production/issue/page.tsx' 'src/app/(erp)/production/issue/[id]/page.tsx' \
         'src/app/(erp)/production/entry/page.tsx' 'src/app/(erp)/production/entry/[id]/page.tsx' \
         'src/app/(erp)/production/rework/page.tsx' \
         'src/app/(erp)/pieces/rejection/page.tsx' 'src/app/(erp)/pieces/rejection/[id]/page.tsx' \
         'src/app/(erp)/pieces/despatch/page.tsx' 'src/app/(erp)/pieces/despatch/[id]/page.tsx' \
         'src/app/(erp)/accounts/invoice/page.tsx' 'src/app/(erp)/accounts/invoice/[id]/page.tsx' \
         'src/app/(erp)/accounts/debit-note/page.tsx' 'src/app/(erp)/accounts/debit-note/[id]/page.tsx' \
         'src/app/(erp)/accounts/payments/page.tsx' 'src/app/(erp)/accounts/payments/[id]/page.tsx' \
         'src/app/(erp)/accounts/journal/page.tsx' 'src/app/(erp)/accounts/journal/[id]/page.tsx' \
         'src/app/(erp)/costing/cost-sheet/page.tsx' 'src/app/(erp)/costing/cost-sheet/[id]/page.tsx' \
         'src/app/(erp)/inventory/adjustment/page.tsx' \
         'src/app/(erp)/inventory/transfer/page.tsx' \
         'src/app/(erp)/masters/page.tsx' 'src/app/(erp)/masters/[entity]/page.tsx' \
         'src/app/(erp)/masters/actions.ts' 'src/app/(erp)/admin/company/page.tsx' \
         prisma/schema.prisma; do
  if [ -f "$f" ]; then echo "  OK    $f"; PASS=$((PASS+1)); else echo "  MISSING $f"; FAIL=$((FAIL+1)); fi
done

echo
echo "[known-missing (expected gaps, do not 'fix' silently)]"
[ -f src/app/api/upload/route.ts ] && echo "  OK    /api/upload EXISTS (Wave D §12 rebuild — STATE updated)" || echo "  MISSING /api/upload (Wave D regression — rebuild it)"
grep -q "PROMPT_VERSION" src/app/api/agent/route.ts && echo "  NOTE  PROMPT_VERSION exists now (update STATE)" || echo "  OK    no PROMPT_VERSION (matches STATE drift note #1)"
[ -f src/components/erp/masters-view.tsx ] && echo "  NOTE  masters-view.tsx still exists (M2 should have deleted it)" || echo "  OK    masters-view.tsx deleted (M2)"

echo
echo "[system]"
DF=$(df -h . | tail -1 | awk '{print $5}')
echo "  disk-used=$DF (PITFALLS #11: full disk kills dev server)"

echo
echo "================================"
if [ $FAIL -eq 0 ]; then
  echo "RESULT: NO DRIFT ($PASS checks passed). STATE.md matches reality."
  exit 0
else
  echo "RESULT: DRIFT DETECTED ($FAIL mismatches)."
  echo "Protocol: trust THIS output → update docs/CONTEXT/01-STATE.md →"
  echo "log the drift in docs/CONTEXT/03-PITFALLS.md → check git log/tags for"
  echo "rollback evidence → recover from worklog + download/*.patch if needed."
  exit 1
fi
