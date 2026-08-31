/**
 * SPEC-M15 / SPEC-M30 — route_smoke_m15 fixture helper (the agent-door
 * audit commit). Since SPEC-M30 the approve door REQUIRES a correlated
 * proposal turn: this fixture inserts one exactly the way the agent loop
 * does (dry execute → stamp approvalId → persist), so the smoke can POST
 * { toolName, args, approvalId } like the panel.
 *
 *   setup         : timestamp → baseline audit count → create the proposal
 *                   turn row for create_party (code SM15-P-<ts>) → prints
 *                   JSON { ts, before, approvalId }.
 *   verify <ts>   : assert the audit row landed (source=agent, docNo
 *                   SM15-P-<ts>) → count after → cleanup (party + audit rows
 *                   + the turn row) → prints JSON { count, row }.
 */
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { getTool } from '../src/lib/agent/tools'

const db = new PrismaClient()
const FIXTURE_PROMPT = 'm15 smoke create_party proposal'

async function main() {
  const mode = process.argv[2]
  const admin = await db.user.findUnique({ where: { email: 'admin@fiberpro.local' } })
  if (!admin) {
    console.log(JSON.stringify({ error: 'admin@fiberpro.local missing — run scripts/seed_admin.ts first' }))
    process.exit(1)
  }
  const actor = { userId: admin.id, email: admin.email, name: admin.name ?? 'admin' }

  if (mode === 'setup') {
    const ts = Date.now()
    const code = `SM15-P-${ts}`
    const before = await db.auditLog.count()
    await db.agentTurn.deleteMany({ where: { prompt: FIXTURE_PROMPT } })
    await db.party.deleteMany({ where: { code } }).catch(() => {})

    // SPEC-M30: the proposal row the loop would have written.
    const t = getTool('create_party')!
    const result = await t.execute(
      { name: `Smoke Audit Party ${ts}`, partyType: 'both', code },
      actor,
    )
    if (!result?.plan || !result?.commit) {
      console.log(JSON.stringify({ error: `create_party produced no plan: ${JSON.stringify(result).slice(0, 200)}` }))
      process.exit(1)
    }
    const approvalId = randomUUID()
    await db.agentTurn.create({
      data: {
        prompt: FIXTURE_PROMPT,
        plan: JSON.stringify({ ...result.plan, approvalId }),
        toolCalls: JSON.stringify([
          { name: 'create_party', args: { name: `Smoke Audit Party ${ts}`, partyType: 'both', code }, isWrite: true },
        ]),
        result: String(result.text ?? 'fixture proposal'),
        approved: false,
        userId: admin.id,
        approvalId,
      },
    })
    console.log(JSON.stringify({ ts: String(ts), before, approvalId, code }))
    return
  }

  if (mode === 'verify') {
    const ts = process.argv[3]
    const code = `SM15-P-${ts}`
    const count = await db.auditLog.count()
    const row = await db.auditLog.findFirst({ where: { docNo: code } })
    // cleanup: party + audit rows + the proposal turn row
    await db.party.deleteMany({ where: { code } }).catch(() => {})
    await db.auditLog.deleteMany({ where: { docNo: code } }).catch(() => {})
    await db.agentTurn.deleteMany({ where: { prompt: FIXTURE_PROMPT } }).catch(() => {})
    console.log(
      JSON.stringify({
        count,
        row: row ? { source: row.actorSource, actor: row.actorName, action: row.action, entity: row.entity } : null,
      }),
    )
    return
  }

  console.log('usage: tsx scripts/m15_smoke_fixture.ts setup | verify <ts>')
  process.exit(1)
}

main().finally(() => db.$disconnect())
