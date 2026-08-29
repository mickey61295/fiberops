/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M2 §6 — the shared master service.
// ONE code path for BOTH doors (ADR-001): agent tools (src/lib/agent/tools.ts)
// and the form server action (src/app/(erp)/masters/actions.ts) both call
// planMasterCreate / planMasterUpdate and execute the returned commit().
// No business logic for masters lives anywhere else.

import { z } from 'zod'
import { db } from '@/lib/db'
import { getMasterConfig, MASTER_CONFIGS } from '../master-configs'
import type { MasterConfig, MasterField, MasterRow } from '../master-configs/types'

// ---------------------------------------------------------------------------
// Prisma mapping tables (SPEC-M2 §12 gotcha 1: delegates are first-letter
// lowercased MODEL names — UOM→uOM, FinYear→finYear, GovtHoliday→govtHoliday)
// ---------------------------------------------------------------------------

/** FK input field → Prisma FK column. Default: `${refEntity}Id`. */
const FK_COLUMN_OVERRIDES: Record<string, string> = {
  department: 'deptId',
  'user-group': 'userGroupId', // ADR-016 (M6-B): slug has a hyphen, column is camelCase
  'machine-category': 'machineCategoryId', // SPEC-M19 §3 Wave C
  'range-group': 'rangeGroupId', // SPEC-M19 §3 Wave C
}

/** flattened display key per refEntity (listColumns / searchFields use these) */
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

/** Prisma relation field name per refEntity (for include) — default refEntity */
const RELATION_OVERRIDES: Record<string, string> = {
  department: 'department',
  'user-group': 'userGroup', // ADR-016 (M6-B)
  'machine-category': 'machineCategory', // SPEC-M19 §3 Wave C
  'range-group': 'rangeGroup', // SPEC-M19 §3 Wave C
}

/** entities whose titleField is ALSO unique (SPEC-M2 ERRATUM 3) */
const UNIQUE_TITLE_ENTITIES = new Set([
  'colour', 'merchandiser', 'part', 'component', 'design', 'size', 'sizeGroup',
])

export interface MasterPlan {
  ok: boolean
  errors: string[]
  summary: string
  creates?: { table: string; data: any }
  updates?: { table: string; id: string; data: any }
  sideEffects?: string[]
  commit: () => Promise<{ id: string; code?: string; [k: string]: any }>
}

// ---------------------------------------------------------------------------
// Input coercion (FormData / LLM args / test calls → typed input)
// SPEC-M2 §6.1 + §12 gotcha 4: '' → undefined, never write empty strings.
// ---------------------------------------------------------------------------

function coerceValue(field: MasterField, v: unknown): unknown {
  if (v === undefined || v === null) return undefined
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'date': {
      if (typeof v === 'string') return v.trim() === '' ? undefined : v.trim()
      return String(v)
    }
    case 'select': {
      if (typeof v === 'string') {
        const s = v.trim()
        if (s === '') return undefined
        // case-insensitive normalization onto a declared option (ERRATUM 4)
        const opts = field.options || []
        const hit = opts.find((o) => o.value.toLowerCase() === s.toLowerCase() || o.label.toLowerCase() === s.toLowerCase())
        return hit ? hit.value : s
      }
      return String(v)
    }
    case 'number': {
      if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
      const s = String(v).trim()
      if (s === '') return undefined
      const n = Number(s)
      return Number.isFinite(n) ? n : undefined
    }
    case 'checkbox': {
      if (typeof v === 'boolean') return v
      const s = String(v).trim().toLowerCase()
      if (['true', 'on', '1', 'yes'].includes(s)) return true
      if (['false', 'off', '0', 'no', ''].includes(s)) return false
      return undefined
    }
    case 'list': {
      if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean)
      const s = String(v).trim()
      if (s === '') return undefined
      return s.split(',').map((x) => x.trim()).filter(Boolean)
    }
    default:
      return v
  }
}

