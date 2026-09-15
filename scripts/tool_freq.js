/* SPEC-M61 H2 — E-1.1 evidence: AgentTurn tool-call frequency to pick the
 * five most-used reads for the core tier ("chosen from AgentTurn frequency;
 * initial set named in the spec commit"). */
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function main() {
  const rows = await db.agentTurn.findMany({ select: { toolCalls: true } })
  const freq = {}
  for (const r of rows) {
    try {
      const calls = JSON.parse(r.toolCalls || '[]')
      for (const c of calls) if (c && c.name) freq[c.name] = (freq[c.name] || 0) + 1
    } catch {}
  }
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1])
  console.log('total AgentTurn rows:', rows.length)
  console.log('TOP 25 tools by call count:')
  for (const [name, n] of sorted.slice(0, 25)) console.log(`  ${n}\t${name}`)
}

main()
  .catch((e) => { console.error('ERR:', e.message); process.exit(1) })
  .finally(() => db.$disconnect())
