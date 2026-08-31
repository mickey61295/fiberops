/**
 * SPEC-M30 (QoL1 D-3) — the approval-door correlation contract, end to end
 * against the REAL loop + REAL tools + REAL db (the upload-route test
 * pattern: mocked next/headers cookies + a fixture user).
 *
 * The proposal is driven through runAgentTurn with a scripted fake LLM
 * client (create_party tool-call) and the DEFAULT persist hook — the real
 * AgentTurn row with the stamped approvalId. Then the human door
 * (/api/agent/approve) is POSTed exactly the way the panel does:
 *   { toolName, args: <parsed args from tool-call-end>, approvalId }
 *
 * Matrix (frozen SPEC-M30 §3.2):
 *   happy path → 200, party committed, turn approved, SCOPED marking;
 *   double-approve → 409 already_approved;
 *   unknown approvalId → 404;
 *   persisted-plan tampered → 409 plan_changed, NOTHING committed;
 *   invalid args → 400 (zod issues);
 *   missing approvalId → 400;
 *   read-only tool → 400.
 */
import { describe, it, expect, afterAll, vi, beforeEach } from 'vitest'

const cookieStore = vi.hoisted(() => ({}) as Record<string, string>)
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieStore ? { name, value: cookieStore[name] } : undefined,
  }),
}))

import { POST as approvePost } from '../../src/app/api/agent/approve/route'
import { runAgentTurn, type TurnEvent } from '../../src/lib/agent/loop'
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth/session'
import { db } from '@/lib/db'

const stamp = Date.now()
let fixtureUserId = ''

// Shared state between the happy-path proposal and the double-approve test.
let happyApprovalId = ''
let happyArgs: Record<string, unknown> = {}
const happyCode = `AC-${stamp}-1`
const happyName = `Corr Party One ${stamp}`

/** Propose a create_party through the REAL loop (fake LLM, real tools, real
 * persist). Returns the correlation token + the parsed args the panel would
 * round-trip. */
async function proposeParty(code: string, name: string) {
  const events: TurnEvent[] = []
  const completions = [
    {
      content: null,
      tool_calls: [
        {
          id: `prop-${code}`,
          type: 'function',
          function: { name: 'create_party', arguments: JSON.stringify({ name, partyType: 'both', code }) },
        },
      ],
    },
    { content: 'Plan proposed for your approval.', tool_calls: [] },
  ]
  let i = 0
  const client = {
    chat: {
      completions: {
        create: async () => {
          const c = completions[Math.min(i, completions.length - 1)]
          i++
          return { choices: [{ message: c }] }
        },
      },
    },
  }
  await runAgentTurn({
    client: client as any,
    tools: [],
    messages: [
      { role: 'system', content: 'sys' },
      { role: 'user', content: `create party ${code}` },
    ],
    actor: { userId: fixtureUserId, email: 'corr@fiberpro.local', name: 'Corr Test' },
    userText: `create party ${code}`,
    send: (ev) => {
      events.push(ev)
      return true
    },
  })

  const end = events.find((e) => e.type === 'tool-call-end') as any
  const approvalId = end?.output?.plan?.approvalId as string
  const args = end?.args as Record<string, unknown>
  expect(approvalId).toMatch(/^[0-9a-f-]{36}$/)
  return { approvalId, args, events }
}

