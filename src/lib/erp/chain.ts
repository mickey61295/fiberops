/* eslint-disable @typescript-eslint/no-explicit-any */
// ADR-007 / SPEC-M3 §4 — the ONE 15-stage Tirupur knitwear chain definition.
// Extracted VERBATIM from the PIPELINE const in src/lib/agent/tools.ts (Wave A
// deletes that const — single source of truth from now on).
// Consumers: suggest_next_step (agent-side twin), get_program_status (include
// set), the DocScreen chain bar + "Next →" CTA (W1, Wave B), the Order Hub.
// Stage names + tool names are a PUBLIC CONTRACT (tests + agent prompts quote
// them) — do not rename casually.

/** The artifact a stage produces / the state key it sets. */
export type ChainStateKey =
  | 'order' | 'bom' | 'program' | 'po' | 'grn' | 'jobworkOut' | 'jobworkIn'
  | 'cut' | 'lineIssue' | 'production' | 'rework' | 'despatch' | 'invoice'
  | 'cost' | 'payment'

export interface ChainStage {
  /** 1..15 */
  step: number
  /** Human name, verbatim from the legacy PIPELINE (agent output quotes it). */
  name: string
  /** The agent tool that performs this stage. */
  tool: string
  /** Which ChainState flag this stage sets when done. */
  produces: ChainStateKey
  /** W1 target — the DocScreen route for this stage (SPEC-M3 §8 inventory). */
  formUrl: string
  /** Query param carrying context into that form ('order' = orderNo, 'po' = poNo, …). */
  formParam?: string
}

export const CHAIN: ChainStage[] = [
  { step: 1,  name: 'Order created (sales order from buyer PO)',        tool: 'create_order',           produces: 'order',      formUrl: '/orders/new' },
  { step: 2,  name: 'Bill of Materials (yarn/fabric/accessories per style)', tool: 'create_bom',       produces: 'bom',        formUrl: '/orders/[id]#bom', formParam: 'order' },
  { step: 3,  name: 'Program — production plan (yarn to knit / fabric to dye per order)', tool: 'create_program', produces: 'program', formUrl: '/programs/new', formParam: 'order' },
  { step: 4,  name: 'Purchase order to supplier for materials',         tool: 'create_purchase_order', produces: 'po',         formUrl: '/procurement/po' },
  { step: 5,  name: 'GRN — receive material into godown',               tool: 'receive_grn',            produces: 'grn',        formUrl: '/procurement/grn', formParam: 'po' },
  { step: 6,  name: 'Jobwork DC out (knitting/dyeing/etc.)',            tool: 'create_jobwork_order',   produces: 'jobworkOut', formUrl: '/jobwork/order', formParam: 'order' },
  { step: 7,  name: 'Jobwork receive back',                             tool: 'receive_jobwork',        produces: 'jobworkIn',  formUrl: '/jobwork/receipt', formParam: 'dcNo' },
  { step: 8,  name: 'Cut order (cut fabric to colour×size)',            tool: 'create_cut_order',       produces: 'cut',        formUrl: '/cutting/job-order', formParam: 'order' },
  { step: 9,  name: 'Issue cut pieces to sewing line',                  tool: 'issue_to_line',          produces: 'lineIssue',  formUrl: '/production/issue', formParam: 'order' },
  { step: 10, name: 'Production entry (sewing output → PCS ledger)',    tool: 'post_production_entry',  produces: 'production', formUrl: '/production/entry', formParam: 'order' },
  { step: 11, name: 'Rework / rejection (defects)',                     tool: 'post_rejection',         produces: 'rework',     formUrl: '/pieces/rejection', formParam: 'order' },
  { step: 12, name: 'Pcs despatch (finished goods DC out)',             tool: 'create_pcs_despatch',    produces: 'despatch',   formUrl: '/pieces/despatch', formParam: 'order' },
  { step: 13, name: 'Sales invoice (GST auto from HSN)',                tool: 'create_sales_invoice',   produces: 'invoice',    formUrl: '/accounts/invoice', formParam: 'order' },
  { step: 14, name: 'Cost sheet (budget vs actual)',                    tool: 'create_cost_sheet',      produces: 'cost',       formUrl: '/costing/cost-sheet', formParam: 'order' },
  { step: 15, name: 'Payment collection',                               tool: 'record_payment',         produces: 'payment',    formUrl: '/accounts/payments', formParam: 'invoice' },
]

