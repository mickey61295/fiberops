# FiberOps — Garment ERP with AI Agent Harness

A modern rebuild of the legacy **Joms/Fiberpro** Tirupur knitwear job-work ERP as a Next.js application, with a built-in AI agent that controls the **entire app through chat**.

## What it is

- **ERP core**: orders, procurement (PO/GRN), inventory (multi-godown stock ledger), cutting, production programs, jobwork, despatch, commercial (invoices/debit notes/journals/payments), costing, HR, approvals, masters.
- **AI Agent Harness** ("Fiberpro Agent"): a GLM-4.6 tool-calling agent with **90 tools** over the whole schema. Writes follow a **plan → approve → commit** loop — the agent proposes, a human approves, the tool's `commit()` persists inside a transaction.
- **Industry chain, end to end**: the Tirupur knitwear job-work pipeline is first-class —
  `order → BOM → program → PO → GRN → jobwork-out → jobwork-in → cut → issue-to-line → production → rework/rejection → despatch → invoice → cost sheet → collection`
  Every stage moves the **stock ledger** (`ready_to_cut_in/out`, `production_in`, `rejection_out`, `sales_delivery`) and nets into `CurrentStock` buckets. `suggest_next_step` inspects any order and returns the next stage with a pre-filled tool-args skeleton, so the agent never leaves the user at a dead end after `create_order`.
- **Document ingestion**: attach a buyer PO PDF (or CSV/TXT) in chat → agent extracts text, proposes missing masters, then one order per document entity, with approvals at each phase.

## Stack

Next.js (App Router, TypeScript) · Prisma + SQLite · Tailwind · Z.ai GLM-4.6 via OpenAI-compatible API · SSE streaming agent loop · Vitest E2E.

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
npx vitest run tests/pipeline/industry-chain.test.ts
```

15 tests walking the entire 15-stage chain with stock-ledger assertions at every hop (G1/G2 balances, ledger txn types, program balances, invoice settlement).

## Repo layout

```
prisma/          schema (Order, Program, LineIssue, RejectionEntry, Payment, StockLedger, ...)
src/lib/agent/   tool registry (tools.ts), document extraction
src/lib/erp/     numbering, enums, movement matrix, posting engine, projectors
src/app/api/     agent SSE loop (plan → approve → commit), upload
tests/pipeline/  industry-chain E2E
scripts/         ingest regression + verification
```
