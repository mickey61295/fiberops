#!/usr/bin/env python3
"""OPS-03 sweep — migrate posting-service date fallbacks to the IST day boundary.

Mechanical transform across src/lib/erp/posting/*.ts:
  `new Date(args.<field>) : new Date()`  →  `dateOrIstToday(args.<field>)`
plus the import. Explicit dates keep their exact semantics; omitted dates now
land on the IST business day instead of the UTC one (00:00-05:29 IST was
posting to yesterday).

SKIP list (timestamp semantics — `new Date()` is CORRECT there):
  - gate.ts gateDateTime (an event timestamp, not a business day)
"""
import re, pathlib, sys

POSTING = pathlib.Path('/home/z/my-project/src/lib/erp/posting')
SKIP = {('gate.ts', 'gateDateTime')}
PATTERN = re.compile(r'new Date\((args\.[A-Za-z0-9_]+)\)\s*:\s*new Date\(\)')
IMPORT = "import { dateOrIstToday } from '@/lib/erp/dates'"

changed_files = 0
changed_sites = 0
for path in sorted(POSTING.glob('*.ts')):
    src = path.read_text()
    hits = PATTERN.findall(src)
    if not hits:
        continue
    skips = [f for f in hits if (path.name, f[len('args.'):]) in SKIP]
    if len(skips) == len(set(hits)):
        # every hit is skipped — leave file untouched
        if set(hits) == set(skips):
            continue

    def repl(m):
        global changed_sites
        field = m.group(1)
        if (path.name, field[len('args.'):]) in SKIP:
            return m.group(0)  # leave the timestamp fallback alone
        changed_sites += 1
        return f'dateOrIstToday({field})'

    out = PATTERN.sub(repl, src)
    if out != src and IMPORT not in out:
        # insert after the last top-of-file import line
        lines = out.split('\n')
        last_import = max(i for i, l in enumerate(lines) if l.startswith('import '))
        lines.insert(last_import + 1, IMPORT)
        out = '\n'.join(lines)
    if out != src:
        path.write_text(out)
        changed_files += 1
        print(f'{path.name}: migrated')

print(f'\n{changed_files} file(s), {changed_sites} fallback site(s) migrated to IST.')
