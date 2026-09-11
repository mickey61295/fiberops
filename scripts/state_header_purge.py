#!/usr/bin/env python3
"""deep-research session (2026-09-11) — STATE.md stale-header purge (round 2).

The 'Last verified:' header had accumulated a STACK of one-per-session lines
(m53, m41, m37, m28, ... descending) — each session inserted its line but
never removed the previous one. state_header_fix.py already replaced the two
newest; this purges every remaining stale line, keeping only the current
(2026-09-11) one. The removed essays remain preserved verbatim in the
numbered STATE entry ledger below. Audit trail for the docs-only commit."""
from pathlib import Path

P = Path('/home/z/my-project/docs/CONTEXT/01-STATE.md')
lines = P.read_text().split('\n')

idx = [i for i, l in enumerate(lines) if l.startswith('Last verified:')]
print(f'found {len(idx)} header lines at: {idx}')
assert len(idx) >= 1, 'no header lines found?'
keep = idx[0]  # the current 2026-09-11 line (already at position 5/line 6)
assert '2026-09-11' in lines[keep], f'first header is not the new one: {lines[keep][:60]!r}'
removed = idx[1:]
for i in reversed(removed):
    del lines[i]
P.write_text('\n'.join(lines))
print(f'purged {len(removed)} stale header lines; file now {len(lines) - 1} lines')
