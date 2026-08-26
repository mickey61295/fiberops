#!/usr/bin/env python3
"""
Rebuild the M2-final (54-model) prisma/schema.prisma after rollback #4.

CONTEXT (see docs/CONTEXT/03-PITFALLS.md #16):
- Rollback #4 left a MIXED state: M2-final code + 58-model generated client
  (Phase-4 era) + 54-model schema.prisma & db (the true M2 world).
- The recovery session first mistook the 54-model schema.prisma for drift and
  overwrote it with `git checkout HEAD -- prisma/schema.prisma` (58-model) and
  ran `prisma db push` (mutating the good 54-world db).
- The 54-model schema is NOT in any git object and NOT in any exported patch
  (M1/M2 patches never touched prisma/schema.prisma). This script RECONSTRUCTS
  it from: the 58-model base + code usage evidence (tools.ts create blocks,
  industry-chain test, old-db column facts recorded in worklog).

Recipe (58 -> 54):
  REMOVE models:    Bill, BillPass, Flag, HsnCode, PcsStock, RejectionType, Stage
  ADD models:       Program, LineIssue, RejectionEntry  (shapes from tools.ts)
  User:             drop agentTurns back-relation
  AgentTurn:        plain-string userId (no User relation), drop audit-enrichment
                    fields (model/promptVersion/steps/toolName/severity)
  Party:            drop bills Bill[]
  Department:       drop prs + stages Stage[]; add programs + rejections
  Payment:          drop billId/bill; add orderId(+relation), invoiceId, direction
  Order:            add programs/lineIssues/payments back-refs
  Yarn/Fabric:      add programs back-ref
  Line:             add lineIssues back-ref
"""
import re
import sys

SCHEMA = 'prisma/schema.prisma'

REMOVE_MODELS = ['Bill', 'BillPass', 'Flag', 'HsnCode', 'PcsStock', 'RejectionType', 'Stage']

NEW_MODELS = '''
// ============== PRODUCTION PIPELINE (order -> program -> cut -> line) ==============

// Production PROGRAM (legacy Trs_Prog port): the production plan right after
// BOM — yarn to knit / fabric to dye per order+stage. Auto PGM-####.
model Program {
  id           String      @id @default(cuid())
  programNo    String      @unique
  orderId      String
  order        Order       @relation(fields: [orderId], references: [id])
  stage        String // knitting | dyeing | printing | embroidery | sewing | finishing | packing
  deptId       String?
  department   Department? @relation(fields: [deptId], references: [id])
  yarnId       String?
  yarn         Yarn?       @relation(fields: [yarnId], references: [id])
  fabricId     String?
  fabric       Fabric?     @relation(fields: [fabricId], references: [id])
  requiredKgs  Float       @default(0)
  requiredMtrs Float       @default(0)
  requiredPcs  Float       @default(0)
  targetDate   DateTime?
  notes        String?
  status       String      @default("open") // open | in_progress | completed | cancelled
  createdAt    DateTime    @default(now())
}

// Issue cut pieces from main store (G1) to a sewing line. Auto LI-####.
model LineIssue {
  id        String   @id @default(cuid())
  issueNo   String   @unique
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id])
  lineId    String
  line      Line     @relation(fields: [lineId], references: [id])
  issueDate DateTime @default(now())
  qty       Int      @default(0)
  styleNo   String?
  notes     String?
  status    String   @default("issued")
  createdAt DateTime @default(now())
}

// QA rejection entry. Auto REJ-####. action scrap/return_to_party moves stock
// OUT of G2; rework is document-only (re-sewn via post_production_entry).
model RejectionEntry {
  id         String      @id @default(cuid())
  rejNo      String      @unique
  orderId    String
  order      Order       @relation(fields: [orderId], references: [id])
  deptId     String?
  department Department? @relation(fields: [deptId], references: [id])
  rejDate    DateTime    @default(now())
  qty        Int         @default(0)
  rejType    String      @default("stitch_fault") // stitch|size|fabric|shade_fault | damage | other
  action     String      @default("scrap") // scrap | rework | return_to_party
  notes      String?
  createdAt  DateTime    @default(now())
}
'''


def drop_model(s: str, name: str) -> str:
    m = re.search(rf'^model {name} \{{.*?^\}}\n', s, re.M | re.S)
    if not m:
        print(f'  WARN: model {name} not found (already removed?)')
        return s
    return s.replace(m.group(0), '')


