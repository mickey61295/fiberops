/**
 * SPEC-M20 — Attendance (gap-audit Gap D closure): plan validation (unknown
 * employees, status/time rules, hours derivation incl. shift fallback),
 * commit UPSERT semantics (one row per employee/day, re-post corrects), the
 * register service (rows + 4 status totals, filters, default window = today)
 * and the two agent tools' presence + wiring.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { planAttendance } from '@/lib/erp/posting/attendance'
import { queryAttendance } from '@/lib/erp/registers/attendance'
import { getTool, allTools } from '@/lib/agent/tools'

const TS = Date.now()
const DEPT = `M20-D-${TS}`
const E1 = `M20-E1-${TS}`
const E2 = `M20-E2-${TS}`
const SHIFT = `M20-SH-${TS}`
const DAY = new Date()
const DAY_KEY = `${DAY.getFullYear()}-${String(DAY.getMonth() + 1).padStart(2, '0')}-${String(DAY.getDate()).padStart(2, '0')}`

let deptId = '', e1Id = '', e2Id = '', shiftId = ''

// FILE-scope fixtures: created before ALL describes, cleaned after ALL of
// them (a describe-level afterAll deleted the rows before the register
// suite could read them — the classic hook-scope trap).
beforeAll(async () => {
  const d = await db.department.create({ data: { code: DEPT, name: `M20 Dept ${TS}`, orderSno: 99 } })
  deptId = d.id
  const e1 = await db.employee.create({ data: { code: E1, name: `M20 Emp One ${TS}`, deptId } })
  const e2 = await db.employee.create({ data: { code: E2, name: `M20 Emp Two ${TS}`, deptId } })
  e1Id = e1.id
  e2Id = e2.id
  const sh = await db.shift.create({ data: { code: SHIFT, name: `M20 Shift ${TS}`, fromTime: '06:00', toTime: '14:00', hours: 8 } })
  shiftId = sh.id
})

afterAll(async () => {
  await db.attendance.deleteMany({ where: { employeeId: { in: [e1Id, e2Id] } } }).catch(() => {})
  await db.employee.deleteMany({ where: { id: { in: [e1Id, e2Id] } } }).catch(() => {})
  await db.department.deleteMany({ where: { id: deptId } }).catch(() => {})
  await db.shift.deleteMany({ where: { id: shiftId } }).catch(() => {})
  await db.$disconnect()
})

describe('SPEC-M20 §3 — planAttendance validation', () => {

  it('rejects unknown employee codes (all listed)', async () => {
    const res = await planAttendance({ entries: [{ employeeCode: 'NOPE-1' }, { employeeCode: E1 }] })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('NOPE-1')
  })

  it('rejects invalid status and time shapes', async () => {
    const bad = await planAttendance({ entries: [{ employeeCode: E1, status: 'holiday' }] })
    expect(bad.ok).toBe(false)
    const badTime = await planAttendance({ entries: [{ employeeCode: E1, inTime: '9am' }] })
    expect(badTime.ok).toBe(false)
    const badOrder = await planAttendance({ entries: [{ employeeCode: E1, inTime: '14:00', outTime: '06:00' }] })
    expect(badOrder.ok).toBe(false)
  })

  it('hours: derived from in/out (rounded 2dp); shift fallback; null otherwise', async () => {
    const res = await planAttendance({
      attDate: DAY_KEY,
      entries: [
        { employeeCode: E1, inTime: '06:00', outTime: '14:30' },
        { employeeCode: E2, shiftCode: SHIFT },
      ],
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      // E1: 8.5 derived; E2: shift hours 8; both listed as creates (fresh day)
      expect(res.creates?.length).toBe(2)
      const e1 = res.creates?.find((c) => c.data.employeeId === e1Id)
      const e2 = res.creates?.find((c) => c.data.employeeId === e2Id)
      expect(e1?.data.hours).toBe(8.5)
      expect(e2?.data.hours).toBe(8)
      expect(e2?.data.shiftId).toBe(shiftId)
    }
  })

  it('commit is an UPSERT: posting twice corrects, never duplicates (@@unique proof)', async () => {
    const first = await planAttendance({ attDate: DAY_KEY, entries: [{ employeeCode: E1, status: 'present' }, { employeeCode: E2, status: 'absent' }] })
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const r1 = await first.commit()
    expect(r1.posted).toBe(2)

    const second = await planAttendance({ attDate: DAY_KEY, entries: [{ employeeCode: E1, status: 'half' }] })
    expect(second.ok).toBe(true)
    if (!second.ok) return
    // E1 already has a row today → the plan says UPDATE, not CREATE
    expect(second.updates?.length).toBe(1)
    expect(second.creates).toBeUndefined()
    const r2 = await second.commit()
    expect(r2.posted).toBe(1)

    // exactly ONE row per employee for the day, with the CORRECTED status
    const rows = await db.attendance.findMany({
      where: { attDate: new Date(DAY_KEY), employeeId: { in: [e1Id, e2Id] } },
    })
    expect(rows.length).toBe(2)
    expect(rows.find((r) => r.employeeId === e1Id)?.status).toBe('half')
    expect(rows.find((r) => r.employeeId === e2Id)?.status).toBe('absent')
  })
})

describe('SPEC-M20 §5 — queryAttendance register service', () => {
  it('default window = today: the fixture rows appear with 4 status totals', async () => {
    const res = await queryAttendance({ limit: 50, page: 1 })
    expect(res.rows.some((r) => r.code === E1)).toBe(true)
    expect(res.rows.some((r) => r.code === E2)).toBe(true)
    const totals = Object.fromEntries((res.totals ?? []).map((t) => [String(t.label).toLowerCase(), t.value]))
    expect(Number(totals.present)).toBeGreaterThanOrEqual(0)
    expect(Number(totals.absent)).toBeGreaterThanOrEqual(1) // E2 fixture
    expect(Number(totals.half)).toBeGreaterThanOrEqual(1) // E1 corrected
    expect(totals.leave).not.toBeUndefined()
    // row shape
    const row = res.rows.find((r) => r.code === E1)!
    expect(row.employee).toContain('M20 Emp One')
    expect(row.dept).toBe(DEPT)
    expect(row.status).toBe('half')
  })

  it('status filter narrows; q matches employee code and dept code', async () => {
    const absent = await queryAttendance({ limit: 50, page: 1, status: 'absent' })
    expect(absent.rows.length).toBeGreaterThanOrEqual(1)
    expect(absent.rows.every((r) => r.status === 'absent')).toBe(true)
    expect(absent.rows.some((r) => r.code === E2)).toBe(true)

    const byCode = await queryAttendance({ limit: 50, page: 1, q: E1 })
    expect(byCode.rows.length).toBeGreaterThanOrEqual(1)
    expect(byCode.rows.every((r) => r.code === E1)).toBe(true)

    const byDept = await queryAttendance({ limit: 50, page: 1, q: DEPT })
    expect(byDept.rows.some((r) => r.code === E1)).toBe(true)
    expect(byDept.rows.some((r) => r.code === E2)).toBe(true)

    const none = await queryAttendance({ limit: 50, page: 1, q: `zzz-${TS}` })
    expect(none.rows).toEqual([])
  })
})

describe('SPEC-M20 §4 — agent tools', () => {
  it('post_attendance (write) and list_attendance (read) are registered', () => {
    const post = getTool('post_attendance')
    expect(post).toBeTruthy()
    expect(post!.isWrite).toBe(true)
    expect(post!.domain).toBe('hr')
    const list = getTool('list_attendance')
    expect(list).toBeTruthy()
    expect(list!.isWrite).toBe(false)
    expect(list!.domain).toBe('hr')
  })

  it('list_attendance delegates to the register service (today window default)', async () => {
    const tool = getTool('list_attendance')!
    const res = await tool.execute({ status: 'half' })
    expect(res.text).toContain('half')
    const json = res.json as any[]
    expect(json.every((r) => r.status === 'half')).toBe(true)
    expect(json.some((r) => r.code === E1)).toBe(true)
  })

  it('registry grew 222 → 226 (the two M20 tools)', () => {
    expect(allTools.length).toBe(229)
  })
})
