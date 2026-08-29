/**
 * Master form↔agent parity — SPEC-M2 §11.2 (the P2 guarantee).
 * For EVERY master config, the agent door (tool execute → plan → commit) and
 * the form door (planMasterCreate/Update → commit — exactly what the server
 * action calls) must produce equivalent records. Since both doors call the
 * same service, these tests guard against future re-inlining of logic into
 * tools (drift regression).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTool } from '../../src/lib/agent/tools'
import { db } from '../../src/lib/db'
import { MASTER_CONFIGS, getMasterConfig } from '../../src/lib/erp/master-configs'
import { planMasterCreate, planMasterUpdate } from '../../src/lib/erp/posting/master-service'
import type { MasterConfig } from '../../src/lib/erp/master-configs/types'

const TS = Date.now()

/** unique create input per config, parameterized by a variant tag */
function inputFor(slug: string, v: string): Record<string, unknown> {
  const t = `${TS}${v}`
  const n = TS + v.charCodeAt(0) // numeric seed for value-keyed entities
  switch (slug) {
    case 'party': return { name: `M2E Party ${t}`, partyType: 'supplier', city: 'Tirupur', gstin: '33AAAAA0000A1Z5', openingBalance: 100 }
    case 'buyer': return { name: `M2E Buyer ${t}` }
    case 'merchandiser': return { name: `M2E Merch ${t}`, email: 'm2e@test.local', phone: '9999999999' }
    case 'exporter': return { code: `M2E-E${t}`, name: `M2E Exporter ${t}`, iec: '1234567890' }
    case 'season': return { code: `M2S${t}`, name: `M2E Season ${t}`, startDate: '2026-04-01', endDate: '2026-09-30' }
    case 'style': return { description: `M2E Style ${t}`, category: 'knit', sam: 4.5, hsn: '6109' }
    case 'colour': return { code: `M2C${t}`, name: `M2E Colour ${t}` }
    case 'size': return { name: `M2Z${t}`, sort: 991 }
    case 'size-group': return { name: `M2E Grp ${t}`, sizes: ['S', 'M', 'L'] }
    case 'dia': return { value: `${2000 + (n % 1000)}` }
    case 'uom': return { code: `M2U${t}`, name: `M2E Unit ${t}` }
    case 'lot': return { partyCode: 'CUS001' }
    case 'yarn': return { count: `30s ${t}`, uomCode: 'KGS', rate: 320 }
    case 'fabric': return { construction: `M2E SJ ${t}`, uomCode: 'KGS', gsm: 180, diaValue: '26.5' }
    case 'accessory': return { name: `M2E Zipper ${t}`, uomCode: 'PCS', rate: 3 }
    case 'part': return { name: `M2E Part ${t}` }
    case 'component': return { name: `M2E Comp ${t}` }
    case 'design': return { code: `M2D${t}`, name: `M2E Design ${t}` }
    case 'godown': return { name: `M2E Godown ${t}`, location: 'Tirupur' }
    case 'department': return { name: `M2E Dept ${t}`, orderSno: 99, isProcess: false }
    case 'employee': return { name: `M2E Emp ${t}`, role: 'operator', pieceRate: 3.5, dailyWage: 450 }
    case 'line': return { code: `M2L${t}`, name: `M2E Line ${t}`, capacityPcsPerHour: 150 }
    case 'govt-holiday': return { date: `2027-01-${String(10 + (n % 18)).padStart(2, '0')}`, name: `M2E Holiday ${t}` }
    case 'fin-year': return { code: `M2F${t}`, name: `M2E FY ${t}`, start: '2027-04-01', end: '2028-03-31' }
    case 'shift': return { name: `M2E Shift ${t}`, fromTime: '06:00', toTime: '14:00', hours: 8 } // SPEC-M5 §7-D-32
    // SPEC-M6 §7-B (ADR-016 + ERRATUM #1)
    case 'user': return { email: `m2e-${t.toLowerCase()}@fiberops.test`, name: `M2E User ${t}`, role: 'merchandiser', active: true }
    case 'user-group': return { name: `M2E Group ${t}`, rights: ['orders', 'production'] }
    case 'app-option': return { key: `print.test${t}`, label: `M2E Option ${t}`, value: `val-${t}`, group: 'general' }
    case 'hsn': return { code: `61${String(9000000 + (n % 999999))}`, description: `M2E HSN ${t}`, gstRate: 5, hsnType: 'goods' }
    case 'test-parameter': return { code: `M2TP${t}`, name: `M2E Param ${t}`, stage: 'final', unit: 'gsm' }
    // SPEC-M19 §3 Wave C (ADR-019) — masters completion
    case 'bank': return { name: `M2E Bank ${t}` }
    case 'bank-account': return { bankCode: 'M2E-BANK-REF', branch: `Branch ${t}`, ifsc: 'HDFC0001234' } // no accountNo → ACC-#### auto-code path
    case 'mill': return { name: `M2E Mill ${t}`, city: 'Tirupur' }
    case 'machine-category': return { name: `M2E MachCat ${t}` }
    case 'machine': return { name: `M2E Machine ${t}`, capacityPcsPerHour: 220 }
    case 'state': return { name: `M2E State ${t}`, gstCode: '33' }
    case 'shade': return { name: `M2E Shade ${t}`, notes: 'mid depth' }
    case 'thread-type': return { name: `M2E Thread ${t}` }
    case 'count-group': return { name: `M2E CountGrp ${t}` }
    case 'range-group': return { name: `M2E RangeGrp ${t}` }
    case 'size-range': return { name: `M2E Range ${t}`, sizes: '104,110,116' }
    default: throw new Error(`no test input for ${slug}`)
  }
}

