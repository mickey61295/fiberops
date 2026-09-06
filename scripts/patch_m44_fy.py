#!/usr/bin/env python3
"""SPEC-M44 FY-01 — replace every literal '26-27' default with activeFinYear().

Mechanical patcher for the posting layer (the 16 services + tools.ts +
context.ts + 3 schemas + seed.ts). Prints a per-file change report and FAILS
loudly if any '26-27' literal survives in the touched files (except allowed
comments). Idempotent: re-running is a no-op.
"""
import re, sys, pathlib

ROOT = pathlib.Path('/home/z/my-project')
POSTING = ROOT / 'src/lib/erp/posting'

FILES = [
    'invoice.ts', 'purchase-order.ts', 'packing-list.ts', 'order.ts',
    'purchase-return.ts', 'roll-split.ts', 'despatch.ts', 'payment.ts',
    'production-bill.ts', 'debit-note.ts', 'budget.ts', 'journal.ts',
    'grn.ts', 'transfer.ts', 'expense.ts', 'ledger.ts',
]

# (pattern, replacement) — applied as plain string replaces
LITERALS = [
    ("const finYear = '26-27'", "const finYear = await activeFinYear()"),
    ("const finYear = args.finYear?.trim() || '26-27'",
     "const finYear = args.finYear?.trim() || await activeFinYear()"),
    ("const finYear = args.finYear || '26-27'",
     "const finYear = args.finYear || await activeFinYear()"),
    ("const finYear = grn.finYear || '26-27'",
     "const finYear = grn.finYear || await activeFinYear()"),
    ("finYear: '26-27',", "finYear: await activeFinYear(),"),
    ("finYear: '26-27' }", "finYear: await activeFinYear() }"),
]

report, failures = [], []

def patch(path: pathlib.Path, extra: list[tuple[str, str]] | None = None) -> None:
    text = orig = path.read_text()
    n = 0
    for pat, rep in LITERALS + (extra or []):
        if pat in text:
            n += text.count(pat)
            text = text.replace(pat, rep)
    if n == 0 and 'activeFinYear' in text:
        report.append(f'  {path.name}: already patched (no-op)')
        return
    # import: extend sibling numbering import, else add one after the db import
    if "from '../numbering'" in text:
        m = re.search(r"import \{ ([^}]+) \} from '\.\./numbering'", text)
        if m and 'activeFinYear' not in m.group(1):
            text = text.replace(m.group(0),
                m.group(0).replace(m.group(1), m.group(1) + ', activeFinYear'))
    elif "from '@/lib/erp/numbering'" in text:
        m = re.search(r"import \{ ([^}]+) \} from '@/lib/erp/numbering'", text)
        if m and 'activeFinYear' not in m.group(1):
            text = text.replace(m.group(0),
                m.group(0).replace(m.group(1), m.group(1) + ', activeFinYear'))
    else:
        text = text.replace("import { db } from '@/lib/db'",
            "import { db } from '@/lib/db'\nimport { activeFinYear } from '../numbering'", 1)
    path.write_text(text)
    report.append(f'  {path.name}: {n} literal(s) replaced, import ensured')

for name in FILES:
    patch(POSTING / name)

# tools.ts — adjust_stock literal + import (agent dir → alias import)
tools = ROOT / 'src/lib/agent/tools.ts'
patch(tools, [
    ("finYear (defaults to current 26-27; use e.g. \"24-25\" for historical documents)",
     'finYear (defaults to the active financial year; use e.g. "24-25" for historical documents)'),
    ('Optional: finYear (defaults 26-27), notes.',
     'Optional: finYear (defaults to the active financial year), notes.'),
])
# tools.ts imports db via '@/lib/db' — fix the relative import the patcher added
t = tools.read_text()
t = t.replace("import { activeFinYear } from '../numbering'",
              "import { activeFinYear } from '@/lib/erp/numbering'", 1)
tools.write_text(t)

# context.ts — catch fallback
ctx = ROOT / 'src/lib/agent/context.ts'
c = ctx.read_text()
c2 = c.replace("const fy = await activeFinYear().catch(() => '26-27')",
               "const fy = await activeFinYear().catch(() => fyCodeToday())")
if c2 != c:
    c2 = c2.replace("import { activeFinYear } from '@/lib/erp/numbering'",
                    "import { activeFinYear, fyCodeToday } from '@/lib/erp/numbering'")
    ctx.write_text(c2)
    report.append('  context.ts: catch fallback → fyCodeToday(), import extended')
else:
    report.append('  context.ts: no change needed')

# schemas — describes only
for s in ['budget', 'expense', 'packing-list']:
    p = ROOT / f'src/lib/erp/schemas/{s}.ts'
    t = p.read_text()
    t2 = t.replace("z.string().optional().describe('Defaults to current 26-27')",
                   "z.string().optional().describe('Defaults to the active financial year')")
    if t2 != t:
        p.write_text(t2)
        report.append(f'  schemas/{s}.ts: describe updated')

print('PATCH REPORT:')
print('\n'.join(report))

# verification pass — zero surviving literals in patched zones
bad = []
for name in FILES:
    t = (POSTING / name).read_text()
    if "'26-27'" in t:
        bad.append(f'posting/{name}')
for extra in [tools, ctx]:
    if "'26-27'" in extra.read_text():
        for i, line in enumerate(extra.read_text().splitlines(), 1):
            if "'26-27'" in line and not line.strip().startswith(('*','//','/*','* ')):
                bad.append(f'{extra.name}:{i}:{line.strip()[:80]}')
if bad:
    print('\nSURVIVING LITERALS (FAIL):')
    print('\n'.join(bad))
    sys.exit(1)
print('\nVERIFIED: zero 26-27 literals remain in the posting layer + tools/context')
