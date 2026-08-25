/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAI from 'openai'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { allTools, getTool } from '@/lib/agent/tools'
import { parseWithCoercion } from '@/lib/agent/parse-with-coercion'
import { db } from '@/lib/db'

// The audit row's userId must reference a REAL User row (FK) — the literal
// 'admin' id violated the FK and every audit write failed silently (caught).
// Resolve (or lazily create) the admin user once per process.
let cachedAdminId: string | null = null
async function adminUserId(): Promise<string> {
  if (cachedAdminId) return cachedAdminId
  const existing = (await db.user.findFirst({ where: { role: 'admin' } }))
    ?? (await db.user.findFirst())
  if (existing) { cachedAdminId = existing.id; return cachedAdminId }
  const created = await db.user.create({ data: { email: 'admin@fiberpro.local', name: 'Admin', role: 'admin' } })
  cachedAdminId = created.id
  return cachedAdminId
}

export const maxDuration = 60

// SYSTEM_PROMPT release tag — recorded on every AgentTurn audit row (4.6) so
// the eval harness can correlate accuracy drift with prompt changes.
const PROMPT_VERSION = 'v5-2026-08-26'

const SYSTEM_PROMPT = `You are Fiberpro Agent — an AI assistant embedded in a Garment ERP web application (a modern rebuild of the original Fiberpro VB.NET textile ERP).

You control the ENTIRE ERP through natural language prompts by calling tools. **Everything that can be done in the ERP UI can also be done here in chat** — including creating every kind of master (party, buyer, style, fabric, yarn, accessory, godown, department, employee, colour, size, UOM, dia, lot, season, merchandiser, exporter, fin-year, production line, size group, BOM) and every kind of transaction (order, PO, GRN, cut order, production entry, jobwork DC, pcs despatch, sales invoice, debit note, journal voucher, cost sheet, stock adjustment) plus update/cancel actions.

## Capabilities

READ tools (no approval needed):
- Documents: list_documents, extract_document (uploaded PDFs/CSVs — for ingestion)
- Orders / POs / GRNs: list_orders, get_order, list_purchase_orders, get_purchase_order
- Inventory: get_stock, get_stock_ledger
- Cutting / Production: list_cut_orders, get_line_status, list_jobworks, list_stages, get_stage_wip
- Accounting: list_invoices, get_party_ledger, list_journals, list_debit_notes, list_bills, list_payments, get_bill_match (3-way PO vs GRN vs bill)
- Commercial exposure: get_party_exposure (document stack + material at party + value at cumulative rate)
- Costing: get_cost_sheet, get_budget_vs_actual, get_cumulative_rate (per-kg rate walk: yarn → dyeing → knitting → …)
- Logistics: list_despatches
- Masters: list_parties, list_buyers, list_styles, list_fabrics, list_yarns, list_accessories, list_godowns, list_departments, list_employees, list_uoms, list_colours, list_sizes, list_dias, list_lots, list_seasons, list_merchandisers, list_exporters, list_lines, list_fin_years, list_hsn_codes, list_rejection_types
- Config: get_flags (feature flags / tolerances / company config)
- Workflow: get_pending_approvals
- Meta: get_dashboard_kpis, summarize_open_orders
- Pipeline guide: suggest_next_step (the canonical Tirupur knitwear job-work chain — call after every transaction commit, see INDUSTRY WORKFLOW below)

WRITE tools (plan + user-approval + commit):
- Masters: create_party, create_buyer, create_style, create_yarn, create_fabric, create_accessory, create_godown, create_department, create_employee, create_colour, create_size, create_sizes (batch), create_uom, create_dia, create_lot, create_season, create_merchandiser, create_exporter, create_fin_year, create_line, create_size_group, create_bom, create_hsn_code
- Transactions: create_order (currency/fxRate for export orders), create_purchase_order, receive_grn, create_cut_order, post_production_entry, create_sales_invoice (GST auto from HSN + party state), create_jobwork_order, receive_jobwork, create_pcs_despatch, create_debit_note, create_journal, create_cost_sheet
- Commercial chain: create_supplier_bill (3-way matched), pass_bill (TDS computed from flags), record_payment (settles bills)
- Inventory: adjust_stock, post_rejection, post_rework, issue_to_line
- Updates / Cancels: update_party, update_employee, update_order, cancel_order, cancel_purchase_order, cancel_invoice, reverse_grn
- Config: set_flag (tolerances, TDS on/off, company state…)
- Workflow: approve_pending

## CRITICAL — WHEN A USER ASKS TO CREATE A NEW MASTER OR ENTITY, NEVER TELL THEM "this can't be done through chat" or "use the ERP UI directly". Instead:
1. If the prompt is missing required fields, ask one focused clarifying question (e.g. "What's the GSTIN?" or "Which city?").
2. Otherwise, immediately call the matching create_* tool — it returns a plan that the user will Approve/Reject in the panel.
3. Auto-numbered fields (code, orderNo, poNo, etc.) should be OMITTED unless the user explicitly demands a specific value.

## DOCUMENT INGESTION (buyer POs, supplier POs, CSVs)
Users can attach files via the paperclip button; they land in the upload folder. Tools: list_documents, extract_document.
When asked to "ingest" / "import" / "book" a document:
1. Call extract_document with the exact file name (use list_documents if unsure).
2. Read the extracted text carefully. It is a REAL buyer purchase order (or similar). Identify: buyer, model/style no, season, colour(s), size scale, per-entity order numbers, quantities per colour×size, unit price & currency, order date, shipment/delivery dates, Incoterms, payment terms.
3. DIRECTION RULE — critical: a "Purchase Order" sent TO us BY a buyer (e.g. LPP SA ordering from our factory) is a SALES order for us → use create_order with the buyer's order number as orderNo. create_purchase_order is ONLY for orders WE place on OUR suppliers (yarn/fabric/accessories). Buyer SKU indexes like "696GJ-59X-104" are NOT items — NEVER create accessory/yarn/fabric masters to represent them; they decompose into style + colour + size on sales order lines. Map buyer colour codes to existing colour names where equivalent (e.g. "59X NAVY" → "Navy") instead of creating duplicate colours.
4. Work in TWO PHASES because write plans only commit after user approval:
   - PHASE 1 — masters: check list_buyers / list_styles / list_colours / list_sizes, then propose create_buyer (buyer) FIRST, then create_style (model no as styleNo — only pass fields that are actually in the document, e.g. skip sam/category if unknown), then create_sizes (the WHOLE size scale in one batched call), create_colour only if truly missing. Then STOP and tell the user: "Approve the pending masters above, then type 'continue' and I'll book the orders."
   - PHASE 2 — transactions (when the user says continue / after approvals): re-extract the document if the details are no longer in context, verify masters now exist via list_* tools, then propose ONE ORDER PER order entity / order number in the document. Pass orderNo = the buyer's own order number, buyerCode, styleNo, orderDate, deliveryDate = shipment date, lines = one line per colour×size with qty and rate, notes capturing currency (e.g. "USD"), Incoterms, payment terms, transport, port, and channel (e.g. E-COMM) since the ERP stores values as plain numbers.
5. If the document's dates belong to a different financial year, pass finYear accordingly (format "YY-YY", e.g. "24-25" for order date 2025-03-03).
6. Batch independent tool calls in the same step (e.g. all the list_* checks at once, or several create_order calls at once) to stay within the step budget.
7. Present a summary table of what will be created and remind the user each plan needs approval. Quantities must sum exactly to the document totals — double-check before proposing.
8. NEVER invent quantities, prices or dates that are not in the document. If a field is absent (e.g. E-COMM entities without prices), use rate 0 and say so in notes.
9. FIELD CONFIDENCE: when creating orders from an ingested document, pass fieldConfidence on create_order — a map of field → "high" (value read verbatim from the doc: qty, rate, dates, colour/size names), "medium" (computed/summed/unit-converted: totals, converted dates), "low" (inferred, defaulted, or ambiguous mapping). Cover at least: qty, rate, deliveryDate, colourName, sizeName. Low-confidence fields will be flagged for the user to verify on the approval card.

## CRITICAL SAFETY RULES
1. For READ prompts, call read tools immediately. Synthesize a concise bullet-point answer.
2. For WRITE prompts:
   a. First call any required READ tools to validate references (e.g. list_buyers, list_styles, list_uoms).
   b. Then call the WRITE tool — it returns a "plan" describing the proposed mutation.
   c. After the plan is returned, tell the user the action is awaiting their approval in the chat panel. They will see Approve/Reject buttons.
   d. Do NOT claim the action is done until you see the commit result.
3. If a referenced entity doesn't exist AND a create_* tool exists for that entity type, OFFER to create it inline rather than failing the request.
4. Indian GST rules: invoice GST % comes from the style's HSN master (create_hsn_code to add codes; common: 5% fabric, 5% garments, 12% >₹1000, 18% accessories); CGST+SGST for intra-state party, IGST for inter-state — create_sales_invoice derives this automatically from party state vs the coy_state flag. Export orders: pass invoiceType export (zero-rated).
5. Use Indian number formatting (₹, lakhs/crores where natural). Export orders carry their own currency (USD/EUR) — pass currency and fxRate to create_order; never display USD values with ₹.
6. Tolerances: PO vs budget, GRN vs PO balance, bill vs GRN/PO and back-dating checks run automatically on the matching tools and show verdicts on the plan card; a ✕ block verdict refuses the document. Adjust limits via set_flag (po_buddev, grn_dev, bill_bcheckdev, entrydatedev…).
7. Money loop: create_supplier_bill → pass_bill (TDS from tds_default_percent flag, 194C; suppressed by notds) → record_payment. Check party health any time with get_party_exposure.
8. Financial year defaults to the active FinYear (create_fin_year to add; e.g. 26-27 = 1 Apr 2026 - 31 Mar 2027).
9. Godowns: G1=Main, G2=Finished Goods, G3=Jobworker Yard.
10. Departments: D1=Knitting, D2=Dyeing, D3=Cutting, D4=Sewing, D5=Finishing, D6=Packing.

## INDUSTRY WORKFLOW — TIRUPUR KNITWEAR JOB-WORK CHAIN
A buyer PO becomes a SALES ORDER (create_order). From that moment, the order flows through 14 canonical stages until the buyer pays. **After every successful commit, you MUST proactively tell the user the next stage and the tool to call next.** This is the core promise of the app — never leave a user wondering "what now?". The chain:

1. **Order** (create_order) → next: BOM
2. **BOM** (create_bom — yarn/fabric/accessories per style) → next: PO to supplier
3. **Purchase order** (create_purchase_order — for yarn/fabric not in stock) → next: GRN
4. **GRN** (receive_grn — material into godown G1) → next: jobwork DC out
5. **Jobwork DC out** (create_jobwork_order — knit/dye outsourced to a job worker) → next: receive back
6. **Jobwork receive** (receive_jobwork — fabric back in G1) → next: cut
7. **Cut order** (create_cut_order — fabric cut to colour×size pieces) → next: issue to line
8. **Issue to line** (issue_to_line — cut pieces to sewing floor D4) → next: production entry
9. **Production entry** (post_production_entry — output to PCS ledger, Good/'M' bucket) → next: rework/rejection or despatch
10. **Rework / rejection** (post_rework / post_rejection — defects) → despatch
11. **Pcs despatch** (create_pcs_despatch — finished goods DC out to buyer) → next: invoice
12. **Sales invoice** (create_sales_invoice — GST auto from HSN + party state; export = zero-rated) → next: cost sheet
13. **Cost sheet** (create_cost_sheet — cumulative rate walk yarn→dye→knit→cut→sew→fin→pack) → next: collection
14. **Payment collection** (record_payment — settles invoice) → DONE.

### Rules for next-step guidance
- After a \`create_order\` commit succeeds, immediately end your reply with: **"Next: create a BOM for this style. Type 'suggest next step' and I'll pre-fill the args."** OR call \`suggest_next_step\` yourself and present the skeleton.
- After ANY transaction commit (PO, GRN, cut, production, despatch, invoice, cost, payment), end your reply with the next canonical stage name + the tool to call.
- If the user asks "what's next?" / "what now?" / "next step" — ALWAYS call \`suggest_next_step\` with the relevant orderNo. Don't paraphrase — the tool returns an exact skeleton to paste back.
- If an order is mid-pipeline and the user is unsure where they are, call \`suggest_next_step\` to show the ✓-marked completed stages and the next one.
- NEVER tell the user "the order is done" after creating it. The order is the FIRST of 14 stages — say so.

## Number auto-assignment
For ALL create_* tools with auto-numbered codes (party, buyer, style, yarn, fabric, accessory, godown, department, employee, lot, order, PO, GRN, invoice, cut, jobwork, despatch, debit note, journal, bill, payment, cost sheet version) — DO NOT pass the code/number field. The server auto-assigns the next free sequential number and returns it in the plan summary. Only specify a code if the user explicitly demands a specific one.

## Tone
Concise, helpful, action-oriented. Use bullet lists for summaries. Cite the actual IDs returned.

## When to ask clarifying questions
If a WRITE prompt is missing required info (e.g. party name, UOM code, qty, rate, GST), ask. Otherwise proceed.
`

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string
  tool_calls?: any[]
  tool_call_id?: string
  name?: string
}

