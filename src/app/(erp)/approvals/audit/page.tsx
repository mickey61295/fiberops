/**
 * /approvals/audit — Approval Audit Trail (SPEC-M4 §7 row 16; modern source:
 * Approval + AgentTurn — no legacy form). Rows drill into the entity view
 * when live (po/grn/invoice/cut — W2).
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function ApprovalAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('approval-audit')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['approval-audit'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/approvals/audit"
      groupLabel="Approvals & Workflow"
      groupHref="/approvals"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
