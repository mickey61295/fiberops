#!/usr/bin/env python3
"""deep-research session (2026-09-11) — STATE.md header repair.

The 'Last verified:' header had TWO stale stacked lines (line 6 = the m53-era
essay, line 7 = the older m41-era line; the m54/m55/m56 sessions appended tail
entries but never refreshed the header). This script replaces both with the
current session's one-line verdict. Audit trail for the docs-only commit."""
from pathlib import Path

P = Path('/home/z/my-project/docs/CONTEXT/01-STATE.md')
NEW = (
    "Last verified: 2026-09-11 (session: deep-research — the terminal audit: gates re-verified LIVE "
    "(vitest 1636/1636 with a flake caveat — 4-5 M54-era tests fail in ~2 of 5 full-suite runs, "
    "16/16 in isolation; cross-file interference suspected, stabilization queued; tsc src 0; "
    "context_check 606/606 NO DRIFT; eval m56/266 PASS; route_smoke_m56 26/26 LIVE; OPS-01 "
    "restore-verify ok) · the §17 ledger CORRECTED (§17-5/6/7 restored to the open list — no ADRs "
    "existed, dropped silently by the M55/M56-era rewrites; §17-8 marked resolved-by-construction; "
    "§17-2/3/4 confirmed via ADR-022/020/021) · Phase-6 Modules A-J confirmed as the unbuilt future "
    "program (PHASE-6.md: full ~19 batches / minimal path 5 batches, §14))."
)

lines = P.read_text().split('\n')
assert lines[5].startswith('Last verified: 2026-09-07'), f'unexpected line 6: {lines[5][:80]!r}'
assert lines[6].startswith('Last verified: 2026-09-01'), f'unexpected line 7: {lines[6][:80]!r}'
print('line 8 preview (context safety):', lines[7][:100])
lines[5:7] = [NEW]
P.write_text('\n'.join(lines))
print(f'header replaced; file now {len(lines) - 1} lines')
