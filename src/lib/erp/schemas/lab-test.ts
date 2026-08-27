// SPEC-M5 §7-D-30 — shared zod schema for create_lab_test / the LabTest
// DocScreen (/quality/lab-tests, legacy FrmLabTest). itemType+itemCode
// resolve the item master id (yarn|fabric|accessory|pcs — pcs uses styleNo
// convention); lotNo/orderNo optional refs.
import { z } from 'zod'

export const LAB_TEST_SCHEMA = z.object({
  testNo: z.string().optional().describe('LT-#### auto-assigned when omitted or colliding'),
  itemType: z.string().describe('yarn | fabric | accessory | pcs (the form sends "style" for pcs — both accepted)'),
  itemCode: z.string().describe('Item code (styleNo when itemType is pcs)'),
  lotNo: z.string().optional(),
  orderNo: z.string().optional(),
  testType: z.string().describe('gsm | shrinkage | colour_fastness | composition | other'),
  result: z.string().optional().describe('pending | pass | fail | conditional (default pending)'),
  testedOn: z.string().optional().describe('ISO date (default today)'),
  testedBy: z.string().optional(),
  values: z.string().optional().describe('JSON string of parameter results'),
  remarks: z.string().optional(),
})

export type LabTestInput = z.infer<typeof LAB_TEST_SCHEMA>
