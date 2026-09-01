#!/usr/bin/env python3
"""M42 inherited-pin updater: tool counts 243→246 in the remaining suites."""
import io, sys

FIXES = [
    ('tests/unit/prompt.test.ts',
     "expect(allTools.length).toBe(243) // M39 JWL: +bill_jobwork +list_jobworker_statement // count pin (M19-C: 189 + 33 completion-master tools)",
     "expect(allTools.length).toBe(246) // M42 INV: +create_stock_take +record_stock_counts +advance_stock_take // count pin (M19-C: 189 + 33 completion-master tools)"),
    ('tests/unit/register-configs.test.ts',
     "expect(allTools.length).toBe(243) // M41 PRC: +update_purchase_order +create_purchase_return +deliver_dc +clear_gate_entry +list_purchase_returnsjobworker_statement // 189 + M19-C ×33",
     "expect(allTools.length).toBe(246) // M42 INV: +create_stock_take +record_stock_counts +advance_stock_take // 189 + M19-C ×33"),
    ('tests/unit/approval-kinds.test.ts',
     "expect(allTools.length).toBe(243) // M40 PAY: +create_supplier_bill +5 cancel tools // 189 + M19-C ×33",
     "expect(allTools.length).toBe(246) // M42 INV: +create_stock_take +record_stock_counts +advance_stock_take // 189 + M19-C ×33"),
]

for path, old, new in FIXES:
    with io.open(path, encoding='utf-8') as f:
        s = f.read()
    if old not in s:
        print('SKIP (not found):', path)
        continue
    s = s.replace(old, new)
    with io.open(path, 'w', encoding='utf-8') as f:
        f.write(s)
    print('fixed', path)
print('done')
