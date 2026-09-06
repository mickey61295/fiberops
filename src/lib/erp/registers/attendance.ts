/**
 * Attendance day-book register service — SPEC-M20 §5 (Gap D closure).
 * One row per employee per day; default window = TODAY (attendance is a
 * daily ritual — the register opens on today, widens via From/To). Totals
 * are the four status counts. q matches employee code/name or dept code.
 * SPEC-M49 L-04 — + the OT Hrs column: present rows with hours beyond the
 * per-day standard (linked shift hours, else the live attendance:ot config
 * standard). INFORMATIONAL — hours earn OT pay only on a daily payroll run
 * created with ot: true (frozen at plan).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'
import { istTodayDate, endOfUtcDay } from '@/lib/erp/dates'
import { resolveOtConfig } from '@/lib/erp/overtime' // SPEC-M49 L-04

export async function queryAttendance(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  // default: today (the ritual surface); explicit from/to widen it
  // OPS-03 — "today" is the IST business day (00:00–05:29 IST belongs to the
  // NEW factory day); explicit to-filter ceiling is the UTC day end.
  if (q.from || q.to) {
    where.attDate = {}
    if (q.from) where.attDate.gte = new Date(q.from)
    if (q.to) where.attDate.lte = endOfUtcDay(new Date(q.to))
  } else {
    where.attDate = { gte: istTodayDate() }
  }
  if (q.status) where.status = q.status
  if (q.q) {
    const depts = await db.department.findMany({
      where: { OR: [{ code: { contains: q.q } }, { name: { contains: q.q } }] },
      select: { id: true },
    })
    const emps = await db.employee.findMany({
      where: { OR: [{ code: { contains: q.q } }, { name: { contains: q.q } }] },
      select: { id: true },
    })
    if (!depts.length && !emps.length) return { rows: [], summary: `No employee/dept matches "${q.q}"`, count: 0 }
    where.OR = [
      ...(emps.length ? [{ employeeId: { in: emps.map((e) => e.id) } }] : []),
      ...(depts.length ? [{ employee: { deptId: { in: depts.map((d) => d.id) } } }] : []),
    ]
  }

  const [rowsRaw, count] = await Promise.all([
    db.attendance.findMany({
      where,
      orderBy: [{ attDate: 'desc' }, { employee: { code: 'asc' } }],
      take: q.limit,
      skip: (q.page - 1) * q.limit,
      include: { employee: { include: { department: true } }, shift: true },
    }),
    db.attendance.count({ where }),
  ])

  // SPEC-M49 L-04 — the standard-hours fallback for rows with no linked
  // shift (live config; the PAYROLL run freezes its own copy at plan time)
  const otStd = (await resolveOtConfig()).config.standardHours

  const rows: RegisterRow[] = rowsRaw.map((a) => {
    // SPEC-M49 L-04 — OT hours beyond the per-day standard (present rows only;
    // the register's standard mirrors the payroll rule: linked shift hours
    // else the live config standard — informational, paid via ot: true runs)
    const hours = a.hours ?? 0
    const otHrs =
      a.status?.trim() === 'present' && hours > 0
        ? Math.round(Math.max(0, hours - ((a.shift?.hours ?? 0) > 0 ? a.shift!.hours : otStd)) * 100) / 100
        : null
    return {
      id: a.id,
      href: '/hr/employees', // W2 drill — the employees screen is the employee read door
      attDate: a.attDate,
      code: a.employee.code,
      employee: a.employee.name,
      dept: a.employee.department?.code ?? '—',
      shift: a.shift?.code ?? null,
      status: a.status,
      inTime: a.inTime ?? '—',
      outTime: a.outTime ?? '—',
      hours: a.hours ?? null,
      otHrs,
    }
  })

  // totals across the WHOLE filtered set (not just the page)
  const all = await db.attendance.findMany({ where, include: { shift: true } })
  const tally = (s: string) => all.filter((a) => a.status === s).length
  // the OT-hours total mirrors the row rule (present + beyond standard)
  const otTotal = Math.round(
    all
      .filter((a) => a.status?.trim() === 'present' && (a.hours ?? 0) > 0)
      .reduce((s, a) => s + Math.max(0, (a.hours ?? 0) - ((a.shift?.hours ?? 0) > 0 ? a.shift!.hours : otStd)), 0) * 100,
  ) / 100
  const summary = `${count} rows · ${tally('present')} present, ${tally('absent')} absent, ${tally('half')} half, ${tally('leave')} leave${otTotal > 0 ? ` · OT ${otTotal} h beyond standard` : ''}`

  return {
    rows,
    summary,
    count,
    totals: [
      { label: 'Present', value: tally('present') },
      { label: 'Absent', value: tally('absent') },
      { label: 'Half', value: tally('half') },
      { label: 'Leave', value: tally('leave') },
      ...(otTotal > 0 ? [{ label: 'OT hrs', value: otTotal }] : []),
    ],
  }
}
