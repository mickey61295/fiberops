/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 — the shared document-posting plan types (ADR-001 at transaction
// scale). ONE code path for BOTH doors: the agent tools (src/lib/agent/tools.ts)
// and the form server actions (Wave B: src/app/(erp)/**/actions.ts) both call
// the per-op plan functions below and execute the returned commit().
// Shape mirrors master-service's MasterPlan union (ok | error) so the two
// delegate factories in tools.ts stay symmetric.

export interface DocPlanCreate {
  table: string
  data: Record<string, unknown>
}

export interface DocPlanUpdate {
  table: string
  id: string
  data: Record<string, unknown>
}

export interface DocPlanOk {
  ok: true
  /** Agent-facing "Proposed …" line — becomes ToolResult.text in chat. */
  text: string
  /** One-line human summary — shown on the approval card and in audit output. */
  summary: string
  /** Proposed mutations for the approval card. */
  creates?: DocPlanCreate[]
  updates?: DocPlanUpdate[]
  sideEffects: string[]
  /** The ONLY write path — replays the plan (numbering is re-resolved inside,
   *  collision-safe per CONVENTIONS "resolveDocNo desired-skip behaviour"). */
  commit: () => Promise<any>
}

export interface DocPlanError {
  ok: false
  /** User-facing validation failure — becomes ToolResult.text; NO plan. */
  error: string
}

export type DocPlanResult = DocPlanOk | DocPlanError
