# Deep Dive 3 — Agent/Chatbot QoL Study: Rendering, Conversation Flow, Screen-Awareness

Date: 2026-08-31 · Status: Evidence audit (read-only, no code changed) · Trigger: owner —
*"1. Text rendered is not formatted properly. 2. It feels less conversation-based action friendly.
3. Wouldn't the AI be better with prompt suggestions based on the screen or form the app is
currently in?"*

Method: two parallel code auditors (panel/UI/rendering; brain/prompt/tools/context) + main-agent
re-verification of every P0/P1 claim against source (all quoted lines re-read). Known items from
the Phase-6 PRD §2.2 P0 queue were re-verified and then the dive went beyond them.

## 0. TL;DR — the three owner issues, root-caused

| Owner issue | Root cause (verified) |
|---|---|
| **1. Text not formatted** | FOUR stacked defects, two known + two new: (a) SSE route deletes every newline (`/.{1,4}/g` at `route.ts:273` — `.` never matches `\n`); (b) panel renders raw text (`agent-panel.tsx:467-469` `whitespace-pre-wrap` div; react-markdown@10 installed, zero imports); (c) **`remark-gfm` is not even in package.json** — tables would stay raw pipes after the planned markdown fix; (d) the system prompt has **no formatting contract** (§9 = "bullet lists" only; the single "summary table" instruction at prompt.ts:83 is scoped to document ingestion). |
| **2. Not conversation-friendly** | The agent is **transactional and structurally blind**: it never learns approve/reject outcomes (no message appended — yet prompt §4.2d says "Do NOT claim done until you see the commit result", which it can never see); plans are client-only (typed "approve it" mints a duplicate plan; "change qty to 50" restarts from scratch); approving re-executes the tool (TOCTOU — committed rows can differ from the displayed plan); the post-commit result (doc no, links) is discarded by the panel; failed writes badge as **"ok"** (`docTool` returns `{text: error}` with no `error` field, tools.ts:1631); no fuzzy "did you mean" anywhere; master lists are unbounded and silently truncated at the 8K tool-result cap. |
| **3. Screen-aware suggestions** | Yes — and the substrate is ~90% built but **zero wiring**: 76 pre-authored per-screen prompts sit unused in `menu-registry.ts` (`agentPrompt:`), `findItemByRoute()` exists, registers already compose screen+filters into seed prompts — but the panel reads no pathname, the POST body carries only `{messages}`, the system prompt is a static 14.4KB template with no date/user/screen, and the empty state shows 6 hardcoded global prompts (with wrong code formats — "B001" vs actual `B-####`). |

New findings: **~30** (2 P0, 12 P1). Four PRD-P0-queue items re-confirmed, several with aggravators.

## 1. Rendering & Formatting (owner issue 1)

