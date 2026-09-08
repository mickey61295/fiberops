#!/usr/bin/env python3
"""SPEC-M56 (PAY-08, §17-3 ADR-020) — the same-commit pin sweep (the M54/M55 pattern).

Bumps every count pin to the M56 truth:
  tools 271→274 (post_cheque_clear + post_cheque_bounce + get_pdc_register)
  docTool delegates 73→75 (the two cheque lifecycle doors)
  menu 148→149 (pdc-register) · routes 184→185 (/accounts/pdc)
  register configs 36→37 · services 48→49 (pdc) · posting files 44→45 (cheque.ts)
  PROMPT_VERSION m55-2026-09-08 → m56-2026-09-08 (context_check + test pins)
  register-configs.test: 46→47 configs + the pdc slug + route map entry
  pay-batch4 PAY-08: the deferral guard flips to the RESOLVED state (the
  column landed WITH its writers — no dead columns, per the ADR-020 rule)

Ground truth verified live BEFORE this sweep ran (vitest 2026-09-08):
  - 23x  expected 274 to be 271  (allTools.length pins)
  - 14x  'm56-2026-09-08' vs 'm55-2026-09-08'  (PROMPT_VERSION pins)
  - 4x   expected 149 to be 148  (MENU_ITEMS pins)
Run AFTER the feat code landed; re-run context_check + the suite to confirm.
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
sub_file(CC, '+ M55 L-06 shift-wages pair)" "271"',
         '+ M55 L-06 shift-wages pair + M56 PAY-08 cheque lifecycle trio)" "274"',
         'tools pin 271→274')
sub_file(CC, '+ M55 L-06 post_shift_wages)" "73"',
         '+ M55 L-06 post_shift_wages + M56 PAY-08 post_cheque_clear/bounce)" "75"',
         'docTool pin 73→75')
sub_file(CC, '+ M55 L-06 shift-wages)" "148"',
         '+ M55 L-06 shift-wages + M56 PAY-08 pdc)" "149"',
         'menu pin 148→149')
sub_file(CC, '+ M55 /hr/shift-wages)" "184"',
         '+ M55 /hr/shift-wages + M56 /accounts/pdc)" "185"',
         'routes pin 184→185')
# register config files (pin 36) + service files (pin 48) — distinct pins, same label suffix
sub_file(CC, '+ M55 shift-wages)" "36"',
         '+ M55 shift-wages + M56 pdc)" "37"',
         'register config pin 36→37')
sub_file(CC, '+ M55 shift-wages)" "48"',
         '+ M55 shift-wages + M56 pdc)" "49"',
         'register service pin 48→49')
sub_file(CC, '+ M46 payroll)"      "44"',
         '+ M46 payroll + M56 cheque lifecycle)"      "45"',
         'posting service pin 44→45')
sub_file(CC, '''check "m55 PROMPT_VERSION (L-06 shift wages: post_shift_wages — the shift-level wage door + budget addend; shiftCode attribution; get_shift_wages — the shift × day wage bill)" "1" "$(grep -c "PROMPT_VERSION = 'm55-2026-09-08'" src/lib/agent/prompt.ts)"''',
         '''check "m56 PROMPT_VERSION (PAY-08 cheque/PDC lifecycle: post_cheque_clear — the physical confirmation, no journal; post_cheque_bounce — the CN- reversal + the stamp; get_pdc_register — cheques in the field; chequeDate on cheque-mode payments)" "1" "$(grep -c "PROMPT_VERSION = 'm56-2026-09-08'" src/lib/agent/prompt.ts)"''',
         'PROMPT_VERSION pin m55→m56')

# ── 2. tests — the count pins + version pins ─────────────────────────────
for path in glob.glob('tests/**/*.test.ts', recursive=True):
    text = open(path).read()
    orig = text
    text = text.replace('m55-2026-09-08', 'm56-2026-09-08')
    text = re.sub(r'\.toBe\(271\)', '.toBe(274)', text)
    text = re.sub(r'\.toBe\(148\)', '.toBe(149)', text)
    if text != orig:
        open(path, 'w').write(text)
        CHANGES.append(f'{path}: version/271→274/148→149 sweep')

# ── 3. hr-l06's context pins block (the cc toContain pins + title) ───────
sub_file('tests/pipeline/hr-l06.test.ts', "it('context_check pins: 271 / 148 / 184 / m55', () => {",
         "it('context_check pins: 274 / 149 / 185 / m56', () => {",
         'hr-l06 pin title')
sub_file('tests/pipeline/hr-l06.test.ts', """    expect(cc).toContain('"271"')
    expect(cc).toContain('"148"')
    expect(cc).toContain('"184"')""",
         """    expect(cc).toContain('"274"')
    expect(cc).toContain('"149"')
    expect(cc).toContain('"185"')""",
         'hr-l06 cc pins')

# ── 4. pay-batch4 — PAY-08 flips from DEFERRED to RESOLVED (SPEC-M56) ────
sub_file('tests/pipeline/pay-batch4.test.ts', """  it('PAY-08: explicitly DEFERRED per §17-3 (the owner decision stays open — no dead columns)', () => {
    const spec = readFileSync(join(process.cwd(), 'docs/CONTEXT/specs/SPEC-M40.md'), 'utf8')
    expect(spec).toContain('DEFERRED per §17-3')
    // no cheque-status column landed with the deferral (honest-claims rule)
    const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8')
    expect(schema).not.toContain('chequeStatus')
  })""",
         """  it('PAY-08: RESOLVED per §17-3 (SPEC-M56 — the cheque lifecycle shipped, the column has its writers)', () => {
    const spec = readFileSync(join(process.cwd(), 'docs/CONTEXT/specs/SPEC-M40.md'), 'utf8')
    expect(spec).toContain('DEFERRED per §17-3') // the M40 record stands — the deferral WAS the state until M56
    const m56 = readFileSync(join(process.cwd(), 'docs/CONTEXT/specs/SPEC-M56.md'), 'utf8')
    expect(m56).toContain('PAY-08')
    // the column landed WITH its writers (issued at the payment door; cleared/bounced at the lifecycle doors)
    const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8')
    expect(schema).toContain('chequeStatus')
  })""",
         'pay-batch4 PAY-08 deferral→resolution')

# ── 5. over-sweep corrections — .toBe(148) is a MONEY amount in two places
#        (the payroll statutory deductions + the jobwork cumulative receipts
#        qty); the global sweep flipped them and the first full-suite re-run
#        caught both. Same-commit correction (the honest audit trail):
CORRECTIONS = [
  ('tests/pipeline/payroll-l03.test.ts', 'expect(line.data.deductions).toBe(149)', 'expect(line.data.deductions).toBe(148)'),
  ('tests/pipeline/payroll-l03.test.ts', 'expect(row.deducted).toBe(149)', 'expect(row.deducted).toBe(148)'),
  ('tests/unit/doc-configs.test.ts', 'expect(jw2?.receivedQty).toBe(149)', 'expect(jw2?.receivedQty).toBe(148)'),
  ('tests/pipeline/accounts-m04.test.ts', "expect(cc).toContain('\"271\"')", "expect(cc).toContain('\"274\"')"),
  ('tests/pipeline/accounts-m05.test.ts', "expect(cc).toContain('\"271\"')", "expect(cc).toContain('\"274\"')"),
  ('tests/pipeline/prg-batch7.test.ts', "expect(PROMPT_VERSION.startsWith('m55')).toBe(true)", "expect(PROMPT_VERSION.startsWith('m56')).toBe(true)"),
]
for path, old, new in CORRECTIONS:
    sub_file(path, old, new, 'over-sweep correction')

print(f'{len(CHANGES)} files touched:')
for c in CHANGES:
    print(' -', c)
if not CHANGES:
    print('NOTHING TO DO — pins already swept?')
    sys.exit(1)
