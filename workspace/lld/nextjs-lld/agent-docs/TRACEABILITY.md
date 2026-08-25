# TRACEABILITY — ID Registry & Coverage Summary

**Promoted:** 2026-08-15 after 5 verification passes + post-fix re-verification (see VERIFICATION-REPORT.md).

## 1. Document pyramid

| Level | Doc | Content |
|---|---|---|
| L1 | `01-HLR.md` | 43 HLRs + 15 NFRs, module-mapped |
| L2 | `requirements/R01..R09` | 677 FRs across 33 prefixes |
| L3 | `workorders/WO-*.md` (4 bundles) | 85 WO cards (1:1 with TASKS.md), 365 acceptance criteria |
| Design | `nextjs-lld/00-11` + PLAN/TASKS/PROGRESS | Architecture, matrix, evidence |

## 2. FR prefix registry (owning R-doc)

| Prefix | R-doc | Prefix | R-doc | Prefix | R-doc |
|---|---|---|---|---|---|
| PLT / ADM / INT | R01 | STK / TRF | R04 | CST / PL / MIS / MET | R07 |
| ORD / PLN / WBS | R02 | CUT / PRD / PAN / PCS / BAR / WAG | R05 | TRK / GEN / LBL / AI / MOB / APR / RPT | R08 |
| PRC / GRN / DC / GAT | R03 | QC / BIL / INV / DEB / PAY / PTY / RATE | R06 | MAS | R09 |

BR-xx and OI-x are per-file (scoped to their R-doc); HLR-NN / NFR-NN scoped to 01-HLR.md.

## 3. Counts (verified)

| Artifact | Count | Verified by |
|---|---|---|
| Legacy forms mapped | 323/323 types | 06 §O name-diff (review #1) |
| Legacy flags ported | 189 verbatim + Part-3 additions | 07 Part 2/3; V1 flag sample |
| HLR / NFR | 43 / 15 | V6 item 6 |
| FR rows (R01..R09) | 677 (57+80+92+44+109+79+57+109+50) | V5 §4 + R02 correction + R09 |
| WO cards | 85 = TASKS.md items 1:1 | V1 item 1 |
| Acceptance criteria | 365 | V5 §4c |
| Owning-docs lines | 85/85 | V6 item 3 |
| Load-bearing procs line-verified | 24 | 11-PROC-VERIFICATION |

## 4. Coverage chain

- Every TASKS.md item S0.1..S9.5 + X1-X4 → exactly one WO card (same ID).
- Every R-doc §10 maps its in-scope legacy forms → FR IDs; masters covered by R09 (53 form rows); mobile screens by R08 §10; new screens (tracking/AI) by R08 §10.
- Every 03 movement-matrix row (§4.1 x18, §4.2 x12, §4.3 x5) is transcribed in the owning R-doc §5 (V1 item 5).
- Every HLR maps to module(s) and every module maps to an R-doc (HLR §3/§4 columns).
- Flag names in agent-docs are restricted to the 07 registry (V6 item 1: zero unregistered names).

## 5. Known deliberate deviations (approved)

- Dead legacy code not ported (11 §4 register).
- Verified legacy defects fixed-by-design (11 §3 register; X3 sign-off items listed there).
- R02/R03 route naming aligned to 02 canonical routes during fixes (V2 item 3).