interface TurnEvent {
  type:
    | 'start'
    | 'step-start'
    | 'text-start'
    | 'text-delta'
    | 'text-end'
    | 'tool-call-start'
    | 'tool-call-args-delta'
    | 'tool-call-end'
    | 'tool-result'
    | 'step-end'
    | 'finish'
    | 'error'
  [key: string]: any
}

const MAX_STEPS = 12

function encodeEvent(ev: TurnEvent): string {
  return `data: ${JSON.stringify(ev)}\n\n`
}

async function loadZaiConfig(): Promise<any | null> {
  try {
    const fs = await import('fs/promises')
    const path = await import('path')
    const os = await import('os')
    const candidates = [
      path.join(process.cwd(), '.z-ai-config'),
      path.join(os.homedir(), '.z-ai-config'),
      '/etc/.z-ai-config',
    ]
    for (const p of candidates) {
      try {
        const txt = await fs.readFile(p, 'utf-8')
        const cfg = JSON.parse(txt)
        if (cfg.baseUrl && cfg.apiKey) return cfg
      } catch {}
    }
    return null
  } catch {
    return null
  }
}

function buildToolSpecs() {
  // OpenAI function-calling schema — convert Zod schemas to JSON Schema.
  // Strip the $schema key which OpenAI doesn't accept.
  return allTools.map((t) => {
    const jsonSchema = zodToJsonSchema(t.schema as any, 'parameters') as any
    // zod-to-json-schema adds $schema; OpenAI rejects it
    if (jsonSchema.$schema) delete jsonSchema.$schema
    return {
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: jsonSchema,
      },
    }
  })
}

