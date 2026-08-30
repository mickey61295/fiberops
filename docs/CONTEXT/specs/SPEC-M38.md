# SPEC-M38 — Phase-6B Batch 2: Agent QoL & Screen-Awareness (CHAT-01..12)

Source: docs/PRD/PHASE-6B-REMEDIATION-SPEC.md §5 (the build layer). Evidence layer:
docs/ANALYSIS/2026-08-31-agent-chatbot-qol-study.md (dive 3). Dependencies: HFX-14–19
(M36 render stack), OPS-04 (M37 idempotency) — both shipped.

Owner issues closed: **#2 (conversation-action-unfriendly)** and **#3 (screen-aware
suggestions)**.

## §1 Scope — 12 FRs

| FR | Ship |
|---|---|
| CHAT-01 Outcome events | Panel appends a synthetic user-role event message after approve/reject/commit — it renders as an event chip AND rides the history sent on the next turn, so the model finally SEES what happened to its plan (prompt §4.2d/§6 become satisfiable) |
| CHAT-02 Dynamic context line | `src/lib/agent/context.ts` buildDynamicContext(screen, actor) → one system line: today IST + weekday, user name+role, activeFinYear(), active screen (menu title + docNo), godown roster. route.ts accepts `body.screen:{pathname,docNo?}` and appends the line after SYSTEM_PROMPT |
| CHAT-03 Screen-aware suggestions | Panel usePathname → findItemByRoute (exact) → longest-prefix item for `[id]` routes; empty-state = the item's agentPrompt (76 authored prompts consumable) + up to 3 contextual chips; defaults fixed to real code formats (B-####, STY-####); doc-scoped prompt on `[id]` routes via trailing docNo segment |
| CHAT-04 Post-answer follow-ups | After a read-only answer, 2–3 chips from the current screen's agentTools domain (TOOL_FOLLOWUPS map); click seeds the composer |
| CHAT-05 Plan cards show contents | `src/lib/agent/plan-display.ts` pure helper → field/value rows from plan.creates/updates with ₹ en-IN money formatting, date formatting, line-item rollup ("+N more lines"); the approval card renders a compact table — approving a ₹4-lakh order shows line items, not "Creates: 3 record(s)" |
| CHAT-06 Approve-by-id | tool-call-end carries `turnId` (the AgentTurn row id); Approve POSTs {turnId, idempotencyKey}; the route loads the STORED toolName+args+plan, re-executes plan(), deep-compares fresh plan vs stored plan — identical → commit; drift → 409 "plan changed, re-review" (displayed plan == committed plan, or the user explicitly re-approves); `updateMany(all user turns)` → `update({where:{id:turnId}})`; panel intercepts typed approve/yes/reject phrases when a plan is pending — the phrase resolves the pending plan, never mints a duplicate |
| CHAT-07 Post-commit CTA row | Approve response gains { docNo, cta:{viewUrl, printUrl} } from `src/lib/erp/doc-cta.ts` (docNo-prefix → view route + PRINT_DOCS type); panel renders View / Print buttons on the outcome event card; suggest_next_step already supplies next-stage for read answers |
| CHAT-08 Truthful outcome badges | docTool + masterCreateTool/masterUpdateTool + inline write tools return `{text, error}` on failure — the panel's existing red error chip fires; no failed write badges "ok" |
| CHAT-09 Fuzzy lookup rescue | `src/lib/erp/lookup.ts` resolveByNameOrCode + topCandidates (case-insensitive code+name contains); wired at posting/order.ts buyer+style seams — failures list top-3 "Did you mean" candidates |
| CHAT-10 Bounded master lists | Shared boundedList helper: q (code+name contains, case-insensitive) + take (default 20, cap 100); text reports `total` + `truncated` (model-visible); json stays the rows array (M3 contract); route.ts 8K slice now trims rows array and marks `truncated:true` instead of silently dropping rows |
| CHAT-11 Prompt formatting contract | §9 gains explicit render rules (markdown allowed, headings ≤h3, tables for comparisons, ₹ en-IN, read answers ≤8 lines); §7.3/7.4 hardcoded FY + G1–G3 godowns REPLACED by the dynamic context line; PROMPT_VERSION → m38-2026-08-31; eval --static rerun (full eval on next server session) |
| CHAT-12 Chat polish sweep | Composer autofocus on open; per-message copy button; aborted tool chips → "stopped"; dead SSE events explicitly consumed (documented no-ops); MAX_STEPS exhaustion sends a visible error event; list_orders.buyerId filter honored (buyer name/code contains); humanized tool labels (override map + prettifier) |