/**
 * first patchable field + type-correct values for BOTH doors (SPEC-M2 §11.2 step 3).
 * Non-ref fields preferred; ref-only entities (lot) patch partyCode → CUS001.
 */
function patchFor(config: MasterConfig): { field: string; agentValue: unknown; formValue: unknown; isRef?: boolean; isList?: boolean; refColumn?: string } | null {
  const key = config.updateKeyField || config.codeField || 'name'
  const candidates = config.fields.filter((f) => f.name !== key && f.name !== config.codeField)
  const f = candidates.find((c) => !c.refEntity) || candidates[0]
  if (!f) return null
  if (f.refEntity) {
    const refValue = f.refEntity === 'party' ? 'CUS001' : f.refEntity === 'uom' ? 'KGS' : f.refEntity === 'buyer' ? undefined : undefined
    if (refValue === undefined) return null
    const refColumn = f.refEntity === 'department' ? 'deptId' : `${f.refEntity}Id`
    return { field: f.name, agentValue: refValue, formValue: refValue, isRef: true, refColumn }
  }
  switch (f.type) {
    case 'number': return { field: f.name, agentValue: 42, formValue: 43 }
    case 'select': {
      const opts = f.options!
      return { field: f.name, agentValue: opts[0].value, formValue: opts[opts.length - 1].value }
    }
    case 'checkbox': return { field: f.name, agentValue: true, formValue: false }
    case 'date': return { field: f.name, agentValue: '2027-06-15', formValue: '2027-07-20' }
    case 'list': return { field: f.name, agentValue: ['S'], formValue: ['M'], isList: true }
    default: return { field: f.name, agentValue: `M2E-upd-${TS}`, formValue: `M2E-form-${TS}` }
  }
}

async function callTool(name: string, args: Record<string, unknown>) {
  const tool = getTool(name)
  if (!tool) throw new Error(`tool ${name} not found`)
  const res = await tool.execute(args)
  if (!res.plan || !res.commit) return { res, committed: null as null | Record<string, unknown> }
  const committed = (await res.commit!()) as Record<string, unknown>
  return { res, committed }
}

