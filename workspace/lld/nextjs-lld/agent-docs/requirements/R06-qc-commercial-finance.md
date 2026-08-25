# R06 - QC, Commercial & Finance

## 1. Purpose & business context

R06 owns the money side of the loop: lab/QC test records that gate quality, the job-work
billing chain (bills register, bill pass with TDS, add/ded heads), the sales invoice family
with GST split and packing lists, debit notes (FCY at PO rate), payments (including wages),
party balances in three views (absolute, program-wise, value at cumulative rate), the
cumulative rate engine that values everything (Tgr_StockRatePost root parity), unbilled
accrual, Tally export, and HSN masters. Rate accuracy flows from RATE- into every PTY-/BIL-
number, so the engine is specified with the verified root-trigger branches and explicitly
excludes the legacy test-data filter defect (11 sec. 3 #1).

## 2. Scope (legacy forms in)

- QC & lab: FrmLabTest, FrmNewLabTest, FrmLabTestParameters, FrmLabTestInputParameters,
  FrmLabTestStages, mobile QC inspection (/m/qc/inspection) (06 sec. J; 02 sec. 12).
- Commercial: frmSalINV, frmNewInv, FrmCommericalInv_New, FrmLocalInvoice,
  FrmLocalInvConfirm, frmPieceInv(_1), frmDelCumInv, FrmInvComm, FrmPackingList(_Domestic),
  FrmLocalInvPackingList(_Solid), FrmLocInvPackingListFormat, FrmBillsReg and variants,
  frmBillPass, FrmSupplierBillReg, FrmBillsAddDedReport, FrmNonBillable, to-be-value view,
  frmdebitnote, frmDirectDebitNote, debit registers, FrmPaymentReg(_Wages),
  FrmPartyBalanceRegister, FrmPartyBlnc, outstanding view, FrmTally_GSTSetup, FrmHSN,
  FrmHSNPce (06 sec. J; 02 sec. 13).
- Rate confirmation usage in billing (pending/approved lists owned by R03 PRC-014/015;
  R06 consumes the approved rates).
- Mobile parity: /m/bills/lookup, /m/party/balance (06 sec. K).
- Out of scope: rate-confirmation approval flow and rate masters (R03), production wages
  capture and wage registers (R05 WAG-), despatch DC save and frmPcsDelRecClose (R03),
  budget/daily-P&L/quick-costing pipelines (costing R-doc), report engine internals (S2.5).

## 3. Functional requirements

| FR ID | Requirement (testable "shall") | Source | Priority | Stage |
|---|---|---|---|---|
| QC-001 | The system shall capture lab test results per lot/stage (FrmLabTest, FrmNewLabTest) via POST /api/qc/test. | 02 sec. 12; 04 sec. 10; 06 sec. J | P0 | S4 |
| QC-002 | The system shall maintain lab test parameters and input parameters (FrmLabTestParameters, FrmLabTestInputParameters: GSM, shrinkage, pH, etc.) via POST /api/qc/parameters. | 02 sec. 12; 04 sec. 10; 06 sec. J | P0 | S4 |
| QC-003 | The system shall maintain lab test stages (FrmLabTestStages) via POST /api/qc/stages. | 02 sec. 12; 04 sec. 10; 06 sec. J | P1 | S4 |
| QC-004 | The system shall render the QC register (/qc/register) with Vue_LabTestGarments parity. | 02 sec. 12; 06 sec. J | P1 | S4 |
| QC-005 | The system shall provide mobile QC inspection parity (/m/qc/inspection) with checkpoint capture gated by chkpointcomp. | 02 sec. 20; 06 sec. K; 07 sec. 2.3 | P1 | S4 |
| QC-006 | The system shall provide the mobile machine breakdown entry (/m/breakdown-report) linked to the machine master history. | 06 sec. K; 02 sec. 18 | P2 | S4 |
| BIL-001 | The system shall use approved rate confirmations (Pro_RateCnfPcs1/2 via the R03 rate-confirm flow) as the billing rate source for job-work bills on orders governed by need_rate_conf_for_dc / rateconfirmcheck(+dev). | 03 sec. 6; 02 sec. 5, sec. 13; 07 sec. 2.3 | P0 | S5 |
| BIL-002 | The system shall serve the bills register variants (SP_BillsRegView_yarn, SP_BillsRegView_fab*, SP_BillsRegView_acc, SP_BillsRegView_cm, SP_BillsRegView_prd) via GET /api/commercial/bills?variant= (yarn, fab, acc, cm, prd). | 02 sec. 13; 04 sec. 9; 06 sec. J | P0 | S5 |
| BIL-003 | The system shall present TCS and order-split (ord-split) columns in the bills register per FrmBillsReg parity. | 02 sec. 13; 06 sec. J | P1 | S5 |
| BIL-004 | The system shall pass bills (frmBillPass) via POST /api/commercial/bills/:id/pass setting PassFlg, TDS_Percent, and TDSAmount. | 02 sec. 13; 04 sec. 9; 06 sec. J | P0 | S5 |
| BIL-005 | The system shall enforce the bill-pass rule per the doublebillpassreqd flag before a passed bill becomes payable. | 02 sec. 13; 07 sec. 2.3 | P0 | S5 |
| BIL-006 | The system shall apply bill date checks (billdtchk_serverdt with its +dev, and entrydatedev) to bill document dates. | 03 sec. 6; 07 sec. 2.1 | P0 | S5 |
| BIL-007 | The system shall suppress TDS computation when notds is on. | 07 sec. 2.3 | P0 | S5 |
| BIL-008 | The system shall validate bill qty vs GRN/DC qty against bill_bcheck and bill_bcheckdev, warning or blocking per the flag. | 03 sec. 6; 07 sec. 2.1 | P0 | S5 |
| BIL-009 | The system shall maintain add/deduction heads (Mas_AddDed) attachable to bills and print FrmBillsAddDedReport. | 02 sec. 13; 06 sec. J; 07 sec. 1.2 | P1 | S5 |
| BIL-010 | The system shall provide the supplier bill register (FrmSupplierBillReg). | 02 sec. 13; 06 sec. J | P1 | S5 |
| BIL-011 | The system shall provide the non-billable entry screen (FrmNonBillable). | 02 sec. 13; 06 sec. J | P2 | S5 |
| BIL-012 | The system shall compute the unbilled accrual to-be-value (SP_BilltoBeValue, _Approx, _Detail variants) via GET /api/commercial/bills/to-be-value?ordId, valuing pending party balances at the cumulative rate. | 02 sec. 13; 03 sec. 4.5; 04 sec. 9; 06 sec. J | P0 | S5 |
| BIL-013 | The system shall provide mobile bill lookup parity (/m/bills/lookup) against the bills endpoints. | 02 sec. 20; 06 sec. K | P1 | S5 |
| BIL-014 | The system shall allocate bill numbers per the samebillnoallowedflg policy through NumberingService. | 07 sec. 2.2 | P1 | S5 |
| BIL-015 | The system shall maintain HSN masters (FrmHSN, FrmHSNPce with NBPercL/H and BPercL/H slabs) at /commercial/hsn (shared with statutory masters). | 02 sec. 13, sec. 18; 06 sec. C, sec. J | P0 | S5 |
| BIL-016 | The system shall print the compliance registers Rpt_InputGST, RptPartywiseBillGST(_Abstract), RptSalesRegYarn/Fab_GST, and Rpt_TDS from Trs_Bills/HSN data. | 07 sec. 1.2 | P1 | S5 |
| BIL-017 | The system shall export purchase-and-expense data to Tally via POST /api/commercial/tally-export (RptTallyPurAndExp pending export) with party mapping per tdstallyname, configured on the FrmTally_GSTSetup screen. | 02 sec. 13; 04 sec. 9; 07 sec. 1.2, 2.3 | P1 | S5 |
| INV-001 | The system shall create sales invoices (frmSalINV, frmNewInv) via POST /api/commercial/invoice/sales saving Trs_Salinv joined to attached DCs in one transaction. | 02 sec. 13; 04 sec. 9; 06 sec. J | P0 | S5 |
| INV-002 | The system shall provide DcAttachPanel to pick DCs into invoice lines with rate x RateUom (Mas_RateUom). | 02 sec. 13 | P0 | S5 |
| INV-003 | The system shall compute GST as CGST/SGST for intra-state parties and IGST for inter-state parties by state, via GstPanel/GstSummary, when gstenable is on. | 02 sec. 13, sec. 21; 07 sec. 2.3 | P0 | S5 |
| INV-004 | The system shall take the tax percent from the HSN master, overriding with the Trs_Del4 values when present. | 02 sec. 13 | P0 | S5 |
| INV-005 | The system shall allocate invoice numbers with prefixes from Mas_SalesGrp through NumberingService. | 02 sec. 13; 03 sec. 7 | P0 | S5 |
| INV-006 | The system shall create commercial invoices (FrmCommericalInv_New) via POST /api/commercial/invoice/commercial gated by convinvreq, with exchange-amount percent per commercialinvexcamtper and shipping expenses per shippingexpenses. | 02 sec. 13; 04 sec. 9; 06 sec. J; 07 sec. 2.3 | P1 | S5 |
| INV-007 | The system shall create local invoices (FrmLocalInvoice) and their confirmation pass (FrmLocalInvConfirm) via POST /api/commercial/invoice/local. | 02 sec. 13; 04 sec. 9; 06 sec. J | P1 | S5 |
| INV-008 | The system shall create piece invoices (frmPieceInv and _1 variant) via POST /api/commercial/invoice/piece capturing no_of_box and pcs_per_box. | 02 sec. 13; 04 sec. 9; 06 sec. J | P1 | S5 |
| INV-009 | The system shall print the domestic invoice variants DomesticInvoice_GST and DomesticInvoice_New from Vue_SalesInvoice* data. | 07 sec. 1.1 | P1 | S5 |
| INV-010 | The system shall create packing lists (FrmPackingList, _Domestic, FrmLocalInvPackingList, _Solid, FrmLocInvPackingListFormat) via POST /api/commercial/packing-list. | 02 sec. 13; 04 sec. 9; 06 sec. J | P0 | S5 |
| INV-011 | The system shall provide the DC-cum-invoice mode (frmDelCumInv) producing DelCumInv documents when saledccuminvreq is on. | 02 sec. 13; 06 sec. J; 07 sec. 1.1, 2.3 | P1 | S5 |
| INV-012 | The system shall print invoices from templates Rpt_SalesInvoice (GST, Pcs, OrdWise, WithoutTax variants), CommercialBill, CourierInv, PcsSalesInvoice, and JobwrkInvoice from Vue_SalesInvoice* data. | 07 sec. 1.1 | P1 | S5 |
| INV-013 | The system shall source invoice previews from SP_Vue_SalesInvoice parity including the _DC, _Domestic, and _Pcs variants. | 02 sec. 13 | P1 | S5 |
| INV-014 | The system shall provide the invoice commission view (FrmInvComm, TradeCommission). | 02 sec. 13; 06 sec. J; 07 sec. 1.2 | P2 | S5 |
| INV-015 | The system shall require invoice selection in despatch when invselreqindespent is on. | 07 sec. 2.3 | P1 | S5 |
| INV-016 | The system shall apply the salesinvhead print-heading policy on invoice prints. | 07 sec. 2.2 | P2 | S5 |
| INV-017 | The system shall block over-despatch against program balance when saledcagainstpgmbalchk is on, coordinating the despatch DC (R03) with invoicing. | 03 sec. 6; 07 sec. 2.3 | P0 | S5 |
| INV-018 | The system shall create CARTON tracking units and carton QR labels at packing plus the despatch edge to DESPATCH_DOC when qr_carton_labels is on (default OFF). | 03 sec. 10; 07 sec. 3.1; 06 sec. N | P2 | S7 |
| INV-019 | The system shall save every R06 commercial document in exactly one transaction with projector scheduling and an outbox event, and reverse it as a compensating posting - no hard deletes. | 03 sec. 3; 04 sec. 14 | P0 | S5 |
| DEB-001 | The system shall create debit notes (frmdebitnote, frmDirectDebitNote) saving Trs_Deb1/2 with the Brnid link via POST /api/commercial/debit. | 02 sec. 13; 04 sec. 9; 06 sec. J | P0 | S5 |
| DEB-002 | The system shall create yarn, fabric, and accessory debit note variants, converting FCY amounts at the PO rate. | 02 sec. 13; 06 sec. J | P0 | S5 |
| DEB-003 | The system shall serve the debit registers (SP_Rpt_DebitNote* yarn/fab/acc) via the debit register endpoint. | 02 sec. 13; 04 sec. 9; 06 sec. J | P1 | S5 |
| DEB-004 | The system shall print debit notes from templates DebitYarn, DebitFab, DebitAcc(+GST), DirectDebitYarn(GST), RptDebitNotePcs(GST), and DebitComm_GST from Trs_Deb1/2 data. | 07 sec. 1.1 | P1 | S5 |
| DEB-005 | The system shall split debit-note GST into CGST/SGST or IGST by party state per the INV-003 rule. | 02 sec. 13, sec. 21 | P1 | S5 |
| DEB-006 | The system shall apply debit notes to the party balance document-stack (ST_PartyBalance_Abs) via PartyBalanceAbsProjector scheduling. | 03 sec. 5 | P0 | S5 |
| DEB-007 | The system shall reverse any debit note as a compensating posting in one transaction restoring the exact prior balance state. | 03 sec. 3 | P0 | S5 |
| PAY-001 | The system shall record payments (FrmPaymentReg) via POST /api/commercial/payment in one transaction. | 02 sec. 13; 04 sec. 9; 06 sec. J | P0 | S5 |
| PAY-002 | The system shall record wage payments (FrmPaymentReg_Wages) through the same endpoint with the +wages kind. | 02 sec. 13; 04 sec. 9; 06 sec. J | P1 | S5 |
| PAY-003 | The system shall support order transfer of wage cost on payment, moving wage cost between orders per the payment allocation. | 04 sec. 9; TASKS S5.5 | P1 | S5 |
| PAY-004 | The system shall provide payment registers with CachedRptPayment* parity. | 02 sec. 13; 06 sec. J; 07 sec. 1.2 | P1 | S5 |
| PAY-005 | The system shall update ST_PartyBalance_Abs (document-stack) for every payment via PartyBalanceAbsProjector scheduling. | 03 sec. 5 | P0 | S5 |
| PAY-006 | The system shall complete the bill -> pass -> TDS -> payment chain end-to-end, matching the Stage 5 exit criterion. | PLAN sec. 4 S5; 04 sec. 9 | P0 | S5 |
| PAY-007 | The system shall reverse any payment as a compensating posting in one transaction restoring the exact prior balance state. | 03 sec. 3 | P0 | S5 |
| PTY-001 | The system shall expose the absolute document-wise party balance (ST_PartyBalance_Abs document-stack) via GET /api/commercial/party-balance?view=abs. | 03 sec. 4.4, sec. 5; 04 sec. 9 | P0 | S5 |
| PTY-002 | The system shall expose the program-wise party balance view via GET /api/commercial/party-balance?view=prog. | 02 sec. 13; 04 sec. 9; 06 sec. J | P0 | S5 |
| PTY-003 | The system shall expose party outstanding in VALUE at the cumulative rate via PartyOutQry through GET /api/commercial/party-balance?view=value. | 02 sec. 13; 03 sec. 4.5; 04 sec. 9 | P0 | S5 |
| PTY-004 | The system shall expose SP_Party_Outstanding_Rate_Arrival for outstanding rate-arrival analysis on the outstanding page. | 02 sec. 13; 06 sec. J | P1 | S5 |
| PTY-005 | The system shall provide the party balance register screens (FrmPartyBalanceRegister, FrmPartyBlnc) with TempPartyBal staging mapped to the jobId report pattern. | 02 sec. 13; 06 sec. J | P1 | S5 |
| PTY-006 | The system shall provide the outstanding screen (/commercial/party-balance/outstanding) showing PartyOutQry values. | 02 sec. 13 | P0 | S5 |
| PTY-007 | The system shall provide mobile party-balance parity (/m/party/balance) against the party-balance endpoints. | 02 sec. 20; 06 sec. K | P1 | S5 |
| PTY-008 | The system shall maintain ST_PartyBalance_Abs through PartyBalanceAbsProjector parity (app calls + Trg_ST_PartyBalance_Abs_Update). | 03 sec. 5 | P0 | S5 |
| PTY-009 | The system shall surface the job-order balance (Sp_PartyWiseJobOrderBal) in the party views for cutting job-workers. | 03 sec. 4.1 | P2 | S5 |
| PTY-010 | The system shall render the shared PartyBalanceCard component combining absolute, program-wise, and value-at-cumulative-rate views. | 02 sec. 21 | P0 | S5 |
| RATE-001 | The system shall implement the cumulative rate engine with parity to the ROOT Tgr_StockRatePost (2025, 950 lines); the Updated\ 2021 baseline (573 lines, no fabric-to-yarn-in-knitting, knitting, or YTwist logic) shall NOT be treated as canonical. | 03 sec. 4.5; 11 sec. 2.8 | P0 | S5 |
| RATE-002 | The system shall recompute on every StockRatePost insert/update/delete, walking depts in Sno order (cursor) and excluding ordermas.jobno=0 rows. | 03 sec. 4.5 | P0 | S5 |
| RATE-003 | The system shall set Prs=1 legs to cumbillrate = Billrate when present else Procrate (yarn base). | 03 sec. 4.5 | P0 | S5 |
| RATE-004 | The system shall set Prs=2 legs to yarn + dyeing: sample branch @Y_Rate+@Rate; order branch SUM of Prog_Ycns consPer-weighted yarn + rate. | 03 sec. 4.5 | P0 | S5 |
| RATE-005 | The system shall set Prs=4 / DeptGrpCode=4 legs to knitting, and Prs=-4 legs to YTwist using Prog_YTwist_MAs wgtper. | 03 sec. 4.5 | P0 | S5 |
| RATE-006 | The system shall set all other legs to own rate + previous-Sno cumbillrate (backward scan; YF='Y' vs 'F' legs). | 03 sec. 4.5 | P0 | S5 |
| RATE-007 | The system shall apply blended-count rates (Pro_YrnCns / Prog_Ycns %) and the dept 15 FABRIC-TO-YARN leg (Prog_ClrComb.LooseFab) gated by Options1.FabToYarnRate_ReqInKnit. | 03 sec. 4.5; 11 sec. 2.8 | P0 | S5 |
| RATE-008 | The system shall apply the parallel sample-order copy (ordertype='Sample' or no OrdSeq rows). | 03 sec. 4.5 | P1 | S5 |
| RATE-009 | The system shall NOT port the root trigger's FTY prev-rate query filter hardcoded to ordid=2028 and sno=4 and cntid=229 and colid=151 (test data left in production; other orders got 0 from that branch). | 03 sec. 4.5; 11 sec. 3 #1 | P0 | S5 |
| RATE-010 | The system shall feed the engine's cumbillrate to all four consumers: PartyOutQry valuation, SP_BilltoBeValue, budget-vs-actual, and piece cost. | 03 sec. 4.5, sec. 9 | P0 | S5 |
| RATE-011 | The system shall render the CumulativeRateCard component showing cumbillrate per order/dept leg (StockRatePost view). | 02 sec. 21 | P1 | S5 |
| RATE-012 | The system shall diff the root on-disk trigger against the live DB trigger before implementation and record drift (B2 pattern). | 03 sec. 4.5; 11 sec. 6.3 | P0 | S5 |
| RATE-013 | The system shall maintain piece cost through PcsStockRatePost parity consuming cumbillrate. | 03 sec. 4.5 | P1 | S5 |

## 4. Business rules & validations

| BR | Rule (flags verbatim) | Source |
|---|---|---|
| BR-01 | Bill balance: bill_bcheck and bill_bcheckdev validate bill qty vs GRN/DC qty, warn/block per the flag. | 03 sec. 6; 07 sec. 2.1 |
| BR-02 | Bill pass: PassFlg with TDS_Percent/TDSAmount; rule shaped by doublebillpassreqd; TDS suppressed when notds. | 02 sec. 13; 07 sec. 2.3 |
| BR-03 | Bill dating: billdtchk_serverdt(+dev) and entrydatedev bound back-dating of bills. | 03 sec. 6; 07 sec. 2.1 |
| BR-04 | Rate gate before DC/billing: need_rate_conf_for_dc / rateconfirmcheck(+dev) / lotwise_rate - approved Pro_RateCnfPcs1/2 rates are the billing source (BIL-001). | 03 sec. 6; 07 sec. 2.3 |
| BR-05 | Piece-rate caps: pcsrateamt_excess_percent / prodbillamtdivper / jobexcess cap bill and entry amounts on production (prd/cm) bills. | 03 sec. 6; 07 sec. 2.1 |
| BR-06 | GST split: CGST+SGST for same-state party, IGST for different-state party, from Mas_StateMaster on the party; fields enabled by gstenable; HSN % from the HSN master else the Trs_Del4 override. | 02 sec. 13, sec. 21; 07 sec. 2.3 |
| BR-07 | Invoice policies: saledccuminvreq enables DC-cum-invoice; convinvreq gates the commercial invoice; commercialinvexcamtper and shippingexpenses shape its amounts; salesinvhead sets print headings; invselreqindespent forces invoice selection in despatch. | 07 sec. 2.2, 2.3; 02 sec. 13 |
| BR-08 | Over-despatch: saledcagainstpgmbalchk blocks despatch beyond program balance (despatch leg owned by R03, invoicing coordinates). | 03 sec. 6; 07 sec. 2.3 |
| BR-09 | Numbering: invoice prefixes from Mas_SalesGrp; bill numbering per samebillnoallowedflg; all through NumberingService (finyear-scoped). | 03 sec. 7; 07 sec. 2.2 |
| BR-10 | Debit notes: Trs_Deb1/2 with Brnid link; FCY converted at PO rate; register the party-balance document-stack effect. | 02 sec. 13; 06 sec. J |
| BR-11 | Party balance views: absolute per-document stack (ST_PartyBalance_Abs), program-wise per item, and value at cumulative rate (PartyOutQry) must reconcile to the same underlying documents. | 03 sec. 4.4, sec. 5; 02 sec. 13 |
| BR-12 | Rate engine canonical source: root Tgr_StockRatePost (2025) incl. knitting (Prs=4), YTwist (Prs=-4), and fabric-to-yarn (FabToYarnRate_ReqInKnit) branches; guard conditions are behavior, not noise. | 03 sec. 4.5; 11 sec. 2.8, sec. 5 |
| BR-13 | Rate engine defect: the ordid=2028/sno=4/cntid=229/colid=151 hardcoded filter is a verified live defect and is NOT ported. | 03 sec. 4.5; 11 sec. 3 #1 |
| BR-14 | Reversal: every R06 document reverses via inverted-sign compensating posting in one transaction; raw deletes forbidden. | 03 sec. 3 |
| BR-15 | Unbilled accrual: SP_BilltoBeValue(_Approx/_Detail) values unbilled party balances at cumulative rate; a to-be-value must reconcile with PartyOutQry value view. | 03 sec. 4.5; 02 sec. 13 |
| BR-16 | Tally hand-off: export only (RptTallyPurAndExp) with tdstallyname party mapping; no import invented. | 02 sec. 13; 07 sec. 2.3 |
| BR-17 | HSN slabs: NBPercL/H and BPercL/H slabs on FrmHSNPce drive piece-invoice tax percents; HSN master takes precedence over Trs_Del4 only when present. | 06 sec. C, sec. J; 02 sec. 13 |

## 5. Data & postings

R06 documents post NO stock movements (bills, invoices, debits, payments act on the money
stack); the single movement-matrix input they consume is the sales/despatch leg (verbatim
from 03 sec. 4.1):

| Document | Type code | FABRIC ledger effect | Balance effect (projector) |
|---|---|---|---|
| Sales DC | Del, TrType 2, ProcessType S | CurrentStock - (buyer) | sales registers; ST_Ord_inHand on piece despatch |

Cumulative rate engine (verbatim from 03 sec. 4.5, ASCII):

```
on StockRatePost insert/update/delete:
  walk depts in Sno order (cursor, excludes ordermas.jobno=0):
    Prs=1  -> cumbillrate = Billrate ?? Procrate (yarn base)
    Prs=2  -> yarn + dyeing (sample branch: @Y_Rate+@Rate;
             order branch: SUM Prog_Ycns.consPer-weighted yarn + rate)
    Prs=4 / DeptGrpCode=4 -> knitting; Prs=-4 -> YTwist (Prog_YTwist_MAs wgtper)
    else   -> own rate + previous-Sno cumbillrate (scan backwards; YF='Y' vs 'F' legs)
  special: blended counts (Pro_YrnCns / Prog_Ycns %), dept 15 FABRIC TO YARN
           (Prog_ClrComb.LooseFab; gated by Options1.FabToYarnRate_ReqInKnit),
           parallel Sample-order copy (ordertype='Sample' or no OrdSeq rows)
consumers: PartyOutQry valuation, SP_BilltoBeValue, budget-vs-actual, piece cost
(PcsStockRatePost)
known legacy defect: root's FTY prev-rate query hardcodes ordid=2028/sno=4/cnt=229/col=151
(test data left in production) - rewrite must NOT port this filter
```

Balance projector rows owned/consumed by R06 (verbatim from 03 sec. 5):

| Projector | Legacy trigger/proc | Maintains |
|---|---|---|
| PartyBalanceAbsProjector | app calls + Trg_ST_PartyBalance_Abs_Update | ST_PartyBalance_Abs document-stack |
| OrdInHandProjector | Sp_MR_OrdInHand ('OR','DES','DEL') | ST_Ord_inHand + FCY/INR value |

Money documents and their stack effects: bill pass and payments append/settle rows on
ST_PartyBalance_Abs (document-stack); debit notes add receivable rows; invoices and
DC-cum-invoices close despatch value into billed value (sales registers); the value views
(PTY-003) and unbilled accrual (BIL-012) are computed reads at cumbillrate - never stored
duplicates.

## 6. UI & routes

| Route | Components | Legacy forms |
|---|---|---|
| /qc/tests | test entry form | FrmLabTest, FrmNewLabTest |
| /qc/parameters | parameter forms | FrmLabTestParameters, FrmLabTestInputParameters |
| /qc/stages | stage form | FrmLabTestStages |
| /qc/inspection | mobile inspection parity | mobile QC inspection |
| /qc/register | DataTable register | Vue_LabTestGarments view |
| /commercial/invoices/sales | DcAttachPanel, GstPanel, PreviewPrint | frmSalINV, frmNewInv, frmDelCumInv (toggle) |
| /commercial/invoices/commercial | commercial invoice form | FrmCommericalInv_New |
| /commercial/invoices/local | local invoice + confirm forms | FrmLocalInvoice, FrmLocalInvConfirm |
| /commercial/invoices/piece | piece invoice form (boxes) | frmPieceInv(_1) |
| /commercial/invoices/commission | commission view | FrmInvComm |
| /commercial/packing-list | packing list forms | FrmPackingList(_Domestic), FrmLocalInvPackingList(_Solid), FrmLocInvPackingListFormat |
| /commercial/bills/register | DataTable register (variants) | FrmBillsReg (SP_BillsRegView_*) |
| /commercial/bills/pass | bill pass form | frmBillPass |
| /commercial/bills/supplier | DataTable register | FrmSupplierBillReg |
| /commercial/bills/add-ded | add/ded report | FrmBillsAddDedReport |
| /commercial/bills/non-billable | non-billable form | FrmNonBillable |
| /commercial/bills/to-be-value | accrual view | to-be-value screens |
| /commercial/debits/new | debit note forms | frmdebitnote, frmDirectDebitNote |
| /commercial/debits/register | DataTable registers | debit registers (yarn/fab/acc) |
| /commercial/payments | payment form | FrmPaymentReg |
| /commercial/payments/wages | wages payment form | FrmPaymentReg_Wages |
| /commercial/payments/register | DataTable register | payment register/ledger |
| /commercial/party-balance | balance register | FrmPartyBalanceRegister, FrmPartyBlnc |
| /commercial/party-balance/outstanding | PartyOutQry view + CumulativeRateCard | outstanding screens |
| /commercial/party-balance/lookup | mobile lookup parity | mobile bill-lookup/party-balance |
| /commercial/tally-gst | Tally setup + pending export | FrmTally_GSTSetup, RptTallyPurAndExp |
| /commercial/hsn | SlabEditor forms | FrmHSN, FrmHSNPce |
| /m/bills/lookup, /m/party/balance | mobile parity | Commando lookup screens |

## 7. API endpoints (04 sec. 9, plus QC from sec. 10)

| Endpoint | Service | Purpose |
|---|---|---|
| POST /api/qc/test / parameters / stages | QcService.* | LabTest family |
| POST /api/commercial/invoice/sales\|commercial\|local\|piece | InvoiceService.* | DC attach + GST |
| POST /api/commercial/packing-list | PackingService.* | packing lists |
| GET /api/commercial/bills?variant=yarn\|fab\|acc\|cm\|prd | BillingService.register() | SP_BillsRegView_* |
| POST /api/commercial/bills/:id/pass | BillingService.pass() | TDS bill pass |
| GET /api/commercial/bills/to-be-value?ordId | BillingService.toBeValue() | unbilled accrual |
| POST /api/commercial/debit (+register) | DebitService.* | Trs_Deb1/2 |
| POST /api/commercial/payment (+wages) | PaymentService.* | FrmPaymentReg(_Wages) |
| GET /api/commercial/party-balance?view=abs\|prog\|value | PartyBalanceService.* | ST_* + PartyOutQry |
| POST /api/commercial/tally-export | TallyService.export() | RptTallyPurAndExp |
| POST /api/reports/:id/run / GET /api/reports/jobs/:jobId | ReportService.* | TempPartyBal-style staging |

## 8. Reports & prints (07 sec. 1.1, 1.2)

| Family | Templates | Data source |
|---|---|---|
| Invoices | Rpt_SalesInvoice (GST, Pcs, OrdWise, WithoutTax), DomesticInvoice_GST/New, JobwrkInvoice, CommercialBill, CourierInv, PcsSalesInvoice, SalesDCCumInv / DC_GST(_1) | Vue_SalesInvoice* |
| Debit notes | DebitYarn/Fab/Acc(+GST), DirectDebitYarn(GST), RptDebitNotePcs(GST), DebitComm_GST | Trs_Deb1/2 |
| Commercial registers | OrderReg, PartyBalanceAbs, PO Ledger, TradeCommission, UnitAck, WorkFlow, Expenses, Bills registers, Payment registers | SP_BillsRegView_* etc. |
| Compliance | Rpt_TDS, Rpt_InputGST, RptPartywiseBillGST(_Abstract), RptSalesRegYarn/Fab_GST, RptTallyPurAndExp, Form JJ list | Trs_Bills/HSN |
| Packing | RptPackList, Rpt_PackingList (packing family prints per 1.1) | Trs_Pcs/despatch |

## 9. Flags affecting this module

| Flag | Effect | Enforcement point |
|---|---|---|
| shipmentexcessallow | allow despatch in excess of order qty | DespatchService |
| bill_bcheck / bill_bcheckdev | bill vs GRN/DC qty | BillingService |
| doublebillpassreqd | bill pass rule | BillingService |
| notds | TDS off | BillingService |
| billdtchk_serverdt(+dev) / entrydatedev | bill date checks | BillingService |
| samebillnoallowedflg | bill numbering policy | NumberingService |
| need_rate_conf_for_dc / rateconfirmcheck(+dev) / lotwise_rate | rate gates feeding billing rates | DcService/BillingService |
| pcsrateamt_excess_percent / prodbillamtdivper / jobexcess | production-bill amount caps | BillingService |
| gstenable | GST fields on invoices/DCs | GstPanel/InvoiceService |
| saledccuminvreq / convinvreq / saledcagainstpgmbalchk | invoice/DC policies | InvoiceService |
| shippingexpenses / commercialinvexcamtper / salesinvhead | commercial invoice options | InvoiceService/PrintLayout |
| invselreqindespent | invoice selection in despatch | DespatchService/InvoiceService |
| tdstallyname | Tally party mapping | TallyService |
| billrptformat / formatno / preprintfolder | bill/invoice print formats | PrintLayout |
| FabToYarnRate_ReqInKnit (Options1) | fabric-to-yarn rate leg in the engine | RateEngine |
| chkpointcomp | QC inspection checkpoints | QcService |
| qr_carton_labels (new, default OFF) | carton QR at packing + despatch edge | LabelService (08) |

## 10. Traceability (legacy form -> FR IDs)

| Legacy form | FR IDs |
|---|---|
| FrmLabTest / FrmNewLabTest | QC-001 |
| FrmLabTestParameters / FrmLabTestInputParameters | QC-002 |
| FrmLabTestStages | QC-003 |
| mobile QC inspection | QC-005 |
| frmSalINV / frmNewInv | INV-001 to INV-005, INV-012, INV-013, INV-019 |
| FrmCommericalInv_New | INV-006 |
| FrmLocalInvoice / FrmLocalInvConfirm | INV-007 |
| frmPieceInv(_1) | INV-008 |
| frmDelCumInv | INV-011 |
| FrmInvComm | INV-014 |
| FrmPackingList(_Domestic) / FrmLocalInvPackingList(_Solid) / FrmLocInvPackingListFormat | INV-010 |
| FrmBillsReg (+variants) | BIL-002, BIL-003 |
| frmBillPass | BIL-004 to BIL-007 |
| FrmSupplierBillReg | BIL-010 |
| FrmBillsAddDedReport | BIL-009 |
| FrmNonBillable | BIL-011 |
| to-be-value screens | BIL-012, RATE-010 |
| frmdebitnote / frmDirectDebitNote | DEB-001, DEB-002 |
| debit registers | DEB-003 |
| FrmPaymentReg | PAY-001, PAY-004 to PAY-007 |
| FrmPaymentReg_Wages | PAY-002, PAY-003 |
| FrmPartyBalanceRegister / FrmPartyBlnc | PTY-001, PTY-002, PTY-005 |
| outstanding screens | PTY-003, PTY-004, PTY-006, RATE-011 |
| FrmTally_GSTSetup | BIL-017 |
| FrmHSN / FrmHSNPce | BIL-015, INV-004 |
| /m/bills/lookup | BIL-013 |
| /m/party/balance | PTY-007 |
| rate-confirm screens (consumed) | BIL-001 (approval flow R03 PRC-014/015) |

## 11. Open items / blockers

| ID | Item | Impact |
|---|---|---|
| B2 | Live-DB drift: Tgr_StockRatePost root vs the live DB trigger and the Updated\ 2021 baseline differ materially (11 sec. 2.8); RATE-012 requires the S0.2 catalog diff before the engine is coded. | Rate engine parity (RATE-001 to RATE-009). |
| B4 | Report parameters per .mrt for invoice/bill/debit/compliance prints are not extracted; never invent parameter lists - extract before S5 print PRs. | All sec. 8 prints. |
| OI-1 | doublebillpassreqd semantics are named but not described in the source docs (only "bill pass rule"); confirm the exact two-pass behavior against frmBillPass before coding BIL-005. | BIL-005. |
| OI-2 | FCY-at-PO-rate conversion for debit notes (DEB-002) has no named proc in the docs; identify the legacy conversion source (PO rate table + frmFcymaster/frmFCRmaster) before implementation. | DEB-002. |
| OI-3 | Tally export XML schema version is unspecified (R01 OB-04); capture a legacy RptTallyPurAndExp output as a parity fixture before BIL-017. | BIL-017. |
| OI-4 | FrmLocalInvConfirm confirmation-pass semantics (what changes between entry and confirm) need a legacy walk-through. | INV-007. |
| OI-5 | TempPartyBal staging (keying, purge) must be confirmed live before mapping to the jobId pattern in PTY-005 (same pattern as R02 OB-02). | PTY-005. |
| OI-6 | QC stage: no dedicated TASKS item exists for the QC family; QC- FRs are staged S4 alongside production capture - re-slot at planning if S5 sequencing is preferred. | QC-001 to QC-006 staging. |
| OI-7 | Order-transfer-of-wage-cost rules (PAY-003) are referenced only by TASKS S5.5; extract the legacy allocation logic before coding. | PAY-003. |
| OI-8 | HSN masters are mapped both under statutory masters (06 sec. C) and commercial (06 sec. J); confirm the single enforcement point (BIL-015) with the masters R-doc owner. | BIL-015 ownership. |
