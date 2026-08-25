# R01 - Platform Foundation (auth/session, rights, flags, numbering, error contract, shells, UI kit, admin, integrations)

Level-2 module requirements. Source docs: 02-COMPONENT-TREE.md (sec 1, 18, 19, 21, 22), 04-API-SERVICES.md (sec 1, 9, 11), 03-DOMAIN-POSTING-ENGINE.md (sec 3, 6, 7), 06-SCREEN-MAP.md (sec A, B, J), 07-REPORTS-FLAGS.md (Part 2), 01-ARCHITECTURE.md.

## 1. Purpose & business context

The legacy Joms/Fiberpro ERP (v2.5.9.4) runs a Tirupur knitwear export house: 322 WinForms screens, ~440 SQL objects, a 189-flag store in Fiberpro_Lib.dll, and a mobile Commando app. Everything downstream - orders, material loops, money loops - sits on a small shared base: the company->finyear->user login chain, the menu/button rights matrix, the Options flag store, finyear-scoped document numbering, one error contract, and a shared WinForms/FlexGrid component vocabulary. This module delivers that base for the Next.js rewrite with 1:1 parity: existing staff must log in, see the same menus, key the same document numbers, and hit the same validation messages on day one of cutover.

## 2. Scope

- Auth & session: three-step login chain, change password, login audit, session cookie context (06 sec B: FrmCompanyLogin, FrmFinyearLogin, FrmLogin_New, FrmChangePassword, FrmLoginReg).
- Rights & menu matrix: menu tree from rights, button-level module.screen.action rights, server-side enforcement (06 sec B/ sec J rights forms; 02 sec 1).
- Feature-flag system: all 189 legacy flags served verbatim, FlagsProvider/getFlags, tolerance gating pattern, admin Options editor (07 Part 2; 02 sec 19).
- Numbering service: finyear-scoped DC/GRN/Bill/Inv/Lot/OC/IO numbers, prefixes, manual/auto flags, lot-no sort parity (03 sec 7; 01 sec 3.4).
- Error contract: {code, message, fields?} with legacy message strings verbatim (01 sec 3.6).
- Shells: ERPShell (sidebar, topbar context, notification bell, approval badge) and MobileShell bottom-tab app; SSE event stream (02 sec 1, 20, 21; 06 sec A, K).
- UI kit: ui primitives, DataTable/LineGrid/TreeGrid (FlexGrid parity), 13 typed pickers, document primitives (DocumentShell, PostingPreview, ReversalButton, AmendmentTimeline, AttachmentPanel), guards (Can/FlagGate/FinYearGate), ToleranceBanner, per-screen-class state wiring (02 sec 21, 22).
- Admin: users/groups/password list, rights editors, user lock, period close, finyear management, flags editor, guarded data delete/migration utilities (02 sec 19; 06 sec J).
- Integrations: mail/SMS setup and auto-mails, serial weigh-scale capture, Tally export hand-off, e-way/GST capture fields, barcode/label printers (02 sec 19; 07 Part 2).
- Masters screens (06 sec C) are NOT in scope here - they belong to the masters module R-doc; this module only supplies the shared MasterCrud pattern via the UI kit.

## 3. Functional requirements

