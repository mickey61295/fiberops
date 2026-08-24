/* eslint-disable @typescript-eslint/no-explicit-any */
import { createOpenAI } from '@ai-sdk/openai'
import { streamText, tool, isStepCount } from 'ai'
import { allTools, getTool } from '@/lib/agent/tools'
import { db } from '@/lib/db'

// Allow streaming responses up to 60s
export const maxDuration = 60

const SYSTEM_PROMPT = `You are Fiberpro Agent — an AI assistant embedded in a Garment ERP web application (a modern rebuild of the original Fiberpro VB.NET textile ERP).

You can control the ENTIRE ERP through natural language prompts by calling tools.

## Your capabilities
- READ tools: list/get/search across orders, POs, GRNs, inventory, cutting, production, invoices, costing, HR, approvals, masters
- WRITE tools: create_order, create_purchase_order, receive_grn, create_sales_invoice, create_cut_order, post_production_entry, approve_pending, adjust_stock, cancel_order

## CRITICAL SAFETY RULES
1. For READ prompts (questions, lookups, summaries), call read tools immediately and synthesize the answer.
2. For WRITE prompts (create/update/delete), ALWAYS:
   a. First call any required READ tools to validate references (e.g. list_buyers, list_styles, get_purchase_order)
   b. Then call the WRITE tool — which returns a "plan" describing proposed mutations
   c. Tell the user the plan is pending approval and they must approve it in the chat panel
   d. Do NOT claim the action is done until the user approves and you see the commit result
3. If a referenced entity doesn't exist, suggest listing masters first.
4. Use realistic Indian GST rules: CGST+SGST for intra-state, IGST for inter-state. Common GST rates: 5% fabric, 12% on garments >₹1000, 18% accessories.
5. Use Indian number formatting (₹, lakhs/crores where natural).
6. Financial year is 26-27 (1 Apr 2026 - 31 Mar 2027).
7. Common godowns: G1 (Main), G2 (Finished Goods), G3 (Jobworker Yard).
8. Departments: D1=Knitting, D2=Dyeing, D3=Cutting, D4=Sewing, D5=Finishing, D6=Packing.

## Tone
Concise, helpful, action-oriented. Use bullet lists for summaries. Cite the actual IDs returned.

## When to ask clarifying questions
If a WRITE prompt is missing required info (style number, buyer code, qty, rate, GST), ask. Otherwise proceed.

## After approval
When the user approves (handled by client UI), the commit runs and you may follow up with a confirmation + suggested next steps.
`

// Build the AI SDK tool specs from our registry
function buildAiTools(lastUserContent: string) {
  const aiTools: Record<string, any> = {}
  for (const t of allTools) {
    aiTools[t.name] = {
      description: t.description,
      parameters: t.schema as any,
      execute: async (rawArgs: any) => {
        try {
          // Normalize: LLM may pass object/array fields as JSON strings
          const args = normalizeArgs(rawArgs)
          const result = await t.execute(args)
          // Persist AgentTurn for audit
          await db.agentTurn.create({
            data: {
              prompt: lastUserContent || '',
              plan: result.plan ? JSON.stringify(result.plan) : null,
              toolCalls: JSON.stringify([{ name: t.name, args, isWrite: t.isWrite }]),
              result: (result.text || JSON.stringify(result.json || '')).slice(0, 2000),
              approved: !t.isWrite,
              userId: 'admin',
            },
          }).catch(() => {})
          return {
            text: result.text,
            json: result.json,
            plan: result.plan,
            isWrite: t.isWrite,
            toolName: t.name,
            hasCommitFn: !!result.commit,
          }
        } catch (err: any) {
          return { error: err.message || String(err) }
        }
      },
    }
  }
  return aiTools
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const messages = body.messages || []
    const lastUser = [...messages].reverse().find((m: any) => m.role === 'user')

    // ZAI uses an OpenAI-compatible endpoint configured via .z-ai-config
    // We load config from /etc/.z-ai-config and use the AI SDK's OpenAI provider with extra headers
    const zaiConfig = await loadZaiConfig()
    if (!zaiConfig) {
      return new Response(JSON.stringify({ error: 'ZAI config not found' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const openai = createOpenAI({
      baseURL: zaiConfig.baseUrl,
      apiKey: zaiConfig.apiKey,
      headers: {
        'X-Z-AI-From': 'Z',
        ...(zaiConfig.chatId ? { 'X-Chat-Id': zaiConfig.chatId } : {}),
        ...(zaiConfig.userId ? { 'X-User-Id': zaiConfig.userId } : {}),
        ...(zaiConfig.token ? { 'X-Token': zaiConfig.token } : {}),
      },
    })

    // Use .chat() for legacy chat completions endpoint (ZAI supports this, not the new /responses endpoint)
    const model = openai.chat('glm-4.6')

    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages,
      tools: buildAiTools(lastUser?.content || ''),
      stopWhen: isStepCount(6),
      temperature: 0.2,
      onError: (err: any) => {
        console.error('[/api/agent] streamText error:', err?.message || err)
      },
    })

    // The toUIMessageStreamResponse will end the stream if the model produces an invalid follow-up.
    // The user can still see all tool calls + results that streamed before the error.
    return result.toUIMessageStreamResponse({
      onError: (err: any) => {
        console.error('[/api/agent] response error:', err?.message || err)
        // Swallow the error so the client sees a clean end
      },
    })
  } catch (err: any) {
    console.error('[/api/agent] error:', err)
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
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

// Normalize args: GLM-4.6 sometimes passes object/array fields as JSON strings.
// We parse them back to objects/arrays.
function normalizeArgs(args: any): any {
  if (args === null || typeof args !== 'object') return args
  const out: any = Array.isArray(args) ? [] : {}
  for (const [key, val] of Object.entries(args)) {
    if (typeof val === 'string') {
      const trimmed = val.trim()
      // Only try to parse if it looks like JSON
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
          (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          out[key] = JSON.parse(trimmed)
          continue
        } catch {
          // not valid JSON, keep as string
        }
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
