#!/usr/bin/env node
/* E2E ingestion test:
   1. Ask agent to ingest the LPP PO (phase 1: masters)
   2. Approve every pending write plan via /api/agent/approve
   3. Say "continue" (phase 2: orders)
   4. Report every tool call + args so we can verify data fidelity
*/
const BASE = 'http://localhost:3000'

async function callAgent(messages) {
  const res = await fetch(`${BASE}/api/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  const text = await res.text()
  const events = []
  for (const chunk of text.split('\n\n')) {
    const line = chunk.trim()
    if (!line.startsWith('data:')) continue
    const json = line.slice(5).trim()
    if (!json || json === '[DONE]') continue
    try { events.push(JSON.parse(json)) } catch {}
  }
  return events
}

function summarize(events, label) {
  console.log(`\n========== ${label} ==========`)
  const calls = events.filter((e) => e.type === 'tool-call-start')
  for (const c of calls) {
    console.log(`TOOL: ${c.toolName}  args=${JSON.stringify(c.args).slice(0, 300)}`)
  }
  const errs = events.filter((e) => e.type === 'tool-call-end' && e.output?.error)
  for (const e of errs) console.log(`ERROR in ${e.toolName}: ${e.output.error}`)
  const text = events
    .filter((e) => e.type === 'text-delta')
    .map((e) => e.delta)
    .join('')
  console.log(`\n--- agent text ---\n${text.slice(0, 2500)}`)
  return events
}

async function approveAll(events) {
  const ends = events.filter((e) => e.type === 'tool-call-end' && e.output?.plan && e.output?.hasCommitFn)
  console.log(`\n========== APPROVING ${ends.length} PLANS ==========`)
  for (const e of ends) {
    const res = await fetch(`${BASE}/api/agent/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolName: e.toolName, args: e.args }),
    })
    const data = await res.json()
    console.log(`approve ${e.toolName}: ${data.success ? 'OK -> ' + JSON.stringify(data.committed).slice(0, 120) : 'FAIL ' + data.error}`)
  }
}

const main = async () => {
  // PHASE 1
  const ev1 = await callAgent([
    { role: 'user', content: '[Attached document: PO_696GJ_revised 21-04-25.pdf]\nIngest this purchase order into the ERP.' },
  ])
  summarize(ev1, 'PHASE 1: ingest document')

  // Approve all masters
  await approveAll(ev1)

  // PHASE 2: continue
  const ev2 = await callAgent([
    { role: 'user', content: '[Attached document: PO_696GJ_revised 21-04-25.pdf]\nIngest this purchase order into the ERP.' },
    { role: 'assistant', content: 'Phase 1 complete: masters created. Please approve them and say continue.' },
    { role: 'user', content: 'continue' },
  ])
  summarize(ev2, 'PHASE 2: continue → create orders')

  // Approve all orders
  await approveAll(ev2)
}

main().catch((e) => { console.error(e); process.exit(1) })
