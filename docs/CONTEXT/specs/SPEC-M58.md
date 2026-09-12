# SPEC-M58 — Chat history: persisted, listable, resumable (Phase-6 PRD P0, ADR-026 Batch 1)

## 0. Problem

The agent panel holds the conversation in React state only
(`useState<ChatMessage[]>`): a page refresh, a crash, or a new day
destroys every conversation. Server-side, `AgentTurn` rows persist ONLY
tool-calling turns (the row is written inside the tool-call branch of
`/api/agent`) — a pure-text answer leaves no record at all. There is no
way to list past conversations or resume one. This was an owner
complaint (PRD §17 evidence base: "chat history") and the P0 batch's
second surviving item.

## 1. Scope

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-1 | Conversation persistence | Every completed turn persists the user prompt + the turn's assistant texts, grouped under a client-generated `sessionId` the panel sends with the POST. Persistence failure NEVER kills the turn (`.catch(() => null)` — the AgentTurn precedent). |
| FR-2 | Session list | `GET /api/agent/history` → the user's last 50 sessions (newest first): `{id, title, updatedAt, messageCount}`; title = first user prompt trimmed to 60 chars (`(no title)` fallback). 401 without session. |
| FR-3 | Session load | `GET /api/agent/history/[id]` → `{session, messages:[{role, content, createdAt}]}` ascending; 404 for unknown AND foreign ids (anti-enumeration — a session's existence is never revealed to another user). |
| FR-4 | Session delete | `DELETE /api/agent/history/[id]` → cascades messages; 404 for unknown AND foreign ids (same rule); the user's own data only. |
| FR-5 | Panel: new chat | A "New chat" action clears the panel + rotates the `sessionId` (crypto.randomUUID, client-only). |
| FR-6 | Panel: history drawer | A History button in the panel header opens a drawer: session list (title, relative time, message count); click = load the messages into the panel as read-only bubbles AND continue the conversation in that same session; delete button per row. |

## 2. Technical design

**Schema (additive, ADR-026):**
```prisma
model ChatSession {
  id        String   @id @default(cuid())
  userId    String
  title     String   @default("(no title)")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  messages  ChatMessage[]
  @@index([userId, updatedAt])
}
model ChatMessage {
  id        String   @id @default(cuid())
  sessionId String
  session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  role      String   // 'user' | 'assistant'
  content   String
  createdAt DateTime @default(now())
  @@index([sessionId])
}
```
`AgentTurn` is UNTOUCHED (frozen write contract + tests). Models 92→94.

**Route (`src/app/api/agent/route.ts`, minimal diff):**
- body gains `sessionId?: string` (validated: string 1–64, else ignored).
- assistant texts accumulate in an `assistantTexts: string[]` alongside
  the existing `textContent` accumulation per step.
- at `finish`: `persistTurnHistory(sessionId, userId, userText, assistantTexts)` —
  upserts the ChatSession (create with title=trimmed userText when new;
  bumps updatedAt) + creates one ChatMessage per user prompt and per
  assistant text, all `.catch(() => null)`.
- The two history API routes use `requireApiSession()`; the session's
  userId scopes every read/write.

**Panel (`src/components/agent/agent-panel.tsx`):**
- `sessionRef = useRef('')`; a mount effect lazily sets
  `crypto.randomUUID()` (client-only — no hydration involvement).
- The POST body gains `sessionId: sessionRef.current || undefined`.
- New-chat button (Plus icon) + History button (History icon) in the
  header row; the drawer is a simple absolutely-positioned list panel
  (house style — no new deps).
- Resume maps stored rows to the panel's `ChatMessage` shape
  (`{id, role, text: content, toolCalls: []}`), sets `sessionRef.current`
  to the loaded session id, and the next POST continues that session.
- The LLM context is unaffected: the route already filters history to
  user/assistant messages verbatim (route.ts:193-202) — resumed
  conversations ride the same path as live ones.

## 3. Tests (tests/unit/chat-history.test.ts NEW)

- persistence helper: user+assistant rows written under a session;
  title derivation (long prompt → 60-char trim); re-persist same session
  → same row, updatedAt bumped, messages appended; empty texts → no
  empty rows.
- API handlers (mocked cookies + real DB): list 401/200 shape + newest
  first + only own sessions; get 404 unknown AND foreign (anti-
  enumeration) / 200 shape ascending; delete 404 foreign / 200 own (rows
  gone, cascade).
- residue-free: fixtures deleted in afterAll.

## 4. Counters

- models 92→94 (STATE claim), API routes +2 (`/api/agent/history`,
  `/api/agent/history/[id]` — both session-guarded), menu/routes/pages
  unchanged, tools unchanged (274).
- `prisma db push` (additive) + `prisma generate` + dev-server restart;
  the vitest globalSetup copies custom.db → test.db per run so tests see
  the new tables automatically.

## 5. Docs round

STATE milestone row (M58) + models claim + worklog. Gates: vitest (new
file), tsc src 0, context_check NO DRIFT, route_smoke_m57 (list 401/200,
get/delete round-trip).
