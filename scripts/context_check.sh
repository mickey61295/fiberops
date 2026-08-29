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
REGCFGS=$(ls src/lib/erp/register-configs/*.ts 2>/dev/null | grep -v types.ts | grep -v index.ts | wc -l)
REGSVCFILES=$(ls src/lib/erp/registers/*.ts 2>/dev/null | grep -v types.ts | grep -v index.ts | grep -v resolve.ts | grep -v csv.ts | wc -l)
REPORTCFGS=$(grep -cE "^    slug: '" src/lib/erp/report-configs/index.ts 2>/dev/null)
REPORTSVCFILES=$(ls src/lib/erp/reports/*.ts 2>/dev/null | grep -v index.ts | grep -v report-csv.ts | wc -l)
REGCFGTESTS=$(grep -cE "^\s*it\(" tests/unit/register-configs.test.ts 2>/dev/null)
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
echo "  m4-waveA: register-configs=$REGCFGS  register-services=$REGSVCFILES  register-cfg-tests=$REGCFGTESTS"
echo "  m6-waveA: report-configs=$REPORTCFGS  report-service-files=$REPORTSVCFILES"
echo "  m7-waveA: auth-lib=$(ls src/lib/auth/*.ts 2>/dev/null | wc -l) auth-api-routes=$(ls -d src/app/api/auth/*/ 2>/dev/null | wc -l)"
echo "  m7-waveB: guarded-api-routes=$(grep -l 'requireApiSession' src/app/api/erp/route.ts src/app/api/agent/route.ts src/app/api/agent/approve/route.ts src/app/api/upload/route.ts src/app/api/seed/route.ts src/app/api/tracker/route.ts src/app/api/config/route.ts 2>/dev/null | wc -l)/7 (+M9 tracker +M11 config) agent-actor=AgentTurn.userId+approvedBy"
echo "  m8-waveA: print-lib=$(ls src/lib/erp/print/*.ts 2>/dev/null | wc -l) print-families=$(grep -cE "^  '?[a-z-]+'?: fetch" src/lib/erp/print/index.ts)"
echo "  m8-waveB: print-doors=$(grep -rl 'DocPrintLink' 'src/app/(erp)' --include='page.tsx' 2>/dev/null | wc -l)+gate-view=$(grep -l 'DocPrintLink' 'src/app/(erp)/dispatch/gate-view.tsx' 2>/dev/null | wc -l)"
echo "  m9-waveA: tracker-service=$(ls src/lib/erp/tracker.ts 2>/dev/null | wc -l) tracker-api=$(ls src/app/api/tracker/route.ts 2>/dev/null | wc -l) feed-families=$(grep -cE "kind: '(order|po|grn|invoice|payment|journal|cut|production|despatch|jobwork|gate|sample|labtest|expense|approval|agent)'" src/lib/erp/tracker.ts)"
echo "  m11: flags-registry=$(grep -c "name: '" src/lib/erp/flags.ts) flags-tests=$(grep -c '^  it(' tests/unit/flags-config.test.ts 2>/dev/null) settings-screen=$(ls 'src/app/(erp)/admin/settings/page.tsx' 2>/dev/null | wc -l)"
echo "  api-routes: $APIS"

echo
echo "[vs STATE.md claims — hardcoded from last verified 2026-08-29 m17 session (Operator Reflex Pack; 115 items)]"
check "agent tools (inline+factory+docTool + M9 get_live_activity)" "189" "$TOOLS"
check "domain markers (inline + 2 factories)" "$((INLINE_TOOLS + 2))" "$DOMAINS"
check "factory create tools"       "30"      "$FACTORY_CREATE"
check "factory update tools"       "30"      "$FACTORY_UPDATE"
check "docTool delegates (+ M6-C lifecycle ×4 + M6-D ×3)" "51"    "$DOCTOOLS"
check "prisma models (54 + ADR-015 ×7 + ADR-016 ×4)" "65"      "$MODELS"
check "erp view/shell components (+print-button +lifecycle-form +approval-queue +M8-A print trio +M9 live-tracker +M17 register-rows +M18 command-palette)" "31" "$VIEWS"
check "archetype engines (+register-screen +report-screen)" "4"       "$ARCHETYPES"
check "pipeline tests"             "15"      "$TESTS"
check "menu registry tests (M5-D + M6-A/B/C/D + M7-C findGroupForPath + M9 + M11 blocks)" "29"      "$REGTESTS"
check "master config tests"        "8"       "$CFGTESTS"
check "master parity test blocks"   "7"       "$PARITYTESTS"  # loop-generated: 75 tests at runtime
check "doc parity tests (+ M6-D)"    "21"      "$DOCPARITYTESTS"
check "register config tests (M4 fleet + M5-A/B; runtime via per-config loop)" "27"      "$REGCFGTESTS"
check "menu items (113 parity + M9 live-tracker + M11 feature-flags)" "115"     "$MENUITEMS"
check "live routes (M6 113/113 + M9 /tracker + M11 /admin/settings)" "147"    "$LIVEROUTES"
check "report configs (SPEC-M6 §4: 28 frozen)" "28"      "$REPORTCFGS"
check "report service files (12 new aggregates — current-stock bound in M6-C)" "2"       "$REPORTSVCFILES"
check "register config files (M4 + M5 + M6-C)" "20"       "$REGCFGS"
check "register service files (M4 + order-status + recon + M5 + M6-C ×2)" "23"       "$REGSVCFILES"
check "master configs (24 M2 + shift + 5 ADR-016)" "30"      "$MASTERCFGS"
check "shared zod schema files (+ M6-D dispatch/transfer variants)" "39"      "$SCHEMAFILES"
check "posting service files"      "35"      "$POSTINGSVCS"
check "chain stages"               "15"      "$CHAINSTAGES"
check "doc config files (SPEC-M3 19 + M5-A 5 + M5-B 13 + M5-D 10 + M6-B 1 + M6-D 2)" "40"       "$DOCCFGS"
check "MAX_STEPS"                  "12"      "$MAXSTEPS"
check "m7-waveA auth lib files (password/session/current-user + api-guard)" "4" "$(ls src/lib/auth/*.ts 2>/dev/null | grep -v rights.ts | grep -v login-cookies.ts | wc -l)"
check "m7-waveC auth lib files (rights + login-cookies)" "2" "$(ls src/lib/auth/rights.ts src/lib/auth/login-cookies.ts 2>/dev/null | wc -l)"
check "m7-waveA auth api routes (login/logout/session/bootstrap)" "4" "$(ls -d src/app/api/auth/*/ 2>/dev/null | grep -v admin | wc -l)"
check "m7-waveC admin api route (set-password)" "1" "$(ls src/app/api/auth/admin/set-password/route.ts 2>/dev/null | wc -l)"
check "m7-waveB guarded API route files (erp/agent/agent-approve/upload/seed + M9 tracker + M11 config)" "7" "$(grep -l 'requireApiSession' src/app/api/erp/route.ts src/app/api/agent/route.ts src/app/api/agent/approve/route.ts src/app/api/upload/route.ts src/app/api/seed/route.ts src/app/api/tracker/route.ts src/app/api/config/route.ts 2>/dev/null | wc -l)"
check "m7-waveB cookie fixture scripts using api-auth.mjs" "3" "$(grep -l "lib/api-auth.mjs" scripts/test_ingest.mjs scripts/eval_ingest.mjs scripts/test_money_loop.mjs 2>/dev/null | wc -l)"
check "m7-waveC middleware imports rights + menu-registry (per-route check)" "2" "$(grep -cE "from '@/lib/(auth/rights|erp/menu-registry)'" src/middleware.ts)"
check "m7-waveC fo_rights set at both login doors (login + bootstrap)" "2" "$(grep -l 'setLoginCookies' src/app/api/auth/login/route.ts src/app/api/auth/bootstrap/route.ts 2>/dev/null | wc -l)"
check "m8 print lib files (types/amount-words/fetchers/fetchers-b/index + M17 doc-type-map + M18 fetchers-order)" "7" "$(ls src/lib/erp/print/*.ts 2>/dev/null | wc -l)"
check "m8-waveA print components (print-sheet/print-auto/doc-print-button)" "3" "$(ls src/components/erp/print-sheet.tsx src/components/erp/print-auto.tsx src/components/erp/doc-print-button.tsx 2>/dev/null | wc -l)"
check "m8-waveA print doc families in registry (invoice/po/grn/payment/dc)" "5" "$(grep -cE '^  (invoice|po|grn|payment|dc): ' src/lib/erp/print/index.ts)"
check "m8 print doc families in registry (Wave A 5 + Wave B 15 + M18 order)" "21" "$(grep -cE "^  '?[a-z-]+'?: fetch" src/lib/erp/print/index.ts)"
check "m8-waveA print door on doc view pages" "5" "$(grep -l 'DocPrintLink' 'src/app/(erp)/accounts/invoice/[id]/page.tsx' 'src/app/(erp)/procurement/po/[id]/page.tsx' 'src/app/(erp)/procurement/grn/[id]/page.tsx' 'src/app/(erp)/accounts/payments/[id]/page.tsx' 'src/app/(erp)/jobwork/order/[id]/page.tsx' 2>/dev/null | wc -l)"
check "m8 print doors on doc view pages (Wave A 5 + Wave B 14 files + M18 Order Hub; gate-view covers 2 routes)" "20" "$(grep -rl 'DocPrintLink' 'src/app/(erp)' --include='page.tsx' --include='gate-view.tsx' 2>/dev/null | wc -l)"
check "m9 tracker service file (one service, two doors)" "1" "$(ls src/lib/erp/tracker.ts 2>/dev/null | wc -l)"
check "m9 tracker API route (requireApiSession guarded)" "1" "$(grep -l 'requireApiSession' src/app/api/tracker/route.ts 2>/dev/null | wc -l)"
check "m9 tracker feed families (16)" "16" "$(grep -cE "kind: '(order|po|grn|invoice|payment|journal|cut|production|despatch|jobwork|gate|sample|labtest|expense|approval|agent)'" src/lib/erp/tracker.ts)"
check "m9 module-board groups (parity-style live scoreboard, §4-B)" "11" "$(grep -cE "id: '(orders|procurement|cutting|production|pieces|accounts|inventory|quality|costing|workflow|agent)', label:" src/lib/erp/tracker.ts)"
check "m9 board summary tile in live-tracker component" "1" "$(grep -c 'Screens active today' src/components/erp/live-tracker.tsx)"
check "m9 tracker tests (6 feed + 1 modules board)" "7" "$(grep -c '^  it(' tests/unit/tracker.test.ts)"
check "m9 get_live_activity tool registered" "1" "$(grep -c "name: 'get_live_activity'" src/lib/agent/tools.ts)"
check "m9 live-tracker menu item in home group" "1" "$(grep -c "id: 'live-tracker'" src/lib/erp/menu-registry.ts)"
check "m9 tracker screen + component" "2" "$(ls 'src/app/(erp)/tracker/page.tsx' src/components/erp/live-tracker.tsx 2>/dev/null | wc -l)"
check "m10 prompt module (PROMPT_VERSION + SYSTEM_PROMPT)" "2" "$(grep -cE "^export const (PROMPT_VERSION|SYSTEM_PROMPT)" src/lib/agent/prompt.ts)"
check "m10 route imports the prompt module (versioned prompt in use)" "1" "$(grep -c "from '@/lib/agent/prompt'" src/app/api/agent/route.ts)"
check "m10 route stamps promptVersion (SSE start + AgentTurn rows)" "2" "$(grep -c 'promptVersion: PROMPT_VERSION' src/app/api/agent/route.ts)"
check "m10 AgentTurn.promptVersion column in schema" "1" "$(grep -c 'promptVersion String?' prisma/schema.prisma)"
check "m10 routing eval script" "1" "$(ls scripts/eval_routing.mjs 2>/dev/null | wc -l)"
check "m10 golden routing set entries (50 prompts, 16 domains)" "50" "$(grep -c "expectedTool: '" scripts/eval_routing.mjs)"
check "m10 prompt unit tests" "10" "$(grep -c '^  it(' tests/unit/prompt.test.ts)"
check "m10 routing eval report exists" "1" "$(ls download/eval-routing-report.json 2>/dev/null | wc -l)"
check "m11 flag registry defs (LLD-07 — 28 in, 28 out)" "28" "$(grep -c "name: '" src/lib/erp/flags.ts)"
check "m11 POST /api/config admin door (set-password pattern)" "1" "$(grep -c 'export async function POST' src/app/api/config/route.ts)"
check "m11 setFlag drift-safe message (registry names only)" "1" "$(grep -c 'not in the registry' src/lib/erp/flags.ts)"
check "m11 flags screen + client board (page + FlagsAdmin)" "2" "$(ls 'src/app/(erp)/admin/settings/page.tsx' 'src/app/(erp)/admin/settings/flags-admin.tsx' 2>/dev/null | wc -l)"
check "m11 feature-flags menu item (masters-admin group)" "1" "$(grep -c "id: 'feature-flags'" src/lib/erp/menu-registry.ts)"
check "m11 flags unit tests (registry shape + route contract)" "14" "$(grep -c '^  it(' tests/unit/flags-config.test.ts)"
check "m12 playwright config (dedicated :3100 + isolated e2e.db)" "1" "$(ls playwright.config.ts 2>/dev/null | wc -l)"
check "m12 golden-path spec files (8)" "8" "$(ls tests/e2e/*.spec.ts 2>/dev/null | wc -l)"
check "m12 e2e test cases across the suite" "14" "$(grep -ch '^  test(' tests/e2e/*.spec.ts | awk '{s+=$1} END {print s}')"
check "m12 global setup + teardown + one-command runner" "3" "$(ls scripts/e2e_global_setup.ts scripts/e2e_global_teardown.ts scripts/e2e.sh 2>/dev/null | wc -l)"
check "m12 setup isolation guard (refuses non-e2e DATABASE_URL)" "1" "$(grep -c "does not point at db/e2e.db" scripts/e2e_global_setup.ts)"
check "m12 package script test:e2e" "1" "$(grep -c '"test:e2e"' package.json)"
check "m12 agent SSE disconnect guard (send/safeClose)" "2" "$(grep -cE 'const (send|safeClose) =' src/app/api/agent/route.ts)"
check "m12 spec document" "1" "$(ls docs/CONTEXT/specs/SPEC-M12.md 2>/dev/null | wc -l)"

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
         'src/app/(erp)/costing/budget/page.tsx' 'src/app/(erp)/costing/budget/[id]/page.tsx' \
         'src/app/(erp)/orders/commercial-invoice/page.tsx' \
         'src/app/(erp)/accounts/invoice/local/page.tsx' \
         'src/app/(erp)/accounts/invoice/piece/page.tsx' \
         'src/app/(erp)/procurement/supplier-orders/page.tsx' \
         'src/app/(erp)/procurement/rate-confirmation/page.tsx' \
         'src/app/(erp)/procurement/rate-confirmation/csv/route.ts' \
         'src/app/(erp)/costing/piece-rate/page.tsx' \
         'src/app/(erp)/costing/piece-rate/csv/route.ts' \
         src/lib/erp/schemas/budget.ts src/lib/erp/schemas/commercial-invoice.ts \
         src/lib/erp/schemas/invoice-variants.ts src/lib/erp/schemas/supplier-order.ts \
         src/lib/erp/posting/budget.ts src/lib/erp/posting/supplier-order.ts \
         src/lib/erp/doc-configs/budget.ts src/lib/erp/doc-configs/commercial-invoice.ts \
         src/lib/erp/doc-configs/invoice-variants.ts src/lib/erp/doc-configs/supplier-order.ts \
         src/lib/erp/registers/rate-confirmation.ts src/lib/erp/registers/piece-rates.ts \
         src/lib/erp/register-configs/rate-confirmation.ts \
         src/lib/erp/register-configs/piece-rate-confirmation.ts \
         tests/pipeline/doc-parity-m5.test.ts tests/pipeline/register-services-m5.test.ts \
         docs/CONTEXT/specs/SPEC-M5.md scripts/route_smoke_m5.sh \
         'src/app/(erp)/masters/page.tsx' 'src/app/(erp)/masters/[entity]/page.tsx' \
         'src/app/(erp)/masters/actions.ts' 'src/app/(erp)/admin/company/page.tsx' \
         src/lib/erp/schemas/production-variants.ts src/lib/erp/schemas/line-transfer.ts \
         src/lib/erp/schemas/grn-variants.ts src/lib/erp/schemas/payment-variants.ts \
         src/lib/erp/posting/line-transfer.ts \
         src/lib/erp/doc-configs/production-variants.ts src/lib/erp/doc-configs/rejection-variants.ts \
         src/lib/erp/doc-configs/cut-variants.ts src/lib/erp/doc-configs/line-transfer.ts \
         src/lib/erp/doc-configs/grn-variants.ts src/lib/erp/doc-configs/costing-input.ts \
         src/lib/erp/doc-configs/wage-payments.ts \
         src/lib/erp/registers/wages.ts src/lib/erp/register-configs/wages.ts \
         tests/pipeline/doc-parity-m5b.test.ts tests/pipeline/register-services-m5b.test.ts \
         scripts/route_smoke_m5b.sh \
         src/lib/erp/approval-kinds.ts tests/unit/approval-kinds.test.ts \
         scripts/route_smoke_m5c.sh scripts/seed_m5c_smoke.ts \
         'src/app/(erp)/accounts/bill-pass/page.tsx' \
         'src/app/(erp)/dispatch/unit-transfer-ack/page.tsx' \
         'src/app/(erp)/quality/reprocess-approval/page.tsx' \
         'src/app/(erp)/quality/non-return-dc/page.tsx' \
         src/lib/erp/master-configs/shift.ts \
         src/lib/erp/doc-configs/sample.ts src/lib/erp/doc-configs/gate.ts \
         src/lib/erp/doc-configs/packing-list.ts src/lib/erp/doc-configs/lab-test.ts \
         src/lib/erp/doc-configs/expense.ts src/lib/erp/doc-configs/roll-split.ts \
         src/lib/erp/doc-configs/contract-allotment.ts src/lib/erp/doc-configs/program-allotment.ts \
         src/lib/erp/doc-configs/production-bill.ts \
         src/lib/erp/posting/sample.ts src/lib/erp/posting/gate.ts \
         src/lib/erp/posting/packing-list.ts src/lib/erp/posting/lab-test.ts \
         src/lib/erp/posting/expense.ts src/lib/erp/posting/roll-split.ts \
         src/lib/erp/posting/contract-allotment.ts src/lib/erp/posting/program-allotment.ts \
         src/lib/erp/posting/production-bill.ts \
         tests/pipeline/doc-parity-m5d.test.ts \
         scripts/route_smoke_m5d.sh scripts/seed_m5d_smoke.ts \
         'src/app/(erp)/orders/samples/page.tsx' \
         'src/app/(erp)/dispatch/gate-entry/page.tsx' \
         'src/app/(erp)/dispatch/gate-pass/page.tsx' \
         'src/app/(erp)/pieces/packing-list/page.tsx' \
         'src/app/(erp)/quality/lab-tests/page.tsx' \
         'src/app/(erp)/costing/expenses/page.tsx' \
         'src/app/(erp)/inventory/rolls/page.tsx' \
         'src/app/(erp)/jobwork/contract/page.tsx' \
         'src/app/(erp)/programs/allotment/page.tsx' \
         'src/app/(erp)/accounts/production-bills/page.tsx' \
         'src/app/(erp)/hr/shifts/page.tsx' \
         'src/app/(erp)/pieces/finished-goods/page.tsx' \
         'src/app/(erp)/production/operations/page.tsx' \
         'src/app/(erp)/production/bundles/page.tsx' \
         'src/app/(erp)/production/line-transfer/page.tsx' \
         'src/app/(erp)/cutting/panel/page.tsx' \
         'src/app/(erp)/cutting/panel-production/page.tsx' \
         'src/app/(erp)/cutting/panel-excess/page.tsx' \
         'src/app/(erp)/cutting/panel-rework/page.tsx' \
         'src/app/(erp)/cutting/fab-rejection/page.tsx' \
         'src/app/(erp)/pieces/shortage/page.tsx' \
         'src/app/(erp)/jobwork/pcs-return/page.tsx' \
         'src/app/(erp)/costing/input/page.tsx' \
         'src/app/(erp)/hr/wages/page.tsx' 'src/app/(erp)/hr/wages/csv/route.ts' \
         'src/app/(erp)/hr/wage-payments/page.tsx' \
         src/lib/erp/report-configs/index.ts src/lib/erp/report-configs/types.ts \
         src/lib/erp/reports/index.ts src/lib/erp/reports/core-reports.ts \
         src/lib/erp/reports/chain-money-reports.ts src/lib/erp/reports/report-csv.ts \
         src/components/archetypes/report-screen.tsx src/components/erp/print-button.tsx \
         'src/app/(erp)/reports/page.tsx' 'src/app/(erp)/reports/packs/page.tsx' \
         'src/app/(erp)/reports/mis/page.tsx' 'src/app/(erp)/reports/[slug]/page.tsx' \
         'src/app/(erp)/reports/[slug]/csv/route.ts' \
         'src/app/(erp)/costing/daily-pnl/page.tsx' \
         docs/CONTEXT/specs/SPEC-M6.md \
         tests/unit/report-configs.test.ts tests/pipeline/report-services.test.ts \
         scripts/route_smoke_m6a.sh \
         src/lib/erp/master-configs/user.ts src/lib/erp/master-configs/user-group.ts \
         src/lib/erp/master-configs/app-option.ts src/lib/erp/master-configs/hsn.ts \
         src/lib/erp/master-configs/test-parameter.ts \
         src/lib/erp/doc-configs/dispatch-variants.ts \
         'src/app/(erp)/dispatch/courier/page.tsx' 'src/app/(erp)/dispatch/loading/page.tsx' \
         'src/app/(erp)/admin/users/page.tsx' 'src/app/(erp)/admin/menu-rights/page.tsx' \
         'src/app/(erp)/admin/menu-rights/actions.ts' 'src/app/(erp)/admin/menu-rights/rights-matrix.tsx' \
         'src/app/(erp)/admin/options/page.tsx' \
         tests/pipeline/doc-parity-m6b.test.ts scripts/route_smoke_m6b.sh \
         src/lib/erp/posting/lifecycle.ts src/lib/erp/schemas/lifecycle.ts \
         src/lib/erp/registers/program-status.ts src/lib/erp/registers/current-stock.ts \
         src/lib/erp/register-configs/m6-wave-c.ts \
         src/components/erp/lifecycle-form.tsx \
         'src/app/(erp)/orders/enquiry/page.tsx' 'src/app/(erp)/programs/status/page.tsx' \
         'src/app/(erp)/programs/status/csv/route.ts' 'src/app/(erp)/inventory/stock/page.tsx' \
         'src/app/(erp)/inventory/stock/csv/route.ts' 'src/app/(erp)/production/line-status/page.tsx' \
         'src/app/(erp)/orders/amendments/page.tsx' 'src/app/(erp)/orders/close/page.tsx' \
         'src/app/(erp)/programs/cancel/page.tsx' 'src/app/(erp)/programs/complete/page.tsx' \
         'src/app/(erp)/procurement/po/close/page.tsx' \
         tests/pipeline/doc-parity-m6c.test.ts scripts/route_smoke_m6c.sh \
         src/lib/erp/schemas/dispatch-variants.ts src/lib/erp/schemas/transfer-variants.ts \
         src/lib/erp/doc-configs/transfer-variants.ts src/lib/erp/doc-configs/inventory-variants.ts \
         src/lib/erp/approval-queue.ts src/components/erp/approval-queue.tsx \
         'src/app/(erp)/procurement/grn/multi-process/page.tsx' \
         'src/app/(erp)/procurement/grn/acceptance/page.tsx' \
         'src/app/(erp)/inventory/opening-stock/page.tsx' \
         'src/app/(erp)/cutting/issue/page.tsx' 'src/app/(erp)/cutting/ready-to-cut/page.tsx' \
         'src/app/(erp)/cutting/production/page.tsx' 'src/app/(erp)/cutting/ack/page.tsx' \
         'src/app/(erp)/pieces/receipt/page.tsx' 'src/app/(erp)/pieces/gan/page.tsx' \
         'src/app/(erp)/pieces/transfer/page.tsx' 'src/app/(erp)/production/line-output/page.tsx' \
         'src/app/(erp)/dispatch/dc/page.tsx' 'src/app/(erp)/dispatch/dc/process/page.tsx' \
         'src/app/(erp)/dispatch/dc-return/page.tsx' 'src/app/(erp)/quality/lot-approval/page.tsx' \
         'src/app/(erp)/accounts/hsn-gst/page.tsx' 'src/app/(erp)/hr/employees/page.tsx' \
         'src/app/(erp)/quality/parameters/page.tsx' \
         tests/pipeline/doc-parity-m6d.test.ts scripts/route_smoke_m6d.sh \
         docs/CONTEXT/specs/SPEC-M7.md src/middleware.ts \
         src/lib/auth/password.ts src/lib/auth/session.ts src/lib/auth/current-user.ts \
         src/app/login/page.tsx src/app/login/login-form.tsx src/app/login/first-admin-form.tsx \
         src/app/api/auth/login/route.ts src/app/api/auth/logout/route.ts \
         src/app/api/auth/session/route.ts src/app/api/auth/bootstrap/route.ts \
         scripts/seed_admin.ts scripts/route_smoke_m7a.sh \
         tests/unit/auth.test.ts prisma/schema.prisma \
         src/lib/auth/api-guard.ts scripts/lib/api-auth.mjs \
         scripts/route_smoke_m7b.sh scripts/m7b_smoke_fixture.ts \
         tests/unit/api-guard.test.ts tests/unit/agent-actor.test.ts \
         src/lib/auth/rights.ts src/lib/auth/login-cookies.ts \
         src/app/api/auth/admin/set-password/route.ts \
         'src/app/(erp)/admin/users/password-admin.tsx' \
         scripts/route_smoke_m7c.sh scripts/m7c_smoke_fixture.ts \
         tests/unit/rights.test.ts tests/unit/set-password-route.test.ts \
         'src/app/(erp)/print/[docType]/[id]/page.tsx' \
         src/components/erp/print-sheet.tsx src/components/erp/print-auto.tsx \
         src/components/erp/doc-print-button.tsx src/lib/erp/print/index.ts \
         src/lib/erp/print/types.ts src/lib/erp/print/amount-words.ts \
         src/lib/erp/print/fetchers.ts tests/unit/amount-words.test.ts \
         tests/unit/print-docs.test.ts scripts/route_smoke_m8a.sh \
         src/lib/erp/print/fetchers-b.ts tests/unit/print-docs-b.test.ts \
         scripts/route_smoke_m8b.sh 'src/app/(erp)/dispatch/gate-view.tsx' \
         docs/CONTEXT/specs/SPEC-M8.md \
         src/lib/erp/tracker.ts src/app/api/tracker/route.ts \
         'src/app/(erp)/tracker/page.tsx' src/components/erp/live-tracker.tsx \
         tests/unit/tracker.test.ts scripts/route_smoke_m9.sh \
         docs/CONTEXT/specs/SPEC-M9.md \
         src/lib/agent/prompt.ts scripts/eval_routing.mjs \
         tests/unit/prompt.test.ts scripts/m10_description_audit.py \
         docs/CONTEXT/specs/SPEC-M10.md \
         'src/app/(erp)/admin/settings/page.tsx' \
         'src/app/(erp)/admin/settings/flags-admin.tsx' \
         tests/unit/flags-config.test.ts scripts/route_smoke_m11.sh \
         scripts/m11_smoke_fixture.ts docs/CONTEXT/specs/SPEC-M11.md \
         src/components/erp/register-rows.tsx src/lib/erp/print/doc-type-map.ts \
         tests/unit/print-doc-map.test.ts docs/CONTEXT/specs/SPEC-M17.md \
         src/lib/erp/print/fetchers-order.ts src/components/erp/command-palette.tsx \
         tests/unit/print-fidelity.test.ts docs/CONTEXT/specs/SPEC-M18.md; do
  if [ -f "$f" ]; then echo "  OK    $f"; PASS=$((PASS+1)); else echo "  MISSING $f"; FAIL=$((FAIL+1)); fi
done

echo
echo "[known-missing (expected gaps, do not 'fix' silently)]"
[ -f src/app/api/upload/route.ts ] && echo "  OK    /api/upload EXISTS (Wave D §12 rebuild — STATE updated)" || echo "  MISSING /api/upload (Wave D regression — rebuild it)"
grep -q "PROMPT_VERSION = '" src/lib/agent/prompt.ts && echo "  OK    PROMPT_VERSION exists (M10 — STATE drift note #1 RESOLVED; src/lib/agent/prompt.ts)" || echo "  MISSING PROMPT_VERSION (M10 regression — the prompt module is gone)"
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
