/**
 * SPEC-M12 C4 — E2E global fixture seeding. Runs AFTER the webServer boots
 * (Playwright starts the server first, then globalSetup) against the COPY at
 * db/e2e.db (the copy itself happens in the webServer boot command — the
 * server's first query must never race the copy).
 *
 *   DATABASE_URL=file:/home/z/my-project/db/e2e.db npx tsx scripts/e2e_global_setup.ts
 *
 * What it seeds (ALL markers are 'E2E'-prefixed — greppable, collision-free):
 *   1. admin@fiberpro.local password FORCE-SET to the fixture value (the copy
 *      is disposable; the dev DB's real password is never touched — SPEC C1)
 *   2. masters: buyer E2E-B / style E2E-S1 / colour E2E-CR / size E2E-M /
 *      party E2E-P / yarn E2E-Y / godown E2E-G
 *   3. group 'E2E Rights' (rights=['orders']) + merchandiser e2e@fiberpro.local
 *      (spec 8 — rights denial + allow control)
 *   4. business seed THROUGH THE REAL POSTING SERVICES (ADR-001 — the same
 *      door as the forms and the agent): order + invoice (bill ₹1,050, the
 *      spec-5 payment settles it exactly) + PO (whose commit auto-submits the
 *      pending Approval that spec 6 approves)
 *   5. tests/e2e/.e2e-state.json — the seeded keys the specs read
 */
import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { hashPassword } from '../src/lib/auth/password'
import { planOrder } from '../src/lib/erp/posting/order'
import { planInvoice } from '../src/lib/erp/posting/invoice'
import { planPurchaseOrder } from '../src/lib/erp/posting/purchase-order'

const db = new PrismaClient()

const ADMIN_EMAIL = 'admin@fiberpro.local'
const ADMIN_PASSWORD = 'e2eadmin123'
const RESTRICTED_EMAIL = 'e2e@fiberpro.local'
const RESTRICTED_PASSWORD = 'e2e123'
const GROUP_NAME = 'E2E Rights'

const STATE_PATH = resolve(process.cwd(), 'tests/e2e/.e2e-state.json')

async function upsertMasters() {
  // Buyer (code unique)
  const buyer =
    (await db.buyer.findUnique({ where: { code: 'E2E-B' } })) ??
    (await db.buyer.create({ data: { code: 'E2E-B', name: 'E2E Buyer' } }))

  // Style (styleNo unique)
  const style =
    (await db.style.findUnique({ where: { styleNo: 'E2E-S1' } })) ??
    (await db.style.create({ data: { styleNo: 'E2E-S1', description: 'E2E golden-path style', buyerId: buyer.id } }))

  // Colour (name + code unique)
  const colour =
    (await db.colour.findUnique({ where: { name: 'E2E Red' } })) ??
    (await db.colour.create({ data: { name: 'E2E Red', code: 'E2E-CR' } }))

  // Size (name unique)
  const size =
    (await db.size.findUnique({ where: { name: 'E2E M' } })) ??
    (await db.size.create({ data: { name: 'E2E M', sort: 900 } }))

  // Party (code unique) — supplier semantics, used for PO + invoice + payment
  const party =
    (await db.party.findUnique({ where: { code: 'E2E-P' } })) ??
    (await db.party.create({ data: { code: 'E2E-P', name: 'E2E Party', partyType: 'both' } }))

  // Yarn (code unique) — needs a UOM
  const uom = await db.uOM.findFirst()
  if (!uom) throw new Error('E2E setup: no UOM rows in the copied DB — cannot seed yarn')
  const yarn =
    (await db.yarn.findUnique({ where: { code: 'E2E-Y' } })) ??
    (await db.yarn.create({ data: { code: 'E2E-Y', count: 'E2E 30s', uomId: uom.id, rate: 180 } }))

  // Godown (code unique)
  const godown =
    (await db.godown.findUnique({ where: { code: 'E2E-G' } })) ??
    (await db.godown.create({ data: { code: 'E2E-G', name: 'E2E Godown' } }))

  return { buyer, style, colour, size, party, yarn, godown }
}

