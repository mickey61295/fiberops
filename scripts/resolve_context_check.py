#!/usr/bin/env python3
"""Resolve scripts/context_check.sh merge conflicts with merged pin values.

Merged reality (verified by counting the merged tree):
  tools=257 (253 main + 4 side_quest)  factory=42/42  docTool=72  models=90
  regcfg=30  regsvc=42 (41 side_quest + cost-compare)  masters=42
  schemas=45  posting=44  print families=25  doccfgs=42
  PROMPT_VERSION = m47-2026-09-06
"""

P = "scripts/context_check.sh"

H1 = '''<<<<<<< HEAD
check "agent tools (inline+factory+docTool + M9 get_live_activity + M19-C ×33 + M20 attendance ×2 + M21 waste + M23 e-invoice + M26 cancel-irn + M31 working-days + M33 get_bundle + M35 daily-digest + M39 JWL ×2 + M40 PAY ×6 + M41 PRC ×5 + M42 INV ×3 + M43 PRG ×3 + M44 CST ×4)" "253" "$TOOLS"
check "domain markers (inline + 2 factories)" "$((INLINE_TOOLS + 2))" "$DOMAINS"
check "factory create tools"       "42"      "$FACTORY_CREATE"
check "factory update tools"       "42"      "$FACTORY_UPDATE"
check "docTool delegates (+ M6-C lifecycle ×4 + M6-D ×3 + M20 attendance + M21 waste + M23 e-invoice + M26 cancel-irn + M39 bill_jobwork + M40 PAY ×6 + M41 PRC ×3 + M42 INV ×3 + M43 PRG ×2)" "70"    "$DOCTOOLS"
check "prisma models (54 + ADR-015 ×7 + ADR-016 ×4 + ADR-019 ×11 + M15 AuditLog + M20 Attendance + M37 IdempotencyKey + M39 JobworkLine + M40 PAY ×3 + M42 StockTake/StockTakeLine + M43 OrderDelivery + M44 CostComponent/CostSheetLine)" "88"      "$MODELS"
=======
check "agent tools (inline+factory+docTool + M9 get_live_activity + M19-C ×33 + M20 attendance ×2 + M21 waste + M23 e-invoice + M26 cancel-irn + M31 working-days + M33 get_bundle + M35 daily-digest + M39 JWL ×2 + M40 PAY ×6 + M41 PRC ×5 + M42 INV ×3 + M43 PRG ×3 + M45 L-01 operator-statement + M46 L-02 payroll trio)" "253" "$TOOLS"
check "domain markers (inline + 2 factories)" "$((INLINE_TOOLS + 2))" "$DOMAINS"
check "factory create tools"       "41"      "$FACTORY_CREATE"
check "factory update tools"       "41"      "$FACTORY_UPDATE"
check "docTool delegates (+ M6-C lifecycle ×4 + M6-D ×3 + M20 attendance + M21 waste + M23 e-invoice + M26 cancel-irn + M39 bill_jobwork + M40 PAY ×6 + M41 PRC ×3 + M42 INV ×3 + M43 PRG ×2 + M46 L-02 payroll ×2)" "72"    "$DOCTOOLS"
check "prisma models (54 + ADR-015 ×7 + ADR-016 ×4 + ADR-019 ×11 + M15 AuditLog + M20 Attendance + M37 IdempotencyKey + M39 JobworkLine + M40 PAY ×3 + M42 StockTake/StockTakeLine + M43 OrderDelivery + M46 PayrollRun/PayrollLine)" "88"      "$MODELS"
>>>>>>> origin/side_quest
'''

R1 = '''check "agent tools (inline+factory+docTool + M9 get_live_activity + M19-C ×33 + M20 attendance ×2 + M21 waste + M23 e-invoice + M26 cancel-irn + M31 working-days + M33 get_bundle + M35 daily-digest + M39 JWL ×2 + M40 PAY ×6 + M41 PRC ×5 + M42 INV ×3 + M43 PRG ×3 + M44 CST ×4 + M45 L-01 operator-statement + M46 L-02 payroll trio)" "257" "$TOOLS"
check "domain markers (inline + 2 factories)" "$((INLINE_TOOLS + 2))" "$DOMAINS"
check "factory create tools"       "42"      "$FACTORY_CREATE"
check "factory update tools"       "42"      "$FACTORY_UPDATE"
check "docTool delegates (+ M6-C lifecycle ×4 + M6-D ×3 + M20 attendance + M21 waste + M23 e-invoice + M26 cancel-irn + M39 bill_jobwork + M40 PAY ×6 + M41 PRC ×3 + M42 INV ×3 + M43 PRG ×2 + M46 L-02 payroll ×2)" "72"    "$DOCTOOLS"
check "prisma models (54 + ADR-015 ×7 + ADR-016 ×4 + ADR-019 ×11 + M15 AuditLog + M20 Attendance + M37 IdempotencyKey + M39 JobworkLine + M40 PAY ×3 + M42 StockTake/StockTakeLine + M43 OrderDelivery + M44 CostComponent/CostSheetLine + M46 PayrollRun/PayrollLine)" "90"      "$MODELS"
'''