// ---------------------------------------------------------------------------
// Chain-state computation — the `has` flags from suggest_next_step, extracted
// (SPEC-M3 §9.1) so the agent tool AND the W1 chain bar share ONE computation.
// NOTE (behaviour contract): the legacy computation tracks exactly these 8
// artifacts + order; po/grn/jobworkOut/jobworkIn/rework/despatch are NOT
// observed by next-step selection. Keep it that way unless an ADR says else.
// ---------------------------------------------------------------------------

/** The include set an order query needs for computeChainState. */
export const CHAIN_ORDER_INCLUDE = {
  buyer: true,
  style: { include: { bomLines: true } },
  lines: { include: { colour: true, size: true } },
  programs: true,
  cutOrders: true,
  lineIssues: true,
  productionEntries: true,
  salesInvoices: true,
  costSheet: true,
  payments: true,
} as const

export interface ChainStateFlags {
  order: boolean
  bom: boolean
  program: boolean
  cut: boolean
  lineIssue: boolean
  production: boolean
  invoice: boolean
  cost: boolean
  payment: boolean
}

/** Compute the chain flags from an order fetched with CHAIN_ORDER_INCLUDE. */
export function computeChainState(order: any): ChainStateFlags {
  return {
    order: true,
    bom: !!order?.style?.bomLines?.length,
    program: (order?.programs?.length ?? 0) > 0,
    cut: (order?.cutOrders?.length ?? 0) > 0,
    lineIssue: (order?.lineIssues?.length ?? 0) > 0,
    production: (order?.productionEntries?.length ?? 0) > 0,
    invoice: (order?.salesInvoices?.length ?? 0) > 0,
    cost: (order?.costSheet?.length ?? 0) > 0,
    payment: (order?.payments?.length ?? 0) > 0,
  }
}

/** The next incomplete stage, mirroring the legacy suggest_next_step if-chain
 *  exactly (bom → program → cut → lineIssue → production → invoice → cost →
 *  payment; null = all 15 done). */
export function nextStage(state: Partial<ChainStateFlags>): ChainStage | null {
  if (!state.bom) return CHAIN[1]
  if (!state.program) return CHAIN[2]
  if (!state.cut) return CHAIN[7]
  if (!state.lineIssue) return CHAIN[8]
  if (!state.production) return CHAIN[9]
  if (!state.invoice) return CHAIN[12]
  if (!state.cost) return CHAIN[13]
  if (!state.payment) return CHAIN[14]
  return null
}

/** W1 CTA target for a stage: the form route with the context query param.
 *  Dynamic [id] segments need db ids this layer does not have — the Order Hub
 *  route (Wave B) also resolves by orderNo; until then such stages fall back
 *  to the module list route. */
export function stageFormUrl(
  stage: ChainStage,
  ctx: { orderNo?: string; poNo?: string; dcNo?: string; invoiceNo?: string } = {},
): string {
  let url = stage.formUrl
  if (url.includes('[id]')) url = url.split('#')[0].replace('/[id]', '')
  const param = stage.formParam
  if (param) {
    const value = param === 'po' ? ctx.poNo : param === 'dcNo' ? ctx.dcNo : param === 'invoice' ? ctx.invoiceNo : ctx.orderNo
    if (value) url += (url.includes('?') ? '&' : '?') + `${param}=${encodeURIComponent(value)}`
  }
  return url
}
