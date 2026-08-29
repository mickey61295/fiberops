# GAP ANALYSIS — FiberOps vs original Fiberpro (Tirupur muscle-memory audit)

> **PROVENANCE NOTE**: This is a RECONSTRUCTION. The original audit (session ~Task 16,
> 2026-08-29) was delivered read-only but lost in a sandbox state reset before commit
> (same failure class as the m11-convergence race, PITFALLS #34-era). Content below is
> rebuilt from the session summary + re-verified code evidence. Evidence sources:
> `docs/form-taxonomy.json` (321 legacy forms), `research/REQUIREMENTS.md` (16 modules),
> `PLAN-2.0-MENU-PARITY.md`, live codebase at `c3adb5b`. The `source-erp/` reverse
> directory is GONE from this sandbox — form taxonomy JSON is the surviving evidence.

## §0 Scoreboard (the Pareto truth)

| Surface | Legacy | FiberOps today | Coverage |
|---|---|---|---|
| Menu tree (planned) | 115 | 115 live | 115/115 = 100% (what the parity tracker measures) |
| Legacy form surface | 321 | mapped ≈ 235 | **86 unmapped** |
| Master entities | 52 | 30 (`master-configs/`) | 22 missing |
| Print templates | 3 promised (A4-GST / Large / Cost-bearing) | 1 | order sheet not printable at all |
| Reflex conflicts (verified) | — | 10 | 0 fixed at audit time |

The parity tracker's 115/115 measures the **plan's menu tree**, not the legacy 321-form
surface. That gap between the two denominators is where Tirupur muscle memory lives.

## §1 The 86 unmapped forms — disposition classes

Every gap form got one disposition: **MAP** (build it), **FOLD** (fold into an existing
screen), **DROP** (obsolete - VB6-era plumbing), **DECIDE** (needs user call).

| Cluster | Count | Disposition | Notes |
|---|---|---|---|
| Registers (books) | 21 | MAP (M14) | incl. ALL 5 material inventory ledgers, cutting register, supplier-pending, shift-wages, orderwise-pcs |
| DC (despatch) variants | 10 | FOLD | one DC screen with variant toggles, not 10 screens |
| Misc entries | ~30 | MAP/FOLD mix | frmDefaultRate (rate memory), Excel import, waste receipt, etc. |
| Admin/settings | 12 | MAP | incl. FrmChangePassword |
| Production/wages | 7 | MAP (M14/M15) | |
| Utilities | 4 | DROP/DECIDE | VB6-era backup/repair tools |

## §2 Master data 30/52

Missing ~22, the load-bearing 8: **Bank, Mill, Machine, State, Shade, ThreadType,
CountGroup, Range** (schema.prisma has 65 models but none of these). No `Bank` model is
also why invoices can't print a bank-details block (§3).

## §3 Reports & print gaps (M13)

- `print/PRINT_DOCS` covers 20 doc types but only **1 physical template**; the promised 3
  (A4-GST, Large-format, Cost-bearing) never materialized.
- **Order sheet is completely unprintable** — `'order'` is missing from PRINT_DOCS.
- Invoice print lacks HSN column + bank block (no Bank master, §2).
- No **print-on-save** reflex; no 3-copy (duplicate/triplicate) burst printing.

## §4 Feature gaps → parked at M15

Digest notifications, keypad mode, voice entry, attendance, waste receipt, e-invoice
(mock), barcode, multi-company.

## §5 Behavior-level gaps (the invisible 80%)

Two-step save flows, sidebar single-group accordion (legacy allowed multiple open),
register pagination without keyboard paging, etc.

## §6 The 10 verified reflex conflicts (P0 battlefield)

All 10 verified against live code at audit time:

1. **Enter submits the whole doc** — `doc-screen.tsx` wraps the grid editor in `<form>`;
   Enter in a qty cell fires implicit submit instead of "commit row, spawn next row".
2. **Zero F-keys** — legacy: F2 save / F4 picker / F9 print / Esc back-to-edit. Web app has none.
3. **⌘K = agent panel**, not a command palette (cmdk vendored but unused).
4. **Pickers are mouse-bound** (no keyboard-open, no type-ahead-Enter).
5. **Date fields don't default to today** (legacy always did).
6. **Registers not keyboard-navigable** (no ↑↓ row move, no Enter open, no row-click).
7. **Sidebar single-group accordion** (legacy kept several groups open).
8. **No print-on-save** (legacy: save → print dialog, 3 copies).
9. **Two-step save** (draft → commit) where legacy had one keystroke.
10. **Doc view lacks Cancel/Void/Duplicate** actions.

## §7 Muscle-memory playbook — 10 channels

- **R — Rate memory**: frmDefaultRate equivalent; remember last rate per party×item.
- **C — Counter-book**: grouped ledgers the way counting-house clerks keep them.
- **P — Paper-first**: print-on-save, 3-copy burst, A4-GST/Large/Cost-bearing.
- **D — SMS→digest**: daily WhatsApp/SMS digest replaces legacy SMS bursts.
- **E — Excel paste**: paste tabular clipboard straight into entry grids.
- **K — Keypad**: shop-floor numeric-keypad mode (0-9, Enter, Esc only).
- **V — Voice**: Tamil voice entry for production counters.
- **G — Global jump bar**: `/` (or ⌘K) opens registry jump — cmdk already vendored.
- **H — Holiday calendar**: Tamil Nadu factory calendar driving delivery promises.
- **T — Terminology fidelity**: "Despatch" spelling, party not customer, etc.

## §8 Data-hygiene debt (found, unfixed)

- 29 ghost `legacyForms` strings in menu-registry pointing at forms not in taxonomy.
- Header comment says ITEMS(113) — reality 115.
- Reports header comment says 15 — reality 16.

## §9 Execution order (approved by user: "start with your choice")

- **P0 (now)** — reflex fixes ①–⑧ (pure frontend, days-scale):
  ① Enter adds row in doc-screen (swallow form implicit submit)
  ② F-keys: F2 save / F4 picker / F9 print / Esc back-to-edit
  ③ Date defaults today
  ④ Print button on post-commit card
  ⑤ Register whole-row click + ↑↓/Enter open
  ⑥ "Dispatch" → "Despatch" spelling
  ⑦ Hide tool-name chips
  ⑧ Global `/` jump listener
- **M13** — print & keyboard fidelity: order printing, invoice HSN/bank block, Large +
  Cost-bearing templates, print-on-save + 3-copy, cmdk palette, grid paste (E), rate
  memory (R), doc-view Cancel/Void/Duplicate, change-password.
- **M14** — registry & master long tail: 5 material ledgers + cutting/supplier-pending/
  orderwise-pcs/shift-wages registers; masters +8 (Bank/Mill/Machine/State/Shade/
  ThreadType/CountGroup/Range); closing-stock as-of; counter-book grouping; Tally JSON.
- **M15** — channel integrations: digest (D), keypad (K), voice (V), attendance,
  waste receipt, e-invoice mock, barcode/multi-company decisions, holiday (H).
