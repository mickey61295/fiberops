/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M20 §3 — post_attendance service. Batch day post with UPSERT
// semantics: ONE row per employee per day (@@unique(employeeId, attDate)) —
// re-posting a day CORRECTS it, never duplicates. hours = out−in when both
// times given, else the shift's hours, else null. Agent-door-only write (the
// docTool plan→approve path; the approve door is already an audit door).

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { AttendanceInput } from '../schemas/attendance'
import { validTime } from '../schemas/attendance'
import { dateOrIstToday, istDayStart } from '@/lib/erp/dates'

const STATUSES = ['present', 'absent', 'half', 'leave']

function minutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export async function planAttendance(args: AttendanceInput): Promise<DocPlanResult> {
  if (!args.entries.length) {
    return { ok: false, error: 'At least one attendance entry is required' }
  }
  const attDate = dateOrIstToday(args.attDate)
  if (isNaN(attDate.getTime())) return { ok: false, error: `Invalid attDate '${args.attDate}'` }
  // OPS-03 — the attendance DAY is the IST calendar day of attDate, stored at
  // UTC midnight (the app-wide date-column convention). Was server-local
  // `new Date(y, m, d)`, which off-by-oned the 00:00–05:29 IST window.
  const dayStart = istDayStart(attDate)

  // validate entries first (statuses, times, out > in)
  for (const [i, e] of args.entries.entries()) {
    const status = e.status?.trim() || 'present'
    if (!STATUSES.includes(status)) {
      return { ok: false, error: `entries[${i}].status must be ${STATUSES.join(' | ')} (got '${e.status}')` }
    }
    if (e.inTime && !validTime(e.inTime)) return { ok: false, error: `entries[${i}].inTime must be HH:MM (got '${e.inTime}')` }
    if (e.outTime && !validTime(e.outTime)) return { ok: false, error: `entries[${i}].outTime must be HH:MM (got '${e.outTime}')` }
    if (e.inTime && e.outTime && minutes(e.outTime) <= minutes(e.inTime)) {
      return { ok: false, error: `entries[${i}] outTime ${e.outTime} is not after inTime ${e.inTime}` }
    }
  }

  // resolve employees + shifts (batch, id-maps)
  const empCodes = [...new Set(args.entries.map((e) => e.employeeCode.trim()))]
  const employees = await db.employee.findMany({ where: { code: { in: empCodes } }, select: { id: true, code: true } })
  const empByCode = new Map(employees.map((e) => [e.code, e]))
  const missing = empCodes.filter((c) => !empByCode.has(c))
  if (missing.length) {
    return { ok: false, error: `Unknown employee code(s): ${missing.join(', ')}` }
  }
  const shiftCodes = [...new Set(args.entries.map((e) => e.shiftCode?.trim()).filter(Boolean) as string[])]
  const shiftByCode = new Map<string, { id: string; hours: number }>()
  if (shiftCodes.length) {
    const shifts = await db.shift.findMany({ where: { code: { in: shiftCodes } }, select: { id: true, code: true, hours: true } })
    for (const s of shifts) shiftByCode.set(s.code, { id: s.id, hours: s.hours })
    const missingShifts = shiftCodes.filter((c) => !shiftByCode.has(c))
    if (missingShifts.length) return { ok: false, error: `Unknown shift code(s): ${missingShifts.join(', ')}` }
  }

  // classify creates vs updates against existing rows for the day
  const empIds = employees.map((e) => e.id)
  const existing = await db.attendance.findMany({
    where: { attDate: dayStart, employeeId: { in: empIds } },
    select: { id: true, employeeId: true, status: true },
  })
  const existingByEmp = new Map(existing.map((r) => [r.employeeId, r]))

  const creates: any[] = []
  const updates: any[] = []
  const resolved = args.entries.map((e) => {
    const emp = empByCode.get(e.employeeCode.trim())!
    const shift = e.shiftCode?.trim() ? shiftByCode.get(e.shiftCode.trim()) : undefined
    const status = e.status?.trim() || 'present'
    const hours = e.inTime && e.outTime
      ? Math.round(((minutes(e.outTime) - minutes(e.inTime)) / 60) * 100) / 100
      : shift?.hours ?? null
    const data = { status, shiftId: shift?.id ?? null, inTime: e.inTime ?? null, outTime: e.outTime ?? null, hours, notes: e.notes ?? null }
    const prior = existingByEmp.get(emp.id)
    if (prior) updates.push({ table: 'attendance', id: prior.id, data })
    else creates.push({ table: 'attendance', data: { employeeId: emp.id, attDate: dayStart, ...data } })
    return { employeeCode: emp.code, status, hours }
  })

  const day = dayStart.toISOString().slice(0, 10)
  const counts = STATUSES.map((s) => `${resolved.filter((r) => r.status === s).length} ${s}`).join(', ')

  return {
    ok: true,
    text: `Proposed attendance for ${day}: ${resolved.length} employees (${counts}).`,
    summary: `Post attendance ${day} | ${resolved.length} employees | ${counts}${creates.length ? ` | ${creates.length} new` : ''}${updates.length ? ` | ${updates.length} corrections` : ''}`,
    creates: creates.length ? creates : undefined,
    updates: updates.length ? updates : undefined,
    sideEffects: ['Attendance day-book /hr/attendance shows the day (upsert — re-posting corrects)'],
    async commit() {
      const rows = await db.$transaction(
        resolved.map((r, i) => {
          const e = args.entries[i]
          const emp = empByCode.get(e.employeeCode.trim())!
          const shift = e.shiftCode?.trim() ? shiftByCode.get(e.shiftCode.trim()) : undefined
          const status = e.status?.trim() || 'present'
          const hours = e.inTime && e.outTime
            ? Math.round(((minutes(e.outTime) - minutes(e.inTime)) / 60) * 100) / 100
            : shift?.hours ?? null
          return db.attendance.upsert({
            where: { employeeId_attDate: { employeeId: emp.id, attDate: dayStart } },
            update: { status, shiftId: shift?.id ?? null, inTime: e.inTime ?? null, outTime: e.outTime ?? null, hours, notes: e.notes ?? null },
            create: {
              attDate: dayStart, employeeId: emp.id, status,
              shiftId: shift?.id ?? null, inTime: e.inTime ?? null, outTime: e.outTime ?? null, hours, notes: e.notes ?? null,
            },
          })
        })
      )
      return { date: day, posted: rows.length, updated: updates.length }
    },
  }
}