def main() -> None:
    s = open(SCHEMA).read()
    orig_len = len(s)

    # 1) remove the 7 Phase-3/4 models
    for name in REMOVE_MODELS:
        s = drop_model(s, name)

    # bills-register section banner (now empty) + BillPass doc comment
    s = re.sub(r'^// ============== BILLS REGISTER.*\n', '', s, flags=re.M)
    s = re.sub(r'^// Bill pass \(LLD frmBillPass\):.*\n', '', s, flags=re.M)

    # 2) User: drop agentTurns back-relation
    s = s.replace('  agentTurns AgentTurn[]\n', '')

    # 3) AgentTurn: plain-string userId + drop audit-enrichment fields
    s = s.replace(
        '  userId     String\n  user       User      @relation(fields: [userId], references: [id])\n',
        '  userId     String   // plain string (auth out of scope for v1; would be FK to User.id in prod)\n',
    )
    s = re.sub(
        r'  // Audit enrichment \(PLAN 4\.6, LLD 09 telemetry\):.*?'
        r'  severity      String\? // ok \| warn \| block \(tolerance verdict of the plan\)\n',
        '', s, flags=re.S)

    # 4) Party: drop bills Bill[]
    s = s.replace('  bills          Bill[]\n', '')

    # 5) Department: drop prs (+comment) + stages; add programs/rejections
    s = re.sub(
        r'  // Legacy Mas_Dept\.Prs — cumulative-rate engine discriminator:\n'
        r'  // 1 = yarn base · 2 = dyeing · 4 = knitting · -4 = yarn twist · null = plain own-rate dept\n'
        r'  prs               Int\?\n', '', s)
    s = s.replace('  stages            Stage[]\n',
                  '  programs          Program[]\n  rejections       RejectionEntry[]\n')

    # 6) Payment: drop billId/bill; add orderId/order, invoiceId, direction
    s = s.replace(
        '  billId    String?\n  bill      Bill?    @relation(fields: [billId], references: [id])\n',
        '  orderId   String?\n  order     Order?   @relation(fields: [orderId], references: [id])\n'
        '  invoiceId String?\n')
    s = s.replace(
        '  partyId   String\n  party     Party    @relation(fields: [partyId], references: [id])\n',
        '  partyId   String\n  party     Party    @relation(fields: [partyId], references: [id])\n'
        '  direction String   @default("out") // in = receipt | out = payment\n')

    # 7) Order: add programs/lineIssues/payments back-refs (before party fields)
    s = s.replace(
        '  costSheet         CostSheet[]\n',
        '  costSheet         CostSheet[]\n'
        '  programs          Program[]\n'
        '  lineIssues        LineIssue[]\n'
        '  rejections        RejectionEntry[]\n'
        '  payments          Payment[]\n')

    # 8) Yarn/Fabric: programs back-ref (insert before closing via anchor fields)
    s = s.replace(
        '  rate  Float   @default(0)\n}\n',
        '  rate  Float   @default(0)\n  programs Program[]\n}\n')
    s = s.replace(
        '  rate         Float   @default(0)\n}\n',
        '  rate         Float   @default(0)\n  programs     Program[]\n}\n')

    # 9) Line: lineIssues back-ref
    s = s.replace(
        '  capacityPcsPerHour Int         @default(0)\n}',
        '  capacityPcsPerHour Int         @default(0)\n  lineIssues         LineIssue[]\n}')

    # 10) append the three new models
    s = s.rstrip('\n') + '\n' + NEW_MODELS

    open(SCHEMA, 'w').write(s)
    n = len(re.findall(r'^model ', s, re.M))
    print(f'schema rewritten: {orig_len} -> {len(s)} bytes, models = {n}')
    if n != 54:
        print(f'  ERROR: expected 54 models, got {n}')
        sys.exit(1)
    # sanity: no dangling refs to removed models (comments + plain columns OK)
    code_lines = [l for l in s.split('\n') if not l.strip().startswith('//')]
    code = '\n'.join(code_lines)
    for name in REMOVE_MODELS:
        if re.search(rf'\b{name}\b', code):
            print(f'  ERROR: dangling reference to {name} remains')
            sys.exit(1)
    print('OK')


if __name__ == '__main__':
    main()