function approveRequest(body: unknown) {
  return new Request('http://localhost/api/agent/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any
}

async function json(res: Response) {
  return res.json() as Promise<Record<string, any>>
}

beforeEach(async () => {
  for (const k of Object.keys(cookieStore)) delete cookieStore[k]
  if (!fixtureUserId) {
    const u = await db.user.create({
      data: { email: `approval-corr-${stamp}@fiberpro.local`, name: 'Approval Corr', role: 'admin' },
    })
    fixtureUserId = u.id
  }
  cookieStore[SESSION_COOKIE] = await createSessionToken(fixtureUserId)
})

afterAll(async () => {
  // cleanup: audit rows → committed parties → this user's AgentTurns → user
  await db.auditLog.deleteMany({ where: { docNo: { startsWith: 'AC-' } } }).catch(() => {})
  await db.party.deleteMany({ where: { code: { startsWith: 'AC-' } } }).catch(() => {})
  if (fixtureUserId) {
    await db.agentTurn.deleteMany({ where: { userId: fixtureUserId } }).catch(() => {})
    await db.user.delete({ where: { id: fixtureUserId } }).catch(() => {})
  }
  await db.$disconnect()
})

describe('/api/agent/approve — SPEC-M30 correlation door', () => {
  it('no session → 401 JSON (M7 Wave B guard first)', async () => {
    for (const k of Object.keys(cookieStore)) delete cookieStore[k]
    const res = await approvePost(approveRequest({ toolName: 'create_party', args: {}, approvalId: 'x' }))
    expect(res.status).toBe(401)
    expect(await json(res)).toEqual({ error: 'Authentication required' })
  })

  it('missing approvalId → 400 (the panel must round-trip the proposing turn token)', async () => {
    const res = await approvePost(approveRequest({ toolName: 'create_party', args: { name: 'X', partyType: 'both' } }))
    expect(res.status).toBe(400)
    const body = await json(res)
    expect(String(body.error)).toContain('approvalId required')
  })

  it('read-only tool → 400', async () => {
    const res = await approvePost(approveRequest({ toolName: 'list_orders', args: {}, approvalId: 'x' }))
    expect(res.status).toBe(400)
    expect((await json(res)).error).toBe('Tool is read-only')
  })

  it('unknown tool → 400', async () => {
    const res = await approvePost(approveRequest({ toolName: 'no_such_tool', args: {}, approvalId: 'x' }))
    expect(res.status).toBe(400)
    expect((await json(res)).error).toBe('Unknown tool')
  })

  it('happy path: loop proposes → human approves → party committed + turn approved (SCOPED)', async () => {
    const code = happyCode
    const name = happyName
    const { approvalId, args } = await proposeParty(code, name)
    happyApprovalId = approvalId
    happyArgs = args

    // A second pending turn for the SAME user must NOT be flipped by the
    // approve (the pre-M30 updateMany marked every pending row).
    const otherRow = await db.agentTurn.create({
      data: {
        prompt: 'other pending',
        plan: JSON.stringify({ summary: 'other plan', creates: [], updates: [] }),
        toolCalls: '[]',
        result: 'other',
        approved: false,
        userId: fixtureUserId,
        approvalId: `other-${stamp}`,
      },
    })

    const res = await approvePost(approveRequest({ toolName: 'create_party', args, approvalId }))
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.success).toBe(true)
    expect(body.approvalId).toBe(approvalId)
    expect(String(body.summary)).toContain(name)

    // The party actually committed through runCommit…
    const party = await db.party.findFirst({ where: { code } })
    expect(party).not.toBeNull()
    expect(party?.name).toBe(name)

    // …and the audit row exists (the M15 choke point).
    const audit = await db.auditLog.findFirst({ where: { docNo: code } })
    expect(audit?.actorSource).toBe('agent')

    // ONLY the correlated turn flipped approved; the other pending row didn't.
    const turn = await db.agentTurn.findFirst({ where: { approvalId } })
    expect(turn?.approved).toBe(true)
    expect(turn?.approvedBy).toBe(`approval-corr-${stamp}@fiberpro.local`)
    const other = await db.agentTurn.findUnique({ where: { id: otherRow.id } })
    expect(other?.approved).toBe(false)
    await db.agentTurn.delete({ where: { id: otherRow.id } }).catch(() => {})
  })

  it('double-approve → 409 already_approved (idempotency, not double-commit)', async () => {
    const res = await approvePost(approveRequest({ toolName: 'create_party', args: happyArgs, approvalId: happyApprovalId }))
    expect(res.status).toBe(409)
    const body = await json(res)
    expect(body.error).toBe('already_approved')
  })

  it('unknown approvalId → 404', async () => {
    const res = await approvePost(
      approveRequest({ toolName: 'create_party', args: { name: 'Ghost', partyType: 'both', code: `AC-${stamp}-ghost` }, approvalId: 'no-such-token' }),
    )
    expect(res.status).toBe(404)
    const body = await json(res)
    expect(String(body.error)).toContain('Unknown approval')
  })

  it('plan_changed → 409 and NOTHING commits (the TOCTOU guard)', async () => {
    const code = `AC-${stamp}-2`
    const name = `Corr Party Two ${stamp}`
    const { approvalId, args } = await proposeParty(code, name)

    // Tamper with the persisted plan — simulates the world moving between
    // proposal and approval (doc numbers shifted, rows committed elsewhere).
    const turn = await db.agentTurn.findFirst({ where: { approvalId } })
    const plan = JSON.parse(turn!.plan!)
    plan.summary = 'Create party SOMETHING-ELSE-ENTIRELY'
    await db.agentTurn.update({ where: { id: turn!.id }, data: { plan: JSON.stringify(plan) } })

    const res = await approvePost(approveRequest({ toolName: 'create_party', args, approvalId }))
    expect(res.status).toBe(409)
    const body = await json(res)
    expect(body.error).toBe('plan_changed')
    expect(body.persisted).toBeDefined()
    expect(body.regenerated).toBeDefined()

    // Nothing committed, the turn stays pending.
    const party = await db.party.findFirst({ where: { code } })
    expect(party).toBeNull()
    const still = await db.agentTurn.findFirst({ where: { approvalId } })
    expect(still?.approved).toBe(false)
  })

  it('invalid args → 400 with zod issues (no execution, no commit)', async () => {
    const code = `AC-${stamp}-3`
    const { approvalId } = await proposeParty(code, `Corr Party Three ${stamp}`)
    const res = await approvePost(
      approveRequest({ toolName: 'create_party', args: { partyType: 'both' }, approvalId }), // name missing
    )
    expect(res.status).toBe(400)
    const body = await json(res)
    expect(String(body.error)).toContain('Invalid arguments for create_party')
    const party = await db.party.findFirst({ where: { code } })
    expect(party).toBeNull()
  })
})
