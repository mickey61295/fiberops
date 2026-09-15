/**
 * SPEC-M61 H1 — E-8.3 golden thread #1: the buyer incident, replayed at
 * planner level (harness-threads).
 *
 * The 2026-09-14 conversation that motivated the whole spec: "list the
 * buyers" → "Add random merchandiser to each buyer" → the agent claimed no
 * edit path existed, called create_buyer with the TAKEN code B-0001, the
 * server silently renumbered to B-0003, the plan was approved, and a
 * duplicate "LPP SA" became real data.
 *
 * This suite rebuilds the incident's world (seed-shaped fixture) and walks
 * the same turns through TODAY's planner surface, asserting the failure is
 * structurally impossible now:
 *   - update_buyer EXISTS in the registry (no absence-claim path possible)
 *   - the bulk ask yields N update plans and ZERO create plans
 *   - the taken-code create REFUSES (E-3.1) — no renumber, no card
 *   - the corrective update plans cleanly with before-values (E-3.6)
 *
 * The H1 acceptance test: the incident cannot recur verbatim.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTool } from '@/lib/agent/tools'
import { db } from '@/lib/db'
import { getMasterConfig } from '@/lib/erp/master-configs'
import { listMasters, planMasterCreate, planMasterUpdate } from '@/lib/erp/posting/master-service'

const TS = Date.now()
const created: string[] = [] // buyer ids for residue-free cleanup

const INCIDENT_CODE = 'B-9001' // a taken code in the fixture world (unique per run prefix)
const INCIDENT_NAME = `LPP SA ${TS}` // the name the incident duplicated

describe('golden thread #1 — the buyer incident (planner level)', () => {
  beforeAll(async () => {
    // the incident world: a buyer exists under a known code and name
    const cfg = getMasterConfig('buyer')!
    const plan = await planMasterCreate(cfg, { code: INCIDENT_CODE, name: INCIDENT_NAME })
    expect(plan.ok, plan.errors.join('; ')).toBe(true)
    const out = await plan.commit()
    created.push(out.id)
  })

  afterAll(async () => {
    for (const id of created.reverse()) {
      await db.buyer.delete({ where: { id } }).catch(() => {})
    }
  })

  it('turn 1 — "list the buyers": the list resolves and carries the target', async () => {
    const cfg = getMasterConfig('buyer')!
    const rows = await listMasters(cfg, { search: INCIDENT_NAME })
    expect(rows.length).toBeGreaterThanOrEqual(1)
    expect(rows[0].code).toBe(INCIDENT_CODE)
    expect(rows[0].name).toBe(INCIDENT_NAME)
  })

  it('turn 2 — "Add random merchandiser to each buyer": the bulk ask yields UPDATE plans only (zero creates)', async () => {
    // the planner-level twin of what the agent should do: resolve the list,
    // then propose one update per row — never a create to "act like an edit"
    const cfg = getMasterConfig('buyer')!
    const rows = await listMasters(cfg, { take: 10 })
    expect(rows.length).toBeGreaterThanOrEqual(2) // the fixture world has buyers
    const plans = []
    for (const row of rows) {
      const p = await planMasterUpdate(cfg, { code: String(row.code), merchandiser: 'Random Merchandiser' })
      expect(p.ok, `${row.code}: ${p.errors.join('; ')}`).toBe(true)
      expect(p.updates?.table).toBe('buyer')
      plans.push(p)
    }
    expect(plans.length).toBeGreaterThanOrEqual(1)
    // ZERO create plans in the bulk path — the incident's root mutation
    for (const p of plans) {
      expect(p.creates).toBeUndefined()
    }
  })

  it('the absence-claim path is CLOSED: update_buyer exists in the registry', () => {
    // turn 2 of the real incident opened with "no edit path exists" — that
    // claim must be impossible for every master on the list (E-2.1's
    // contract: create/update/list doors exist per entity)
    const t = getTool('update_buyer')
    expect(t).toBeTruthy()
    expect(t!.isWrite).toBe(true)
    expect(getTool('create_buyer')).toBeTruthy()
    expect(getTool('list_buyers')).toBeTruthy()
  })

  it('turn 3 — create_buyer with the TAKEN code: the plan REFUSES (the incident cannot recur)', async () => {
    const cfg = getMasterConfig('buyer')!
    // the exact mutation the incident performed: name + an explicitly taken code
    const plan = await planMasterCreate(cfg, { code: INCIDENT_CODE, name: INCIDENT_NAME })
    expect(plan.ok).toBe(false)
    expect(plan.errors[0]).toBe(
      `${INCIDENT_CODE} is already taken by ${INCIDENT_NAME} — update that record or omit the code to get the next free one.`,
    )
    // and the agent door returns NO card (nothing to approve)
    const res = await getTool('create_buyer')!.execute({ code: INCIDENT_CODE, name: INCIDENT_NAME })
    expect(res.plan).toBeUndefined()
    expect(res.commit).toBeUndefined()
    expect(String(res.error)).toMatch(/is already taken by/)
    // nothing was created — the buyers count is unchanged
    const count = await db.buyer.count({ where: { name: INCIDENT_NAME } })
    expect(count).toBe(1) // only the fixture row
  })

  it('turn 3b — the same name with code OMITTED: warns (Band A), never blocks', async () => {
    // the "create a second LPP SA" path now shows the amber C-2.1 warning
    const cfg = getMasterConfig('buyer')!
    const plan = await planMasterCreate(cfg, { name: `  ${INCIDENT_NAME.toUpperCase()}  ` })
    expect(plan.ok, plan.errors.join('; ')).toBe(true)
    expect(plan.warnings?.length).toBe(1)
    expect(plan.warnings![0].band).toBe('A')
    expect(plan.warnings![0].existingCode).toBe(INCIDENT_CODE)
    // the card the operator would see carries the honest primary label
    // (pinned by harness-copy) — nothing commits here (no approve call)
  })

  it('turn 4 — the corrective update plans cleanly with before-values', async () => {
    // "There's an update_buyer tool" — once told, the incident's fix worked;
    // it must keep working: update by code, merchandiser change, old → new
    const cfg = getMasterConfig('buyer')!
    const plan = await planMasterUpdate(cfg, { code: INCIDENT_CODE, merchandiser: 'Priya Sharma' })
    expect(plan.ok, plan.errors.join('; ')).toBe(true)
    expect(plan.updates?.before).toEqual({ merchandiser: null })
    await plan.commit()
    const row = await db.buyer.findFirst({ where: { name: INCIDENT_NAME } })
    expect(row?.merchandiser).toBe('Priya Sharma')
  })
})
