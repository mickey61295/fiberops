/**
 * Accounts M-05 (SPEC-M54, Module M Batch 5 — the LAST Module M item) —
 * expense heads:
 *   - EH-01 the master: ExpenseHead (legacy FrmMasExpenses port) riding the
 *     M2 engine — EXH-#### auto-code, name unique (the door's natural key),
 *     create/update factory tools + the list_expense_heads read door
 *     (tools 266→269, masters 43→44, models 91→92).
 *   - EH-02 THE HEAD REFINES, NEVER BLOCKS: head sets category + the default
 *     GL debit leg; precedence explicit glAccount > head.glAccount > the M51
 *     category default; a STALE head.glAccount falls back + the honest note
 *     (never a refusal); unknown/inactive heads refuse LOUDLY; the
 *     category-only path stays byte-identical (M51 back-compat);
 *     Expense.headId stored (relation-less, PITFALLS #21).
 *   - EH-03 budget-vs-actual finally includes expenses: expenseSpend = Σ
 *     non-cancelled Expense.amount per order (cancelled excluded — the CN-
 *     contra already nets the GL); an order with ONLY expenses appears;
 *     the register + tool json carry the addend.
 *   - Wiring pins: prompt m54, doc-config head picker, schema head field,
 *     context_check pins (269 / 44 / 92 / m54).
 * Unique M54-* namespaces, full revert.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { planExpense } from '@/lib/erp/posting/expense'
import { planCancelExpense } from '@/lib/erp/posting/cancel'
import { seedCoa } from '@/lib/erp/coa'
import { planMasterCreate } from '@/lib/erp/posting/master-service'
import { partyConfig } from '@/lib/erp/master-configs/party'
import { expenseHeadConfig } from '@/lib/erp/master-configs/expense-head'
import { MASTER_CONFIGS, getMasterConfig } from '@/lib/erp/master-configs'
import { getOrderBudgetActual, queryBudgetVsActual } from '@/lib/erp/registers/budget'
import { EXPENSE_SCHEMA } from '@/lib/erp/schemas/expense'
import { expenseConfig } from '@/lib/erp/doc-configs/expense'
import { budgetVsActualConfig } from '@/lib/erp/register-configs/budget-vs-actual'
import { allTools, getTool } from '@/lib/agent/tools'
import { PROMPT_VERSION } from '@/lib/agent/prompt'

const TS = Date.now()
const SUP = `M54-S-${TS}`
const SUP_NAME = `M54 Supplier ${TS}`
const CUST = `M54-C-${TS}`
const CUST_NAME = `M54 Customer ${TS}`
const HEAD_T = `M54 Transport Head ${TS}` // transport + glAccount '5020' (code form)
const HEAD_G = `M54 General Head ${TS}` // general, NO glAccount → category default
const HEAD_S = `M54 Stale Head ${TS}` // general + glAccount 'M54 Ghost Ledger' (unresolvable)
const HEAD_I = `M54 Inactive Head ${TS}` // transport, active false
const HEAD_SW = `M54 Stylewise Head ${TS}` // stylewise → requires orderNo
const ORD = `M54R-O-${TS}`
const STY = `M54R-S-${TS}`
const EXP1 = `EXP-M54A-${TS}` // active stylewise expense 750 (counts in the budget)
const EXP2 = `EXP-M54B-${TS}` // cancelled stylewise expense 250 (excluded)
const EXP3 = `EXP-M54C-${TS}` // the head-account walkthrough (party expense 500)
const EXP4 = `EXP-M54D-${TS}` // the stale-head fallback (200)
const ROOT = process.cwd()
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8')

let supPartyId = ''
let headTId = ''
let orderId = ''
let styleId = ''

beforeAll(async () => {
  await seedCoa(db)

  // residue hygiene
  await db.expense.deleteMany({ where: { expNo: { startsWith: 'EXP-M54' } } })
  await db.journal.deleteMany({ where: { voucherNo: { in: [`JV-${EXP1}`, `JV-${EXP2}`, `JV-${EXP3}`, `JV-${EXP4}`, `CN-JV-${EXP2}`] } } })
  await db.expenseHead.deleteMany({ where: { OR: [{ name: { startsWith: 'M54 ' } }, { code: { startsWith: 'M54' } }] } })
  await db.order.deleteMany({ where: { orderNo: ORD } })
  await db.style.deleteMany({ where: { styleNo: STY } })
  await db.party.deleteMany({ where: { code: { in: [SUP, CUST] } } })

  // the paid-to party through the real master door
  const sup = await planMasterCreate(partyConfig, { code: SUP, name: SUP_NAME, partyType: 'supplier' })
  if (!sup.ok) throw new Error(String(sup.errors))
  supPartyId = (await (sup as any).commit()).id

  // the heads through the real master door (the ExpenseHead engine)
  const mkHead = async (args: Record<string, unknown>) => {
    const plan = await planMasterCreate(expenseHeadConfig, args)
    if (!plan.ok) throw new Error(String(plan.errors))
    return (await (plan as any).commit()) as { id: string; code: string }
  }
  const t = await mkHead({ name: HEAD_T, category: 'transport', glAccount: '5020' })
  headTId = t.id
  await mkHead({ name: HEAD_G, category: 'general' })
  await mkHead({ name: HEAD_S, category: 'general', glAccount: 'M54 Ghost Ledger' })
  await mkHead({ name: HEAD_I, category: 'transport', active: false })
  await mkHead({ name: HEAD_SW, category: 'stylewise' })

  // an order with ONLY expenses booked (the budget addend door)
  const buyer = await db.buyer.findUnique({ where: { code: 'B001' } })
  const style = await db.style.create({ data: { styleNo: STY, description: `M54 style ${TS}` } })
  styleId = style.id
  const order = await db.order.create({
    data: {
      orderNo: ORD, buyerId: buyer!.id, styleId: style.id,
      orderDate: new Date(), deliveryDate: new Date('2027-03-31'),
      finYear: '26-27', status: 'open', totalPcs: 100, totalValue: 10000,
    },
  })
  orderId = order.id
})

afterAll(async () => {
  await db.expense.deleteMany({ where: { expNo: { startsWith: 'EXP-M54' } } })
  await db.journal.deleteMany({ where: { voucherNo: { in: [`JV-${EXP1}`, `JV-${EXP2}`, `JV-${EXP3}`, `JV-${EXP4}`, `CN-JV-${EXP2}`] } } })
  await db.expenseHead.deleteMany({ where: { OR: [{ name: { startsWith: 'M54 ' } }, { code: { startsWith: 'M54' } }] } })
  await db.order.deleteMany({ where: { orderNo: ORD } })
  await db.style.deleteMany({ where: { styleNo: STY } })
  await db.party.deleteMany({ where: { code: { in: [SUP, CUST] } } })
})

describe('Accounts M-05 (SPEC-M54) — expense heads', () => {
  // ───────── EH-01 the master door ─────────

  it('EH-01: the head master rides the engine — EXH-#### auto-code, name unique, the legacy form port', async () => {
    const row = await db.expenseHead.findUnique({ where: { name: HEAD_T } })
    expect(row).toBeTruthy()
    expect(row!.code).toMatch(/^EXH-\d{4}$/)
    expect(row!.category).toBe('transport')
    expect(row!.glAccount).toBe('5020')
    expect(row!.active).toBe(true)
    // duplicate name refuses (UNIQUE_TITLE — the natural key)
    const dup = await planMasterCreate(expenseHeadConfig, { name: HEAD_T, category: 'general' })
    expect(dup.ok).toBe(false)
    expect(String(dup.errors)).toContain('already exists')
  })

  // ───────── EH-02 the head drives the door ─────────

  it('EH-02 THE WALKTHROUGH: head transport+5020 → category transport, Dr Freight [5020] (the head\'s account), headId stored, party credit leg', async () => {
    const p = await planExpense({ head: HEAD_T, partyCode: SUP, amount: 500, narration: 'm54 head-account walkthrough', expNo: EXP3 })
    expect(p.ok).toBe(true)
    expect(p.creates!.length).toBe(2) // expense + companion journal
    const exp = p.creates!.find((c) => c.table === 'expense')!.data as any
    expect(exp.category).toBe('transport') // FROM THE HEAD
    expect(exp.headId).toBe(headTId)
    const jv = p.creates!.find((c) => c.table === 'journal')!.data as any
    expect(jv.debitAccount).toBe('Freight') // the head's 5020 resolved
    expect(jv.creditAccount).toBe(SUP_NAME) // the party leg's string
    expect(jv.debitAccountId).toBeTruthy()
    expect(p.summary).toContain(`head ${HEAD_T}`)
    expect(p.summary).toContain('(from the head)')
    expect(p.text).toContain(`head ${HEAD_T}`)
    const r = await (p as any).commit()
    expect(r.expNo).toBe(EXP3)
    expect(r.journalVoucherNo).toBe(`JV-${EXP3}`)
    const stored = await db.expense.findUnique({ where: { expNo: EXP3 } })
    expect(stored!.headId).toBe(headTId)
    expect(stored!.category).toBe('transport')
    const companion = await db.journal.findUnique({ where: { voucherNo: `JV-${EXP3}` } })
    expect(companion!.debitAccount).toBe('Freight')
    expect(companion!.debitAccountId).toBeTruthy()
    expect(companion!.narration).toContain(HEAD_T)
  })

  it('EH-02: head without glAccount → the category default (Other Expenses), no head account claimed', async () => {
    const p = await planExpense({ head: HEAD_G, amount: 300 })
    expect(p.ok).toBe(true)
    const jv = p.creates!.find((c) => c.table === 'journal')!.data as any
    expect(jv.debitAccount).toBe('Other Expenses')
    expect(jv.creditAccount).toBe('Cash/Bank')
    expect((p.creates!.find((c) => c.table === 'expense')!.data as any).category).toBe('general')
    expect(p.summary).not.toContain('(from the head)') // no head account claimed
  })

  it('EH-02: explicit glAccount BEATS the head (the precedence pin)', async () => {
    const p = await planExpense({ head: HEAD_T, amount: 120, glAccount: 'Other Expenses' })
    expect(p.ok).toBe(true)
    const jv = p.creates!.find((c) => c.table === 'journal')!.data as any
    expect(jv.debitAccount).toBe('Other Expenses') // explicit wins over the head's 5020
    expect(p.summary).toContain('(explicit)')
  })

  it('EH-02: STALE head.glAccount → the category default + the honest note (never a refusal)', async () => {
    const p = await planExpense({ head: HEAD_S, amount: 200, expNo: EXP4 })
    expect(p.ok).toBe(true) // THE HEAD REFINES, NEVER BLOCKS
    const jv = p.creates!.find((c) => c.table === 'journal')!.data as any
    expect(jv.debitAccount).toBe('Other Expenses') // the general-category default
    expect(p.text).toContain("glAccount 'M54 Ghost Ledger' is not in the chart")
    await (p as any).commit()
  })

  it('EH-02: a differing passed category is OVERRIDDEN by the head + noted', async () => {
    const p = await planExpense({ head: HEAD_T, category: 'general', amount: 90 })
    expect(p.ok).toBe(true)
    const exp = p.creates!.find((c) => c.table === 'expense')!.data as any
    expect(exp.category).toBe('transport') // the head wins
    expect(p.text).toContain("the passed 'general' is overridden")
  })

  it('EH-02: unknown head = LOUD refusal naming the door (no row, nothing written)', async () => {
    const before = await db.expense.count()
    const p = await planExpense({ head: 'M54 Ghost Head', amount: 100 })
    expect(p.ok).toBe(false)
    expect(p.error).toContain('not found')
    expect(p.error).toContain('create_expense_head')
    expect(await db.expense.count()).toBe(before)
  })

  it('EH-02: inactive head = the reactivation-hint refusal', async () => {
    const p = await planExpense({ head: HEAD_I, amount: 100 })
    expect(p.ok).toBe(false)
    expect(p.error).toContain('inactive')
    expect(p.error).toContain('update_expense_head')
  })

  it('EH-02: neither head nor category = the honest requirement error', async () => {
    const p = await planExpense({ amount: 100 } as any)
    expect(p.ok).toBe(false)
    expect(p.error).toContain('category is required when no head is given')
  })

  it('EH-02 M51 BACK-COMPAT: the category-only path is byte-identical (no head field → no headId)', async () => {
    const p = await planExpense({ category: 'transport', amount: 100 })
    expect(p.ok).toBe(true)
    const jv = p.creates!.find((c) => c.table === 'journal')!.data as any
    expect(jv.debitAccount).toBe('Freight') // the M51 default, unchanged
    const exp = p.creates!.find((c) => c.table === 'expense')!.data as any
    expect(exp.category).toBe('transport')
    expect(exp.headId ?? null).toBeNull()
    expect(p.text).toMatch(/^Proposed expense EXP-\d{4} — ₹100 \(transport\)\.$/) // byte-identical shape
  })

  it('EH-02: stylewise-via-head follows the RESOLVED category (order required + stored)', async () => {
    const noOrder = await planExpense({ head: HEAD_SW, amount: 100 })
    expect(noOrder.ok).toBe(false)
    expect(noOrder.error).toContain('A stylewise expense needs an orderNo')
    // the budget addend door: active 750 + to-be-cancelled 250
    const p1 = await planExpense({ head: HEAD_SW, orderNo: ORD, amount: 750, expNo: EXP1, partyCode: SUP })
    expect(p1.ok).toBe(true)
    await (p1 as any).commit()
    const p2 = await planExpense({ head: HEAD_SW, orderNo: ORD, amount: 250, expNo: EXP2 })
    expect(p2.ok).toBe(true)
    await (p2 as any).commit()
    const stored = await db.expense.findUnique({ where: { expNo: EXP1 } })
    expect(stored!.orderId).toBe(orderId)
    expect(stored!.category).toBe('stylewise')
  })

  // ───────── EH-03 budget-vs-actual includes expenses ─────────

  it('EH-03: the expense addend — active counts, CANCELLED excluded (the CN- contra already nets the GL)', async () => {
    // cancel EXP2 through the REAL door (doc + companion flip + CN- contra)
    const c = await planCancelExpense({ expNo: EXP2, reason: 'm54 budget addend test' })
    expect(c.ok).toBe(true)
    await (c as any).commit()
    const flipped = await db.expense.findUnique({ where: { expNo: EXP2 } })
    expect(flipped!.status).toBe('cancelled')

    const r = await getOrderBudgetActual(orderId)
    expect(r).toBeTruthy()
    expect(r!.poValue).toBe(0)
    expect(r!.prodCost).toBe(0)
    expect(r!.expenseSpend).toBe(750) // EXP1 only — EXP2 is cancelled
    expect(r!.actual).toBe(750)
    expect(r!.variance).toBe(-750) // budgeted 0 (no budget rows) — honest
  })

  it('EH-03: the register row + the only-expense order appears; the tool json carries expenseSpend', async () => {
    // single-order branch (the row carries BOTH keys: expenseSpend + expense)
    const single = await queryBudgetVsActual({ order: ORD, limit: 10, page: 1 } as any)
    const row = single.rows[0] as any
    expect(row).toBeTruthy()
    expect(row.expense).toBe(750)
    expect(row.actual).toBe(750)
    expect(single.totals.find((t) => t.label === 'Expenses')!.value).toBe(750)

    // the aggregate branch: an order with ONLY expenses shows in the list
    const all = await queryBudgetVsActual({ page: 1, limit: 500 } as any)
    const listed = all.rows.find((r2: any) => r2.orderNo === ORD) as any
    expect(listed).toBeTruthy()
    expect(listed.expense).toBe(750)

    // the agent tool delegates the same math
    const tool = getTool('get_budget_vs_actual')!
    expect(tool.isWrite).toBe(false)
    const res: any = await tool.execute({ orderNo: ORD })
    expect(res.json.actual.expenseSpend).toBe(750)
    expect(res.json.actual.total).toBe(750)
    expect(res.text).toContain('expenses 750')
  })

  // ───────── wiring pins ─────────

  it('WIRING: tools 266→269 (the trio), masters 43→44, the list door read-only + live', async () => {
    expect(allTools.length).toBe(271)
    const create = getTool('create_expense_head')
    expect(create).toBeDefined()
    expect(create!.isWrite).toBe(true)
    expect(getTool('update_expense_head')!.isWrite).toBe(true)
    const list = getTool('list_expense_heads')
    expect(list).toBeDefined()
    expect(list!.isWrite).toBe(false)
    const res: any = await list!.execute({})
    const rows = res.json as Array<{ name: string; category: string; glAccount: string | null; active: boolean }>
    const t = rows.find((r2) => r2.name === HEAD_T)
    expect(t).toBeTruthy()
    expect(t!.category).toBe('transport')
    expect(t!.glAccount).toBe('5020')
    expect(MASTER_CONFIGS.length).toBe(44)
    const cfg = getMasterConfig('expense-head')
    expect(cfg).toBeDefined()
    expect(cfg!.codePrefix).toBe('EXH-')
    expect(cfg!.legacyForms).toContain('FrmMasExpenses')
    expect(cfg!.createTool).toBe('create_expense_head')
  })

  it('WIRING: the schema carries head; the form carries the head picker + the category hint; the budget config gains the expense column', () => {
    expect(Object.keys((EXPENSE_SCHEMA as any).shape)).toContain('head')
    expect(EXPENSE_SCHEMA.shape.head.description).toContain('ExpenseHead')
    const headField = expenseConfig.headerFields.find((f) => f.name === 'head')!
    expect(headField.picker).toBe('expense-head')
    const catField = expenseConfig.headerFields.find((f) => f.name === 'category')!
    expect(catField.required).toBeFalsy()
    expect(expenseConfig.listColumns.some((c) => c.name === 'headName')).toBe(true)
    expect(budgetVsActualConfig.columns.some((c) => c.name === 'expense' && c.label === 'Expenses')).toBe(true)
    expect(budgetVsActualConfig.description).toContain('expenses')
    const regSvc = src('src/lib/erp/registers/budget.ts')
    expect(regSvc).toContain('expenseSpend')
    expect(regSvc).toContain("status: { not: 'cancelled' }")
  })

  it('WIRING: PROMPT_VERSION m54 + the prompt lines + context_check pins', () => {
    expect(PROMPT_VERSION).toBe('m55-2026-09-08')
    const prompt = src('src/lib/agent/prompt.ts')
    expect(prompt).toContain('create_expense_head')
    expect(prompt).toContain('never blocks') // the M54 doctrine rides the body; the version comment is M55's now
    expect(prompt).toContain('post_shift_wages') // M55 L-06 rides the version comment
    expect(prompt).toContain('PO + production + expenses')
    const cc = src('scripts/context_check.sh')
    expect(cc).toContain('"271"')
    expect(cc).toContain('"92"')
    expect(cc).toContain('"44"')
    expect(cc).toContain('m55-2026-09-08')
    const schema = src('prisma/schema.prisma')
    expect(schema).toContain('model ExpenseHead')
    expect(schema).toContain('headId    String?')
  })
})
