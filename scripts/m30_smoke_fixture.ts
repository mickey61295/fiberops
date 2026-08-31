/**
 * SPEC-M30 — route_smoke_m30 fixture helper. The smoke exercises the approve
 * DOOR contract (400/404/409/200 matrix); the live proposing loop is owned
 * by the unit tests, so this fixture writes the proposal turn exactly the
 * way the loop persists it (dry execute → stamp approvalId → persist).
 *
 *   setup          : proposal turn row for create_party (code SM30-P-<ts>)
 *                    → prints JSON { ts, approvalId, code }.
 *   verify <ts>    : asserts the party committed + the turn row approved
 *                    (scoped) → prints KEY=verify-ok / KEY=verify-fail.
 *   stale <ts>     : tampers the persisted plan summary (simulates the world
 *                    moving between proposal and approval) → KEY=stale-ok.
 *   partystatus <ts> : prints KEY=party-exists|party-absent (did a commit
 *                    land or not).
 *   clean <ts>     : removes the party/audit/turn fixture rows.
 */
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { getTool } from '../src/lib/agent/tools'

const db = new PrismaClient()
const FIXTURE_PROMPT = 'm30 smoke create_party proposal'

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
    const code = `SM30-P-${ts}`
    await db.party.deleteMany({ where: { code } }).catch(() => {})
    const t = getTool('create_party')!
    const result = await t.execute(
      { name: `M30 Smoke Party ${ts}`, partyType: 'both', code },
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
          { name: 'create_party', args: { name: `M30 Smoke Party ${ts}`, partyType: 'both', code }, isWrite: true },
        ]),
        result: String(result.text ?? 'fixture proposal'),
        approved: false,
        userId: admin.id,
        approvalId,
      },
    })
    console.log(JSON.stringify({ ts: String(ts), approvalId, code }))
    return
  }

  const ts = process.argv[3]
  const code = `SM30-P-${ts}`

  if (mode === 'verify') {
    const party = await db.party.findFirst({ where: { code } })
    const turn = await db.agentTurn.findFirst({ where: { prompt: FIXTURE_PROMPT }, orderBy: { createdAt: 'desc' } })
    if (!party) {
      console.log('KEY=verify-fail  party did not commit')
      process.exit(1)
    }
    if (!turn?.approved) {
      console.log(`KEY=verify-fail  turn approved=${turn?.approved} (expected true — scoped marking)`)
      process.exit(1)
    }
    console.log(`KEY=verify-ok  party ${code} committed; turn row approved=true`)
    return
  }

  if (mode === 'stale') {
    // LATEST row — earlier fixture rows from the same smoke run (already
    // approved) must not be tampered instead of the fresh proposal.
    const turn = await db.agentTurn.findFirst({ where: { prompt: FIXTURE_PROMPT }, orderBy: { createdAt: 'desc' } })
    if (!turn?.plan) {
      console.log('KEY=stale-fail  no proposal row to tamper')
      process.exit(1)
    }
    const plan = JSON.parse(turn.plan)
    plan.summary = 'Create party SOMETHING-ELSE-ENTIRELY'
    await db.agentTurn.update({ where: { id: turn.id }, data: { plan: JSON.stringify(plan) } })
    console.log('KEY=stale-ok  persisted plan tampered (summary mismatch vs re-execution)')
    return
  }

  if (mode === 'partystatus') {
    const party = await db.party.findFirst({ where: { code } })
    console.log(party ? 'KEY=party-exists' : 'KEY=party-absent')
    return
  }

  if (mode === 'clean') {
    await db.party.deleteMany({ where: { code } }).catch(() => {})
    await db.auditLog.deleteMany({ where: { docNo: code } }).catch(() => {})
    await db.agentTurn.deleteMany({ where: { prompt: FIXTURE_PROMPT } }).catch(() => {})
    console.log('KEY=clean-ok')
    return
  }

  console.log('usage: tsx scripts/m30_smoke_fixture.ts setup | verify <ts> | stale <ts> | partystatus <ts> | clean <ts>')
  process.exit(1)
}

main().finally(() => db.$disconnect())
