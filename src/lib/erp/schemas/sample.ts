// SPEC-M5 §7-D-26 — shared zod schema for create_sample / the Sample
// DocScreen (/orders/samples, legacy frmOrderSample family). Mirrors the
// Sample model (ADR-015): buyerCode/styleCode resolve by code, sampleType
// picks the development stage, status defaults 'submitted'.
import { z } from 'zod'

export const SAMPLE_SCHEMA = z.object({
  sampleNo: z.string().optional().describe('SMP-#### auto-assigned when omitted or colliding'),
  buyerCode: z.string().optional().describe('Buyer code'),
  styleCode: z.string().optional().describe('Style no'),
  sampleType: z.string().describe('proto | photo | counter | salesman | production'),
  qty: z.number().min(0).optional().describe('Sample pieces (default 0)'),
  sampledOn: z.string().optional().describe('ISO date (default today)'),
  status: z.string().optional().describe('submitted | approved | rejected | closed (default submitted)'),
  enquiryRef: z.string().optional().describe('Linked enquiry / order no'),
  remarks: z.string().optional(),
})

export type SampleInput = z.infer<typeof SAMPLE_SCHEMA>
