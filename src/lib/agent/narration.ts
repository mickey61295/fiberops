/**
 * Assistant narration merging — HFX-16 (Phase-6B Batch 0).
 *
 * The agent panel used a single `currentTextBuffer` REPLACED on every
 * text-delta and reset to '' on tool-call-start — so every narration the
 * model writes BEFORE a tool call ("Let me check stock…") was silently
 * deleted when the post-tool-call text arrived, in the UI AND in the history
 * sent with the next turn. The transport already keys text segments by id
 * (`text-${step}`); the panel now keeps ONE SEGMENT PER ID and merges them
 * in arrival order. Pure + unit-tested (the panel wires it to state).
 */

export type NarrationSegments = Map<string, string>

/** Append a delta to its segment (created on first delta). */
export function appendDelta(segments: NarrationSegments, id: string, delta: string): void {
  segments.set(id, (segments.get(id) ?? '') + delta)
}

/** Merge every segment in arrival order, paragraph-separated.
 *  The \n\n separator is meaningful downstream: the panel renders assistant
 *  text as Markdown (HFX-15), where a blank line is a paragraph break. */
export function mergeNarration(segments: NarrationSegments): string {
  return [...segments.values()].join('\n\n')
}
