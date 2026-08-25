# FiberOps — Garment ERP with AI Agent Harness

A modern rebuild of the legacy **Joms/Fiberpro** Tirupur knitwear job-work ERP as a Next.js application, with a built-in AI agent that controls the **entire app through chat**.

## What it is

- **ERP core**: orders, procurement (PO/GRN), inventory (multi-godown stock ledger), cutting, production, jobwork, despatch, commercial (invoices/debit notes/journals), costing, HR, approvals, masters.
- **AI Agent Harness** ("Fiberpro Agent"): a GLM-4.6 tool-calling agent with ~75 read/write tools over the whole schema. Writes follow a **plan → approve → commit** loop — the agent proposes, a human approves, the tool's `commit()` persists inside a transaction. Every turn is audited (`AgentTurn`).
- **Document ingestion**: attach a buyer PO PDF (or CSV/TXT) in chat → agent extracts text, proposes missing masters, then one order per document entity, with approvals at each phase.

## Stack

Next.js 16 (App Router, TypeScript) · Prisma + SQLite · shadcn/ui + Tailwind · Z.ai GLM-4.6 via OpenAI-compatible API · SSE streaming agent loop.

## Layout

```
src/
  app/            routes + API handlers (/api/agent, /api/agent/approve, /api/erp, /api/upload)
  components/erp  module views (dashboard, orders, procurement, inventory, cutting, production, …)
  components/agent  chat panel with plan-approval cards + document attach
  lib/agent       agent tool registry (tools.ts), document extraction (docExtract.ts)
  lib/db.ts       Prisma client
prisma/           schema (50 models)
scripts/          seed, E2E ingestion tests, DB inspection utilities
workspace/lld     design reference pack (nextjs-lld) driving the convergence roadmap
PLAN.md           the single backlog — convergence plan from MVP to LLD-grade domain rigor
worklog.md        multi-agent session protocol log
```

## Running

```bash
npm install
npx prisma generate && npx prisma db push
npx tsx scripts/seed.ts        # demo data
npm run dev                    # http://localhost:3000
```

The AI agent needs a `.env` with `DATABASE_URL` and a Z.ai API config (see `src/app/api/agent/route.ts` → `loadZaiConfig` for the expected file location/format).

## Convergence roadmap

See [PLAN.md](./PLAN.md). Phases: 0 restore → 1 posting engine & numbering → 2 production depth (stages, piece ledger) → 3 commercial & flags → 4 AI trust machinery (confidence, eval harness). Design source: `workspace/lld/nextjs-lld/` (37-doc LLD pack).
