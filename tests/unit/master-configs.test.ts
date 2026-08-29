/**
 * Master config contract tests — SPEC-M2 §11.1.
 * Guards the frozen config registry: 24 entities, unique everything,
 * delegates exist on the Prisma client, every tool name resolves in the
 * agent registry with the right write flag.
 */
import { describe, it, expect } from 'vitest'
import { MASTER_CATEGORIES, MASTER_CONFIGS, configsByCategory, getMasterConfig } from '../../src/lib/erp/master-configs'
import { getTool } from '../../src/lib/agent/tools'
import { db } from '../../src/lib/db'

const EXPECTED_DELEGATES = [
  'party', 'buyer', 'merchandiser', 'exporter', 'season',
  'style', 'colour', 'size', 'sizeGroup', 'dia', 'uOM', 'lot',
  'yarn', 'fabric', 'accessory', 'part', 'component', 'design',
  'godown', 'department', 'employee', 'line', 'govtHoliday', 'finYear',
  'shift', // SPEC-M5 §7-D-32 (ADR-015)
  'user', 'userGroup', 'appOption', 'hsn', 'testParameter', // SPEC-M6 §7-B (ADR-016 + ERRATUM #1)
  'bank', 'bankAccount', 'mill', 'machineCategory', 'machine', 'state', 'shade',
  'threadType', 'countGroup', 'rangeGroup', 'sizeRange', // SPEC-M19 §3 Wave C (ADR-019)
]

/** flattened display keys derivable from ref fields (mirror of service logic) */
const DISPLAY_KEYS: Record<string, string> = {
  buyer: 'buyerName',
  uom: 'uomName',
  party: 'partyName',
  dia: 'diaValue',
  department: 'deptName',
  'user-group': 'userGroupName', // ADR-016 (M6-B)
  'machine-category': 'machineCategoryName', // SPEC-M19 §3 Wave C
  'range-group': 'rangeGroupName', // SPEC-M19 §3 Wave C
}

describe('master configs — frozen contract (SPEC-M2 §11.1)', () => {
  it('has exactly 41 configs covering every schema master model (24 M2 + shift M5-D + 5 ADR-016 M6-B + 11 M19-C)', () => {
    expect(MASTER_CONFIGS.length).toBe(41)
    const delegates = MASTER_CONFIGS.map((c) => c.delegate)
    for (const d of EXPECTED_DELEGATES) expect(delegates).toContain(d)
    expect(new Set(delegates).size).toBe(41)
  })

  it('has unique slugs, entities, and tool names', () => {
    for (const key of ['slug', 'entity', 'createTool', 'updateTool', 'listTool'] as const) {
      const vals = MASTER_CONFIGS.map((c) => c[key])
      expect(new Set(vals).size, `duplicate ${key}`).toBe(vals.length)
    }
  })

  it('every delegate exists on the Prisma client', () => {
    for (const c of MASTER_CONFIGS) {
      expect((db as unknown as Record<string, unknown>)[c.delegate], `${c.model} → db.${c.delegate}`).toBeTruthy()
    }
  })

  it('every create/update tool is a registered write tool; every list tool is read-only', () => {
    for (const c of MASTER_CONFIGS) {
      const create = getTool(c.createTool)
      expect(create, c.createTool).toBeDefined()
      expect(create!.isWrite, `${c.createTool} must be write`).toBe(true)
      expect(create!.domain).toBe('masters')

      const update = getTool(c.updateTool)
      expect(update, c.updateTool).toBeDefined()
      expect(update!.isWrite, `${c.updateTool} must be write`).toBe(true)

      const list = getTool(c.listTool)
      expect(list, c.listTool).toBeDefined()
      expect(list!.isWrite, `${c.listTool} must be read-only`).toBe(false)
    }
  })

  it('configs with a codePrefix have a codeField; fields are well-formed', () => {
    for (const c of MASTER_CONFIGS) {
      if (c.codePrefix) expect(c.codeField, `${c.slug} codePrefix needs codeField`).toBeTruthy()
      expect(c.fields.length, `${c.slug} has no fields`).toBeGreaterThan(0)
      for (const f of c.fields) {
        expect(f.label, `${c.slug}.${f.name} missing label`).toBeTruthy()
        if (f.type === 'select') expect(f.options?.length, `${c.slug}.${f.name} select without options`).toBeGreaterThan(0)
        if (f.refEntity) expect(getMasterConfig(f.refEntity), `${c.slug}.${f.name} refEntity ${f.refEntity} unknown`).toBeTruthy()
      }
    }
  })

  it('listColumns and searchFields reference known flattened fields', () => {
    for (const c of MASTER_CONFIGS) {
      const known = new Set<string>(['id', ...c.fields.map((f) => f.name)])
      if (c.codeField) known.add(c.codeField)
      if (c.updateKeyField) known.add(c.updateKeyField)
      for (const f of c.fields) {
        if (f.refEntity) known.add(DISPLAY_KEYS[f.refEntity] || `${f.refEntity}Name`)
      }
      for (const col of c.listColumns) {
        expect(known.has(col.field), `${c.slug} listColumn ${col.field} unknown`).toBe(true)
      }
      for (const s of c.searchFields) {
        expect(known.has(s), `${c.slug} searchField ${s} unknown`).toBe(true)
      }
      // defaultSort must be a real column (scalar or key)
      const sortKnown = new Set<string>([...c.fields.map((f) => f.name), ...(c.codeField ? [c.codeField] : []), ...(c.updateKeyField ? [c.updateKeyField] : [])])
      expect(sortKnown.has(c.defaultSort.field), `${c.slug} defaultSort ${c.defaultSort.field} unknown`).toBe(true)
    }
  })

  it('categories cover all configs; helpers work', () => {
    const catKeys = new Set(MASTER_CATEGORIES.map((c) => c.key))
    for (const c of MASTER_CONFIGS) expect(catKeys.has(c.category), `${c.slug} bad category`).toBe(true)
    const summed = MASTER_CATEGORIES.reduce((n, cat) => n + configsByCategory(cat.key).length, 0)
    expect(summed).toBe(41)
    expect(getMasterConfig('party')?.entity).toBe('party')
    expect(getMasterConfig('nope')).toBeUndefined()
  })

  it('every entity has exactly one create + one update tool in the registry (M2 completeness)', () => {
    for (const c of MASTER_CONFIGS) {
      const allCreate = MASTER_CONFIGS.filter((x) => x.createTool === c.createTool)
      const allUpdate = MASTER_CONFIGS.filter((x) => x.updateTool === c.updateTool)
      expect(allCreate.length).toBe(1)
      expect(allUpdate.length).toBe(1)
    }
  })
})
