// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts issue_to_line.
import { z } from 'zod'

export const LINE_ISSUE_SCHEMA = z.object({
  issueNo: z.string().optional(),
  orderNo: z.string(),
  lineCode: z.string(),
  qty: z.number(),
  issueDate: z.string().optional(),
  styleNo: z.string().optional(),
  notes: z.string().optional(),
})

export type LineIssueInput = z.infer<typeof LINE_ISSUE_SCHEMA>
