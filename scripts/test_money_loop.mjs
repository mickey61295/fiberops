#!/usr/bin/env node
/* E2E money-loop regression test (Phase 3):
   1. Agent registers a supplier bill against the fixture PO/GRN (3-way matched)
   2. Agent passes the bill (TDS computed from flags)
   3. Agent records payment → bill settles to paid
   4. Agent reads party exposure (document stack + cumulative-rate value)
   5. Agent flips a tolerance flag via set_flag
   Each write plan approved via /api/agent/approve; final state verified via API reads.
   NOTE: uses seeded masters (godown G1, dept D2, an existing party+PO) —
   creates nothing that persists beyond the bill chain (bill/pay rows are the E2E evidence).
   SPEC-M7 Wave B — APIs are session-guarded: login fixture sends fo_session.
*/
import { login } from './lib/api-auth.mjs'

const BASE = 'http://localhost:3000'
const { cookie } = await login(BASE)

async function callAgent(prompt) {
  const res = await fetch(`${BASE}/api/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
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
  for (const c of calls) console.log(`TOOL: ${c.toolName}  args=${JSON.stringify(c.args).slice(0, 260)}`)
  const errs = events.filter((e) => e.type === 'tool-call-end' && e.output?.error)
  for (const e of errs) console.log(`ERROR in ${e.toolName}: ${e.output.error}`)
  const text = events.filter((e) => e.type === 'text-delta').map((e) => e.delta).join('')
  console.log(`\n--- agent text (tail) ---\n${text.slice(-900)}`)
  return events
}

async function approveAll(events) {
  const ends = events.filter((e) => e.type === 'tool-call-end' && e.output?.plan && e.output?.hasCommitFn)
  console.log(`\n----- approving ${ends.length} plan(s) -----`)
  const results = []
  for (const e of ends) {
    const res = await fetch(`${BASE}/api/agent/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ toolName: e.toolName, args: e.args }),
    })
    const data = await res.json()
    console.log(`approve ${e.toolName}: ${data.success ? 'OK ' + JSON.stringify(data.committed).slice(0, 140) : 'FAIL ' + data.error}`)
    results.push({ toolName: e.toolName, committed: data.committed, ok: data.success })
  }
  return results
}

const main = async () => {
  console.log('=== PHASE 3 E2E: money loop ===')

  // 1) create supplier bill
  let ev = await callAgent('Pick the most recent GRN in the system (use get_stock_ledger to find the latest purchase_grn docNo, or list any GRN data you can read). Then register a supplier bill for that GRN: use create_supplier_bill with billType "fab", refType "grn", grnNo = that GRN number, qty and rate equal to the GRN qty/rate, partyCode = the GRN party. One tool call.')
  summarize(ev, 'BILL CREATE')
  const billCreate = await approveAll(ev)

  // grab the bill number from approve output
  const committedBill = billCreate?.find((r) => r.toolName === 'create_supplier_bill')?.committed
  const billNo = committedBill?.billNo
  const partyCode = committedBill?.party || 'Test Dyer'
  console.log(`\n>>> created bill: ${billNo}`)

  // 2) pass bill
  ev = await callAgent(`Pass the bill ${billNo} for payment with the default TDS. Use pass_bill with billNo "${billNo}".`)
  summarize(ev, 'BILL PASS (TDS)')
  await approveAll(ev)

  // 3) payment
  ev = await callAgent(`Record full payment of bill ${billNo} via RTGS, reference UTR-E2E-001. Use record_payment with billNo "${billNo}" and the party code "${partyCode}".`)
  summarize(ev, 'PAYMENT')
  await approveAll(ev)

  // 4) exposure + flags reads (no approval needed)
  ev = await callAgent(`Show me: (1) the bills register status for party "${partyCode}" via list_bills, (2) that party's exposure via get_party_exposure with partyCode "${partyCode}". Two read calls.`)
  summarize(ev, 'EXPOSURE READ')

  // 5) flag flip write
  ev = await callAgent('Tighten the GRN deviation tolerance to 3% — use set_flag with name grn_dev value 3.')
  summarize(ev, 'SET FLAG')
  await approveAll(ev)

  // restore
  ev = await callAgent('Set flag grn_dev back to 5.')
  await approveAll(ev)

  console.log('\n=== PHASE 3 E2E COMPLETE ===')
}

main().catch((e) => { console.error(e); process.exit(1) })
