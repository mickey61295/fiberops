# SPEC-M10 — Agent Quality Pass (Prompt Versioning + Golden-Set Routing Eval)

> **FROZEN IMPLEMENTATION SPEC.** Written BEFORE any M10 code (rule:
> spec-before-code, `docs/CONTEXT/00-START-HERE.md` #3). A session with ZERO
> chat context implements M10 correctly from this file alone.
> Lineage: SPEC-M9 §9-P1 item 1 ("Agent quality pass") + the delivered plan
> document (download/Fiberpro-ERP-超越M7的前瞻性实施与改进计划.pdf, M10
> chapter). STATE next-actions #10 lists it as the top roadmap pick.

## 1. Goal

The 189-tool registry works, but routing accuracy is UNMEASURED and the
system prompt is UNVERSIONED. M10 makes the agent's tool-selection quality
observable and regressible:

1. **PROMPT_VERSION** — every system-prompt revision carries a version
   constant, stamped on every AgentTurn row and every SSE `start` event.
2. **Restructured system prompt** — a 16-domain map, 7 tool-selection
   heuristics, and 8 few-shot routing examples covering the four known
   confusion pairs (order vs PO · GRN receive vs accept · payment vs journal ·
   godown transfer vs despatch), while preserving EVERY normative rule of the
   current prompt (ingestion two-phase protocol, direction rule, 15-stage
   chain, next-step guidance, auto-numbering, GST rules, safety rules).
3. **Description audit** — the ~35 weakest tool descriptions (terse
   `List buyers.`-style list tools) rewritten concrete: what it returns,
   filter args, and one routing cue.
4. **50-prompt golden routing set** — `scripts/eval_routing.mjs`: 50 prompts
   across all 16 domains, each asserting the expected tool appears in the
   agent's tool-call stream. `--static` mode validates structure without LLM
   calls; full mode scores live routing accuracy (gate ≥ 90%).
5. **Session-protocol wiring** — the static structural gate runs every
   session; the full LLM run is REQUIRED whenever PROMPT_VERSION changes.

## 2. Contracts

### C1 — Prompt module (`src/lib/agent/prompt.ts`, NEW)

```
export const PROMPT_VERSION = 'm10-2026-08-28'   // ^m\d{2}(\.\d+)?-\d{4}-\d{2}-\d{2}$
export const SYSTEM_PROMPT: string               // the restructured prompt
```

- Lives OUTSIDE `route.ts` (App-Router route files may not export arbitrary
  constants — Next validates route exports). `route.ts` imports both.
- Version scheme: `m<milestone>.<rev>-YYYY-MM-DD`; bump on ANY semantic
  prompt change. (The old drift note's phantom `v5-2026-08-26` stays
  historical — this is a NEW lineage, not a restoration.)
- Prompt section order: identity → §1 domain map (16) → §2 heuristics (7) →
  §3 few-shots (8) → §4 write-tool protocol (plan/approve/commit + the
  "never say use the UI" rule) → §5 document ingestion (verbatim current
  contract) → §6 the 15-stage chain + next-step rules (verbatim) → §7 safety
  rules & conventions (GST, ₹, FY, godowns, departments — verbatim) → §8
  number auto-assignment (verbatim) → §9 tone + clarification policy
  (verbatim). The two raw READ/WRITE tool lists are REPLACED by the domain
  map (all 189 tools still reach the model via the API tool specs).

### C2 — Version stamping (3 surfaces)

1. **AgentTurn.promptVersion** — schema ADDS `promptVersion String?`
   (additive; field-additive migration precedent ADR-017). `route.ts`
   stamps it on every tool-executing turn (inside the existing `.catch`,
   observability must never break a turn).
2. **SSE `start` event** — `{ type: 'start', promptVersion: PROMPT_VERSION }`.
3. **agent-panel header** — a small mono chip showing the active version
   (from the start event), so a human always sees which prompt is live.

### C3 — Description audit (tools.ts, NO tool-count change)

- Target: the ~35 shortest descriptions today (12–66 chars: list_buyers,
  list_designs, list_departments, list_seasons, list_yarns, list_fabrics,
  list_sizes, list_accessories, list_merchandisers, list_colours,
  list_govt_holidays, list_godowns, list_styles, list_hsns, list_cut_orders,
  list_employees, list_lots, get_purchase_order, get_cost_sheet,
  list_fin_years, list_exporters, list_debit_notes, list_app_options,
  list_dias, list_parts, list_users, list_user_groups, list_size_groups,
  list_despatches, list_components, get_party_ledger, list_shifts,
  list_lines, get_budget_vs_actual, list_test_parameters …).
- Pattern per description: WHAT it returns (columns) + how to FILTER +
  one routing cue (e.g. "use to resolve a buyer name to its B-#### code
  before creating an order").
- Registry-wide floor: EVERY tool description ≥ 40 chars after the audit
  (pinned by test).
- Pins untouched: tool count stays 189; the context_check tool-counting
  greps (`name:`, `docTool(`, `masterCreateTool('`, `domain:`) are
  count-invariant under description edits.

### C4 — Golden routing set (`scripts/eval_routing.mjs`, NEW)

- 50 entries: `{ id, domain, prompt, expectedTool, why }` — ids unique,
  ≥ 16 distinct domains, every expectedTool exists in the registry.
- Domain distribution (50): orders 4 · procurement 4 · inventory 4 ·
  cutting 2 · production 5 · jobwork 3 · despatch 3 · accounting 6 ·
  costing 2 · quality 2 · hr 2 · masters 5 · workflow 3 · documents 2 ·
  reports 1 · meta 2.
- The four confusion pairs each appear on BOTH sides:
  create_order vs create_purchase_order · receive_grn vs accept_grn ·
  record_payment vs create_journal · transfer_stock vs create_pcs_despatch.
- Write prompts are SELF-SUFFICIENT (all required args in the prompt) so the
  model acts instead of asking; prompts NEVER instruct the tool name.
- **`--static` mode (no LLM, no server)**: resolves every expectedTool
  against `src/lib/agent/tools.ts` SOURCE (inline `name:` + `docTool('`
  first-arg + `masterCreateTool('<slug>'` → `create_<slug_>` +
  `masterUpdateTool('<slug>'` → `update_<slug_>` — the drift-note-#3 rule);
  asserts 50 entries / unique ids / 16 domains / expectedTool existence /
  prompts non-empty. Exit 0 only if ALL pass.
- **Full mode (server + LLM)**: logs in (api-auth fixture), sends each
  prompt as a fresh single-turn conversation to `/api/agent`, collects ALL
  `tool-call-start` names across steps, PASS iff expectedTool ∈ called.
  Write tools return PLANS ONLY (the harness never calls /api/agent/approve
  — zero commits; accept_grn/accept_* likewise plan-only).
  429 handling: the eval_ingest retry pattern (wait + retry, degrade to
  skip-with-mark, never crash).
- Report: `download/eval-routing-report.json` — promptVersion (read from
  prompt.ts), generatedAt, per-prompt rows (prompt, expectedTool,
  calledTools, pass, why), per-domain accuracy, overall accuracy.
- Gate: full mode exit 0 iff accuracy ≥ 90%. First run ESTABLISHES the
  baseline (the spec does not require 90% before the prompt improvements —
  it requires the gate to be armed and the acceptance run to clear it).

### C5 — Tests & pins

- `tests/unit/prompt.test.ts` (NEW): version format regex; 16 domain-map
  headers present; ≥ 8 few-shot `→` examples; the 4 confusion pairs each
  name both tools; ingestion protocol markers (PHASE 1/PHASE 2/DIRECTION
  RULE) preserved; chain markers (15 stages, suggest_next_step, "Next:")
  preserved; auto-numbering rule preserved; every tool description ≥ 40
  chars (registry-wide floor, C3).
- context_check.sh: PROMPT_VERSION check FLIPPED to required (was a
  known-gap NOTE); + file-existence for prompt.ts / eval_routing.mjs /
  eval-routing-report.json; + golden-set count 50; + prompt-test count pin.
- STATE drift note #1 → resolved (PROMPT_VERSION exists, new lineage).
- 00-START-HERE session-end protocol step 1 gains: run
  `node scripts/eval_routing.mjs --static` every session; run FULL mode on
  every PROMPT_VERSION change.

## 3. Out of scope (explicitly)

- Tracker agent-pulse promptVersion display (snapshot contract change —
  M14 candidate with SSE).
- Prompt token-budget optimization beyond the structural rewrite (measure
  first; few-shots capped at 8 by rule).
- Multi-turn eval conversations (golden set is single-turn by design;
  multi-turn ingest quality is eval_ingest.mjs's job, which STAYS).
- Any tool count change (189 stays pinned).

## 4. Acceptance (all must pass)

1. `npx tsc --noEmit` — 0 errors.
2. `npx vitest run` — all green (699 + new prompt tests).
3. `node scripts/eval_routing.mjs --static` — 50/50 structural pass, exit 0.
4. `node scripts/eval_routing.mjs` (server up) — overall accuracy ≥ 90%,
   exit 0, report written to download/eval-routing-report.json with the
   current PROMPT_VERSION.
5. `bash scripts/context_check.sh` — NO DRIFT (pins updated: 385 + new).
6. `bash scripts/route_smoke_m9.sh` + `bash scripts/route_smoke_m7b.sh` —
   regression green (agent surface untouched behaviorally).
7. `npx next build` — EXIT 0.
8. AgentTurn rows carry promptVersion (spot-check via the full-mode eval
   run); agent-panel shows the version chip.
9. Tool count stays 189 in all three pinning tests.

## 5. Risks & mitigations

- **Prompt bloat raises first-token latency** — domain map + heuristics stay
  compact; few-shots hard-capped at 8; the two raw tool lists are REMOVED
  (net length roughly neutral).
- **LLM non-determinism in the eval** — temperature is 0.2 server-side;
  assertion is set-membership across ALL steps (not first-call), tolerant of
  read-before-write validation calls; 429 retries; ≥90% (not 100%) gate.
- **Rate limits on 50 live calls** — sequential run, retry-with-wait, and
  degrade-to-skip marking (skips excluded from the denominator, counted in
  the report).
- **Migration risk** — AgentTurn.promptVersion is nullable-additive; `prisma
  db push` + `generate` + dev-server restart per PITFALLS (stale client).
