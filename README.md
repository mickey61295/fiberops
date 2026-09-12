# FiberOps — Garment ERP with AI Agent Harness

A production-shaped rebuild of the legacy **Joms/Fiberpro** Tirupur knitwear job-work ERP as a Next.js application, with a built-in AI agent that controls the **entire app through chat**.

## What it is

- **ERP core**: orders, BOM, procurement (PO/GRN), inventory (multi-godown stock ledger), cutting, production programs, jobwork, despatch, commercial (invoices/debit notes/journals/payments/cheques), costing, HR (attendance/OT/payroll/shift wages), approvals, masters.
- **AI Agent Harness** ("Fiberpro Agent"): a GLM tool-calling agent with **274 tools** over a 92-model schema (44 master configs). Writes follow a **plan → approve → commit** loop — the agent proposes, a human approves, the tool's `commit()` persists inside a transaction. Every write door is idempotency-guarded (double-click posts exactly once) and lands in the audit log.
- **Industry chain, end to end**: the Tirupur knitwear job-work pipeline is first-class —
  `order → BOM → program → PO → GRN → jobwork-out → jobwork-in → cut → issue-to-line → production → rework/rejection → despatch → invoice → cost sheet → collection`
  Every stage moves the **stock ledger** and nets into `CurrentStock` buckets. `suggest_next_step` inspects any order and returns the next stage with a pre-filled tool-args skeleton, so the agent never leaves the user at a dead end after `create_order`.
- **Accounts, the money story**: a seeded 20-row chart of accounts; every money door (payments, expenses, wages, production bills) writes a companion GL journal with resolved account FKs; party sub-ledgers; budget-vs-actual (PO + production + expenses); cheque/PDC lifecycle (issued → cleared | bounced with CN- contra reversal) and the PDC register; Tally JSON export (both sides, counted once).
- **Document ingestion**: attach a buyer PO PDF (or CSV/TXT) in chat → agent extracts text, proposes missing masters, then one order per document entity, with approvals at each phase.
- **Ops posture**: VACUUM INTO backups with integrity check + 7d/30d rotation + an rsync off-box hook (destination is owner infra), restore-verify drills, a recovery drill script, and a nightly cron installer.

## Stack

Next.js (App Router, TypeScript) · Prisma + SQLite (WAL) · Tailwind · Z.ai GLM via OpenAI-compatible API · SSE streaming agent loop · Vitest.

## Try the chain

```bash
npm install && npx prisma db push && npm run dev
```

Open the app, and in the agent chat:

1. *"Create an order for buyer B001, style S-1001 — 500 Black M + 500 Black L @ ₹210, delivery 2026-10-31"* → approve.
2. *"What's next?"* → the agent calls `suggest_next_step` and hands you the BOM skeleton.
3. Continue through program → cut → issue → production → despatch → invoice → payment, asking *"what's next?"* at any point.

## Tests

```bash
npx vitest run
```

**1636 tests across 79 files** — the full industry chain with stock-ledger assertions at every hop, doc parity (every write op produces identical rows through the agent door and the form door), master parity (all 44 masters), the money batches (payments, payroll, cheque/PDC), the accounts modules (CoA, party ledger, budget, Tally export), register services, report services, and the ops/idempotency/audit contracts. The suite runs on a disposable copy of the database — it never touches production data.

## Repo layout

```
prisma/            schema (92 models: Order, Program, LineIssue, Payment (+chequeStatus lifecycle), ...)
src/lib/agent/     tool registry (tools.ts, 274 tools), prompt, document extraction
src/lib/erp/        numbering, enums, movement matrix, posting engine (45 posting services),
                   master configs, doc configs, register configs + services, CoA, audit
src/app/           185 routes — pages, form doors, registers, agent SSE loop, upload
docs/CONTEXT/      STATE, PITFALLS, DECISIONS (ADR ledger), specs (SPEC-M1..M56)
tests/             pipeline (79 files) + unit
scripts/           backup_db.py, recovery_drill.sh, context_check.sh, eval_routing.mjs,
                   route smoke per batch, verification tooling
db/                SQLite database + backups
```

## Verification

`scripts/context_check.sh` re-derives the repo's live state (tools, models, menu, routes, prompt version) against `docs/CONTEXT/01-STATE.md` — 606 checks, no drift. `scripts/eval_routing.mjs --static` validates the routing registry (266 entries).