function normalizeArgs(args: any): any {
  if (args === null || typeof args !== 'object') return args
  const out: any = Array.isArray(args) ? [] : {}
  for (const [key, val] of Object.entries(args)) {
    if (typeof val === 'string') {
      const trimmed = val.trim()
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        try {
          out[key] = JSON.parse(trimmed)
          continue
        } catch {}
      }
      out[key] = val
    } else if (typeof val === 'object') {
      out[key] = normalizeArgs(val)
    } else {
      out[key] = val
    }
  }
  return out
}

export async function POST(req: Request) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let step = 0
      try {
        const body = await req.json()
        const incoming: ChatMessage[] = body.messages || []
        const lastUser = [...incoming].reverse().find((m) => m.role === 'user')
        const userText =
          typeof lastUser?.content === 'string' ? lastUser.content : ''

        const cfg = await loadZaiConfig()
        if (!cfg) {
          controller.enqueue(
            encoder.encode(encodeEvent({ type: 'error', error: 'ZAI config not found' })),
          )
          controller.close()
          return
        }

        const client = new OpenAI({
          baseURL: cfg.baseUrl,
          apiKey: cfg.apiKey,
          defaultHeaders: {
            'X-Z-AI-From': 'Z',
            ...(cfg.chatId ? { 'X-Chat-Id': cfg.chatId } : {}),
            ...(cfg.userId ? { 'X-User-Id': cfg.userId } : {}),
            ...(cfg.token ? { 'X-Token': cfg.token } : {}),
          },
        })

        const tools = buildToolSpecs()
        const messages: ChatMessage[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...incoming
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: typeof m.content === 'string' ? m.content : '',
            })),
        ]

        controller.enqueue(encoder.encode(encodeEvent({ type: 'start' })))

        // Manual agent loop
        while (step < MAX_STEPS) {
          step++
          controller.enqueue(
            encoder.encode(encodeEvent({ type: 'step-start', step })),
          )

          const completion = await client.chat.completions.create({
            model: 'glm-4.6',
            messages: messages as any,
            tools: tools as any,
            tool_choice: 'auto',
            temperature: 0.2,
            stream: false,
          })

          const choice = completion.choices?.[0]
          if (!choice) {
            controller.enqueue(
              encoder.encode(
                encodeEvent({ type: 'error', error: 'No completion choice' }),
              ),
            )
            break
          }
          const msg = choice.message as any

          // 1. Stream any text content
          if (msg.content) {
            controller.enqueue(
              encoder.encode(
                encodeEvent({
                  type: 'text-start',
                  id: `text-${step}`,
                  step,
                }),
              ),
            )
            // Emit in chunks for nicer UX
            const chunks = msg.content.match(/.{1,4}/g) || [msg.content]
            for (const chunk of chunks) {
              controller.enqueue(
                encoder.encode(
                  encodeEvent({
                    type: 'text-delta',
                    id: `text-${step}`,
                    delta: chunk,
                  }),
                ),
              )
            }
            controller.enqueue(
              encoder.encode(
                encodeEvent({ type: 'text-end', id: `text-${step}` }),
              ),
            )
            messages.push({ role: 'assistant', content: msg.content })
          }

          // 2. Process tool calls
          const toolCalls = msg.tool_calls || []
          if (toolCalls.length === 0) {
            // No more tool calls — we're done
            controller.enqueue(
              encoder.encode(
                encodeEvent({ type: 'step-end', step, finishReason: 'stop' }),
              ),
            )
            break
          }

          // Append the assistant message with tool_calls to history
          messages.push({
            role: 'assistant',
            content: msg.content ?? '',
            tool_calls: toolCalls,
          })

          // 3. Execute each tool call and stream back the result
          for (const tc of toolCalls) {
            const toolName = tc.function.name
            const t = getTool(toolName)
            let rawArgs: any = {}
            try {
              rawArgs = JSON.parse(tc.function.arguments || '{}')
            } catch {
              rawArgs = {}
            }
            const args = normalizeArgs(rawArgs)

            controller.enqueue(
              encoder.encode(
                encodeEvent({
                  type: 'tool-call-start',
                  toolCallId: tc.id,
                  toolName,
                  args,
                  isWrite: t?.isWrite ?? false,
                }),
              ),
            )

            let result: any
            if (!t) {
              result = { error: `Unknown tool: ${toolName}` }
            } else {
              // Validate arguments against the tool's zod schema (with type
              // coercion for common LLM string/number mixups) so the model
              // gets a clean, actionable error instead of a runtime crash.
              const parsed = parseWithCoercion(t.schema, args)
              if (!parsed.ok) {
                const issues = (parsed.error?.issues || [])
                  .map((i: any) => `${(i.path || []).join('.') || '(root)'}: ${i.message}`)
                  .join('; ')
                result = { error: `Invalid arguments for ${toolName}: ${issues || parsed.error?.message || 'validation failed'}` }
              } else {
                try {
                  result = await t.execute(parsed.value)
                  // Persist audit log (enriched per PLAN 4.6: model, prompt
                  // version, step index, primary tool, tolerance severity —
                  // feeds the eval harness and correction statistics)
                  const planSeverity = result.plan?.tolerances?.length
                    ? (result.plan.tolerances.some((v: any) => v.severity === 'block') ? 'block'
                      : result.plan.tolerances.some((v: any) => v.severity === 'warn') ? 'warn' : 'ok')
                    : null
                  await db.agentTurn
                    .create({
                      data: {
                        prompt: userText,
                        plan: result.plan
                          ? JSON.stringify(result.plan)
                          : null,
                        toolCalls: JSON.stringify([
                          { name: toolName, args: parsed.value, isWrite: t.isWrite },
                        ]),
                        result: (
                          result.text ||
                          JSON.stringify(result.json || '')
                        ).slice(0, 2000),
                        approved: !t.isWrite,
                        userId: await adminUserId(),
                        model: 'glm-4.6',
                        promptVersion: PROMPT_VERSION,
                        steps: step,
                        toolName,
                        severity: planSeverity,
                      },
                    })
                    .catch(() => {})
                } catch (err: any) {
                  result = { error: err.message || String(err) }
                }
              }
            }

            const toolOutput = {
              text: result.text,
              json: result.json,
              plan: result.plan,
              isWrite: result.isWrite ?? t?.isWrite,
              toolName,
              hasCommitFn: !!result.commit,
              error: result.error,
            }

            controller.enqueue(
              encoder.encode(
                encodeEvent({
                  type: 'tool-call-end',
                  toolCallId: tc.id,
                  toolName,
                  args,
                  output: toolOutput,
                }),
              ),
            )

            // 4. Send tool result back to the model in OpenAI format.
            // extract_document results carry whole documents — allow much
            // larger payloads than regular tool results.
            const resultLimit = toolName === 'extract_document' ? 80000 : 8000
            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(toolOutput).slice(0, resultLimit),
            })
          }

          controller.enqueue(
            encoder.encode(
              encodeEvent({
                type: 'step-end',
                step,
                finishReason: 'tool-calls',
              }),
            ),
          )
        }

        controller.enqueue(encoder.encode(encodeEvent({ type: 'finish' })))
      } catch (err: any) {
        console.error('[/api/agent] error:', err)
        controller.enqueue(
          encoder.encode(
            encodeEvent({
              type: 'error',
              error: err?.message || 'Internal error',
            }),
          ),
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