| FR ID | Requirement | Source (form/proc/flag) | Priority | Stage |
|---|---|---|---|---|
| PLT-001 | The login page shall implement the legacy three-step chain company -> finyear -> user (CompanyStep -> FinYearStep -> CredentialsStep) via POST /api/auth/login before any session is issued. | 02 sec 1; 06 sec B (FrmCompanyLogin/FrmFinyearLogin/FrmLogin_New); 04 sec 1 | P0 | S1 |
| PLT-002 | The CompanyStep shall list companies from Mas_Exporter/Concern data and the FinYearStep shall list finyears from Trg_Finyear_Update data. | 02 sec 1 | P0 | S1 |
| PLT-003 | The CredentialsStep shall authenticate the user against Mas_User and shall offer the FrmChangePassword flow inline. | 02 sec 1; 06 sec B | P0 | S1 |
| PLT-004 | The system shall issue a session cookie carrying ctx = {user, group, coy, finyear, godown?, lineId?} and shall pass this ctx into every service/repository call so procs taking @Coycode/@Finyear receive it from ctx. | 01 sec 3.1; 04 preamble | P0 | S1 |
| PLT-005 | The system shall expose POST /api/auth/change-password implementing FrmChangePassword parity. | 04 sec 1; 06 sec B | P0 | S1 |
| PLT-006 | The system shall record a login audit (FrmLoginReg parity) viewable under /admin/users. | 06 sec B | P1 | S1 |
| PLT-007 | AuthService/ConfigService shall honor the session/company config flags autolock, password (obfuscated), globalcompanyid, dbname. | 07 Part 2 sec 2.3 | P0 | S1 |
| PLT-008 | The (erp) layout shall block rendering of any ERP page for unauthenticated sessions (ERPShell session guard). | 02 sec 1 | P0 | S1 |
| PLT-009 | GET /api/me/menu shall return the menu tree computed from the user's rights (RightsService.menuTree, FrmMenuRights/FrmMenuAccRights/FrmCompanyRights parity) and SidebarNav shall render exactly that tree. | 04 sec 1; 02 sec 1 | P0 | S1 |
| PLT-010 | Rights shall be enforced server-side on every API route keyed module.screen.action (button-level parity); the client <Can do> guard shall be cosmetic only. | 01 sec 3.2; NFR-09 | P0 | S1 |
| PLT-011 | The (mobile) group shall have its own mobile login using Cust_Code context, issuing the same session shape. | 02 sec 20; 06 sec K | P1 | S2 |
| PLT-012 | GET /api/config shall return all 189 legacy flags with names unchanged and defaults read from the legacy Options/Fiberpro_Lib.dll store, served to FlagsProvider (client) and getFlags() (server) as a typed Flags interface. | 04 sec 1; 01 sec 3.3; 07 Part 2 | P0 | S1 |
| PLT-013 | The flag registry (flags.ts) shall enumerate all 189 names with types and defaults; no flag default shall be hard-coded in application code. | 07 Part 2 closing note | P0 | S1 |
| PLT-014 | Flag gating shall support the four legacy patterns - hide field, toggle validation, switch document policy, enable module - with server-side enforcement authoritative and the UI only mirroring it. | 07 sec 2.4; 03 sec 6 | P0 | S1 |
| PLT-015 | NumberingService shall provide peek/take(prefixKey, coy, finyear) with prefixes from Mas_SalesGrp and finyear-scoped sequences for DC/GRN/Bill/Inv/Lot/OC/IO numbers. | 01 sec 3.4; 03 sec 7 | P0 | S1 |
| PLT-016 | NumberingService shall honor the numbering-policy flags manual_dc_no_option_reqd, newdespatchno, sameordno, samepdcno, samebillnoallowedflg, dyeing_lotno_auto_generation, ocngen, ionogen, autocomp/autocompperc, nlot, lot_seq, lotrunno. | 03 sec 7; 07 sec 2.2 | P0 | S1 |
| PLT-017 | Number allocation shall be gap-free and duplicate-safe under concurrent saves. | HLR-28; NFR-14 | P0 | S1 |
| PLT-018 | ID generation shall initially keep the legacy Max(ID)+1 procs behind a SEQUENCE shim inside NumberingService as a behavioral no-op. | 03 sec 7 | P1 | S1 |
| PLT-019 | NumberingService shall provide getLotNo() parity for alphanumeric lot sorting (PATINDEX numeric extraction). | 03 sec 7 | P1 | S2 |
| PLT-020 | All API errors shall conform to the contract { code, message, fields? } and shall keep user-visible legacy message strings verbatim (e.g. 'INVALID TAG', 'ALREADY ISSUED TO LINE', 'BUNDLE COMPLETED', 'FINAL PROCESS PRODUCTION MADE'). | 01 sec 3.6; 04 preamble | P0 | S1 |
| PLT-021 | Every document save shall run the fixed flow validate (zod + flags + tolerances + approvals) -> number -> insert Trs header/lines -> MovementMatrix -> PostingEngine.apply -> Projectors.schedule -> EventOutbox.emit -> commit, inside ONE database transaction. | 03 sec 3; 04 sec 14 | P0 | S1 |
| PLT-022 | Reversals shall rebuild the same MovementSet with inverted signs and re-run it as a compensating posting (replacing PROC_*_Delete* procs with identical net effect), exposed via a shared ReversalButton. | 03 sec 3; 02 sec 21 | P0 | S2 |
| PLT-023 | Multi-user report/MIS staging shall use server-side jobs keyed by jobId (GUID) with staged result rows in a ReportJob cache table, replacing legacy Temp_* / Prog_ReqCalTWrk IP-keyed staging. | 01 sec 3.5 | P0 | S2 |
| PLT-024 | ERPShell shall render SidebarNav (menu from rights), TopbarContext (company, finyear, user, godown/line selector, and the frmSearch command palette over pickers), NotificationBell (SSE feed), and ApprovalBadge (pending approvals count, shown under approvalsflg). | 02 sec 1; 06 sec A | P0 | S1 |
| PLT-025 | The system shall expose GET /api/events/stream (SSE) carrying notifications, approval refresh, and scan-station broadcasts, with polling fallback. | 04 sec 11; 01 sec 1 | P1 | S2 |
| PLT-026 | MobileShell shall provide the bottom tab bar Dashboard | Scan | Orders | Approvals | More for the (mobile) route group. | 02 sec 1, sec 20 | P1 | S2 |
| PLT-027 | The ui kit shall provide the primitives Button, Input, Select, DatePicker (finyear-aware), Modal, Tabs, Toast, and Skeleton (route-level loading states replacing FrmLoading/FrnSplash). | 02 sec 1, sec 21; 06 sec A | P0 | S1 |
| PLT-028 | DataTable shall reach FlexGrid parity: sort, group, freeze columns, footer totals, and keyboard navigation. | 02 sec 21 | P0 | S1 |
| PLT-029 | LineGrid shall support editable document lines with insert/copy/paste rows and computed columns. | 02 sec 21 | P0 | S1 |
| PLT-030 | TreeGrid shall render WBS/RAG and order-style trees. | 02 sec 21 | P1 | S3 |
| PLT-031 | The picker library shall provide OrderPicker, StylePicker, PartyPicker (by dept), StockPicker (union of CurrentStock>0 and existing doc lines), LotPicker, RollPicker, StagePicker (Prod_Sequence), LinePicker, GodownPicker, AccPicker, ShadePicker, MillPicker, and CountPicker. | 02 sec 21 | P0 | S1 |
| PLT-032 | The document primitives shall include DocumentShell (header/status/print), DocumentNumberBox (wired to NumberingService), EntrySummaryBar, PostingPreview (03 matrix diff shown before save), ReversalButton (compensating), AmendmentTimeline, and AttachmentPanel (attachpath/imgpath). | 02 sec 21 | P0 | S2 |
| PLT-033 | The guard components <Can do>, <FlagGate flag>, and <FinYearGate> shall wrap rights-, flag-, and finyear-gated screens. | 02 sec 21 | P0 | S1 |
| PLT-034 | ToleranceBanner shall render a generic +/- % deviation checker against any flag pair in the 03 sec 6 catalog (e.g. po_bud/po_buddev) mirroring the server-side warn/block verdict. | 02 sec 21; 03 sec 6; 07 sec 2.4 | P0 | S2 |
| PLT-035 | Each screen class shall follow the fixed state/wiring table: react-hook-form for Master CRUD; Zustand draft {header, lines[], picker ctx} + LineGrid for document entry with save -> POST /api/<doc> returning posting preview + doc no; URL params for registers; local scan queue (Zustand + IndexedDB) for scan stations; SSE-updated list for approvals; server-rendered ST_* reads for dashboards. | 02 sec 22 | P0 | S1 |
| PLT-036 | Route handlers under app/api shall be thin controllers (parse/validate with zod -> call service -> shape response) containing no UI, and only repositories may import mssql. | 01 sec 2; 04 preamble | P0 | S1 |
| PLT-037 | Document prints shall render through print-optimized pages with preprint-overlay templates porting the PrePrint/298 geometry, via the shared PrintLayout component and window.print(). | 01 sec 5; 02 sec 21 | P1 | S2 |
| PLT-038 | Registers/reports shall export to Excel/CSV with Interop.Excel parity via the shared ExportBar. | 02 sec 17, sec 21; 07 sec 1.2 | P1 | S2 |
| PLT-039 | Structured logs shall be written per document action (replacing legacy print 'a1' debug). | 01 sec 3.7 | P1 | S1 |
| ADM-001 | /admin/users shall provide user management, user-group management, and the password list (FrmMasuser, FrmUserGroupMas, FrmPassword_List parity), rights-gated. | 02 sec 19; 06 sec J | P0 | S1 |
| ADM-002 | /admin/rights shall provide the menu/button rights matrix editors (FrmMenuRights, FrmMenuAccRights, FrmCompanyRights parity). | 02 sec 19; 06 sec J | P0 | S1 |
| ADM-003 | /admin/session shall provide user lock (FrmLock) and period close (FrmGeneralClose/frmclose). | 02 sec 19; 06 sec J | P0 | S1 |
| ADM-004 | /admin/finyear shall manage finyear data (Trg_Finyear_Update parity), rights-gated. | 02 sec 19 | P0 | S1 |
| ADM-005 | /admin/flags shall be the Options editor listing all 189 flags with descriptions and effect preview, writing through PATCH /api/admin/flags. | 02 sec 19; 04 sec 1 | P0 | S1 |
| ADM-006 | The flags editor shall show each flag's suggested enforcement point (service) alongside its effect, per the 07 Part 2 map. | 07 Part 2 (s column) | P1 | S1 |
| ADM-007 | /admin/data/delete shall provide the guarded, audited data utilities (FrmDataDelete, FrmDelete, frmTblErase parity), rights-gated. | 02 sec 19; 06 sec J | P1 | S1 |
| ADM-008 | /admin/data/migration shall provide legacy import/sync utilities for master load and cutover, rights-gated. | 02 sec 19 | P1 | S9 |
| ADM-009 | All /admin/* screens shall be rights-gated per the 02 sec 19 tree (users, rights, finyear, data, flags carry the lock marker; session is the exception). | 02 sec 19 | P0 | S1 |
| ADM-010 | Administrative data deletes shall be gated by the admin rights screens and written to an audit trail. | 01 sec 3.7; 02 sec 19 | P1 | S1 |
| INT-001 | The system shall provide the mail/SMS setup screen (FrmSMSMailSetup parity) driving NotificationService with flags mobileno, mail, poautomailreqd, inoutautomail, and smtpserverpassword. | 02 sec 19; 06 sec J; 07 sec 2.3 | P2 | S4-S5 |
| INT-002 | The system shall auto-mail POs on save when poautomailreqd is set. | 07 sec 2.3 | P2 | S5 |
| INT-003 | The system shall send in/out auto-mail notifications when inoutautomail is set. | 07 sec 2.3 | P2 | S5 |
| INT-004 | The system shall capture weights from a serial-connected weigh scale into GRN line entry (FrmWeightScale_Integration parity). | 02 sec 19; 06 sec J | P2 | S4-S5 |
| INT-005 | The system shall export purchase/expense data to Tally (RptTallyPurAndExp pending-export parity) with party mapping flag tdstallyname, configured via FrmTally_GSTSetup parity and POST /api/commercial/tally-export. | 02 sec 13, sec 19; 04 sec 9; 07 sec 1.2 | P2 | S5 |
| INT-006 | DC forms shall capture the e-way bill no/date and the GST split (HSN %, CGST/SGST vs IGST, Trs_Del4 override) via the shared GstSummary/GstEwayPanel component when gstenable is on. | 02 sec 7, sec 21; 07 sec 2.3 | P1 | S3 |
| INT-007 | Barcode and QR labels shall render as SVG (zxing lineage: BarcodeField, BarcodeLabelSvg, QrLabelSvg) printable from browser print stations. | 01 sec 1; 02 sec 21 | P1 | S4 |
| INT-008 | The system shall expose sync endpoints GET /api/sync/pull?since= (UpdateFlg=1 rows, server_id protocol) and POST /api/sync/ack (flag clear) backing the mobile shell. | 04 sec 11 | P1 | S2 |

FR counts: PLT 39, ADM 10, INT 8 (57 total).

## 4. Business rules & validations

- BR-01: Login proceeds strictly company -> finyear -> user; a finyear cannot be selected without a company, and credentials cannot be validated without both (legacy FrmCompanyLogin -> FrmFinyearLogin -> FrmLogin_New order).
- BR-02: Every repository call receives ctx {user, group, coy, finyear}; procs taking @Coycode/@Finyear get them from ctx, never from the client body.
- BR-03: Rights are enforced server-side on every API route; client-side hiding (SidebarNav filtering, <Can do>) is cosmetic only (NFR-09).
- BR-04: Button-level rights use the key form module.screen.action, matching the legacy per-button rights matrix.
- BR-05: All 189 flag names are served verbatim from the Options/Fiberpro_Lib.dll store; this customer's stored defaults are never hard-coded into the application.
- BR-06: Tolerance checks follow the 03 sec 6 catalog exactly: warn/block at +/- dev% per flag pair (e.g. po_bud/po_buddev default 10.00 with po_allowadd); ToleranceBanner only mirrors the server verdict.
- BR-07: Document numbers are finyear-scoped with prefixes from Mas_SalesGrp; manual numbers are accepted only when manual_dc_no_option_reqd is set.
- BR-08: Numbering policy honors flags verbatim: newdespatchno, sameordno, samepdcno, samebillnoallowedflg, ocngen (G), ionogen, autocomp/autocompperc, nlot, lot_seq, lotrunno, dyeing_lotno_auto_generation.
- BR-09: Number allocation is gap-free and duplicate-safe under concurrent saves (HLR-28).
- BR-10: Errors use { code, message, fields? }; any string the legacy user saw stays byte-identical (e.g. 'INVALID TAG', 'ALREADY ISSUED TO LINE', 'BUNDLE COMPLETED', 'FINAL PROCESS PRODUCTION MADE').
- BR-11: One database transaction per document action; mid-action failure leaves zero partial stock, balance, sync, or genealogy rows (NFR-01).
- BR-12: Multi-user staging uses jobId (GUID) rows in the ReportJob cache; no Temp_* or IP-address keys remain.
- BR-13: The password flag is stored obfuscated; autolock enforces the lock timeout; globalcompanyid and dbname come from the Options store.
- BR-14: Data deletes run only from the rights-gated admin utilities and are audited; no ad-hoc delete paths exist.
- BR-15: Print policy flags: preprintfolder (72/298) selects the overlay set, dc_fullpage selects the DC full-page layout, salesinvhead/billrptformat/formatno control print headings and formats.
- BR-16: UI behavior toggles are honored verbatim: btnmenu, popup_default_selection, allowdec (decimal places in grids), natureofwrk_tamil (Tamil work-nature print).
- BR-17: Attachment storage uses the configured imgpath/attachpath flags.
- BR-18: Outbound mail/SMS fire only per flags mobileno/mail/poautomailreqd/inoutautomail with smtpserverpassword sourced from config, never from code.

## 5. Data & postings

Tables touched (read/write):
- Mas_User, UserGroupMas, login audit (FrmLoginReg parity), Mas_Exporter/Concern (company list), Trg_Finyear_Update data (finyear list).
- Rights tables: Trg_Mas_* menu-rights set behind FrmMenuRights/FrmMenuAccRights/FrmCompanyRights.
- Options (flags table, existing) read via ConfigService and written via PATCH /api/admin/flags.
- Mas_SalesGrp (number prefixes); NumberingService sequences (SEQUENCE shim over Max(ID)+1 procs).
- ReportJob cache (additive) for jobId staging; EventOutbox for domain events.

Posting matrix rows from 03 that apply: none directly - platform owns no movements. The platform enforces the 03 sec 3 document-save flow (validate -> number -> insert -> MovementMatrix -> PostingEngine.apply -> Projectors.schedule -> EventOutbox.emit -> commit) and the 03 sec 6 tolerance catalog as shared machinery consumed by every module.

Projector events: SyncFlagProjector semantics (UpdateFlg=1 dirty flags for Commando sync) ride on every projector maintained elsewhere; platform exposes the SSE stream and sync pull/ack endpoints.

## 6. UI & routes

| Route | Components | Legacy forms |
|---|---|---|
| (auth)/login | LoginForm, CompanyStep, FinYearStep, CredentialsStep | FrmCompanyLogin, FrmFinyearLogin, FrmLogin_New |
| (erp)/layout | ERPShell, SidebarNav, TopbarContext, NotificationBell, ApprovalBadge | MDIJOMS, frmSearch (command palette) |
| (mobile)/layout + /m/* | MobileShell, TabBar | Commando app shell |
| /admin/users | MasterCrud, PasswordForm dialog | FrmMasuser, FrmUserGroupMas, FrmPassword_List, FrmChangePassword, FrmLoginReg |
| /admin/rights | RightsMatrix editors | FrmMenuRights, FrmMenuAccRights, FrmCompanyRights |
| /admin/session | LockForm, CloseForm | FrmLock, frmclose, FrmGeneralClose |
| /admin/finyear | FinyearManager | (Trg_Finyear_Update data) |
| /admin/flags | FlagsEditor (189 flags + effect preview) | Options editor |
| /admin/integrations | SmsMailSetup, WeightScaleSetup | FrmSMSMailSetup, FrmWeightScale_Integration |
| /admin/data/delete | guarded delete utilities | FrmDataDelete, FrmDelete, frmTblErase |
| /admin/data/migration | import/sync utilities | legacy import/sync utilities |
| components/* (kit) | ui, DataTable/LineGrid/TreeGrid, pickers, document, guards | FlexGrid vocabulary, frmPopUp (Modal), FrmLoading/FrnSplash (Skeleton) |

## 7. API endpoints (from 04)

| Method + path | Service | Notes |
|---|---|---|
| POST /api/auth/login (company->finyear->user) | AuthService | FrmCompanyLogin/FrmFinyearLogin/FrmLogin_New parity |
| POST /api/auth/change-password | AuthService | FrmChangePassword parity |
| GET /api/config | ConfigService.getFlags() | 189 flags, Fiberpro_Lib.dll JSON parity |
| PATCH /api/admin/flags (rights-gated) | ConfigService.setFlag() | Options editor |
| GET /api/me/menu | RightsService.menuTree() | FrmMenuRights/MenuAccRights/CompanyRights parity |
| GET /api/events/stream (SSE) | EventBus.subscribe() | notifications, approval refresh, scan broadcasts; polling fallback |
| GET /api/sync/pull?since= | SyncService.pull() | UpdateFlg=1 rows, server_id protocol |
| POST /api/sync/ack | SyncService.ack() | flag clear |
| POST /api/commercial/tally-export | TallyService.export() | RptTallyPurAndExp hand-off; tdstallyname mapping |

## 8. Reports & prints (from 07 sec 1)

- Platform owns the print framework: PrintLayout with preprint-overlay templates (PrePrint/298 geometry) used by every document-print family.
- Barcode labels family rendered as zxing SVG: RptBarcodePrint_Pcs/FabRoll/AllBundle(_Panel), RptBundle_BarcodePrint, BarcodeLayReport, CuttingBarcodeReg.
- Excel/CSV export (Interop.Excel parity) via ExportBar for all register families.
- Tally hand-off: RptTallyPurAndExp (pending export list).
- Print policy flags applied per family: dc_fullpage (DC layouts), salesinvhead/billrptformat/formatno (headings/formats), preprintfolder (overlay set), natureofwrk_tamil.

## 9. Flags affecting this module (verbatim legacy names)

| Flag | Effect |
|---|---|
| autolock / password / globalcompanyid / dbname | session & company config honored by AuthService/ConfigService |
| mobileno / mail / poautomailreqd / inoutautomail / smtpserverpassword | mail/SMS integration and auto-mail triggers |
| tdstallyname | Tally party mapping |
| gstenable | GST fields on GstSummary/GstEwayPanel |
| preprintfolder (72/298) / dc_fullpage / salesinvhead / billrptformat / formatno | print layout, headings, and overlay set |
| manual_dc_no_option_reqd / newdespatchno / sameordno / samepdcno / samebillnoallowedflg / ocngen / ionogen / autocomp / autocompperc / nlot / lot_seq / lotrunno / dyeing_lotno_auto_generation | NumberingService policies |
| approvalsflg / commando_approval_link | ApprovalBadge visibility and mobile approval link |
| btnmenu / popup_default_selection / allowdec / natureofwrk_tamil | UI behavior toggles |
| imgpath / attachpath | attachment/file storage paths |

## 10. Traceability (legacy form -> FR IDs)

| Legacy form (06) | FR IDs |
|---|---|
| FrmCompanyLogin | PLT-001, PLT-002 |
| FrmFinyearLogin | PLT-001, PLT-002 |
| FrmLogin_New | PLT-001, PLT-003 |
| FrmChangePassword | PLT-003, PLT-005 |
| FrmLoginReg | PLT-006 |
| MDIJOMS | PLT-008, PLT-009, PLT-024 |
| frmSearch | PLT-024 |
| frmPopUp | PLT-027 |
| FrmLoading / FrnSplash | PLT-027 |
| frmOptions / FrmOptionsPrint | not R01 - per-order stock options (/stock/options, StockService.options()); FrmOptionUpdate also appears in order input (R02 ORD-016) |
| FrmMasuser | ADM-001 |
| FrmUserGroupMas | ADM-001 |
| FrmPassword_List | ADM-001 |
| FrmMenuRights | ADM-002, PLT-009 |
| FrmMenuAccRights | ADM-002, PLT-009 |
| FrmCompanyRights | ADM-002, PLT-009 |
| FrmLock | ADM-003 |
| frmclose / FrmGeneralClose | ADM-003 |
| FrmDataDelete / FrmDelete / frmTblErase | ADM-007 |
| FrmSMSMailSetup | INT-001, INT-002, INT-003 |
| FrmWeightScale_Integration | INT-004 |
| FrmTally_GSTSetup | INT-005 |
| Commando shell screens (06 sec K: login, notifications, settings) | PLT-011, PLT-024, PLT-026, INT-008 |

## 11. Open items / blockers

- OB-01: The stored obfuscated password format and verification path in Mas_User must be confirmed before S1 sign-off (BR-13 depends on it).
- OB-02: Live defaults for all 189 flags must be extracted from the customer's Options store; the docs state names/effects but not this tenant's values.
- OB-03: Weigh-scale serial protocol (make/model framing) is not specified in the source docs; FrmWeightScale_Integration behavior needs a live-DB/site check before INT-004 is built.
- OB-04: Tally export format version (XML schema) is not specified; RptTallyPurAndExp output must be captured from legacy for parity fixtures.
- OB-05: E-way integration scope: the docs cover field capture (no/date) and DC panels only; government-portal IRN generation is not in the source docs and must not be invented - confirm manual-entry-only parity.
- OB-06: Mobile login Cust_Code context semantics (multi-customer device profiles) need confirmation against the existing Commando app.
- OB-07: rights.action key list (module.screen.action per screen) is only partially enumerated in 02; the full matrix must be derived from FrmMenuRights/FrmMenuAccRights data during S1.
