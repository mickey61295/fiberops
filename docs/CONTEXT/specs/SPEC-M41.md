# SPEC-M41 — Phase-6B Batch 5: Procurement & Dispatch Closure (PRC-01..08)

Source: docs/PRD/PHASE-6B-REMEDIATION-SPEC.md §8 (Batch 5). Evidence layer: deep dive 2
(docs/ANALYSIS/2026-08-30-deep-dive-2-remaining-gaps.md). Dependencies: HFX-01 guard shipped
(Batch 0) — retired by PRC-01; PAY-03 SupplierBill shipped (M40) — PRC-03's linked debit note
rides it. Every cited line re-verified on the M40 line (2026-09-01): `planGrn` receives only
`po.lines[0]` with the HFX-01 >1-line refusal and header-qty status math (`posting/grn.ts:34,50`);
no `planPoAmend` exists (order precedent `planOrderAmend` at `posting/lifecycle.ts:175`); no
purchase-return service and `GrnLine` has no rejectedQty; `planGrn` never reads Approval rows;
PcsDespatch only ever writes `loading` (LAD) / `despatched` (DC) — schema comment names
`delivered` but no writer exists; `flags.ts:56` defines `gendcdays` while `digest.ts` has no
non-return section; gate `refDocNo` is free text (`posting/gate.ts`); PcsDespatch carries only
vehicleNo/courierName (no LR/transporter/freight/cartons/weight).

Seams closed: **#1 PO ↔ GRN** + **#5 DC colour/size → delivered** (spec §15 tests #1/#5).

## §1 Scope — 8 FRs + 1 deferral

| FR | Ship |
|---|---|
| PRC-01 | Multi-line GRN: `GRN_SCHEMA` gains `lines?: [{itemType, itemCode, qty, rate?}]` (poLineId-style internal addressing is derived — callers speak itemCode); per-PO-line match, per-line `receivedQty` increment, PO status derives from ALL-lines math (received when every line covered, partial when any, open when none — legacy over-delivery preserved: no per-line cap); per-line ledger IN rows + per-line stock bumps; HFX-01 >1-line refusal RETIRED; the legacy header `receivedQty` path stays for single-line POs (both doors + view unchanged) |
| PRC-02 | `planPoAmend` (the planOrderAmend precedent): deliveryDate, status, notes, line revisions [{itemType, itemCode, qty?, rate?}] — recomputes totalQty/totalValue, appends the amendment trail to notes, guards cancelled POs and qty reductions below already-received; `update_purchase_order` agent tool + `/procurement/po/amendments` form door (amendOrderAction twin) |
| PRC-03 | Purchase return: `GrnLine` + `rejectedQty`; `planPurchaseReturn` — PRN-#### on the GRN table (grnType `purchase_return`), per-line guard qty ≤ received − rejected (cumulative), StockLedger purchase_return OUT of the godown, PO untouched (supplier-pending unaffected — return is post-receipt), optional linked DebitNote (amount = return value, reason carries the PRN — ties PAY-03); `create_purchase_return` docTool + `/procurement/purchase-return` form door |
| PRC-04 | PO approval gate real: new flag `po_appr` (boolean, commercial, default false — legacy posts regardless); when on, `planGrn` reads the Approval row (entity `po`) and REFUSES a pending/absent approval with the approve-first guidance — the create-PO sideEffects claim becomes true |
| PRC-05 | DC lifecycle: `planDcTransition({dcNo, to: 'despatched'|'delivered', date?, notes?})` — LAD conversion (loading→despatched) and delivery (→delivered, deliveredAt stamped); terminal/status guards; document-only (stock already left at despatch); `deliver_dc` docTool + view action; despatch day-book register (`/dispatch/register`) with age column |
| PRC-06 | `gendcdays` wired: digest gains a `nonReturn` section — jobwork DCs (MDC/PDC/JW on JobworkOrder) with returnable work outstanding, outDate older than the flag's days → rows {dcNo, jobworker, sent, returned, ageDays}; detection by returnable-days (not only manual `returnable:false` at creation); silent when empty (M28 discipline) |
| PRC-07 | Gate pass ↔ document link: `refDocNo` validated against real doc numbers (PO/GRN/DC/LAD/MDC/PDC/JW/SB/INV families) with a startsWith suggestion list on mismatch (the jump.ts reflex); `planClearGateEntry` — logged→cleared transition door; despatch register carries the matched gate-pass column; MIS gains a 'DCs without gate pass' recon card (silent when clean) |
| PRC-08 | Logistics fields: PcsDespatch + `lrNo, transporter, freight, cartons, grossWeightKg` (all nullable); DESPATCH_SCHEMA + despatch doc-config headerFields + the pcs-despatch print meta row gain them |
| PRC-09 | **DEFERRED per §17-6** (owner decision open: cumulative DC→invoice / legacy frmDelCumInv — build or park) — recorded here + STATE; no dead columns added |

## §2 Design decisions

1. **Line addressing by (itemType, itemCode), not poLineId** (PRC-01): cuid poLineIds are
   invisible to both doors (agent JSON, form fields); itemCode is the operator's language
   (the planMultiProcessGrn / planDcReturn precedent). A duplicate (itemType,itemCode) pair
   across PO lines is refused (ambiguous receipt).
