#!/usr/bin/env python3
"""M42 pin updater: context_check.sh expected values + the m41→m42 version check."""
import io

p = 'scripts/context_check.sh'
s = io.open(p, encoding='utf-8').read()

FIXES = [
  # (old fragment, new fragment)
  ('+ M39 JWL ×2 + M40 PAY ×6 + M41 PRC ×5)" "243" "$TOOLS"',
   '+ M39 JWL ×2 + M40 PAY ×6 + M41 PRC ×5 + M42 INV ×3)" "246" "$TOOLS"'),
  ('+ M39 bill_jobwork + M40 PAY ×6 + M41 PRC ×3)" "65"    "$DOCTOOLS"',
   '+ M39 bill_jobwork + M40 PAY ×6 + M41 PRC ×3 + M42 INV ×3)" "68"    "$DOCTOOLS"'),
  ('+ M39 JobworkLine + M40 PAY ×3)" "83"      "$MODELS"',
   '+ M39 JobworkLine + M40 PAY ×3 + M42 StockTake/StockTakeLine)" "85"      "$MODELS"'),
  ('+ M40 supplier-bill + M41 PRC ×3)" "137"     "$MENUITEMS"',
   '+ M40 supplier-bill + M41 PRC ×3 + M42 INV ×2)" "139"     "$MENUITEMS"'),
  ('+ M40 /accounts/bill ×2 + M41 PRC ×3)" "171"    "$LIVEROUTES"',
   '+ M40 /accounts/bill ×2 + M41 PRC ×3 + M42 INV ×3)" "174"    "$LIVEROUTES"'),
  ('+ M39 jobworker-statement + M41 despatch-register)" "27"       "$REGCFGS"',
   '+ M39 jobworker-statement + M41 despatch-register + M42 waste-percent)" "28"       "$REGCFGS"'),
  ('+ M39 jobworker-statement + M41 despatch)" "37"       "$REGSVCFILES"',
   '+ M39 jobworker-statement + M41 despatch + M42 waste-percent)" "38"       "$REGSVCFILES"'),
  ('+ M40 supplier-bill + M41 purchase-return)" "43"      "$SCHEMAFILES"',
   '+ M40 supplier-bill + M41 purchase-return + M42 stock-take)" "44"      "$SCHEMAFILES"'),
  ('+ M40 supplier-bill + M41 purchase-return)"      "39"      "$POSTINGSVCS"',
   '+ M40 supplier-bill + M41 purchase-return + M42 stock-take)"      "40"      "$POSTINGSVCS"'),
  ('(Wave A 5 + Wave B 15 + M18 order + M33 bundle labels ×2)" "23"',
   '(Wave A 5 + Wave B 15 + M18 order + M33 bundle labels ×2 + M42 stock-take count sheet)" "24"'),
  ('(Wave A 5 + Wave B 14 files + M18 Order Hub; gate-view covers 2 routes)" "20"',
   '(Wave A 5 + Wave B 14 files + M18 Order Hub; gate-view covers 2 routes; M42 stock-take view)" "21"'),
  ('check "m11+m13 flag registry defs (28 LLD-07 + 4 notification + M41 po_appr)" "33"',
   'check "m11+m13 flag registry defs (28 LLD-07 + 4 notification + M41 po_appr + M42 INV ×5)" "38"'),
  ('check "m13 flags registry count (28 LLD-07 + 4 notification + M41 po_appr)" "33"',
   'check "m13 flags registry count (28 LLD-07 + 4 notification + M41 po_appr + M42 INV ×5)" "38"'),
  ('check "commit doors routing through runCommit (M15 ×13 + M23 e-invoice door; M26 cancel rides the same file; M41 po-amend + dc-transition doors + the amendments page doc-comment)" "17"',
   'check "commit doors routing through runCommit (M15 ×13 + M23 e-invoice door; M26 cancel rides the same file; M41 po-amend + dc-transition doors + the amendments page doc-comment; M42 stock-take actions)" "18"'),
  # the version check: m41 → m42
  ('check "m41 PROMPT_VERSION (the procurement/dispatch rewrite)" "1" "$(grep -c "PROMPT_VERSION = \'m41-2026-09-01\'" src/lib/agent/prompt.ts)"',
   'check "m42 PROMPT_VERSION (the stock take/valuation rewrite)" "1" "$(grep -c "PROMPT_VERSION = \'m42-2026-09-02\'" src/lib/agent/prompt.ts)"'),
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
