/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const FIN_YEAR = '26-27'

async function main() {
  console.log('🌱 Seeding Fiberpro demo data...')

  // ── FinYear ──
  await db.finYear.upsert({
    where: { code: FIN_YEAR },
    update: {},
    create: {
      code: FIN_YEAR,
      name: '2026-27',
      start: new Date('2026-04-01'),
      end: new Date('2027-03-31'),
      active: true,
    },
  })

  // ── User ──
  await db.user.upsert({
    where: { email: 'admin@fiberpro.local' },
    update: {},
    create: {
      email: 'admin@fiberpro.local',
      name: 'Aslam Admin',
      role: 'admin',
    },
  })

  // ── UOM ──
  const uomDefs = [
    { name: 'Kg', code: 'KG' },
    { name: 'Metre', code: 'MTR' },
    { name: 'Piece', code: 'PCS' },
    { name: 'Bag', code: 'BAG' },
    { name: 'Roll', code: 'ROLL' },
    { name: 'Cone', code: 'CONE' },
    { name: 'Set', code: 'SET' },
    { name: 'Dozen', code: 'DZN' },
  ]
  const uoms: Record<string, any> = {}
  for (const u of uomDefs) {
    uoms[u.code] = await db.uOM.upsert({
      where: { name: u.name },
      update: {},
      create: u,
    })
  }

  // ── Godowns ──
  const godowns = await Promise.all([
    db.godown.upsert({ where: { code: 'G1' }, update: {}, create: { code: 'G1', name: 'Main Store' } }),
    db.godown.upsert({ where: { code: 'G2' }, update: {}, create: { code: 'G2', name: 'Finished Goods' } }),
    db.godown.upsert({ where: { code: 'G3' }, update: {}, create: { code: 'G3', name: 'Jobworker Yard' } }),
  ])

  // ── Departments ──
  const deptDefs = [
    { code: 'D1', name: 'Knitting', orderSno: 1 },
    { code: 'D2', name: 'Dyeing', orderSno: 2, isProcess: true },
    { code: 'D3', name: 'Cutting', orderSno: 3 },
    { code: 'D4', name: 'Sewing', orderSno: 4 },
    { code: 'D5', name: 'Finishing', orderSno: 5 },
    { code: 'D6', name: 'Packing', orderSno: 6 },
  ]
  const depts: Record<string, any> = {}
  for (const d of deptDefs) {
    depts[d.code] = await db.department.upsert({ where: { code: d.code }, update: {}, create: d })
  }

  // ── Colours ──
  const colourDefs = [
    { name: 'Red', code: 'RED' },
    { name: 'Blue', code: 'BLU' },
    { name: 'Black', code: 'BLK' },
    { name: 'White', code: 'WHT' },
    { name: 'Green', code: 'GRN' },
    { name: 'Navy', code: 'NVY' },
  ]
  const colours: Record<string, any> = {}
  for (const c of colourDefs) {
    colours[c.code] = await db.colour.upsert({ where: { name: c.name }, update: {}, create: c })
  }

  // ── Sizes ──
  const sizeDefs = [
    { name: 'S', sort: 1 },
    { name: 'M', sort: 2 },
    { name: 'L', sort: 3 },
    { name: 'XL', sort: 4 },
    { name: 'XXL', sort: 5 },
  ]
  const sizes: Record<string, any> = {}
  for (const s of sizeDefs) {
    sizes[s.name] = await db.size.upsert({ where: { name: s.name }, update: {}, create: s })
  }

  // ── Dias ──
  const diaDefs = [{ value: '18' }, { value: '24' }, { value: '30' }]
  const dias: Record<string, any> = {}
  for (const d of diaDefs) {
    dias[d.value] = await db.dia.upsert({ where: { value: d.value }, update: {}, create: d })
  }

  // ── Lot ──
  const lotDefs = [{ lotNo: 'L-1001' }, { lotNo: 'L-1002' }]
  const lots: Record<string, any> = {}
  for (const l of lotDefs) {
    lots[l.lotNo] = await db.lot.upsert({ where: { lotNo: l.lotNo }, update: {}, create: l })
  }

  // ── Parties (suppliers + customers) ──
  const partyDefs = [
    { code: 'SUP001', name: 'XYZ Yarns Pvt Ltd', partyType: 'supplier', gstin: '27ABCDE1234F1Z5', city: 'Mumbai', state: 'Maharashtra', openingBalance: 0 },
    { code: 'SUP002', name: 'Acme Fabric Mills', partyType: 'supplier', gstin: '29ABCGH5678K1Z2', city: 'Tirupur', state: 'Tamil Nadu' },
    { code: 'SUP003', name: 'TrimLine Accessories', partyType: 'supplier', gstin: '33IJKLM9012P1Z9', city: 'Chennai', state: 'Tamil Nadu' },
    { code: 'CUS001', name: 'Acme Corp USA', partyType: 'customer', city: 'New York' },
    { code: 'CUS002', name: 'BlueWave Retail', partyType: 'customer', gstin: '27PQRST3456U1Z1', city: 'Pune', state: 'Maharashtra' },
    { code: 'CUS003', name: 'Mumbai Garments Hub', partyType: 'customer', gstin: '27UVWXY7890V1Z3', city: 'Mumbai', state: 'Maharashtra' },
    { code: 'JW001', name: 'Sri Balaji Washers', partyType: 'supplier', gstin: '29JKLMN3456Q1Z7', city: 'Tirupur', state: 'Tamil Nadu' },
    { code: 'JW002', name: 'Apex Dye House', partyType: 'supplier', gstin: '29QRSUV7890R1Z4', city: 'Tirupur', state: 'Tamil Nadu' },
  ]
  const parties: Record<string, any> = {}
  for (const p of partyDefs) {
    parties[p.code] = await db.party.upsert({ where: { code: p.code }, update: {}, create: p })
  }

  // ── Buyers ──
  const buyerDefs = [
    { code: 'B001', name: 'Acme Corp USA', dept: 'Apparel Div' },
    { code: 'B002', name: 'BlueWave Retail', dept: 'Menswear' },
    { code: 'B003', name: 'Mumbai Garments Hub', dept: 'Local' },
  ]
  const buyers: Record<string, any> = {}
  for (const b of buyerDefs) {
    buyers[b.code] = await db.buyer.upsert({ where: { code: b.code }, update: {}, create: b })
  }

  // ── Merchandisers ──
  const merchs = [
    { name: 'Priya Sharma', email: 'priya@baalaji.com' },
    { name: 'Rajesh Iyer', email: 'rajesh@baalaji.com' },
  ]
  for (const m of merchs) {
    await db.merchandiser.upsert({ where: { name: m.name }, update: {}, create: m })
  }

  // ── Exporter ──
  await db.exporter.upsert({
    where: { code: 'EXP001' },
    update: {},
    create: { code: 'EXP001', name: 'Baalaji Garments', iec: 'ABCDE1234F', gstin: '27ABCDE1234F1Z5' },
  })

  // ── Season ──
  await db.season.upsert({
    where: { code: 'SS26' },
    update: {},
    create: { code: 'SS26', name: 'Spring Summer 2026', startDate: new Date('2026-01-01'), endDate: new Date('2026-06-30') },
  })

  // ── Parts ──
  const partDefs = ['Front', 'Back', 'Sleeve', 'Collar', 'Cuff']
  for (const p of partDefs) {
    await db.part.upsert({ where: { name: p }, update: {}, create: { name: p } })
  }

  // ── Components ──
  const compDefs = ['Body', 'Placket', 'Pocket', 'Yoke']
  for (const c of compDefs) {
    await db.component.upsert({ where: { name: c }, update: {}, create: { name: c } })
  }

  // ── Designs ──
  const designDefs = [
    { name: 'Plain', code: 'PLN' },
    { name: 'Striped', code: 'STR' },
    { name: 'Jacquard', code: 'JCQ' },
  ]
  for (const d of designDefs) {
    await db.design.upsert({ where: { name: d.name }, update: {}, create: d })
  }

  // ── Yarns ──
  const yarnDefs = [
    { code: 'Y-30COT', count: '30s', blend: '100% Cotton', uomId: uoms.KG.id, rate: 180 },
    { code: 'Y-40COT', count: '40s', blend: '100% Cotton', uomId: uoms.KG.id, rate: 200 },
    { code: 'Y-20PCC', count: '20s', blend: 'Poly-Cotton 65:35', uomId: uoms.KG.id, rate: 140 },
    { code: 'Y-30PC', count: '30s', blend: 'Polyester', uomId: uoms.KG.id, rate: 110 },
    { code: 'Y-2X40', count: '2/40s', blend: '100% Cotton', uomId: uoms.KG.id, rate: 220 },
  ]
  const yarns: Record<string, any> = {}
  for (const y of yarnDefs) {
    yarns[y.code] = await db.yarn.upsert({ where: { code: y.code }, update: {}, create: y })
  }

  // ── Fabrics ──
  const fabricDefs = [
    { code: 'F-SJ30', construction: 'Single Jersey', gsm: 180, width: 180, diaId: dias['24'].id, uomId: uoms.KG.id, rate: 280 },
    { code: 'F-RIB24', construction: 'Rib', gsm: 220, width: 180, diaId: dias['18'].id, uomId: uoms.KG.id, rate: 320 },
    { code: 'F-PJ40', construction: 'Pique', gsm: 200, width: 200, diaId: dias['30'].id, uomId: uoms.KG.id, rate: 310 },
    { code: 'F-WVN', construction: 'Woven', gsm: 150, width: 150, uomId: uoms.MTR.id, rate: 90 },
    { code: 'F-DENIM', construction: 'Denim', gsm: 350, width: 150, uomId: uoms.MTR.id, rate: 220 },
    { code: 'F-FLEECE', construction: 'Fleece', gsm: 280, width: 180, diaId: dias['24'].id, uomId: uoms.KG.id, rate: 380 },
    { code: 'F-LYCR', construction: 'Lycra Blend', gsm: 240, width: 180, diaId: dias['18'].id, uomId: uoms.KG.id, rate: 420 },
    { code: 'F-INTER', construction: 'Interlock', gsm: 260, width: 180, diaId: dias['30'].id, uomId: uoms.KG.id, rate: 360 },
  ]
  const fabrics: Record<string, any> = {}
  for (const f of fabricDefs) {
    fabrics[f.code] = await db.fabric.upsert({ where: { code: f.code }, update: {}, create: f })
  }

  // ── Accessories ──
  const accDefs = [
    { code: 'A-BTN', name: 'Button 16L', category: 'Buttons', uomId: uoms.PCS.id, rate: 0.5 },
    { code: 'A-ZIP', name: 'Zipper 7"', category: 'Zippers', uomId: uoms.PCS.id, rate: 4.5 },
    { code: 'A-LBL', name: 'Care Label', category: 'Labels', uomId: uoms.PCS.id, rate: 0.3 },
    { code: 'A-PB', name: 'Poly Bag', category: 'Packaging', uomId: uoms.PCS.id, rate: 0.8 },
    { code: 'A-CRT', name: 'Carton Box', category: 'Packaging', uomId: uoms.PCS.id, rate: 28 },
    { code: 'A-THRD', name: 'Sewing Thread', category: 'Thread', uomId: uoms.CONE.id, rate: 65 },
  ]
  for (const a of accDefs) {
    await db.accessory.upsert({ where: { code: a.code }, update: {}, create: a })
  }

  // ── Styles ──
  const styleDefs = [
    { styleNo: 'S-1001', description: 'Mens Round Neck T-Shirt', buyerId: buyers.B001.id, category: 'Knit', sam: 4.5, hsn: '6109' },
    { styleNo: 'S-1002', description: 'Ladies Denim Pant', buyerId: buyers.B002.id, category: 'Woven', sam: 12.5, hsn: '6203' },
    { styleNo: 'S-1003', description: 'Kids Fleece Hoodie', buyerId: buyers.B001.id, category: 'Knit', sam: 8.2, hsn: '6110' },
    { styleNo: 'S-1004', description: 'Mens Formal Shirt', buyerId: buyers.B002.id, category: 'Woven', sam: 14.0, hsn: '6205' },
    { styleNo: 'S-1005', description: 'Ladies Top', buyerId: buyers.B003.id, category: 'Knit', sam: 6.0, hsn: '6211' },
  ]
  const styles: Record<string, any> = {}
  for (const s of styleDefs) {
    styles[s.styleNo] = await db.style.upsert({ where: { styleNo: s.styleNo }, update: {}, create: s })
  }

  // ── Employees ──
  const empDefs = [
    { code: 'E001', name: 'Ramesh Kumar', deptId: depts.D4.id, role: 'operator', pieceRate: 12, dailyWage: 450 },
    { code: 'E002', name: 'Suresh Patel', deptId: depts.D4.id, role: 'operator', pieceRate: 12, dailyWage: 450 },
    { code: 'E003', name: 'Lakshmi Devi', deptId: depts.D4.id, role: 'operator', pieceRate: 10, dailyWage: 400 },
    { code: 'E004', name: 'Anjali Nair', deptId: depts.D3.id, role: 'operator', pieceRate: 8, dailyWage: 350 },
    { code: 'E005', name: 'Mohammed Ali', deptId: depts.D5.id, role: 'supervisor', pieceRate: 0, dailyWage: 800 },
    { code: 'E006', name: 'Geeta Reddy', deptId: depts.D6.id, role: 'helper', pieceRate: 0, dailyWage: 350 },
  ]
  const emps: Record<string, any> = {}
  for (const e of empDefs) {
    emps[e.code] = await db.employee.upsert({ where: { code: e.code }, update: {}, create: e })
  }

  // ── Sales Orders (with matrix lines) ──
  const orderDefs = [
    {
      orderNo: 'SO-1001', buyerId: buyers.B001.id, styleId: styles['S-1001'].id,
      orderDate: new Date('2026-07-15'), deliveryDate: new Date('2026-10-15'),
      finYear: FIN_YEAR, totalPcs: 5000, totalValue: 1250000,
      lines: [
        { styleId: styles['S-1001'].id, colourId: colours.RED.id, sizeId: sizes.M.id, qty: 1000, rate: 250 },
        { styleId: styles['S-1001'].id, colourId: colours.RED.id, sizeId: sizes.L.id, qty: 1000, rate: 250 },
        { styleId: styles['S-1001'].id, colourId: colours.BLU.id, sizeId: sizes.M.id, qty: 1500, rate: 250 },
        { styleId: styles['S-1001'].id, colourId: colours.BLU.id, sizeId: sizes.L.id, qty: 1500, rate: 250 },
      ],
    },
    {
      orderNo: 'SO-1002', buyerId: buyers.B002.id, styleId: styles['S-1002'].id,
      orderDate: new Date('2026-08-01'), deliveryDate: new Date('2026-11-01'),
      finYear: FIN_YEAR, totalPcs: 3000, totalValue: 1350000,
      lines: [
        { styleId: styles['S-1002'].id, colourId: colours.BLK.id, sizeId: sizes.L.id, qty: 1000, rate: 450 },
        { styleId: styles['S-1002'].id, colourId: colours.NVY.id, sizeId: sizes.L.id, qty: 1000, rate: 450 },
        { styleId: styles['S-1002'].id, colourId: colours.BLK.id, sizeId: sizes.XL.id, qty: 1000, rate: 450 },
      ],
    },
    {
      orderNo: 'SO-1003', buyerId: buyers.B001.id, styleId: styles['S-1003'].id,
      orderDate: new Date('2026-08-15'), deliveryDate: new Date('2026-12-15'),
      finYear: FIN_YEAR, totalPcs: 2000, totalValue: 800000,
      lines: [
        { styleId: styles['S-1003'].id, colourId: colours.GRN.id, sizeId: sizes.S.id, qty: 500, rate: 400 },
        { styleId: styles['S-1003'].id, colourId: colours.GRN.id, sizeId: sizes.M.id, qty: 500, rate: 400 },
        { styleId: styles['S-1003'].id, colourId: colours.BLK.id, sizeId: sizes.M.id, qty: 500, rate: 400 },
        { styleId: styles['S-1003'].id, colourId: colours.BLK.id, sizeId: sizes.L.id, qty: 500, rate: 400 },
      ],
    },
    {
      orderNo: 'SO-1004', buyerId: buyers.B002.id, styleId: styles['S-1004'].id,
      orderDate: new Date('2026-08-20'), deliveryDate: new Date('2026-12-20'),
      finYear: FIN_YEAR, totalPcs: 4000, totalValue: 2400000, status: 'in_progress',
      lines: [
        { styleId: styles['S-1004'].id, colourId: colours.WHT.id, sizeId: sizes.L.id, qty: 2000, rate: 600 },
        { styleId: styles['S-1004'].id, colourId: colours.WHT.id, sizeId: sizes.XL.id, qty: 1000, rate: 600 },
        { styleId: styles['S-1004'].id, colourId: colours.BLU.id, sizeId: sizes.L.id, qty: 1000, rate: 600 },
      ],
    },
    {
      orderNo: 'SO-1005', buyerId: buyers.B003.id, styleId: styles['S-1005'].id,
      orderDate: new Date('2026-08-25'), deliveryDate: new Date('2026-11-25'),
      finYear: FIN_YEAR, totalPcs: 1500, totalValue: 525000,
      lines: [
        { styleId: styles['S-1005'].id, colourId: colours.RED.id, sizeId: sizes.L.id, qty: 500, rate: 350 },
        { styleId: styles['S-1005'].id, colourId: colours.RED.id, sizeId: sizes.XL.id, qty: 500, rate: 350 },
        { styleId: styles['S-1005'].id, colourId: colours.BLU.id, sizeId: sizes.L.id, qty: 500, rate: 350 },
      ],
    },
  ]

  const orders: Record<string, any> = {}
  for (const o of orderDefs) {
    const { lines, ...oRest } = o
    const created = await db.order.upsert({
      where: { orderNo: o.orderNo },
      update: { ...oRest },
      create: { ...oRest },
    })
    orders[o.orderNo] = created
    for (const l of lines) {
      await db.orderLine.create({ data: { ...l, orderId: created.id } }).catch(() => {})
    }
  }

  // ── Purchase Orders ──
  const poDefs = [
    {
      poNo: 'PO-Y-001', poType: 'yarn', partyId: parties.SUP001.id, orderDate: new Date('2026-07-01'),
      deliveryDate: new Date('2026-08-01'), finYear: FIN_YEAR, totalQty: 500, totalValue: 90000,
      lines: [
        { itemType: 'yarn', itemId: yarns['Y-30COT'].id, qty: 500, receivedQty: 0, rate: 180, uomId: uoms.KG.id, amount: 90000 },
      ],
    },
    {
      poNo: 'PO-Y-002', poType: 'yarn', partyId: parties.SUP001.id, orderDate: new Date('2026-07-15'),
      deliveryDate: new Date('2026-08-15'), finYear: FIN_YEAR, totalQty: 300, totalValue: 60000,
      lines: [
        { itemType: 'yarn', itemId: yarns['Y-40COT'].id, qty: 300, receivedQty: 0, rate: 200, uomId: uoms.KG.id, amount: 60000 },
      ],
    },
    {
      poNo: 'PO-F-001', poType: 'fabric', partyId: parties.SUP002.id, orderDate: new Date('2026-07-20'),
      deliveryDate: new Date('2026-08-20'), finYear: FIN_YEAR, totalQty: 1500, totalValue: 525000, status: 'partial',
      lines: [
        { itemType: 'fabric', itemId: fabrics['F-SJ30'].id, qty: 1500, receivedQty: 1200, rate: 280, uomId: uoms.KG.id, amount: 420000, orderId: orders['SO-1001'].id },
      ],
    },
    {
      poNo: 'PO-A-001', poType: 'accessory', partyId: parties.SUP003.id, orderDate: new Date('2026-08-01'),
      deliveryDate: new Date('2026-09-01'), finYear: FIN_YEAR, totalQty: 50000, totalValue: 75000,
      lines: [
        { itemType: 'accessory', itemId: (await db.accessory.findFirst({ where: { code: 'A-BTN' } }))!.id, qty: 50000, receivedQty: 0, rate: 1.5, uomId: uoms.PCS.id, amount: 75000 },
      ],
    },
  ]
  const pos: Record<string, any> = {}
  for (const p of poDefs) {
    const { lines, ...pRest } = p
    const created = await db.purchaseOrder.upsert({
      where: { poNo: p.poNo },
      update: { ...pRest },
      create: { ...pRest },
    })
    pos[p.poNo] = created
    for (const l of lines) {
      await db.pOLine.create({ data: { ...l, poId: created.id } }).catch(() => {})
    }
  }

  // ── GRN (one already partial-received) ──
  const grnDefs = [
    {
      grnNo: 'GRN-001', grnType: 'purchase', poId: pos['PO-F-001'].id, partyId: parties.SUP002.id,
      godownId: godowns[0].id, deptId: depts.D2.id, grnDate: new Date('2026-08-22'),
      finYear: FIN_YEAR, docNo: 'DC-4521', partyDcRef: 'SUP002/DC/4521',
      totalQty: 1200, totalValue: 336000,
      lines: [
        { itemType: 'fabric', itemId: fabrics['F-SJ30'].id, lotId: lots['L-1001'].id, qty: 1200, rate: 280, uomId: uoms.KG.id, amount: 336000 },
      ],
    },
  ]
  for (const g of grnDefs) {
    const { lines, ...gRest } = g
    const existing = await db.gRN.findUnique({ where: { grnNo: g.grnNo } })
    if (existing) continue
    const created = await db.gRN.create({ data: { ...gRest } })
    for (const l of lines) {
      await db.gRNLine.create({ data: { ...l, grnId: created.id } })
    }
    // Update current stock + ledger entry
    await db.stockLedger.create({
      data: {
        txnType: 'purchase_grn',
        itemType: 'fabric',
        itemId: fabrics['F-SJ30'].id,
        lotId: lots['L-1001'].id,
        godownId: godowns[0].id,
        deptId: depts.D2.id,
        docNo: g.grnNo,
        docDate: g.grnDate,
        finYear: FIN_YEAR,
        inKgs: 1200,
        rate: 280,
        partyId: parties.SUP002.id,
        refId: created.id,
      },
    })
    await db.currentStock.upsert({
      where: {
        itemType_itemId_godownId_lotId_colourId_sizeId_deptId_orderId: {
          itemType: 'fabric', itemId: fabrics['F-SJ30'].id, godownId: godowns[0].id,
          lotId: lots['L-1001'].id, colourId: '', sizeId: '', deptId: depts.D2.id, orderId: '',
        },
      },
      update: { kgs: { increment: 1200 } },
      create: {
        itemType: 'fabric', itemId: fabrics['F-SJ30'].id, godownId: godowns[0].id,
        lotId: lots['L-1001'].id, deptId: depts.D2.id, kgs: 1200, rate: 280,
      },
    }).catch(() => {})
  }

  // ── Cut Order ──
  const cutOrderDef = {
    cutNo: 'CUT-001', orderId: orders['SO-1001'].id, cutDate: new Date('2026-09-01'),
    fabricIssued: 1100, totalPcs: 4500, status: 'cut',
    markerLength: 6.5, noOfPlies: 80, efficiency: 88.5,
  }
  const cutOrder = await db.cutOrder.upsert({
    where: { cutNo: cutOrderDef.cutNo },
    update: {},
    create: cutOrderDef,
  })
  // bundles
  for (let i = 1; i <= 10; i++) {
    const bundleNo = `CUT-001/B${i}`
    const barcode = `*CUT001B${String(i).padStart(3, '0')}*`
    await db.cutBundle.create({
      data: {
        cutOrderId: cutOrder.id, bundleNo, barcode,
        colourId: i % 2 === 0 ? colours.RED.id : colours.BLU.id,
        sizeId: i % 2 === 0 ? sizes.M.id : sizes.L.id,
        qty: 450, status: 'issued_to_sewing',
      },
    }).catch(() => {})
  }

  // ── Production entries ──
  await db.productionEntry.create({
    data: {
      orderId: orders['SO-1001'].id, deptId: depts.D4.id, prodDate: new Date('2026-09-03'),
      bundleNo: 'CUT-001/B1', operatorId: emps.E001.id, styleNo: 'S-1001',
      colourId: colours.RED.id, sizeId: sizes.M.id, qty: 450, rate: 12, amount: 5400,
      lineId: 'LINE-1',
    },
  }).catch(() => {})
  await db.productionEntry.create({
    data: {
      orderId: orders['SO-1001'].id, deptId: depts.D4.id, prodDate: new Date('2026-09-04'),
      bundleNo: 'CUT-001/B2', operatorId: emps.E002.id, styleNo: 'S-1001',
      colourId: colours.RED.id, sizeId: sizes.L.id, qty: 450, rate: 12, amount: 5400,
      lineId: 'LINE-1',
    },
  }).catch(() => {})

  // ── Sales Invoice ──
  await db.salesInvoice.create({
    data: {
      invoiceNo: 'INV-001', invoiceType: 'domestic', orderId: orders['SO-1001'].id,
      partyId: parties.CUS001.id, invoiceDate: new Date('2026-09-05'), finYear: FIN_YEAR,
      billType: 'sales', totalQty: 900, taxableValue: 225000,
      igstRate: 5, igstAmt: 11250, billAmount: 236250,
      status: 'issued',
    },
  }).catch(() => {})

  // ── Cost Sheet ──
  await db.costSheet.create({
    data: {
      orderId: orders['SO-1001'].id, version: 1,
      fabricCost: 280000, trimCost: 35000, cmCost: 180000,
      washingCost: 25000, packingCost: 15000, overheads: 45000,
      commissionPct: 3, marginPct: 12,
      totalCost: 580000, sellingPrice: 1250000,
    },
  }).catch(() => {})

  // ── Approval (pending PO) ──
  await db.approval.create({
    data: {
      entity: 'po', entityId: pos['PO-A-001'].id, step: 1,
      requestedBy: 'admin@fiberpro.local', status: 'pending',
    },
  }).catch(() => {})
  await db.approval.create({
    data: {
      entity: 'po', entityId: pos['PO-Y-002'].id, step: 1,
      requestedBy: 'admin@fiberpro.local', status: 'pending',
    },
  }).catch(() => {})

  // ── Govt Holidays ──
  const holidays = [
    { date: new Date('2026-08-15'), name: 'Independence Day' },
    { date: new Date('2026-10-02'), name: 'Gandhi Jayanti' },
    { date: new Date('2026-12-25'), name: 'Christmas' },
    { date: new Date('2027-01-26'), name: 'Republic Day' },
  ]
  for (const h of holidays) {
    await db.govtHoliday.create({ data: h }).catch(() => {})
  }

  console.log('✅ Seed complete')
  console.log('   Orders:', Object.keys(orders).length)
  console.log('   POs:', Object.keys(pos).length)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
