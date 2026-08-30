# SPEC-M23 — e-Invoice / e-Way Bill MOCK (gap-audit Gap D #11, P3 lane)

> Second six-task run, task 6 (final). Gap D #11: "e-invoice/e-way bill —
> not even the v1-promised mock IRN exists (verified: zero code)."
> SalesInvoice ALREADY carries `irn` (+ `ern` for export) — unused. Frozen
> before code (2026-08-30).

## 1. Scope

**In:** a DETERMINISTIC offline mock of the Indian e-invoice handshake, good
enough to run the workflow end-to-end: `src/lib/erp/einvoice.ts` —
`mockIrnFor(invoice)` = SHA-256 hex (64 chars, the real IRN format) over the
REAL IRN input tuple (seller GSTIN | buyer GSTIN | invoice no | date |
invoice value — seller GSTIN from AppOption `print.gstin`, buyer from
Party.gstin) · mock Ack No (10 digits, hash-derived) · mock e-Way Bill No
(12 digits, hash-derived) granted ONLY when billAmount > ₹50,000 (the real
consignment threshold rule) · `planGenerateIrn(invoiceNo)` (DocPlanResult):
guards — invoice must exist, be status `issued` (draft/cancelled/paid
rejected), and NOT already carry an IRN (regeneration = the real-world
cancellation workflow — out of scope, honest error); commit stamps
`irn` + `irnAckNo` + `ewbNo` (2 additive nullable columns) in one update.

**Doors:** agent tool `generate_einvoice_irn` (docTool over the plan — tools
226) AND a form door on the invoice view: an "Generate IRN (mock)" button
(status=issued && !irn) whose server action runs the same plan through
runCommit (the M15 form-door audit pattern, the wage-bill precedent).

**Surfaces:** invoice print meta block gains IRN Ack No + e-Way Bill No rows
when stamped (the IRN row already renders); the invoice view shows the
stamped values.

**Out (documented):** real signing/QR image (needs a QR lib decision + real
portal integration — the mock persists the IRN/Ack/EWB DATA; the printed QR
image waits) · IRN cancellation workflow · export invoices' ERN flow (ern
field stays unused) · buyer-email delivery.

## 2. Rules (the real-world flavors the mock honors)

1. IRN input tuple = seller GSTIN | buyer GSTIN | invoice no | invoice date
   (dd/mm/yyyy) | invoice value — deterministic hash ⇒ same invoice always
   regenerates the same mock IRN (testable), different invoices differ.
2. Only ISSUED invoices enter the e-invoice workflow.
3. One IRN per invoice (already-stamped → error, no silent re-issue).
4. e-Way Bill only when consignment value > ₹50,000.

## 3. Tests

`tests/unit/einvoice.test.ts` — determinism (same invoice → same IRN; tweak
amount → different), format (64 hex / 10-digit ack / 12-digit EWB), guards
(unknown invoice, non-issued, already-stamped), the ₹50k EWB threshold both
sides, commit stamps all three fields + a re-run errors, tool presence +
print fetcher carries the rows. Pins: tools 226 ×7, +2 schema columns (models
stay 78 — additive fields), context file pins.

`scripts/route_smoke_m23.sh` — invoice view renders the Generate button on a
fresh issued invoice; the action's service commits (IRN stamped); the button
disappears post-stamp; the print route carries IRN + ack + EWB rows; tool in
registry.

## 4. Gates

tsc src/ 0 · vitest · eval --static PASS · context_check NO DRIFT ·
route_smoke_m23 · STATE + worklog + commit + push.

## 5. Implementation record

Shipped 2026-08-30. Files: SalesInvoice +2 additive nullable columns (irnAckNo,
ewbNo — models stay 78) · src/lib/erp/einvoice.ts (irnTuple over the REAL
govt input tuple — seller GSTIN from AppOption print.gstin, buyer from
Party.gstin; mockIrnFor = SHA-256 64-hex; mockAckNo 10 digits /
mockEwbNo 12 digits via hash-derived digits — no BigInt, the tsconfig target
predates ES2020 literals; planGenerateIrn with the 3 guards + ₹50k EWB
rule) · schemas/einvoice.ts · generate_einvoice_irn docTool (tools 226) ·
invoice-view Generate-IRN button → server action through runCommit (a REAL
14th commit door — the M15 grep contract count moved 13→14, pinned) · print
meta +IRN Ack No / +e-Way Bill No rows · view block (stamped values, or the
door on eligible invoices). Tests: einvoice.test NEW 10 (determinism ×2,
formats, guards ×2, threshold both sides, one-IRN rule, print rows both
sides, tool + count). Gates: tsc src/ 0 · 968 vitest · eval --static PASS ·
context_check 540→545/545 NO DRIFT · route_smoke_m23 15/15. Gap D #11
CLOSED — the v1-promised mock IRN exists, deterministically, behind both
doors.