### 1.1 The four-layer stack (why text looks broken)
1. **Transport kills newlines** — CONFIRMED-KNOWN (PRD P0 #2): `route.ts:273` `msg.content.match(/.{1,4}/g)` — the regex `.` excludes `\n`, so line breaks are deleted before emission. **Aggravator (NEW)**: `stream: false` (route.ts:255) — this is *fake* streaming; the full completion has already arrived and the 4-char chunk loop just adds ~250 SSE events per 1,000 chars, all flushing in one tick. The fix is not "chunk smaller" — it's real streaming (`stream: true`) or one emission.
2. **Raw-text render** — CONFIRMED-KNOWN (PRD P0 #3): `agent-panel.tsx:467-469` renders `m.text` in a plain div; `react-markdown@^10.1.0` (package.json:75) has zero imports in src/. LLM-default markdown (##, **, pipe tables) shows literally.
3. **GFM missing** — NEW (P1): `remark-gfm` is not a dependency. The model emits pipe tables (prompt even asks for one during ingestion); react-markdown without GFM renders them as raw text anyway. The PRD P0 fix must bundle both.
4. **No formatting contract** — NEW (P2): prompt §9 is the whole style guide: "Concise… Use bullet lists for summaries. Cite the actual IDs." No markdown rules, no table policy, no length norms, no ₹ convention beyond §7.2. When markdown rendering ships, the prompt needs a matching contract + `PROMPT_VERSION` bump + routing-eval rerun (the established gate).

### 1.2 Streaming UX defects (NEW, all verified)
- **Auto-scroll is a silent no-op** (P1): `agent-panel.tsx:155-159` assigns `scrollTop` on the ref at `:437` — the content div *inside* the Radix ScrollArea Viewport. The Viewport is the real scroller (`ui/scroll-area.tsx:19-24`); the transcript does not follow the stream. Users drag the scrollbar by hand.
- **Text segments overwrite each other** (P1): `:247-260` — `tool-call-start` resets `currentTextBuffer = ''`, and each `text-delta` *replaces* `m.text` (`next[idx] = {...next[idx], text: currentTextBuffer}`). Model narration before a tool call ("Let me check stock…") is destroyed when the post-tool answer streams. Multi-step chains lose all intermediate narration — in the UI *and* in the history sent on the next turn.
- **Non-200/401 failures are silent** (P1): only 401 is special-cased (`:208-212`); no `res.ok` check. A 500/429/502 with a JSON/HTML body falls into the SSE line parser, matches no `data:` prefix, and the turn ends with an empty bubble and no feedback.
- **Errors are invisible app-wide** (amplifier, CONFIRMED-KNOWN PRD P0 #1): every failure path surfaces via `toast.error` (`:324, :332`) — with the Toaster unmounted, mid-stream failures are dead ends.
- **Dead protocol events** (P2): server emits `step-start`/`text-start`/`text-end`/`step-end`/`finish`; the client switch (`:241-327`) handles none of them. `MAX_STEPS=12` exhaustion ends the stream with no user-visible signal.
- **Aborted tool chips spin forever** (P2): on abort, no `tool-call-end` arrives; the chip stays `calling`.
- **Duplicate close buttons** (P2): `ui/sheet.tsx:75-78` renders an absolute top-right X *and* the panel renders its own X in the same corner (`:431-433`).
- **No copy button anywhere**; no typing caret; composer not autofocused (first focusable is the close X).

### 1.3 Plan-card rendering: counts, not contents (NEW, P1)
The write plan ships full row data to the client — `creates: [{table:'order', data:{orderNo, totalPcs, totalValue…}}, {table:'orderLine', data:{qty, rate…}}…]` — but the panel renders **only counts**: "Creates: 3 record(s)", "Updates: 1 record(s)" plus free-text sideEffects (`agent-panel.tsx:550-581`). No line-item table, no row diffs, no resolved IDs (the SO-#### number isn't shown!), and the summary string interpolates raw `₹40000` (not en-IN `₹40,000`). The only drill-down is the "arguments" toggle — which dumps the *model's raw args*, not the resolved plan. **Approving a ₹4-lakh order on a count is the current norm.** Fix: render creates/updates as a compact table with ₹ formatting; the data is already on the client.

### 1.4 Tool-call display (P2)
Per call: wrench icon + raw snake_case `tc.toolName` (`:483`) + status chip (calling/ok/error/pending-approval) + one-line `result.text` + raw JSON behind a chevron. No humanized labels ("Receive GRN into godown"), no result tables. M17-H hid raw chips from doc/register headers but the panel itself still shows `receive_grn` as the primary action label.

## 2. Conversation-Action Friendliness (owner issue 2)

### 2.1 The model is blind to outcomes (P0-class, NEW)
Approve posts `{toolName, args}` and the panel appends **no message** to the conversation; the next request sends text-only history. The model never sees that its plan was approved, rejected, or committed — while prompt §4.2d commands "Do NOT claim the action is done until you see the commit result" and §6 demands "After every successful commit, tell the user the next stage." **The prompt asks for behavior the architecture makes impossible**: after approval the model will hedge ("awaiting your approval…") or hallucinate completion. This single defect explains most of the "doesn't feel conversation-friendly" experience. Fix: append a synthetic user-role event on approve/reject/commit (`[Plan create_order APPROVED. Committed: SO-1042]`) — one state append, no schema change.

### 2.2 Plans are client-only; approve re-executes (P1, NEW + known-adjacent)
Plans live in the panel's `pendingApprovals` map (`:306-316`); approve **re-executes** `t.execute(args)` server-side and commits the re-derived plan (approve/route.ts:24-31). Consequences: TOCTOU drift between displayed and committed plan; typed "approve it" makes the LLM re-run the write tool → duplicate plan card; "change qty to 50 then approve" has no mechanism (update_order can't change lines either); audit coarseness — `updateMany({approved:false, userId})` marks ALL the user's pending turns approved on any single approve (approve/route.ts:35-38, half-known from M6); Reject is client-local only — no server trace, and the model never learns it. Fix: persist the plan (AgentTurn already stores plan JSON) and approve-by-id.

### 2.3 Post-commit flow discards the result (P1, NEW)
`/api/agent/approve` returns `{committed: {id, orderNo…}}` — the panel ignores it. No doc number, no "View SO-1042" link, no Print, no next-stage CTA (only `suggest_next_step`'s `nextFormUrl` gets an "Open form" button). The strongest moment in the product (a committed document) produces… a 60-char toast.

### 2.4 Failed writes badge as "ok" (P1, NEW)
`docTool` (tools.ts:1631): `if (!result.ok) return { text: result.error }` — no `error` field. The panel sets `status: output?.error ? 'error' : 'result'` (`:295`) → a failed write shows the emerald **ok** chip with the error buried in the one-liner. Same pattern in master tools (`{ text: plan.errors.join(';') }`). The model does see the error text and self-corrects within the turn — the human UI lies about the outcome.

### 2.5 The brain's conversational gaps (NEW)
- **Zero dynamic context** (P0): `route.ts:231-239` assembles `[static system prompt, text history]` — no today's date (the model cannot resolve "yesterday"/"this month"), no user name/role, no active FY from DB (prompt hardcodes "26-27" and G1–G3/D1–D6 prose that will silently lie when masters change — `activeFinYear()` exists, unused), no current screen, no open doc.
- **Multi-turn amnesia for tool results** (P1): history is filtered to user/assistant text (`:233-238`); prior tool calls and results are stripped. "Make that 50 instead" works only if the numbers survived in prose. No trimming/cap either — the full history grows unbounded on both sides of a ~45K-token fixed prompt+specs overhead.
- **No fuzzy matching on lookup failure** (P1): 21× bare "X not found" returns; buyer resolution is exact code-or-name, case-sensitive (`posting/order.ts:13-14`) — "LPP" won't find "LPP SA" and offers no alternatives. (Counter-examples exist and should be the norm: `posting/order.ts:15` and `master-service.ts:257` do tell the user how to fix it.)
- **Master lists are unbounded and get silently truncated** (P1): `list_parties`/`list_buyers`/`list_styles` = `findMany({where, orderBy})` with no `q`, no `take` (tools.ts:530-536); tool results are sliced at 8,000 chars (`route.ts:380-385`) — alphabetically-late masters become invisible to the model, and the failure is silent.
- **Input coercion is minimal** (P2): parse-with-coercion handles numeric/boolean strings only — no "5k", no "yesterday", no Tanglish mapping despite ta-IN voice shipping. And the shared module is dead code — route.ts carries an inline copy, and `/api/agent/approve` validates nothing (client JSON → `t.execute` directly).
- **Rights are not enforced at tool dispatch** (P0-severity, covered-by-PRD FR-B3): tools carry `domain` tags but neither route checks them — any logged-in user can call all 230 tools, including `update_user_group`, `update_app_option`, `approve_pending`. Evidence sharpened for PRD Module B; ships as FR-B3 per plan.
- Prompt strengths worth keeping (don't regress): §6 chain proactivity ("never leave a user wondering what now?"), §4 refusal ban, 8 confusion few-shots, auto-number rules — all test-pinned (`prompt.test.ts` pins even `allTools.length === 230`).

### 2.6 What works (keep)
Plan→approve→commit as a safety model; Stop button (server unwinds cleanly, route.ts:186-197); voice in/out (en-IN/ta-IN STT, interim text, TTS plan read-back + spoken approve acks — best-in-class for a shop floor); file attach → `[Attached document:]` prefix (the strongest existing conversation-action pattern); Enter/Shift+Enter; multi-turn memory within an SPA session (panel survives navigation — mounted in AppShell).

## 3. Screen-Awareness & Suggestions (owner issue 3)

**Answer: yes — and it's the cheapest high-impact win in this whole dive, because the content
already exists.** Verified substrate:

| Substrate | Evidence | State |
|---|---|---|
| 76 pre-authored per-screen prompts | `menu-registry.ts` — `agentPrompt: 'Show me pending approvals'` (:456), `'I want to create a sales order'` (:325), `'Scan bundle CUT-0001/B1 for operator E001'` (:807) | **written, unused** (only coming-soon.tsx:26 consumes them) |
| Route→item resolution | `findItemByRoute(pathname)` (:1249), `findGroupByRoutePrefix` (:1262); topbar already does `usePathname()+findItemByRoute` (topbar.tsx:28-35) — the pattern sits two components away | exists |
| Screen+filters → seed prompt | `register-screen.tsx:100` composes `config.askPrompt + filtersAsText(config, params)` ("Ask about this data" button); same in report-screen.tsx:90,133; doc-screen "Fill with AI" (:483); master-table per-master prompt (:145) | exists — button-only, never reaches the model |
| Doc-aware jumps | `jump.ts` — 12 doc families, `resolveJump(q)` ranked | client-side only |
| Empty-state suggestions | 6 hardcoded global `SUGGESTED_PROMPTS` (panel :47-54) with wrong code formats ("buyer B001, style S-1001" vs actual `B-####`/`STY-####`) | static, misleading |

**What's missing (the whole gap):** the panel/provider reads no `usePathname` (zero hits in `src/components/agent/`); the POST body carries only `{messages}` — no `screen`/`docNo` field; the server injects nothing dynamic; no suggestion UI beyond the static six; no post-answer follow-up chips.

**Fix sketch (1 batch, no new content to author):**
1. Panel: `usePathname()` → `findItemByRoute()` → replace `SUGGESTED_PROMPTS` with `item.agentPrompt ? [item.agentPrompt, ...3 contextual] : defaults`; on `[id]` routes, resolve the doc number and add doc-scoped prompts.
2. POST body gains `{ screen: { pathname, docNo? } }`; server appends one dynamic system line: `Today is {ISO} ({weekday}). User: {name} ({role}). Active FY: {activeFinYear()}. Current screen: {menu title}{docNo ? ' — ' + docNo : ''}.`
3. Post-answer follow-ups: after a read answer, offer 2–3 chips from the item's `agentTools` domain (menu items already map tools per screen).
This simultaneously fixes the context-blindness P0 (§2.5) — one mechanism, both problems.

## 4. Table-Stakes Checklist (modern chat UX)

| Feature | Status | | Feature | Status |
|---|---|---|---|---|
| Markdown render | ✗ dep installed | | Stop generation | ✓ |
| GFM tables | ✗ dep missing | | Retry/regenerate | ✗ |
| Newline fidelity | ✗ | | Edit last / plan | ✗ |
| Auto-scroll | ✗ broken ref | | Copy message | ✗ |
| Typing caret | ✗ | | History persistence | ✗ (PRD P0) |
| Inline error bubbles | ✗ toast-only | | Suggestions | ~ static 6 |
| Queue while generating | ✗ | | Voice in/out | ✓ |
| Readable plan review | ✗ counts only | | File attach → act | ✓ |
| Composer autofocus | ✗ | | Post-action CTAs | ~ one button |

## 5. Recommendations

**Expand PRD Batch 1 (P0 queue) with the render stack** (it already owns 2 of the 4 layers):
real streaming or single-emission (delete the chunk regex), react-markdown + **remark-gfm**,
fix the text-segment overwrite (append per `text-${step}` id), auto-scroll ref → Viewport,
`res.ok` + inline error chip with Retry, remove the duplicate close X.

**New batch — "Chat QoL + Screen-Awareness" (~1–1.5 batches, propose as PRD Module amendment):**
1. Outcome events: append approve/reject/commit synthetic messages (fixes the §2.1 P0; also
   satisfies prompt §6's impossible demand).
2. Screen-awareness per §3 (dynamic system line + per-screen suggestions + follow-up chips).
3. Plan-card contents: table render with ₹ en-IN + resolved doc numbers; approve-by-id with
   server-side plan store (kills TOCTOU + duplicate plans + audit coarseness).
4. Post-commit CTA row: View / Print / Next stage (data already returned).
5. Error badge fix (`{error}` field) + fuzzy top-3 "did you mean" on lookup failures +
   `q`+`take` on the 12 master list tools.
6. Prompt: add §9 formatting contract (markdown, tables, ₹, ≤8-line reads), bump
   PROMPT_VERSION, rerun routing eval (≥90% gate).

Not urgent but logged: history trimming/cap, malformed-args per-call isolation, humanized tool
labels, dead SSE event cleanup, aborted-chip 'stopped' state, composer autofocus/queueing,
`list_orders.buyerId` advertised-but-ignored, render_report description omits aging buckets.

Sequence note: §3 (screen-awareness) and §2.5 (context injection) are ONE mechanism — build
once. The outcome-events fix (§2.1) is the single highest-leverage change for the owner's
"conversation-friendly" complaint and costs ~20 lines.
