/** CSV export for the login-audit register (SPEC-M60 FR-A7) — same service, same filters. */
import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

export const dynamic = 'force-dynamic'

export const GET = makeCsvRouteHandler('login-audit')
