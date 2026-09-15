/**
 * SPEC-M61 H1 — E-3 plan preflight (harness-plan-preflight).
 *
 * The incident's exact failure modes, pinned:
 *  - E-3.1: an explicitly provided TAKEN code fails the plan with the exact
 *    refusal message (owner named + both choices) — never a silent renumber.
 *    Omitted codes still auto-assign.
 *  - E-3.2: natural-key duplicate warning in two bands (§7.2) — Band A
 *    normalized-exact (amber C-2.1), Band B fuzzy (softer note); a genuinely
 *    new name warns nothing; warnings never block.
 *  - E-3.6: update plans carry before-values ("old → new" rendering).
 *  - E-3.7: the description contract — no "or taken" anywhere; the honest
 *    refusal wording present.
 *
 * Runs on the test DB copy (tests/setup pin); residue-free per house rules.
 */
import { describe, it, expect, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { getTool } from '@/lib/agent/tools'
import { db } from '@/lib/db'
import { getMasterConfig } from '@/lib/erp/master-configs'
import { planMasterCreate, planMasterUpdate } from '@/lib/erp/posting/master-service'
import { planDisplay } from '@/lib/agent/plan-display'
import { normalizeName, trigramSimilarity, jaroWinkler, isFuzzyDuplicate } from '@/lib/erp/dedupe'

const TS = Date.now()
const created: Array<{ delegate: string; id: string }> = []

async function commitAndTrack(delegate: string, plan: { commit: () => Promise<{ id: string }> }) {
  const out = await plan.commit()
  created.push({ delegate, id: out.id })
  return out
}

afterAll(async () => {
  for (const { delegate, id } of created.reverse()) {
    const m = (db as unknown as Record<string, { delete: (a: unknown) => Promise<unknown> }>)[delegate]
    await m?.delete({ where: { id } }).catch(() => {})
  }
})

describe('E-3.1 — no silent renumber (the incident)', () => {
  it('buyer: an explicitly taken code FAILS with the exact refusal message (both doors share the planner)', async () => {
    const existing = await db.buyer.findFirst({ orderBy: { code: 'asc' } })
    expect(existing).toBeTruthy()
    const cfg = getMasterConfig('buyer')!
    const plan = await planMasterCreate(cfg, { name: `M61 Taken ${TS}`, code: existing!.code })
    expect(plan.ok).toBe(false)
    expect(plan.errors[0]).toBe(
      `${existing!.code} is already taken by ${existing!.name} — update that record or omit the code to get the next free one.`,
    )
    // the AGENT door tells the same truth (CHAT-08 error field)
    const res = await getTool('create_buyer')!.execute({ name: `M61 Taken ${TS}`, code: existing!.code })
    expect(res.plan).toBeUndefined()
    expect(String(res.error)).toMatch(/is already taken by/)
  })

  it('party + style: the same refusal (the shared planner, three entities pinned)', async () => {
    const party = await db.party.findFirst({ orderBy: { code: 'asc' } })
    expect(party).toBeTruthy()
    const pPlan = await planMasterCreate(getMasterConfig('party')!, {
      name: `M61 Party ${TS}`, partyType: 'supplier', code: party!.code,
    })
    expect(pPlan.ok).toBe(false)
    expect(pPlan.errors[0]).toMatch(/is already taken by .* — update that record or omit the code/)

    const style = await db.style.findFirst({ orderBy: { styleNo: 'asc' } })
    expect(style).toBeTruthy()
    const sPlan = await planMasterCreate(getMasterConfig('style')!, {
      description: `M61 Style ${TS}`, styleNo: style!.styleNo,
    })
    expect(sPlan.ok).toBe(false)
    expect(sPlan.errors[0]).toMatch(/is already taken by .* — update that record or omit the code/)
  })

  it('omitted code still auto-assigns the next free number (unchanged behavior)', async () => {
    const cfg = getMasterConfig('buyer')!
    const plan = await planMasterCreate(cfg, { name: `M61 Auto ${TS}` })
    expect(plan.ok, plan.errors.join('; ')).toBe(true)
    expect(plan.creates?.data).toBeTruthy()
    const code = String((plan.creates!.data as Record<string, unknown>).code)
    expect(code).toMatch(/^B-\d{4}$/)
    const out = await commitAndTrack('buyer', plan)
    expect(out.code).toBe(code)
  })
})

describe('E-3.2 — duplicate warning, two bands (§7.2)', () => {
  it('Band A: normalized-exact name match warns with C-2.1 (case/punctuation/legal suffix collapse)', async () => {
    const existing = await db.buyer.findFirst({ where: { code: 'B001' } })
    if (!existing) {
      // seed variant fallback — any buyer works, the assertion is the warning shape
      const any = await db.buyer.findFirst({ orderBy: { code: 'asc' } })
      expect(any).toBeTruthy()
    }
    const target = existing ?? (await db.buyer.findFirst({ orderBy: { code: 'asc' } }))!
    // raw DIFFERS from the stored name (case + suffix) but normalizes equal
    const disguised = ` ${target.name.toUpperCase()} PVT LTD `
    expect(normalizeName(disguised)).toBe(normalizeName(target.name))
    const cfg = getMasterConfig('buyer')!
    const plan = await planMasterCreate(cfg, { name: disguised })
    expect(plan.ok, plan.errors.join('; ')).toBe(true) // warn, never block (O-2.4)
    expect(plan.warnings?.length).toBe(1)
    const w = plan.warnings![0]
    expect(w.type).toBe('duplicate')
    expect(w.band).toBe('A')
    expect(w.existingCode).toBe(target.code)
    expect(w.existingName).toBe(target.name)
    expect(w.message).toBe(
      `A buyer named '${target.name}' already exists (${target.code}). Approving this will create a second '${target.name}'.`,
    )
    await commitAndTrack('buyer', plan)
  })

  it('Band B: fuzzy-similar name notes softly (trigram/JW threshold path)', async () => {
    const target = await db.buyer.findFirst({ where: { code: 'B002' } })
    expect(target).toBeTruthy() // BlueWave Retail (seed)
    const similar = `${target!.name}s` // one char different — fuzzy hit, not normalized-exact
    expect(normalizeName(similar)).not.toBe(normalizeName(target!.name))
    expect(isFuzzyDuplicate(similar, target!.name)).toBe(true)
    const plan = await planMasterCreate(getMasterConfig('buyer')!, { name: similar })
    expect(plan.ok, plan.errors.join('; ')).toBe(true)
    expect(plan.warnings?.length).toBe(1)
    expect(plan.warnings![0].band).toBe('B')
    expect(plan.warnings![0].message).toBe(
      `There's a similar buyer '${target!.name}' (${target!.code}) — same one?`,
    )
    await commitAndTrack('buyer', plan)
  })

  it('a genuinely new name produces NO warning', async () => {
    const plan = await planMasterCreate(getMasterConfig('buyer')!, { name: `Zqx Vvk ${TS}` })
    expect(plan.ok, plan.errors.join('; ')).toBe(true)
    expect(plan.warnings ?? []).toHaveLength(0)
    await commitAndTrack('buyer', plan)
  })

  it('dedupe primitives: normalization + thresholds are deterministic and sane', () => {
    expect(normalizeName('  L.P.P.  S.A. ')).toBe('lpp')
    expect(normalizeName('Tirupur Knitwear (Pvt) Ltd')).toBe('tirupur knitwear')
    // industry words are NOT stripped — different companies stay different
    expect(normalizeName('LPP Textiles')).not.toBe(normalizeName('LPP Garments'))
    expect(trigramSimilarity('lpp sa', 'lpp sa')).toBe(1)
    expect(trigramSimilarity('bluewave retail', 'bluewave retails')).toBeGreaterThanOrEqual(0.85)
    expect(jaroWinkler('lpp sa', 'lpp sa')).toBe(1)
    expect(jaroWinkler('acme corp usa', 'zqx vvk')).toBeLessThan(0.9)
    expect(isFuzzyDuplicate('Acme Corp USA', 'Zqx Vvk Test')).toBe(false)
  })
})

describe('E-3.6 — update before-values (old → new on the card)', () => {
  it('planMasterUpdate populates before for every changed field', async () => {
    const plan = await planMasterCreate(getMasterConfig('buyer')!, {
      name: `M61 Before ${TS}`, dept: 'Old Dept',
    })
    expect(plan.ok, plan.errors.join('; ')).toBe(true)
    const out = await commitAndTrack('buyer', plan)
    const upd = await planMasterUpdate(getMasterConfig('buyer')!, {
      code: out.code, dept: 'New Dept', merchandiser: 'Priya Sharma',
    })
    expect(upd.ok, upd.errors.join('; ')).toBe(true)
    expect(upd.updates?.before).toEqual({ dept: 'Old Dept', merchandiser: null })
    // planDisplay renders "old → new" (O-2.6); missing before renders as —
    const disp = planDisplay({ updates: [upd.updates!] })
    const deptRow = disp.rows.find((r) => r.field === 'dept')
    const merchRow = disp.rows.find((r) => r.field === 'merchandiser')
    expect(deptRow?.value).toBe('Old Dept → New Dept')
    expect(merchRow?.value).toBe('— → Priya Sharma')
    await upd.commit()
  })
})

describe('E-3.7 — description hygiene (the prompt/description contract)', () => {
  const toolsSrc = readFileSync('src/lib/agent/tools.ts', 'utf8')

  it('NO create_* description says "or taken" anywhere (the renumber implication is gone)', () => {
    expect(toolsSrc).not.toContain('or taken')
  })

  it('the honest refusal wording is present on the master create descriptions (×3 pinned)', () => {
    expect(toolsSrc).toContain('when omitted. An explicitly given code that is taken is refused')
    const hits = toolsSrc.split('when omitted. An explicitly given code that is taken is refused').length - 1
    expect(hits).toBeGreaterThanOrEqual(3)
  })

  it('the buyer tool advertises refusal (not renumbering) in its description', () => {
    const t = getTool('create_buyer')!
    expect(t.description).toContain('An explicitly given code that is taken is refused')
    expect(t.description).not.toContain('or taken')
  })
})
