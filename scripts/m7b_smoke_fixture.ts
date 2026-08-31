/**
 * SPEC-M7 Wave B — route_smoke_m7b fixture helper.
 *   setup  : (a) delete any existing grn_acceptance Approval rows for GRN-001
 *            so the smoke's accept_grn run hits the find-or-create path
 *            cleanly (idempotent re-runs); (b) SPEC-M30 — insert the
 *            AgentTurn PROPOSAL row the approve door now requires: dry
 *            execute → stamp approvalId → persist, exactly what the agent
 *            loop writes on a proposal. Prints APPROVAL_ID=<uuid> for the
 *            shell to send back on the approve POST.
 *   verify : assert the approval committed through the HUMAN door carries the
 *            session user as the actor (approvedBy = admin email, requestedBy
 *            = 'agent') + the SPEC-M30 turn row flipped approved (scoped),
 *            exit 1 otherwise.
 * Prints KEY= lines the smoke greps.
 */
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { getTool } from '../src/lib/agent/tools'

const db = new PrismaClient()
const GRN_NO = 'GRN-001'
const FIXTURE_PROMPT = 'm7b smoke accept_grn proposal'

async function main() {
  const mode = process.argv[2]
  const grn = await db.gRN.findUnique({ where: { grnNo: GRN_NO } })
  if (!grn) {
    console.log('KEY=fixture-fail  GRN-001 missing — run scripts/seed.ts first')
    process.exit(1)
  }
  const admin = await db.user.findUnique({ where: { email: 'admin@fiberpro.local' } })
  if (!admin) {
    console.log('KEY=fixture-fail  admin@fiberpro.local missing — run scripts/seed_admin.ts first')
    process.exit(1)
  }
  const actor = { userId: admin.id, email: admin.email, name: admin.name ?? 'admin' }

  if (mode === 'setup') {
    const del = await db.approval.deleteMany({
      where: { entity: 'grn_acceptance', entityId: grn.id },
    })
    await db.agentTurn.deleteMany({ where: { prompt: FIXTURE_PROMPT } })
    // SPEC-M30: build the proposal row the way the LOOP does — dry execute
    // (plan + commit fn, nothing committed), stamp the correlation token,
    // persist plan + args + approvalId.
    const t = getTool('accept_grn')!
    const result = await t.execute({ grnNo: GRN_NO, comments: 'm7b smoke' }, actor)
    if (!result?.plan || !result?.commit) {
      console.log(`KEY=fixture-fail  accept_grn produced no plan: ${JSON.stringify(result).slice(0, 200)}`)
      process.exit(1)
    }
    const approvalId = randomUUID()
    await db.agentTurn.create({
      data: {
        prompt: FIXTURE_PROMPT,
        plan: JSON.stringify({ ...result.plan, approvalId }),
        toolCalls: JSON.stringify([
          { name: 'accept_grn', args: { grnNo: GRN_NO, comments: 'm7b smoke' }, isWrite: true },
        ]),
        result: String(result.text ?? 'fixture proposal'),
        approved: false,
        userId: admin.id,
        approvalId,
      },
    })
    console.log(`KEY=setup-ok  deleted ${del.count} stale grn_acceptance row(s) for ${GRN_NO}; proposal turn row inserted`)
    console.log(`APPROVAL_ID=${approvalId}`)
    return
  }
  if (mode === 'verify') {
    const row = await db.approval.findFirst({
      where: { entity: 'grn_acceptance', entityId: grn.id },
      orderBy: { createdAt: 'desc' },
    })
    if (!row) {
      console.log('KEY=verify-fail  no grn_acceptance approval found for GRN-001')
      process.exit(1)
    }
    if (row.status !== 'approved') {
      console.log(`KEY=verify-fail  status=${row.status} (expected approved)`)
      process.exit(1)
    }
    if (row.approvedBy !== 'admin@fiberpro.local') {
      console.log(`KEY=verify-fail  approvedBy=${row.approvedBy} (expected admin@fiberpro.local — actor not stamped)`)
      process.exit(1)
    }
    if (row.requestedBy !== 'agent') {
      console.log(`KEY=verify-fail  requestedBy=${row.requestedBy} (expected agent)`)
      process.exit(1)
    }
    // SPEC-M30: the correlated turn row flipped approved (and only that one).
    const turn = await db.agentTurn.findFirst({ where: { prompt: FIXTURE_PROMPT } })
    if (!turn || !turn.approved) {
      console.log(`KEY=verify-fail  proposal turn approved=${turn?.approved} (expected true — scoped marking)`)
      process.exit(1)
    }
    await db.agentTurn.deleteMany({ where: { prompt: FIXTURE_PROMPT } })
    console.log(`KEY=verify-ok  ${GRN_NO} grn_acceptance approved by ${row.approvedBy} (requested by ${row.requestedBy}); turn row approved + cleaned`)
    return
  }
  console.log('usage: tsx scripts/m7b_smoke_fixture.ts setup|verify')
  process.exit(1)
}

main().finally(() => db.$disconnect())
