# 00 — OVERVIEW: Next.js Low-Level Design for the Fiberpro/Joms Rewrite

**Scope:** Full low-level design (LLD) of a Next.js application that reproduces, 1:1, every feature of the legacy Joms/Fiberpro ERP (v2.5.9.4) analyzed in this folder. **No feature is added, removed, or re-scoped.** Where the legacy system implements a behavior via SQL triggers, feature flags, or per-customer variants, the design carries that behavior forward explicitly.

## Document set

| # | File | Contents |
|---|---|---|
| 00 | `00-OVERVIEW.md` | This file — scope, parity rules, module inventory |
| 01 | `01-ARCHITECTURE.md` | Stack, layering, cross-cutting concerns (auth, rights, finyear, multi-company, flags) |
| 02 | `02-COMPONENT-TREE.md` | **The complete component tree** — App Router routes + component hierarchy for every module and screen (desktop + mobile/Commando) |
| 03 | `03-DOMAIN-POSTING-ENGINE.md` | Entities, enums, the three stock ledgers, the full movement/posting matrix (every TrType/GrnType/production path), balance projectors, cumulative-rate engine |
| 04 | `04-API-SERVICES.md` | API route handlers + service classes per module, mapped to legacy procs |
| 05 | `05-EVENTS-SYNC-NOTIFICATIONS.md` | Event wiring, ST_*/WBS_* projections, Commando cloud sync, approvals, notifications, barcode stations |
| 06 | `06-SCREEN-MAP.md` | Every one of the 322 legacy forms → Next.js route + components + data deps + validations + postings |
| 07 | `07-REPORTS-FLAGS.md` | Report catalog (~330 templates by family) → report components/datasets, and the 189 feature flags → UI behavior map |
| 08 | `08-QR-TRACKING.md` | **[Requirement addition]** QR end-to-end order tracking: TrackUnit/TrackEdge/TrackEvent model, GS1-Digital-Link-style codes, genealogy quantity law, reconciliation |
| 09 | `09-AI-HARNESS.md` | **[Requirement addition]** "Joms Sahayak" AI layer: Tamil-first PO/GRN/bill parsing, review-confirm loop, voice stack, eval & governance |
| 10 | `10-REVIEW-REPORT.md` | Full doc-set audit (review #1): method, defects found & fixed, residual live-DB verification items, review workflow, change log |
| 11 | `11-PROC-VERIFICATION.md` | Proc-level audit (review #2): 24 load-bearing procs verified against the movement matrix with quoted evidence; legacy defect & dead-code registers; parity policy |
| — | `PLAN.md` / `TASKS.md` / `PROGRESS.md` | **Agent operating docs**: staged build plan with exit criteria, the task backlog, and the living status/decision log |
| — | `agent-docs/` | **Verified 3-level agent framework**: README + 00-AGENT-FRAMEWORK (orchestration), 01-HLR (L1: 43 HLR/15 NFR), requirements/R01-R09 (L2: 677 FRs), workorders x4 (L3: 85 WO cards/365 ACs), TRACEABILITY + VERIFICATION-REPORT |

## Source-of-truth parity rules

1. **Feature parity is defined by the legacy artifacts**: the 322 WinForms, ~440 SQL scripts, ~330 report templates, 189-flag store, and the existing mobile (Commando) screens. Nothing else is in scope.
2. **Business rules move to one place.** Legacy logic is scattered across VB form code, stored procs, and triggers. In the rewrite, each rule has exactly one home (see 03/04): posting math lives in the Posting Engine; balance recomputation in Projectors; validation in zod schemas + services; document numbering in a Numbering service.
3. **Flags stay flags.** All 189 `Fiberpro_Lib.dll` flags are ported as runtime config (per company) with identical names, so customer behavior does not change (see 07).
4. **Tolerances and approvals are identical**: e.g. `po_buddev=10.00` still warns at 10% over budget on POs; `formjjreq` still gates Form JJ printing; `rateconfirmcheck` still blocks DC without rate confirmation when enabled.
5. **Document semantics are identical**: DC/GRN/Bill/Debit/ProdEntry keep the same type codes, the same header/line split (`Trs_Xxx1/2/3`), the same reversal-by-inverse-delete behavior (implemented as compensating postings inside one transaction — the fix for the legacy non-transactional design, not a behavior change).

## Module inventory (the rewrite's top-level navigation — mirrors legacy MDI menu)

| # | Module | Legacy forms | New route root |
|---|---|---|---|
| 1 | Dashboard & MIS | frmMIS, FrmMISSetting, meeting views | `/dashboard`, `/mis` |
| 2 | Orders (IO) | OrderSheet family, enquiry, sample, amendments | `/orders` |
| 3 | Planning & Program | progNew family, requirement calc, WBS/T&A | `/planning` |
| 4 | Procurement | PO family, supplier orders, rate confirm | `/purchase` |
| 5 | Inward (GRN) | GRN family, lot approval, waste receipt | `/grn` |
| 6 | Outward (DC) | DC family (yarn/fab/pcs/panel/acc/gen), gate pass | `/dc` |
| 7 | Stock & Stores | registers, ledger, transfers, godown/unit ack, adjustment, opening | `/stock` |
| 8 | Cutting | cutting production, job orders, roll split, ready-to-cut | `/cutting` |
| 9 | Production | prod entry, bundles/barcodes, line in/out, issue-to-production | `/production` |
| 10 | Panels & Pieces | panel excess/rej/rework, piece stock, rejections, shortages | `/pieces` |
| 11 | QC & Lab | lab tests, parameters, stages | `/qc` |
| 12 | Commercial | invoices, bills register, bill-pass, debits, payments, party balance, Tally/GST | `/commercial` |
| 13 | Costing & P&L | budget vs actual, daily costing, unit P&L, quick costing | `/costing` |
| 14 | Payroll & Wages | prod wages, shift wages, wage registers | `/payroll` |
| 15 | Approvals (Workflow) | app masters, PO/lot/rate/shortage/reprocess/acc-item/non-return-DC approvals | `/approvals` |
| 16 | Reports | ~330 report templates | `/reports` |
| 17 | Masters | ~40 master screens | `/masters` |
| 18 | Administration | users, groups, menu rights, company rights, finyear, data utilities | `/admin` |
| 19 | Mobile (Commando) | existing mobile app screens (dashboard, scan, entries, approvals) + tracking & AI additions | `/m/*` |
| 20 | Integrations | SMS/mail, weight scale, Tally, e-way, barcode printers | embedded + `/admin/integrations` |
| 21 | **QR Tracking** (new requirement) | order river, genealogy, item passport, scan-anything, exceptions, policy | `/tracking/*` (08) |
| 22 | **AI Harness** (new requirement) | parse inbox, assistant (chat/voice), AiDock on every form, admin console | `/ai/*` + AiDock everywhere (09) |

## Requirement additions (2026-08-15)

Two additions extend — but never alter — the parity scope: **(a) QR end-to-end tracking** (08) and **(b) the AI harness** (09). Parity rule for additions: they are **additive layers** over the unchanged core — tracking events are emitted by the same PostingEngine, AI drafts post through the same services, and both carry their own flag sets (07 §3) so each customer can switch them on progressively. All legacy behavior from docs 01–07 remains exactly as specified.

## Non-goals (parity constraints)

- No new business features (no PF/ESI payroll, no buyer portal, no CAD) — the legacy app does not have them.
- No change to document type semantics, numbering, or tolerance defaults.
- No redefinition of Piece/Panel/Bit, Good/'M' buckets, absolute vs program balances, or cumulative rate mechanics.
