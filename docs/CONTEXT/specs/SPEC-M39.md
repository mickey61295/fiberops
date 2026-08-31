# SPEC-M39 — Phase-6B Batch 3: Jobwork Loop Repair (JWL-01..09)

Source: docs/PRD/PHASE-6B-REMEDIATION-SPEC.md §6 (Batch 3). Evidence layer: deep dives 1–3
(docs/ANALYSIS/2026-08-31-consolidated-gap-register.md). Dependencies: OPS-04/05 (M37
idempotency + docKey uniqueness) — shipped.

Seam closed: **#2 Jobwork** — the JW loop stops leaking at every step past issue.

## §1 Scope — 9 FRs

| FR | Ship |
|---|---|
| JWL-01 | `JobworkLine` model {itemType, itemId, itemCode, uom, qty, rate, receivedQty, rejectedQty, returnedQty}; JW- out creates the lines; the doc view shows sent vs received per line; the register gains Received + At-party columns |
| JWL-02 | JW- out WITH lines posts `process_delivery` OUT of the issuing godown (default G1) with partyId + writes a REAL `itc04Line`; header-only out keeps document-only behaviour with HONEST sideEffects (no phantom stock/ITC claims) |
| JWL-03 | `planJobworkIn` is cumulative (`receivedQty += qty`, never overwrite), partial-aware (sent→partial→received), rejects over-receipt with the balance, supports `rejectedQty`, and wires `checkProcessLoss` (JWL-09) — over-tolerance loss surfaces a verdict + prompts a rejection entry |
| JWL-04 | `planDcReturn` RESOLVES the DC (must exist), guards per-line `qty ≤ sent − returned` (cumulative), flips the DC status inside the commit, and clears G3 WIP for JW- DCs |
| JWL-05 | `accept_jobwork_pcs` is a real gate: approval-commit posts the received qty per line INTO G2 (+ G3 WIP OUT) with docKey `GAN-<dcNo>`; before acceptance no stock moves (receipts are doc-level only) |
| JWL-06 | `bill_jobwork` aggregates received-not-billed DCs per jobworker → ONE `SalesInvoice` billType='jobwork' (INV-####), flips DCs to `'billed'` + `billedInvoiceNo` — retires the HFX-09 ghost (the filter option returns) |
| JWL-07 | Jobworker Material Statement register (/jobwork/statement) from StockLedger party rows on process_delivery/receipt: per party × item — kgs out, kgs in, loss %, WIP + aging; agent tool `list_jobworker_statement` |
| JWL-08 | DECISION (per §17-2): **WIRE G3** as the WIP-at-jobworker godown. JW- out posts G1 OUT + G3 IN (partyId=jobworker); GAN acceptance + DC return post G3 OUT — WIP at the jobworker becomes queryable stock. The seed stays |
| JWL-09 | JW- out accepts `allotmentNo` (AL-####) — the DC carries `allotmentId`, the AL- row flips 'allotted'→'issued' (contract → order → DC navigable in the doc view); `checkProcessLoss` wired on receipt |

## §2 Design decisions

1. **Status domain grows, honestly**: `sent | partial | received | accepted | billed`
   (+ contract family `allotted | issued`). Every state has a writer: partial ← partial
   receipt/return, accepted ← GAN commit, billed ← bill_jobwork. The register filter lists
   exactly these (HFX-09 retired by JWL-06, not by deletion).
2. **G3 legs are JW-door-only.** MDC/PDC challans keep their single-leg posting (their
   ledger rows + pins stay untouched); the JW- door is the one the spec names ("JW out
   writes G3"), and it is where WIP-at-jobworker semantics are exact. The JWL-07 statement
   reads the LEDGER by partyId (both doors' rows carry it) — not G3 balances — so WIP
   visibility covers every process door.
3. **Header mirrors for speed + legacy**: JobworkOrder gains `receivedQty`/`rejectedQty`/
   `returnedQty`/`billedInvoiceNo`/`allotmentId` (plain FK — PITFALLS #21 relation-less
   precedent). Header-level cumulative guards work even for legacy line-less DCs.
4. **GAN keeps the approval-gate UX but owns its plan**: find-or-create approval row +
   approve + the stock legs in ONE commit transaction. Re-planning (approve route
   CHAT-06) is deterministic; the docKey `GAN-<dcNo>` makes double-accept impossible at
   the ledger layer. GAN requires status `received` (the legacy queue is over fully
   received DCs).
5. **bill_jobwork is value-faithful**: line value = receivedQty × rate; header-only DCs
   fall back to totalValue × (receivedQty/totalQty). GST split per gstType (default
   cgst_sgst @18%). The invoice notes carry the JW doc numbers (the link the piece
   invoice needs), and each DC stores `billedInvoiceNo` for the reverse navigation.
6. **Process-loss map**: processType dyeing→deptPrs 2, knitting→4 (tolerance.ts's
   contract). Verdicts ride the plan sideEffects; over-tolerance prompts a rejection
   entry (rejectedQty) — never silently accepted.
7. **MDC/PDC out also writes JobworkLine rows** (same data it already posts) so the
   RTN return door guards EVERY door uniformly.

## §3 Files

- schema: prisma/schema.prisma (JobworkOrder ×5 fields + JobworkLine model) — `db:push`
- posting: jobwork.ts (out/in rewritten), grn.ts (planDcReturn validated), **jobwork-bill.ts** (NEW)
- schemas: jobwork.ts (out/in extended + JOBWORK_BILL_SCHEMA)
- agent: tools.ts (accept_jobwork_pcs real gate, +bill_jobwork docTool, +list_jobworker_statement), tool-labels.ts, prompt.ts (§4 jobwork line + version m39)
- registers: jobwork.ts (received/balance columns), **jobworker-statement.ts** (NEW), recon.ts (cumulative math)
- register-configs: jobwork-register.ts (status options + columns), **jobworker-statement.ts** (NEW)
- views: /jobwork/order/[id] (lines table + allotment link + partial receive CTA), /jobwork/statement (NEW page)
- enums.ts JOBWORK_STATUS; menu-registry (+item +route)
- tests: **tests/pipeline/jwl-batch3.test.ts** (NEW — loop-closure #2 + per-FR pins), hfx-batch0 (HFX-09 pin retired), chat-batch2 (tool count 230→232)
- gates: context_check.sh pins (models 80, tools 232, docTools 56, posting 37, regcfg 26, regsvc 36, menu 133, routes 166)

## §4 Acceptance — loop-closure test #2 (spec §15)

JW 100 kg out → receive 60 → receive 40 → GAN accept → bill:
sent 100 / received 100 / balance 0; stock round-trips (G1 −100, G3 parked +100 then
cleared −100, G2 +100); status billed; invoice INV-#### linked. Both doors (form service
plan + agent tool delegate) share the same service — ADR-001 parity by construction.
