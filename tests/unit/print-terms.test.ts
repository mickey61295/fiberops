/**
 * SPEC-M34 — the frmTerms master, print edition: AppOption
 * `print.terms.invoice` feeds the invoice print's terms block. Owned terms
 * REPLACE the hardcoded fallback; absent option → the fallback stays.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { printTerms, fetchInvoicePrint } from '@/lib/erp/print/fetchers'
import { allTools } from '@/lib/agent/tools'
import { db } from '@/lib/db'

const TS = String(Date.now()).slice(-8)
const INVOICE_NO = `M34-INV-${TS}`
const KEY = 'print.terms.invoice'
let partyId = ''
let invoiceId = ''

const TERMS = [
  'Goods once sold will not be taken back.',
  'Interest at 18% p.a. on overdue payments.',
  'Subject to Tirupur jurisdiction only.',
]

describe('SPEC-M34 — printTerms (the helper)', () => {
  beforeAll(async () => {
    await db.appOption.deleteMany({ where: { key: KEY } }).catch(() => {})
  })
  afterAll(async () => {
    await db.appOption.deleteMany({ where: { key: KEY } }).catch(() => {})
  })

  it('absent key → [] (the caller keeps its fallback)', async () => {
    expect(await printTerms('invoice')).toEqual([])
  })

  it('single line → [line]', async () => {
    await db.appOption.create({ data: { key: KEY, value: 'One line of terms.', label: 'Invoice Terms & Conditions', group: 'print' } })
    expect(await printTerms('invoice')).toEqual(['One line of terms.'])
    await db.appOption.deleteMany({ where: { key: KEY } })
  })

  it('multi-line with blanks → blanks dropped, lines trimmed', async () => {
    await db.appOption.create({
      data: { key: KEY, value: `  ${TERMS[0]}  \n\n${TERMS[1]}\n   \n${TERMS[2]}\n`, label: 'Invoice Terms & Conditions', group: 'print' },
    })
    expect(await printTerms('invoice')).toEqual(TERMS)
    await db.appOption.deleteMany({ where: { key: KEY } })
  })

  it('whitespace-only value → [] (honest empty)', async () => {
    await db.appOption.create({ data: { key: KEY, value: ' \n\t \n', label: 'x', group: 'print' } })
    expect(await printTerms('invoice')).toEqual([])
    await db.appOption.deleteMany({ where: { key: KEY } })
  })

  it('unknown family → [] (independent keys)', async () => {
    expect(await printTerms('po')).toEqual([])
  })
})

describe('SPEC-M34 — the invoice print terms block', () => {
  beforeAll(async () => {
    const party = await db.party.create({
      data: { code: `M34P-${TS}`, name: `M34 Party ${TS}`, partyType: 'customer', state: 'Tamil Nadu' },
    })
    partyId = party.id
    const inv = await db.salesInvoice.create({
      data: { invoiceNo: INVOICE_NO, partyId, invoiceDate: new Date(), finYear: '26-27', billAmount: 100000, status: 'issued' },
    })
    invoiceId = inv.id
  })

  afterAll(async () => {
    await db.appOption.deleteMany({ where: { key: KEY } }).catch(() => {})
    await db.salesInvoice.deleteMany({ where: { id: invoiceId } }).catch(() => {})
    await db.party.deleteMany({ where: { id: partyId } }).catch(() => {})
    await db.$disconnect()
  })

  it('WITHOUT the option: the hardcoded fallback prints (fresh installs are never term-less)', async () => {
    await db.appOption.deleteMany({ where: { key: KEY } })
    const doc = await fetchInvoicePrint(INVOICE_NO)
    expect(doc).not.toBeNull()
    expect(doc!.notes).toContain('Goods once sold will not be taken back. Subject to Tirupur jurisdiction.')
  })

  it('WITH the option: the owned terms lines REPLACE the fallback', async () => {
    await db.appOption.upsert({
      where: { key: KEY },
      create: { key: KEY, value: TERMS.join('\n'), label: 'Invoice Terms & Conditions', group: 'print' },
      update: { value: TERMS.join('\n') },
    })
    const doc = await fetchInvoicePrint(INVOICE_NO)
    expect(doc).not.toBeNull()
    for (const line of TERMS) expect(doc!.notes).toContain(line)
    expect(doc!.notes).not.toContain('Goods once sold will not be taken back. Subject to Tirupur jurisdiction.')
  })

  it('the agent door: update_app_option flips the block end-to-end (chat-editable master)', async () => {
    const tool = allTools.find((t) => t.name === 'update_app_option')
    expect(tool).toBeDefined()
    // set two lines via the agent tool (plan → commit, the two-phase ritual)…
    const set = await tool!.execute({ key: KEY, value: 'Agent line one.\nAgent line two.' })
    expect(JSON.stringify(set)).not.toContain('not found')
    expect(typeof (set as { commit?: () => Promise<unknown> }).commit).toBe('function')
    await (set as { commit: () => Promise<unknown> }).commit()
    let doc = await fetchInvoicePrint(INVOICE_NO)
    expect(doc!.notes).toContain('Agent line one.')
    expect(doc!.notes).toContain('Agent line two.')
    // …then flip to a different block (the service treats empty values as
    // "field not provided" — clearing to fallback happens by DELETING the
    // option row, covered by the WITHOUT test above)
    const flip = await tool!.execute({ key: KEY, value: 'Agent replacement line.' })
    await (flip as { commit: () => Promise<unknown> }).commit()
    doc = await fetchInvoicePrint(INVOICE_NO)
    expect(doc!.notes).toContain('Agent replacement line.')
    expect(doc!.notes).not.toContain('Agent line one.')
  })
})

describe('SPEC-M34 — surface source pins', () => {
  const read = (p: string) => readFileSync(join(__dirname, '../..', p), 'utf8')

  it('the invoice fetcher wires printTerms with the fallback constant', () => {
    const src = read('src/lib/erp/print/fetchers.ts')
    expect(src).toContain("printTerms('invoice')")
    expect(src).toContain('DEFAULT_TERMS_FALLBACK')
    expect(src).toContain('terms.length > 0 ? terms : [DEFAULT_TERMS_FALLBACK]')
  })

  it('the /admin/options page mentions print.terms.invoice', () => {
    const src = read('src/app/(erp)/admin/options/page.tsx')
    expect(src).toContain('print.terms.invoice')
    expect(src).toContain('frmTerms')
  })

  it('the helper is exported for the other families to adopt (po/dc OUT, documented)', () => {
    const src = read('src/lib/erp/print/fetchers.ts')
    expect(src).toContain('export async function printTerms')
  })
})