function coerceInput(config: MasterConfig, raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of config.fields) {
    if (field.name in raw) {
      const v = coerceValue(field, raw[field.name])
      if (v !== undefined) out[field.name] = v
    }
  }
  // the business key may not be a form field (auto-code entities: party.code,
  // style.styleNo…) — keep it so updates can identify the record and creates
  // can honor an explicit code override
  const keyField = updateKeyOf(config)
  if (keyField in raw && !config.fields.some((f) => f.name === keyField)) {
    const v = raw[keyField]
    if (typeof v === 'string') {
      const s = v.trim()
      if (s !== '') out[keyField] = s
    } else if (v !== undefined && v !== null) {
      out[keyField] = v
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Schema generation — ONE definition (config fields) powers the agent tool
// schema AND the service's internal validation (SPEC-M2 §6.2).
// ---------------------------------------------------------------------------

function fieldBaseSchema(field: MasterField): z.ZodTypeAny {
  switch (field.type) {
    case 'number':
      return z.number().describe(field.description || field.label)
    case 'select': {
      // ERRATUM 4: NOT z.enum — the agent route coerces only numbers/booleans,
      // so strict enums would reject case variants the old free-string schemas
      // accepted. The SERVICE validates select values case-insensitively.
      const values = (field.options || []).map((o) => o.value)
      const hint = values.length ? ` (${values.join(' | ')})` : ''
      return z.string().describe(`${field.description || field.label}${hint}`)
    }
    case 'checkbox':
      return z.boolean().describe(field.description || field.label)
    case 'list':
      return z.array(z.string()).describe(field.description || `${field.label} (list of values)`)
    default:
      // text / textarea / date (ISO string coerced to Date at mapping)
      return z.string().describe(field.description || field.label)
  }
}

export function buildMasterSchema(config: MasterConfig, mode: 'create' | 'update'): z.ZodObject<any, any> {
  const shape: Record<string, z.ZodTypeAny> = {}
  const keyField = updateKeyOf(config)
  // identifier must be addressable even when auto-assigned (not a form field):
  // create → optional explicit override; update → required identifier
  if (!config.fields.some((f) => f.name === keyField)) {
    const keySchema = z.string().describe(`Identifier — the ${config.singular}'s ${keyField}`)
    shape[keyField] = mode === 'update' ? keySchema : keySchema.optional()
  }
  for (const field of config.fields) {
    let s = fieldBaseSchema(field)
    const isKey = field.name === keyField
    if (mode === 'update') {
      // update: everything optional except the identifier (SPEC-M2 §6.6)
      s = isKey ? s : (s as any).optional()
    } else {
      const autoCode = config.codePrefix && field.name === config.codeField
      const required = field.required && !autoCode
      if (!required) {
        s = (s as any).optional()
        if (field.defaultValue !== undefined) s = (s as any).default(field.defaultValue)
      }
    }
    shape[field.name] = s
  }
  return z.object(shape) as unknown as z.ZodObject<any, any>
}

export function buildDefaultInput(config: MasterConfig): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of config.fields) {
    if (field.defaultValue !== undefined) out[field.name] = field.defaultValue
  }
  return out
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function updateKeyOf(config: MasterConfig): string {
  return config.updateKeyField || config.codeField || 'name'
}

function fkColumnFor(refEntity: string): string {
  return FK_COLUMN_OVERRIDES[refEntity] || `${refEntity}Id`
}

function displayKeyFor(refEntity: string): string {
  return DISPLAY_KEYS[refEntity] || `${refEntity}Name`
}

function delegateOf(config: MasterConfig): any {
  const m = (db as any)[config.delegate]
  if (!m) throw new Error(`Unknown Prisma delegate: ${config.delegate} (${config.model})`)
  return m
}

async function nextAutoCode(config: MasterConfig): Promise<string> {
  const pad = config.codePad ?? 4 // 0 = unpadded (godown G1, department D1 — legacy format)
  const codeField = config.codeField!
  const all: any[] = await delegateOf(config).findMany({
    where: { [codeField]: { startsWith: config.codePrefix } },
  })
  const used = new Set(all.map((r) => r[codeField]))
  let n = 1
  while (used.has(`${config.codePrefix}${String(n).padStart(pad, '0')}`)) n++
  return `${config.codePrefix}${String(n).padStart(pad, '0')}`
}

/** Resolve an FK input value → target record (by codeField, then titleField). */
async function resolveRef(
  config: MasterConfig,
  field: MasterField,
  value: string,
): Promise<{ record?: any; error?: string; created?: boolean }> {
  const target = getMasterConfig(field.refEntity!)
  if (!target) return { error: `Unknown reference entity ${field.refEntity}` }
  const targetKey = target.codeField || target.titleField
  let record: any = null
  if (targetKey && targetKey !== target.titleField) {
    record = await delegateOf(target).findUnique({ where: { [targetKey]: value } }).catch(() => null)
  }
  if (!record) {
    record = await delegateOf(target).findFirst({ where: { [target.titleField]: value } }).catch(() => null)
  }
  if (!record && field.refCreateOnFly) {
    // legacy create_fabric behavior: auto-create missing Dia (ERRATUM 2)
    if (target.delegate === 'dia') {
      record = await delegateOf(target).create({ data: { value } })
      return { record, created: true }
    }
  }
  if (!record) {
    return {
      error: `${field.label} '${value}' not found — create it first via ${target.createTool} or /masters/${target.slug}`,
    }
  }
  return { record }
}

/** size-group 'sizes' list: resolve size NAMES → CSV of size ids (legacy behavior) */
async function resolveSizeNames(names: string[]): Promise<{ ids?: string[]; error?: string }> {
  const ids: string[] = []
  for (const n of names) {
    const s = await (db as any).size.findUnique({ where: { name: n } }).catch(() => null)
    if (!s) return { error: `Size '${n}' not found — create it first via create_size or /masters/size` }
    ids.push(s.id)
  }
  return { ids }
}

function fieldSummaryValue(v: unknown): string {
  if (v === undefined || v === null) return '-'
  if (Array.isArray(v)) return v.join(', ')
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v)
}

