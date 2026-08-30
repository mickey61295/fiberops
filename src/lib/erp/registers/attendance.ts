/**
 * Attendance day-book register service — SPEC-M20 §5 (Gap D closure).
 * One row per employee per day; default window = TODAY (attendance is a
 * daily ritual — the register opens on today, widens via From/To). Totals
 * are the four status counts. q matches employee code/name or dept code.
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryAttendance(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  // default: today (the ritual surface); explicit from/to widen it
  if (q.from || q.to) {
    where.attDate = {}
    if (q.from) where.attDate.gte = new Date(q.from)
    if (q.to) where.attDate.lte = new Date(new Date(q.to).setHours(23, 59, 59, 999))
  } else {
    const now = new Date()
    where.attDate = { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
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

  const rows: RegisterRow[] = rowsRaw.map((a) => ({
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
  }))

  // totals across the WHOLE filtered set (not just the page)
  const all = await db.attendance.findMany({ where, select: { status: true } })
  const tally = (s: string) => all.filter((a) => a.status === s).length
  const summary = `${count} rows · ${tally('present')} present, ${tally('absent')} absent, ${tally('half')} half, ${tally('leave')} leave`

  return {
    rows,
    summary,
    count,
    totals: [
      { label: 'Present', value: tally('present') },
      { label: 'Absent', value: tally('absent') },
      { label: 'Half', value: tally('half') },
      { label: 'Leave', value: tally('leave') },
    ],
  }
}
