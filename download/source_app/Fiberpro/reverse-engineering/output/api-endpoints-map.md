# FiberPro ERP — REST API Endpoints Map (MERN Backend)

> **Generated**: 2026-03-15  
> **Task**: 16 of 16 — Final synthesis  
> **Source**: All 10 module-functionality docs, stored-procedures-analysis.md, database-schema.md, data-transfer-strategy.md, formulas-and-calculations.md  
> **Target Stack**: MERN (MongoDB, Express.js, React, Node.js)  
> **Base URL**: `/api/v1`  
> **Auth**: JWT Bearer token on all endpoints unless marked `[public]`

---

## Table of Contents

1. [API Design Conventions](#1-api-design-conventions)
2. [Module 1 — Masters & Configuration](#2-module-1--masters--configuration) (58 endpoints)
3. [Module 2 — Order Management & Sales](#3-module-2--order-management--sales) (42 endpoints)
4. [Module 3 — Procurement & Supplier Management](#4-module-3--procurement--supplier-management) (38 endpoints)
5. [Module 4 — Inventory & Warehouse Management](#5-module-4--inventory--warehouse-management) (44 endpoints)
6. [Module 5 — Cutting, Panels & Piece Goods](#6-module-5--cutting-panels--piece-goods) (46 endpoints)
7. [Module 6 — Production & Shop Floor](#7-module-6--production--shop-floor) (40 endpoints)
8. [Module 7 — Dispatch, Delivery & Logistics](#8-module-7--dispatch-delivery--logistics) (48 endpoints)
9. [Module 8 — Accounting, Billing & GST](#9-module-8--accounting-billing--gst) (46 endpoints)
10. [Module 9 — Costing, Budgeting & Finance](#10-module-9--costing-budgeting--finance) (38 endpoints)
11. [Module 10 — Job Work, Quality, HR & Reporting](#11-module-10--job-work-quality-hr--reporting) (42 endpoints)
12. [Cross-Cutting Concerns](#12-cross-cutting-concerns) (30 endpoints)
13. [Endpoint Count Summary](#13-endpoint-count-summary)

---

## 1. API Design Conventions

### URL Patterns
- **Collection**: `GET /api/v1/{module}/{resource}` — list with pagination
- **Single item**: `GET /api/v1/{module}/{resource}/:id`
- **Create**: `POST /api/v1/{module}/{resource}`
- **Update**: `PUT /api/v1/{module}/{resource}/:id` (full replace) or `PATCH` (partial)
- **Delete**: `DELETE /api/v1/{module}/{resource}/:id`
- **Actions**: `POST /api/v1/{module}/{resource}/:id/{action}`

### Standard Pagination (all list endpoints)
```
Query params: ?page=1&limit=25&sortBy=createdAt&sortOrder=desc
Response: { data: [...], pagination: { page, limit, total, totalPages } }
```

### Standard Filters (via query params)
- `companyId` — multi-company isolation (required on all transactional endpoints)
- `fiscalYear` — fiscal year filter (e.g., `24-25`)
- `fromDate`, `toDate` — date range
- `search` — free-text search on name/description fields

### Standard Response Shape
```json
{
  "success": true,
  "data": { ... },
  "pagination": { ... },  // list endpoints only
  "message": "..."         // on errors/actions
}
```

### Authentication & Authorization
- All endpoints require `Authorization: Bearer <jwt>` header unless marked `[public]`
- Role-based access via middleware checking `user.roles` and `user.companyRights`
- Company-scoped access enforced: user can only access data for companies in their `companyRights`
- **Legacy mapping**: `Mas_User` → `users` collection; `Mas_UserGroup` + `Mas_MenuRights` → role/permission model

---

## 2. Module 1 — Masters & Configuration

### 2.1 Buyer Master

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 1 | GET | `/masters/buyers` | List buyers with pagination & search | `FRMBUYER` load, `Mas_Buyer` |
| 2 | GET | `/masters/buyers/:id` | Get single buyer by ID | `Mas_Buyer` SELECT |
| 3 | POST | `/masters/buyers` | Create new buyer | `FRMBUYER` save, INSERT `Mas_Buyer` |
| 4 | PUT | `/masters/buyers/:id` | Update buyer | `FRMBUYER` save, UPDATE `Mas_Buyer` |
| 5 | DELETE | `/masters/buyers/:id` | Delete buyer (soft-delete) | `FRMBUYER` delete |

**POST/PUT body**: `{ buyerName, stateId, address?, phone?, gstNo?, pan? }`  
**Response**: `{ buyerId, buyerName, stateId, ... }`

### 2.2 Party/Supplier Master

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 6 | GET | `/masters/parties` | List parties/suppliers | `FrmPartyMaster`, `Mas_Party` |
| 7 | GET | `/masters/parties/:id` | Get single party | `Mas_Party` SELECT |
| 8 | POST | `/masters/parties` | Create party | `FrmPartyMaster` save |
| 9 | PUT | `/masters/parties/:id` | Update party | `FrmPartyMaster` save |
| 10 | DELETE | `/masters/parties/:id` | Delete party (soft-delete) | `FrmPartyMaster` delete |

**POST/PUT body**: `{ partyName, address, phone, tin, cst, gstNo, pan, stateId }`  
**Response**: `{ partyId, partyName, stateId, gstNo, ... }`

### 2.3 Company/Unit Master

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 11 | GET | `/masters/companies` | List companies/units | `Mas_Exporter` |
| 12 | GET | `/masters/companies/:id` | Get single company | `Mas_Exporter` SELECT |
| 13 | POST | `/masters/companies` | Create company | Admin only |
| 14 | PUT | `/masters/companies/:id` | Update company | Admin only |

**POST/PUT body**: `{ exporterName, address, phone, tin, cst, pan, gstNo, stateId, ioNoCaption }`

### 2.4 Product & Material Masters

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 15 | GET | `/masters/fabrics` | List fabric types | `FrmFabricmaster`, `Mas_Fabric` |
| 16 | POST | `/masters/fabrics` | Create fabric type | INSERT `Mas_Fabric` |
| 17 | PUT | `/masters/fabrics/:id` | Update fabric type | UPDATE `Mas_Fabric` |
| 18 | GET | `/masters/colors` | List colors | `Mas_Color` |
| 19 | POST | `/masters/colors` | Create color | INSERT `Mas_Color` |
| 20 | PUT | `/masters/colors/:id` | Update color | UPDATE `Mas_Color` |
| 21 | GET | `/masters/yarn-counts` | List yarn counts | `Mas_Count` |
| 22 | POST | `/masters/yarn-counts` | Create yarn count | INSERT `Mas_Count` |
| 23 | GET | `/masters/diameters` | List diameters | `Mas_Dia` |
| 24 | POST | `/masters/diameters` | Create diameter | INSERT `Mas_Dia` |
| 25 | GET | `/masters/sizes` | List sizes | `Mas_Size` |
| 26 | POST | `/masters/sizes` | Create size | INSERT `Mas_Size` |
| 27 | GET | `/masters/size-groups` | List size groups | `frmSizeGroup`, `Mas_SizeGroup` |
| 28 | POST | `/masters/size-groups` | Create size group | INSERT `Mas_SizeGroup` |
| 29 | GET | `/masters/designs` | List print/fabric designs | `FrmDesignEntry`, `Mas_Design` |
| 30 | POST | `/masters/designs` | Create design | INSERT `Mas_Design` |

**Generic master body**: `{ name, description?, groupId?, ...typeSpecificFields }`

### 2.5 Accessories Masters

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 31 | GET | `/masters/accessory-types` | List accessory types | `FrmAccmaster`, `Mas_Acc` |
| 32 | POST | `/masters/accessory-types` | Create accessory type | INSERT `Mas_Acc` |
| 33 | GET | `/masters/accessory-descriptions` | List accessory descriptions | `FrmAccDescMaster`, `Mas_AccDes` |
| 34 | POST | `/masters/accessory-descriptions` | Create accessory description | INSERT `Mas_AccDes` |
| 35 | GET | `/masters/accessory-categories` | List accessory categories | `FrmAccCat`, `Mas_AccCategory` |
| 36 | POST | `/masters/accessory-categories` | Create category | INSERT `Mas_AccCategory` |

### 2.6 Organizational Masters

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 37 | GET | `/masters/departments` | List departments/processes | `FrmDeptMasterNew`, `Mas_Dept` |
| 38 | POST | `/masters/departments` | Create department | INSERT `Mas_Dept` |
| 39 | PUT | `/masters/departments/:id` | Update department | UPDATE `Mas_Dept` |
| 40 | GET | `/masters/godowns` | List godowns/warehouses | `FrmGodownMaster`, `Mas_Godown` |
| 41 | POST | `/masters/godowns` | Create godown | INSERT `Mas_Godown` |
| 42 | GET | `/masters/employees` | List employees | `FrmEmpmaster`, `Mas_Emp` |
| 43 | POST | `/masters/employees` | Create employee | INSERT `Mas_Emp` |
| 44 | PUT | `/masters/employees/:id` | Update employee | UPDATE `Mas_Emp` |
| 45 | GET | `/masters/machines` | List machines | `FrmMachineMaster`, `Mas_Machine` |
| 46 | POST | `/masters/machines` | Create machine | INSERT `Mas_Machine` |
| 47 | GET | `/masters/mills` | List mills | `FrmMill`, `Mas_Mill` |
| 48 | POST | `/masters/mills` | Create mill | INSERT `Mas_Mill` |

### 2.7 Financial & Tax Masters

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 49 | GET | `/masters/hsn-codes` | List HSN codes | `FrmHSN`, `Mas_HSN` |
| 50 | POST | `/masters/hsn-codes` | Create HSN code | INSERT `Mas_HSN` |
| 51 | PUT | `/masters/hsn-codes/:id` | Update HSN code | UPDATE `Mas_HSN` |
| 52 | GET | `/masters/states` | List states | `FrmStateMaster`, `Mas_State` |
| 53 | GET | `/masters/currencies` | List foreign currencies | `frmFcymaster`, `Mas_Fcy` |
| 54 | POST | `/masters/currencies` | Create/update currency & rate | INSERT/UPDATE `Mas_Fcy` |
| 55 | GET | `/masters/banks` | List banks & accounts | `FrmMasBank`, `Mas_Bank` |
| 56 | POST | `/masters/banks` | Create bank | INSERT `Mas_Bank` |

### 2.8 System Configuration

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 57 | GET | `/config/options` | Get system-wide settings | `frmOptions`, `Options` table |
| 58 | PATCH | `/config/options` | Update system settings | `frmOptions` save |

**PATCH body**: `{ key: value, ... }` (partial options update)

---

## 3. Module 2 — Order Management & Sales

### 3.1 Order CRUD

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 59 | GET | `/orders` | List orders with filters (buyer, status, date range, company) | `FrmOrderRegister`, `OrderMas` |
| 60 | GET | `/orders/:id` | Get full order detail (header + styles + quantities + parts) | `FrmOrderSheetNew` load |
| 61 | POST | `/orders` | Create new order (header + styles + qty breakdown) | `FrmOrderSheetNew` save; writes to `OrderMas`, `OrderMas2`, `OrderStyleDtl`, `OrderQtyDtl`/`OrdQtyClrDtl`, `OrdSizeMas`, `Order_PartDtl`; calls `Sp_MR_OrdInHand` |
| 62 | PUT | `/orders/:id` | Update order (full replace) | `FrmOrderSheetNew` edit/save |
| 63 | DELETE | `/orders/:id` | Delete order (only if no downstream transactions) | `FrmOrderSheetNew` delete |

**POST body**:
```json
{
  "companyId": 1,
  "buyerId": 10,
  "buyerOrderNo": "PO-2025-001",
  "merchandiserId": 5,
  "seasonId": 2,
  "currencyId": 1,
  "contractRate": 83.50,
  "orderDate": "2025-07-01",
  "deliveryDate": "2025-09-15",
  "orderType": "Order",
  "uom": "PCS",
  "styles": [
    {
      "styleNo": "ST001",
      "styleId": 12,
      "entryOption": 1,
      "rateFor": "S",
      "saleRate": 250.00,
      "fabricId": 3,
      "brandId": 1,
      "deliveryDate": "2025-09-15",
      "quantities": [
        { "colorId": 1, "sizeId": 5, "partId": 1, "orderQty": 500, "lotNo": "LOT-1" }
      ],
      "sizeSequence": [{ "sizeId": 5, "sNo": 1 }, { "sizeId": 6, "sNo": 2 }],
      "parts": [{ "partId": 1, "pcsPerPart": 1 }]
    }
  ]
}
```

**Response**: Full order object with generated `ordId`, `jobNo`, `fiscalYear`

### 3.2 Order Amendment

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 64 | POST | `/orders/:id/amend` | Create amendment (snapshots current to `_Amend` tables, updates quantities) | `FrmOrderSheetNew_WithAmend`, `FrmOrderSheetAmendment`; writes `OrderQtyDtl_Amend` / `OrdQtyClrDtl_Amend` |
| 65 | GET | `/orders/:id/amendments` | Get amendment history | `OrderQtyDtl_Amend` / `OrdQtyClrDtl_Amend` |

**POST body**: `{ styles: [{ styleNo, quantities: [{ colorId, sizeId, partId, newOrderQty }] }], reason }`

### 3.3 Order Status & Tracking

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 66 | GET | `/orders/:id/status` | Fabric processing stage status (DC/GRN per dept) | `frmOrdStat`, `SP_OrderStatus` |
| 67 | GET | `/orders/:id/production-tracking` | Production tracking across stages | `FrmOrdProdTrack` |
| 68 | GET | `/orders/:id/history-ledger` | Complete I/O history ledger | `SP_OrderHistoryLedger` |
| 69 | POST | `/orders/:id/close` | Mark order as completed | `FrmOrderClose`; sets `OrderMas.Completed=1` |
| 70 | POST | `/orders/:id/despatch-complete` | Mark despatch as complete | `FrmOrderDespatchCompletion`; sets `StyleWise_Despatch_Completion=1` |

### 3.4 Order Registers & Views

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 71 | GET | `/orders/register` | Order register report (multi-filter) | `FrmOrderRegister`, `SP_Vue_OrderinHand` |
| 72 | GET | `/orders/in-hand` | Order-in-hand summary | `SP_Vue_Order_in_Hand`, `ST_Ord_inHand` |
| 73 | GET | `/orders/vs-despatch` | Order vs despatch summary | `SP_Vue_OrdVsDespatch_Summary` |

### 3.5 Order Enquiry, Samples & Trading

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 74 | GET | `/orders/search` | Order enquiry / search / lookup | `FrmOrderEnquiry` |
| 75 | POST | `/orders/samples` | Create sample order | `frmOrderSample` |
| 76 | POST | `/orders/trading` | Create trading order | `FrmTradingOrderSheet` |
| 77 | GET | `/orders/trading/in-hand` | Trading orders in-hand register | `FrmTradingOrdersInHandReg` |

### 3.6 Program Copy & Style Change

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 78 | POST | `/orders/:id/copy-program` | Copy program details to another order | `SP_CpyPrgmDet` |
| 79 | POST | `/orders/:id/styles/:styleNo/rename` | Rename style across all tables | `SP_StyleChange` |

### 3.7 Order Import & Size List

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 80 | POST | `/orders/import-excel` | Import order from Excel file | `FrmOrderRelatedInput_Excel` |
| 81 | GET | `/orders/:id/size-list` | Get ordered size list for a style | `SP_SizeList` |

### 3.8 Sales Invoicing (Order-linked)

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 82 | POST | `/orders/:id/commercial-invoice` | Create commercial (export) invoice | `FrmCommericalInv_New` |
| 83 | POST | `/orders/:id/delivery-cumulative-invoice` | Create delivery-cumulative invoice | `frmDelCumInv` |
| 84 | GET | `/orders/:id/invoice-value` | Calculate total invoice amount | `SP_Qry10` |

### 3.9 Order Grouping

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 85 | GET | `/orders/groups` | List order groups | `frmOrderGroup` |
| 86 | POST | `/orders/groups` | Create order group | INSERT group reference |
| 87 | PUT | `/orders/:id/group-ref` | Assign order to group | UPDATE `OrderMas.grpref` |

### 3.10 Order Images

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 88 | POST | `/orders/:id/styles/:styleNo/images` | Upload style image | `OrderStyleImage` |
| 89 | GET | `/orders/:id/styles/:styleNo/images` | Get style images | `OrderStyleImage`, `OrderStyleImgDtl` |
| 90 | DELETE | `/orders/:id/styles/:styleNo/images/:imageId` | Delete style image | DELETE `OrderStyleImage` |

---

## 4. Module 3 — Procurement & Supplier Management

### 4.1 Purchase Orders

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 91 | GET | `/procurement/purchase-orders` | List POs with filters (dept, party, date, company) | `Trs_Po1` |
| 92 | GET | `/procurement/purchase-orders/:id` | Get PO with line items | `Trs_Po1` + `Trs_Po2`/`Trs_Po5` |
| 93 | POST | `/procurement/purchase-orders` | Create multi-order PO for yarn/fabric | `frmPurchaseOrd_MultiOrder`; writes `Trs_Po1` + `Trs_Po2` |
| 94 | POST | `/procurement/purchase-orders/accessories` | Create accessories PO | `frmPurchaseOrdAcc`; writes `Trs_Po1` + `Trs_Po5` |
| 95 | PUT | `/procurement/purchase-orders/:id` | Update PO | `frmPurchaseOrd_MultiOrder` edit |
| 96 | DELETE | `/procurement/purchase-orders/:id` | Delete PO | DELETE `Trs_Po1`/`Trs_Po2` |

**POST body** (yarn/fabric):
```json
{
  "companyId": 1, "fiscalYear": "25-26", "departmentId": 4,
  "partyId": 100, "currencyId": 0, "exchangeRate": 1,
  "lines": [
    { "orderId": 50, "styleNo": "ST001", "countId": 5, "colorId": 3, "poQty": 500.5, "rate": 120.00 }
  ]
}
```

### 4.2 PO Lifecycle

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 97 | PATCH | `/procurement/purchase-orders/:id/cancel` | Cancel PO lines (partial cancel) | `FrmPOCancel`; updates `Trs_Po2.cancelkgs` |
| 98 | PATCH | `/procurement/purchase-orders/:id/complete` | Mark PO as complete | `frmPoCompl` |

**PATCH body** (cancel): `{ lines: [{ lineIndex, cancelQty }] }`

### 4.3 GRN — Yarn & Fabric

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 99 | GET | `/procurement/grns` | List GRNs with filters | `Trs_Grn1` |
| 100 | GET | `/procurement/grns/:id` | Get GRN with line items | `Trs_Grn1` + `Trs_GRN2` |
| 101 | POST | `/procurement/grns` | Create standard GRN (yarn/fabric) | `frmGRNEntry`; writes `Trs_Grn1` + `Trs_GRN2`, updates `CurrentStock`, `StockTable`; calls `Sp_POBalnce`, `SP_ORD_GRNSTATUS` |
| 102 | POST | `/procurement/grns/multi-order` | Create multi-order GRN | `frmGRNEntry_MultiOrder` |
| 103 | POST | `/procurement/grns/multi-process` | Create multi-process GRN | `frmGRN_MultiProcess`; writes `Trs_MultiPrs_Grn1/2/3` |
| 104 | PUT | `/procurement/grns/:id` | Update GRN | GRN edit, recalculate stock |
| 105 | DELETE | `/procurement/grns/:id` | Delete GRN (reverses stock) | Triggers `TRG_YARN_BALANCE_GRN_DEL` |

**POST body**:
```json
{
  "companyId": 1, "fiscalYear": "25-26", "grnDate": "2025-08-01",
  "departmentId": 4, "supplierId": 100, "grnType": "Purchase",
  "poId": 50, "godownId": 1,
  "lines": [
    { "orderId": 50, "styleNo": "ST001", "stockId": 200, "receivedKgs": 250.5, "receivedMtrs": 0, "bags": 5, "rate": 120 }
  ]
}
```

### 4.4 GRN — Accessories

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 106 | POST | `/procurement/grns/accessories` | Create accessories GRN | `frmGRNEntryAcc` |
| 107 | POST | `/procurement/grns/accessories/return` | Accessories GRN return | `frmGRNEntryAcc_Ret_Multi` |

### 4.5 GRN Acceptance

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 108 | POST | `/procurement/grns/:id/accept` | Accept purchase GRN | `FrmPurGrnAccept` |
| 109 | POST | `/procurement/grns/:id/accept-production` | Accept production GRN | `FrmProGrnAccept` |

### 4.6 Supplier Orders

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 110 | GET | `/procurement/supplier-orders` | List supplier orders | `SuppOrdMas` |
| 111 | GET | `/procurement/supplier-orders/:id` | Get supplier order detail | `SuppOrdMas` + `SuppOrdDet` + `SuppOrdStyleDtl` |
| 112 | POST | `/procurement/supplier-orders` | Create supplier order | `FrmSuppOrdSheet_Semi`; writes `SuppOrdMas`, `SuppOrdDet`, `SuppOrdStyleDtl` |
| 113 | PUT | `/procurement/supplier-orders/:id` | Update supplier order | Edit `SuppOrdMas`/`SuppOrdDet` |
| 114 | DELETE | `/procurement/supplier-orders/:id` | Delete supplier order | DELETE `SuppOrdMas`+ children |

**POST body**:
```json
{
  "companyId": 1, "partyId": 100, "orderId": 50, "orderDate": "2025-08-01",
  "styles": [{ "styleNo": "ST001", "deliveryDate": "2025-09-01" }],
  "quantities": [{ "styleNo": "ST001", "colorId": 1, "sizeId": 5, "qty": 200, "rate": 50 }]
}
```

### 4.7 Supplier Registers

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 115 | GET | `/procurement/supplier-orders/register` | Supplier order register | `FrmSupplierOrderRegister` |
| 116 | GET | `/procurement/supplier-orders/history` | Supplier order history | `FrmSuppOrderHistoryReg` |
| 117 | GET | `/procurement/supplier-orders/pending` | Pending supplier orders | `frmSupordPendReg` |
| 118 | GET | `/procurement/supplier-bills/register` | Supplier bill register | `FrmSupplierBillReg` |

### 4.8 Party Balance

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 119 | GET | `/procurement/party-balance` | Party balance (PO vs DC vs GRN) | `ST_PartyBalance_Abs`, `Sp_POBalnce` |
| 120 | GET | `/procurement/party-balance/accessories` | Accessories party balance | `ST_Acc_PartyBal_Abs`, `Sp_Acc_PartyBalance` |

### 4.9 Supplier Technical Data

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 121 | POST | `/procurement/supplier-orders/:id/tech-data` | Create/update supplier tech data sheet | `FrmSuppTechDataSheet` |
| 122 | GET | `/procurement/supplier-orders/:id/tech-data` | Get tech data sheet | `FrmSuppTechDataSheet` load |

### 4.10 GRN Register

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 123 | GET | `/procurement/grns/register` | GRN register (consolidated) | `Vue_GrnRegFab_PO` |
| 124 | GET | `/procurement/grns/:id/status` | GRN status after processing | `SP_ORD_GRNSTATUS` |

---

## 5. Module 4 — Inventory & Warehouse Management

### 5.1 Stock Items

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 125 | GET | `/inventory/stock-items` | List stock items with filters (YF type, order, dept, company) | `StockTable` |
| 126 | GET | `/inventory/stock-items/:id` | Get stock item detail with current positions | `StockTable` + `CurrentStock` |
| 127 | GET | `/inventory/stock-items/:id/current-stock` | Get current stock by godown | `CurrentStock` WHERE StockID |
| 128 | GET | `/inventory/stock-items/:id/roll-details` | Get roll-level stock detail | `CurrentStock_RollDtl`, `Sp_currentstock_RollDtl` |

### 5.2 Stock Registers

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 129 | GET | `/inventory/reports/fabric-stock` | Fabric stock register | `FrmFabricStockRegister`, `Sp_StockRpt` (YF='F') |
| 130 | GET | `/inventory/reports/yarn-stock` | Yarn stock register | `FrmYarnStockRegister`, `Sp_StockRpt` (YF='Y') |
| 131 | GET | `/inventory/reports/accessories-stock` | Accessories stock register | `FrmAccStockReg`, `Sp_StockRpt` (YF='A') |
| 132 | GET | `/inventory/reports/general-stock` | General stock register | `FrmGeneralStockRegister` |
| 133 | GET | `/inventory/reports/item-wise-stock` | Item-wise (cross-order) stock | `FrmItemwiseStockRegister` |
| 134 | GET | `/inventory/reports/style-wise-stock` | Style-wise stock register | `FrmStockRegister_Style` |
| 135 | GET | `/inventory/reports/piece-stock` | Piece goods stock register | `FrmPieceStock`, `Sp_StockRpt` pieces |
| 136 | GET | `/inventory/reports/piece-stock-all` | All-stage piece stock | `FrmPieceStockAll` |
| 137 | GET | `/inventory/reports/rejected-piece-stock` | Rejected pieces stock | `FrmRejPieceStock` |

**Common query params**: `?companyId=&orderType=&status=&departmentId=&groupId=`

### 5.3 Stock Views & Detail

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 138 | GET | `/inventory/stock-view` | Real-time stock display (pivot by godown) | `frmStockView`, `VUE_STOCKDTDATE` |
| 139 | GET | `/inventory/stock-view/fabric/:stockId` | Fabric stock detail popup | `frmfabstockshow` |
| 140 | GET | `/inventory/stock-view/yarn/:stockId` | Yarn stock detail popup | `frmYarnStockShow` |
| 141 | GET | `/inventory/stock-view/accessories/:stockId` | Accessories stock detail popup | `frmAccStockShow` |

### 5.4 Stock Ledger & IO History

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 142 | GET | `/inventory/stock-ledger/:stockId` | Movement ledger for a stock item | `FrmStockLedger`, `Vue_StkLedger` |
| 143 | GET | `/inventory/io-history` | IO history register (order & dept) | `FrmIoHistoryReg`, `sp_iohistoryright` |

### 5.5 Opening Stock

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 144 | POST | `/inventory/opening-stock` | Enter opening stock (yarn/fabric/accessories) | `frmOpeningStock`; writes `Trs_Opening`, updates `CurrentStock` |
| 145 | POST | `/inventory/opening-stock/component-wise` | Component-wise opening | `frmOpeningStock_CompWise` |
| 146 | POST | `/inventory/opening-stock/piece-stage-wise` | Piece stage-wise opening | `frmPcsStagewiseOpeningStock` |

**POST body**: `{ companyId, orderId, styleNo, stockId, godownId, departmentId, kgs, mtrs, rate, openDate, fiscalYear }`

### 5.6 Stock Adjustments

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 147 | POST | `/inventory/adjustments` | Create stock adjustment (yarn/fabric) | `frmStockAdjustment`; updates `CurrentStock` |
| 148 | POST | `/inventory/adjustments/pieces` | Create piece goods adjustment | `frmPcsStockAdjustmentEntry`; writes `Trs_PcsAdj1/2` |

**POST body**: `{ companyId, stockId, orderId, godownId, adjustQtyKgs, adjustQtyMtrs, reason }`

### 5.7 Godown/Warehouse Operations

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 149 | POST | `/inventory/godown-transfer` | Transfer stock between godowns | `FrmChangeGodown` |
| 150 | POST | `/inventory/godown-transfer/pieces` | Piece goods godown transfer | `FrmPcsGodTransfer` |
| 151 | POST | `/inventory/godown-acknowledge` | Acknowledge godown transfer | `FrmGoDownAck` |
| 152 | POST | `/inventory/godown-transfer-acknowledge` | Acknowledge godown transfer (confirmation) | `FrmGodownTransferAck` |

### 5.8 Stock Transfer

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 153 | POST | `/inventory/stock-transfer` | Inter-order stock transfer | `FrmStkTransfer` |

**POST body**: `{ sourceOrderId, targetOrderId, stockId, transferQtyKgs, godownId }`

### 5.9 Roll Split

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 154 | POST | `/inventory/roll-split` | Split a fabric roll into child rolls | `FrmRollSplit`, `Sp_currentstock_RollDtl` |

**POST body**: `{ orderId, stockId, styleNo, parentRollId, childRolls: [{ rollKgs, rollMtrs }] }`

### 5.10 Program Balance

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 155 | GET | `/inventory/program-balance/fabric` | Fabric program balance | `ST_ProgBalance_Fabric` |
| 156 | GET | `/inventory/program-balance/yarn` | Yarn program balance | `ST_ProgBalance_Yarn` |
| 157 | GET | `/inventory/program-balance/accessories` | Accessories program balance | `ST_Acc_Prog_Balance` |

---

## 6. Module 5 — Cutting, Panels & Piece Goods

### 6.1 Ready-to-Cut

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 158 | GET | `/cutting/ready-to-cut/balance` | Get ready-to-cut fabric balance | `SP_RtoCut` |
| 159 | POST | `/cutting/ready-to-cut` | Issue fabric to cutting floor | `frmReadytoCut`; writes `Trs_ReadyToCut1/2`, transfers stock to DeptID=-7, triggers `TRG_FAB_BALANCE_RCUT` |
| 160 | POST | `/cutting/ready-to-cut/return` | Return unused fabric from cutting | `Trs_ReadyToCut_Ret1/2`; reverses stock |
| 161 | GET | `/cutting/ready-to-cut` | List ready-to-cut issues | `Trs_ReadyToCut1/2` |

**POST body**: `{ companyId, departmentId, lines: [{ orderId, stockId, kgs, mtrs }] }`

### 6.2 Cutting Production

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 162 | POST | `/cutting/production` | Record cutting production (sizes cut per order/style/color/part) | `FrmCuttingProduction_Auto_New`; writes `Trs_ProdEntry` + `Trs_ProdEntryQty`, calls `PROC_Stock_ProdPieces` |
| 163 | GET | `/cutting/production` | List cutting production entries | `Trs_ProdEntry` WHERE StageId=1 |
| 164 | GET | `/cutting/production/:id` | Get cutting entry detail | `Trs_ProdEntry` + `Trs_ProdEntryQty` |
| 165 | PUT | `/cutting/production/:id` | Update cutting entry | Edit + stock recalc |
| 166 | DELETE | `/cutting/production/:id` | Delete cutting entry (reverses stock) | DELETE + stock reversal |

**POST body**:
```json
{
  "companyId": 1, "orderId": 50, "styleNo": "ST001", "styleId": 12,
  "colorId": 1, "partId": 1, "godownId": 1, "stageId": 1, "sourceStageId": 0,
  "date": "2025-08-15",
  "quantities": [{ "sizeId": 5, "prodPcs": 100 }, { "sizeId": 6, "prodPcs": 150 }]
}
```

### 6.3 Cutting Acknowledgement & Rejection

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 167 | POST | `/cutting/acknowledge` | Acknowledge fabric receipt at cutting | `frmcuttingack`, `Trs_CutApr`, `CutACKStockPost` |
| 168 | POST | `/cutting/fabric-rejection` | Record fabric rejected during cutting | `FrmCutting_FabRej` |

### 6.4 Cutting Registers

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 169 | GET | `/cutting/register` | Cutting register report | `FrmCutingReg` |
| 170 | GET | `/cutting/fabric-return/register` | Cutting fabric return register | `FrmCuttingfabretreg` |

### 6.5 Panel Production

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 171 | POST | `/cutting/panels` | Record panel cutting/production | `frmAddPanelCutting`; writes `Trs_AddPanelEntry` + `Trs_AddPanelEntryQty` + `_Component`, calls `PROC_Stock_ProdPanel` |
| 172 | GET | `/cutting/panels` | List panel production entries | `Trs_AddPanelEntry` |
| 173 | GET | `/cutting/panels/:id` | Get panel entry detail | `Trs_AddPanelEntry` + children |
| 174 | PUT | `/cutting/panels/:id` | Update panel entry | Edit + stock recalc |
| 175 | DELETE | `/cutting/panels/:id` | Delete panel entry (reverses stock) | DELETE + `PROC_Stock_ProdPanel` reversal |

**POST body**:
```json
{
  "companyId": 1, "orderId": 50, "styleNo": "ST001", "colorId": 1,
  "partId": 1, "stageId": 2, "sourceStageId": 1, "godownId": 1,
  "cutPanelAssemble": "P", "date": "2025-08-16",
  "quantities": [{ "sizeId": 5, "prodPcs": 100 }],
  "components": [{ "compId": 1 }]
}
```

### 6.6 Panel Assembly Stock

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 176 | GET | `/cutting/panels/assembly-stock` | Get minimum available panels for assembly | `SP_PanelAssemblyStock` |

### 6.7 Panel Rejection & Excess

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 177 | POST | `/cutting/panels/rejection` | Record panel rejection | `frmPanelRej` |
| 178 | POST | `/cutting/panels/rework` | Deliver panels for rework | `frmPanelDelRework` |
| 179 | POST | `/cutting/panels/excess` | Record panel excess | `FrmPanelExcessEntry` |

### 6.8 Piece Delivery (DC)

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 180 | GET | `/cutting/piece-dcs` | List piece delivery challans | `Trs_Pcs1` |
| 181 | GET | `/cutting/piece-dcs/:id` | Get piece DC detail | `Trs_Pcs1` + `Trs_Pcs2` |
| 182 | POST | `/cutting/piece-dcs` | Create piece delivery challan (process/despatch/sales) | `frmPcsDel`; writes `Trs_Pcs1` + `Trs_Pcs2`, calls `PROC_Stock_PiecesDelivery_Insert` |
| 183 | PUT | `/cutting/piece-dcs/:id` | Update piece DC | Edit + stock update |
| 184 | DELETE | `/cutting/piece-dcs/:id` | Delete piece DC (reverses stock) | `PROC_Stock_DeliveryPieces_Delete` |
| 185 | POST | `/cutting/piece-dcs/:id/close` | Close DC (mark fully received) | `frmPcsDelRecClose` |

**POST body**:
```json
{
  "companyId": 1, "orderId": 50, "dcDate": "2025-08-20",
  "deliveryType": "Process", "partyId": 100, "departmentId": 5,
  "targetStageId": 3, "godownId": 1, "processType": "P",
  "gatePassNo": "GP-001", "vehicleCode": 5,
  "lines": [
    { "styleNo": "ST001", "colorId": 1, "sizeId": 5, "partId": 1, "pcs": 100, "sourceStageId": 2, "lotNo": "LOT-1" }
  ]
}
```

### 6.9 Piece Receipt (GRN)

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 186 | GET | `/cutting/piece-grns` | List piece receipts | `Trs_PcsGrn1` |
| 187 | GET | `/cutting/piece-grns/:id` | Get piece GRN detail | `Trs_PcsGrn1` + `Trs_PcsGrn2` |
| 188 | POST | `/cutting/piece-grns` | Create piece/panel receipt | `frmPcsRec`; writes `Trs_PcsGrn1/2`, calls `PROC_PiecesReceipt_Insert` |
| 189 | PUT | `/cutting/piece-grns/:id` | Update piece GRN | Edit + stock recalc |
| 190 | DELETE | `/cutting/piece-grns/:id` | Delete piece GRN (reverses stock) | `PROC_PiecesReceipt_Delete` |

### 6.10 Piece Rejection & Shortage

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 191 | POST | `/cutting/piece-rejection` | Record piece rejection | `frmPcsRej`, `PROC_Stock_ProdRej_Insert_Line` |
| 192 | POST | `/cutting/piece-shortage` | Record piece shortage | `frmPcsShort` |

### 6.11 Finished Goods

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 193 | POST | `/cutting/finished-goods` | Record finished goods entry | `FrmFinishGoodsEntry` |
| 194 | GET | `/cutting/finished-goods` | Finished goods register | `FrmPcsFinishedGoods` |

### 6.12 Barcode & Bundle

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 195 | POST | `/cutting/barcodes/generate` | Generate barcodes for bundles | `Pay_BarcodeGeneration` |
| 196 | POST | `/cutting/barcodes/scan` | Scan barcode (validate + record) | `frmBarcodeReadingNew`, `SP_BundleBarcode_Check`, `SP_PcsBarcode_Check` |
| 197 | POST | `/cutting/bundles/production-entry` | Bundle-based production entry | `FrmBundle_ProductionEntry` |
| 198 | POST | `/cutting/barcodes/batch-post` | Batch-post barcode scans to production | `SP_Barcode_Production_Posting` |

### 6.13 Consumption Queries

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 199 | GET | `/cutting/consumption` | Get base consumption data | `SP_ConsQuery1` |
| 200 | GET | `/cutting/consumption/detail` | Detailed consumption with GRN | `SP_ConsQuery2` variants |

### 6.14 Cutting Job Order

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 201 | POST | `/cutting/job-orders` | Create cutting job order | `frmCuttingJobOrder` |
| 202 | GET | `/cutting/job-orders` | List cutting job orders | `FrmJobOrderList` |
| 203 | GET | `/cutting/panel-report` | Cutting panel report | `SP_Cuttingpanelrpt` |

---

## 7. Module 6 — Production & Shop Floor

### 7.1 Production Entry

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 204 | GET | `/production/entries` | List production entries with filters | `Trs_ProdEntry` |
| 205 | GET | `/production/entries/:id` | Get production entry detail with sizes | `Trs_ProdEntry` + `Trs_ProdEntryQty` |
| 206 | POST | `/production/entries` | Create production entry (regular pieces) | `frmProduction`; `Sp_ProductionEntryQty_1`; `PROC_Stock_ProdPieces` |
| 207 | POST | `/production/entries/panel` | Create panel/cut-panel production entry | `frmProduction_CutPanel`; `Sp_ProductionEntryQty_Panel_1` / `_ASM` |
| 208 | PUT | `/production/entries/:id` | Update production entry | Edit + stock recalc |
| 209 | DELETE | `/production/entries/:id` | Delete production entry (reverses stock) | DELETE + stock reversal |

**POST body**:
```json
{
  "companyId": 1, "orderId": 50, "styleNo": "ST001", "styleId": 12,
  "colorId": 1, "stageId": 3, "sourceStageId": 2, "partId": 1,
  "godownId": 1, "employeeId": 10, "rework": 0, "date": "2025-08-20",
  "quantities": [{ "sizeId": 5, "prodPcs": 100 }]
}
```

### 7.2 Line Input/Output

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 210 | POST | `/production/line-input` | Issue pieces to production line | `FrmLineInput`; `PROC_Stock_IssueToPrdn_Insert` |
| 211 | POST | `/production/line-input/manual` | Manual line input | `FrmLineInputManual` |
| 212 | POST | `/production/line-output` | Manual line output | `frmLineOutputManual`; `Sp_ProductionEntryQty_LineOut_Manual` |

**POST body**: `{ companyId, orderId, styleNo, targetStageId, godownId, employeeId, lotNo, lines: [{ colorId, sizeId, pcs }] }`

### 7.3 Production Status & WBS

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 213 | GET | `/production/status` | Production status across stages (barcode-based) | `FrmProductionStatusReg`, `SP_Vue_PRodStatus` |
| 214 | GET | `/production/status/in-house` | In-house production status | `FrmInhouseProductionStatusReg` |
| 215 | GET | `/production/status/consolidated` | Consolidated production view | `SP_Vue_Prod_Consolidate_PCS` |
| 216 | GET | `/production/status/overall` | Overall production detail | `SP_Vue_Rpt_OverallProduction_Det` |
| 217 | GET | `/production/entries/register` | Production entry register | `Frm_ProductionEntryReg` |

### 7.4 WBS Production Planning

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 218 | GET | `/production/wbs` | WBS production dashboard (plan vs actual) | `WBS_Production`, `Sp_WBS_Production` |
| 219 | GET | `/production/wbs/date-wise` | Date-wise production breakdown | `WBS_Production_DateWise`, `Sp_WBS_Production_DateWise` |
| 220 | GET | `/production/wbs/line-wise` | Line-wise production planning | `WBS_LineProduction`, `Sp_WBS_Line_Production` |
| 221 | PATCH | `/production/wbs/:orderId/schedule` | Update plan start/finish dates | UPDATE `WBS_Production` plan fields |

### 7.5 Hourly & Shift Management

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 222 | GET | `/production/hourly-settings` | Get hourly target configuration | `FrmHourlySetting1` |
| 223 | POST | `/production/hourly-settings` | Set hourly targets | `FrmHourlySetting1` save |
| 224 | GET | `/production/shifts` | Get shift/hour definitions | `frmHours` |
| 225 | POST | `/production/shifts` | Create shift definition | `frmHours` save |

### 7.6 Production Wages

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 226 | GET | `/production/wages` | List production wages entries | `Trs_ProdWages` |
| 227 | POST | `/production/wages` | Enter production wages | `Frm_ProductionWages`; writes `Trs_ProdWages` |
| 228 | GET | `/production/wages/department` | Wages by department | `Frm_ProdWagesDept` |
| 229 | GET | `/production/wages/stage` | Wages by stage | `Frm_ProdWagesStage` |
| 230 | GET | `/production/wages/shift-register` | Shift wages register | `SP_Vue_RptShiftWagesReg` |

### 7.7 Production Configuration

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 231 | GET | `/production/routes/:orderId` | Get production route (stage sequence) for order | `Prod_Sequence` |
| 232 | POST | `/production/routes` | Create production route for order/style | `Frm_ProRouteTemplate` → `Prod_Sequence` |
| 233 | GET | `/production/route-templates` | List route templates | `Frm_ProRouteTemplate` |
| 234 | POST | `/production/route-templates` | Create route template | `Frm_ProRouteTemplate` save |
| 235 | GET | `/production/config` | Get production configuration | `frmProdutionConfig` |
| 236 | PATCH | `/production/config` | Update production configuration | `frmProdutionConfig` save |

### 7.8 Production Rejection

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 237 | POST | `/production/rejections` | Record production rejection | `Trs_PcsRej`, `PROC_Stock_ProdRej_Insert_Line`/`_Finish` |
| 238 | GET | `/production/rejections` | List production rejections | `Trs_PcsRej` |

### 7.9 Operations & Sub-processes

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 239 | POST | `/production/operations` | Record operation entry | `FrmOperationEntry` |
| 240 | GET | `/production/sub-processes` | List sub-processes | `Mas_SubProcess`, `Frm_SubProcess` |
| 241 | POST | `/production/sub-processes` | Create sub-process | `Frm_SubProcess` |
| 242 | GET | `/production/process-bypass` | Get process bypass settings | `FrmProcessByPassSetting` |
| 243 | PATCH | `/production/process-bypass` | Update process bypass settings | `FrmProcessByPassSetting` save |

---

## 8. Module 7 — Dispatch, Delivery & Logistics

### 8.1 Fabric/Yarn Delivery

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 244 | GET | `/dispatch/fabric-dcs` | List fabric/yarn DCs | `Trs_Del1` WHERE TrType IN (2,4,6,...) |
| 245 | GET | `/dispatch/fabric-dcs/:id` | Get fabric DC detail | `Trs_Del1` + `Trs_Del2` + `Trs_Del3` + `Trs_Del4` |
| 246 | POST | `/dispatch/fabric-dcs` | Create fabric/yarn DC (process, sales, return, transfer) | `FrmFabDel`; writes `Trs_Del1`/`Trs_Del2`/`Trs_Del3`/`Trs_Del4`, deducts `CurrentStock`, calls `SP_FabDelivery_stkValue`, triggers `TRG_FAB_BALANCE_DEL` |
| 247 | PUT | `/dispatch/fabric-dcs/:id` | Update fabric DC | Edit + stock recalc |
| 248 | DELETE | `/dispatch/fabric-dcs/:id` | Delete fabric DC (reverses stock) | DELETE + stock reversal |
| 249 | POST | `/dispatch/fabric-dcs/return` | Create fabric delivery return | `FrmFabDel_Return` |

**POST body**:
```json
{
  "companyId": 1, "fiscalYear": "25-26", "dcDate": "2025-08-20",
  "transactionType": 2, "departmentId": 4, "partyId": 100,
  "processType": "P", "vehicleCode": 5, "godownId": 1,
  "lines": [
    { "stockId": 200, "orderId": 50, "bags": 5, "kgs": 250.5, "mtrs": 0, "styleNo": "ST001" }
  ]
}
```

### 8.2 Accessory Delivery

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 250 | GET | `/dispatch/accessory-dcs` | List accessory DCs | `Trs_Del1` WHERE TrType=-1 |
| 251 | POST | `/dispatch/accessory-dcs` | Create accessory DC | `FrmAccDel`; `SP_AccDelivery_stkValue` |
| 252 | POST | `/dispatch/accessory-dcs/return` | Create accessory DC return | `FrmAccDel_Return` |
| 253 | POST | `/dispatch/accessory-dcs/sales` | Create accessory sales DC | `frmAccSalesDel` |

### 8.3 General DC

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 254 | POST | `/dispatch/general-dcs` | Create general (non-order) DC | `FrmGenDC` |
| 255 | GET | `/dispatch/general-dcs` | List general DCs | `Trs_Del1` general |

### 8.4 Process Delivery

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 256 | POST | `/dispatch/process-dcs` | Create process delivery (fabric route) | `frmPrsDel` |
| 257 | POST | `/dispatch/process-dcs/multi` | Create multi-process delivery | `frmPrsDelMulti` |
| 258 | POST | `/dispatch/process-dcs/accessories` | Process delivery for accessories | `frmPrsDelAcc` |

### 8.5 DC Print & Views

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 259 | GET | `/dispatch/fabric-dcs/:id/print` | Get DC print data (with GST, rates, E-way bill) | `SP_DEL_PRSRT`, `VUE_DEL_PRSRT` |
| 260 | GET | `/dispatch/piece-dcs/:id/print` | Get piece DC print data | `SP_PcsDcPrintQry` |
| 261 | GET | `/dispatch/dc-register` | Unified DC register (all transaction types) | `Vue_TrsDc` |
| 262 | GET | `/dispatch/dc-register/aggregated` | Aggregated DC register | `Vue_TrsDcAbs` |

### 8.6 Gate Entry & Gate Pass

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 263 | GET | `/dispatch/gate-entries` | List gate entries | `FrmGateEntry` |
| 264 | POST | `/dispatch/gate-entries` | Create gate entry (inward/outward) | `FrmGateEntry` save |
| 265 | POST | `/dispatch/gate-passes` | Generate gate pass | `FrmGatePass` |
| 266 | GET | `/dispatch/gate-passes` | List gate passes | `FrmGatePass` load |
| 267 | POST | `/dispatch/gate-entries/direct-bill` | Direct bill gate entry | `FrmDirectBill_GateEntry` |

### 8.7 Loading

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 268 | POST | `/dispatch/loading` | Create loading entry (vehicle + DCs) | `FrmLoading` |
| 269 | GET | `/dispatch/loading` | List loading entries | `FrmLoading` load |

### 8.8 Packing Lists

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 270 | POST | `/dispatch/packing-lists` | Create export packing list | `FrmPackingList` |
| 271 | POST | `/dispatch/packing-lists/domestic` | Create domestic packing list | `FrmPackingList_Domestic` |
| 272 | POST | `/dispatch/packing-lists/invoice-linked` | Create invoice-linked packing list | `FrmLocalInvPackingList` |
| 273 | GET | `/dispatch/packing-lists/:id` | Get packing list detail | Packing list tables |

### 8.9 Unit Transfer & Acknowledgement

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 274 | POST | `/dispatch/unit-transfers` | Create unit transfer (via piece DC with DelType='Unit Transfer-Panel') | `frmPcsDel` with `ToCoyCode` |
| 275 | POST | `/dispatch/unit-transfers/:id/acknowledge` | Acknowledge unit transfer at receiving unit | `FrmUnitTransferAck`; `PROC_UnitAck_Insert` |
| 276 | DELETE | `/dispatch/unit-transfers/:id/acknowledge` | Reverse unit transfer ack | `PROC_UnitAck_Delete_2` |

### 8.10 Line Transfer

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 277 | POST | `/dispatch/line-transfers` | Transfer pieces between employees/lines | `Trs_LineTfr`; `PROC_Stock_LineTfr_Insert` |
| 278 | DELETE | `/dispatch/line-transfers/:id` | Reverse line transfer | `PROC_Stock_LineTfr_Delete` |

### 8.11 DC Utilities

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 279 | PATCH | `/dispatch/general-dcs/:id/complete` | Mark DC as complete | `frmGeneralDCCompletion` |
| 280 | GET | `/dispatch/dc-detail/:id` | DC-wise detail enquiry | `FrmDcWiseDtl` |

### 8.12 Despatch Reports

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 281 | GET | `/dispatch/despatch-stock` | Despatch stock view | `VueDespatchStock1` |
| 282 | GET | `/dispatch/order-vs-despatch` | Order vs despatch summary | `Vue_OrdVsDespatch_Summary` |

---

## 9. Module 8 — Accounting, Billing & GST

### 9.1 Supplier Bill Pass

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 283 | GET | `/billing/supplier-bills` | List supplier bills | `Trs_Bills` |
| 284 | GET | `/billing/supplier-bills/:id` | Get bill detail (header + lines + additions) | `Trs_Bills` + `Trs_BillRate` + `Trs_BillAddded` |
| 285 | POST | `/billing/supplier-bills` | Create supplier bill (link to GRN/PO) | `frmBillPass`; writes `Trs_Bills`, `Trs_BillRate`, `Trs_BillAddded` |
| 286 | PUT | `/billing/supplier-bills/:id` | Update bill | Edit bill lines/additions |
| 287 | DELETE | `/billing/supplier-bills/:id` | Delete bill | DELETE `Trs_Bills`+ children |
| 288 | PATCH | `/billing/supplier-bills/:id/pass` | Approve/pass bill (set PassFlg='Y') | `frmBillPass` approval |

**POST body**:
```json
{
  "companyId": 1, "fiscalYear": "25-26", "billDate": "2025-09-01",
  "partyId": 100, "billNo": "INV-001", "billAmount": 50000,
  "billType": "Purchase", "gstBill": true,
  "lines": [
    { "orderId": 50, "departmentId": 4, "poId": 20, "rate": 120, "kgs": 250.5, "amount": 30060 }
  ],
  "additions": [
    { "addDedCode": 40, "value": 9, "amount": 2705.4 },
    { "addDedCode": 41, "value": 9, "amount": 2705.4 }
  ]
}
```

### 9.2 Billing Registers

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 289 | GET | `/billing/supplier-bills/register` | Bills register (dept-wise summary) | `FrmBillsReg`, `SP_BillRegQry` |
| 290 | GET | `/billing/supplier-bills/additions-report` | Bill additions/deductions report | `FrmBillsAddDedReport` |
| 291 | GET | `/billing/supplier-bills/register/:view` | Bill register view variant (BillsRegView_1–4) | `SP_BillsRegView_*` |

### 9.3 Debit Notes

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 292 | GET | `/billing/debit-notes` | List debit notes | `Trs_Deb1` |
| 293 | GET | `/billing/debit-notes/:id` | Get debit note detail | `Trs_Deb1` + `Trs_Deb2` + `Trs_DebAddDed` |
| 294 | POST | `/billing/debit-notes` | Create GRN-linked debit note | `frmdebitnote`; writes `Trs_Deb1`, `Trs_Deb2`, `Trs_DebAddDed` |
| 295 | POST | `/billing/debit-notes/direct` | Create direct debit note (no GRN) | `frmDirectDebitNote` |
| 296 | DELETE | `/billing/debit-notes/:id` | Delete debit note | DELETE `Trs_Deb1`+ children |

### 9.4 Sales Invoices

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 297 | GET | `/billing/sales-invoices` | List sales invoices | `Trs_SalInv` |
| 298 | GET | `/billing/sales-invoices/:id` | Get sales invoice detail | `Trs_SalInv` + `Trs_SalInvAddded` |
| 299 | POST | `/billing/sales-invoices` | Create sales invoice from DC | `frmSalINV`; HSN-based GST calc; `SP_InvQry1` |
| 300 | PUT | `/billing/sales-invoices/:id` | Update sales invoice | Edit |
| 301 | DELETE | `/billing/sales-invoices/:id` | Delete sales invoice | DELETE |

### 9.5 Local & Commercial Invoices

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 302 | POST | `/billing/local-invoices` | Create local (domestic) invoice | `FrmLocalInvoice` |
| 303 | PATCH | `/billing/local-invoices/:id/confirm` | Confirm local invoice | `FrmLocalInvConfirm` |
| 304 | POST | `/billing/commercial-invoices` | Create commercial (export) invoice | `FrmCommericalInv_New` |
| 305 | POST | `/billing/delivery-cumulative-invoices` | Create delivery-cumulative invoice | `frmDelCumInv` |

### 9.6 Piece/Job Work Invoices

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 306 | POST | `/billing/piece-invoices` | Create piece/job work invoice | `frmPieceInv`; writes `Trs_JobWrkInv`, `Trs_JWrkInvAddded` |
| 307 | GET | `/billing/piece-invoices` | List piece invoices | `Trs_JobWrkInv` |

### 9.7 Production Bills

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 308 | POST | `/billing/production-bills` | Create production bill (in-house workers) | `FrmProdBillNew`; writes `Trs_ProdBillMasNew`, `Trs_ProdBillDetNew`, `Trs_prodBillAddded1` |
| 309 | GET | `/billing/production-bills` | List production bills | `Trs_ProdBillMasNew` |
| 310 | GET | `/billing/production-bills/:id` | Get production bill detail | `Trs_ProdBillMasNew` + `Trs_ProdBillDetNew` |

### 9.8 Bill-to-Be Value

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 311 | GET | `/billing/bill-to-be-value` | Pending billing amounts per order | `SP_BilltoBeValue` (yarn, fabric, acc, piece variants) |
| 312 | GET | `/billing/bill-to-be-value/detail` | Detail breakup | `SP_BilltoBeValue_Detail` |

### 9.9 Party Balance & Outstanding

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 313 | GET | `/billing/party-balance` | Party balance register | `FrmPartyBalanceRegister`, `ST_PartyBalance_Abs` |
| 314 | GET | `/billing/party-balance/accessories` | Accessories party balance | `Sp_Acc_PartyBalance` |
| 315 | GET | `/billing/party-balance/inquiry` | Party balance inquiry | `FrmPartyBlnc` |

### 9.10 Payments

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 316 | GET | `/billing/payments` | Payment register (suppliers) | `FrmPaymentReg`, `PaymentMas`/`PaymentDtl` |
| 317 | GET | `/billing/payments/wages` | Payment register (wages) | `FrmPaymentReg_Wages` |

### 9.11 Expenses

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 318 | POST | `/billing/expenses` | Create expense entry | `FrmExpenses`, `Trs_DailyExpenseEntry` |
| 319 | POST | `/billing/expenses/fixed` | Create fixed expense entry | `FrmFixedExpensesEntry`, `FixedExpenses_Entry` |
| 320 | POST | `/billing/expenses/style-wise` | Create style-wise expense | `FrmStylewiseExpensesEntry` |
| 321 | GET | `/billing/expenses/register` | Expense entry register | `FrmExpenseEntryRegister` |

### 9.12 GST & Shipping

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 322 | GET | `/billing/gst/input-gst` | Input GST view | `Vue_InputGST` |
| 323 | POST | `/billing/shipping-bills` | Create shipping bill (export) | `ShippingBill` + `ShippingBill_Det` |
| 324 | GET | `/billing/shipping-bills` | List shipping bills | `ShippingBill` |

### 9.13 Non-Billable & Approvals

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 325 | GET | `/billing/non-billable` | List non-billable items | `FrmNonBillable` |
| 326 | GET | `/billing/awaiting-approval` | Bills awaiting approval | `Frm_AppAwBill` |
| 327 | POST | `/billing/accessory-item-approval` | Approve accessory item rate | `FrmAccItemApproval` |
| 328 | GET | `/billing/pl-register` | P&L register | `FrmPLReg` |

---

## 10. Module 9 — Costing, Budgeting & Finance

### 10.1 Budget CRUD

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 329 | GET | `/costing/budgets/:orderId` | Get budget for order (part-wise, bit-wise rates) | `frmBudget`; reads `Pro_Prod_PartwiseRate`, `Pro_Prod_BitCutRate` |
| 330 | POST | `/costing/budgets` | Create/update budget for order | `frmBudget`; writes `Pro_Prod_PartwiseRate`, `Pro_Prod_BitCutRate`, `Pro_Prod_Budget_Det` |
| 331 | POST | `/costing/budgets/job-work` | Create job work budget | `frmBudgetNew_JobWork` |
| 332 | POST | `/costing/budgets/commercial` | Create commercial budget component | `frmBudcom` |
| 333 | GET | `/costing/budgets/:orderId/in-house-rates` | Get in-house rates (color/size-wise) | `Bud_InhRateclw` |
| 334 | POST | `/costing/budgets/:orderId/in-house-rates` | Set in-house CMT rates | `Bud_InhRateclw` |

### 10.2 Budget vs Actual Comparison

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 335 | GET | `/costing/budget-vs-actual/:orderId` | Budget vs actual comparison (consolidated) | `FrmBudgetAndActualComp`, `SP_Bud_and_Actual` |
| 336 | GET | `/costing/budget-vs-actual/:orderId/style-wise` | Style-wise budget vs actual | `SP_Bud_and_ActualStyleWise` |
| 337 | GET | `/costing/budget-vs-actual/:orderId/detail` | Detailed line-item comparison | `SP_BudAndActual_Det` |

**Response**:
```json
{
  "orderId": 50,
  "sections": [
    { "type": "YARN", "budgetQty": 500, "budgetAmt": 60000, "actualQty": 480, "actualAmt": 58000, "variance": -2000 },
    { "type": "FABRIC", "..." },
    { "type": "ACCESSORIES", "..." },
    { "type": "CMT", "stages": [{ "stageId": 3, "stageName": "Sewing", "budgetRate": 25, "budgetAmt": 12500, "actualAmt": 13000 }] }
  ]
}
```

### 10.3 Pre-Costing

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 338 | POST | `/costing/pre-costing` | Create pre-costing for order | `FrmPreCostingCompMas` |
| 339 | GET | `/costing/pre-costing/:orderId` | Get pre-costing detail | pre-costing component data |
| 340 | POST | `/costing/pre-budget-plan` | Create pre-budget production plan | `frmPreBudgetProdPlan` |

### 10.4 Production Cost & Daily Costing

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 341 | POST | `/costing/daily-costing-input` | Enter daily costing input (factory/dept/line/order expenses) | `Frm_CostingInput`; writes `ST_DailyCostingInputData`, `ST_Cost_Factory`, `ST_Cost_Dept`, `ST_Cost_OrderDtl` |
| 342 | GET | `/costing/daily-costing-input` | Get daily costing input data | `Vue_DailyCostingInputData` |
| 343 | GET | `/costing/production-cost/:orderId` | Get production cost dashboard | `Frm_ProductionCost`; `SP_Vue_OrderStyleWiseCost` |

### 10.5 Daily P&L

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 344 | POST | `/costing/daily-pl/generate` | Generate daily unit P&L | `Sp_DailyUnitPANDL`; writes `DailyUnit_P_and_L`, `DailyUnit_P_And_L_Abs` |
| 345 | GET | `/costing/daily-pl` | Get daily P&L data | `DailyUnit_P_and_L` + `DailyUnit_P_And_L_Abs` |

### 10.6 P&L Reports

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 346 | GET | `/costing/pl-report/order/:orderId` | Order-level P&L register | `FrmPLReg` |
| 347 | GET | `/costing/pl-report/buyer/:buyerId` | Buyer-wise P&L report | `frmBuyerPLReport` |
| 348 | GET | `/costing/pl-report/domestic` | Domestic P&L report | `Sp_DomesticPL` |
| 349 | GET | `/costing/one-page-report/:orderId` | One-page cost summary report | `SP_OnePageRpt` |

### 10.7 Rate Masters

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 350 | GET | `/costing/rate-masters/material` | Material rate master | `FrmRateMaster` |
| 351 | POST | `/costing/rate-masters/material` | Set material rates | `FrmRateMaster` save |
| 352 | GET | `/costing/rate-masters/production` | Production rate master | `FrmPrdnRateMaster` |
| 353 | POST | `/costing/rate-masters/production` | Set production rates | `FrmPrdnRateMaster` save |
| 354 | GET | `/costing/rate-masters/commercial` | Commercial rate master | `FrmCommRateMaster` |
| 355 | POST | `/costing/rate-masters/commercial` | Set commercial rates | `FrmCommRateMaster` save |

### 10.8 Rate Confirmation

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 356 | GET | `/costing/rate-confirmation/approved` | Approved rate confirmations | `SP_ApprovedRateCnf1` |
| 357 | GET | `/costing/rate-confirmation/pending` | Pending rate confirmations | `SP_PendingRateCnf` |
| 358 | POST | `/costing/rate-confirmation` | Submit rate confirmation | `Pro_RateCnfPcs1/2` |
| 359 | PATCH | `/costing/rate-confirmation/:id/approve` | Approve rate confirmation | Update `Pro_RateCnfPcs1` approval flag |

### 10.9 Order/Style-Wise Cost View

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 360 | GET | `/costing/order-style-cost/:orderId` | Order/style-wise cost aggregation | `SP_Vue_OrderStyleWiseCost`, `ORDERSTYLEWISECOST` |

### 10.10 Consumption Queries

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 361 | GET | `/costing/fabric-requirement/:orderId` | Fabric requirement calculation | `SP_FabReqCalc_Domestic_joborder` |
| 362 | GET | `/costing/piece-value/:orderId` | Piece goods valuation | `SP_PcsValue` variants |

### 10.11 Commercial Template

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 363 | GET | `/costing/commercial-template` | Get commercial cost templates | `Frm_CommercialTemplate` |
| 364 | POST | `/costing/commercial-template` | Save commercial cost template | `Frm_CommercialTemplate` save |
| 365 | POST | `/costing/other-po-inputs` | Save other PO-related cost inputs | `FrmOtherPORelatedIps` |
| 366 | GET | `/costing/other-po-inputs/:orderId` | Get PO-related cost inputs | `FrmOtherPORelatedIps` load |

---

## 11. Module 10 — Job Work, Quality, HR & Reporting

### 11.1 Job Work & Outsourcing

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 367 | POST | `/jobwork/contract-allotment` | Allot production to contractor | `frmContractAllotment`; writes `Trs_ContractorAllotment_Mas` |
| 368 | GET | `/jobwork/contract-allotment` | List contract allotments | `Trs_ContractorAllotment_Mas` |
| 369 | PUT | `/jobwork/contract-allotment/:id` | Update contract allotment | Edit allotment |
| 370 | GET | `/jobwork/contractor-ledger` | Contractor ledger (bills, payments, balance) | `vue_ContractLedger_New_Balcheck` |
| 371 | POST | `/jobwork/piece-return` | Process piece return from job work | `frmJobWorkPcsReturn` |
| 372 | GET | `/jobwork/job-order-balance/party-wise` | Party-wise job order balance | `Sp_PartyWiseJobOrderBal` |
| 373 | GET | `/jobwork/job-order-balance/unit-wise` | Unit-wise job order balance | `Sp_UnitWiseJobOrderBal` |
| 374 | GET | `/jobwork/supplier-production` | Supplier production summary | `ST_Supp_Production_Data`, `SP_ST_Supp_Production_Data` |
| 375 | GET | `/jobwork/supplier-wbs` | Supplier WBS production tracking | `WBS_Supp_Production`, `Sp_WBS_Supp_Production` |

### 11.2 Quality, Lab & Approvals

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 376 | GET | `/quality/lab-tests` | List lab test entries | Lab test tables |
| 377 | POST | `/quality/lab-tests` | Create lab test entry | `FrmLabTest`/`FrmNewLabTest` |
| 378 | GET | `/quality/lab-tests/:id` | Get lab test detail | Lab test detail |
| 379 | GET | `/quality/lab-test-parameters` | List lab test parameters | `FrmLabTestParameters`, `Mas_LabTestParameters` |
| 380 | POST | `/quality/lab-test-parameters` | Create lab test parameter | INSERT `Mas_LabTestParameters` |
| 381 | GET | `/quality/lab-test-stages` | List lab test stages | `FrmLabTestStages`, `Mas_LabTestStages` |
| 382 | POST | `/quality/lots/approve` | Approve lot | `frmLotApproval` |
| 383 | GET | `/quality/lots` | Lot register | `FrmLotRegister` |
| 384 | POST | `/quality/lots/separate` | Separate lot | `FrmLotSeparate` |
| 385 | GET | `/quality/lots/:id/detail` | Lot-wise detail | `frmLotWiseDtl` |
| 386 | GET | `/quality/grammage` | Get grammage data | `frmGrammage` |
| 387 | POST | `/quality/grammage` | Record grammage (cut weight) | `frmGrammage` save |

### 11.3 Approvals

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 388 | POST | `/quality/approvals/non-return-dc` | Approve non-return DC | `FrmNonReturnDCApproval` |
| 389 | POST | `/quality/approvals/reprocess` | Approve reprocess | `FrmReprocess_Approval` |

### 11.4 HR, Labor & Payroll

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 390 | GET | `/hr/employees` | List employees (with shift/line data) | `Mas_Emp`, `FrmEmpmaster` |
| 391 | POST | `/hr/employees` | Create employee | INSERT `Mas_Emp` |
| 392 | PUT | `/hr/employees/:id` | Update employee | UPDATE `Mas_Emp` |
| 393 | GET | `/hr/daily-in-out` | Daily in/out register | `frmDailyinout`, `Vue_Dailyinout` |
| 394 | POST | `/hr/daily-in-out` | Record daily in/out | `frmDailyinout` save |
| 395 | GET | `/hr/shift-wages/register` | Shift wages register | `FrmProdShiftWagesReg`, `SP_Vue_RptShiftWagesReg` |
| 396 | POST | `/hr/payments` | Record contractor/wage payment | `PaymentMas`/`PaymentDtl` |
| 397 | GET | `/hr/payments` | List payments | `PaymentMas` |

### 11.5 Reporting, Analytics & Integrations

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 398 | GET | `/reports/generate/:reportId` | Generate report by ID (Stimulsoft/Crystal) | `FrmReport`/`FrmCrysReport` — see §12.5 |
| 399 | GET | `/reports/registers/:registerId` | Get register data | `FrmRegister` |
| 400 | GET | `/reports/status-register` | Status register view | `FrmStatusReg` |
| 401 | GET | `/reports/mis-dashboard` | MIS dashboard data | `frmMIS` |
| 402 | GET | `/reports/buyer-status` | Buyer status report | `FrmBuyerStatus` |
| 403 | GET | `/reports/sewing-requirement` | Sewing requirement report | `FrmSewingReq` |
| 404 | GET | `/reports/combo-wise-requirement` | Combo-wise requirement report | `frmComboWiseReqRpt` |

### 11.6 Meeting & Workflow

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 405 | GET | `/reports/meetings` | Meeting review data | `SP_WBS_MeetingView` |
| 406 | GET | `/reports/meetings/:id/approvals` | Meeting approval details | `SP_Meet_ApprovalDetails` |
| 407 | POST | `/reports/meetings` | Create meeting entry | Meeting tables |
| 408 | GET | `/reports/mail-list` | Mail display list | `Sp_Maillist1` |

---

## 12. Cross-Cutting Concerns

### 12.1 Authentication & Authorization

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 409 | POST | `/auth/login` | Login (returns JWT) `[public]` | `FrmLogin_New`, `Mas_User` |
| 410 | POST | `/auth/refresh` | Refresh JWT token | — |
| 411 | POST | `/auth/logout` | Logout (invalidate refresh token) | — |
| 412 | POST | `/auth/change-password` | Change password | `FrmChangePassword` |
| 413 | GET | `/auth/me` | Get current user profile & permissions | `Mas_User` + `Mas_MenuRights` + `CompanyRights` |

### 12.2 User & Access Management

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 414 | GET | `/admin/users` | List users | `FrmMasuser`, `Mas_User` |
| 415 | POST | `/admin/users` | Create user | INSERT `Mas_User` |
| 416 | PUT | `/admin/users/:id` | Update user | UPDATE `Mas_User` |
| 417 | DELETE | `/admin/users/:id` | Deactivate user | Soft-delete |
| 418 | GET | `/admin/user-groups` | List user groups | `FrmUserGroupMas` |
| 419 | POST | `/admin/user-groups` | Create user group | INSERT user group |
| 420 | GET | `/admin/menu-rights/:userId` | Get menu rights for user | `FrmMenuRights`, `Mas_MenuRights` |
| 421 | PUT | `/admin/menu-rights/:userId` | Set menu rights | UPDATE `Mas_MenuRights` |
| 422 | GET | `/admin/company-rights/:userId` | Get company rights | `FrmCompanyRights` |
| 423 | PUT | `/admin/company-rights/:userId` | Set company rights | UPDATE company rights |
| 424 | GET | `/admin/login-register` | Login audit log | `FrmLoginReg` |

### 12.3 Fiscal Year & Company Selection

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 425 | GET | `/config/fiscal-years` | List fiscal years | `FinanceYear` table, `FrmFinyearLogin` |
| 426 | POST | `/config/fiscal-years` | Create fiscal year | INSERT `FinanceYear` |
| 427 | GET | `/config/companies` | List companies user has access to | `FrmCompanyLogin`, company rights filter |

### 12.4 File Upload & Images

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 428 | POST | `/files/upload` | Upload file (image, Excel, document) | Generic file storage (GridFS/S3) |
| 429 | GET | `/files/:id` | Download/view file | File retrieval |
| 430 | DELETE | `/files/:id` | Delete file | File deletion |

### 12.5 Report Generation

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 431 | POST | `/reports/generate` | Generate PDF/Excel report from template | Stimulsoft .mrt / Crystal .rpt engine |
| 432 | GET | `/reports/templates` | List available report templates | 150+ .mrt + 180+ .rpt files |

**POST body**: `{ templateId, format: "pdf"|"excel", parameters: { companyId, orderId, dateFrom, dateTo, ... } }`  
**Response**: Binary file stream or URL to generated file

### 12.6 Data Import/Export

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 433 | POST | `/import/orders/excel` | Import orders from Excel | `FrmOrderRelatedInput_Excel` |
| 434 | POST | `/import/bulk-data` | Bulk data import (CSV/Excel for masters) | Various master import utilities |
| 435 | GET | `/export/data` | Export data to CSV/Excel | Generic data export |

### 12.7 System Utilities

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 436 | GET | `/system/health` | Health check `[public]` | — |
| 437 | GET | `/system/holidays` | Government holidays list | `GovtHolidays`, `Frm_Mas_Holiday` |
| 438 | POST | `/system/holidays` | Add government holiday | INSERT `GovtHolidays` |

### 12.8 GST Utilities

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 439 | GET | `/gst/determine-type` | Determine GST type (CGST+SGST or IGST) given party/company | State comparison logic from `Mas_Party.Stateid` vs `Mas_Exporter.Stateid` |
| 440 | GET | `/gst/hsn-rate/:hsnId` | Get GST rate for HSN code (branded/non-branded) | `Mas_HSN` rate lookup |
| 441 | POST | `/gst/tally-export` | Export GST data for Tally integration | `FrmTally_GSTSetup` |

### 12.9 Number-to-Words Utility

| # | Method | Endpoint | Description | Legacy Mapping |
|---|--------|----------|-------------|----------------|
| 442 | GET | `/utils/number-to-words` | Convert number to words (multi-currency) | `DSP_NumericToRupees`, `NumberToWordsNew` |

**Query params**: `?amount=50000.50&currencyId=0`  
**Response**: `{ words: "RUPEES FIFTY THOUSAND AND FIFTY PAISE ONLY" }`

---

## 13. Endpoint Count Summary

| Module | Section | Endpoints |
|--------|---------|-----------|
| **Module 1** — Masters & Configuration | Buyers, Parties, Companies, Products, Accessories, Org, Finance, Config | 58 |
| **Module 2** — Order Management & Sales | Orders CRUD, Amendments, Status, Registers, Samples, Trading, Import | 32 |
| **Module 3** — Procurement & Supplier | POs, GRNs, Supplier Orders, Party Balance, Registers | 34 |
| **Module 4** — Inventory & Warehouse | Stock Items, Registers, Views, Ledger, Opening, Adjustments, Godown, Transfers | 33 |
| **Module 5** — Cutting, Panels & Pieces | Ready-to-Cut, Cutting, Panels, Piece DCs, Piece GRNs, Barcodes, Finished Goods | 46 |
| **Module 6** — Production & Shop Floor | Production Entry, Line I/O, Status, WBS, Wages, Config, Rejections | 40 |
| **Module 7** — Dispatch, Delivery & Logistics | Fabric/Acc/General DCs, Gate, Loading, Packing, Unit Transfer, Line Transfer | 39 |
| **Module 8** — Accounting, Billing & GST | Bills, Debit Notes, Invoices, Party Balance, Payments, Expenses, GST | 46 |
| **Module 9** — Costing, Budgeting & Finance | Budgets, Budget vs Actual, Pre-Costing, P&L, Rate Masters, Rate Confirmation | 38 |
| **Module 10** — Job Work, Quality, HR, Reporting | Job Work, Lab Tests, Approvals, HR, Reports, Meetings | 42 |
| **Cross-Cutting** — Auth, Users, Files, Reports, Import/Export, System | Auth, Admin, Files, Reports, GST Utils | 34 |
| | **TOTAL** | **442** |

---

## Appendix A — Transaction Type Codes (TrType) Reference

These legacy TrType values from `Trs_Del1` map to the delivery types in the MERN API:

| TrType | Legacy Meaning | MERN Endpoint Pattern |
|--------|---------------|----------------------|
| -1 | Accessories DC | `/dispatch/accessory-dcs` |
| 2 | Fabric Process DC | `/dispatch/fabric-dcs` (processType: P) |
| 4 | Yarn Process DC | `/dispatch/fabric-dcs` (yarnFlag: Y) |
| 6 | Purchase Return DC | `/dispatch/fabric-dcs` (returnType: purchase) |
| 8 | Sales DC | `/dispatch/fabric-dcs` (salesType: true) |
| 10 | General DC | `/dispatch/general-dcs` |
| 20 | Ready-to-Cut | `/cutting/ready-to-cut` |

## Appendix B — Piece Delivery Types (DelType) Reference

| DelType | Legacy Meaning | MERN Endpoint |
|---------|---------------|---------------|
| Process | Job work issue | `/cutting/piece-dcs` (deliveryType: Process) |
| Despatch | Final despatch to buyer | `/cutting/piece-dcs` (deliveryType: Despatch) |
| Sales | Sales delivery | `/cutting/piece-dcs` (deliveryType: Sales) |
| Unit Transfer-Panel | Inter-unit transfer | `/dispatch/unit-transfers` |
| JobWork Return | Return from job work | `/cutting/piece-dcs` (deliveryType: JobWork Return) |

## Appendix C — GRN Type Codes Reference

| GRNType | Legacy Meaning | MERN Endpoint |
|---------|---------------|---------------|
| Purchase | New material from vendor | `/procurement/grns` (grnType: Purchase) |
| Process | Return from outsourced processing | `/procurement/grns` (grnType: Process) |
| Process Return | Rejected from process | `/procurement/grns` (grnType: Process Return) |
| Sales Return | Return from customer | `/procurement/grns` (grnType: Sales Return) |
| DirectReceipt | No PO receipt | `/procurement/grns` (grnType: DirectReceipt) |
| FabricRetToUnit | Fabric return to unit | `/procurement/grns` (grnType: FabricRetToUnit) |

## Appendix D — Authentication & Middleware Notes

### JWT Token Structure
```json
{
  "sub": "userId",
  "companyId": 1,
  "fiscalYear": "25-26",
  "roles": ["admin", "operator"],
  "companyRights": [1, 2, 3],
  "iat": 1234567890,
  "exp": 1234654290
}
```

### Middleware Chain (per request)
1. **`authMiddleware`** — Validates JWT, extracts user context
2. **`companyMiddleware`** — Ensures `companyId` in request matches user's `companyRights`
3. **`roleMiddleware(roles[])`** — Checks user has required role for the endpoint
4. **`auditMiddleware`** — Logs request to audit trail (replaces `FrmLoginReg`)

### Rate Limiting
- Auth endpoints: 5 requests/minute per IP
- API endpoints: 100 requests/minute per user
- Report generation: 10 requests/minute per user

### CORS Configuration
- Allow configured frontend origins
- Support credentials for cookie-based refresh tokens
