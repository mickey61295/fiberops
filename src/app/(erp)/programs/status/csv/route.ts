/** CSV export for the program-status register (SPEC-M6 §12-7). */
import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

export const dynamic = 'force-dynamic'

export const GET = makeCsvRouteHandler('program-status')