2. **Two input paths, one status math** (PRC-01): `receivedQty` header path maps to the
   single PO line (legacy byte-identical); `lines[]` path is the multi-line door. PO status
   derives from per-line coverage in BOTH paths — the header-qty comparison retires (a
   2-line PO fully covered across 2 GRNs goes `received`; partial coverage → `partial`;
   zero receipts anywhere → `open` — today the HFX-01 guard makes >1-line POs unreachable
   so no migration concern).
3. **Amendment trail = notes append + runCommit audit** (PRC-02): the order precedent
   ("history = updatedAt + notes") is the honest bar the spec names ("like orders"); the
   AuditLog row runCommit already writes carries the before-image. No new model.
4. **PRN- lives on the GRN table** (PRC-03): grnType `purchase_return` + resolveDocNo PRN-
   prefix — one receipt-side table, five types, the RTN-/MP- precedent; supplier-pending
   (PAY-05) reads bills, not GRNs, so a return moves stock + rejectedQty only. The PO's
   receivedQty stays (goods WERE received — the return is a later correction; the SB
   tolerance verdicts re-derive from GRN lines when billed).
5. **`po_appr` default false** (PRC-04): every shipped flag default preserves current
   behavior (the registry contract); the gate text in create-PO sideEffects becomes
   conditionally true — honestly described as "when po_appr is on".
6. **LAD conversion keeps the LAD- number** (PRC-05): the StockLedger rows carry
   docNo/docKey = LAD-#### (OPS-05 uniqueness) — renaming would orphan the audit chain.
   Conversion = the status transition loading→despatched (the moment the challan becomes a
   real despatch); delivered is the terminal buyer-side state. Print header shows the
   permanent number. Loop-closure #5's acceptance ("colour/size in view + print; delivered
   transition") is unaffected.
7. **Digest nonReturn = JW family only** (PRC-06): buyer DCs (PcsDespatch) are sales, not
   returnable; the flag's own description says "jobwork DC". Age = days since outDate;
   rows capped at 25, oldest first.
8. **Gate refDocNo validation is guidance-first** (PRC-07): unknown refs refuse with the
   close matches listed (never a silent free-text row); blank stays allowed (gate log rows
   legitimately carry no doc). The recon card matches GP- rows' refDocNo against the
   despatch register's dcNo set.
9. **Logistics fields nullable, print optional-rows-only** (PRC-08): legacy rows render
   '—'; no migration backfill; freight is ₹ (Float), grossWeightKg is kg, cartons is Int.

## §3 Files

- schema: prisma/schema.prisma — GrnLine + rejectedQty; PcsDespatch + deliveredAt +
  lrNo/transporter/freight/cartons/grossWeightKg (NO new models)
- posting: grn.ts (multi-line + PRC-04 gate), lifecycle.ts (+planPoAmend, +planDcTransition,
  +planClearGateEntry), purchase-return.ts NEW
- schemas: grn.ts (+lines), despatch.ts (+logistics), purchase-return.ts NEW,
  lifecycle variants (+po-amend/dc-transition/gate-clear)
- doc-configs: grn.ts (lineFields for the multi-line door), despatch.ts (+logistics
  headerFields), purchase-return.ts NEW
- registers: despatch.ts NEW (day-book + age + gatePass column) + register-configs/despatch.ts
- notifications/digest.ts: nonReturn section
- reports/mis: gate-pass recon card
- print: fetchers-b.ts pcs-despatch meta rows
- agent: tools.ts (receive_grn schema auto-inherits; +update_purchase_order,
  +create_purchase_return, +deliver_dc, +clear_gate_entry), tool-labels, prompt §procurement
- views: /procurement/po/amendments, /procurement/purchase-return, /dispatch/register,
  despatch view + deliver action
- flags: +po_appr

## §4 Acceptance

1. Loop-closure #1 GREEN: 3-line PO → GRN#1 covers lines 1+2, GRN#2 covers line 3 →
   per-line receivedQty exact, PO `received`, supplier-pending math unaffected, through BOTH doors.
2. Loop-closure #5 GREEN: DC with colour/size lines committed → delivered transition →
   colour/size present in view + print; LAD loading→despatched conversion reachable.
3. PRN guard: returning more than received-minus-rejected refuses with the numbers quoted;
   linked debit note lands (amount = value, PAY-03 tie).
4. po_appr on + pending approval → GRN refuses with guidance; approved → posts.
5. gendcdays 5 + a 7-day-old open JW DC → digest nonReturn lists it; manual
   `returnable:false` DCs never listed.
6. Gate refDocNo 'DC-9999' (no such DC) → refusal with startsWith suggestions;
   clear door flips logged→cleared; MIS recon card counts DCs without GP refs.
7. Logistics fields round-trip through form + agent + print.
8. PRC-09 absent everywhere (no dead columns) + recorded deferral.

**Gates**: vitest (new prc-batch5 suite + inherited updates) · tsc src 0 · eval --static
PASS · context_check pins NO DRIFT · route_smoke live.