function summaryOf(config: MasterConfig, input: Record<string, unknown>, keyValue?: string): string {
  const parts: string[] = []
  const key = keyValue ?? fieldSummaryValue(input[updateKeyOf(config)])
  parts.push(String(key))
  for (const field of config.fields) {
    if (field.name === config.codeField || field.name === updateKeyOf(config)) continue
    const v = input[field.name]
    if (v !== undefined) parts.push(`${field.label}: ${fieldSummaryValue(v)}`)
  }
  return `${config.singular} ${parts.join(' | ')}`
}

// ---------------------------------------------------------------------------
// CREATE (SPEC-M2 §6 rules 1-5, 7)
// ---------------------------------------------------------------------------

export async function planMasterCreate(
  config: MasterConfig,
  raw: Record<string, unknown>,
): Promise<MasterPlan> {
  const fail = (errors: string[]): MasterPlan => ({ ok: false, errors, summary: '', commit: async () => { throw new Error('no commit') } })

  const input = coerceInput(config, raw)
  const parsed = buildMasterSchema(config, 'create').safeParse(input)
  if (!parsed.success) {
    return fail(parsed.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`))
  }
  const args = parsed.data as Record<string, unknown>

  // select values must match a declared option (case-insensitive — ERRATUM 4)
  for (const field of config.fields) {
    if (field.type !== 'select' || !field.options?.length) continue
    const v = args[field.name]
    if (v === undefined) continue
    const valid = field.options.some(
      (o) => o.value.toLowerCase() === String(v).toLowerCase() || o.label.toLowerCase() === String(v).toLowerCase(),
    )
    if (!valid) {
      return fail([`${field.label} must be one of: ${field.options.map((o) => o.value).join(' | ')}`])
    }
  }

  // resolve FK refs
  const fkData: Record<string, string | undefined> = {}
  for (const field of config.fields) {
    if (!field.refEntity) continue
    const v = args[field.name]
    if (v === undefined) continue
    const r = await resolveRef(config, field, String(v))
    if (r.error) return fail([r.error])
    fkData[fkColumnFor(field.refEntity)] = r.record!.id
  }

  // size-group list resolution
  let sizeIdsCsv: string | undefined
  for (const field of config.fields) {
    if (field.type === 'list' && config.delegate === 'sizeGroup') {
      const v = args[field.name]
      if (v === undefined) continue
      const r = await resolveSizeNames(v as string[])
      if (r.error) return fail([r.error])
      sizeIdsCsv = r.ids!.join(',')
    }
  }

  // key: provided / duplicate / auto-assign
  let keyValue: string | undefined
  if (config.codeField) {
    const isDateKey = config.fields.find((f) => f.name === config.codeField)?.type === 'date'
    const desired = args[config.codeField] !== undefined ? String(args[config.codeField]).trim() : ''
    if (desired) {
      // date keys are not unique columns — the dedicated pair-check below
      // handles duplicates; unique string keys get the exists-check here
      const exists = isDateKey
        ? null
        : await delegateOf(config).findUnique({ where: { [config.codeField]: desired } }).catch(() => null)
      if (!exists) keyValue = desired
      else if (config.codePrefix) keyValue = await nextAutoCode(config) // legacy: taken+prefix → next free
      else return fail([`${config.singular} '${desired}' already exists`])
    } else if (config.codePrefix) {
      keyValue = await nextAutoCode(config)
    }
    if (!keyValue) return fail([`${config.codeField} is required`])
  }

  // titleField uniqueness (ERRATUM 3) + govt-holiday pair check
  if (config.titleField !== config.codeField && UNIQUE_TITLE_ENTITIES.has(config.entity)) {
    const title = args[config.titleField]
    if (title !== undefined) {
      const exists = await delegateOf(config).findUnique({ where: { [config.titleField]: String(title) } }).catch(() => null)
      if (exists) return fail([`${config.singular} '${title}' already exists`])
    }
  }
  if (config.delegate === 'govtHoliday') {
    const d = args.date ? new Date(String(args.date)) : null
    const n = args.name ? String(args.name) : null
    if (d && n) {
      const start = new Date(d); start.setHours(0, 0, 0, 0)
      const end = new Date(d); end.setHours(23, 59, 59, 999)
      const dup = await delegateOf(config).findFirst({ where: { name: n, date: { gte: start, lte: end } } }).catch(() => null)
      if (dup) return fail([`Govt Holiday '${n}' on ${d.toISOString().slice(0, 10)} already exists`])
    }
  }

  // build create data
  const data: Record<string, unknown> = {}
  for (const field of config.fields) {
    if (field.refEntity) continue
    if (field.type === 'list' && config.delegate === 'sizeGroup') continue
    if (field.name === config.codeField) continue
    let v = args[field.name]
    if (v === undefined) {
      if (field.defaultValue !== undefined) v = field.defaultValue
      else continue
    }
    if (field.type === 'date') v = new Date(String(v))
    data[field.name] = v
  }
  Object.assign(data, fkData)
  if (sizeIdsCsv !== undefined) data.sizes = sizeIdsCsv
  // resolved business key LAST (may be auto-assigned); date keys need conversion
  if (config.codeField && keyValue) {
    const keyFieldDef = config.fields.find((f) => f.name === config.codeField)
    data[config.codeField] = keyFieldDef?.type === 'date' ? new Date(String(keyValue)) : keyValue
  }

  const summary = `Create ${summaryOf(config, args, keyValue)}`
  const sideEffects = [`${config.singular} can now be referenced on transactions`]

  return {
    ok: true,
    errors: [],
    summary,
    creates: { table: config.delegate, data },
    sideEffects,
    async commit() {
      const rec = await delegateOf(config).create({ data: { ...data } })
      // fin-year invariant (SPEC-M2 §6.8): exactly one active year
      if (config.delegate === 'finYear' && data.active === true) {
        await delegateOf(config).updateMany({ where: { id: { not: rec.id } }, data: { active: false } })
      }
      const out: { id: string; code?: string; [k: string]: any } = { id: rec.id }
      if (config.codeField) out.code = rec[config.codeField]
      return out
    },
  }
}

// ---------------------------------------------------------------------------
// UPDATE (SPEC-M2 §6 rule 6: partial patch, key identifies, key never patched)
// ---------------------------------------------------------------------------

export async function planMasterUpdate(
  config: MasterConfig,
  raw: Record<string, unknown>,
): Promise<MasterPlan> {
  const fail = (errors: string[]): MasterPlan => ({ ok: false, errors, summary: '', commit: async () => { throw new Error('no commit') } })

  const keyField = updateKeyOf(config)
  const input = coerceInput(config, raw)
  const parsed = buildMasterSchema(config, 'update').safeParse(input)
  if (!parsed.success) {
    return fail(parsed.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`))
  }
  const args = parsed.data as Record<string, unknown>

  // select values must match a declared option (case-insensitive — ERRATUM 4)
  for (const field of config.fields) {
    if (field.type !== 'select' || !field.options?.length) continue
    const v = args[field.name]
    if (v === undefined) continue
    const valid = field.options.some(
      (o) => o.value.toLowerCase() === String(v).toLowerCase() || o.label.toLowerCase() === String(v).toLowerCase(),
    )
    if (!valid) {
      return fail([`${field.label} must be one of: ${field.options.map((o) => o.value).join(' | ')}`])
    }
  }

  const keyValue = args[keyField]
  if (keyValue === undefined) return fail([`${keyField} is required to identify the ${config.singular}`])

  // find record — date keys need a day-range lookup with Date objects
  // (Prisma rejects bare date strings on DateTime filters); every other key
  // is a unique string column
  let record: any = null
  if (keyField === 'date') {
    const d = new Date(String(keyValue))
    if (Number.isNaN(d.getTime())) return fail([`Invalid date '${String(keyValue)}' — use ISO format (YYYY-MM-DD)`])
    const start = new Date(d); start.setHours(0, 0, 0, 0)
    const end = new Date(d); end.setHours(23, 59, 59, 999)
    record = await delegateOf(config).findFirst({ where: { date: { gte: start, lte: end } } }).catch(() => null)
  } else {
    record = await delegateOf(config).findUnique({ where: { [keyField]: String(keyValue) } }).catch(() => null)
  }
  if (!record) return fail([`${config.singular} '${keyValue}' not found`])

  // resolve provided FK refs
  const fkData: Record<string, string | undefined> = {}
  for (const field of config.fields) {
    if (!field.refEntity) continue
    const v = args[field.name]
    if (v === undefined) continue
    const r = await resolveRef(config, field, String(v))
    if (r.error) return fail([r.error])
    fkData[fkColumnFor(field.refEntity)] = r.record!.id
  }

  // build patch — only provided fields
  const patch: Record<string, unknown> = {}
  for (const field of config.fields) {
    if (field.name === keyField || field.name === config.codeField) continue
    const v = args[field.name]
    if (v === undefined) continue
    if (field.refEntity) continue
    if (field.type === 'date') {
      patch[field.name] = new Date(String(v))
      continue
    }
    if (field.type === 'list' && config.delegate === 'sizeGroup') {
      const r = await resolveSizeNames(v as string[])
      if (r.error) return fail([r.error])
      patch.sizes = r.ids!.join(',')
      continue
    }
    patch[field.name] = v
  }
  Object.assign(patch, fkData)
  if (Object.keys(patch).length === 0) {
    return fail([`No fields to update — provide at least one field besides ${keyField}`])
  }

  const changed = Object.keys(patch)
  const summary = `Update ${config.singular} ${String(keyValue)} | fields: ${changed.join(', ')}`

  return {
    ok: true,
    errors: [],
    summary,
    updates: { table: config.delegate, id: record.id, data: patch },
    sideEffects: [`${config.singular} master updated`],
    async commit() {
      await delegateOf(config).update({ where: { id: record.id }, data: patch })
      if (config.delegate === 'finYear' && patch.active === true) {
        await delegateOf(config).updateMany({ where: { id: { not: record.id } }, data: { active: false } })
      }
      const out: { id: string; code?: string; [k: string]: any } = { id: record.id }
      if (config.codeField) out.code = record[config.codeField]
      return out
    },
  }
}