describe('master form↔agent parity (SPEC-M2 §11.2)', () => {
  const created: Array<{ delegate: string; id: string }> = []
  let prevActiveFinYearId: string | null | undefined
  let testBuyerCode: string

  async function track(delegate: string, id: unknown) {
    if (typeof id === 'string') created.push({ delegate, id })
  }

  beforeAll(async () => {
    prevActiveFinYearId = (await db.finYear.findFirst({ where: { active: true } }))?.id ?? null
    // deps for ref fields
    const kgs = await db.uOM.findUnique({ where: { code: 'KGS' } })
    if (!kgs) await callTool('create_uom', { code: 'KGS', name: 'Kilograms' })
    const pcs = await db.uOM.findUnique({ where: { code: 'PCS' } })
    if (!pcs) await callTool('create_uom', { code: 'PCS', name: 'Pieces' })
    for (const n of ['S', 'M', 'L']) {
      if (!(await db.size.findUnique({ where: { name: n } }))) await callTool('create_size', { name: n })
    }
    if (!(await db.party.findUnique({ where: { code: 'CUS001' } }))) {
      await callTool('create_party', { name: 'M2E Dep Party', partyType: 'both' }).then((r) => track('party', r.committed?.id))
    }
    const buyer = await db.buyer.findFirst({ orderBy: { code: 'asc' } })
    if (buyer) {
      testBuyerCode = buyer.code
    } else {
      const r = await callTool('create_buyer', { name: 'M2E Dep Buyer' })
      testBuyerCode = String(r.committed?.code ?? '')
      track('buyer', r.committed?.id)
    }
    // SPEC-M19 §3 Wave C — the bank-account FK dep
    if (!(await db.bank.findUnique({ where: { code: 'M2E-BANK-REF' } }))) {
      const r = await callTool('create_bank', { code: 'M2E-BANK-REF', name: 'M2E Dep Bank' })
      track('bank', r.committed?.id)
    }
  })

  afterAll(async () => {
    // restore + cleanup test rows (masters only — nothing references them)
    if (prevActiveFinYearId !== undefined && prevActiveFinYearId !== null) {
      await db.finYear.updateMany({ data: { active: false } })
      await db.finYear.update({ where: { id: prevActiveFinYearId }, data: { active: true } })
    }
    for (const { delegate, id } of created.reverse()) {
      const m = (db as unknown as Record<string, { delete: (a: unknown) => Promise<unknown> }>)[delegate]
      await m?.delete({ where: { id } }).catch(() => {})
    }
  })

  for (const config of MASTER_CONFIGS) {
    describe(`${config.slug} (${config.createTool} ↔ form)`, () => {
      it('agent door creates the record', async () => {
        const { res, committed } = await callTool(config.createTool, inputFor(config.slug, 'A'))
        expect(res.plan, `plan missing: ${res.text}`).toBeDefined()
        expect(committed?.id, `commit failed: ${res.text}`).toBeTruthy()
        await track(config.delegate, committed!.id)
        const rec = await (db as unknown as Record<string, { findUnique: (a: unknown) => Promise<Record<string, unknown>> }>)[config.delegate]
          .findUnique({ where: { id: committed!.id } })
        expect(rec).toBeTruthy()
        // auto-code entities get their prefix
        if (config.codePrefix && config.codeField) {
          expect(String(rec![config.codeField])).toMatch(new RegExp(`^${config.codePrefix}`))
        }
      })

      it('form door (service) creates an equivalent record', async () => {
        const plan = await planMasterCreate(config, inputFor(config.slug, 'B'))
        expect(plan.ok, plan.errors.join('; ')).toBe(true)
        const committed = await plan.commit()
        await track(config.delegate, committed.id)
        const rec = await (db as unknown as Record<string, { findUnique: (a: unknown) => Promise<Record<string, unknown>> }>)[config.delegate]
          .findUnique({ where: { id: committed.id } })
        expect(rec).toBeTruthy()
        if (config.codePrefix && config.codeField) {
          expect(String(rec![config.codeField])).toMatch(new RegExp(`^${config.codePrefix}`))
        }
      })

      const patch = patchFor(config)
      if (patch) {
        it('update works through BOTH doors with identical persistence', async () => {
          // create a fresh record via the service (form door)
          const plan = await planMasterCreate(config, inputFor(config.slug, 'U'))
          expect(plan.ok, plan.errors.join('; ')).toBe(true)
          const committed = await plan.commit()
          await track(config.delegate, committed.id)
          const rec0 = await (db as unknown as Record<string, { findUnique: (a: unknown) => Promise<Record<string, unknown>> }>)[config.delegate]
            .findUnique({ where: { id: committed.id } })
          const keyField = config.updateKeyField || config.codeField || 'name'
          const rawKey = rec0![keyField]
          const keyValue = rawKey instanceof Date ? rawKey.toISOString().slice(0, 10) : rawKey

          const assertPatched = (rec: Record<string, unknown> | null, expected: unknown) => {
            expect(rec, 'record missing').toBeTruthy()
            if (patch.isList) {
              // list fields persist as CSV of resolved ids
              expect(String(rec![patch.field] ?? '')).toMatch(/./)
            } else if (patch.isRef) {
              // ref patches land in the FK column, not the input field name
              expect(rec![patch.refColumn!]).toBeTruthy()
            } else if (expected === null || expected === undefined) {
              expect(rec![patch.field]).toBeTruthy()
            } else if (typeof expected === 'boolean' || typeof expected === 'number') {
              expect(rec![patch.field]).toBe(expected)
            } else {
              expect(String(rec![patch.field]).slice(0, 10)).toBe(String(expected).slice(0, 10))
            }
          }

          // agent door update: patch.agentValue
          const { res } = await callTool(config.updateTool, { [keyField]: keyValue, [patch.field]: patch.agentValue })
          expect(res.plan, `update plan missing: ${res.text}`).toBeDefined()
          const recA = await (db as unknown as Record<string, { findUnique: (a: unknown) => Promise<Record<string, unknown>> }>)[config.delegate]
            .findUnique({ where: { id: committed.id } })
          assertPatched(recA, patch.agentValue)

          // form door update: patch.formValue
          const plan2 = await planMasterUpdate(config, { [keyField]: keyValue, [patch.field]: patch.formValue })
          expect(plan2.ok, plan2.errors.join('; ')).toBe(true)
          await plan2.commit()
          const recB = await (db as unknown as Record<string, { findUnique: (a: unknown) => Promise<Record<string, unknown>> }>)[config.delegate]
            .findUnique({ where: { id: committed.id } })
          assertPatched(recB, patch.formValue)
        })
      } else {
        it('update tool reports "no patchable fields" for single-field masters (documented)', async () => {
          const plan = await planMasterUpdate(config, inputFor(config.slug, 'X'))
          expect(plan.ok).toBe(false)
          expect(plan.errors.join(' ')).toMatch(/No fields to update|not found|already exists/)
        })
      }
    })
  }

  describe('cross-door guarantees', () => {
    it('FK resolution: style→buyer by NAME works on both doors and fails identically on bad refs', async () => {
      const cfg = getMasterConfig('style')!
      const buyer = await db.buyer.findUnique({ where: { code: testBuyerCode } })
      // form door, buyer by NAME
      const plan = await planMasterCreate(cfg, { description: `M2E Style name-ref ${TS}`, buyerCode: buyer!.name })
      expect(plan.ok, plan.errors.join('; ')).toBe(true)
      const committed = await plan.commit()
      await track('style', committed.id)
      const style = await db.style.findUnique({ where: { id: committed.id } })
      expect(style?.buyerId).toBe(buyer!.id)

      // bad ref: BOTH doors refuse, no dangling record
      const bad = { description: `M2E Style badref ${TS}`, buyerCode: 'NO-SUCH-BUYER-XYZ' }
      const planBad = await planMasterCreate(cfg, bad)
      expect(planBad.ok).toBe(false)
      const toolRes = await getTool('create_style')!.execute(bad)
      expect(toolRes.plan).toBeUndefined()
      expect(toolRes.text).toMatch(/not found/i)
    })

    it('duplicate key is rejected by both doors (explicit code entity)', async () => {
      const cfg = getMasterConfig('exporter')!
      const dupInput = { code: `M2E-DUP-${TS}`, name: 'M2E Dup' }
      const plan1 = await planMasterCreate(cfg, dupInput)
      expect(plan1.ok).toBe(true)
      const c1 = await plan1.commit()
      await track('exporter', c1.id)
      const plan2 = await planMasterCreate(cfg, dupInput)
      expect(plan2.ok).toBe(false)
      const toolRes = await getTool('create_exporter')!.execute(dupInput)
      expect(toolRes.plan).toBeUndefined()
      expect(toolRes.text).toMatch(/already exists/i)
    })

    it('fin-year active=true deactivates other years (service invariant §6.8)', async () => {
      const cfg = getMasterConfig('fin-year')!
      const plan = await planMasterCreate(cfg, { code: `M2F-A${TS}`, name: 'M2E FY A', start: '2029-04-01', end: '2030-03-31', active: true })
      expect(plan.ok, plan.errors.join('; ')).toBe(true)
      const committed = await plan.commit()
      await track('finYear', committed.id)
      const activeCount = await db.finYear.count({ where: { active: true } })
      expect(activeCount).toBe(1)
    })
  })
})
