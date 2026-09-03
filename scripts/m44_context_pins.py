#!/usr/bin/env python3
"""M44 pin updater: context_check.sh expected values + the m43→m44 version check."""
import io

p = 'scripts/context_check.sh'
s = io.open(p, encoding='utf-8').read()

FIXES = [
  # tools 249 → 253 (+ M44 CST ×4)
  ('+ M39 JWL ×2 + M40 PAY ×6 + M41 PRC ×5 + M42 INV ×3 + M43 PRG ×3)" "249" "$TOOLS"',
   '+ M39 JWL ×2 + M40 PAY ×6 + M41 PRC ×5 + M42 INV ×3 + M43 PRG ×3 + M44 CST ×4)" "253" "$TOOLS"'),
  ('factory create tools"       "41"      "$FACTORY_CREATE"',
   'factory create tools"       "42"      "$FACTORY_CREATE"'),
  ('factory update tools"       "41"      "$FACTORY_UPDATE"',
   'factory update tools"       "42"      "$FACTORY_UPDATE"'),
  # models 86 → 88 (+ M44 CostComponent/CostSheetLine)
  ('+ M39 JobworkLine + M40 PAY ×3 + M42 StockTake/StockTakeLine + M43 OrderDelivery)" "86"      "$MODELS"',
   '+ M39 JobworkLine + M40 PAY ×3 + M42 StockTake/StockTakeLine + M43 OrderDelivery + M44 CostComponent/CostSheetLine)" "88"      "$MODELS"'),
  # register service files 39 → 40 (+ M44 cost-compare)
  ('+ M39 jobworker-statement + M41 despatch + M42 waste-percent + M43 program-proposal)" "39"       "$REGSVCFILES"',
   '+ M39 jobworker-statement + M41 despatch + M42 waste-percent + M43 program-proposal + M44 cost-compare)" "40"       "$REGSVCFILES"'),
  # master configs 41 → 42
  ('check "master configs (24 M2 + shift + 5 ADR-016 + 11 M19-C)" "41"      "$MASTERCFGS"',
   'check "master configs (24 M2 + shift + 5 ADR-016 + 11 M19-C + M44 cost-component)" "42"      "$MASTERCFGS"'),
  # the version check: m43 → m44
  ('check "m43 PROMPT_VERSION (the program-flow revival)" "1" "$(grep -c "PROMPT_VERSION = \'m43-2026-09-02\'" src/lib/agent/prompt.ts)"',
   'check "m44 PROMPT_VERSION (the costing-depth rewrite)" "1" "$(grep -c "PROMPT_VERSION = \'m44-2026-09-03\'" src/lib/agent/prompt.ts)"'),
]

n = 0
for old, new in FIXES:
    if old not in s:
        print('NOT FOUND:', old[:70])
        continue
    s = s.replace(old, new)
    n += 1

io.open(p, 'w', encoding='utf-8').write(s)
print(f'updated {n}/{len(FIXES)} pins in context_check.sh')
