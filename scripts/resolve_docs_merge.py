#!/usr/bin/env python3
"""Resolve the doc conflicts of the side_quest merge:
- docs/CONTEXT/01-STATE.md  (header line + tail entries renumbered)
- docs/CONTEXT/03-PITFALLS.md (renumber branch pitfalls #47/#48 -> #48/#49)
- worklog.md (keep both sides' entries in sequence)

Numbering decision (documented in the merge commit):
- "M44" collided: main's M44 = Module K costing (keeps it); the branch's
  M44 FY hotfix is kept as SPEC-M44-FY-HOTFIX.md, STATE entry #49.
- M45 (wage recon) and M46 (payroll) were free on main and stand.
- STATE entries: branch #48/#49/#50 -> #49/#50/#51; new merge entry #52.
- PITFALLS: branch #47/#48 -> #48/#49 (main's #47 stands).
"""

STATE = "docs/CONTEXT/01-STATE.md"
PITFALLS = "docs/CONTEXT/03-PITFALLS.md"
WORKLOG = "worklog.md"

MARK_START = "<<<<<<< HEAD\n"
MARK_MID = "\n=======\n"
MARK_END = "\n>>>>>>> origin/side_quest\n"


def split_hunks(text: str):
    """Yield (start_idx, head, side, end_idx) for each conflict hunk."""
    out = []
    pos = 0
    while True:
        i = text.find(MARK_START, pos)
        if i < 0:
            break
        j = text.find(MARK_MID, i)
        k = text.find(MARK_END, j)
        if j < 0 or k < 0:
            raise SystemExit("malformed conflict markers")
        head = text[i + len(MARK_START) : j]
        side = text[j + len(MARK_MID) : k]
        out.append((i, head, side, k + len(MARK_END)))
        pos = k + len(MARK_END)
    return out


# ---------------------------------------------------------------- STATE.md
def resolve_state() -> None:
    with open(STATE) as fh:
        text = fh.read()
    hunks = split_hunks(text)
    assert len(hunks) == 2, f"STATE expected 2 hunks, got {len(hunks)}"

    # ---- hunk 1: the "Last verified" header chain ----
    i, head, side, k = hunks[0]
    main_line = head.rstrip("\n")            # "Last verified: 2026-09-03 (session: m44 — ..."
    sq_line = side.rstrip("\n")              # "Last verified: 2026-09-03 (session: m46 — ..."
    # demote both historical lines
    main_hist = "Historical: " + main_line[len("Last verified: "):]
    sq_hist = "Historical: " + sq_line[len("Last verified: ") :]
    merged_header = (
        "Last verified: 2026-09-06 (session: m47-merge — THE SIDE_QUEST MERGE SHIPPED: "
        "origin/main (M44 Module K costing depth) + the side_quest branch (M44-FY "
        "fiscal-year single-source hotfix, M45 wage reconciliation L-01 — the last "
        "structural P0 closed, M46 payroll run + payslip L-02+L-05) unified on main. "
        "Merged pins: tools 253→257 (M44 CST quartet + M45 get_operator_statement + "
        "M46 payroll trio), models 88→90 (+PayrollRun +PayrollLine), menu 140→142, "
        "live routes 175→178, register services 41→42 (+cost-compare), masters 42 "
        "(+cost-component), schemas 45, posting 44, print families 25 (+payslip), "
        "regcfg 30 (+operator-statement +payroll). PROMPT_VERSION m47-2026-09-06 "
        "(the m44 §Costing + m46 §1-HR prompt lines combined). NUMBERING NOTE: both "
        "lines independently used M44 — main keeps M44 = Module K costing; the "
        "branch's FY hotfix spec lives at SPEC-M44-FY-HOTFIX.md (STATE #49); M45/M46 "
        "were free on main and stand. Branch STATE entries #48/#49/#50 renumbered "
        "#49/#50/#51; branch PITFALLS #47/#48 renumbered #48/#49. Gates re-run on "
        "the merged tree: context_check 606/606 NO DRIFT, full vitest, tsc src 0, "
        "eval --static (see the merge commit + worklog for the numbers). "
        f"{sq_hist} {main_hist}"
    )
    text = text[:i] + merged_header + "\n" + text[k:]

    # ---- hunk 2: the tail numbered entries ----
    hunks = split_hunks(text)
    i, head, side, k = hunks[0]
    main_entry = head.rstrip("\n")           # blank line + "48. M44 costing..."
    sq_entries = side.rstrip("\n")           # "48. M44-FY ... 49. M45 ... 50. M46 ..."

    # renumber the branch entries 48/49/50 -> 49/50/51 (do 50 first to avoid clobber)
    sq_entries = sq_entries.replace(
        "48. **M44 DONE — FY SINGLE-SOURCE HOTFIX SHIPPED**",
        "49. **M44-FY DONE — FY SINGLE-SOURCE HOTFIX SHIPPED** "
        "(branch-numbered M44 / STATE #48; renumbered in the 2026-09-06 merge — "
        "main's #48 is Module K costing; the spec file is SPEC-M44-FY-HOTFIX.md)",
        1,
    )
    sq_entries = sq_entries.replace(
        "49. **M45 DONE —", "50. **M45 DONE —", 1
    )
    sq_entries = sq_entries.replace(
        "50. **M46 DONE —", "51. **M46 DONE —", 1
    )
    # fix in-prose pitfall references that shifted (+1) in the merged tree
    sq_entries = sq_entries.replace(
        "PITFALLS #47: WAL sidecar", "PITFALLS #48: WAL sidecar", 1
    )
    sq_entries = sq_entries.replace(
        "PITFALLS #48: the M45 commit", "PITFALLS #49: the M45 commit", 1
    )
    # the M45 entry header may also cite "PITFALLS #47 duet" — normalize if present
    sq_entries = sq_entries.replace("PITFALLS #47 duet", "PITFALLS #48 duet")

    merge_entry = """
52. **M47-MERGE DONE — THE SIDE_QUEST MERGE SHIPPED (branch unified onto main)** (2026-09-06): the side_quest agent's 5 commits (8410188 spec-M44-FY, a7d8dd1 M44-FY hotfix, 439bcad spec-M45, 87a4a3b M45 wage reconciliation, 6c1be98 M46 payroll run + payslip — built on the m43 tip while main advanced its own M44 costing) merged into main's 4 (8ffc7c1, e06c4e7, 2500864, 6946379). WHAT THE BRANCH SHIPPED: (1) M44-FY — the 2027-04-01 fiscal-year time bomb defused (activeFinYear() single source, ~24 posting literals retired, seed ANCHOR_YEAR, fy-hotfix-m44.test.ts 11/11); (2) M45 — Employee 1:1 employee-party + ensureEmployeeParty + per-operator wage bills carry partyId + THE OPERATOR STATEMENT register (+csv, get_operator_statement) + THE REAL party-ledger receipt double-count bug fixed (journals term = journal|contra only — live CUS001 probe was −₹34M absurd vs true ≈ ₹4.3M), payroll-l01.test.ts 15/15; (3) M46 — PayrollRun PR-#### + PayrollLine + planPayrollRun/planPayrollRunCommit (one wage journal PER LINE with partyId, V-#### minted in-tx; piece = Σ production entries, daily = weighted attendance × dailyWage, 'half' = 0.5) + THE PAYSLIP print door (committed-only, UAN/aadhaar masked, composite 'PR-####/EMP-####' ids) + Employee L-05 payout fields (bank/IFSC/UPI/UAN/aadhaar) + /hr/payroll register+view+actions + create/commit_payroll_run + get_payroll_runs tools + menu 142 + LIVE_ROUTES 178, payroll-l02.test.ts 29/29. MERGE MECHANICS: 22 conflicts resolved (db/custom.db = main's blob + db push for the 2 new models; SPEC-M44.md add/add = main's costing spec + branch's FY spec preserved as SPEC-M44-FY-HOTFIX.md; test pins 253→257 ×15 files + PROMPT_VERSION→m47-2026-09-06 ×4; context_check pins recomputed from the merged tree; STATE/PITFALLS/worklog renumbered as above). Gates on the merged tree: context_check 606/606 NO DRIFT · vitest (numbers in the merge commit) · tsc src 0 · eval --static PASS. Next per the remediation spec §12/§16: L-03 statutory (PF/ESI/PT/LWF), L-04 attendance depth, L-06 shiftWages (ADR-019), or Module M final accounts; PAY-08/PRC-09/PRG-02 owner decisions open."""

    text = text[:i] + main_entry + "\n" + sq_entries + merge_entry + text[k:]

    with open(STATE, "w") as fh:
        fh.write(text)
    print(f"{STATE}: header + tail resolved")


