#!/usr/bin/env python3
"""Resolve the side_quest merge conflicts in test files.

Patterns:
1. PROMPT_VERSION pins: m44-2026-09-03 (main) vs m46-2026-09-03 (side_quest)
   -> 'm47-2026-09-06' (the merge version: m44 costing lines + m46 payroll lines)
2. startsWith('m44')/startsWith('m46') -> startsWith('m47')
3. allTools.length 253 (both sides, different comments) -> 257 with merged comment
4. prg-batch7 it() titles -> merged wording
"""
import re
import sys

MERGE_COMMENT = (
    " // M47 MERGE: 253 (M44 CST +create/update/list_cost_component +get_order_cost) "
    "+ M45 L-01 +get_operator_statement + M46 L-02 +create/commit_payroll_run +get_payroll_runs"
)

FILES = [
    "tests/pipeline/chat-batch2.test.ts",
    "tests/pipeline/inv-batch6.test.ts",
    "tests/pipeline/prg-batch7.test.ts",
    "tests/pipeline/qol1-reconcile.test.ts",
    "tests/unit/agent-actor.test.ts",
    "tests/unit/approval-kinds.test.ts",
    "tests/unit/attendance.test.ts",
    "tests/unit/digest-holidays.test.ts",
    "tests/unit/einvoice.test.ts",
    "tests/unit/holidays.test.ts",
    "tests/unit/print-barcode.test.ts",
    "tests/unit/prompt.test.ts",
    "tests/unit/register-configs.test.ts",
    "tests/unit/tracker.test.ts",
    "tests/unit/waste-receipt.test.ts",
]

HUNK_RE = re.compile(
    r"<<<<<<< HEAD\n(.*?)=======\n(.*?)>>>>>>> origin/side_quest\n", re.DOTALL
)


def resolve_hunk(head: str, side: str) -> str:
    """Return the resolved replacement text for one conflict hunk."""
    # --- pattern 4: prg-batch7 it() title + tool count ---
    if "the new tools are registered" in head:
        return (
            "    it('the new tools are registered: 257 = 249 at M43 + the M44 CST quartet "
            "+ the M45/M46 payroll quartet (side_quest)', () => {\n"
            "      expect(allTools.length).toBe(257) // M44 CST: +create/update/list_cost_component +get_order_cost "
            "// M45 L-01: +get_operator_statement // M46 L-02: +create/commit/get_payroll_runs\n"
        )
    # --- pattern: PROMPT_VERSION two-line hunk (prg-batch7 / others) ---
    if "PROMPT_VERSION" in head and "PROMPT_VERSION" in side:
        out_lines = []
        for line in head.splitlines():
            line = line.replace("'m44-2026-09-03'", "'m47-2026-09-06'")
            if "startsWith('m44')" in line:
                line = line.replace("startsWith('m44')", "startsWith('m47')")
                line = re.sub(r"// .*$", "// M47 = the side_quest merge (m44 costing + m46 payroll lines)", line)
            out_lines.append(line)
        return "\n".join(out_lines) + "\n"
    # --- pattern 3: tools count 253 -> 257 (keep HEAD line, fix value + comment) ---
    if "toBe(253)" in head and "toBe(253)" in side:
        line = head.rstrip("\n")
        line = line.replace("toBe(253)", "toBe(257)")
        # rewrite the leading comment segment: ' // M44 CST: ...' -> merged comment
        line = re.sub(
            r"(\s*expect\(allTools\.length\)\.toBe\(257\))\s*//\s*M44 CST:.*",
            lambda m: m.group(1) + MERGE_COMMENT,
            line,
        )
        # keep any trailing identical segments after the M43 PRG part (none in practice, they were replaced)
        return line + "\n"
    # fallback: prefer HEAD (should not happen)
    print(f"  !! unrecognized hunk pattern, keeping HEAD:\n{head}", file=sys.stderr)
    return head


def main() -> None:
    for path in FILES:
        with open(path) as fh:
            text = fh.read()
        n = 0

        def _sub(m):
            nonlocal n
            n += 1
            return resolve_hunk(m.group(1), m.group(2))

        text = HUNK_RE.sub(_sub, text)
        with open(path, "w") as fh:
            fh.write(text)
        print(f"{path}: {n} hunk(s) resolved")


if __name__ == "__main__":
    main()
