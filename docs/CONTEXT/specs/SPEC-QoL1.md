# SPEC-QoL1 — Agent/Chat QoL Survey & Fix Plan (the post-M29 quality pass)

> Session 2026-08-31. A full Quality-of-Life survey of the chatbot stack —
> the agent loop, the approval door, the panel UX, and the prompt/registry
> contract — run after the third six-task run (M24–M29) closed. Every
> finding below was **verified against the working tree** (file:line
> evidence + gates run), not inferred. Frozen before the fix code (the
> P0 restore is the one exception: the suite was red, restored same-day
> from `cbd7c91^` verbatim).

## 1. Context & method

**Surveyed surface** (the whole "chat can run the ERP" path):

| Layer | Files | LOC |
|---|---|---|
| Agent loop + SSE | `src/app/api/agent/route.ts` | 415 |
| Approval door | `src/app/api/agent/approve/route.ts` | 49 |
| Chat UI | `src/components/agent/agent-panel.tsx` (+ provider) | 678 + 62 |
| Tool registry | `src/lib/agent/tools.ts` | 2801 |
| System prompt | `src/lib/agent/prompt.ts` | 130 |
| Arg coercion | `src/lib/agent/parse-with-coercion.ts` | 62 |
| Documents | `src/lib/agent/docExtract.ts` | 105 |
| Voice | `src/lib/agent/voice.ts` | 139 |
| Upload door | `src/app/api/upload/route.ts` | 83 |

**Verification method.** Read every file end-to-end; cross-checked claims
against the four project gates (`vitest run`, `context_check.sh`,
`eval_routing.mjs --static`, `tsc`); wrote one-off probes
(`scripts/qol_prompt_sync.mjs` — prompt↔registry tool-name diff);
inspected git history (prompt.ts blame, `cbd7c91` contents, unreachable
objects) and dependency usage (`react-markdown` grep).

**Baseline at survey start (2026-08-31):**
- `cbd7c91` (the 4-hours-prior commit, message = a bare UUID) had
  **deleted `src/app/api/upload/route.ts`** → vitest suite RED
  (`upload-route.test.ts` import failure, 1009/1016 passing),
  `context_check.sh` DRIFT ×2 (guarded routes 8→7; eval report artifact
  missing after the env reset).
- **Fixed same session (P0-1):** route restored verbatim from
  `cbd7c91^` → **1016/1016 vitest, context_check 560/560 NO DRIFT,
  eval --static PASS, tsc src/ 0** (27 residual errors are stale
  `scripts/*.ts` — P3-10, not core code).

**What the survey did NOT find** (balance): the two-door approval
architecture (plan → human approve → `runCommit`) is sound; the
`clientGone` SSE disconnect guard and the `parseWithCoercion` idea are
genuinely good patterns — they are *mis-wired*, not wrong (P1-1).
`eval_routing` (50-prompt golden set + static gate) is a strong safety
net that makes most of the fixes below cheap to validate.

## 2. Findings register

Severity: **P0** broken now · **P1** correctness/safety of the chat loop ·
**P2** UX quality-of-life · **P3** perf/cost/hygiene. Each carries its
evidence; every one was reproduced or read in source this session.

### P0 — broken at survey time

**P0-1 · `/api/upload` deleted while everything still calls it — FIXED.**
`cbd7c91` deleted the route but `agent-panel.tsx:329` POSTs to it
(paperclip flow → 404 → HTML body → `res.json()` throws → ugly toast),
`tests/unit/upload-route.test.ts:21` imports it (suite red),
`api-guard.ts` + `tools.ts:1109` + the prompt §5 all document it.
Restore = `git show cbd7c91^:src/app/api/upload/route.ts` (done, 83
lines, SPEC-M3 §12 contract, 7/7 tests). The commit message (a bare
UUID) plus a stray `bun.lock` +3 (jsqr registration) and a `db/custom.db`
blob suggest an accidental `git add -A` snapshot — **PITFALLS candidate:
never commit with generated message after `add -A`.**

### P1 — chat-loop correctness