# ------------------------------------------------------------- PITFALLS.md
def resolve_pitfalls() -> None:
    with open(PITFALLS) as fh:
        text = fh.read()
    hunks = split_hunks(text)
    assert len(hunks) == 1, f"PITFALLS expected 1 hunk, got {len(hunks)}"
    i, head, side, k = hunks[0]
    main_entry = head.rstrip("\n")   # "## #47 — M44 duet ..." (stays #47)
    sq_entries = side.rstrip("\n")   # "## #47 — M45 duet ... ## #48 — M46 ..."
    sq_entries = sq_entries.replace(
        "## #47 — M45 duet:",
        "## #48 — M45 duet (branch-numbered #47; renumbered in the 2026-09-06 merge — main's #47 is the M44 costing duet):",
        1,
    )
    sq_entries = sq_entries.replace(
        "## #48 — M46:",
        "## #49 — M46 (branch-numbered #48; renumbered in the 2026-09-06 merge):",
        1,
    )
    text = text[:i] + main_entry + "\n\n" + sq_entries + text[k:]
    with open(PITFALLS, "w") as fh:
        fh.write(text)
    print(f"{PITFALLS}: 1 hunk resolved (main #47 + branch #48/#49)")


# ---------------------------------------------------------------- worklog.md
def resolve_worklog() -> None:
    with open(WORKLOG) as fh:
        text = fh.read()
    hunks = split_hunks(text)
    assert len(hunks) == 1, f"worklog expected 1 hunk, got {len(hunks)}"
    i, head, side, k = hunks[0]
    main_entries = head.rstrip("\n")
    sq_entries = side.rstrip("\n")
    text = text[:i] + main_entries + "\n" + sq_entries + text[k:]
    with open(WORKLOG, "w") as fh:
        fh.write(text)
    print(f"{WORKLOG}: 1 hunk resolved (both sides kept in sequence)")


if __name__ == "__main__":
    resolve_state()
    resolve_pitfalls()
    resolve_worklog()
