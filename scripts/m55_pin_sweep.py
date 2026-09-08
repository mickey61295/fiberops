#!/usr/bin/env python3
"""SPEC-M55 (L-06) — the same-commit pin sweep (the M54 sweep pattern).

Bumps every count pin to the M55 truth:
  tools 269→271 (post_shift_wages + get_shift_wages) · menu 147→148 (shift-wages)
  routes 183→184 (/hr/shift-wages) · register configs 35→36 · services 47→48
  PROMPT_VERSION m54-2026-09-07 → m55-2026-09-08 (context_check + test pins)

Ground truth verified live BEFORE this sweep ran:
  - vitest tests/unit/tracker.test.ts: expected 269, received 271
  - vitest tests/unit/menu-registry.test.ts: expected 147, received 148
Run AFTER the feat code landed; re-run context_check + the pin tests to confirm.
"""
import glob
import re
import sys

CHANGES = []


def sub_file(path, old, new, label, count=0):
    text = open(path).read()
    n = text.count(old)
    if n == 0:
        return
    if count and n != count:
        print(f'  WARN {path}: {label} found {n}x, expected {count}x')
    open(path, 'w').write(text.replace(old, new))
    CHANGES.append(f'{path}: {label} ({n}x)')


# ── 1. context_check.sh — the pin lines ──────────────────────────────────
CC = 'scripts/context_check.sh'
sub_file(CC, '+ M54 M-05 expense-head trio)" "269"',
         '+ M54 M-05 expense-head trio + M55 L-06 shift-wages pair)" "271"',
         'tools pin 269→271')
sub_file(CC, '+ M48 L-03 statutory + M52 M-03 final-accounts quartet)" "147"',
         '+ M48 L-03 statutory + M52 M-03 final-accounts quartet + M55 L-06 shift-wages)" "148"',
         'menu pin 147→148')
sub_file(CC, '+ M52 M-03 /accounts/trial-balance + day-book + cash-book + final-accounts)" "183"',
         '+ M52 M-03 /accounts/trial-balance + day-book + cash-book + final-accounts + M55 /hr/shift-wages)" "184"',
         'routes pin 183→184')
# register config files (pin 35) + service files (pin 47) — distinct pins, same label suffix
sub_file(CC, '+ M48 statutory + M52 M-03 final-accounts quartet)" "35"',
         '+ M48 statutory + M52 M-03 final-accounts quartet + M55 shift-wages)" "36"',
         'register config pin 35→36')
sub_file(CC, '+ M48 statutory + M52 M-03 final-accounts quartet)" "47"',
         '+ M48 statutory + M52 M-03 final-accounts quartet + M55 shift-wages)" "48"',
         'register service pin 47→48')
sub_file(CC, '''check "m54 PROMPT_VERSION (M-05 expense heads: THE HEAD REFINES NEVER BLOCKS — the ExpenseHead master sets category + the default GL leg; budget-vs-actual gains the expense addend)" "1" "$(grep -c "PROMPT_VERSION = 'm54-2026-09-07'" src/lib/agent/prompt.ts)"''',
         '''check "m55 PROMPT_VERSION (L-06 shift wages: post_shift_wages — the shift-level wage door + budget addend; shiftCode attribution; get_shift_wages — the shift × day wage bill)" "1" "$(grep -c "PROMPT_VERSION = 'm55-2026-09-08'" src/lib/agent/prompt.ts)"''',
         'PROMPT_VERSION pin m54→m55')

# ── 2. tests — the count pins + version pins ─────────────────────────────
for path in glob.glob('tests/**/*.test.ts', recursive=True):
    text = open(path).read()
    orig = text
    text = text.replace('m54-2026-09-07', 'm55-2026-09-08')
    text = re.sub(r'\.toBe\(269\)', '.toBe(271)', text)
    text = re.sub(r'\.toBe\(147\)', '.toBe(148)', text)
    text = text.replace("""'"269"'""", """'"271"'""")
    text = text.replace('tools 269 + the m54 version check', 'tools 271 + the m55 version check')
    if text != orig:
        open(path, 'w').write(text)
        n = sum(1 for a, b in [(orig, text)] for _ in [0]) # count diffs crudely below
        CHANGES.append(f'{path}: version/269→271/147→148 sweep')

print(f'{len(CHANGES)} files touched:')
for c in CHANGES:
    print(' -', c)
if not CHANGES:
    print('NOTHING TO DO — pins already swept?')
    sys.exit(1)
