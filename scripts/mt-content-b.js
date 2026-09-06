/**
 * Manual Testing Guide — content module B (Sections 5-6).
 */
module.exports = [

  // ================= SECTION 5 =================
  { h1: "5. End-to-End Order Flow Test (The Golden Chain)" },
  { p: "This is the centerpiece of the manual suite: one export order walked through the entire factory and settled in full. The chain mirrors the automated industry-chain E2E test (tests/pipeline/industry-chain.test.ts), which asserts stock-ledger effects at every hop; the manual run performs the same stages through the forms (with the agent as an alternative door) and verifies the same effects through the registers. Execute the stages in order — each stage's precondition is the previous stage's acceptance criteria." },
  { p: "The golden quantities are fixed so the expected results are computable. Order 1,000 pcs (500 Black M + 500 Black L) at ₹210 per piece. Cut 1,000. Produce 950 good. Reject 20 (scrap). Rework 10 (document only). Despatch 930. Invoice ₹195,300 taxable plus 5% GST = ₹205,065. Collect ₹205,065 in full. If you vary the quantities, recompute the expectations with the same arithmetic — the invariants (net stock to zero, ledger closure to zero, invoice status paid) do not change." },
  { h2: "5.0 Stage 0 — Test Data Preflight" },
  { tcTable: [
    ["GF-00", "Confirm the seeded masters exist: buyer B001 (Acme Corp USA), style S-1001 (Mens Round Neck T-Shirt), colours Black, sizes M and L, party CUS001, yarn Y-30COT, godowns G1/G2, department D4 (Sewing), line L1, operator E001. Pick a unique order number MT-<date>-SO for the run.", "All masters are present (they are seed data and must never be edited). The chosen order number does not exist in /orders/register."],
  ]},
  { p: "If yarn Y-30COT is absent in your database (the yarn list may vary between copies), create it first at the yarn master screen with code Y-30COT and a 30s combed cotton description — the BOM stage references it by code." },

  { h2: "5.1 Stage 1 — Sales Order (SO-####)" },
  { p: "Purpose: book the export order. Path: /orders/new (form) or the agent (AG-03 pattern). Fill the header: order number MT-<date>-SO (or blank for auto SO numbering), buyer B001, style S-1001, delivery date, order type Export. Lines: Black / M / 500 / 210 and Black / L / 500 / 210. Submit and confirm the commit." },
  { tcTable: [
    ["GF-01", "Create the order with the two lines above; then open the Order Hub and the order register.", "The order view shows totalPcs 1,000 and total value ₹2,10,000 (en-IN formatting). The register gains one row with status open. No stock effect exists yet — the stock ledger gains no row for the order."],
  ]},

  { h2: "5.2 Stage 2 — Bill of Materials (BOM)" },
  { p: "Purpose: define the fabric recipe so programs and procurement can be proposed. Path: the BOM section of the Order Hub, or the agent with create_bom for style S-1001. Line: yarn Y-30COT, qty 250, rate 320." },
  { tcTable: [
    ["GF-02", "Create the BOM line; reopen the Order Hub BOM section (or ask the agent for the style BOM).", "The BOM shows one line of 250 kg at ₹320 (value ₹80,000). No stock effect. The propose-programs screen (PR-02) now proposes requirements from this BOM."],
  ]},

  { h2: "5.3 Stage 3 — Knitting Program (PGM-####)" },
  { p: "Purpose: convert BOM requirement into a production program. Path: /programs/new or /programs/propose (propose pre-fills from the BOM). Fields: order MT-<date>-SO, stage knitting, yarn Y-30COT, required 250 kg, target date." },
  { tcTable: [
    ["GF-03", "Create the program; open /programs/status with the order filter and the program view.", "The program number matches PGM-####. The status register shows required 250 kg, actual 0, balance 250 kg. The ProgBalance row is created (agent query what is next confirms program state true)."],
  ]},

  { h2: "5.4 Stage 4 — Purchase Order (PO-####)" },
  { p: "Purpose: order the yarn from a supplier. Path: /procurement/po or the agent. Fields: supplier party (any seeded yarn supplier), lines yarn Y-30COT qty 250 rate 320, delivery date, godown G1." },
  { tcTable: [
    ["GF-04", "Create the PO; open /procurement/po and the PO view; open the approval inbox.", "The PO registers with number PO-#### and value ₹80,000. A pending approval for the PO appears in the inbox (auto-submitted at commit). No stock effect. If the PO exceeds budget tolerance a warn verdict is shown on the plan card (expected only when you deviate from the golden numbers)."],
  ]},

  { h2: "5.5 Stage 5 — GRN: Yarn Receipt (GRN-####)" },
  { p: "Purpose: receive the yarn into the main store. Path: /procurement/grn or the agent with receive_grn. Fields: against the PO, yarn Y-30COT qty 250 kg, rate 320, godown G1." },
  { tcTable: [
    ["GF-05", "Receive the GRN; open /inventory/stock (yarn tab) and /inventory/register.", "The stock register gains an IN row for 250 kg at G1. Current stock for Y-30COT at G1 increases by 250 kg valued at WAC. The PO balance reduces to zero (or shows received in full)."],
  ]},

  { h2: "5.6 Stage 6 — Jobwork Out: Fabric to Jobworker (JW-####)" },
  { p: "Purpose: send knitted fabric out for dyeing at an external jobworker. Path: /jobwork/order (DC out) or the agent with create_jobwork_order. Fields: jobworker party, process dyeing, material fabric with qty (kg), out godown G1, godown G3 as destination." },
  { tcTable: [
    ["GF-06", "Create the jobwork DC; open /jobwork/register.", "The DC registers as JW-####. The register shows material out (kg) with balance pending return for that jobworker. The jobworker exposure view (party balance) reflects the value at process."],
  ]},

  { h2: "5.7 Stage 7 — Jobwork Receipt In" },
  { p: "Purpose: receive the dyed fabric back. Path: /jobwork/receipt (update-only form against the DC) or the agent with receive_jobwork. Fields: the DC number, received qty (kg), process rate." },
  { tcTable: [
    ["GF-07", "Receive the fabric in; reopen /jobwork/register.", "The jobwork balance reduces to zero (or to the unreceived remainder if you receive partially). Stock returns to G1 as processed fabric identity (process GRN IN row in the stock register)."],
  ]},

  { h2: "5.8 Stage 8 — Cut Order (CUT-####): Pieces Enter G1" },
  { p: "Purpose: cut fabric into ready-to-cut pieces. This is the first piece-bucket hop. Path: /cutting/job-order or the agent with create_cut_order. Fields: order MT-<date>-SO, fabric issued 250 kg, totalPcs 1,000, marker length 1.8, plies 80, efficiency 92, output godown G1." },
  { tcTable: [
    ["GF-08", "Create the cut order; open /pieces/stock (or /inventory/stock pcs view) filtered to the order, and /inventory/ledger filtered to ready_to_cut_in.", "The cut order registers as CUT-####. G1 pieces for the order equal exactly 1,000. The stock ledger gains a ready_to_cut_in row with inPcs 1,000. /cutting/ready-to-cut shows the order as available to issue."],
  ]},

  { h2: "5.9 Stage 9 — Issue to Line (LI-####): Pieces Leave G1" },
  { p: "Purpose: move ready-to-cut pieces to the sewing line. Path: /production/issue or the agent with issue_to_line. Fields: order, line L1, qty 1,000, from G1." },
  { tcTable: [
    ["GF-09", "Create the line issue; open the issue view and /pieces/stock for the order.", "The issue registers as LI-#### with status issued. G1 pieces for the order drop to exactly 0. The stock ledger gains a ready_to_cut_out row with outPcs 1,000. The line WIP (production line status) shows 1,000 pcs on L1."],
  ]},

  { h2: "5.10 Stage 10 — Production Entry: Good Pieces Enter G2" },
  { p: "Purpose: record sewing output with an operator (wages accrue per piece rate). Path: /production/entry or the agent with post_production_entry. Fields: order, dept D4, prod date today, bundle B1, operator E001, qty 950, rate 12." },
  { tcTable: [
    ["GF-10", "Create the production entry; open /pieces/stock and /production/register for the order; open the operator statement for E001.", "G2 pieces for the order equal exactly 950. The stock ledger gains a production_in row with inPcs 950. The production register shows the entry with wage amount ₹11,400 (950 × 12). The operator statement earned column for the window includes ₹11,400."],
  ]},

  { h2: "5.11 Stage 11 — Rejection and Rework" },
  { p: "Purpose: account for damaged pieces and rework labor. Path: /pieces/rejection (agent post_rejection) for 20 pcs, type stitch_fault, action scrap, dept D4. Then /production/rework (agent post_rework) for 10 pcs, bundle RW1, operator E001, rate 8." },
  { tcTable: [
    ["GF-11", "Create the rejection, then the rework entry; re-check /pieces/stock for the order.", "The rejection registers as REJ-####; G2 pieces drop to exactly 930; the stock ledger gains a rejection_out row with outPcs 20. The rework entry is document-only: G2 remains 930 after it (no stock row), and the rework wage (10 × 8 = ₹80) appears in the operator statement window."],
  ]},

  { h2: "5.12 Stage 12 — Packing List (optional but recommended)" },
  { p: "Purpose: pack the finished goods for despatch. Path: /pieces/packing-list or the agent. Fields: order, total 930 pcs with size-wise lines mirroring production (rounded realistically), pack type carton." },
  { tcTable: [
    ["GF-12", "Create the packing list; open its view.", "The packing list registers (PL-####) with carton lines; the despatch stage can reference it. No stock effect (despatch is the moving stage)."],
  ]},

  { h2: "5.13 Stage 13 — Pcs Despatch (DC-####): Pieces Leave G2" },
  { p: "Purpose: despatch the finished goods. Path: /pieces/despatch or the agent with create_pcs_despatch. Fields: order MT-<date>-SO, totalPcs 930, vehicle TN33BX1234, lines style S-1001 qty 930 rate 210, from G2." },
  { tcTable: [
    ["GF-13", "Create the despatch DC; open /pieces/stock for the order and /dispatch/register.", "The DC registers as DC-####. G2 pieces for the order drop to exactly 0 (net stock for the order is now zero across all godowns). The stock ledger gains a sales_delivery row with outPcs 930. The despatch register lists the DC with vehicle and destination."],
  ]},

  { h2: "5.14 Stage 14 — Sales Invoice (INV-####)" },
  { p: "Purpose: book the despatch as a receivable. Path: /accounts/invoice or the agent with create_sales_invoice. Fields: order, party CUS001, bill type sales, totalQty 930, taxableValue 195,300 (930 × 210), gstRate 5, gstType cgst_sgst (local) or igst for an out-of-state party." },
  { tcTable: [
    ["GF-14", "Create the invoice; open the invoice view and /accounts/bills-register.", "The invoice registers as INV-#### with bill amount ₹205,065 (195,300 × 1.05) — GST auto-split sourced from the HSN master (CGST 2.5% + SGST 2.5% for a local party; IGST 5% for interstate). The bills register shows the open bill. Party balance for CUS001 increases by the bill amount."],
  ]},

  { h2: "5.15 Stage 15 — Cost Sheet (CS-####)" },
  { p: "Purpose: record the order P&L. Path: /costing/cost-sheet or the agent with create_cost_sheet. Fields: order, fabric 80,000, trim 12,000, CM 11,400, washing 5,000, packing 4,000, overheads 6,000, selling price 195,300. Optionally add component lines from the cost-component library." },
  { tcTable: [
    ["GF-15", "Create the cost sheet; open its view.", "The cost sheet registers with total cost ₹1,18,400, per-pc cost ₹127.31 (on 930 despatched), and computed margin 39.35% ((195,300 − 118,400) / 195,300). The Order Hub est-vs-actual section shows the deltas against production and jobwork actuals (CM from production entries: 950 × 12 = ₹11,400 — note rework wages are excluded from the CM comparator)."],
  ]},

  { h2: "5.16 Stage 16 — Collection and Settlement (RCP-####)" },
  { p: "Purpose: collect the invoice in full and close the money loop. Path: /accounts/payments (direction in) or the agent with record_payment. Fields: party CUS001, amount 205,065, direction in, invoice INV-####, order, mode bank, reference UTR-MT-####." },
  { tcTable: [
    ["GF-16", "Record the payment; open the payment view, the invoice view, and /accounts/party-ledger for CUS001.", "The receipt registers as RCP-####. The payment view shows the allocation: ₹205,065 fully allocated, on-account 0. The invoice status flips to paid. The party ledger for CUS001 closes the receivable to zero for this chain (bills minus receipts). A companion receipt journal voucher (V-####) is written with the party linkage."],
  ]},

  { h2: "5.17 Final Verification — Pipeline Complete" },
  { tcTable: [
    ["GF-17", "Ask the agent: what is next for order MT-<date>-SO. Verify the summary and the registers one last time.", "The agent reports the pipeline complete with producedPct 95 (950 of 1,000). Net stock for the order across G1/G2 is zero. The order register row can be closed via /orders/close. The daily in/out register (/registers/daily-in-out) shows today's quantities for the stages executed."],
  ]},
  { p: "If any stage failed its acceptance criteria, record the case ID (GF-##), the stage, the observed values, and a screenshot. Do not proceed past a failed stage for that order — later stages depend on the earlier stock states, and continuing produces misleading failures." },

  // ================= SECTION 6 =================
  { h1: "6. Negative and Edge-Case Tests" },
  { p: "The negative suite confirms the system fails safely: invalid input is rejected with clear messages, guarded operations are blocked or flagged, and no partial state is ever left behind. Each case below must end with zero residue — check the register where the document would have appeared and confirm nothing was created." },
  { tcTable: [
    ["N-01", "On /orders/new, submit with buyer and style empty; then with qty 0 and a negative rate.", "Zod validation errors render inline per field; no POST reaches the service; no order appears in the register."],
    ["N-02", "Ask the agent to create an order with an unknown buyer code (for example B-NOPE).", "The agent responds honestly that the master does not exist and offers to create it; no plan card is committable; no order is created."],
    ["N-03", "Attempt to create two orders with the same explicit number (repeat the MT- order number).", "The second create is refused with a duplicate-number error; numbering remains gap-free. Auto-numbering (blank field) never collides."],
    ["N-04", "Create a PO with a rate far over the budget (for example 10× the golden rate) through the agent.", "The plan card shows the tolerance verdict (warn or block per flag configuration); a blocking verdict prevents commit; a warn verdict commits but is flagged and auditable."],
    ["N-05", "Log in as the restricted user created in AD-03; attempt to open /accounts and /hr directly by URL.", "The restricted sidebar shows only Orders; direct URL access is denied (403 or redirect per the rights guard); the login session remains valid for permitted routes."],
    ["N-06", "Attempt login with a deactivated user (from AD-02).", "Login is refused regardless of correct credentials; the error message does not leak whether the account exists."],
    ["N-07", "Record a payment larger than the open invoice amount (for example ₹210,000 against the ₹205,065 bill).", "The allocation fills the invoice; the remainder is recorded explicitly as on-account (never silently dropped); the ledger balances remain consistent."],
    ["N-08", "Create a supplier bill 5% over the matched PO/GRN figures.", "The three-way match verdict on the plan card flags the over-bill with a warning chip; commit proceeds only with acknowledgment; the bill-pass stage shows the verdict."],
    ["N-09", "Cancel a document that supports reversal (for example an invoice with no payment, or a purchase order before approval).", "The cancel action writes compensating ledger entries restoring the exact prior state (G3 reversal); stock and party balance return to pre-document values; the register marks the document cancelled, not deleted."],
    ["N-10", "In the payroll flow, commit a payroll run twice, and attempt to print a payslip for a draft run.", "The second commit is refused (double-commit guard); the draft payslip returns not-found (a payslip is a payment instrument — committed runs only); masked identifiers never expose full bank data."],
  ]},
  { p: "Additionally, while executing any negative case, watch the browser console: error cards and validation messages are expected, but unhandled page errors or console exceptions are defects even on failure paths. The E2E precedent in this project treats zero console errors as the bar for negative flows too, with the intended 401/4xx responses explicitly allowed." },
];
