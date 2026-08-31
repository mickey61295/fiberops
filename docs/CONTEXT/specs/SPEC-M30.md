# SPEC-M30 — Chat-Loop Correctness (the SPEC-QoL1 P1 batch)

> First fix batch from SPEC-QoL1 (2026-08-31 survey): the four P1 findings
> that change what actually *commits* through the chat door. Frozen before
> code. The one deliberate scope addition: the assistant-message
> double-push bug found during extraction (§2-E) — same file, same blast
> radius, same tests.

## 1. Scope

**In:**
1. **D-1 · One coercion path, both doors.** `parseWithCoercion` +
   `normalizeArgs` live in `src/lib/agent/parse-with-coercion.ts` (the
   module header's claimed contract finally true). The 60-line inline
   duplicate in the agent route is deleted. Tool-call events carry the
   **parsed** args (what the proposal actually executed), and
   `/api/agent/approve` validates + executes `parsed.value` — the two
   doors execute identical inputs.
2. **D-2 · Malformed tool-args guard.** A model emission whose
   `tool_calls[].function.arguments` is not valid JSON no longer kills
   the SSE turn: the loop pushes an error tool-result back to the model
   (mirroring the existing unknown-tool pattern) and continues.
3. **D-3 · Approval correlation.** The proposing loop stamps a
   crypto-random `approvalId` into `plan.approvalId` (the field
   designed in the ToolResult contract, never wired) and persists it on
   the AgentTurn row (additive `AgentTurn.approvalId String?`). The
   approve door requires it, resolves the persisted turn, rejects
   unknown (404) / already-approved (409) / plan-changed (409) ids,
   re-executes with coerced args, compares the regenerated plan to the
   persisted one, commits through the SAME `runCommit` choke point, and
   marks **only that turn** approved (the updateMany is scoped — the
   all-pending bug).
4. **D-4 · Transcript segments.** Panel text segments ACCUMULATE —
   narration before a tool call survives when later text arrives. The
   SSE parsing + transcript reduction move to a pure module
   (`src/lib/agent/turn-events.ts`), unit-tested like `voice.ts`.
5. **E (found during extraction) · assistant double-push fix.** When a
   completion carries BOTH content and tool_calls, the old loop pushed
   TWO assistant messages (a text-only one, then one with tool_calls)
   — duplicated narration corrupting the model's own context. Now ONE
   message with both.
6. **Loop extraction.** The manual agent loop moves from
   `src/app/api/agent/route.ts` into `src/lib/agent/loop.ts`
   (`runAgentTurn`) with an injectable LLM client + persist hook — the
   route becomes thin stream plumbing (SPEC-M10 direction: logic in
   lib, routes thin). Route keeps: guard, config load, OpenAI client,
   ReadableStream/send/safeClose (the M12 disconnect guard pins stay).

**Out (documented):** true token streaming (D-5, M31) · markdown
rendering, persistence, committed cards, smart autoscroll (M31) ·
step-budget notice (M31) · spec caching, prompt ghost-tool fix +
PROMPT_VERSION bump (M32 — the bump triggers the full-eval protocol and
is deliberately NOT mixed into a correctness batch) ·
`route_smoke_m7b/m15` updates ride along (they POST the approve door
without approvalId — the contract change updates them: fixture inserts
the turn row, curl sends the id).

## 2. Design

**A · `parse-with-coercion.ts`** gains `normalizeArgs` (moved verbatim
from the route: unwrap stringified-JSON args) — both doors call
`normalizeArgs` → `parseWithCoercion`.

**B · `loop.ts` — `runAgentTurn({ client, tools, messages, actor,
userText, send, maxSteps?, persistTurn? })`.** The while-loop body is
the current one with the five changes:
- events carry `parsed.ok ? parsed.value : raw args`;
- JSON.parse guarded (D-2): on failure → tool message
  `{error: 'Invalid JSON arguments for <tool>: <msg>'}` +
  tool-call-end with the error; `continue`;
- ONE assistant message per completion (content + tool_calls together);
  text-only push only when there are no tool calls;
- `approvalId = crypto.randomUUID()` stamped when `t.isWrite &&
  result.plan && result.commit`; the stamped plan object is what goes
  to the event stream, the audit row, and (unchanged shape) the model;
- `persistTurn` hook (default: the real `db.agentTurn.create`) so tests
  can collect instead of write.
`PROMPT_VERSION` stamping (start event + AgentTurn rows) moves with the
loop. `MAX_STEPS = 12` moves with the loop (default param).

**C · `approve` route.** Guard → body `{toolName, args, approvalId}` →
tool checks (400 unknown / read-only) → **approvalId required (400)** →
`normalizeArgs` + `parseWithCoercion` (400 with zod issues) → load turn
by `{approvalId, userId}` (404 unknown) → 409 if already approved →
re-execute `parsed.value` → 500 if no commit fn → compare plans
(summary + creates/updates/sideEffects counts; 409 `plan_changed`) →
`runCommit` (the M15 choke point, unchanged) → scoped
`updateMany({approvalId, userId, approved: false})` → `{ success,
committed, summary, approvalId }`.

**D · `turn-events.ts` (pure, panel-free).**
- `splitSseBuffer(buffer)` — `\r\n`-tolerant `\n\n` event splitting,
  returns `{events, rest}`;
- `parseSseData(evt)` — `data:` prefix, `[DONE]`, guarded JSON.parse;
- `TranscriptReducer` — seeded with the panel's current messages;
  `addUserMessage` / `beginAssistant` / `applyEvent(payload)` returning
  fresh immutable state: multi-segment text (segments joined `\n\n`),
  toolCall lifecycle, pending-approval capture including `approvalId`
  from `output.plan.approvalId`. Side effects (401 redirect, toasts,
  `nextFormUrl` navigation, promptVersion chip) stay in the panel.

**E · `agent-panel.tsx`.** The reader loop uses the parser + reducer;
`approve()` posts `{toolName, args, approvalId}`; 404/409 responses
remove the pending card with a specific toast (`already committed` /
`plan changed — ask the agent to re-propose`); network errors keep the
card. `suggest_next_step` nextFormUrl behavior unchanged.

**F · Prisma.** `AgentTurn.approvalId String?` (additive nullable; models
stay 78). db push + generate.

## 3. Tests

1. `tests/unit/agent-loop.test.ts` (fake client + collector): malformed
   args → turn survives, model receives the error tool-result, no
   `error` event; parsed-args-in-events (create_order with string qty →
   numeric in events); double-push regression (one assistant message);
   clientGone unwind; approvalId stamped + persisted (create_party via
   injected persist).
2. `tests/unit/approval-correlation.test.ts` (mocked cookies + real db,
   upload-route pattern): happy path (propose via loop → approve →
   party row + turn approved, scoped); double-approve → 409; unknown →
   404; stale plan (row edited) → 409 + NOT committed; invalid args →
   400; missing approvalId → 400.
3. `tests/unit/turn-events.test.ts`: SSE chunking/CRLF/[DONE]/garbage;
   segment accumulation (text → tool-call → text); pending approval
   capture + approvalId; immutability.
4. Updated smokes: `route_smoke_m7b.sh` + `route_smoke_m15.sh` insert
   the turn fixture and send the approvalId; NEW `route_smoke_m30.sh`
   (live door: proposal through /api/agent is NOT exercised — the unit
   tests own the loop; the smoke covers the approve door 400/404/409
   paths + agent route 401).

## 4. Gates

1016+ vitest (target ~1040) · `tsc src/` 0 · `eval_routing.mjs
--static` PASS (prompt untouched → no full eval required; PROMPT_VERSION
stays `m10-2026-08-28`) · `context_check.sh` NO DRIFT — pins updated:
MAX_STEPS + m10 prompt import/stamp pins point at `loop.ts` (the code
moved); NEW m30 pins (loop, turn-events, approvalId column, approve
guards, 3 test files, SPEC-M30.md) · `route_smoke_m30` green ·
route_smoke_m7b/m15 re-run green after their fixture updates.

## 5. Shipped (filled after implementation)

- (to record: final test counts, gate outputs, bugs found on the way,
  honest deviations from this frozen design)