**P1-1 · The approval door executes RAW args; the proposal door executes
COERCED args — the exact bug `parse-with-coercion.ts` was built to
prevent.** Evidence chain:
- `route.ts:322-330` executes tools with `parsed.value` (zod-validated +
  string→number/boolean coercion + `.default()` applied);
- but `route.ts:307-375` sends `args` (the raw normalized object) on
  `tool-call-start`/`tool-call-end`, and persists `parsed.value` only in
  the AgentTurn audit row (`tools.ts` contract vs stream mismatch);
- `agent-panel.tsx:352-360` posts `{toolName, args: pending.args}` =
  the raw args;
- `approve/route.ts:25` calls `t.execute(args, actor)` with **no zod
  validation at all**.
Consequences: a plan proposed with coerced args (qty `"5000"` → `5000`,
schema defaults applied) can commit with the un-coerced, default-less
raw args — numbers as strings, missing defaulted enums. The module
header (`parse-with-coercion.ts:5-6`) *claims* it is "Shared by
/api/agent (proposal step) AND /api/agent/approve (commit step)" — it is
not; worse, `route.ts:112-168` carries a **60-line inline duplicate** of
the same function, so the two copies can drift silently.

**P1-2 · Malformed tool-call JSON kills the whole turn.**
`route.ts:304` `JSON.parse(tc.function.arguments || '{}')` throws on a
truncated/malformed model emission → the outer catch ends the SSE stream
with `Agent error: Unexpected token…`. The model never sees a tool
result it could self-correct from; the user loses the turn. The whole
loop already has a pattern for feeding errors back
(`{error: 'Unknown tool'}`, `Invalid arguments for …`) — malformed JSON
should get the same treatment, not stream death.

**P1-3 · Approval has no correlation to the plan the user saw (TOCTOU) +
marks ALL pending turns approved.** `approve/route.ts:25-38`:
- it **re-runs** `t.execute()` to regenerate the plan — between proposal
  and approval another session may have committed (doc numbers shift:
  user approves "PO-0007", commit creates PO-0008) with zero guard
  comparing regenerated vs displayed plan. The `ToolResult.plan`
  contract even has an unused `approvalId` field
  (`tools.ts:135-141`) — the correlation hook was designed, never wired;
- `updateMany({where: {approved: false, userId}})` stamps **every**
  pending turn of the user as approved, not the one approved.

**P1-4 · Pre-tool narration is silently overwritten in the panel.**
`agent-panel.tsx:245` resets `currentTextBuffer = ''` on
`tool-call-start`, and `text-delta` *replaces* the message text
(`agent-panel.tsx:232-243`). A step-1 "Let me check the open orders…"
followed by a tool call and step-2 summary text renders **only** the
step-2 text — the model's narration before tools vanishes from the
transcript.

### P2 — chat UX quality-of-life

**P2-1 · No real token streaming — and the fake chunks are overhead.**
`route.ts:255` `stream: false`: the turn stalls for the full completion
time with only a spinner; then `route.ts:273` splits the finished text
into 4-char chunks (`msg.content.match(/.{1,4}/g)`) and enqueues them
all in one tick — a typewriter effect with no typing, pure event
overhead. The manual loop is already structured for
`stream: true` + delta forwarding.

**P2-2 · Assistant markdown renders as raw text — while
`react-markdown@^10.1.0` sits unused in package.json.** The prompt
(`prompt.ts:128`) instructs "Use bullet lists for summaries", tables for
ingestion summaries — the panel renders `whitespace-pre-wrap` plain
text (`agent-panel.tsx:444-446`), so users see `-`, `**`, `|---|` soup.
Zero new dependency needed; grep shows zero imports anywhere in src/.

**P2-3 · No transcript persistence.** Messages live in React state
only (`agent-panel.tsx:59`): a page refresh wipes the conversation AND
`pendingApprovals` — an un-approved plan simply disappears (the user
must retype the whole request). The panel survives in-app navigation
(provider-mounted) but not reload.

**P2-4 · "Stop" stops the client, not the server.** `agent-panel.tsx:319-322`
aborts the fetch; the server learns the client is gone only when the
next `send()` throws (`route.ts:187-197`) — the in-flight LLM completion
runs to completion and further steps keep burning tokens until an
enqueue fails. `req.signal` exists on the Request and is never wired
into the OpenAI call.

