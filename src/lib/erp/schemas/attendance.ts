// SPEC-M20 §3 — shared zod schema for post_attendance (batch day post) and
// the list_attendance read tool. ONE row per employee per day — re-posting
// corrects (upsert semantics), never duplicates.
import { z } from 'zod'

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

export const ATTENDANCE_SCHEMA = z.object({
  attDate: z.string().optional().describe('ISO date (default today)'),
  entries: z.array(z.object({
    employeeCode: z.string().describe('Employee code, e.g. E0001'),
    status: z.string().optional().describe('present | absent | half | leave (default present)'),
    shiftCode: z.string().optional().describe('Shift code for in/out hours fallback'),
    inTime: z.string().optional().describe('In time "HH:MM"'),
    outTime: z.string().optional().describe('Out time "HH:MM" (must be after inTime)'),
    notes: z.string().optional(),
  })).min(1).describe('One entry per employee for the day'),
})

export type AttendanceInput = z.infer<typeof ATTENDANCE_SCHEMA>

export const LIST_ATTENDANCE_SCHEMA = z.object({
  from: z.string().optional().describe('ISO date (default today)'),
  to: z.string().optional().describe('ISO date'),
  status: z.string().optional().describe('present | absent | half | leave'),
  q: z.string().optional().describe('Employee code/name or dept code'),
})

const TIME_RE = HHMM
export function validTime(t: string): boolean {
  return TIME_RE.test(t)
}
