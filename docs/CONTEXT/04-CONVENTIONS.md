# 04 — CONVENTIONS (Coding & Structure Standards)

> Follow these in ALL new code. Deviations require a new ADR in 02-DECISIONS.md.

## Directory layout (target; M1+ grows the erp/ tree)

```
src/
  app/
    page.tsx                    → dashboard route (M1)
    (erp)/<module>/<entity>/    → route group: page.tsx (list/register), new/page.tsx (DocScreen), [id]/page.tsx (view/hub)
    api/agent/…                 → agent loop + approve (existing)
    api/erp/…                   → aggregate data endpoints (existing)
  components/
    erp/                        → view components (re-homed per route in M1)
    agent/agent-panel.tsx       → global chat panel (Cmd+K)
    archetypes/                 → M2+: MasterTable, DocScreen, RegisterScreen, ApprovalInbox, ReportHub engines
  lib/
    agent/tools.ts              → agent tools (THIN wrappers over posting services)
    agent/docExtract.ts         → upload listing + text extraction
    erp/
      menu-registry.ts          → M1: single source of navigation truth
      chain.ts                  → M1/M3: the 15-stage pipeline (shared)
      legacy-enums.ts           → M2/M3: named constants for legacy magic numbers
      posting/<op>.ts           → M3: one service function per operation
      schemas/<op>.ts           → M3: shared zod (form + tool, same object)
      master-configs/<entity>.ts → M2: MasterTable configs
docs/
  PLAN-2.0-MENU-PARITY.md       → strategy
  form-taxonomy.json            → legacy evidence
  CONTEXT/…                     → this framework
scripts/                        → persisted, re-runnable scripts only
tests/pipeline/                 → E2E chain tests
```

## Naming

- Doc numbers: `SO-` (orders), `PO-`, `GRN-`, `DC-`, `PGM-` (programs), `LI-`
  (line issues), `REJ-`, `RCP-`/`PMT-` (payments), `JW-` (jobwork), `CUT-`,
  `INV-`. Generated via `nextNumber()` helper — never hand-roll.
- Routes: `/module/entity`, `/module/entity/new`, `/module/entity/[id]` — plural
  module, singular entity.
- Tools: `list_<plural>`, `get_<singular>`, `create_<singular>`, `update_<singular>`,
  `cancel_<singular>`, verb forms for actions (`receive_grn`, `issue_to_line`,
  `post_production_entry`, `record_payment`).
- TS files: kebab-case. Components: PascalCase. Configs: `<thing>-config.ts` or
  `<thing>.config.ts` exporting a typed const.

## Agent tool pattern (existing — keep consistent)

```ts
{
  name: 'create_x',
  description: '…' (what + when to call it),
  domain: 'x',
  isWrite: true,
  schema: z.object({ … .describe() on every field }),
  execute: async (args, ctx) => {
    // M3+: delegate to posting service; today: logic here
    return { ok: true, summary: '…', docNo, plan: { creates, updates, effects } }
  }
}
```
- Write tools NEVER mutate before approval: they build and return a `plan`
  (`creates[]`, `updates[]`, effects). `/api/agent/approve` replays + commits.
- Every write tool's summary states the NEXT pipeline stage (chain guidance rule).

## Posting service pattern (M3 target)

```ts
// src/lib/erp/posting/createOrder.ts
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult>
// - zod-parse input with the SHARED schema
// - db.$transaction: write doc + StockLedger rows via postLedger
// - return { docNo, ledgerEffects, nextChainStep }
```
- Agent tool = parse args → call service. Form server action = parse FormData →
  call service. NO logic duplication (ADR-001).
- Stock effects ONLY via `postLedger` (ADR-004 bucket rule).

## Stock & chain rules

- StockLedger txn types stay the existing lowercase enum values already in the
  schema (e.g. `ready_to_cut_in`, `production_in`, `sales_delivery`) — check
  schema before adding; new types require a chain.ts comment + ADR note.
- Chain stages (15) live ONLY in `src/lib/erp/chain.ts` (ADR-007).
- Legacy magic numbers only via `legacy-enums.ts` (ADR-012).

## UI rules

- shadcn/ui components only; lucide icons; Tailwind 4 classes.
- Dark slate + emerald accent (existing theme).
- Every register list row exposes the next-step chip when the row's record is
  chain-relevant.
- Every DocScreen shows the mini pipeline bar (chain position).
- Tables: sticky header, right-aligned numerics, monospace doc numbers.
- Client components only where interactivity demands; data fetching via server
  components + server actions.

## Testing rules

- Chain-affecting changes MUST extend `tests/pipeline/industry-chain.test.ts`
  or add a sibling spec asserting StockLedger rows (txn type + qty sign) and
  balance effects.
- Form-vs-agent parity (M3+): each DocScreen operation gets a test asserting the
  form server action and the agent tool produce IDENTICAL ledger effects.

## Commit & git rules

- Message: `<area>: <imperative summary>` — areas: m1…m6, docs, agent, fix, test.
- Every commit updates 01-STATE.md + worklog.md in the same commit.
- Tag per milestone. Never commit binaries from source-erp/ (PITFALLS #6).