H2 = '''<<<<<<< HEAD
check "register config files (M4 + M5 + M6-C + M19 material-stock + wave-b + closing-stock + audit-log + M20 attendance + M39 jobworker-statement + M41 despatch-register + M42 waste-percent)" "28"       "$REGCFGS"
check "register service files (M4 + order-status + recon + M5 + M6-C ×2 + M19 ×10 + audit + M20 attendance + M39 jobworker-statement + M41 despatch + M42 waste-percent + M43 program-proposal + M44 cost-compare)" "40"       "$REGSVCFILES"
check "master configs (24 M2 + shift + 5 ADR-016 + 11 M19-C + M44 cost-component)" "42"      "$MASTERCFGS"
check "shared zod schema files (+ M6-D dispatch/transfer variants + M20 attendance + M23 e-invoice + M40 supplier-bill + M41 purchase-return + M42 stock-take)" "44"      "$SCHEMAFILES"
check "posting service files (+ M20 attendance + M39 jobwork-bill + M40 supplier-bill + M41 purchase-return + M42 stock-take + M43 order-deliveries + program-spec)"      "42"      "$POSTINGSVCS"
=======
check "register config files (M4 + M5 + M6-C + M19 material-stock + wave-b + closing-stock + audit-log + M20 attendance + M39 jobworker-statement + M41 despatch-register + M42 waste-percent + M45 operator-statement + M46 payroll)" "30"       "$REGCFGS"
check "register service files (M4 + order-status + recon + M5 + M6-C ×2 + M19 ×10 + audit + M20 attendance + M39 jobworker-statement + M41 despatch + M42 waste-percent + M43 program-proposal + M45 operator-statement + M46 payroll)" "41"       "$REGSVCFILES"
check "master configs (24 M2 + shift + 5 ADR-016 + 11 M19-C)" "41"      "$MASTERCFGS"
check "shared zod schema files (+ M6-D dispatch/transfer variants + M20 attendance + M23 e-invoice + M40 supplier-bill + M41 purchase-return + M42 stock-take + M46 payroll)" "45"      "$SCHEMAFILES"
check "posting service files (+ M20 attendance + M39 jobwork-bill + M40 supplier-bill + M41 purchase-return + M42 stock-take + M43 order-deliveries + program-spec + M45 employee-party + M46 payroll)"      "44"      "$POSTINGSVCS"
>>>>>>> origin/side_quest
'''

R2 = '''check "register config files (M4 + M5 + M6-C + M19 material-stock + wave-b + closing-stock + audit-log + M20 attendance + M39 jobworker-statement + M41 despatch-register + M42 waste-percent + M45 operator-statement + M46 payroll)" "30"       "$REGCFGS"
check "register service files (M4 + order-status + recon + M5 + M6-C ×2 + M19 ×10 + audit + M20 attendance + M39 jobworker-statement + M41 despatch + M42 waste-percent + M43 program-proposal + M44 cost-compare + M45 operator-statement + M46 payroll)" "42"       "$REGSVCFILES"
check "master configs (24 M2 + shift + 5 ADR-016 + 11 M19-C + M44 cost-component)" "42"      "$MASTERCFGS"
check "shared zod schema files (+ M6-D dispatch/transfer variants + M20 attendance + M23 e-invoice + M40 supplier-bill + M41 purchase-return + M42 stock-take + M46 payroll)" "45"      "$SCHEMAFILES"
check "posting service files (+ M20 attendance + M39 jobwork-bill + M40 supplier-bill + M41 purchase-return + M42 stock-take + M43 order-deliveries + program-spec + M45 employee-party + M46 payroll)"      "44"      "$POSTINGSVCS"
'''

H3 = '''<<<<<<< HEAD
check "m44 PROMPT_VERSION (the costing-depth rewrite)" "1" "$(grep -c "PROMPT_VERSION = 'm44-2026-09-03'" src/lib/agent/prompt.ts)"
=======
check "m46 PROMPT_VERSION (payroll run + payslip — Module L Batch 2)" "1" "$(grep -c "PROMPT_VERSION = 'm46-2026-09-03'" src/lib/agent/prompt.ts)"
check "m44 FY single-source (zero frozen '26-27' in the posting layer)" "0" "$(grep -rc "'26-27'" src/lib/erp/posting/*.ts 2>/dev/null | awk -F: '{s+=$2} END {print s+0}')"
check "m44 fy-hotfix test file (11 tests)" "11" "$(grep -c '^  it(' tests/pipeline/fy-hotfix-m44.test.ts 2>/dev/null)"
>>>>>>> origin/side_quest
'''

R3 = '''check "m47 PROMPT_VERSION (the side_quest merge: m44 costing lines + m46 payroll lines)" "1" "$(grep -c "PROMPT_VERSION = 'm47-2026-09-06'" src/lib/agent/prompt.ts)"
check "m44 FY single-source (zero frozen '26-27' in the posting layer)" "0" "$(grep -rc "'26-27'" src/lib/erp/posting/*.ts 2>/dev/null | awk -F: '{s+=$2} END {print s+0}')"
check "m44 fy-hotfix test file (11 tests)" "11" "$(grep -c '^  it(' tests/pipeline/fy-hotfix-m44.test.ts 2>/dev/null)"
'''


def main() -> None:
    with open(P) as fh:
        text = fh.read()
    for hunk, repl, name in ((H1, R1, "pins-1"), (H2, R2, "pins-2"), (H3, R3, "version-pins")):
        if hunk not in text:
            raise SystemExit(f"MISSING hunk {name} — abort, do not partially resolve")
        text = text.replace(hunk, repl)
    with open(P, "w") as fh:
        fh.write(text)
    print("context_check.sh: 3 hunks resolved")


if __name__ == "__main__":
    main()