**P2-5 · Step-budget exhaustion is silent.** `MAX_STEPS = 12`
(`route.ts:40`): when the loop exits on budget, the stream just emits
`finish` (`route.ts:395`) — no notice, no "ask me to continue", the
model never gets a chance to summarize progress. The user sees the
spinner stop mid-task.

**P2-6 · Multi-turn context degrades silently + unbounded history.**
The client re-sends prior turns as text-only pairs
(`agent-panel.tsx:182-187` strips tool calls/results); the server
forwards all of them with no cap (`route.ts:231-239`). Two costs: the
model loses every tool result from earlier turns (the prompt §5-4 even
instructs "re-extract the document if the details are no longer in
context" — a documented workaround for this gap), and long sessions grow
token cost unboundedly.

**P2-7 · The commit outcome is invisible in the transcript.** After
Approve, only a fading toast (`summary.slice(0,60)`,
`agent-panel.tsx:368`) — the tool card never shows committed doc
numbers/state; `/api/agent/approve` returns `committed` data nobody
renders. For an operator mid-ingestion ("SO-1042 created") this is the
one number they need.

**P2-8 · Raw JSON dumps as the data view.** Tool results render as
`JSON.stringify(…, null, 2)` in a 10px `<pre>` with max-h-60
(`agent-panel.tsx:501-506`): no copy button, no table view for arrays of
objects, no truncation flag — a 100-row register is unreadable.

**P2-9 · Unconditional autoscroll.** `agent-panel.tsx:139-144` scrolls
to bottom on every message/streaming tick — if the user scrolled up to
read a result, the stream yanks them back down every delta.

### P3 — perf / cost / hygiene

**P3-1 · Tool specs rebuilt on every request.** `buildToolSpecs()`
(`route.ts:69-85`) runs `zodToJsonSchema` over **219 tools** per POST —
measurable per-request latency for a static payload. Also
`toolsForLlm()` (`tools.ts:2780-2788`) is a second, dead spec builder —
drift risk between two shapes of the same contract.

**P3-2 · Config re-read from disk per request.** `loadZaiConfig()`
(`route.ts:46-67`) probes up to 3 paths per POST; module-level cache
(freshness-checked) is free.

**P3-3 · 219 tool payloads in every completion request.** Every turn
ships ~219 names + descriptions to the LLM (tens of thousands of
tokens). Any fix here (domain-scoped subsets, compact index +
expansion) changes routing behavior → gated behind the full eval, not a
casual patch.

**P3-4 · Prompt↔registry drift (verified).** (a) The prompt's workflow
line mentions `accept_supplier_bill` — **no such tool exists**
(`grep` in tools.ts: only `accept_grn`, `approve_pending`); the model
will call a ghost tool and burn a step on `Unknown tool`.
`scripts/qol_prompt_sync.mjs` (added this session) proves it: 102
prompt-mentioned tokens, 1 missing from the registry. (b)
`PROMPT_VERSION` is still `m10-2026-08-28` although M19's commit
(4923318) made a *semantic* prompt change (the masters line) — the
module's own scheme (`prompt.ts:8-10`) requires a bump on ANY semantic
change; the version chip in the panel now lies about what the prompt
contains.

**P3-5 · `db/custom.db` in git: 64 versions ≈ 150 MB of blobs; `.git` =
83 MB.** The DB-in-git strategy is deliberate (rollback persistence)
but costs ~5.4 MB per milestone and grows forever; needs an explicit
decision (keep / LFS / artifact backup) rather than silent
accumulation.

**P3-6 · List tools cap at `take: 100` with no pagination surface.**
`listAll` (`tools.ts:166-179`) silently caps; `list_orders` has only
status/buyerId filters — past 100 rows the agent is blind and does not
know it. Register-query tools have their own caps — the pagination story
is inconsistent across families.

**P3-7 · No API rate limit.** `requireApiSession` checks auth only;
`MAX_STEPS=12` bounds a turn, not frequency. Internal ERP → low risk,
documented for completeness.

**P3-8 · Dead protocol events.** `text-start`/`text-end`/
`tool-call-args-delta` are declared (`route.ts:23-38`), emitted
partially, and unhandled in the panel switch — the protocol surface
claims more than it does. Tidy or implement.

**P3-9 · AgentTurn audits only successes.** The audit row is written
post-`execute` (`route.ts:331-352`); failed validation/execution turns
leave no trace — debugging "what did the model try" relies on the
client transcript alone.

**P3-10 · 27 tsc errors in stale `scripts/*.ts`** (renamed/removed
Prisma models: `bill`, `flag`, `hsnCode`, `stage`…). The tsc gate covers
`src/` only, so seed/cleanup scripts rot silently and would crash at
runtime.

**P3-11 · Voice is en-IN/ta-IN only** and the TTS confirm loop is a
known deferred item (STATE next-candidates) — echoed here so the QoL
backlog is complete in one place.

## 3. Scope of fixes (the batching)

The findings batch into three milestone-sized chunks, ordered by blast
radius. Every batch keeps the frozen gates green (§5).

**M30 — chat-loop correctness (P1):** P1-1 (coercion wiring + dedupe),
P1-2 (malformed-JSON guard), P1-3 (approval correlation + scoped audit
marking), P1-4 (text-segment accumulation). Highest value: these change
what actually *commits* to the ERP.

**M31 — chat UX (P2-1..9):** true SSE streaming, react-markdown,
transcript persistence, server-side abort, step-budget notice, history
trim + tool-result context carry, committed-outcome card, data view +
copy, smart autoscroll. Ordered within: streaming → markdown →
persistence first (most-felt daily).

**M32 — perf/prompt hygiene (P3-1/2/4/6/8/9/10):** spec caching, config
caching, prompt↔registry sync test + ghost-tool fix + PROMPT_VERSION
bump protocol, list-tool pagination, protocol event tidy, failed-turn
audit, stale-scripts cleanup. P3-3 (payload cost) is **gated on a
design note + full eval**, not part of a casual batch. P3-5 (db-in-git)
is a *decision*, not a patch — surfaced to the owner.

**Out (deferred, with reasons):** rate limiting P3-7 (internal tool,
low risk) · TTS confirm loop (existing next-candidates list) ·
domain-filtered tool payloads (routing-behavior change; needs an eval
A/B design first) · multi-company / barcode (SPEC-M9 §9 residuals,
unrelated to the chat surface).

## 4. Design (per fix)

**D-1 · Coercion single-sourced + carried end-to-end (P1-1).**
- `route.ts` deletes its inline copy; imports
  `parseWithCoercion` from `@/lib/agent/parse-with-coercion` (the module
  header's contract finally becomes true).
- `tool-call-end` (and `tool-call-start`) carry the **parsed** args:
  `args: parsed.value` — the panel then round-trips exactly what the
  proposal executed. `route.ts` audit row already stores `parsed.value`
  (no change). Additive stream-field note: keep raw args under
  `rawArgs` only if a debug need appears; default to parsed.
- `approve/route.ts` validates: `const parsed = parseWithCoercion(t.schema,
  args); if (!parsed.ok) → 400 {error: issues}` then executes
  `parsed.value`. The two doors now execute **identical** inputs.
- `normalizeArgs` (stringified-JSON unwrap) moves beside the coercion
  module (it pre-processes model output; same family, one home).

**D-2 · Malformed-args guard (P1-2).** Wrap the `JSON.parse` in
try/catch; on failure push a tool message
`{error: 'Invalid JSON arguments for <tool>: <message>'}` and
`continue` — the model self-corrects on the next step (mirrors the
existing unknown-tool pattern). No protocol change.

**D-3 · Approval correlation (P1-3).**
- Proposal: `docTool`/write tools keep returning plans; the **route**
  (not the tools) stamps a crypto-random `approvalId` into
  `plan.approvalId` and persists the full plan JSON + args on the
  AgentTurn row (fields exist: `plan`, `toolCalls`).
- Approve: client sends `{toolCallId, approvalId}`; the route loads the
  persisted turn, **verifies the id**, re-runs `plan()` and **compares**
  the regenerated plan to the persisted one (summary + creates/updates
  counts); mismatch → 409 `{error: 'The plan changed since you saw it —
  review and re-approve'}`. Match (or id-only fast path) → `runCommit`.
- Audit: `updateMany` gains the correlation filter (the turn's own id /
  approvalId) — only the approved row flips to approved.
- Rollback path: approving an already-approved id → 409 idempotency
  error, not double-commit.

**D-4 · Text segments accumulate (P1-4).** Panel: keep
`segments: string[]`; `text-delta` appends to the last; `tool-call-start`
pushes a new segment; render `segments.join('\n\n')`. Server unchanged.

**D-5 · True streaming (P2-1).** `client.chat.completions.create({stream:
true})`; forward each `choices[0].delta.content` as `text-delta`
(preserve the per-step text event framing); tool-call deltas accumulate
and emit on completion. The fake `.{1,4}` chunking is deleted. The
disconnect guard already swallows enqueue-after-close — streaming makes
it *more* effective (detects gone-client sooner). maxDuration 60 stays.

**D-6 · Markdown (P2-2).** `agent-panel.tsx` renders assistant text
through `react-markdown` (dep already present; zero new packages) with a
tight prose styling (`text-sm text-slate-800`, compact lists/tables).
User bubbles stay plain. Sanitization: react-markdown renders to React
elements (no raw HTML by default) — keep `rehype-raw` OUT.

**D-7 · Transcript persistence (P2-3).** Persist
`{messages, pendingApprovals}` to `localStorage` (`fo.agentTranscript`,
session-scoped by a stored sessionId; capped at last ~50 messages);
restore on mount; "Clear conversation" button (new — also addresses
unbounded panel state). Pending approvals restore exactly (they carry
everything needed for the approve POST).

**D-8 · Server-side abort (P2-4).** The ReadableStream `start` closure
subscribes to `req.signal`'s abort event → `clientGone = true` + abort
the in-flight OpenAI request (`signal` option / AbortController). Stop
button then actually stops billing.

**D-9 · Step-budget notice (P2-5).** When the loop exits on budget
(`step === MAX_STEPS` with pending tool activity), emit
`{type:'notice', code:'step-budget', …}`; panel renders an inline amber
note "Reached the 12-step budget — say 'continue' to resume." The final
model turn already flows normally otherwise.

**D-10 · History trim + context carry (P2-6).** Server caps incoming
history to the last 20 messages (older turns summarized client-side
later if needed). Include the immediately-previous turn's tool
call/result *summaries* (name + text, not full JSON) in the outgoing
context — the "re-extract the document" workaround becomes rare.

**D-11 · Committed-outcome card (P2-7).** `/api/agent/approve` response
already carries `committed`; on success the panel flips the tool card to
a `committed` state (green ✓ + the commit's created doc numbers) instead
of relying on the toast.

**D-12 · Data view + copy (P2-8).** Arrays of objects render as a
compact table (first ~6 keys) with "Copy JSON" (clipboard + toast);
>100-row arrays show count + first page + copy-all. Keep the raw `<pre>`
as the "advanced" expand.

**D-13 · Smart autoscroll (P2-9).** Track `scrollTop` proximity
(≤~80px from bottom = "sticky"); only auto-scroll when sticky.

**D-14 · Caching (P3-1/2).** `buildToolSpecs` result memoized at module
scope (tools are static; invalidate manually on registry change).
`loadZaiConfig` cached with mtime check. Delete dead `toolsForLlm()`.

**D-15 · Prompt hygiene (P3-4).** (a) NEW unit test
`prompt-registry-sync.test.ts` — every tool-ish token in SYSTEM_PROMPT
resolves in `allTools` and vice versa for the families the prompt
enumerates (generalize `scripts/qol_prompt_sync.mjs`, which stays as a
dev CLI). (b) Remove `accept_supplier_bill` from the prompt (the
supplier-bill acceptance rides `approve_pending` kinds —
`approval-kinds.ts`), or register the tool — prefer prompt-side fix.
(c) Bump `PROMPT_VERSION` per scheme (→ `qol1-2026-08-31`), run the
**full** eval per the M10 protocol, stamp the new version.

**D-16 · List-tool pagination (P3-6).** Add `{limit?, offset?, q?}` to
`listAll`-family tools (default 100, max 500) + a `truncated: true`
flag in the result json so the model *knows* to page. Register-query
tools follow in a second pass (they have their own services).

**D-17 · Failed-turn audit (P3-9).** Validation/execution failures also
write an AgentTurn row (`result: 'ERROR: …'`, `approved: false`) —
`.catch(() => {})` becomes `.catch(log)` at minimum.

## 5. Tests & acceptance gates

**Per-fix additions (target ~1050+ vitest by M32 close):**
- `agent-route.test.ts` **NEW** — first unit coverage of the loop
  itself: parseWithCoercion wiring (string-qty plan → approve commits
  the SAME coerced number — the P1-1 regression pin), malformed-args
  guard (turn survives, model receives error tool-result),
  step-budget notice, history trim, abort-signal propagation (mocked
  client). The loop's testability may require extracting the core into
  `src/lib/agent/turn.ts` (pure-ish over injected LLM client) — allowed
  if route.ts stays a thin wrapper (route files may not export
  arbitrary symbols; see SPEC-M10).
- `approval-correlation.test.ts` — approve with stale/mismatched
  approvalId → 409; double-approve → 409; only the matched AgentTurn
  flips approved.
- `prompt-registry-sync.test.ts` — the D-15 drift pin (fails on any
  ghost tool mention).
- Panel: segments accumulation (P1-4), markdown rendering smoke,
  transcript restore, committed-card state, sticky autoscroll.
- Existing suites stay untouched-green: `upload-route` 7/7 (the P0
  restore proof), `agent-actor`, `prompt`, `voice`, `einvoice`.

**Frozen gates every batch must keep green (the repo's own bar):**
`npx vitest run` ≥ previous count, zero red files · `tsc src/` 0 ·
`node scripts/eval_routing.mjs --static` PASS ·
`bash scripts/context_check.sh` NO DRIFT · **full** `eval_routing.mjs`
run on any PROMPT_VERSION change (≥90% gate) · route_smoke suites for
touched surfaces · LIVE browser-verify per the M24-M29 convention.

## 6. Sequencing, risks & deferred

**Order:** M30 (correctness — what commits) → M31 (UX — what it feels
like) → M32 (hygiene — what it costs). M30 alone makes every existing
approval safer without any visible change; M31 changes no commit
semantics; M32 is mechanical.

**Risks & mitigations:**
- *Two-door contract (ADR-001) touch* (D-1/D-3): the agent door and the
  view doors share posting services — coercion changes stay in the
  agent layer only; the M15 "14 commit doors" grep pin must stay honest.
- *SSE protocol additions* (D-5/D-9/D-11): additive events only; the
  panel ignores unknown types already (`switch` default-free).
- *PROMPT_VERSION bump* (D-15): triggers the full-eval protocol by
  design — schedule it as its own task with the report regenerated
  (`download/eval-routing-report.json`, full mode).
- *Streaming* (D-5): the OpenAI SDK delta shape differs from the
  non-stream message shape — accumulate tool_call deltas carefully;
  keep a feature flag (`fo.sseStream` off-switch in AppOption) to
  fall back if a provider quirk appears.

**Deferred (trigger conditions):** tool-payload cost reduction (P3-3)
— only after an eval A/B design exists · rate limiting (P3-7) — if the
ERP ever goes multi-tenant/exposed · `db/custom.db` in git (P3-5) —
owner decision (LFS vs artifact vs accept); until then the cost is
bounded by milestone frequency · TTS confirm loop + more voice langs —
existing STATE next-candidates queue.

**Session-start debts cleared by this survey (already done, pinned by
gates):** /api/upload restored (P0-1) · eval report regenerated
(static mode) · `scripts/qol_prompt_sync.mjs` added as the survey's
reusable probe · this SPEC frozen as the M30-M32 plan.