// ---------------------------------------------------------------------------
// LIST / COUNT (flattened display rows — SPEC-M2 §6.9 + MasterRow doc)
// ---------------------------------------------------------------------------

function includeFor(config: MasterConfig): Record<string, boolean> | undefined {
  const include: Record<string, boolean> = {}
  for (const field of config.fields) {
    if (!field.refEntity) continue
    include[RELATION_OVERRIDES[field.refEntity] || field.refEntity] = true
  }
  return Object.keys(include).length ? include : undefined
}

function flattenRow(config: MasterConfig, rec: any): MasterRow {
  const row: Record<string, unknown> = { id: rec.id }
  // always include the business key + update key, even when the key is
  // auto-assigned (not a form field) — e.g. party.code, style.styleNo
  for (const k of [config.codeField, config.updateKeyField]) {
    if (k && !(k in row)) {
      let v = rec[k]
      if (v instanceof Date) v = v.toISOString().slice(0, 10)
      row[k] = v
    }
  }
  for (const field of config.fields) {
    if (field.refEntity) continue
    let v = rec[field.name]
    if (v instanceof Date) v = v.toISOString().slice(0, 10)
    row[field.name] = v
  }
  for (const field of config.fields) {
    if (!field.refEntity) continue
    const rel = rec[RELATION_OVERRIDES[field.refEntity] || field.refEntity]
    const target = getMasterConfig(field.refEntity!)
    const dk = displayKeyFor(field.refEntity!)
    if (field.refEntity === 'dia') row[dk] = rel?.value ?? null
    else row[dk] = rel ? rel[target?.titleField || 'name'] : null
  }
  return row as MasterRow
}

export async function listMasters(
  config: MasterConfig,
  opts?: { search?: string; take?: number },
): Promise<MasterRow[]> {
  let rows: any[]
  try {
    rows = await delegateOf(config).findMany({
      orderBy: { [config.defaultSort.field]: config.defaultSort.dir },
      take: opts?.take ?? 500,
      include: includeFor(config),
    })
  } catch {
    // gotcha 3: orderBy on a missing column throws — retry unordered
    rows = await delegateOf(config).findMany({ take: opts?.take ?? 500 })
  }
  let out = rows.map((r) => flattenRow(config, r))
  if (opts?.search) {
    const q = opts.search.toLowerCase()
    out = out.filter((r) => config.searchFields.some((f) => String(r[f] ?? '').toLowerCase().includes(q)))
  }
  return out
}

export async function countMasters(config: MasterConfig): Promise<number> {
  return delegateOf(config).count()
}

/** all configs (re-export convenience for callers that already import the service) */
export { MASTER_CONFIGS }