## §2 Design decisions

1. **Outcome events are user-role messages** with a `[event]` prefix. The route filters
   history to user/assistant only — a user-role event is the only carrier that both
   renders in-panel AND reaches the model next turn. The panel styles them as system
   chips (slate, not emerald) so the UI doesn't lie about who spoke.
2. **Approve-by-id re-executes plan(), not a serialized commit closure.** Commit fns are
   closures over DB handles — unserializable. The TOCTOU kill is the deep-compare:
   fresh plan vs stored plan (creates/updates data deep-equal). Identical → commit (the
   fresh closure is safe — it writes exactly what was displayed). Drift → 409 + the new
   plan for re-review. Auto-number drift (number taken meanwhile) surfaces as drift —
   honest, and the idempotency key still guards double-click replays.
3. **json shape stability for list tools.** The M3 contract froze json shapes; text is
   ALSO model-visible (route sends {text,json,…} to the model), so `total`/`truncated`
   live in text + the rows array is bounded. Zero shape breakage.
4. **Doc CTA map is prefix-driven** (SO- → /orders/<no>, INV- → /accounts/invoice/<no>,
   …). All view routes resolve by db id OR docNo (verified: order hub, PO, payments);
   the print route resolves by id OR docNo by design (SPEC-M8 §3).
5. **Dead SSE events consumed, not removed** — route_smoke_batch0.sh pins `"finish"`
   and e2e suites parse the stream; removal would churn every consumer for zero gain.
   The panel switch now handles each with a documented no-op.
6. **MAX_STEPS exhaustion**: the while loop exits with finishReason 'tool-calls' on the
   last step — the route now detects it and sends an error event (visible chip) instead
   of a silent `finish`.
7. **Screen context assembly is server-side** so the model can trust one source; the
   client only reports pathname (+docNo it already knows from [id] routes). docNo is
   also derived server-side from the trailing path segment when it matches a doc-number
   pattern — both doors, no client coupling.

## §3 Tests

`tests/pipeline/chat-batch2.test.ts` — behavioral pins per FR:
- context.ts: dynamic line contains IST date, FY, screen title, docNo extraction
- plan-display.ts: money/date/line-rollup formatting pins
- doc-cta.ts: prefix → view/print URLs for the main families
- lookup.ts: case-insensitive resolution + top-3 candidates
- tools: docTool error field; bounded list (q/take/total/truncated); list_orders buyerId
- approve route: turnId approve marks ONLY that turn; drift → 409; stored-plan equality
- prompt: §9 contract present, hardcoded FY/godowns gone, PROMPT_VERSION bumped
- tool-labels: override map + prettifier pins

## §4 Gates

vitest all-pass · tsc src 0 · eval --static 100% · context_check NO DRIFT ·
scripts/route_smoke_batch2.sh (live: dynamic context in stream, outcome event after
approve, plan contents table, screen-aware suggestions) · LIVE browser-verified.

## §5 Out (logged, not spec'd here)

Multi-turn tool-result amnesia (history filtered to text) — the follow-up lane after
this batch. Fuzzy rescue beyond the order seams (party/payment/style lookups in other
postings) — helper is shared, adoption is incremental. Approval Inbox buttons (PRD
P0-5) — CHAT-06 is the substrate.
