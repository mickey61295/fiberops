import type { RegisterConfig } from './types'

/** /hr/attendance — SPEC-M20 §5 (gap-audit Gap D closure). Day-book of
 *  attendance rows (one per employee per day, upsert-corrected by the
 *  post_attendance agent tool). Default window = today. */
export const attendanceConfig: RegisterConfig = {
  slug: 'attendance',
  title: 'Attendance',
  description: 'Daily attendance day-book — present/absent/half/leave per employee (posted via the agent).',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'present', label: 'Present' },
      { value: 'absent', label: 'Absent' },
      { value: 'half', label: 'Half day' },
      { value: 'leave', label: 'Leave' },
    ] },
    { key: 'q', label: 'Employee/Dept', type: 'text', placeholder: 'code or name' },
  ],
  columns: [
    { name: 'attDate', label: 'Date', format: 'date' },
    { name: 'code', label: 'Code', mono: true },
    { name: 'employee', label: 'Employee' },
    { name: 'dept', label: 'Dept', mono: true },
    { name: 'shift', label: 'Shift', mono: true },
    { name: 'status', label: 'Status' },
    { name: 'inTime', label: 'In', mono: true },
    { name: 'outTime', label: 'Out', mono: true },
    { name: 'hours', label: 'Hrs', align: 'right', format: 'qty' },
  ],
  // read-tools-only chip contract (M19-B precedent) — post_attendance is the
  // write door; the register chips cite the READ tool.
  agentTools: ['list_attendance'],
  askPrompt: 'Show me today\u2019s attendance',
  emptyMessage: 'No attendance posted in this window yet — ask the agent to post the day.',
}
