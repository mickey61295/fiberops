#!/usr/bin/env python3
"""SPEC-M47 L-03 — inherited pin bumps (same-commit protocol):
tools 253→254, menu 142→144, PROMPT_VERSION m46→m47, register slug list +1.
Idempotent-ish: asserts each replacement count, fails loudly on miss.
"""
import re, pathlib

ROOT = pathlib.Path('/home/z/my-project')

def patch(path, pairs):
    p = ROOT / path
    text = p.read_text()
    for old, new, min_hits in pairs:
        hits = text.count(old)
        assert hits >= min_hits, f"{path}: expected >= {min_hits} of {old!r}, found {hits}"
        text = text.replace(old, new)
    p.write_text(text)
    print(f"patched {path}")

# 1) tools 253→254 (15 files — the allTools.length pin)
TOOL_FILES = [
    'tests/unit/agent-actor.test.ts',
    'tests/unit/approval-kinds.test.ts',
    'tests/unit/attendance.test.ts',
    'tests/pipeline/chat-batch2.test.ts',
    'tests/pipeline/inv-batch6.test.ts',
    'tests/unit/digest-holidays.test.ts',
    'tests/unit/einvoice.test.ts',
    'tests/unit/holidays.test.ts',
    'tests/unit/print-barcode.test.ts',
    'tests/unit/prompt.test.ts',
    'tests/pipeline/prg-batch7.test.ts',
    'tests/unit/register-configs.test.ts',
    'tests/unit/tracker.test.ts',
    'tests/unit/waste-receipt.test.ts',
    'tests/pipeline/qol1-reconcile.test.ts',
]
for f in TOOL_FILES:
    patch(f, [("toBe(253) // M46 L-02:", "toBe(254) // M47 L-03: +get_statutory_register // M46 L-02:", 0),
              ("toBe(253)", "toBe(254)", 0)])

# 2) menu 142→144 (menu-registry ×3 + prg-batch7 ×1)
patch('tests/unit/menu-registry.test.ts', [
    ("expect(MENU_ITEMS.length).toBe(142) // M46 L-02: +payroll",
     "expect(MENU_ITEMS.length).toBe(144) // M47 L-03: +statutory +statutory-rates // M46 L-02: +payroll", 1),
    ("expect(s.totalItems).toBe(142)", "expect(s.totalItems).toBe(144)", 1),
    ("expect(s.liveItems).toBe(142)", "expect(s.liveItems).toBe(144)", 1),
])
patch('tests/pipeline/prg-batch7.test.ts', [
    ("expect(MENU_ITEMS.length).toBe(142) // M46 L-02 payroll",
     "expect(MENU_ITEMS.length).toBe(144) // M47 L-03 statutory ×2 // M46 L-02 payroll", 1),
])

# 3) PROMPT_VERSION m46→m47 (5 files)
VERSION_FILES = [
    'tests/pipeline/chat-batch2.test.ts',
    'tests/pipeline/payroll-l01.test.ts',
    'tests/pipeline/payroll-l02.test.ts',
    'tests/pipeline/prg-batch7.test.ts',
    'tests/pipeline/qol1-reconcile.test.ts',
]
for f in VERSION_FILES:
    patch(f, [("m46-2026-09-03", "m47-2026-09-08", 1)])

# 4) register-configs.test.ts: slug list + ROUTE_BY_SLUG + 40→41
patch('tests/unit/register-configs.test.ts', [
    ("'payroll': '/hr/payroll', // SPEC-M46 L-02",
     "'payroll': '/hr/payroll', // SPEC-M46 L-02\n  'statutory': '/hr/statutory', // SPEC-M47 L-03", 1),
    ("'rate-confirmation', 'stock-ledger',",
     "'rate-confirmation', 'statutory', 'stock-ledger',", 1),
    ("exactly the 40 register configs", "exactly the 41 register configs", 1),
])

print("ALL PIN PATCHES APPLIED")