async function seedUsers() {
  // admin password FORCE-SET (disposable copy — SPEC-M12 C1)
  const admin = await db.user.findUnique({ where: { email: ADMIN_EMAIL } })
  if (!admin) throw new Error('E2E setup: admin@fiberpro.local missing from the copied DB')
  await db.user.update({
    where: { id: admin.id },
    data: { passwordHash: await hashPassword(ADMIN_PASSWORD), active: true },
  })

  // restricted merchandiser (spec 8): group allows ONLY 'orders'
  await db.user.deleteMany({ where: { email: RESTRICTED_EMAIL } }).catch(() => {})
  await db.userGroup.deleteMany({ where: { name: GROUP_NAME } }).catch(() => {})
  const group = await db.userGroup.create({ data: { name: GROUP_NAME, rights: ['orders'] } })
  await db.user.create({
    data: {
      email: RESTRICTED_EMAIL,
      name: 'E2E Restricted',
      role: 'merchandiser',
      active: true,
      userGroupId: group.id,
      passwordHash: await hashPassword(RESTRICTED_PASSWORD),
    },
  })
}

export default async function globalSetup() {
  // isolation guard (SPEC-M12 C1): refuse to seed anything that is not the
  // disposable copy. Without scripts/e2e.sh's DATABASE_URL export, Prisma
  // would resolve .env's custom.db (the DEV database) and this setup would
  // pollute it — that exact leak happened during bring-up.
  if (!process.env.DATABASE_URL?.includes('e2e.db')) {
    throw new Error(
      `E2E setup: DATABASE_URL (${process.env.DATABASE_URL ?? 'unset'}) does not point at db/e2e.db — run via scripts/e2e.sh, which exports it`,
    )
  }
  const masters = await upsertMasters()
  await seedUsers()

  // ── business seed: order → invoice (spec 5 + 7), PO + auto-Approval (spec 6)
  const orderPlan = await planOrder({
    buyerCode: masters.buyer.code,
    styleNo: masters.style.styleNo,
    deliveryDate: '2026-12-31',
    lines: [{ colourName: masters.colour.name, sizeName: masters.size.name, qty: 200, rate: 100 }],
    notes: 'E2E golden-path seed order',
  })
  if (!orderPlan.ok) throw new Error(`E2E setup: planOrder failed — ${JSON.stringify(orderPlan)}`)
  const order = await orderPlan.commit()

  // taxable ₹1,000 + 5% cgst_sgst → bill ₹1,050 (the spec-5 payment settles it exactly)
  const invoicePlan = await planInvoice({
    orderNo: order.orderNo,
    partyCode: masters.party.code,
    billType: 'sales',
    totalQty: 200,
    taxableValue: 1000,
    gstRate: 5,
    gstType: 'cgst_sgst',
  })
  if (!invoicePlan.ok) throw new Error(`E2E setup: planInvoice failed — ${JSON.stringify(invoicePlan)}`)
  const invoice = await invoicePlan.commit()

  // PO commit AUTO-SUBMITS the pending Approval (spec 6's target)
  const poPlan = await planPurchaseOrder({
    poType: 'yarn',
    partyCode: masters.party.code,
    deliveryDate: '2026-12-31',
    lines: [{ itemType: 'yarn', itemCode: masters.yarn.code, qty: 100, rate: 180 }],
    notes: 'E2E golden-path seed PO',
  })
  if (!poPlan.ok) throw new Error(`E2E setup: planPurchaseOrder failed — ${JSON.stringify(poPlan)}`)
  const po = await poPlan.commit()

  const approval = await db.approval.findFirst({
    where: { entity: 'po', entityId: po.id, status: 'pending' },
    orderBy: { createdAt: 'desc' },
  })
  if (!approval) throw new Error('E2E setup: PO commit did not auto-submit an Approval row')

  const state = {
    admin: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    restricted: { email: RESTRICTED_EMAIL, password: RESTRICTED_PASSWORD },
    buyerCode: masters.buyer.code,
    buyerName: masters.buyer.name,
    styleNo: masters.style.styleNo,
    colourName: masters.colour.name,
    sizeName: masters.size.name,
    partyCode: masters.party.code,
    partyName: masters.party.name,
    yarnCode: masters.yarn.code,
    godownCode: masters.godown.code,
    orderNo: order.orderNo,
    orderId: order.id,
    invoiceNo: invoice.invoiceNo,
    invoiceId: invoice.id,
    billAmount: invoice.billAmount,
    poNo: po.poNo,
    poId: po.id,
    approvalId: approval.id,
  }
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2))
  console.log(`[e2e-setup] OK — order ${state.orderNo}, invoice ${state.invoiceNo} (₹${state.billAmount}), PO ${state.poNo} + approval ${state.approvalId}`)
  await db.$disconnect()
}
