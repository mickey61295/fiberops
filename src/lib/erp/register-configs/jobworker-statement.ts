import type { RegisterConfig } from './types'

/** /jobwork/statement — SPEC-M39 §1 JWL-07 (Phase-6B Batch 3): the jobworker
 *  material statement. Per party × item from the StockLedger process rows:
 *  kgs out / kgs in / loss % / WIP + aging — the working-capital view of
 *  material at jobworkers (G3 'Jobworker Yard' backs the JW-door half). */
export const jobworkerStatementConfig: RegisterConfig = {
  slug: 'jobworker-statement',
  title: 'Jobworker Material Statement',
  description: 'Per jobworker × item: kgs out, kgs in, loss %, WIP and aging (process DC ledger rows).',
  filters: [
    { key: 'party', label: 'Jobworker', type: 'party', placeholder: 'code or name' },
  ],
  columns: [
    { name: 'party', label: 'Jobworker' },
    { name: 'item', label: 'Item', mono: true },
    { name: 'itemType', label: 'Type' },
    { name: 'uom', label: 'UOM' },
    { name: 'outQty', label: 'Out', align: 'right', format: 'qty' },
    { name: 'inQty', label: 'In', align: 'right', format: 'qty' },
    { name: 'wip', label: 'WIP (at party)', align: 'right', format: 'qty' },
    { name: 'lossPct', label: 'Loss %', align: 'right', format: 'qty' },
    { name: 'agingDays', label: 'Aging (days)', align: 'right', format: 'qty' },
  ],
  agentTools: ['list_jobworker_statement'],
  askPrompt: 'Show the jobworker material statement',
  emptyMessage: 'No process DC ledger rows for these filters.',
}
